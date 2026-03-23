import { UnstableUnicornsGame, Ctx, _findInstruction } from "../game";
import type { PlayerID } from "../player";
import _ from 'underscore';
import { steal, pull, DoSteal, DoPull } from "./steal";
import { discard, ParamDiscard, DoDiscard } from "./discard";
import { destroy, findOwnerOfCard, DoDestroy } from "./destroy";
import { sacrifice, DoSacrifice } from "./sacrifice";
import { search, DoSearch } from "./search";
import { revive, addFromDiscardPileToHand, reviveFromNursery, DoRevive, DoAddFromDiscardPileToHand, DoReviveFromNursery } from "./revive";
import { draw, DoDraw } from "./draw";
import { returnToHand, bringToStable, move, move2, backKick, DoReturnToHand, DoBringToStable, DoMove, DoMove2, DoBackKick } from "./move";
import { makeSomeoneDiscard, blatantThievery1, pullRandom, DoPullRandom, DoMakeSomeoneDiscard, DoBlatantThievery1 } from "./misc";
import { swapHands, shakeUp, reset, shuffleDiscardPileIntoDrawPile, unicornSwap1, unicornSwap2, DoSwapHands, DoShakeUp, DoReset, DoShuffleDiscardPileIntoDrawPile, DoUnicornSwap1, DoUnicornSwap2 } from "./swap";
import { CardID } from "../card";
export type Do = DoSteal | DoPull | DoPullRandom | DoDiscard | DoDestroy | DoSacrifice | DoSearch | DoRevive | DoDraw | DoAddFromDiscardPileToHand | DoReviveFromNursery | DoReturnToHand | DoBringToStable | DoMakeSomeoneDiscard | DoSwapHands | DoShakeUp | DoReset | DoMove | DoMove2 | DoBackKick | DoShuffleDiscardPileIntoDrawPile | DoUnicornSwap1 | DoUnicornSwap2 | DoBlatantThievery1;


// KeyToFunc is a runtime dispatch table keyed on Do.key.
// The param type is intentionally loose — callers (executeDo) cast before passing.
// The public move APIs (steal, destroy, etc.) are each fully typed above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const KeyToFunc: { [key: string]: (G: UnstableUnicornsGame, ctx: Ctx, param: any) => void } = {
    steal, pull, pullRandom, discard, destroy, sacrifice, search, revive, draw, addFromDiscardPileToHand, reviveFromNursery, returnToHand, bringToStable, makeSomeoneDiscard, swapHands, shakeUp, move, move2, reset, shuffleDiscardPileIntoDrawPile, backKick, unicornSwap1, unicornSwap2, blatantThievery1,
}

type ParamDestroy = {
    protagonist: PlayerID;
    cardID: CardID;
}

export function executeDo(G: UnstableUnicornsGame, ctx: Ctx, instructionID: string, param: { protagonist: PlayerID }) {
    const { scene, action, instruction } = _findInstruction(G, instructionID)!;

    if (scene.endTurnImmediately) {
        G.mustEndTurnImmediately = true;
    }

    instruction.state = "in_progress";

    // execute instruction
    if (instruction.do.key === "destroy") {
        const paramDestroy = <ParamDestroy>param;
        const targetPlayer = findOwnerOfCard(G, paramDestroy.cardID)!;

        if (G.playerEffects[targetPlayer].find(eff => eff.effect.key === "save_mate_by_sacrifice")) {
        } else {
            KeyToFunc[instruction.do.key](G, ctx, param);
        }

        if (instruction.do.info.count !== undefined) {
            if (instruction.do.info.count === 1) {
                action.instructions.filter(ins => ins.protagonist === param.protagonist).forEach(ins => ins.state = "executed");
            }
            instruction.do.info.count = instruction.do.info.count - 1;
        } else {
            action.instructions.filter(ins => ins.protagonist === param.protagonist).forEach(ins => ins.state = "executed");
        }
    } else if (instruction.do.key === "discard") {
        discard(G, ctx, param as ParamDiscard);
        if (instruction.do.info.count === 1) {
            action.instructions.filter(ins => ins.protagonist === param.protagonist).forEach(ins => ins.state = "executed");

            if (instruction.do.info.changeOfLuck === true) {
                G.playerEffects[param.protagonist] = [...G.playerEffects[param.protagonist], {effect: {key: "change_of_luck"}}]
            }
        }
        instruction.do.info.count = instruction.do.info.count - 1;
    } else {
        KeyToFunc[instruction.do.key](G, ctx, param);
        action.instructions.filter(ins => ins.protagonist === param.protagonist).forEach(ins => ins.state = "executed");
    }

    const actionIndex = scene.actions.findIndex(ac => ac.instructions.find(ins => ins.id === instructionID));
    if (actionIndex === scene.actions.length - 1) {
        // all instructions were executed
        if (action.instructions.filter(ins => ins.state === "executed").length === action.instructions.length) {
            // handle magic cards
            // if it is the last action of a magic card and it is executed
            // remove from temporary stable and move it to discard pile
            const tempCard = _.first(G.temporaryStable[param.protagonist]);
            G.temporaryStable[param.protagonist] = [];
            if (tempCard) {
                if (instruction.do.key === "shakeUp") {
                    // do nothing
                    // shake up card is not placed in the discard pile
                } else {
                    G.discardPile = [...G.discardPile, tempCard];
                }
            }
        }
    }
}
