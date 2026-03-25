import { CardID, isUnicorn } from "../card";
import type { UnstableUnicornsGame, Ctx } from "../state";
import type { PlayerID } from "../player";
import _ from 'underscore';

import type { DoDiscardInfo } from '../do-types';
export type { DoDiscard, DoDiscardInfo } from '../do-types';

export type ParamDiscard = {
    protagonist: PlayerID;
    cardID: CardID;
}

export function discard(G: UnstableUnicornsGame, ctx: Ctx, param: ParamDiscard) {
    G.hand[param.protagonist] = _.without(G.hand[param.protagonist], param.cardID);
    G.discardPile = [...G.discardPile, param.cardID];
}

export function canDiscard(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, info: DoDiscardInfo) {
    return findDiscardTargets(G, ctx, protagonist, info).length >= info.count;
}

export type DiscardTarget = {
    handIndex: number;
}

export function findDiscardTargets(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, info: DoDiscardInfo): DiscardTarget[] {
    let targets: DiscardTarget[] = [];

    G.hand[protagonist].forEach((cid, index) => {
        if (info.type === "any") {
            targets.push({ handIndex: index });
        } else if (info.type === "unicorn") {
            const card = G.deck[cid];
            if (isUnicorn(card)) {
                targets.push({ handIndex: index });
            }
        }
    })

    return targets;
}
