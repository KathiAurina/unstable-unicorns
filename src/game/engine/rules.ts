// Rule queries (expansion-plan.md 5.5): pure questions about a game state.
//
// Nothing else decides these. Every query that depends on continuous effects scans the static
// abilities of the cards in the stables, skipping abilities that are switched off (blinded unicorns).
// Every "no" comes with a reason so the UI and the log can explain it.

import type { CardDef, CardFilter, StaticRule, Verb } from '../cards/types';
import { getDef, isStableType, isUnicornType } from '../cards/registry';
import type { CardID, GameState, PileEntry, PlayerID, Reason, ZoneRef } from './state';
import { BASE_HAND_LIMIT } from './options';

export type Verdict = { ok: true } | { ok: false; reason: Reason };
const OK: Verdict = { ok: true };
const no = (rule: string, card?: CardID): Verdict => ({ ok: false, reason: card === undefined ? { rule } : { rule, card } });

// ─── Cards and zones ──────────────────────────────────────────────────────────

export function defOf(G: GameState, card: CardID): CardDef {
    return getDef(G.cards[card].def);
}

export function isUnicorn(G: GameState, card: CardID): boolean {
    return isUnicornType(defOf(G, card).type);
}

/** Where a card currently is. */
export function locate(G: GameState, card: CardID): ZoneRef | undefined {
    for (const p of G.players) {
        if (G.zones.stable[p.id].includes(card)) return { zone: 'stable', player: p.id };
        if (G.zones.hand[p.id].includes(card)) return { zone: 'hand', player: p.id };
    }
    if (G.zones.deck.includes(card)) return { zone: 'deck' };
    if (G.zones.discard.includes(card)) return { zone: 'discard' };
    if (G.zones.nursery.includes(card)) return { zone: 'nursery' };
    if (G.zones.removed.includes(card)) return { zone: 'removed' };
    if (G.zones.pile.some(e => e.card === card)) return { zone: 'pile' };
    return undefined;
}

/** The player in whose stable the card is, if it is in one. */
export function stableOwner(G: GameState, card: CardID): PlayerID | undefined {
    for (const p of G.players) {
        if (G.zones.stable[p.id].includes(card)) return p.id;
    }
    return undefined;
}

// ─── Filters ──────────────────────────────────────────────────────────────────

/** Does the definition match the filter? Looks at type and name only. */
export function defMatches(def: CardDef, filter?: CardFilter): boolean {
    if (!filter) return true;
    if (filter.unicorn && !isUnicornType(def.type)) return false;
    if (filter.types && !filter.types.includes(def.type)) return false;
    if (filter.nameIncludes && !def.name.toLowerCase().includes(filter.nameIncludes.toLowerCase())) return false;
    return true;
}

export function matchesFilter(G: GameState, card: CardID, filter?: CardFilter): boolean {
    return defMatches(defOf(G, card), filter);
}

/** Does the filter ask for a Unicorn card ("a Unicorn card", "a Basic Unicorn card") rather than "a card"? */
export function filterAsksUnicorn(filter?: CardFilter): boolean {
    if (!filter) return false;
    if (filter.unicorn) return true;
    return !!filter.types && filter.types.length > 0 && filter.types.every(isUnicornType);
}

// ─── Static abilities ─────────────────────────────────────────────────────────

export interface ActiveStatic {
    card: CardID;
    owner: PlayerID;
    rule: StaticRule;
}

function staticsOf(G: GameState, card: CardID, owner: PlayerID): ActiveStatic[] {
    const out: ActiveStatic[] = [];
    defOf(G, card).abilities.forEach(a => {
        if (a.kind === 'static') out.push({ card, owner, rule: a.rule });
    });
    return out;
}

/** The card in `player`'s stable that carries a static rule of this kind, ignoring whether it is switched off. */
function carrierOf(G: GameState, player: PlayerID, kind: StaticRule['kind']): CardID | undefined {
    return G.zones.stable[player].find(c => defOf(G, c).abilities.some(a => a.kind === 'static' && a.rule.kind === kind));
}

/** The card that turns the unicorns of this stable into Pandas, if any. */
export function maskingCard(G: GameState, player: PlayerID): CardID | undefined {
    return carrierOf(G, player, 'masquerade');
}

/** The card that blinds the unicorns of this stable, if any. */
export function blindingCard(G: GameState, player: PlayerID): CardID | undefined {
    return carrierOf(G, player, 'blind');
}

/** Masquerade: the card is a Unicorn card in a stable whose unicorns are Pandas. */
export function isMasked(G: GameState, card: CardID): boolean {
    const owner = stableOwner(G, card);
    return owner !== undefined && isUnicorn(G, card) && maskingCard(G, owner) !== undefined;
}

/** Blinding: the card is a Unicorn card in a stable whose unicorns have no effects. */
export function isBlinded(G: GameState, card: CardID): boolean {
    const owner = stableOwner(G, card);
    if (owner === undefined || !isUnicorn(G, card)) return false;
    if (blindingCard(G, owner) === undefined) return false;
    // R1: under the legacy rule masquerade wins and the unicorns keep their abilities.
    if (!G.options.rules.blindingBeatsMasquerade && maskingCard(G, owner) !== undefined) return false;
    return true;
}

/** Are the continuous abilities of this card in effect? */
export function staticsActive(G: GameState, card: CardID): boolean {
    if (stableOwner(G, card) === undefined) return false;
    if (!isUnicorn(G, card)) return true;
    if (isBlinded(G, card)) return false;
    if (G.cardState[card]?.staticsOff) return false;
    return true;
}

/** All static rules currently in effect, with the card that carries them and that card's stable. */
export function activeStatics(G: GameState): ActiveStatic[] {
    const out: ActiveStatic[] = [];
    G.players.forEach(p => {
        G.zones.stable[p.id].forEach(card => {
            const all = staticsOf(G, card, p.id);
            if (all.length === 0) return;
            const active = staticsActive(G, card);
            all.forEach(s => {
                // Blinding and masquerade decide whether other abilities are active; they are never switched off themselves.
                if (active || s.rule.kind === 'blind' || s.rule.kind === 'masquerade') out.push(s);
            });
        });
    });
    return out;
}

// ─── What may happen to a card ────────────────────────────────────────────────

/**
 * Masquerade (R4): is this card out of reach of an effect with this verb and filter?
 * Standard: an effect that asks for a "Unicorn card" cannot affect masked unicorns; "a card" can.
 * Legacy: only "destroy a Unicorn card" and every sacrifice are blocked.
 */
export function hiddenByMask(G: GameState, card: CardID, verb: Verb, filter?: CardFilter): boolean {
    if (!isMasked(G, card)) return false;
    if (G.options.rules.masqueradeScope === 'unicornFilters') return filterAsksUnicorn(filter);
    if (verb === 'sacrifice') return true;
    if (verb === 'destroy') return filterAsksUnicorn(filter);
    return false;
}

/** May this card enter that stable (played, brought, stolen or moved)? */
export function canEnter(G: GameState, card: CardID, player: PlayerID): Verdict {
    const def = defOf(G, card);
    if (!isStableType(def.type)) return no('notAStableCard');

    const limit = G.options.rules.stableLimit;
    if (limit !== null) {
        const unicorns = G.zones.stable[player].filter(c => c !== card && isUnicorn(G, c)).length;
        if (unicorns >= limit) return no('stableFull');
    }

    for (const s of activeStatics(G)) {
        if (s.rule.kind !== 'cannotEnter' || !defMatches(def, s.rule.filter)) continue;
        if (s.rule.stables === 'yours' && s.owner === player) return no('cannotEnter', s.card);
        if (s.rule.stables === 'othersThanYours' && s.owner !== player) return no('cannotEnter', s.card);
    }
    return OK;
}

/** May `verb` be applied to this card by an effect of `source`? (Protection rules; masquerade is handled by filters.) */
export function canBeAffected(G: GameState, card: CardID, verb: Verb, source?: CardID): Verdict {
    const owner = stableOwner(G, card);
    for (const s of activeStatics(G)) {
        if (s.rule.kind !== 'protect' || !s.rule.verbs.includes(verb)) continue;
        const covered = s.rule.cards === 'self'
            ? s.card === card
            : owner === s.owner && isUnicorn(G, card);
        if (!covered) continue;
        if (s.rule.bySourceType) {
            if (source === undefined || !s.rule.bySourceType.includes(defOf(G, source).type)) continue;
        }
        return no('protected', s.card);
    }
    return OK;
}

// ─── Players ──────────────────────────────────────────────────────────────────

/** How many unicorns the player has for winning and for "more than N unicorns" checks. */
export function unicornCount(G: GameState, player: PlayerID): number {
    if (maskingCard(G, player) !== undefined) return 0;
    const statics = activeStatics(G);
    let count = 0;
    G.zones.stable[player].forEach(card => {
        if (!isUnicorn(G, card)) return;
        const double = statics.find(s => s.card === card && s.rule.kind === 'countsAs');
        count += double && double.rule.kind === 'countsAs' ? double.rule.n : 1;
    });
    return count;
}

export function winThreshold(G: GameState): number {
    if (G.options.rules.winThreshold === 7) return 7;
    return G.players.length >= 6 ? 6 : 7;
}

export function canWin(G: GameState, player: PlayerID): boolean {
    return maskingCard(G, player) === undefined;
}

/** Players who currently fulfil the win condition, starting with the active player. */
export function playersWhoWin(G: GameState): PlayerID[] {
    const threshold = winThreshold(G);
    const ids = G.players.map(p => p.id);
    const start = Math.max(0, ids.indexOf(G.turn.player));
    return [...ids.slice(start), ...ids.slice(0, start)]
        .filter(p => canWin(G, p) && unicornCount(G, p) >= threshold);
}

export function handLimit(_G: GameState, _player: PlayerID): number {
    return BASE_HAND_LIMIT;
}

/** How many cards the player may play in their Action phase. */
export function playsAllowed(G: GameState, player: PlayerID): number {
    let plays = 1;
    activeStatics(G).forEach(s => {
        if (s.rule.kind !== 'extraPlays' || s.owner !== player) return;
        if (s.rule.ifInStableAtTurnStart && !(G.turn.player === player && G.turn.botSnapshot.includes(s.card))) return;
        plays += s.rule.n;
    });
    return plays;
}

/** The static rule that forbids this player to play that kind of card, if any. */
export function playRestriction(G: GameState, player: PlayerID, def: CardDef): Reason | undefined {
    const s = activeStatics(G).find(st => st.rule.kind === 'cannotPlay' && st.owner === player && defMatches(def, st.rule.filter));
    return s ? { rule: 'cannotPlay', card: s.card } : undefined;
}

// ─── Playing cards ────────────────────────────────────────────────────────────

/** Nothing is resolving, nobody is being asked, no card is being played. */
export function isQuiet(G: GameState): boolean {
    return G.chain.length === 0 && G.prompts.length === 0 && G.round === undefined && G.zones.pile.length === 0;
}

export function sandboxInfiniteActions(G: GameState): boolean {
    return G.sandbox === true && G.sandboxSettings?.infiniteActions === true;
}

export function sandboxSkipNeigh(G: GameState): boolean {
    return G.sandbox === true && G.sandboxSettings?.skipNeigh === true;
}

/** Stables a card may be played into. Empty for Magic and Instant cards. */
export function playTargets(G: GameState, player: PlayerID, card: CardID): PlayerID[] {
    const def = defOf(G, card);
    if (!isStableType(def.type)) return [];
    const ownOnly = isUnicornType(def.type) && !G.options.rules.playUnicornIntoAnyStable;
    return G.players
        .map(p => p.id)
        .filter(p => (!ownOnly || p === player) && canEnter(G, card, p).ok);
}

/** May the player play this card from their hand now? `target` is the destination stable for stable cards. */
export function canPlay(G: GameState, player: PlayerID, card: CardID, target?: PlayerID): Verdict {
    if (G.gameOver) return no('gameOver');
    if (G.turn.number === 0 || G.turn.player !== player) return no('notYourTurn');
    if (G.turn.phase !== 'action') return no('wrongPhase');
    if (!isQuiet(G)) return no('busy');
    if (G.turn.mustEnd) return no('mustEndTurn');
    if (!G.zones.hand[player].includes(card)) return no('notInHand');

    const def = defOf(G, card);
    if (def.type === 'instant') return no('instant');

    const restriction = playRestriction(G, player, def);
    if (restriction) return { ok: false, reason: restriction };

    if (!sandboxInfiniteActions(G)) {
        if (G.turn.drewForAction || G.turn.played >= playsAllowed(G, player)) return no('noPlaysLeft');
    }

    if (isStableType(def.type)) {
        const targets = playTargets(G, player, card);
        if (target !== undefined) {
            if (!targets.includes(target)) {
                const verdict = canEnter(G, card, target);
                return verdict.ok ? no('notYourStable') : verdict;
            }
        } else if (isUnicornType(def.type)) {
            if (!targets.includes(player)) return canEnter(G, card, player).ok ? no('cannotEnter') : canEnter(G, card, player);
        } else if (targets.length === 0) {
            return no('cannotEnter');
        }
    }
    return OK;
}

/** May the pile entry be Neigh'd? */
export function canBeNeighed(G: GameState, entry: PileEntry): boolean {
    if (sandboxSkipNeigh(G)) return false;
    const def = defOf(G, entry.card);
    if (def.abilities.some(a => a.kind === 'static' && a.rule.kind === 'cannotBeNeighed')) return false;
    const protectedPlays = activeStatics(G).some(s => s.rule.kind === 'yourPlaysCannotBeNeighed' && s.owner === entry.player);
    if (protectedPlays && (def.type !== 'instant' || G.options.rules.yayCoversInstants)) return false;
    return true;
}

/** Could a card of this definition, held by `player`, answer the pile entry? */
export function defCanRespond(G: GameState, player: PlayerID, def: CardDef, entry: PileEntry): boolean {
    if (entry.player === player) return false;
    const instant = def.abilities.find(a => a.kind === 'instant');
    if (!instant || instant.kind !== 'instant') return false;
    if (instant.effect.op === 'neigh' && !canBeNeighed(G, entry)) return false;
    if (playRestriction(G, player, def)) return false;
    return true;
}

/** The Instant cards in the player's hand that can answer the pile entry. */
export function responseCards(G: GameState, player: PlayerID, entry: PileEntry): CardID[] {
    return G.zones.hand[player].filter(c => defCanRespond(G, player, defOf(G, c), entry));
}

/**
 * Players who are asked in a response round for this entry: everyone who is allowed to play a card
 * that could answer it — whether or not they hold one, so that nobody learns who does.
 */
export function eligibleResponders(G: GameState, entry: PileEntry): PlayerID[] {
    const pool = Array.from(new Set(G.cards.map(c => c.def))).map(getDef);
    return G.players
        .map(p => p.id)
        .filter(p => pool.some(def => defCanRespond(G, p, def, entry)));
}
