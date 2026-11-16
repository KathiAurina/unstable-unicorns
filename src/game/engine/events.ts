// The event pipeline (expansion-plan.md 5.6): the only code that moves cards between zones.
//
// For every move, in this order:
//   1. restrictions   — protection and entry rules; an illegal move does nothing and is logged with the reason
//   2. response round — reserved (Instants that answer a steal / sacrifice / destroy / draw; stage 5/6)
//   3. replacement    — reserved ("if … would …, … instead"; stage 4)
//   4. apply          — move the card; built-in rule: a Baby Unicorn that would go anywhere but a stable goes to the Nursery
//   5. log            — one entry
//   6. triggers       — abilities that listen are pushed onto the chain as one group, mandatory ones first
//   7. state checks   — "if at any time …" abilities

import type { Trigger, Verb } from '../cards/types';
import { isUnicornType } from '../cards/registry';
import type { CardID, GameState, LogEntry, PlayerID, Reason, Rng, ZoneRef } from './state';
import { nextId } from './state';
import { pushLog } from './log';
import { isOptionalEffect, pushLink } from './chain';
import {
    canBeAffected, canEnter, defOf, isBlinded, isMasked, isUnicorn, locate, unicornCount,
} from './rules';

export type Cause =
    | 'play' | 'enter' | 'bring' | 'steal' | 'move' | 'sacrifice' | 'destroy' | 'return' | 'discard'
    | 'draw' | 'pull' | 'take' | 'trade' | 'search' | 'add' | 'shuffleIn' | 'resolve' | 'neighed';

export interface MoveRequest {
    card: CardID;
    to: ZoneRef;
    cause: Cause;
    /** The player who does it. */
    actor: PlayerID;
    /** The card (and ability) that makes it happen. */
    source?: CardID;
    ability?: number;
    parentLog?: number;
    role?: LogEntry['role'];
    /** Do not write a log entry (bulk operations write one entry themselves). */
    silent?: boolean;
    /** Who may see which card it is. Default: everyone. */
    visibility?: PlayerID[];
    /** Where in the deck the card goes. Default: bottom. */
    position?: 'top' | 'bottom';
}

export interface MoveResult {
    moved: boolean;
    /** Where the card actually went (a Baby Unicorn goes to the Nursery). */
    to?: ZoneRef;
    logId?: number;
    reason?: Reason;
}

/** Causes that a protection rule can forbid, and the verb the rule names. */
const PROTECTED: Partial<Record<Cause, Verb>> = {
    destroy: 'destroy', sacrifice: 'sacrifice', steal: 'steal', return: 'return', move: 'move',
};

const LOG_VERB: Record<Cause, Verb> = {
    play: 'play', enter: 'enter', bring: 'bring', steal: 'steal', move: 'move', sacrifice: 'sacrifice',
    destroy: 'destroy', return: 'return', discard: 'discard', draw: 'draw', pull: 'pull', take: 'take',
    trade: 'trade', search: 'search', add: 'add', shuffleIn: 'shuffle', resolve: 'discard', neighed: 'neigh',
};

interface PendingTrigger {
    card: CardID;
    ability: number;
    controller: PlayerID;
}

function triggerIndices(G: GameState, card: CardID, on: Trigger['on']): number[] {
    const out: number[] = [];
    defOf(G, card).abilities.forEach((a, i) => {
        if (a.kind === 'triggered' && a.on.on === on) out.push(i);
    });
    return out;
}

/** Triggered abilities of a card work unless it is a blinded unicorn. */
function triggersActive(G: GameState, card: CardID): boolean {
    return !isBlinded(G, card);
}

/** Abilities of the other cards in `player`'s stable that listen for `on`. */
function listeners(G: GameState, player: PlayerID, on: Trigger['on'], except: CardID): PendingTrigger[] {
    const out: PendingTrigger[] = [];
    G.zones.stable[player].forEach(card => {
        if (card === except || !triggersActive(G, card)) return;
        triggerIndices(G, card, on).forEach(ability => out.push({ card, ability, controller: player }));
    });
    return out;
}

function removeFromZone(G: GameState, card: CardID, from: ZoneRef): void {
    const without = (list: CardID[]) => list.filter(c => c !== card);
    switch (from.zone) {
        case 'stable': G.zones.stable[from.player!] = without(G.zones.stable[from.player!]); break;
        case 'hand': G.zones.hand[from.player!] = without(G.zones.hand[from.player!]); break;
        case 'deck': G.zones.deck = without(G.zones.deck); break;
        case 'discard': G.zones.discard = without(G.zones.discard); break;
        case 'nursery': G.zones.nursery = without(G.zones.nursery); break;
        case 'removed': G.zones.removed = without(G.zones.removed); break;
        case 'pile': G.zones.pile = G.zones.pile.filter(e => e.card !== card); break;
    }
}

function addToZone(G: GameState, card: CardID, to: ZoneRef, req: MoveRequest): void {
    switch (to.zone) {
        case 'stable': G.zones.stable[to.player!].push(card); break;
        case 'hand': G.zones.hand[to.player!].push(card); break;
        case 'deck':
            if (req.position === 'top') G.zones.deck.unshift(card);
            else G.zones.deck.push(card);
            break;
        case 'discard': G.zones.discard.push(card); break;
        case 'nursery': G.zones.nursery.push(card); break;
        case 'removed': G.zones.removed.push(card); break;
        case 'pile': G.zones.pile.push({ card, player: req.actor }); break;
    }
}

/** Is the "if at any time" condition of a state-check ability true for this player? */
export function stateCheckHolds(G: GameState, player: PlayerID, trigger: Trigger): boolean {
    if (trigger.on !== 'state') return false;
    switch (trigger.check.kind) {
        case 'unicornCountAbove': return unicornCount(G, player) > trigger.check.n;
    }
}

/** State-check abilities in `player`'s stable whose condition holds right now. */
function stateTriggers(G: GameState, player: PlayerID): PendingTrigger[] {
    const out: PendingTrigger[] = [];
    G.zones.stable[player].forEach(card => {
        if (!triggersActive(G, card)) return;
        defOf(G, card).abilities.forEach((a, ability) => {
            if (a.kind === 'triggered' && a.on.on === 'state' && stateCheckHolds(G, player, a.on)) {
                out.push({ card, ability, controller: player });
            }
        });
    });
    return out;
}

/** Pushes a group of triggered abilities so that mandatory ones resolve first, then in the given order. */
function pushTriggerGroup(G: GameState, group: PendingTrigger[], parentLog: number | undefined): void {
    const optional = (t: PendingTrigger) => {
        const a = defOf(G, t.card).abilities[t.ability];
        return a.kind === 'triggered' && isOptionalEffect(a.effect);
    };
    const ordered = [...group.filter(t => !optional(t)), ...group.filter(optional)];
    // The chain is a stack: push in reverse so the first one ends up on top.
    for (let i = ordered.length - 1; i >= 0; i--) {
        const t = ordered[i];
        pushLink(G, { kind: 'ability', source: { card: t.card, ability: t.ability }, controller: t.controller, parentLog });
    }
}

/**
 * Step 7 for the standard rule (R5): pushes every "if at any time" ability whose condition holds
 * and that is not already waiting on the chain.
 */
export function runStateChecks(G: GameState): void {
    if (G.options.rules.tinyStable !== 'continuous') return;
    G.players.forEach(p => {
        stateTriggers(G, p.id).forEach(t => {
            const waiting = G.chain.some(l => l.source?.card === t.card && l.source.ability === t.ability);
            if (!waiting) pushLink(G, { kind: 'ability', source: { card: t.card, ability: t.ability }, controller: t.controller });
        });
    });
}

/** Moves one card. The single entry point for every zone change. */
export function moveCard(G: GameState, req: MoveRequest): MoveResult {
    const { card } = req;
    const from = locate(G, card);
    if (!from) return { moved: false, reason: { rule: 'notFound' } };
    const def = defOf(G, card);
    const rules = G.options.rules;
    let to: ZoneRef = { ...req.to };

    const prevented = (reason: Reason): MoveResult => {
        const logId = pushLog(G, {
            kind: 'event', verb: LOG_VERB[req.cause], actor: req.actor, cards: [card], from, to,
            source: req.source !== undefined ? { card: req.source, ability: req.ability } : undefined,
            parent: req.parentLog, role: req.role, outcome: 'prevented', reason,
        });
        return { moved: false, reason, logId };
    };

    // 1. Restrictions
    const protectedVerb = PROTECTED[req.cause];
    if (protectedVerb && from.zone === 'stable') {
        const verdict = canBeAffected(G, card, protectedVerb, req.source);
        if (!verdict.ok) return prevented(verdict.reason);
    }
    const fromOwner = from.zone === 'stable' ? from.player : undefined;
    const arrives = to.zone === 'stable' && to.player !== fromOwner;
    if (arrives) {
        const verdict = canEnter(G, card, to.player!);
        if (!verdict.ok) return prevented(verdict.reason);
    }

    // 4. Built-in rule: Baby Unicorns live in the Nursery or in a stable, nowhere else.
    if (def.type === 'baby' && to.zone !== 'stable' && to.zone !== 'nursery' && to.zone !== 'removed') {
        to = { zone: 'nursery' };
    }
    if (from.zone === to.zone && from.player === to.player) return { moved: false, reason: { rule: 'alreadyThere' } };

    // Look back in time: what was true just before the card left its stable.
    const leaves = fromOwner !== undefined;
    const wasBlinded = leaves && isBlinded(G, card);
    const wasMasked = leaves && isMasked(G, card);
    const leaveListeners = leaves && isUnicornType(def.type) ? listeners(G, fromOwner!, 'unicornLeaves', card) : [];

    // 4. Apply
    removeFromZone(G, card, from);
    addToZone(G, card, to, req);
    G.cardState[card] = { enteredSeq: nextId(G) };

    // 5. Log
    let logId: number | undefined;
    if (!req.silent) {
        logId = pushLog(G, {
            kind: 'event', verb: LOG_VERB[req.cause], actor: req.actor, cards: [card], from, to,
            source: req.source !== undefined ? { card: req.source, ability: req.ability } : undefined,
            parent: req.parentLog, role: req.role, outcome: 'done',
            players: fromOwner !== undefined && fromOwner !== req.actor ? [fromOwner]
                : from.zone === 'hand' && from.player !== req.actor ? [from.player!] : undefined,
            visibility: req.visibility ?? 'public',
            publicText: req.visibility ? 'count-only' : undefined,
        });
    }

    // 6. Triggers
    const group: PendingTrigger[] = [];
    if (leaves) {
        // "Each time a Unicorn card leaves your Stable" (R14: not for a masked unicorn under the standard rule).
        if (!(wasMasked && !rules.barbedWireOnMaskedLeave)) group.push(...leaveListeners);
        // "If this card is sacrificed or destroyed"
        if ((req.cause === 'sacrifice' || req.cause === 'destroy') && !wasBlinded) {
            triggerIndices(G, card, 'sd').forEach(ability => group.push({ card, ability, controller: fromOwner! }));
        }
    }
    if (arrives) {
        const owner = to.player!;
        // R13 legacy: a unicorn that enters while blinded never gets its continuous effects.
        if (!rules.blindingRestoresEffects && isBlinded(G, card)) G.cardState[card].staticsOff = true;
        // "Each time a Unicorn card enters your Stable" — evaluated before a masquerade applies.
        if (isUnicorn(G, card)) group.push(...listeners(G, owner, 'unicornEnters', card));
        // R5 legacy: "if at any time" abilities are only checked when a card enters that stable.
        if (rules.tinyStable === 'onEnter') group.push(...stateTriggers(G, owner));
        // "When this card enters your Stable"
        if (triggersActive(G, card)) {
            triggerIndices(G, card, 'enter').forEach(ability => group.push({ card, ability, controller: owner }));
        }
    }
    if (group.length > 0) pushTriggerGroup(G, group, logId ?? req.parentLog);

    // 7. State checks
    runStateChecks(G);

    return { moved: true, to, logId };
}

// ─── Bulk operations ──────────────────────────────────────────────────────────

/** Shuffles the discard pile into the deck. */
export function shuffleDiscardIntoDeck(G: GameState, rng: Rng, meta: { actor: PlayerID; source?: CardID; parentLog?: number }): void {
    const cards = [...G.zones.discard];
    cards.forEach(card => moveCard(G, { card, to: { zone: 'deck' }, cause: 'shuffleIn', actor: meta.actor, silent: true }));
    G.zones.deck = rng.shuffle(G.zones.deck);
    pushLog(G, {
        kind: 'event', verb: 'shuffle', actor: meta.actor, count: cards.length, from: { zone: 'discard' }, to: { zone: 'deck' },
        source: meta.source !== undefined ? { card: meta.source } : undefined, parent: meta.parentLog, outcome: 'done',
    });
}

export interface DrawMeta {
    source?: CardID;
    ability?: number;
    parentLog?: number;
    role?: LogEntry['role'];
    /** Show the drawn cards to everyone. */
    reveal?: boolean;
}

/**
 * One draw action: `count` cards from the top of the deck into the player's hand. If the deck is too
 * small, the discard pile is shuffled underneath it first (K1). Returns the drawn cards.
 */
export function drawCards(G: GameState, rng: Rng, player: PlayerID, count: number, meta: DrawMeta = {}): CardID[] {
    if (G.zones.deck.length < count && G.zones.discard.length > 0) {
        const reshuffled = rng.shuffle([...G.zones.discard]);
        G.zones.discard = [];
        G.zones.deck = [...G.zones.deck, ...reshuffled];
        reshuffled.forEach(card => { G.cardState[card] = { enteredSeq: nextId(G) }; });
        pushLog(G, {
            kind: 'event', verb: 'shuffle', actor: player, count: reshuffled.length,
            from: { zone: 'discard' }, to: { zone: 'deck' }, role: 'rule', outcome: 'done',
        });
    }
    const drawn = G.zones.deck.slice(0, count);
    drawn.forEach(card => moveCard(G, { card, to: { zone: 'hand', player }, cause: 'draw', actor: player, silent: true }));
    if (drawn.length > 0 || count > 0) {
        pushLog(G, {
            kind: 'event', verb: 'draw', actor: player, cards: drawn, count: drawn.length,
            from: { zone: 'deck' }, to: { zone: 'hand', player },
            source: meta.source !== undefined ? { card: meta.source, ability: meta.ability } : undefined,
            parent: meta.parentLog, role: meta.role,
            outcome: drawn.length > 0 ? 'done' : 'fizzled',
            reason: drawn.length > 0 ? undefined : { rule: 'deckEmpty' },
            visibility: meta.reveal ? 'public' : [player],
            publicText: meta.reveal ? undefined : 'count-only',
        });
    }
    return drawn;
}
