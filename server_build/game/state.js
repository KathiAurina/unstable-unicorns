"use strict";
// Game state types and pure helper functions that operate on the game state.
// This is Layer 3 in the dependency hierarchy:
//   Layer 0: primitives (player, constants, effect, neigh, types)
//   Layer 1: do-types.ts
//   Layer 2: card.ts
//   Layer 3: state.ts  ← this file
//   Layer 4: operations/*.ts
//   Layer 5: game.ts
//
// This file must NOT import from operations/ or game.ts.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._addSceneFromDo = _addSceneFromDo;
exports._findOpenScenesWithProtagonist = _findOpenScenesWithProtagonist;
exports._findInProgressScenesWithProtagonist = _findInProgressScenesWithProtagonist;
exports._findInstruction = _findInstruction;
const effect_1 = require("./effect");
const underscore_1 = __importDefault(require("underscore"));
// ─── Helper functions ─────────────────────────────────────────────────────────
function _addSceneFromDo(G, ctx, cardID, owner, trigger) {
    const card = G.deck[cardID];
    if (!card.on) {
        return;
    }
    // all unicorns are basic — trigger no effect
    if ((0, effect_1.isCardBasicDueToEffect)(G.playerEffects[owner], card))
        return;
    card.on.forEach(on => {
        if (on.do.type === "add_scene" && (on.trigger === trigger || trigger === "any")) {
            const newScene = {
                id: underscore_1.default.uniqueId(),
                mandatory: on.do.info.mandatory,
                endTurnImmediately: on.do.info.endTurnImmediately,
                actions: on.do.info.actions.map(ac => {
                    let instructions = [];
                    ac.instructions.forEach(c => {
                        let protagonists = [];
                        if (c.protagonist === "owner") {
                            protagonists.push(owner);
                        }
                        else if (c.protagonist === "all") {
                            protagonists = G.players.map(pl => pl.id);
                        }
                        protagonists.forEach(pid => {
                            instructions.push({
                                id: underscore_1.default.uniqueId(),
                                protagonist: pid,
                                state: "open",
                                do: c.do,
                                ui: { ...c.ui, info: { source: card.id, ...c.ui.info } },
                            });
                        });
                    });
                    const action = {
                        type: "action",
                        instructions: instructions
                    };
                    return action;
                })
            };
            G.script.scenes = [...G.script.scenes, newScene];
        }
    });
}
// find all scenes that have already started and are not finished
// or all scenes that have not started yet
function _findOpenScenesWithProtagonist(G, protagonist) {
    let scenes = [];
    let stop = false;
    G.script.scenes.forEach(scene => {
        scene.actions.forEach(action => {
            if (stop) {
                return;
            }
            // find most recent action
            if (action.instructions.filter(ins => ins.state === "open" || ins.state === "in_progress").length > 0) {
                stop = true;
                const inst = action.instructions.filter(ins => ins.protagonist === protagonist && (ins.state === "open" || ins.state === "in_progress"));
                inst.forEach(i => scenes.push([i, scene]));
            }
        });
        stop = false;
    });
    return scenes;
}
// a scene is in progress if its first action is finished
function _findInProgressScenesWithProtagonist(G, protagonist) {
    let scenes = [];
    let stop = false;
    G.script.scenes.forEach(scene => {
        if (scene.mandatory) {
            const action = underscore_1.default.first(scene.actions);
            if (action.instructions.filter(ins => ins.state === "open" || ins.state === "in_progress").length > 0) {
                stop = true;
                const inst = action.instructions.filter(ins => ins.protagonist === protagonist && (ins.state === "open" || ins.state === "in_progress"));
                inst.forEach(i => scenes.push([i, scene]));
            }
        }
        scene.actions.forEach((action, idx) => {
            if (stop || idx === 0) {
                return;
            }
            // find most recent open action excluding the first action
            if (action.instructions.filter(ins => ins.state === "open" || ins.state === "in_progress").length > 0) {
                // check if the prior action was completed
                if (scene.actions[idx - 1].instructions.filter(ins => ins.state === "executed").length === scene.actions[idx - 1].instructions.length) {
                    stop = true;
                    const inst = action.instructions.filter(ins => ins.protagonist === protagonist && (ins.state === "open" || ins.state === "in_progress"));
                    inst.forEach(i => scenes.push([i, scene]));
                }
            }
        });
        stop = false;
    });
    return scenes;
}
function _findInstruction(G, instructionID) {
    let instruction;
    let action;
    let scene;
    G.script.scenes.forEach(sc => {
        sc.actions.forEach(ac => {
            ac.instructions.forEach(ic => {
                if (ic.id === instructionID) {
                    instruction = ic;
                    action = ac;
                    scene = sc;
                }
            });
        });
    });
    if (instruction === undefined || action === undefined || scene === undefined) {
        return undefined;
    }
    return { instruction, action, scene };
}
