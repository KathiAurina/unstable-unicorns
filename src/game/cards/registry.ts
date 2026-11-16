// The card registry: every definition, set and text, looked up by id.
// Definitions are never copied into the game state; the state only stores `cardId → definition id`.

import type { CardDef, CardSet, CardTexts, CardType } from './types';
import { UNICORN_TYPES } from './types';
import { baseDefs } from './defs/base';
import { adventuresDefs } from './defs/adventures';
import { ALL_SETS } from './sets';
import { en } from './i18n/en';
import { de } from './i18n/de';

export const ALL_DEFS: CardDef[] = [...baseDefs, ...adventuresDefs];

const defsById: Record<string, CardDef> = {};
ALL_DEFS.forEach(d => {
    if (defsById[d.id]) throw new Error(`Duplicate card definition id: ${d.id}`);
    defsById[d.id] = d;
});

const setsById: Record<string, CardSet> = {};
ALL_SETS.forEach(s => { setsById[s.id] = s; });

/** Set ids used before the registry existed (lobby setup data of older clients). */
const SET_ALIASES: Record<string, string> = {
    base_game: 'base_2e',
    adventures_2nd_edition: 'adventures_2e',
};

export function getDef(id: string): CardDef {
    const def = defsById[id];
    if (!def) throw new Error(`Unknown card definition: ${id}`);
    return def;
}

export function hasDef(id: string): boolean {
    return defsById[id] !== undefined;
}

export function resolveSetId(id: string): string {
    return SET_ALIASES[id] ?? id;
}

export function getSet(id: string): CardSet {
    const set = setsById[resolveSetId(id)];
    if (!set) throw new Error(`Unknown card set: ${id}`);
    return set;
}

export const BASE_SETS: CardSet[] = ALL_SETS.filter(s => s.kind === 'base');
export const EXPANSION_SETS: CardSet[] = ALL_SETS.filter(s => s.kind !== 'base');

// ─── Type helpers ─────────────────────────────────────────────────────────────

export function isUnicornType(type: CardType): boolean {
    return UNICORN_TYPES.includes(type);
}

/** Cards that stay in a stable when they resolve. */
export function isStableType(type: CardType): boolean {
    return isUnicornType(type) || type === 'upgrade' || type === 'downgrade';
}

/** Definition id without a variant suffix (`mermaid_unicorn@legacy` → `mermaid_unicorn`). */
export function baseDefId(id: string): string {
    const at = id.indexOf('@');
    return at === -1 ? id : id.slice(0, at);
}

// ─── Texts ────────────────────────────────────────────────────────────────────

export type Language = 'en' | 'de';

/** Card text in the given language. German falls back to English; variants fall back to their base definition. */
export function getCardText(defId: string, lang: Language = 'en'): { text: string; flavor: string } {
    const base = baseDefId(defId);
    const pick = (table: CardTexts) => table[defId] ?? table[base];
    const entry = (lang === 'de' ? pick(de) : undefined) ?? pick(en) ?? {};
    return { text: entry.text ?? '', flavor: entry.flavor ?? '' };
}

/** The text shown on a card: the rules text, or the flavour text for cards without one. */
export function getCardDescription(defId: string, lang: Language = 'en'): string {
    const { text, flavor } = getCardText(defId, lang);
    return text || flavor;
}

// ─── Deck building ────────────────────────────────────────────────────────────

export interface BuildDeckOptions {
    /** Definition ids that resolve to their variant definition, e.g. `{ mermaid_unicorn: 'legacy' }` → `mermaid_unicorn@legacy`. */
    cardVariants?: Record<string, string>;
}

export interface BuiltDeck {
    /** Definition id of every card instance; the index is the card id. */
    cards: { def: string }[];
    /** Card ids of the Baby Unicorns (they start in the Nursery). */
    nursery: number[];
    /** Card ids of all other cards, in inventory order (not shuffled). */
    deck: number[];
    /** The resolved set ids. */
    sets: string[];
}

/** Checks a set selection: exactly one base set plus any number of expansions. Returns the resolved ids. */
export function validateSetSelection(setIds: string[]): string[] {
    const ids = Array.from(new Set(setIds.map(resolveSetId)));
    const sets = ids.map(getSet);
    const bases = sets.filter(s => s.kind === 'base');
    if (bases.length === 0) throw new Error('A game needs a base set.');
    if (bases.length > 1) {
        const combinable = bases.every(b => bases.every(o => o === b || (b.combinableWith ?? []).includes(o.id)));
        if (!combinable) throw new Error(`These base sets cannot be combined: ${bases.map(b => b.id).join(', ')}`);
    }
    // Base sets first, then the others in the order they were given.
    return [...bases.map(b => b.id), ...sets.filter(s => s.kind !== 'base').map(s => s.id)];
}

/**
 * Builds the card instances for a set selection. If two sets list the same design the copies add up,
 * exactly as shuffling the physical decks together would.
 */
export function buildDeck(setIds: string[], options: BuildDeckOptions = {}): BuiltDeck {
    const ids = validateSetSelection(setIds);
    const variant = (def: string): string => {
        const v = options.cardVariants?.[def];
        return v && hasDef(`${def}@${v}`) ? `${def}@${v}` : def;
    };

    const cards: { def: string }[] = [];
    const nursery: number[] = [];
    const deck: number[] = [];

    ids.map(getSet).forEach(set => {
        set.nursery.forEach(def => {
            getDef(def);
            nursery.push(cards.length);
            cards.push({ def: variant(def) });
        });
    });
    ids.map(getSet).forEach(set => {
        set.cards.forEach(({ def, count }) => {
            getDef(def);
            for (let i = 0; i < count; i++) {
                deck.push(cards.length);
                cards.push({ def: variant(def) });
            }
        });
    });

    return { cards, nursery, deck, sets: ids };
}
