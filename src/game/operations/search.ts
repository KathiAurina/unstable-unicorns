import { CardID, isUnicorn } from "../card";
import type { UnstableUnicornsGame, Ctx } from "../state";
import type { PlayerID } from "../player";
import _ from 'underscore';

import type { DoSearchInfo } from '../do-types';
export type { DoSearch, DoSearchInfo } from '../do-types';

export type ParamSearch = {
    protagonist: PlayerID;
    cardID: CardID;
}

export function search(G: UnstableUnicornsGame, ctx: Ctx, param: ParamSearch) {
    G.drawPile = _.shuffle(_.without(G.drawPile, param.cardID));
    G.hand[param.protagonist] = [...G.hand[param.protagonist], param.cardID];
}

export type SearchTarget = {
    cardID: CardID;
}

export function findSearchTargets(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, info: DoSearchInfo): SearchTarget[] {
    let targets: SearchTarget[] = [];

    if (info.type === "any") {
        targets = G.drawPile.map(c => ({ cardID: c }));
    }

    if (info.type === "downgrade") {
        targets = G.drawPile.map(c => G.deck[c]).filter(c => c.type === "downgrade").map(c => ({ cardID: c.id }));
    }

    if (info.type === "narwhal") {
        targets = G.drawPile.map(c => G.deck[c]).filter(c => c.type === "narwhal").map(c => ({ cardID: c.id }));
    }

    if (info.type === "unicorn") {
        targets = G.drawPile.map(c => G.deck[c]).filter(c => isUnicorn(c)).map(c => ({ cardID: c.id }));
    }

    if (info.type === "upgrade") {
        targets = G.drawPile.map(c => G.deck[c]).filter(c => c.type === "upgrade").map(c => ({ cardID: c.id }));
    }

    return targets;
}
