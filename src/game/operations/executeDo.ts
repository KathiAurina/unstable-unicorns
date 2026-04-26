import type { UnstableUnicornsGame, Ctx } from "../state";
import { _findInstruction } from "../state";
import type { PlayerID } from "../player";
import _ from 'underscore';
import { steal, pull } from "./steal";
import { discard, ParamDiscard } from "./discard";
import { destroy, findOwnerOfCard } from "./destroy";
import { sacrifice } from "./sacrifice";
import { search } from "./search";
import { revive, addFromDiscardPileToHand, reviveFromNursery } from "./revive";
import { draw } from "./draw";
import { returnToHand, bringToStable, move, move2, backKick } from "./move";
import { makeSomeoneDiscard, blatantThievery1, pullRandom } from "./misc";
import { swapHands, shakeUp, reset, shuffleDiscardPileIntoDrawPile, unicornSwap1, unicornSwap2 } from "./swap";
import { CardID, isUnicorn, hasType } from "../card";
import { autoFizzleUnsatisfiable } from "./canSatisfy";
import { enter } from "./enter";
export { autoFizzleUnsatisfiable } from "./canSatisfy";
export type { Do } from '../do-types';


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
    } else if (instruction.do.key === "returnSelf") {
        // Card was sacrificed/destroyed; return it from discard pile to hand
        const sourceCardID = instruction.ui.info?.source;
        if (sourceCardID !== undefined) {
            G.discardPile = _.without(G.discardPile, sourceCardID);
            G.hand[param.protagonist].push(sourceCardID);
        }
        action.instructions.filter(ins => ins.protagonist === param.protagonist).forEach(ins => ins.state = "executed");
    } else if (instruction.do.key === "stowawaydraw") {
        // Draw top card; if unicorn/upgrade/downgrade put it in stable, otherwise in hand
        const drawnCardID = G.drawPile[0];
        G.drawPile = G.drawPile.slice(1);
        if (drawnCardID !== undefined) {
            const drawnCard = G.deck[drawnCardID];
            if (isUnicorn(drawnCard) || hasType(drawnCard, "upgrade") || hasType(drawnCard, "downgrade")) {
                enter(G, ctx, { playerID: param.protagonist, cardID: drawnCardID });
            } else {
                G.hand[param.protagonist].push(drawnCardID);
            }
        }
        action.instructions.filter(ins => ins.protagonist === param.protagonist).forEach(ins => ins.state = "executed");
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

    // After every execution, check if any mandatory instructions have become
    // unsatisfiable (no valid targets) and auto-skip them.
    autoFizzleUnsatisfiable(G, ctx);
}

