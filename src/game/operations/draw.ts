import type { UnstableUnicornsGame, Ctx } from "../state";
import type { PlayerID } from "../player";
import _ from 'underscore';

export type { DoDraw } from '../do-types';

export type ParamDraw = {
    protagonist: PlayerID;
    count: number;
}

export function draw(G: UnstableUnicornsGame, ctx: Ctx, param: { protagonist: PlayerID, count: number }) {
    if (G.drawPile.length < param.count && G.discardPile.length > 0) {
        G.drawPile = [...G.drawPile, ..._.shuffle(G.discardPile)];
        G.discardPile = [];
        G.deckWasReshuffled = true;
    }
    const toDraw = _.first(G.drawPile, param.count);
    G.drawPile = _.rest(G.drawPile, param.count);
    G.hand[param.protagonist] = [...G.hand[param.protagonist], ...toDraw];
}

export function canDraw(G: UnstableUnicornsGame, ctx: Ctx, param: { count: number }) {
    return G.drawPile.length + G.discardPile.length >= param.count;
}
