import type { UnstableUnicornsGame, Ctx } from "../state";
import type { PlayerID } from "../player";
import _ from 'underscore';
import { canDiscard } from "./discard";
import { pull, PullTarget, findPullTargets } from "./steal";

export type { DoPullRandom, DoMakeSomeoneDiscard, DoBlatantThievery1 } from '../do-types';

export function pullRandom(G: UnstableUnicornsGame, ctx: Ctx, param: {protagonist: PlayerID, playerID: PlayerID}) {
    pull(G, ctx, {
        protagonist: param.protagonist,
        from: param.playerID,
        handIndex: _.random(0, G.hand[param.playerID].length - 1)
    });
}

export function findPullRandomTargets(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID): PullTarget[] {
    return findPullTargets(G, ctx, protagonist);
}

export type ParamMakeSomeoneDiscard = {
    playerID: PlayerID;
    protagonist: PlayerID;
}

export function makeSomeoneDiscard(G: UnstableUnicornsGame, ctx: Ctx, param: ParamMakeSomeoneDiscard) {
    G.script.scenes.push({
        id: _.uniqueId(),
        mandatory: true,
        actions: [{
            type: "action",
            instructions: [{
                id: _.uniqueId(),
                protagonist: param.playerID,
                state: "open",
                ui: {
                    type: "click_on_own_card_in_hand"
                },
                do: {
                    key: "discard",
                    info: { count: 1, type: "any" }
                }
            }]
        }],
        endTurnImmediately: false,
    });
}

export type MakeSomeoneDiscardTarget = {
    playerID: PlayerID;
}

export function findMakeSomeoneDiscardTarget(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID): MakeSomeoneDiscardTarget[] {
    return G.players.filter(pl => pl.id !== protagonist && canDiscard(G, ctx, pl.id, { count: 1, type: "any" })).map(pl => ({ playerID: pl.id }));
}

export function blatantThievery1(G: UnstableUnicornsGame, ctx:Ctx, param: {protagonist: PlayerID, handIndex: number, from: PlayerID}) {
    pull(G, ctx, {protagonist: param.protagonist, handIndex: param.handIndex, from: param.from})
}

export function findBlatantThieveryTargets(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID): PullTarget[] {
    return findPullTargets(G, ctx, protagonist);
}
