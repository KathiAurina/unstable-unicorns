// Scenario builder for engine tests (expansion-plan.md 10.2):
//
//   const s = scenario(2).stable('1', 'basic_unicorn_0').hand('0', 'unicorn_poison').start();
//   s.play('0', 'unicorn_poison');
//   s.pick('0', 'basic_unicorn_0');
//   expect(s.zone('basic_unicorn_0')).toEqual({ zone: 'discard' });
//
// Cards are named by definition id; the first instance with that id is meant unless a card id is given.

import { getDef } from '../cards/registry';
import * as engine from '../engine';
import type { Answer, CardID, GameState, PlayerID, Prompt, Rng, RuleOptions, ZoneRef } from '../engine';

/** No shuffling, "random" picks the first item: scenarios stay readable. */
export const fixedRng: Rng = {
    shuffle: items => [...items],
    int: () => 0,
};

/** Deterministic pseudo-random source (mulberry32) for random-play tests. */
export function seededRng(seed: number): Rng {
    let a = seed >>> 0;
    const next = (): number => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
        int: n => Math.floor(next() * n),
        shuffle: items => {
            const out = [...items];
            for (let i = out.length - 1; i > 0; i--) {
                const j = Math.floor(next() * (i + 1));
                [out[i], out[j]] = [out[j], out[i]];
            }
            return out;
        },
    };
}

type CardName = string | CardID;

export class Scenario {
    G: GameState;
    rng: Rng;

    constructor(numPlayers: number, rules: Partial<RuleOptions> = {}, rng: Rng = fixedRng) {
        this.rng = rng;
        const G = engine.createGame(rng, numPlayers);
        // Start from an empty table: tests put down exactly the cards they need.
        G.cards = [];
        G.zones.deck = [];
        G.zones.nursery = [];
        G.players.forEach(p => { G.zones.hand[p.id] = []; G.zones.stable[p.id] = []; });
        G.options.rules = { ...G.options.rules, ...rules };
        this.G = G;
    }

    // ── building ──

    private spawn(def: string): CardID {
        getDef(def);
        this.G.cards.push({ def });
        return this.G.cards.length - 1;
    }

    stable(player: PlayerID, ...defs: string[]): this {
        defs.forEach(d => this.G.zones.stable[player].push(this.spawn(d)));
        return this;
    }

    hand(player: PlayerID, ...defs: string[]): this {
        defs.forEach(d => this.G.zones.hand[player].push(this.spawn(d)));
        return this;
    }

    /** Puts cards on the deck; the first one named is the top card. */
    deck(...defs: string[]): this {
        this.G.zones.deck.push(...defs.map(d => this.spawn(d)));
        return this;
    }

    discard(...defs: string[]): this {
        defs.forEach(d => this.G.zones.discard.push(this.spawn(d)));
        return this;
    }

    nursery(...defs: string[]): this {
        defs.forEach(d => this.G.zones.nursery.push(this.spawn(d)));
        return this;
    }

    sandbox(settings: { infiniteActions: boolean; skipNeigh: boolean }): this {
        this.G.sandbox = true;
        this.G.sandboxSettings = settings;
        return this;
    }

    /**
     * Starts `player`'s turn. With phase `action` (default) the Beginning of Turn phase and the turn
     * draw are skipped. The deck is topped up with filler cards so that draws never run dry.
     */
    start(player: PlayerID = '0', phase: 'bot' | 'action' = 'action', filler = 10): this {
        for (let i = 0; i < filler; i++) this.G.zones.deck.push(this.spawn('basic_unicorn_6'));
        engine.startTurn(this.G, this.rng, player);
        if (phase === 'action') {
            this.G.turn.phase = 'action';
            this.G.turn.drewForTurn = true;
            this.G.turn.bot.forEach(b => { b.state = 'used'; });
        }
        engine.advance(this.G, this.rng);
        return this;
    }

    // ── looking ──

    /** Card id of the n-th instance (0-based) of a definition, or the id itself. */
    id(card: CardName, nth = 0): CardID {
        if (typeof card === 'number') return card;
        const ids = this.G.cards.map((c, i) => (c.def === card ? i : -1)).filter(i => i !== -1);
        if (ids[nth] === undefined) throw new Error(`No card "${card}" (#${nth}) in this scenario`);
        return ids[nth];
    }

    zone(card: CardName, nth = 0): ZoneRef | undefined {
        return engine.locate(this.G, this.id(card, nth));
    }

    defs(cards: CardID[]): string[] {
        return cards.map(c => this.G.cards[c].def);
    }

    handOf(player: PlayerID): string[] { return this.defs(this.G.zones.hand[player]); }
    stableOf(player: PlayerID): string[] { return this.defs(this.G.zones.stable[player]); }
    discardPile(): string[] { return this.defs(this.G.zones.discard); }
    deckCards(): string[] { return this.defs(this.G.zones.deck); }

    prompts(player?: PlayerID): Prompt[] {
        return player === undefined ? this.G.prompts : this.G.prompts.filter(p => p.player === player);
    }

    /** The open prompt of a player; fails if there is none. */
    prompt(player: PlayerID): Prompt {
        const p = this.G.prompts.find(pr => pr.player === player);
        if (!p) {
            throw new Error(`Player ${player} has no open prompt. Open: ${JSON.stringify(this.G.prompts.map(pr => `${pr.player}:${pr.kind}:${pr.verb}`))}`);
        }
        return p;
    }

    /** Definition ids of the cards the player's prompt offers. */
    candidates(player: PlayerID): string[] {
        return this.defs(engine.candidateCards(this.prompt(player)));
    }

    free(player: PlayerID): engine.FreeActions {
        return engine.freeActions(this.G, player);
    }

    /** Verbs of the log entries, optionally only those with a given outcome. */
    logVerbs(outcome?: string): string[] {
        return this.G.log.filter(e => outcome === undefined || e.outcome === outcome).map(e => e.verb);
    }

    // ── acting (each returns the engine's error text, or undefined) ──

    answer(player: PlayerID, answer: Answer): string | undefined {
        return engine.respond(this.G, this.rng, player, this.prompt(player).id, answer);
    }

    private must(error: string | undefined, what: string): void {
        if (error) throw new Error(`${what} failed: ${error}`);
    }

    /** Chooses cards in the player's prompt. */
    pick(player: PlayerID, ...cards: CardName[]): this {
        const prompt = this.prompt(player);
        const allowed = engine.candidateCards(prompt);
        const used: CardID[] = [];
        const ids = cards.map(c => {
            if (typeof c === 'number') return c;
            const found = allowed.find(a => this.G.cards[a].def === c && !used.includes(a));
            if (found === undefined) throw new Error(`"${c}" is not a candidate of ${player}'s prompt (${this.defs(allowed).join(', ')})`);
            used.push(found);
            return found;
        });
        this.must(engine.respond(this.G, this.rng, player, prompt.id, { cards: ids }), 'pick');
        return this;
    }

    pickPlayer(player: PlayerID, target: PlayerID): this {
        this.must(this.answer(player, { players: [target] }), 'pickPlayer');
        return this;
    }

    /** Chooses a mode of an "A OR B" prompt by index or by a part of its label. */
    mode(player: PlayerID, which: number | string): this {
        const prompt = this.prompt(player);
        let index = which as number;
        if (typeof which === 'string') {
            const found = prompt.candidates.find(c => 'mode' in c && c.label.toLowerCase().includes(which.toLowerCase()));
            if (!found || !('mode' in found)) throw new Error(`No mode "${which}" in ${JSON.stringify(prompt.candidates)}`);
            index = found.mode;
        }
        this.must(this.answer(player, { mode: index }), 'mode');
        return this;
    }

    yes(player: PlayerID): this {
        this.must(this.answer(player, { confirm: true }), 'yes');
        return this;
    }

    skip(player: PlayerID): this {
        this.must(this.answer(player, { skip: true }), 'skip');
        return this;
    }

    /** Everybody passes in the open response round(s). */
    passAll(): this {
        for (let i = 0; i < 100 && this.G.round; i++) {
            const prompt = this.G.prompts.find(p => p.round !== undefined)!;
            this.must(engine.respond(this.G, this.rng, prompt.player, prompt.id, { skip: true }), 'pass');
        }
        return this;
    }

    /** Plays a card and lets everybody pass. */
    play(player: PlayerID, card: CardName, target?: PlayerID): this {
        this.playOnly(player, card, target);
        return this.passAll();
    }

    /** Plays a card and leaves the response round open. */
    playOnly(player: PlayerID, card: CardName, target?: PlayerID): this {
        this.must(engine.playCard(this.G, this.rng, player, this.handCard(player, card), target), `play ${card}`);
        return this;
    }

    tryPlay(player: PlayerID, card: CardName, target?: PlayerID): string | undefined {
        return engine.playCard(this.G, this.rng, player, this.handCard(player, card), target);
    }

    /** Answers the response round with an Instant card from the player's hand. */
    neigh(player: PlayerID, card: CardName = 'neigh'): this {
        this.must(this.answer(player, { cards: [this.handCard(player, card)] }), 'neigh');
        return this;
    }

    private handCard(player: PlayerID, card: CardName): CardID {
        if (typeof card === 'number') return card;
        const found = this.G.zones.hand[player].find(c => this.G.cards[c].def === card);
        if (found === undefined) throw new Error(`Player ${player} has no "${card}" in hand (${this.handOf(player).join(', ')})`);
        return found;
    }

    drawForTurn(player: PlayerID): this {
        this.must(engine.drawForTurn(this.G, this.rng, player), 'drawForTurn');
        return this;
    }

    drawForAction(player: PlayerID): this {
        this.must(engine.drawForAction(this.G, this.rng, player), 'drawForAction');
        return this;
    }

    endTurn(player: PlayerID): this {
        this.must(engine.endTurn(this.G, this.rng, player), 'endTurn');
        return this;
    }

    /** Uses the begin-of-turn ability of a card in the player's stable. */
    useBot(player: PlayerID, card: CardName): this {
        const id = this.id(card);
        const index = this.G.turn.bot.findIndex(b => b.card === id && b.state === 'open');
        this.must(index === -1 ? 'no open begin-of-turn ability' : engine.useBotAbility(this.G, this.rng, player, index), `useBot ${card}`);
        return this;
    }
}

export function scenario(numPlayers = 2, rules: Partial<RuleOptions> = {}, rng: Rng = fixedRng): Scenario {
    return new Scenario(numPlayers, rules, rng);
}

/** Every card is in exactly one zone, and nothing in a zone is unknown. Returns the problems found. */
export function invariantViolations(G: GameState): string[] {
    const problems: string[] = [];
    const seen = new Map<CardID, string>();
    const visit = (card: CardID, where: string) => {
        if (G.cards[card] === undefined) problems.push(`unknown card ${card} in ${where}`);
        if (seen.has(card)) problems.push(`card ${card} (${G.cards[card]?.def}) is in ${seen.get(card)} and ${where}`);
        seen.set(card, where);
    };
    G.zones.deck.forEach(c => visit(c, 'deck'));
    G.zones.discard.forEach(c => visit(c, 'discard'));
    G.zones.nursery.forEach(c => visit(c, 'nursery'));
    G.zones.removed.forEach(c => visit(c, 'removed'));
    G.zones.pile.forEach(e => visit(e.card, 'pile'));
    G.players.forEach(p => {
        G.zones.hand[p.id].forEach(c => visit(c, `hand ${p.id}`));
        G.zones.stable[p.id].forEach(c => visit(c, `stable ${p.id}`));
    });
    G.cards.forEach((c, id) => { if (!seen.has(id)) problems.push(`card ${id} (${c.def}) is in no zone`); });
    G.players.forEach(p => {
        G.zones.hand[p.id].forEach(c => { if (getDef(G.cards[c].def).type === 'baby') problems.push(`baby ${c} in hand ${p.id}`); });
    });
    [...G.zones.deck, ...G.zones.discard].forEach(c => {
        if (getDef(G.cards[c].def).type === 'baby') problems.push(`baby ${c} in deck or discard pile`);
    });
    return problems;
}
