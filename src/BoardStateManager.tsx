import type { UnstableUnicornsGame, Ctx, Instruction, Scene } from "./game/state";
import { _findOpenScenesWithProtagonist, _findInProgressScenesWithProtagonist } from "./game/state";
import { canDraw } from "./game/game";
import type { PlayerID } from "./game/player";
import _ from 'underscore';
import { canBringToStableTargets, findAddFromDiscardPileToHand, findBackKickTargets, findBringToStableTargets, findDestroyTargets, findDiscardTargets, findMakeSomeoneDiscardTarget, findMoveTargets, findMoveTargets2, findPullRandomTargets, findReturnToHandTargets, findReviveTarget, findSacrificeTargets, findSearchTargets, findStealTargets, findSwapHandsTargets, findUnicornSwap1Targets, findUnicornSwap2Targets, canDiscard, canSatisfyDo } from "./game/operations";
import type { DoDraw, DoSteal, DoDestroy, DoSacrifice, DoDiscard, DoBringToStable, DoReturnToHand, DoRevive, DoSearch, DoAddFromDiscardPileToHand, DoMove } from "./game/do-types";
import type { BoardStateInfo } from "./game/types";

export type BoardState = {
    type: BoardStateKey;
    info?: BoardStateInfo;
}

type BoardStateKey = "playCard" | "drawCard" | "steal__cardToCard" | "destroy__cardToCard" | "destroy__click_on_card_in_stable" | "sacrifice__cardToCard" | "sacrifice__clickOnCardInStable" | "draw__clickOnDrawPile" | "endTurn" | "neigh__playNeigh" | "neigh__wait" | "discard__popup__committed" | "discard__popup__ask" | "bring__popup__committed" | "bring__popup__ask" | "discard" | "swapHands__cardToPlayer" | "shakeUp" | "move__cardToCard" | "move2__cardToPlayer" | "unicornswap1" | "unicornswap2" | "reset" | "shuffleDiscardPileIntoDrawPile" | "wait_for_other_players" | "revive" | "reviveFromNursery" | "pullRandom__cardToPlayer" | "backKick__card_to_card" | "blatantThievery1" | "addFromDiscardPileToHand__single_action_popup" | "search__single_action_popup" | "returnToHand__cardToCard" | "makeSomeoneDiscard__cardToPlayer";

export function getBoardState(G: UnstableUnicornsGame, ctx: Ctx, playerID: PlayerID): BoardState[] {
    const openScenes = _findOpenScenesWithProtagonist(G, playerID);
    const inProgressScenes = _findInProgressScenesWithProtagonist(G, playerID);

    if (ctx.activePlayers![playerID] === "beginning") {
        if (ctx.currentPlayer === playerID) {
            // player must end a mandatory scene before it may draw
            if (inProgressScenes.length > 0) {
                return [...getExecutionDoState(G, ctx, playerID, inProgressScenes)];
            }

            if (openScenes.length > 0) {
                if (G.mustEndTurnImmediately) {
                    // is there any scene in progress?
                    if (G.players.filter(pl => pl.id !== playerID).map(pl => _findInProgressScenesWithProtagonist(G, pl.id)).find(ar => ar.length > 0)) {
                        // if yes: cant end the turn
                        return [{ type: "wait_for_other_players" }];
                    } else {
                        // if no: may end the turn
                        return [{ type: "endTurn" }, ...getExecutionDoState(G, ctx, playerID, openScenes)];
                    }
                }

                // is there any scene in progress?
                if (G.players.filter(pl => pl.id !== playerID).map(pl => _findInProgressScenesWithProtagonist(G, pl.id)).find(ar => ar.length > 0)) {
                    // if yes: cant end the turn
                    return [{ type: "wait_for_other_players" }];
                }

                return [{ type: "drawCard" }, ...getExecutionDoState(G, ctx, playerID, openScenes)].filter(s => s.type !== "drawCard" || canDraw(G, ctx)) as BoardState[];
            }

            // is there any scene in progress?
            if (G.players.filter(pl => pl.id !== playerID).map(pl => _findInProgressScenesWithProtagonist(G, pl.id)).find(ar => ar.length > 0)) {
                // if yes: cant end the turn
                return [{ type: "wait_for_other_players" }];
            }

            return G.mustEndTurnImmediately ? [{ type: "endTurn" }] : [{ type: "drawCard" }].filter(s => s.type !== "drawCard" || canDraw(G, ctx)) as BoardState[];
        }

        if (inProgressScenes.length > 0) {
            return [...getExecutionDoState(G, ctx, playerID, inProgressScenes)];
        }

        if (openScenes.length > 0) {
            // is there any scene in progress?
            if (G.players.filter(pl => pl.id !== playerID).map(pl => _findInProgressScenesWithProtagonist(G, pl.id)).find(ar => ar.length > 0)) {
                // if yes: cant end the turn
                return [{ type: "wait_for_other_players" }];
            }

            return [...getExecutionDoState(G, ctx, playerID, openScenes)];
        }
    }

    if (playerID === ctx.currentPlayer) {
        if (G.countPlayedCardsInActionPhase === 0 && G.neighDiscussion === undefined && ctx.activePlayers![playerID] === "action_phase") {
            // action phase and no card has been played or drawn
            // player may draw a card or play a card
            return [{ type: "drawCard" }, { type: "playCard" }].filter(s => s.type !== "drawCard" || canDraw(G, ctx)) as BoardState[];
        }
    }

    if (G.neighDiscussion) {
        const currentRound = _.last(G.neighDiscussion.rounds)!;
        if (currentRound.state === "open") {
            if (currentRound.playerState[playerID].vote === "undecided") {
                return [{ type: "neigh__playNeigh" }];
            } else {
                return [{ type: "neigh__wait" }];
            }
        }
    }

    if (ctx.activePlayers![playerID] === "action_phase") {
        // player must end a scene in progress before it may end the turn
        // player must start and end a mandatory scene before it may end the turn
        if (inProgressScenes.length > 0) {
            return [...getExecutionDoState(G, ctx, playerID, inProgressScenes)];
        }


        if (openScenes.length > 0) {
            if (ctx.currentPlayer === playerID) {
                // double dutch effect if there is no scene in progress
                if (G.playerEffects[playerID].find(s => s.effect.key === "double_dutch") && G.countPlayedCardsInActionPhase === 1) {

                    // is there any scene in progress?
                    if (G.players.filter(pl => pl.id !== playerID).map(pl => _findInProgressScenesWithProtagonist(G, pl.id)).find(ar => ar.length > 0)) {
                        // if yes: wait
                        return [{ type: "wait_for_other_players" }];
                    }

                    return [...getExecutionDoState(G, ctx, playerID, openScenes), { type: "endTurn" }, { type: "playCard" }];
                }

                // is there any scene in progress?
                if (G.players.filter(pl => pl.id !== playerID).map(pl => _findInProgressScenesWithProtagonist(G, pl.id)).find(ar => ar.length > 0)) {
                    // if yes: wait
                    return [{ type: "wait_for_other_players" }];
                }

                return [...getExecutionDoState(G, ctx, playerID, openScenes), { type: "endTurn" }];
            }

            // is there any scene in progress?
            if (G.players.filter(pl => pl.id !== playerID).map(pl => _findInProgressScenesWithProtagonist(G, pl.id)).find(ar => ar.length > 0)) {
                // if yes: wait
                return [{ type: "wait_for_other_players" }];
            }

            return [...getExecutionDoState(G, ctx, playerID, openScenes)];
        }

        // there are no open scenes
        if (ctx.currentPlayer === playerID) {

            // other players may need to complete an action
            if (G.players.map(pl => _findInProgressScenesWithProtagonist(G, pl.id)).find(arr => arr.length > 0)) {
                // we found a player that has a in progress scene 
                // wait for them
                return [{ type: "wait_for_other_players" }];
            } else {
                if (G.playerEffects[playerID].find(s => s.effect.key === "double_dutch") && G.countPlayedCardsInActionPhase === 1) {
                    return [{ type: "endTurn" }, { type: "playCard" }];
                }
                return [{ type: "endTurn" }];
            }

        }
    }

    return [];
}

type InstructionHandler = (G: UnstableUnicornsGame, ctx: Ctx, playerID: PlayerID, instruction: Instruction, scene: Scene) => BoardState[];

const doKeyHandlers: Partial<Record<string, InstructionHandler>> = {
    draw: (G, ctx, playerID, ins) => {
        if (ins.ui.type !== "click_on_drawPile") return [];
        return [{ type: "draw__clickOnDrawPile", info: { instructionID: ins.id, count: (ins.do as DoDraw).info.count } }];
    },
    steal: (G, ctx, playerID, ins) => {
        if (ins.ui.type !== "card_to_card") return [];
        return [{ type: "steal__cardToCard", info: { targets: findStealTargets(G, ctx, playerID, (ins.do as DoSteal).info), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    destroy: (G, ctx, playerID, ins) => {
        const doInfo = (ins.do as DoDestroy).info;
        if (ins.ui.type === "card_to_card") {
            return [{ type: "destroy__cardToCard", info: { targets: findDestroyTargets(G, ctx, playerID, doInfo, ins.ui.info?.source), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
        }
        if (ins.ui.type === "click_on_card_in_stable") {
            return [{ type: "destroy__click_on_card_in_stable", info: { targets: findDestroyTargets(G, ctx, playerID, doInfo, ins.ui.info?.source), instructionID: ins.id } }];
        }
        return [];
    },
    sacrifice: (G, ctx, playerID, ins) => {
        const doInfo = (ins.do as DoSacrifice).info;
        if (ins.ui.type === "card_to_card") {
            return [{ type: "sacrifice__cardToCard", info: { targets: findSacrificeTargets(G, ctx, playerID, doInfo), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
        }
        if (ins.ui.type === "click_on_card_in_stable") {
            return [{ type: "sacrifice__clickOnCardInStable", info: { targets: findSacrificeTargets(G, ctx, playerID, doInfo), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
        }
        return [];
    },
    returnToHand: (G, ctx, playerID, ins) => {
        if (ins.ui.type !== "card_to_card") return [];
        return [{ type: "returnToHand__cardToCard", info: { targets: findReturnToHandTargets(G, ctx, playerID, (ins.do as DoReturnToHand).info), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    discard: (G, ctx, playerID, ins, scene) => {
        const doInfo = (ins.do as DoDiscard).info;
        if (ins.ui.type === "single_action_popup") {
            const targets = findDiscardTargets(G, ctx, playerID, doInfo);
            if (scene.mandatory === false) {
                // Block the opt-in popup if:
                // 1. Player cannot pay the full discard cost, or
                // 2. Any subsequent action in the scene cannot be satisfied
                // (prevents discarding cards only to have the effect fizzle)
                if (!canDiscard(G, ctx, playerID, doInfo)) return [];
                const actionIdx = scene.actions.findIndex(ac => ac.instructions.some(i => i.id === ins.id));
                const subsequentSatisfiable = scene.actions.slice(actionIdx + 1).every(ac =>
                    ac.instructions.every(i => canSatisfyDo(G, ctx, i.protagonist, i.do, i.ui.info?.source))
                );
                if (!subsequentSatisfiable) return [];
            }
            const base = { targets, instructionID: ins.id, sourceCardID: ins.ui.info?.source, singleActionText: ins.ui.info?.singleActionText };
            return [{ type: scene.mandatory === false ? "discard__popup__ask" : "discard__popup__committed", info: base }];
        }
        if (ins.ui.type === "click_on_own_card_in_hand") {
            return [{ type: "discard", info: { targets: findDiscardTargets(G, ctx, playerID, doInfo), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
        }
        return [];
    },
    bringToStable: (G, ctx, playerID, ins, scene) => {
        if (ins.ui.type !== "single_action_popup") return [];
        const doInfo = (ins.do as DoBringToStable).info;
        if (!canBringToStableTargets(G, ctx, playerID, doInfo)) return [];
        const base = { targets: findBringToStableTargets(G, ctx, playerID, doInfo), instructionID: ins.id, sourceCardID: ins.ui.info?.source, singleActionText: ins.ui.info?.singleActionText };
        return [{ type: scene.mandatory === false ? "bring__popup__ask" : "bring__popup__committed", info: base }];
    },
    swapHands: (G, ctx, playerID, ins) => {
        if (ins.ui.type !== "card_to_player") return [];
        return [{ type: "swapHands__cardToPlayer", info: { targets: findSwapHandsTargets(G, ctx, playerID), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    shakeUp: (G, ctx, playerID, ins) => {
        if (ins.ui.type !== "single_action_popup") return [];
        return [{ type: "shakeUp", info: { instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    shuffleDiscardPileIntoDrawPile: (G, ctx, playerID, ins) => {
        if (ins.ui.type !== "single_action_popup") return [];
        return [{ type: "shuffleDiscardPileIntoDrawPile", info: { instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    reset: (G, ctx, playerID, ins) => {
        if (ins.ui.type !== "single_action_popup") return [];
        return [{ type: "reset", info: { instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    move: (G, ctx, playerID, ins) => {
        return [{ type: "move__cardToCard", info: { targets: findMoveTargets(G, ctx, playerID, (ins.do as DoMove).info), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    move2: (G, ctx, playerID, ins) => {
        return [{ type: "move2__cardToPlayer", info: { targets: findMoveTargets2(G, ctx, playerID), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    revive: (G, ctx, playerID, ins) => {
        return [{ type: "revive", info: { targets: findReviveTarget(G, ctx, playerID, (ins.do as DoRevive).info), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    reviveFromNursery: (G, ctx, playerID, ins) => {
        return [{ type: "reviveFromNursery", info: { targets: G.nursery.map(c => ({ cardID: c })), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    backKick: (G, ctx, playerID, ins) => {
        if (ins.ui.type !== "card_to_card") return [];
        return [{ type: "backKick__card_to_card", info: { targets: findBackKickTargets(G, ctx, playerID), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    unicornSwap1: (G, ctx, playerID, ins) => {
        return [{ type: "unicornswap1", info: { targets: findUnicornSwap1Targets(G, ctx, playerID), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    unicornSwap2: (G, ctx, playerID, ins) => {
        return [{ type: "unicornswap2", info: { targets: findUnicornSwap2Targets(G, ctx, playerID), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    blatantThievery1: (G, ctx, playerID, ins) => {
        if (ins.ui.type !== "card_to_player") return [];
        return [{ type: "blatantThievery1", info: { instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    pullRandom: (G, ctx, playerID, ins) => {
        if (ins.ui.type !== "card_to_player") return [];
        return [{ type: "pullRandom__cardToPlayer", info: { targets: findPullRandomTargets(G, ctx, playerID), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    makeSomeoneDiscard: (G, ctx, playerID, ins) => {
        if (ins.ui.type !== "card_to_player") return [];
        return [{ type: "makeSomeoneDiscard__cardToPlayer", info: { targets: findMakeSomeoneDiscardTarget(G, ctx, playerID), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    search: (G, ctx, playerID, ins) => {
        if (ins.ui.type !== "single_action_popup") return [];
        return [{ type: "search__single_action_popup", info: { targets: findSearchTargets(G, ctx, playerID, (ins.do as DoSearch).info), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
    addFromDiscardPileToHand: (G, ctx, playerID, ins) => {
        if (ins.ui.type !== "single_action_popup") return [];
        return [{ type: "addFromDiscardPileToHand__single_action_popup", info: { targets: findAddFromDiscardPileToHand(G, ctx, playerID, (ins.do as DoAddFromDiscardPileToHand).info), instructionID: ins.id, sourceCardID: ins.ui.info?.source } }];
    },
};

function getExecutionDoState(G: UnstableUnicornsGame, ctx: Ctx, playerID: PlayerID, openScenes: Array<[Instruction, Scene]>): BoardState[] {
    const states: BoardState[] = [];
    openScenes.forEach(([instruction, scene]) => {
        const handler = doKeyHandlers[instruction.do.key];
        if (handler) {
            states.push(...handler(G, ctx, playerID, instruction, scene));
        }
    });
    return states;
}