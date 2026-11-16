// The effect chain: a stack of links (expansion-plan.md 5.4). A link is one ability instance.

import type { Effect } from '../cards/types';
import type { EngineEffect, GameState, Link } from './state';
import { nextId } from './state';
import { defOf } from './rules';

/** The effect tree a link resolves: its inline effect, or the ability of its source card. */
export function effectOf(G: GameState, link: Link): EngineEffect {
    if (link.effect) return link.effect;
    if (!link.source) throw new Error('Link without effect and without source');
    const ability = defOf(G, link.source.card).abilities[link.source.ability];
    if (!ability || (ability.kind !== 'spell' && ability.kind !== 'triggered')) {
        throw new Error(`Ability ${link.source.ability} of ${G.cards[link.source.card].def} has no effect`);
    }
    return ability.effect;
}

/** "You may …" abilities are optional; everything else must be resolved. */
export function isOptionalEffect(effect: Effect): boolean {
    return effect.op === 'may' || effect.op === 'ifYouDo';
}

export function pushLink(G: GameState, init: Omit<Link, 'id' | 'mem' | 'vars'>): Link {
    const link: Link = { ...init, id: nextId(G), mem: {}, vars: {} };
    G.chain.push(link);
    return link;
}

export function topLink(G: GameState): Link | undefined {
    return G.chain[G.chain.length - 1];
}
