import { CardID, isUnicorn } from "../card";
import { UnstableUnicornsGame, Ctx } from "../game";
import type { PlayerID } from "../player";
import _ from 'underscore';
import { enter, canEnter } from "./enter";

export interface DoRevive {
    key: "revive";
    info: DoReviveInfo;
}

export type DoReviveInfo = {
    type: "unicorn" | "basic_unicorn";
}

export type ParamRevive = {
    protagonist: PlayerID;
    cardID: CardID;
}

export function revive(G: UnstableUnicornsGame, ctx: Ctx, param: ParamRevive) {
    G.discardPile = _.without(G.discardPile, param.cardID);
    enter(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
}

export type ReviveTarget = {
    cardID: CardID;
}

export function findReviveTarget(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, info: DoReviveInfo): ReviveTarget[] {
    let targets: ReviveTarget[] = [];

    if (info.type === "unicorn") {
        targets = G.discardPile.filter(c => {
            const card = G.deck[c];
            return isUnicorn(card) && canEnter(G, ctx, { playerID: protagonist, cardID: c });
        }).map(c => ({ cardID: c }));
    }

    if (info.type === "basic_unicorn") {
        targets = G.discardPile.filter(c => {
            const card = G.deck[c];
            return canEnter(G, ctx, { playerID: protagonist, cardID: c }) && card.type === "basic";
        }).map(c => ({ cardID: c }));
    }

    return targets;
}

export interface DoAddFromDiscardPileToHand {
    key: "addFromDiscardPileToHand";
    info: DoAddFromDiscardPileToHandInfo;
}

export type DoAddFromDiscardPileToHandInfo = {
    type: "magic" | "unicorn" | "neigh";
}

export type AddFromDiscardPileToHandParam = {
    protagonist: PlayerID;
    cardID: CardID;
}

export function addFromDiscardPileToHand(G: UnstableUnicornsGame, ctx: Ctx, param: AddFromDiscardPileToHandParam) {
    G.discardPile = _.without(G.discardPile, param.cardID);
    G.hand[param.protagonist].push(param.cardID);
}

export type AddFromDiscardPileToHandTarget = {
    cardID: CardID
}

export function findAddFromDiscardPileToHand(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, info: DoAddFromDiscardPileToHandInfo): AddFromDiscardPileToHandTarget[] {
    let targets: AddFromDiscardPileToHandTarget[] = [];

    if (info.type === "magic" || info.type === "neigh") {
        targets = G.discardPile.map(c => G.deck[c]).filter(c => c.type === info.type).map(c => ({ cardID: c.id }));
    }

    if (info.type === "unicorn") {
        targets = G.discardPile.map(c => G.deck[c]).filter(c => isUnicorn(c)).map(c => ({ cardID: c.id }));
    }

    return targets;
}

export interface DoReviveFromNursery {
    key: "reviveFromNursery";
}

export type ParamReviveFromNursery = {
    protagonist: PlayerID;
    cardID: CardID;
}

export function reviveFromNursery(G: UnstableUnicornsGame, ctx: Ctx, param: ParamReviveFromNursery) {
    G.nursery = _.without(G.nursery, param.cardID);
    enter(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
}
