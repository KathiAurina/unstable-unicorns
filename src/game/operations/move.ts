import { CardID, hasType } from "../card";
import type { UnstableUnicornsGame, Ctx } from "../state";
import type { PlayerID } from "../player";
import _ from 'underscore';
import { enter, canEnter, leave } from "./enter";
import { findOwnerOfCard } from "./destroy";
import { makeSomeoneDiscard } from "./misc";

import type { ReturnToHandInfo, BringToStableInfo, DoMoveInfo } from '../do-types';
export type { DoReturnToHand, ReturnToHandInfo, DoBringToStable, BringToStableInfo, DoMove, DoMove2, DoBackKick } from '../do-types';

export type ParamReturnToHand = {
    protagonist: PlayerID;
    cardID: CardID;
}

export function returnToHand(G: UnstableUnicornsGame, ctx: Ctx, param: ParamReturnToHand) {
    const card = G.deck[param.cardID];
    const playerID = findOwnerOfCard(G, param.cardID)!;

    // Add to hand before leave() so autoFizzleUnsatisfiable sees the card when
    // checking whether reactive triggers (e.g. Barbed Wire) can be satisfied.
    if (hasType(card, "baby")) {
        G.nursery.push(param.cardID);
    } else {
        G.hand[playerID].push(param.cardID);
    }

    leave(G, ctx, { playerID: playerID, cardID: param.cardID });
}

export type ReturnToHandTarget = {
    playerID: PlayerID;
    cardID: CardID;
}

export function findReturnToHandTargets(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, info: ReturnToHandInfo): ReturnToHandTarget[] {
    let targets: ReturnToHandTarget[] = [];

    if (info.who === "another") {
        G.players.filter(pl => pl.id !== protagonist).forEach(pl => {
            targets = [...targets, ...G.stable[pl.id].map(c => ({ playerID: pl.id, cardID: c }))];
            targets = [...targets, ...G.upgradeDowngradeStable[pl.id].map(c => ({ playerID: pl.id, cardID: c }))];
        });
    }

    return targets;
}

// player may bring a card from their hand directly to their stable
type ParamBringToStable = {
    protagonist: PlayerID;
    cardID: CardID;
}

export function bringToStable(G: UnstableUnicornsGame, ctx: Ctx, param: ParamBringToStable) {
    enter(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
    G.hand[param.protagonist] = _.without(G.hand[param.protagonist], param.cardID);
}

export type BringToStableTarget = {
    cardID: CardID;
}

export function findBringToStableTargets(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, info: BringToStableInfo): BringToStableTarget[] {
    let targets: BringToStableTarget[] = [];

    if (info.type === "basic_unicorn") {
        targets = G.hand[protagonist].map(c => G.deck[c]).filter(c => hasType(c, "basic") && canEnter(G, ctx, { cardID: c.id, playerID: protagonist })).map(c => ({ cardID: c.id }));
    }

    return targets;
}

export function canBringToStableTargets(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, info: BringToStableInfo) {
    return findBringToStableTargets(G, ctx, protagonist, info).length > 0;
}

export function move(G: UnstableUnicornsGame, ctx: Ctx, param: {cardID: CardID, protagonist: PlayerID}) {
    const from = findOwnerOfCard(G, param.cardID)!;
    leave(G, ctx, { playerID: from, cardID: param.cardID });
    G.clipboard["move"] = { cardID: param.cardID, from: from };
}

export type MoveTarget = {
    cardID: CardID;
    playerID: PlayerID;
}

export function findMoveTargets(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, info: DoMoveInfo): MoveTarget[] {
    let targets: MoveTarget[] = [];

    G.players.forEach(pl => {
        targets = [...targets, ...G.upgradeDowngradeStable[pl.id].map(c => ({ cardID: c, playerID: pl.id}))];
    })

    return targets;
}

export function move2(G: UnstableUnicornsGame, ctx: Ctx, param: {playerID: PlayerID}) {
    enter(G, ctx, { playerID: param.playerID, cardID: G.clipboard.move!.cardID });
}

type MoveTarget2 = {
    playerID: PlayerID;
}

// to fix
// a protagonist cannot move a card into his own stable
export function findMoveTargets2(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID): MoveTarget2[] {
    let targets: MoveTarget2[] = [];

    G.players.forEach(pl => {
        if (pl.id !== G.clipboard.move!.from && pl.id !== protagonist) {
            targets.push({playerID: pl.id})
        }
    })

    return targets;
}

export function backKick(G: UnstableUnicornsGame, ctx: Ctx, param: {protagonist: PlayerID, cardID: CardID, source?: CardID}) {
    const owner = findOwnerOfCard(G, param.cardID)!;
    returnToHand(G, ctx, {cardID: param.cardID, protagonist: param.protagonist});
    makeSomeoneDiscard(G, ctx, {protagonist: param.protagonist, playerID: owner, source: param.source});
}

export type BackKickTarget = {
    cardID: CardID;
}

export function findBackKickTargets(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID) {
    let targets: BackKickTarget[] = [];

    G.players.forEach(pl => {
        if (pl.id === protagonist) {
            return;
        }

        [...G.stable[pl.id], ...G.upgradeDowngradeStable[pl.id]].forEach(c => {
            targets.push({ cardID: c});
        })
    })

    return targets;
}
