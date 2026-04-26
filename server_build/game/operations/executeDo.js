"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoFizzleUnsatisfiable = void 0;
exports.executeDo = executeDo;
const state_1 = require("../state");
const underscore_1 = __importDefault(require("underscore"));
const steal_1 = require("./steal");
const discard_1 = require("./discard");
const destroy_1 = require("./destroy");
const sacrifice_1 = require("./sacrifice");
const search_1 = require("./search");
const revive_1 = require("./revive");
const draw_1 = require("./draw");
const move_1 = require("./move");
const misc_1 = require("./misc");
const swap_1 = require("./swap");
const canSatisfy_1 = require("./canSatisfy");
const log_1 = require("../log");
var canSatisfy_2 = require("./canSatisfy");
Object.defineProperty(exports, "autoFizzleUnsatisfiable", { enumerable: true, get: function () { return canSatisfy_2.autoFizzleUnsatisfiable; } });
// KeyToFunc is a runtime dispatch table keyed on Do.key.
// The param type is intentionally loose — callers (executeDo) cast before passing.
// The public move APIs (steal, destroy, etc.) are each fully typed above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const KeyToFunc = {
    steal: steal_1.steal, pull: steal_1.pull, pullRandom: misc_1.pullRandom, discard: discard_1.discard, destroy: destroy_1.destroy, sacrifice: sacrifice_1.sacrifice, search: search_1.search, revive: revive_1.revive, draw: draw_1.draw, addFromDiscardPileToHand: revive_1.addFromDiscardPileToHand, reviveFromNursery: revive_1.reviveFromNursery, returnToHand: move_1.returnToHand, bringToStable: move_1.bringToStable, makeSomeoneDiscard: misc_1.makeSomeoneDiscard, swapHands: swap_1.swapHands, shakeUp: swap_1.shakeUp, move: move_1.move, move2: move_1.move2, reset: swap_1.reset, shuffleDiscardPileIntoDrawPile: swap_1.shuffleDiscardPileIntoDrawPile, backKick: move_1.backKick, unicornSwap1: swap_1.unicornSwap1, unicornSwap2: swap_1.unicornSwap2, blatantThievery1: misc_1.blatantThievery1,
};
function executeDo(G, ctx, instructionID, param) {
    const { scene, action, instruction } = (0, state_1._findInstruction)(G, instructionID);
    if (scene.endTurnImmediately) {
        G.mustEndTurnImmediately = true;
    }
    instruction.state = "in_progress";
    const sourceCardID = instruction.ui.info?.source;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = param;
    // execute instruction
    if (instruction.do.key === "destroy") {
        const paramDestroy = param;
        const targetPlayer = (0, destroy_1.findOwnerOfCard)(G, paramDestroy.cardID);
        if (G.playerEffects[targetPlayer].find(eff => eff.effect.key === "save_mate_by_sacrifice")) {
        }
        else {
            KeyToFunc[instruction.do.key](G, ctx, param);
            (0, log_1.pushLog)(G, ctx, { actor: param.protagonist, kind: 'destroy', sourceCardID, targetCardID: paramDestroy.cardID, targetPlayer });
        }
        if (instruction.do.info.count !== undefined) {
            if (instruction.do.info.count === 1) {
                action.instructions.filter(ins => ins.protagonist === param.protagonist).forEach(ins => ins.state = "executed");
            }
            instruction.do.info.count = instruction.do.info.count - 1;
        }
        else {
            action.instructions.filter(ins => ins.protagonist === param.protagonist).forEach(ins => ins.state = "executed");
        }
    }
    else if (instruction.do.key === "discard") {
        (0, discard_1.discard)(G, ctx, param);
        (0, log_1.pushLog)(G, ctx, { actor: param.protagonist, kind: 'discard', sourceCardID, targetCardID: p.cardID });
        if (instruction.do.info.count === 1) {
            action.instructions.filter(ins => ins.protagonist === param.protagonist).forEach(ins => ins.state = "executed");
            if (instruction.do.info.changeOfLuck === true) {
                G.playerEffects[param.protagonist] = [...G.playerEffects[param.protagonist], { effect: { key: "change_of_luck" } }];
            }
        }
        instruction.do.info.count = instruction.do.info.count - 1;
    }
    else {
        // capture owner before the operation mutates G (steal, returnToHand change card location)
        const preOpOwner = p.cardID !== undefined ? (0, destroy_1.findOwnerOfCard)(G, p.cardID) ?? undefined : undefined;
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
            const tempCard = underscore_1.default.first(G.temporaryStable[param.protagonist]);
            G.temporaryStable[param.protagonist] = [];
            if (tempCard) {
                if (instruction.do.key === "shakeUp") {
                    // do nothing
                    // shake up card is not placed in the discard pile
                }
                else {
                    G.discardPile = [...G.discardPile, tempCard];
                }
            }
        }
    }
    // After every execution, check if any mandatory instructions have become
    // unsatisfiable (no valid targets) and auto-skip them.
    (0, canSatisfy_1.autoFizzleUnsatisfiable)(G, ctx);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _logDoOperation(G, ctx, key, protagonist, sourceCardID, p, preOpOwner) {
    switch (key) {
        case 'sacrifice':
            (0, log_1.pushLog)(G, ctx, { actor: protagonist, kind: 'sacrifice', sourceCardID, targetCardID: p.cardID });
            break;
        case 'steal':
            (0, log_1.pushLog)(G, ctx, { actor: protagonist, kind: 'steal', sourceCardID, targetCardID: p.cardID, targetPlayer: preOpOwner });
            break;
        case 'pull':
        case 'pullRandom':
        case 'blatantThievery1':
            (0, log_1.pushLog)(G, ctx, { actor: protagonist, kind: 'pull', sourceCardID, targetPlayer: p.from ?? p.playerID });
            break;
        case 'draw':
            (0, log_1.pushLog)(G, ctx, { actor: protagonist, kind: 'draw', sourceCardID, count: p.count });
            break;
        case 'search':
            (0, log_1.pushLog)(G, ctx, { actor: protagonist, kind: 'search', sourceCardID });
            break;
        case 'revive':
        case 'addFromDiscardPileToHand':
        case 'reviveFromNursery':
            (0, log_1.pushLog)(G, ctx, { actor: protagonist, kind: 'revive', sourceCardID, targetCardID: p.cardID });
            break;
        case 'returnToHand':
            (0, log_1.pushLog)(G, ctx, { actor: protagonist, kind: 'return_to_hand', sourceCardID, targetCardID: p.cardID, targetPlayer: preOpOwner });
            break;
        case 'bringToStable':
            (0, log_1.pushLog)(G, ctx, { actor: protagonist, kind: 'bring_to_stable', sourceCardID, targetCardID: p.cardID });
            break;
        case 'move':
        case 'move2':
            (0, log_1.pushLog)(G, ctx, { actor: protagonist, kind: 'move', sourceCardID, targetCardID: p.cardID });
            break;
        case 'backKick':
            (0, log_1.pushLog)(G, ctx, { actor: protagonist, kind: 'return_to_hand', sourceCardID, targetCardID: p.cardID, targetPlayer: preOpOwner });
            break;
        case 'swapHands':
        case 'unicornSwap1':
        case 'unicornSwap2':
            (0, log_1.pushLog)(G, ctx, { actor: protagonist, kind: 'swap', sourceCardID, targetPlayer: p.playerID });
            break;
        case 'shakeUp':
        case 'reset':
        case 'shuffleDiscardPileIntoDrawPile':
            (0, log_1.pushLog)(G, ctx, { actor: protagonist, kind: 'shuffle', sourceCardID });
            break;
        default:
            break;
    }
}
