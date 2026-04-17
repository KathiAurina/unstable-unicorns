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

import type { Game, Ctx } from 'boardgame.io';
import type { Player, PlayerID } from './player';
import type { Card, CardID, CardUI, OnEnterAddEffect } from './card';
import type { Do } from './do-types';
import { isCardBasicDueToEffect } from './effect';
import type { Effect } from './effect';
import type { NeighDiscussion } from './neigh';
import type { Clipboard, SetupData } from './types';
import _ from 'underscore';

export type { Ctx };

// ─── Game state ───────────────────────────────────────────────────────────────

export interface UnstableUnicornsGame extends Game {
    players: Player[];
    deck: Card[];
    drawPile: CardID[];
    discardPile: CardID[];
    nursery: CardID[];
    hand: { [key: string]: CardID[] };
    stable: { [key: string]: CardID[] };
    temporaryStable: { [key: string]: CardID[] };
    upgradeDowngradeStable: { [key: string]: CardID[] };
    script: Script;
    playerEffects: { [key: string]: { cardID?: CardID, effect: Effect }[] };
    mustEndTurnImmediately: boolean;
    countPlayedCardsInActionPhase: number;
    neighDiscussion?: NeighDiscussion;
    clipboard: Clipboard;
    endGame: boolean;
    babyStarter: { cardID: CardID, owner: PlayerID }[];
    ready: { [key: string]: boolean };
    lastNeighResult: {id: string, result: "cardWasPlayed" | "cardWasNeighed"} | undefined;
    owner: PlayerID;
    lastHeartbeat: { [key: string]: number };
    deckWasReshuffled: boolean;
}

// ─── Script types ─────────────────────────────────────────────────────────────

interface Script {
    scenes: Scene[];
}

type SceneID = string;

export interface Scene {
    id: SceneID;
    actions: Action[];
    mandatory: boolean;
    endTurnImmediately: boolean;
}

export interface Action {
    type: "action";
    instructions: Instruction[];
}

export interface Instruction {
    id: string;
    protagonist: PlayerID;
    state: "executed" | "open" | "in_progress";
    do: Do;
    ui: {
        type: "single_action_popup",
        info?: { source: CardID, singleActionText?: string },
    } | {
        type: "card_to_card" | "card_to_handcard" | "card_to_player" | "click_on_own_card_in_stable" | "click_on_own_card_in_hand" | "yes_no_popup" | "click_on_card_in_stable" | "yes_no_popup" | "click_on_drawPile" | "custom",
        info?: { source: CardID },
    }
}

// ─── Helper functions ─────────────────────────────────────────────────────────

export function _addSceneFromDo(G: UnstableUnicornsGame, ctx: Ctx, cardID: CardID, owner: PlayerID, trigger: "enter" | "begin_of_turn" | "any") {
    const card = G.deck[cardID];

    if (!card.on) {
        return;
    }

    // all unicorns are basic — trigger no effect
    if (isCardBasicDueToEffect(G.playerEffects[owner], card)) return;

    card.on.forEach(on => {
        if (on.do.type === "add_scene" && (on.trigger === trigger || trigger === "any")) {
            const newScene: Scene = {
                id: _.uniqueId(),
                mandatory: on.do.info.mandatory,
                endTurnImmediately: on.do.info.endTurnImmediately,
                actions: on.do.info.actions.map(ac => {
                    let instructions: Instruction[] = [];
                    ac.instructions.forEach(c => {
                        let protagonists: PlayerID[] = [];
                        if (c.protagonist === "owner") {
                            protagonists.push(owner);
                        } else if (c.protagonist === "all") {
                            protagonists = G.players.map(pl => pl.id);
                        }

                        protagonists.forEach(pid => {
                            instructions.push({
                                id: _.uniqueId(),
                                protagonist: pid,
                                state: "open",
                                do: c.do,
                                ui: { ...c.ui, info: { source: card.id, ...c.ui.info } },
                            });
                        });
                    });

                    const action: Action = {
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
export function _findOpenScenesWithProtagonist(G: UnstableUnicornsGame, protagonist: PlayerID): Array<[Instruction, Scene]> {
    let scenes: Array<[Instruction, Scene]> = [];
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
                inst.forEach(i => scenes.push([i, scene]))
            }
        });
        stop = false;
    });

    return scenes;
}

// a scene is in progress if its first action is finished
export function _findInProgressScenesWithProtagonist(G: UnstableUnicornsGame, protagonist: PlayerID): Array<[Instruction, Scene]> {
    let scenes: Array<[Instruction, Scene]> = [];
    let stop = false;

    G.script.scenes.forEach(scene => {
        if (scene.mandatory) {
            const action = _.first(scene.actions)!;
            if (action.instructions.filter(ins => ins.state === "open" || ins.state === "in_progress").length > 0) {
                stop = true;
                const inst = action.instructions.filter(ins => ins.protagonist === protagonist && (ins.state === "open" || ins.state === "in_progress"));
                inst.forEach(i => scenes.push([i, scene]))
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
                    inst.forEach(i => scenes.push([i, scene]))
                }
            }
        });
        stop = false;
    });

    return scenes;
}

export function _findInstruction(G: UnstableUnicornsGame, instructionID: string): { instruction: Instruction; action: Action; scene: Scene } | undefined {
    let instruction: Instruction | undefined;
    let action: Action | undefined;
    let scene: Scene | undefined;

    G.script.scenes.forEach(sc => {
        sc.actions.forEach(ac => {
            ac.instructions.forEach(ic => {
                if (ic.id === instructionID) {
                    instruction = ic;
                    action = ac;
                    scene = sc;
                }
            })
        })
    });

    if (instruction === undefined || action === undefined || scene === undefined) {
        return undefined;
    }

    return { instruction, action, scene };
}
