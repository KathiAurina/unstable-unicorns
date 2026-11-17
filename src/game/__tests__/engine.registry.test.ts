import * as fs from 'fs';
import * as path from 'path';
import {
    ALL_DEFS, BASE_SETS, EXPANSION_SETS, buildDeck, getCardText, getDef, getSet, hasDef, resolveSetId, validateSetSelection,
} from '../cards/registry';
import { ALL_SETS } from '../cards/sets';
import { en } from '../cards/i18n/en';
import { de } from '../cards/i18n/de';
import type { Ability, CardDef, CardFilter, CardType, Effect, PlayerSel } from '../cards/types';

// Registry validation over every definition and every set (expansion-plan.md 10.2, first layer).

const CARD_TYPES: CardType[] = ['baby', 'basic', 'magical', 'ultimate', 'diamond', 'upgrade', 'downgrade', 'magic', 'instant'];
const IMAGE_DIR = path.join(__dirname, '..', '..', 'assets', 'card', 'square');

const COMBINATORS = ['all', 'then', 'ifYouDo', 'may', 'oneOf', 'forEach', 'when'];
const STEPS = [
    'draw', 'discard', 'sacrifice', 'destroy', 'steal', 'returnToHand', 'move', 'bring', 'addToHand', 'search',
    'takeFromHand', 'tradeHands', 'shuffleIntoDeck', 'turn',
];
const TRIGGERS = ['enter', 'bot', 'sd', 'unicornEnters', 'unicornLeaves', 'state'];
const STATIC_RULES = ['cannotPlay', 'cannotEnter', 'protect', 'blind', 'masquerade', 'countsAs', 'yourPlaysCannotBeNeighed', 'cannotBeNeighed', 'extraPlays'];

function filterProblems(filter: CardFilter | undefined, where: string): string[] {
    if (filter === undefined) return [];
    const out: string[] = [];
    const known = ['types', 'unicorn', 'nameIncludes'];
    Object.keys(filter).forEach(k => { if (!known.includes(k)) out.push(`${where}: unknown filter key ${k}`); });
    if (filter.types !== undefined) {
        if (filter.types.length === 0) out.push(`${where}: empty type list`);
        filter.types.forEach(t => { if (!CARD_TYPES.includes(t)) out.push(`${where}: unknown type ${t}`); });
    }
    if (filter.unicorn !== undefined && filter.unicorn !== true) out.push(`${where}: unicorn must be true`);
    if (filter.nameIncludes !== undefined && filter.nameIncludes.trim() === '') out.push(`${where}: empty nameIncludes`);
    return out;
}

const positive = (n: unknown): boolean => typeof n === 'number' && Number.isInteger(n) && n > 0;

/**
 * Walks an effect tree in resolution order. `bound` holds the names bound by earlier steps; a `ref`
 * must name one of them.
 */
function effectProblems(effect: Effect, where: string, bound: Set<string>): string[] {
    const out: string[] = [];
    const need = (name: string, what: string) => { if (!bound.has(name)) out.push(`${where}: ${what} refers to unbound "${name}"`); };
    const playerSel = (sel: PlayerSel) => {
        if (typeof sel === 'string') {
            if (!['each', 'eachOther', 'chosenOther'].includes(sel)) out.push(`${where}: unknown player selector ${sel}`);
        } else need(sel.ref, 'forEach');
    };
    const sub = (e: Effect, suffix: string) => out.push(...effectProblems(e, `${where}.${suffix}`, bound));

    if (!effect || typeof effect !== 'object' || !('op' in effect)) return [`${where}: not an effect`];
    if (!COMBINATORS.includes(effect.op) && !STEPS.includes(effect.op)) return [`${where}: unknown op ${(effect as { op: string }).op}`];

    switch (effect.op) {
        case 'all':
            if (effect.parts.length < 2) out.push(`${where}: "all" needs at least 2 parts`);
            effect.parts.forEach((p, i) => sub(p, `all[${i}]`));
            break;
        case 'then':
        case 'ifYouDo':
            sub(effect.first, `${effect.op}.first`);
            sub(effect.next, `${effect.op}.next`);
            break;
        case 'may':
            if (effect.effect.op === 'may') out.push(`${where}: "may" inside "may"`);
            sub(effect.effect, 'may');
            break;
        case 'oneOf':
            if (effect.modes.length < 2) out.push(`${where}: "oneOf" needs at least 2 modes`);
            // Each mode starts from the same bindings: a mode cannot use what another mode binds.
            effect.modes.forEach((m, i) => out.push(...effectProblems(m, `${where}.oneOf[${i}]`, new Set(bound))));
            break;
        case 'forEach':
            playerSel(effect.players);
            sub(effect.effect, 'forEach');
            break;
        case 'when':
            if (effect.cond.cond !== 'cardMatches') out.push(`${where}: unknown condition`);
            need(effect.cond.ref, 'when');
            out.push(...filterProblems(effect.cond.filter, `${where}.when`));
            sub(effect.effect, 'when');
            break;
        case 'draw':
            if (!positive(effect.count)) out.push(`${where}: draw count ${effect.count}`);
            if (effect.bind) bound.add(effect.bind);
            break;
        case 'discard':
        case 'sacrifice':
            if (effect.count !== 'all' && !positive(effect.count)) out.push(`${where}: ${effect.op} count ${effect.count}`);
            out.push(...filterProblems(effect.filter, where));
            break;
        case 'destroy':
        case 'steal':
            if (!positive(effect.count)) out.push(`${where}: ${effect.op} count ${effect.count}`);
            out.push(...filterProblems(effect.filter, where));
            break;
        case 'returnToHand':
            if (!positive(effect.count)) out.push(`${where}: returnToHand count ${effect.count}`);
            if (!['others', 'any'].includes(effect.from)) out.push(`${where}: returnToHand from ${effect.from}`);
            out.push(...filterProblems(effect.filter, where));
            if (effect.bind) bound.add(effect.bind);
            break;
        case 'move':
            if (!['yours', 'any'].includes(effect.from)) out.push(`${where}: move from ${effect.from}`);
            out.push(...filterProblems(effect.filter, where));
            break;
        case 'bring':
            if (!['hand', 'discard', 'nursery'].includes(effect.from)) out.push(`${where}: bring from ${effect.from}`);
            out.push(...filterProblems(effect.filter, where));
            if (effect.cards) need(effect.cards.ref, 'bring.cards');
            break;
        case 'addToHand':
            if (effect.from !== 'discard') out.push(`${where}: addToHand from ${(effect as { from: string }).from}`);
            if (effect.self && effect.filter) out.push(`${where}: addToHand self with a filter`);
            out.push(...filterProblems(effect.filter, where));
            break;
        case 'search':
            out.push(...filterProblems(effect.filter, where));
            break;
        case 'takeFromHand':
            if (!['random', 'look'].includes(effect.how)) out.push(`${where}: takeFromHand how ${effect.how}`);
            break;
        case 'tradeHands':
            break;
        case 'shuffleIntoDeck':
            if (effect.what.length === 0) out.push(`${where}: shuffleIntoDeck of nothing`);
            effect.what.forEach(w => { if (!['self', 'hand', 'discard'].includes(w)) out.push(`${where}: shuffleIntoDeck ${w}`); });
            break;
        case 'turn':
            if (!['extraTurn', 'endTurn'].includes(effect.action)) out.push(`${where}: turn action ${effect.action}`);
            break;
    }
    return out;
}

function abilityProblems(def: CardDef, ability: Ability, index: number): string[] {
    const where = `${def.id}[${index}]`;
    switch (ability.kind) {
        case 'spell':
            return [
                ...(def.type === 'magic' ? [] : [`${where}: a spell on a ${def.type} card`]),
                ...effectProblems(ability.effect, where, new Set()),
            ];
        case 'triggered': {
            const out: string[] = [];
            if (!TRIGGERS.includes(ability.on.on)) out.push(`${where}: unknown trigger ${ability.on.on}`);
            if (ability.on.on === 'state' && !(ability.on.check.kind === 'unicornCountAbove' && Number.isInteger(ability.on.check.n))) {
                out.push(`${where}: bad state check`);
            }
            if (def.type === 'magic' || def.type === 'instant') out.push(`${where}: a triggered ability on a ${def.type} card`);
            return [...out, ...effectProblems(ability.effect, where, new Set())];
        }
        case 'static': {
            const out: string[] = [];
            const r = ability.rule;
            if (!STATIC_RULES.includes(r.kind)) out.push(`${where}: unknown static rule ${r.kind}`);
            if (r.kind === 'cannotPlay') out.push(...filterProblems(r.filter, where));
            if (r.kind === 'cannotEnter') {
                out.push(...filterProblems(r.filter, where));
                if (!['yours', 'othersThanYours'].includes(r.stables)) out.push(`${where}: cannotEnter stables ${r.stables}`);
            }
            if (r.kind === 'protect') {
                if (r.verbs.length === 0) out.push(`${where}: protect without verbs`);
                if (!['self', 'yourUnicorns'].includes(r.cards)) out.push(`${where}: protect cards ${r.cards}`);
                (r.bySourceType ?? []).forEach(t => { if (!CARD_TYPES.includes(t)) out.push(`${where}: protect bySourceType ${t}`); });
            }
            if (r.kind === 'countsAs' && !positive(r.n)) out.push(`${where}: countsAs ${r.n}`);
            if (r.kind === 'extraPlays' && !positive(r.n)) out.push(`${where}: extraPlays ${r.n}`);
            return out;
        }
        case 'instant': {
            const out: string[] = [];
            if (def.type !== 'instant') out.push(`${where}: an instant ability on a ${def.type} card`);
            if (ability.window.event !== 'cardPlayed') out.push(`${where}: unknown instant window`);
            if (ability.effect.op !== 'neigh') out.push(`${where}: unknown instant effect`);
            return out;
        }
        default:
            return [`${where}: unknown ability kind ${(ability as { kind: string }).kind}`];
    }
}

const sum = (cards: { count: number }[]) => cards.reduce((n, c) => n + c.count, 0);

describe('card definitions', () => {
    it('have unique ids', () => {
        const ids = ALL_DEFS.map(d => d.id);
        expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
        ALL_DEFS.forEach(d => expect(getDef(d.id)).toBe(d));
    });

    it('have a non-empty name and a valid type', () => {
        const bad = ALL_DEFS.filter(d => typeof d.name !== 'string' || d.name.trim() === '' || !CARD_TYPES.includes(d.type));
        expect(bad.map(d => d.id)).toEqual([]);
    });

    it('variant ids name an existing base definition with the same name, type and image', () => {
        ALL_DEFS.filter(d => d.id.includes('@')).forEach(d => {
            const base = getDef(d.id.slice(0, d.id.indexOf('@')));
            expect({ id: d.id, name: d.name, type: d.type, image: d.image }).toEqual({ id: d.id, name: base.name, type: base.type, image: base.image });
        });
    });

    it('have an image in src/assets/card/square', () => {
        expect(fs.existsSync(IMAGE_DIR)).toBe(true);
        const missing = ALL_DEFS.filter(d => !d.image || !fs.existsSync(path.join(IMAGE_DIR, `${d.image}.png`)));
        expect(missing.map(d => `${d.id} → ${d.image}.png`)).toEqual([]);
    });

    it('Baby and Basic Unicorns have no abilities; Magic and Instant cards have exactly their kind of ability', () => {
        const problems: string[] = [];
        ALL_DEFS.forEach(d => {
            if ((d.type === 'baby' || d.type === 'basic') && d.abilities.length > 0) problems.push(`${d.id}: ${d.type} with abilities`);
            if (d.type === 'magic' && !d.abilities.some(a => a.kind === 'spell')) problems.push(`${d.id}: Magic card without a spell`);
            if (d.type === 'instant' && !d.abilities.some(a => a.kind === 'instant')) problems.push(`${d.id}: Instant card without an instant ability`);
            if (['magical', 'upgrade', 'downgrade'].includes(d.type) && d.abilities.length === 0) problems.push(`${d.id}: ${d.type} without abilities`);
        });
        expect(problems).toEqual([]);
    });

    it('have well-formed effect trees', () => {
        const problems = ALL_DEFS.flatMap(d => d.abilities.flatMap((a, i) => abilityProblems(d, a, i)));
        expect(problems).toEqual([]);
    });

    it('the validator itself finds unknown ops, unbound refs, bad counts and one-mode oneOf', () => {
        const fake = (effect: unknown) => effectProblems(effect as Effect, 'x', new Set());
        expect(fake({ op: 'explode' })).toEqual(['x: unknown op explode']);
        expect(fake({ op: 'bring', from: 'hand', cards: { ref: 'nope' } })).toHaveLength(1);
        expect(fake({ op: 'all', parts: [{ op: 'when', cond: { cond: 'cardMatches', ref: 'later', filter: {} }, effect: { op: 'tradeHands' } }, { op: 'draw', count: 1, bind: 'later' }] })).toHaveLength(1);
        expect(fake({ op: 'destroy', count: 0 })).toHaveLength(1);
        expect(fake({ op: 'discard', count: 'all' })).toEqual([]);
        expect(fake({ op: 'oneOf', modes: [{ op: 'tradeHands' }] })).toHaveLength(1);
        expect(fake({ op: 'steal', count: 1, filter: { types: ['dragon'] } })).toHaveLength(1);
    });
});

describe('card texts', () => {
    it('every card with abilities has an English rules text', () => {
        const missing = ALL_DEFS.filter(d => d.abilities.length > 0 && getCardText(d.id, 'en').text.trim() === '');
        expect(missing.map(d => d.id)).toEqual([]);
    });

    it('every card has an English text or flavour text', () => {
        const missing = ALL_DEFS.filter(d => {
            const { text, flavor } = getCardText(d.id, 'en');
            return text.trim() === '' && flavor.trim() === '';
        });
        expect(missing.map(d => d.id)).toEqual([]);
    });

    it('the text tables only name existing definitions', () => {
        expect(Object.keys(en).filter(id => !hasDef(id))).toEqual([]);
        expect(Object.keys(de).filter(id => !hasDef(id))).toEqual([]);
    });

    it('variants fall back to the text of their base definition', () => {
        expect(getCardText('mermaid_unicorn@legacy').text).not.toBe('');
        expect(getCardText('zombie_unicorn@legacy').text).not.toBe('');
    });
});

describe('sets', () => {
    it('have unique ids, and there is at least one base set', () => {
        const ids = ALL_SETS.map(s => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(BASE_SETS.length).toBeGreaterThan(0);
        expect([...BASE_SETS, ...EXPANSION_SETS]).toHaveLength(ALL_SETS.length);
    });

    it('reference only existing definitions, with counts > 0 and no duplicate entries', () => {
        const problems: string[] = [];
        ALL_SETS.forEach(set => {
            const seen = new Set<string>();
            set.cards.forEach(({ def, count }) => {
                if (!hasDef(def)) problems.push(`${set.id}: unknown ${def}`);
                if (!Number.isInteger(count) || count <= 0) problems.push(`${set.id}: ${def} ×${count}`);
                if (seen.has(def)) problems.push(`${set.id}: ${def} listed twice`);
                seen.add(def);
            });
            set.nursery.forEach(def => { if (!hasDef(def)) problems.push(`${set.id}: unknown nursery ${def}`); });
            (set.twoPlayerRemove ?? []).forEach(def => { if (!hasDef(def)) problems.push(`${set.id}: unknown twoPlayerRemove ${def}`); });
            (set.combinableWith ?? []).forEach(id => { if (!ALL_SETS.some(s => s.id === id)) problems.push(`${set.id}: unknown combinableWith ${id}`); });
        });
        expect(problems).toEqual([]);
    });

    it('nursery entries are Baby Unicorns; deck entries are not', () => {
        const problems: string[] = [];
        ALL_SETS.forEach(set => {
            set.nursery.forEach(def => { if (hasDef(def) && getDef(def).type !== 'baby') problems.push(`${set.id}: nursery ${def}`); });
            set.cards.forEach(({ def }) => { if (hasDef(def) && getDef(def).type === 'baby') problems.push(`${set.id}: deck ${def}`); });
        });
        expect(problems).toEqual([]);
    });

    it('no set lists a variant id directly (variants are chosen by the rule preset)', () => {
        const variants = ALL_SETS.flatMap(s => [...s.cards.map(c => c.def), ...s.nursery]).filter(d => d.includes('@'));
        expect(variants).toEqual([]);
    });

    it('every definition is used by some set (variants through their base definition)', () => {
        const used = new Set(ALL_SETS.flatMap(s => [...s.cards.map(c => c.def), ...s.nursery]));
        const unused = ALL_DEFS.filter(d => !used.has(d.id.split('@')[0]));
        expect(unused.map(d => d.id)).toEqual([]);
    });
});

describe('buildDeck', () => {
    it('yields the sum of the counts per set selection', () => {
        const selections = [['base_2e'], ['base_2e', 'adventures_2e']];
        selections.forEach(sel => {
            const built = buildDeck(sel);
            const sets = sel.map(getSet);
            expect(built.deck).toHaveLength(sets.reduce((n, s) => n + sum(s.cards), 0));
            expect(built.nursery).toHaveLength(sets.reduce((n, s) => n + s.nursery.length, 0));
            expect(built.cards).toHaveLength(built.deck.length + built.nursery.length);
            expect([...built.deck, ...built.nursery].sort((a, b) => a - b)).toEqual(built.cards.map((_, i) => i));
        });
    });

    it('matches the inventory currently in the code (pre-stage-4 composition)', () => {
        // Base: 104 deck cards + 13 babies. Adventures so far: 16 deck cards + 4 babies.
        // The plan's 127 / 54 totals only hold after the stage-4 / stage-6 inventory corrections.
        const base = buildDeck(['base_2e']);
        expect({ deck: base.deck.length, nursery: base.nursery.length }).toEqual({ deck: 104, nursery: 13 });
        const both = buildDeck(['base_2e', 'adventures_2e']);
        expect({ deck: both.deck.length, nursery: both.nursery.length }).toEqual({ deck: 120, nursery: 17 });
        expect(both.sets).toEqual(['base_2e', 'adventures_2e']);
    });

    it('applies card variants', () => {
        const built = buildDeck(['base_2e'], { cardVariants: { mermaid_unicorn: 'legacy', zombie_unicorn: 'legacy' } });
        const defs = built.cards.map(c => c.def);
        expect(defs).toContain('mermaid_unicorn@legacy');
        expect(defs).not.toContain('mermaid_unicorn');
        expect(defs).toContain('zombie_unicorn@legacy');
        // an unknown variant falls back to the base definition
        const fallback = buildDeck(['base_2e'], { cardVariants: { alluring_narwhal: 'legacy' } });
        expect(fallback.cards.map(c => c.def)).toContain('alluring_narwhal');
    });

    it('accepts the old set ids as aliases', () => {
        expect(resolveSetId('base_game')).toBe('base_2e');
        expect(resolveSetId('adventures_2nd_edition')).toBe('adventures_2e');
        expect(getSet('base_game')).toBe(getSet('base_2e'));
        expect(validateSetSelection(['base_game', 'adventures_2nd_edition'])).toEqual(['base_2e', 'adventures_2e']);
        expect(validateSetSelection(['adventures_2nd_edition', 'base_2e', 'base_game'])).toEqual(['base_2e', 'adventures_2e']);
        expect(buildDeck(['base_game', 'adventures_2nd_edition']).cards).toHaveLength(buildDeck(['base_2e', 'adventures_2e']).cards.length);
    });

    it('rejects a selection without a base set and unknown set ids', () => {
        expect(() => validateSetSelection(['adventures_2e'])).toThrow();
        expect(() => getSet('no_such_set')).toThrow();
        expect(() => getDef('no_such_card')).toThrow();
    });
});
