// Sandbox cheat moves on the new game state. Only active when `G.sandbox` is set.
//
// Cheats place cards directly: no protection rules, no triggers, no log — except `sandboxAddToStable`
// with `withEnter`, `sandboxDraw` and `sandboxForceEndTurn`, which go through the engine.
// The functions take the engine state and a random source and return an error text when refused;
// match.ts wraps them into boardgame.io moves.

import { hasDef, getDef, isStableType } from '../cards/registry';
import * as engine from '../engine';
import type { CardID, GameState, PlayerID, Rng, ZoneRef, Zones, CardInstance } from '../engine';

export type SandboxSettingKey = keyof NonNullable<GameState['sandboxSettings']>;

export interface SandboxSnapshot {
    cards: CardInstance[];
    zones: Zones;
}

type Cheat<Args extends unknown[]> = (G: GameState, rng: Rng, ...args: Args) => string | undefined | void;

function spawn(G: GameState, def: string): CardID | undefined {
    if (!hasDef(def)) return undefined;
    G.cards.push({ def });
    return G.cards.length - 1;
}

function isPlayer(G: GameState, player: PlayerID): boolean {
    return G.players.some(p => p.id === player);
}

/** Takes a card out of whatever zone it is in. */
function lift(G: GameState, card: CardID): void {
    const without = (list: CardID[]) => list.filter(c => c !== card);
    G.players.forEach(p => {
        G.zones.hand[p.id] = without(G.zones.hand[p.id]);
        G.zones.stable[p.id] = without(G.zones.stable[p.id]);
    });
    G.zones.deck = without(G.zones.deck);
    G.zones.discard = without(G.zones.discard);
    G.zones.nursery = without(G.zones.nursery);
    G.zones.removed = without(G.zones.removed);
    G.zones.pile = G.zones.pile.filter(e => e.card !== card);
}

/** Puts a card somewhere without asking any rule. Baby Unicorns never go to a hand, the deck or the discard pile. */
function place(G: GameState, card: CardID, to: ZoneRef, top = false): void {
    lift(G, card);
    const baby = getDef(G.cards[card].def).type === 'baby';
    const zone = baby && to.zone !== 'stable' ? 'nursery' : to.zone;
    switch (zone) {
        case 'hand': G.zones.hand[to.player!].push(card); break;
        case 'stable': G.zones.stable[to.player!].push(card); break;
        case 'deck': if (top) G.zones.deck.unshift(card); else G.zones.deck.push(card); break;
        case 'discard': G.zones.discard.push(card); break;
        case 'nursery': G.zones.nursery.push(card); break;
        default: G.zones.removed.push(card); break;
    }
    G.cardState[card] = { enteredSeq: engine.nextId(G) };
}

const addToHand: Cheat<[PlayerID, string]> = (G, _rng, player, def) => {
    if (!isPlayer(G, player)) return 'unknownPlayer';
    const card = spawn(G, def);
    if (card === undefined) return 'unknownCard';
    place(G, card, { zone: 'hand', player });
};

const addToStable: Cheat<[PlayerID, string, boolean]> = (G, rng, player, def, withEnter) => {
    if (!isPlayer(G, player)) return 'unknownPlayer';
    if (!hasDef(def)) return 'unknownCard';
    if (!isStableType(getDef(def).type)) return 'notAStableCard';
    const card = spawn(G, def)!;
    if (!withEnter) {
        place(G, card, { zone: 'stable', player });
        return;
    }
    // Through the engine: entry rules apply and "when this card enters" abilities trigger.
    G.zones.removed.push(card);
    const result = engine.moveCard(G, { card, to: { zone: 'stable', player }, cause: 'bring', actor: player });
    if (!result.moved) place(G, card, { zone: 'hand', player });
    engine.advance(G, rng);
};

const addToDiscard: Cheat<[string]> = (G, _rng, def) => {
    const card = spawn(G, def);
    if (card === undefined) return 'unknownCard';
    place(G, card, { zone: 'discard' });
};

const addToDeckTop: Cheat<[string]> = (G, _rng, def) => {
    const card = spawn(G, def);
    if (card === undefined) return 'unknownCard';
    place(G, card, { zone: 'deck' }, true);
};

const addToNursery: Cheat<[string]> = (G, _rng, def) => {
    const card = spawn(G, def);
    if (card === undefined) return 'unknownCard';
    place(G, card, { zone: 'nursery' });
};

const draw: Cheat<[PlayerID, number]> = (G, rng, player, count) => {
    if (!isPlayer(G, player)) return 'unknownPlayer';
    engine.drawCards(G, rng, player, Math.max(0, Math.min(20, Math.floor(count))));
    engine.advance(G, rng);
};

const discardRandom: Cheat<[PlayerID]> = (G, rng, player) => {
    if (!isPlayer(G, player)) return 'unknownPlayer';
    const hand = G.zones.hand[player];
    if (hand.length === 0) return;
    place(G, hand[rng.int(hand.length)], { zone: 'discard' });
};

const emptyHand: Cheat<[PlayerID]> = (G, _rng, player) => {
    if (!isPlayer(G, player)) return 'unknownPlayer';
    [...G.zones.hand[player]].forEach(card => place(G, card, { zone: 'discard' }));
};

const forceEndTurn: Cheat<[]> = (G, rng) => {
    engine.forceEndTurn(G, rng);
};

const reshuffleDiscard: Cheat<[]> = (G, rng) => {
    const cards = rng.shuffle([...G.zones.discard]);
    G.zones.discard = [];
    G.zones.deck = [...G.zones.deck, ...cards];
    cards.forEach(card => { G.cardState[card] = { enteredSeq: engine.nextId(G) }; });
};

/** Drops everything that is resolving or being asked; cards that were being played go to the discard pile. */
const clearPending: Cheat<[]> = (G) => {
    G.chain = [];
    G.prompts = [];
    G.round = undefined;
    [...G.zones.pile].forEach(entry => place(G, entry.card, { zone: 'discard' }));
    G.turn.bot.forEach(b => { if (b.state === 'running') b.state = 'used'; });
};

const setSetting: Cheat<[SandboxSettingKey, boolean]> = (G, _rng, key, value) => {
    if (!G.sandboxSettings || !(key in G.sandboxSettings)) return 'unknownSetting';
    G.sandboxSettings[key] = value === true;
};

const bounceCard: Cheat<[CardID]> = (G, _rng, card) => {
    const owner = engine.stableOwner(G, card);
    if (owner === undefined) return 'notInAStable';
    place(G, card, { zone: 'hand', player: owner });
};

const destroyCard: Cheat<[CardID]> = (G, _rng, card) => {
    if (engine.stableOwner(G, card) === undefined) return 'notInAStable';
    place(G, card, { zone: 'discard' });
};

const stealCard: Cheat<[CardID, PlayerID]> = (G, _rng, card, to) => {
    if (!isPlayer(G, to)) return 'unknownPlayer';
    if (engine.stableOwner(G, card) === undefined) return 'notInAStable';
    place(G, card, { zone: 'stable', player: to });
};

const handToStable: Cheat<[CardID, PlayerID]> = (G, _rng, card, to) => {
    if (!isPlayer(G, to)) return 'unknownPlayer';
    if (engine.locate(G, card)?.zone !== 'hand') return 'notInHand';
    if (!isStableType(engine.defOf(G, card).type)) return 'notAStableCard';
    place(G, card, { zone: 'stable', player: to });
};

const forceDiscardCard: Cheat<[PlayerID, CardID]> = (G, _rng, player, card) => {
    if (!isPlayer(G, player) || !G.zones.hand[player].includes(card)) return 'notInHand';
    place(G, card, { zone: 'discard' });
};

const loadState: Cheat<[SandboxSnapshot]> = (G, _rng, snapshot) => {
    if (!snapshot || !Array.isArray(snapshot.cards) || !snapshot.zones) return 'malformedSnapshot';
    if (!snapshot.cards.every(c => c && hasDef(c.def))) return 'unknownCard';
    const zones = snapshot.zones;
    const next: Zones = {
        deck: [...(zones.deck ?? [])],
        discard: [...(zones.discard ?? [])],
        nursery: [...(zones.nursery ?? [])],
        removed: [...(zones.removed ?? [])],
        hand: {},
        stable: {},
        pile: [],
    };
    G.players.forEach(p => {
        next.hand[p.id] = [...(zones.hand?.[p.id] ?? [])];
        next.stable[p.id] = [...(zones.stable?.[p.id] ?? [])];
    });
    // Every card must end up in exactly one zone; cards the snapshot lost go to the removed zone.
    const seen = new Set<CardID>();
    const dedupe = (list: CardID[]) => list.filter(c => {
        if (snapshot.cards[c] === undefined || seen.has(c)) return false;
        seen.add(c);
        return true;
    });
    G.players.forEach(p => { next.stable[p.id] = dedupe(next.stable[p.id]); next.hand[p.id] = dedupe(next.hand[p.id]); });
    next.deck = dedupe(next.deck);
    next.discard = dedupe(next.discard);
    next.nursery = dedupe(next.nursery);
    next.removed = dedupe(next.removed);
    snapshot.cards.forEach((_c, id) => { if (!seen.has(id)) next.removed.push(id); });

    G.cards = snapshot.cards.map(c => ({ def: c.def }));
    G.zones = next;
    G.cardState = {};
    G.chain = [];
    G.prompts = [];
    G.round = undefined;
    G.turn.bot = [];
    G.turn.botSnapshot = [];
};

/** What "save state" stores; `sandboxLoadState` takes it back. */
export function serializeSandboxSnapshot(G: GameState): SandboxSnapshot {
    return JSON.parse(JSON.stringify({ cards: G.cards, zones: { ...G.zones, pile: [] } }));
}

export const sandboxCheats = {
    sandboxAddToHand: addToHand,
    sandboxAddToStable: addToStable,
    sandboxAddToDiscard: addToDiscard,
    sandboxAddToDeckTop: addToDeckTop,
    sandboxAddToNursery: addToNursery,
    sandboxDraw: draw,
    sandboxDiscardRandom: discardRandom,
    sandboxEmptyHand: emptyHand,
    sandboxForceEndTurn: forceEndTurn,
    sandboxReshuffleDiscard: reshuffleDiscard,
    sandboxClearPending: clearPending,
    sandboxSetSetting: setSetting,
    sandboxBounceCard: bounceCard,
    sandboxDestroyCard: destroyCard,
    sandboxStealCard: stealCard,
    sandboxHandToStable: handToStable,
    sandboxForceDiscardCard: forceDiscardCard,
    sandboxLoadState: loadState,
};

export type SandboxCheatName = keyof typeof sandboxCheats;
