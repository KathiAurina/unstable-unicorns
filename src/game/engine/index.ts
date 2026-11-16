// Public API of the rules engine. Everything outside engine/ (the boardgame.io wiring, the UI, tests)
// goes through these functions. Each move returns an error text when it is not legal and leaves the
// state untouched in that case.
//
// The engine does not know boardgame.io: the random source is passed in, ids come from `G.seq`.

import { buildDeck, validateSetSelection, getSet } from '../cards/registry';
import type { Answer, CardID, GameState, PlayerID, Rng } from './state';
import { LEGACY_RULES, RULE_PRESETS, HAND_SIZE_AT_START } from './options';
import type { RulePreset } from './options';
import { defaultAnswer, removePrompt, validateAnswer } from './prompt';
import { answerRound, beginPlay } from './play';
import {
    advance, canDrawForAction, canDrawForTurn, canEndTurn, checkWin, drawForAction as doDrawForAction,
    drawForTurn as doDrawForTurn, endTurn as doEndTurn, startTurn, usableBotAbilities, useBotAbility as doUseBotAbility,
} from './turn';
import { canPlay, playTargets } from './rules';

export * from './state';
export * from './options';
export * from './rules';
export { describeEffect, describeFilter } from './describe';
export { usableBotAbilities, botAbilityEffect, canDrawForTurn, canDrawForAction, canEndTurn, advance, startTurn, checkWin } from './turn';
export { candidateCards, candidatePlayers, candidateModes, defaultAnswer, validateAnswer } from './prompt';
export { moveCard, drawCards } from './events';

// ─── Setup ────────────────────────────────────────────────────────────────────

export interface SetupOptions {
    /** Set ids: one base set plus expansions. Old ids (`base_game`, …) are accepted. Default: the base set. */
    sets?: string[];
    ownerPlayerID?: PlayerID;
    sandbox?: boolean;
    preset?: RulePreset;
}

const SANDBOX_NAMES = ['player', 'dummy_1', 'dummy_2'];

/** Creates the state of a new game: deck shuffled, hands dealt, Baby Unicorns in the Nursery, pregame open. */
export function createGame(rng: Rng, numPlayers: number, setup: SetupOptions = {}): GameState {
    const sandbox = setup.sandbox === true;
    const preset: RulePreset = setup.preset ?? 'legacy';
    const rules = { ...(RULE_PRESETS[preset] ?? LEGACY_RULES) };

    let requested = setup.sets && setup.sets.length > 0 ? [...setup.sets] : ['base_2e'];
    if (!requested.some(id => getSet(id).kind === 'base')) requested = ['base_2e', ...requested];
    const sets = validateSetSelection(requested);
    const built = buildDeck(sets, { cardVariants: rules.cardVariants });

    const players = Array.from({ length: numPlayers }, (_, i) => ({
        id: `${i}`,
        name: sandbox ? (SANDBOX_NAMES[i] ?? `dummy_${i}`) : `Player ${i}`,
    }));

    let deck = rng.shuffle([...built.deck]);
    const hand: Record<PlayerID, CardID[]> = {};
    const stable: Record<PlayerID, CardID[]> = {};
    const ready: Record<PlayerID, boolean> = {};
    const lastHeartbeat: Record<PlayerID, number> = {};
    players.forEach(p => {
        hand[p.id] = deck.slice(0, HAND_SIZE_AT_START);
        deck = deck.slice(HAND_SIZE_AT_START);
        stable[p.id] = [];
        ready[p.id] = false;
        lastHeartbeat[p.id] = 0;
    });

    const G: GameState = {
        players,
        cards: built.cards,
        zones: { deck, discard: [], nursery: [...built.nursery], removed: [], hand, stable, pile: [] },
        cardState: {},
        turn: { number: 0, player: players[0].id, phase: 'bot', botSnapshot: [], bot: [], played: 0, drewForTurn: false, drewForAction: false },
        extraTurns: [],
        chain: [],
        prompts: [],
        log: [],
        seq: 0,
        options: { sets, preset, rules },
        babyStarter: [],
        ready,
        owner: setup.ownerPlayerID ?? '0',
        lastHeartbeat,
    };

    if (sandbox) {
        // Sandbox skips the pregame: every player gets a random Baby Unicorn.
        const babies = rng.shuffle([...G.zones.nursery]);
        players.forEach((p, i) => {
            G.babyStarter.push({ cardID: babies[i], owner: p.id });
            G.ready[p.id] = true;
        });
        G.sandbox = true;
        G.sandboxSettings = { infiniteActions: true, skipNeigh: true };
    }
    return G;
}

/** Ends the pregame: the chosen Baby Unicorns enter the stables and the first turn begins. */
export function startGame(G: GameState, rng: Rng): void {
    if (G.turn.number !== 0) return;
    G.babyStarter.forEach(({ cardID, owner }) => {
        if (!G.zones.nursery.includes(cardID)) return;
        G.zones.nursery = G.zones.nursery.filter(c => c !== cardID);
        G.zones.stable[owner].push(cardID);
    });
    startTurn(G, rng, G.players[0].id);
    advance(G, rng);
    afterMove(G);
}

// ─── Moves ────────────────────────────────────────────────────────────────────

function afterMove(G: GameState): void {
    // R7 legacy: a win is detected after every move, even while effects are still pending.
    if (G.options.rules.winCheck === 'everyMove') checkWin(G);
}

/** Runs a move, then the game forward. */
function move(G: GameState, rng: Rng, action: () => string | undefined): string | undefined {
    if (G.gameOver) return 'gameOver';
    const error = action();
    if (error) return error;
    advance(G, rng);
    afterMove(G);
    return undefined;
}

/** Answers a prompt. The single move for every decision of every player. */
export function respond(G: GameState, rng: Rng, player: PlayerID, promptId: string, answer: Answer): string | undefined {
    return move(G, rng, () => {
        const prompt = G.prompts.find(p => p.id === promptId);
        if (!prompt) return 'unknownPrompt';
        if (prompt.player !== player) return 'notYourPrompt';
        const invalid = validateAnswer(prompt, answer);
        if (invalid) return invalid;

        if (prompt.round !== undefined) return answerRound(G, prompt, answer);

        const link = G.chain.find(l => l.id === prompt.link);
        removePrompt(G, prompt.id);
        if (link && prompt.path !== undefined) {
            const mem = link.mem[prompt.path] ?? (link.mem[prompt.path] = {});
            mem.answer = answer;
        }
        return undefined;
    });
}

/** Plays a card from hand. `target` is the destination stable of an Upgrade or Downgrade (or Unicorn) card. */
export function playCard(G: GameState, rng: Rng, player: PlayerID, card: CardID, target?: PlayerID): string | undefined {
    return move(G, rng, () => beginPlay(G, player, card, target));
}

/** Begin of turn → draw: forfeits unused begin-of-turn abilities and draws the card for the turn. */
export function drawForTurn(G: GameState, rng: Rng, player: PlayerID): string | undefined {
    return move(G, rng, () => doDrawForTurn(G, player));
}

/** Action phase: draw a card instead of playing one. */
export function drawForAction(G: GameState, rng: Rng, player: PlayerID): string | undefined {
    return move(G, rng, () => doDrawForAction(G, player));
}

/** Beginning of turn: use the begin-of-turn ability `turn.bot[index]`. */
export function useBotAbility(G: GameState, rng: Rng, player: PlayerID, index: number): string | undefined {
    return move(G, rng, () => doUseBotAbility(G, player, index));
}

export function endTurn(G: GameState, rng: Rng, player: PlayerID): string | undefined {
    return move(G, rng, () => doEndTurn(G, player));
}

/**
 * Owner override for players who are away: answers every open decision with its default and ends
 * the current turn.
 */
export function forceEndTurn(G: GameState, rng: Rng): void {
    const turn = G.turn.number;
    for (let i = 0; i < 1000 && !G.gameOver && G.turn.number === turn; i++) {
        const prompt = G.prompts[0];
        if (prompt) {
            if (respond(G, rng, prompt.player, prompt.id, defaultAnswer(prompt, rng))) removePrompt(G, prompt.id);
            continue;
        }
        if (G.chain.length > 0) { advance(G, rng); continue; }
        if (G.turn.phase === 'bot' || G.turn.phase === 'action') G.turn.phase = 'eot';
        advance(G, rng);
    }
    afterMove(G);
}

// ─── What a player may do right now ───────────────────────────────────────────

export interface FreeActions {
    /** Begin of turn: draw the card for the turn (ends the Beginning of Turn phase). */
    drawForTurn: boolean;
    /** Action phase: draw instead of playing. */
    drawForAction: boolean;
    endTurn: boolean;
    /** Indices into `turn.bot` of usable begin-of-turn abilities. */
    bot: number[];
    /** Playable hand cards; `targets` lists the stables a Unicorn / Upgrade / Downgrade card may be played into. */
    play: { card: CardID; targets: PlayerID[] }[];
}

/** The actions `player` may take without being asked. Everything else is a prompt. */
export function freeActions(G: GameState, player: PlayerID): FreeActions {
    const play: FreeActions['play'] = [];
    if (G.turn.number > 0 && !G.gameOver) {
        G.zones.hand[player].forEach(card => {
            if (canPlay(G, player, card).ok) play.push({ card, targets: playTargets(G, player, card) });
        });
    }
    return {
        drawForTurn: canDrawForTurn(G, player),
        drawForAction: canDrawForAction(G, player),
        endTurn: canEndTurn(G, player),
        bot: usableBotAbilities(G, player),
        play,
    };
}
