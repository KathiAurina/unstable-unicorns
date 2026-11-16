// Helper functions that keep card definitions close to the printed card text.
// They only build plain data (see types.ts).

import type {
    Ability, CardDef, CardFilter, CardType, Condition, Count, Effect, PlayerSel, Ref, StateCheck, StaticRule,
} from './types';

// ─── Card ─────────────────────────────────────────────────────────────────────

export function card(id: string, name: string, type: CardType, image: string, ...abilities: Ability[]): CardDef {
    return { id, name, type, image, abilities };
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export const UNICORN: CardFilter = { unicorn: true };
export const BASIC: CardFilter = { types: ['basic'] };
export const BABY: CardFilter = { types: ['baby'] };
export const UPGRADE: CardFilter = { types: ['upgrade'] };
export const DOWNGRADE: CardFilter = { types: ['downgrade'] };
export const UPGRADE_OR_DOWNGRADE: CardFilter = { types: ['upgrade', 'downgrade'] };
export const MAGIC: CardFilter = { types: ['magic'] };
export const INSTANT: CardFilter = { types: ['instant'] };
/** "a Neigh card" = an Instant card with Neigh in its name. */
export const NEIGH_CARD: CardFilter = { types: ['instant'], nameIncludes: 'Neigh' };
/** Cards that stay in a stable: Unicorn, Upgrade and Downgrade cards. */
export const STABLE_CARD: CardFilter = { types: ['baby', 'basic', 'magical', 'ultimate', 'diamond', 'upgrade', 'downgrade'] };
export const nameIncludes = (text: string): CardFilter => ({ nameIncludes: text });

// ─── Abilities ────────────────────────────────────────────────────────────────

export const spell = (effect: Effect): Ability => ({ kind: 'spell', effect });
export const onEnter = (effect: Effect): Ability => ({ kind: 'triggered', on: { on: 'enter' }, effect });
export const onBeginOfTurn = (effect: Effect): Ability => ({ kind: 'triggered', on: { on: 'bot' }, effect });
export const onSacrificedOrDestroyed = (effect: Effect): Ability => ({ kind: 'triggered', on: { on: 'sd' }, effect });
export const wheneverUnicornEnters = (effect: Effect): Ability => ({ kind: 'triggered', on: { on: 'unicornEnters' }, effect });
export const wheneverUnicornLeaves = (effect: Effect): Ability => ({ kind: 'triggered', on: { on: 'unicornLeaves' }, effect });
export const stateCheck = (check: StateCheck, effect: Effect): Ability => ({ kind: 'triggered', on: { on: 'state', check }, effect });
export const rule = (r: StaticRule): Ability => ({ kind: 'static', rule: r });
/** "If this card is sacrificed or destroyed, return it to your hand." */
export const flyer = (): Ability => onSacrificedOrDestroyed(addSelfToHand());
/** Neigh: playable when another player plays a card; stops it. */
export const neigh = (): Ability => ({ kind: 'instant', window: { event: 'cardPlayed', by: 'another' }, effect: { op: 'neigh' } });

// ─── Combinators ──────────────────────────────────────────────────────────────

export const all = (...parts: Effect[]): Effect => ({ op: 'all', parts });
export const then = (first: Effect, next: Effect): Effect => ({ op: 'then', first, next });
export const ifYouDo = (first: Effect, next: Effect): Effect => ({ op: 'ifYouDo', first, next });
export const may = (effect: Effect): Effect => ({ op: 'may', effect });
export const oneOf = (...modes: Effect[]): Effect => ({ op: 'oneOf', modes });
export const forEach = (players: PlayerSel, effect: Effect): Effect => ({ op: 'forEach', players, effect });
export const when = (cond: Condition, effect: Effect): Effect => ({ op: 'when', cond, effect });

export const EACH: PlayerSel = 'each';
export const EACH_OTHER: PlayerSel = 'eachOther';
export const CHOSEN_OTHER: PlayerSel = 'chosenOther';
export const ref = (name: string): Ref => ({ ref: name });
export const cardMatches = (name: string, filter: CardFilter): Condition => ({ cond: 'cardMatches', ref: name, filter });

// ─── Steps ────────────────────────────────────────────────────────────────────

export const draw = (count: number, opts: { reveal?: boolean; bind?: string } = {}): Effect => ({ op: 'draw', count, ...opts });
export const discard = (count: Count, filter?: CardFilter): Effect => ({ op: 'discard', count, ...(filter ? { filter } : {}) });
export const sacrifice = (count: Count, filter?: CardFilter): Effect => ({ op: 'sacrifice', count, ...(filter ? { filter } : {}) });
export const destroy = (count: number, filter?: CardFilter): Effect => ({ op: 'destroy', count, ...(filter ? { filter } : {}) });
export const steal = (count: number, filter?: CardFilter): Effect => ({ op: 'steal', count, ...(filter ? { filter } : {}) });
/** Return a card in another player's stable to their hand. */
export const returnToHand = (count: number, opts: { filter?: CardFilter; from?: 'others' | 'any'; bind?: string } = {}): Effect =>
    ({ op: 'returnToHand', count, from: opts.from ?? 'others', ...(opts.filter ? { filter: opts.filter } : {}), ...(opts.bind ? { bind: opts.bind } : {}) });
export const move = (opts: { filter?: CardFilter; from: 'yours' | 'any' }): Effect => ({ op: 'move', ...opts });
export const bring = (opts: { from: 'hand' | 'discard' | 'nursery'; filter?: CardFilter; cards?: Ref }): Effect => ({ op: 'bring', ...opts });
export const addToHand = (filter?: CardFilter): Effect => ({ op: 'addToHand', from: 'discard', ...(filter ? { filter } : {}) });
export const addSelfToHand = (): Effect => ({ op: 'addToHand', from: 'discard', self: true });
export const search = (filter?: CardFilter): Effect => ({ op: 'search', ...(filter ? { filter } : {}) });
export const pull = (): Effect => ({ op: 'takeFromHand', how: 'random' });
export const lookAndTake = (): Effect => ({ op: 'takeFromHand', how: 'look' });
export const tradeHands = (): Effect => ({ op: 'tradeHands' });
export const shuffleIntoDeck = (...what: ('self' | 'hand' | 'discard')[]): Effect => ({ op: 'shuffleIntoDeck', what });
export const extraTurn = (): Effect => ({ op: 'turn', action: 'extraTurn' });
export const endTurn = (): Effect => ({ op: 'turn', action: 'endTurn' });
