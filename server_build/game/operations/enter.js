"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leave = leave;
exports.enter = enter;
exports.canEnter = canEnter;
const card_1 = require("../card");
const state_1 = require("../state");
const effect_1 = require("../effect");
const underscore_1 = __importDefault(require("underscore"));
const constants_1 = require("../constants");
const canSatisfy_1 = require("./canSatisfy");
const _findInstructionInProgress = (G) => {
    let scene = null;
    let action = null;
    let instruction = null;
    G.script.scenes.forEach(sc => {
        sc.actions.forEach(ac => {
            ac.instructions.forEach(ins => {
                if (ins.state === "in_progress") {
                    instruction = ins;
                    action = ac;
                    scene = sc;
                }
            });
        });
    });
    if (scene && action && instruction) {
        return [scene, action, instruction];
    }
    return null;
};
/** Injects `newAction` before the current in-progress instruction, or appends a
 *  new mandatory scene when no instruction is in progress. */
function injectActionOrCreateScene(G, newAction) {
    const found = _findInstructionInProgress(G);
    if (found === null) {
        const newScene = {
            id: underscore_1.default.uniqueId(),
            mandatory: true,
            endTurnImmediately: false,
            actions: [newAction]
        };
        G.script.scenes = [...G.script.scenes, newScene];
    }
    else {
        const [scene, , instruction] = found;
        const index = scene.actions.findIndex(ac => ac.instructions.find(ins => ins.id === instruction.id));
        scene.actions.splice(index, 0, newAction);
    }
}
/** Fires reactive `inject_action` triggers on every card in the given player's
 *  stable (including upgrades/downgrades) whose `on` array contains `trigger`.
 *  The caller is responsible for gating on the moving card's type when the
 *  trigger's game semantics require it (e.g. `unicorn_*` triggers). */
function fireReactiveStableTrigger(G, playerID, trigger) {
    const cards = [...G.stable[playerID], ...G.upgradeDowngradeStable[playerID]]
        .map(c => G.deck[c])
        .filter(s => s.on?.some(o => o.trigger === trigger));
    cards.forEach(card => {
        // all unicorns are basic — trigger no effect
        if ((0, effect_1.isCardBasicDueToEffect)(G.playerEffects[playerID], card))
            return;
        const on = card.on.find(o => o.trigger === trigger);
        if (on.do.type === "inject_action") {
            const newAction = {
                type: "action",
                instructions: [{
                        id: underscore_1.default.uniqueId(),
                        protagonist: playerID,
                        state: "open",
                        do: on.do.info.instruction.do,
                        ui: { ...on.do.info.instruction.ui, info: { source: card.id, ...on.do.info.instruction.ui.info } },
                    }]
            };
            injectActionOrCreateScene(G, newAction);
        }
    });
}
function leave(G, ctx, param) {
    G.stable[param.playerID] = underscore_1.default.without(G.stable[param.playerID], param.cardID);
    G.upgradeDowngradeStable[param.playerID] = underscore_1.default.without(G.upgradeDowngradeStable[param.playerID], param.cardID);
    // remove player effect
    G.playerEffects[param.playerID] = underscore_1.default.filter(G.playerEffects[param.playerID], eff => eff.cardID !== param.cardID);
    // unicorn_leaves_your_stable is unicorn-specific by game semantics
    if (!(0, card_1.isUnicorn)(G.deck[param.cardID]))
        return;
    fireReactiveStableTrigger(G, param.playerID, "unicorn_leaves_your_stable");
    (0, canSatisfy_1.autoFizzleUnsatisfiable)(G, ctx);
}
function enter(G, ctx, param) {
    const card = G.deck[param.cardID];
    if ((0, card_1.hasType)(card, "upgrade") || (0, card_1.hasType)(card, "downgrade")) {
        G.upgradeDowngradeStable[param.playerID] = [...G.upgradeDowngradeStable[param.playerID], param.cardID];
    }
    else if ((0, card_1.hasType)(card, "magic")) {
        G.temporaryStable[param.playerID] = [param.cardID];
    }
    else {
        G.stable[param.playerID] = [...G.stable[param.playerID], param.cardID];
    }
    const cardOnEnter = card.on?.filter(c => c.trigger === "enter");
    if (cardOnEnter) {
        // all unicorns are basic — trigger no effect
        if ((0, effect_1.isCardBasicDueToEffect)(G.playerEffects[param.playerID], card))
            return;
        (0, state_1._addSceneFromDo)(G, ctx, param.cardID, param.playerID, "enter");
        cardOnEnter.filter(on => on.do.type === "auto").forEach(on => {
            if (on.do.type === "auto" && on.do.info.key === "sacrifice_all_downgrades") {
                const toBeRemoved = underscore_1.default.filter(G.upgradeDowngradeStable[param.playerID], c => {
                    const card = G.deck[c];
                    return (0, card_1.hasType)(card, "downgrade");
                });
                toBeRemoved.forEach(cid => {
                    leave(G, ctx, { playerID: param.playerID, cardID: cid });
                });
                G.discardPile = [...G.discardPile, ...toBeRemoved];
            }
        });
        cardOnEnter.filter(on => on.do.type === "add_effect").forEach(on => {
            const doAddEffect = on.do;
            // check if effect has already been added
            if (G.playerEffects[param.playerID].filter(o => o.cardID === param.cardID && o.effect.key === doAddEffect.info.key).length === 0) {
                G.playerEffects[param.playerID] = [...G.playerEffects[param.playerID], { cardID: param.cardID, effect: doAddEffect.info }];
            }
        });
    }
    // tiny stable
    if (G.playerEffects[param.playerID].find(s => s.effect.key === "tiny_stable")) {
        // pandamonium is not active
        if (G.playerEffects[param.playerID].find(s => s.effect.key === "pandamonium") === undefined) {
            if ((G.playerEffects[param.playerID].find(p => p.effect.key === "count_as_two") && G.stable[param.playerID].length > 4) || G.stable[param.playerID].length > 5) {
                const newAction = {
                    type: "action",
                    instructions: [{
                            id: underscore_1.default.uniqueId(),
                            protagonist: param.playerID,
                            state: "open",
                            do: { key: "sacrifice", info: { type: "unicorn" } },
                            ui: { type: "click_on_card_in_stable" },
                        }]
                };
                injectActionOrCreateScene(G, newAction);
            }
        }
    }
    // unicorn_enters_your_stable is unicorn-specific by game semantics
    if ((0, card_1.isUnicorn)(card)) {
        fireReactiveStableTrigger(G, param.playerID, "unicorn_enters_your_stable");
    }
    (0, canSatisfy_1.autoFizzleUnsatisfiable)(G, ctx);
}
function canEnter(G, ctx, param) {
    if ((0, card_1.hasType)(G.deck[param.cardID], "neigh") || (0, card_1.hasType)(G.deck[param.cardID], "super_neigh")) {
        return false;
    }
    if (G.stable[param.playerID].length === constants_1.CONSTANTS.stableSeats) {
        return false;
    }
    const card = G.deck[param.cardID];
    if ((0, card_1.hasType)(card, "basic")) {
        let basic_unicorns_cannot_enter_isActive = false;
        underscore_1.default.keys(G.playerEffects).forEach(key => {
            const effect = G.playerEffects[key].find(eff => eff.effect.key === "basic_unicorns_can_only_join_your_stable");
            if (effect && key !== param.playerID) {
                basic_unicorns_cannot_enter_isActive = true;
            }
        });
        return !basic_unicorns_cannot_enter_isActive;
    }
    return true;
}
