import { CardID } from "../card";
import { UnstableUnicornsGame, Ctx } from "../game";
import type { PlayerID } from "../player";
import _ from 'underscore';
import { enter, canEnter, leave } from "./enter";
import { findOwnerOfCard } from "./destroy";

export interface DoSteal {
    key: "steal";
    info: DoStealInfo;
}

export type DoStealInfo = { type: "unicorn" | "upgrade"; unicornSwap?: boolean }

type ParamSteal = {
    protagonist: PlayerID;
    cardID: CardID;
}

export function steal(G: UnstableUnicornsGame, ctx: Ctx, param: ParamSteal) {
    leave(G, ctx, { playerID: findOwnerOfCard(G, param.cardID)!, cardID: param.cardID });
    enter(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
}

export type StealTarget = {
    playerID: PlayerID;
    cardID: CardID;
}

export function findStealTargets(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, info: DoStealInfo): StealTarget[] {
    let targets: StealTarget[] = [];

    switch (info.type) {
        case "unicorn": {
            G.players.forEach(pl => {
                if (pl.id === protagonist) { return };
                G.stable[pl.id].forEach(c => {
                    if (info.unicornSwap === true) {
                        if (pl.id !== G.clipboard.unicornSwap?.targetPlayer) {
                            return;
                        }
                    }
                    if (canEnter(G, ctx, { playerID: protagonist, cardID: c })) {
                        targets.push({ playerID: pl.id, cardID: c });
                    }
                });
            });
            break;
        }
        case "upgrade": {
            G.players.forEach(pl => {
                if (pl.id === protagonist) { return };
                G.upgradeDowngradeStable[pl.id].forEach(c => {
                    if (canEnter(G, ctx, { playerID: protagonist, cardID: c })) {
                        targets.push({ playerID: pl.id, cardID: c });
                    }
                });
            });
            break;
        }
    }

    return targets;
}

export interface DoPull {
    key: "pull";
}

export type ParamPull = {
    protagonist: PlayerID;
    handIndex: number;
    from: PlayerID;
}

export function pull(G: UnstableUnicornsGame, ctx: Ctx, param: ParamPull) {
    const cardToPull = G.hand[param.from][param.handIndex]
    G.hand[param.from] = _.without(G.hand[param.from], cardToPull);
    G.hand[param.protagonist] = [...G.hand[param.protagonist], cardToPull];
}

export type PullTarget = {
    playerID: PlayerID;
}

export function findPullTargets(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID): PullTarget[] {
    let targets: PullTarget[] = [];

    G.players.forEach(pl => {
        if (G.hand[pl.id].length > 0 && pl.id !== protagonist) {
            targets.push({ playerID: pl.id });
        }
    });

    return targets;
}
