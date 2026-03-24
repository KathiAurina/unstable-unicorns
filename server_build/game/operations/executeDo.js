"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeDo = executeDo;
const game_1 = require("../game");
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
// KeyToFunc is a runtime dispatch table keyed on Do.key.
// The param type is intentionally loose — callers (executeDo) cast before passing.
// The public move APIs (steal, destroy, etc.) are each fully typed above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const KeyToFunc = {
    steal: steal_1.steal, pull: steal_1.pull, pullRandom: misc_1.pullRandom, discard: discard_1.discard, destroy: destroy_1.destroy, sacrifice: sacrifice_1.sacrifice, search: search_1.search, revive: revive_1.revive, draw: draw_1.draw, addFromDiscardPileToHand: revive_1.addFromDiscardPileToHand, reviveFromNursery: revive_1.reviveFromNursery, returnToHand: move_1.returnToHand, bringToStable: move_1.bringToStable, makeSomeoneDiscard: misc_1.makeSomeoneDiscard, swapHands: swap_1.swapHands, shakeUp: swap_1.shakeUp, move: move_1.move, move2: move_1.move2, reset: swap_1.reset, shuffleDiscardPileIntoDrawPile: swap_1.shuffleDiscardPileIntoDrawPile, backKick: move_1.backKick, unicornSwap1: swap_1.unicornSwap1, unicornSwap2: swap_1.unicornSwap2, blatantThievery1: misc_1.blatantThievery1,
};
function executeDo(G, ctx, instructionID, param) {
    const { scene, action, instruction } = (0, game_1._findInstruction)(G, instructionID);
    if (scene.endTurnImmediately) {
        G.mustEndTurnImmediately = true;
    }
    instruction.state = "in_progress";
    // execute instruction
    if (instruction.do.key === "destroy") {
        const paramDestroy = param;
        const targetPlayer = (0, destroy_1.findOwnerOfCard)(G, paramDestroy.cardID);
        if (G.playerEffects[targetPlayer].find(eff => eff.effect.key === "save_mate_by_sacrifice")) {
        }
        else {
            KeyToFunc[instruction.do.key](G, ctx, param);
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
        if (instruction.do.info.count === 1) {
            action.instructions.filter(ins => ins.protagonist === param.protagonist).forEach(ins => ins.state = "executed");
            if (instruction.do.info.changeOfLuck === true) {
                G.playerEffects[param.protagonist] = [...G.playerEffects[param.protagonist], { effect: { key: "change_of_luck" } }];
            }
        }
        instruction.do.info.count = instruction.do.info.count - 1;
    }
    else {
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
}
