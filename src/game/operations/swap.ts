import { CardID, isUnicorn } from "../card";
import type { UnstableUnicornsGame, Ctx } from "../state";
import type { PlayerID } from "../player";
import _ from 'underscore';
import { enter, leave } from "./enter";
import { sacrifice } from "./sacrifice";

export type { DoSwapHands, DoShakeUp, DoReset, DoShuffleDiscardPileIntoDrawPile, DoUnicornSwap1, DoUnicornSwap2 } from '../do-types';

type SwapHandsTargets = {
    playerID: PlayerID
};

export function swapHands(G: UnstableUnicornsGame, ctx: Ctx, param: {protagonist: PlayerID, playerID: PlayerID}) {
    const myHand = G.hand[param.protagonist];
    G.hand[param.protagonist] = G.hand[param.playerID];
    G.hand[param.playerID] = myHand;
}

export function findSwapHandsTargets(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID): SwapHandsTargets[] {
    let targets: SwapHandsTargets[] = [];
    targets = G.players.map(pl => pl.id).filter(plid => plid !== protagonist).map(d => ({playerID: d}));
    return targets;
}

export function shakeUp(G: UnstableUnicornsGame, ctx: Ctx, param: {protagonist: PlayerID, sourceCardID: CardID}) {
    G.drawPile = _.shuffle([...G.drawPile, param.sourceCardID, ...G.hand[param.protagonist], ...G.discardPile]);
    G.discardPile = [];
    G.hand[param.protagonist] = _.first(G.drawPile, 5);
    G.drawPile = _.rest(G.drawPile, 5);
}

export function reset(G: UnstableUnicornsGame, ctx: Ctx, param: {protagonist: PlayerID}) {
    G.players.forEach(pl => {
        G.upgradeDowngradeStable[pl.id].forEach(cardID => {
            sacrifice(G, ctx, { protagonist: pl.id, cardID });
        });
    });

    G.drawPile = _.shuffle([...G.drawPile, ...G.discardPile]);
}

export function shuffleDiscardPileIntoDrawPile(G: UnstableUnicornsGame, ctx: Ctx, _param: unknown) {
    G.drawPile = _.shuffle([...G.drawPile, ...G.discardPile]);
    G.discardPile = [];
}

export function unicornSwap1(G: UnstableUnicornsGame, ctx:Ctx, param: {protagonist: PlayerID, cardID: CardID}) {
    leave(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
    G.clipboard.unicornSwap = { cardIDToMove: param.cardID };
}

export function findUnicornSwap1Targets(G:UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID) {
    let targets: {cardID: CardID}[] = [];

    G.stable[protagonist].forEach(c => {
        const card = G.deck[c];
        if (isUnicorn(card)) {
            if (G.playerEffects[protagonist].find(s => s.effect.key === "pandamonium") === undefined) {
                targets.push({ cardID: c });
            }
        }
    });

    return targets;
}

export function unicornSwap2(G: UnstableUnicornsGame, ctx:Ctx, param: {protagonist: PlayerID, playerID: PlayerID}) {
    // unicornSwap1 always runs before unicornSwap2, guaranteeing clipboardID is set
    enter(G, ctx, { playerID: param.playerID, cardID: G.clipboard.unicornSwap!.cardIDToMove! });
    G.clipboard.unicornSwap = {targetPlayer: param.playerID}
}

export function findUnicornSwap2Targets(G:UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID) {
    let targets: {playerID: PlayerID}[] = [];

    G.players.forEach(p => {
        if (p.id === protagonist) {
            return;
        }
        targets.push({ playerID: p.id });
    });

    return targets;
}
