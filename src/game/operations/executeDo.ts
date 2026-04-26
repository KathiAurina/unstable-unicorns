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
import { CardID } from "../card";
import { autoFizzleUnsatisfiable } from "./canSatisfy";
import { pushLog } from "../log";
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

    const sourceCardID = instruction.ui.info?.source;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = param as any;

    // execute instruction
    if (instruction.do.key === "destroy") {
        const paramDestroy = <ParamDestroy>param;
        const targetPlayer = findOwnerOfCard(G, paramDestroy.cardID)!;

        if (G.playerEffects[targetPlayer].find(eff => eff.effect.key === "save_mate_by_sacrifice")) {
        } else {
            KeyToFunc[instruction.do.key](G, ctx, param);
            pushLog(G, ctx, { actor: param.protagonist, kind: 'destroy', sourceCardID, targetCardID: paramDestroy.cardID, targetPlayer });
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
        pushLog(G, ctx, { actor: param.protagonist, kind: 'discard', sourceCardID, targetCardID: p.cardID });
        if (instruction.do.info.count === 1) {
            action.instructions.filter(ins => ins.protagonist === param.protagonist).forEach(ins => ins.state = "executed");

            if (instruction.do.info.changeOfLuck === true) {
                G.playerEffects[param.protagonist] = [...G.playerEffects[param.protagonist], {effect: {key: "change_of_luck"}}]
            }
        }
        instruction.do.info.count = instruction.do.info.count - 1;
    } else {
        // capture owner before the operation mutates G (steal, returnToHand change card location)
        const preOpOwner = p.cardID !== undefined ? findOwnerOfCard(G, p.cardID) ?? undefined : undefined;
        // pass source through to operations that create sub-scenes (e.g. backKick → makeSomeoneDiscard)
        const paramWithSource = sourceCardID !== undefined ? { ...param, source: sourceCardID } : param;
        KeyToFunc[instruction.do.key](G, ctx, paramWithSource);
        _logDoOperation(G, ctx, instruction.do.key, param.protagonist, sourceCardID, p, preOpOwner);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _logDoOperation(G: UnstableUnicornsGame, ctx: Ctx, key: string, protagonist: PlayerID, sourceCardID: CardID | undefined, p: any, preOpOwner?: PlayerID) {
    switch (key) {
        case 'sacrifice':
            pushLog(G, ctx, { actor: protagonist, kind: 'sacrifice', sourceCardID, targetCardID: p.cardID });
            break;
        case 'steal':
            pushLog(G, ctx, { actor: protagonist, kind: 'steal', sourceCardID, targetCardID: p.cardID, targetPlayer: preOpOwner });
            break;
        case 'pull':
        case 'pullRandom':
        case 'blatantThievery1':
            pushLog(G, ctx, { actor: protagonist, kind: 'pull', sourceCardID, targetPlayer: p.from ?? p.playerID });
            break;
        case 'draw':
            pushLog(G, ctx, { actor: protagonist, kind: 'draw', sourceCardID, count: p.count });
            break;
        case 'search':
            pushLog(G, ctx, { actor: protagonist, kind: 'search', sourceCardID });
            break;
        case 'revive':
        case 'addFromDiscardPileToHand':
        case 'reviveFromNursery':
            pushLog(G, ctx, { actor: protagonist, kind: 'revive', sourceCardID, targetCardID: p.cardID });
            break;
        case 'returnToHand':
            pushLog(G, ctx, { actor: protagonist, kind: 'return_to_hand', sourceCardID, targetCardID: p.cardID, targetPlayer: preOpOwner });
            break;
        case 'bringToStable':
            pushLog(G, ctx, { actor: protagonist, kind: 'bring_to_stable', sourceCardID, targetCardID: p.cardID });
            break;
        case 'move':
        case 'move2':
            pushLog(G, ctx, { actor: protagonist, kind: 'move', sourceCardID, targetCardID: p.cardID });
            break;
        case 'backKick':
            pushLog(G, ctx, { actor: protagonist, kind: 'return_to_hand', sourceCardID, targetCardID: p.cardID, targetPlayer: preOpOwner });
            break;
        case 'swapHands':
        case 'unicornSwap1':
        case 'unicornSwap2':
            pushLog(G, ctx, { actor: protagonist, kind: 'swap', sourceCardID, targetPlayer: p.playerID });
            break;
        case 'shakeUp':
        case 'reset':
        case 'shuffleDiscardPileIntoDrawPile':
            pushLog(G, ctx, { actor: protagonist, kind: 'shuffle', sourceCardID });
            break;
        default:
            break;
    }
}

