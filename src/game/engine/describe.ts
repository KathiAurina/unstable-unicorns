// English descriptions generated from effect trees. Used for prompt titles, mode labels and previews,
// so that no card needs its own UI text.

import type { CardFilter, Effect } from '../cards/types';
import type { EngineEffect } from './state';

const TYPE_NAMES: Record<string, string> = {
    baby: 'Baby Unicorn', basic: 'Basic Unicorn', magical: 'Magical Unicorn', ultimate: 'Ultimate Unicorn',
    diamond: 'Diamond Unicorn', upgrade: 'Upgrade', downgrade: 'Downgrade', magic: 'Magic', instant: 'Instant',
};

/** "Unicorn card", "Upgrade or Downgrade card", `card with "Narwhal" in its name` … */
export function describeFilter(filter?: CardFilter): string {
    if (!filter) return 'card';
    let noun = 'card';
    if (filter.types && filter.types.length > 0) {
        const all = ['baby', 'basic', 'magical', 'ultimate', 'diamond', 'upgrade', 'downgrade'];
        if (filter.types.length === all.length && all.every(t => filter.types!.includes(t as never))) {
            noun = 'Unicorn, Upgrade or Downgrade card';
        } else if (filter.types.includes('instant') && filter.nameIncludes === 'Neigh') {
            return 'Neigh card';
        } else {
            noun = `${filter.types.map(t => TYPE_NAMES[t]).join(' or ')} card`;
        }
    } else if (filter.unicorn) {
        noun = 'Unicorn card';
    }
    if (filter.nameIncludes) noun += ` with "${filter.nameIncludes}" in its name`;
    return noun;
}

function plural(noun: string): string {
    const m = noun.match(/^(.*\bcard)(\b.*)$/);
    return m ? `${m[1]}s${m[2]}` : `${noun}s`;
}

function withArticle(noun: string): string {
    // "an Upgrade card", but "a Unicorn card"
    return /^([aeio]|u(?!ni))/i.test(noun) ? `an ${noun}` : `a ${noun}`;
}

/** "a Unicorn card", "2 cards", "all Downgrade cards" */
export function describeCount(count: number | 'all', filter?: CardFilter): string {
    const noun = describeFilter(filter);
    if (count === 'all') return `all ${plural(noun)}`;
    if (count === 1) return withArticle(noun);
    return `${count} ${plural(noun)}`;
}

export function describeEffect(effect: EngineEffect): string {
    switch (effect.op) {
        case 'all': return effect.parts.map(describeEffect).join(' and ');
        case 'then': return `${describeEffect(effect.first)}, then ${describeEffect(effect.next)}`;
        case 'ifYouDo': return `you may ${describeEffect(effect.first)}. If you do, ${describeEffect(effect.next)}`;
        case 'may': return `you may ${describeEffect(effect.effect)}`;
        case 'oneOf': return effect.modes.map(describeEffect).join(' OR ');
        case 'forEach': {
            const inner = describeEffect(effect.effect);
            if (effect.players === 'each') return `each player must ${inner}`;
            if (effect.players === 'eachOther') return `each other player must ${inner}`;
            if (effect.players === 'chosenOther') return `force another player to ${inner}`;
            return `that player must ${inner}`;
        }
        case 'when': return describeEffect(effect.effect);
        case 'draw': return effect.count === 1 ? `DRAW a card${effect.reveal ? ' and reveal it' : ''}` : `DRAW ${effect.count} cards`;
        case 'discard':
            return effect.count === 'all' && !effect.filter ? 'DISCARD your hand' : `DISCARD ${describeCount(effect.count, effect.filter)}`;
        case 'sacrifice': return `SACRIFICE ${describeCount(effect.count, effect.filter)}`;
        case 'destroy': return `DESTROY ${describeCount(effect.count, effect.filter)}`;
        case 'steal': return `STEAL ${describeCount(effect.count, effect.filter)}`;
        case 'returnToHand':
            return `return ${describeCount(effect.count, effect.filter)} in ${effect.from === 'others' ? "another player's" : 'any'} Stable to its owner's hand`;
        case 'move':
            return `move ${describeCount(1, effect.filter)} in ${effect.from === 'yours' ? 'your' : 'any'} Stable to another player's Stable`;
        case 'bring': {
            const where = effect.from === 'hand' ? 'your hand' : effect.from === 'discard' ? 'the discard pile' : 'the Nursery';
            if (effect.cards) return 'bring it into your Stable';
            return `bring ${describeCount(1, effect.filter)} from ${where} into your Stable`;
        }
        case 'addToHand':
            return effect.self ? 'return this card to your hand' : `add ${describeCount(1, effect.filter)} from the discard pile to your hand`;
        case 'search': return `search the deck for ${describeCount(1, effect.filter)} and add it to your hand`;
        case 'takeFromHand':
            return effect.how === 'random' ? "pull a card at random from another player's hand" : "look at another player's hand and take a card";
        case 'tradeHands': return 'trade hands with another player';
        case 'shuffleIntoDeck': {
            const names = effect.what.map(w => (w === 'self' ? 'this card' : w === 'hand' ? 'your hand' : 'the discard pile'));
            return `shuffle ${names.join(', ').replace(/, ([^,]*)$/, ' and $1')} into the deck`;
        }
        case 'turn': return effect.action === 'extraTurn' ? 'take another turn' : 'immediately end your turn';
        case '$enterPlayed': return 'the card enters the Stable';
    }
}

/** Capitalises the first letter. */
export function sentence(text: string): string {
    return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

/** Used by validation: every effect node the language knows. */
export function walkEffect(effect: Effect, visit: (node: Effect) => void): void {
    visit(effect);
    switch (effect.op) {
        case 'all': effect.parts.forEach(p => walkEffect(p, visit)); break;
        case 'then': case 'ifYouDo': walkEffect(effect.first, visit); walkEffect(effect.next, visit); break;
        case 'may': case 'forEach': case 'when': walkEffect(effect.effect, visit); break;
        case 'oneOf': effect.modes.forEach(m => walkEffect(m, visit)); break;
        default: break;
    }
}
