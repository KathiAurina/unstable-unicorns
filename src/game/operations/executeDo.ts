import type { UnstableUnicornsGame, Ctx, Action, Scene } from "../state";
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
import { CardID } from "../card";
import { canSatisfyDo } from "./canSatisfy";
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

/**
 * Scans all mandatory scenes and marks any instruction that has no valid
 * targets as executed (effect fizzles). Handles the temporary-stable cleanup
 * for magic cards when the last action of a scene is fully fizzled.
 * Repeats until stable (fizzling one action may expose the next).
 */
export function autoFizzleUnsatisfiable(G: UnstableUnicornsGame, ctx: Ctx): void {
    let changed = true;
    while (changed) {
        changed = false;
        G.script.scenes.forEach((scene: Scene) => {
            if (!scene.mandatory) return;

            // Find the current action (first one with any non-executed instruction)
            const currentAction = scene.actions.find((ac: Action) =>
                ac.instructions.some(ins => ins.state !== "executed")
            );
            if (!currentAction) return;

            currentAction.instructions
                .filter(ins => ins.state !== "executed")
                .forEach(ins => {
                    if (!canSatisfyDo(G, ctx, ins.protagonist, ins.do)) {
                        // Mark all of this protagonist's instructions in this action as executed
                        currentAction.instructions
                            .filter(i => i.protagonist === ins.protagonist)
                            .forEach(i => { i.state = "executed"; });
                        changed = true;
                    }
                });

            // If this is the last action and it's now fully executed, flush temp stables
            const isLastAction = currentAction === scene.actions[scene.actions.length - 1];
            if (isLastAction && currentAction.instructions.every(i => i.state === "executed")) {
                G.players.forEach(pl => {
                    const tempCard = _.first(G.temporaryStable[pl.id]);
                    if (tempCard !== undefined) {
                        G.temporaryStable[pl.id] = [];
                        // shakeUp cards are handled elsewhere; all others go to discard
                        G.discardPile = [...G.discardPile, tempCard];
                    }
                });
            }
        });
    }
}
