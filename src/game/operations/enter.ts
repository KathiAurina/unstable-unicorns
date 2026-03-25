import { CardID, OnEnter, OnEnterAddEffect } from "../card";
import type { UnstableUnicornsGame, Ctx, Scene, Action, Instruction } from "../state";
import { _addSceneFromDo } from "../state";
import type { PlayerID } from "../player";
import { isCardBasicDueToEffect } from "../effect";
import _ from 'underscore';
import { CONSTANTS } from "../constants";

const _findInstructionInProgress = (G: UnstableUnicornsGame): [Scene, Action, Instruction] | null => {
    let scene: Scene | null = null;
    let action: Action | null = null;
    let instruction: Instruction | null = null;

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
}

/** Injects `newAction` before the current in-progress instruction, or appends a
 *  new mandatory scene when no instruction is in progress. */
function injectActionOrCreateScene(G: UnstableUnicornsGame, newAction: Action): void {
    const found = _findInstructionInProgress(G);
    if (found === null) {
        const newScene: Scene = {
            id: _.uniqueId(),
            mandatory: true,
            endTurnImmediately: false,
            actions: [newAction]
        };
        G.script.scenes = [...G.script.scenes, newScene];
    } else {
        const [scene, , instruction] = found;
        const index = scene.actions.findIndex(ac => ac.instructions.find(ins => ins.id === instruction.id));
        scene.actions.splice(index, 0, newAction);
    }
}

type ParamLeave = {
    playerID: PlayerID;
    cardID: CardID;
}

export function leave(G: UnstableUnicornsGame, ctx: Ctx, param: ParamLeave) {
    G.stable[param.playerID] = _.without(G.stable[param.playerID], param.cardID);
    G.upgradeDowngradeStable[param.playerID] = _.without(G.upgradeDowngradeStable[param.playerID], param.cardID);

    // remove player effect
    G.playerEffects[param.playerID] = _.filter(G.playerEffects[param.playerID], eff => eff.cardID !== param.cardID);

    // when another unicorn enters your stable
    // inject action after the current action
    const on = [...G.stable[param.playerID], ...G.upgradeDowngradeStable[param.playerID]].map(c => G.deck[c]).filter(s => s.on && s.on.filter(o => o.trigger === "unicorn_leaves_your_stable").length > 0);
    on.forEach(card => {
        // all unicorns are basic — trigger no effect
        if (isCardBasicDueToEffect(G.playerEffects[param.playerID], card)) return;

        const on = card.on?.find(o => o.trigger === "unicorn_leaves_your_stable")!;
        if (on.do.type === "inject_action") {
            const newAction: Action = {
                type: "action",
                instructions: [{
                    id: _.uniqueId(),
                    protagonist: param.playerID,
                    state: "open",
                    do: on.do.info.instruction.do,
                    ui: { ...on.do.info.instruction.ui, info: { source: card.id, ...on.do.info.instruction.ui.info } },
                }]
            };
            injectActionOrCreateScene(G, newAction);
        }
    });
}

type ParamEnter = {
    playerID: PlayerID;
    cardID: CardID;
}

export function enter(G: UnstableUnicornsGame, ctx: Ctx, param: ParamEnter) {
    const card = G.deck[param.cardID];

    if (card.type === "upgrade" || card.type === "downgrade") {
        G.upgradeDowngradeStable[param.playerID] = [...G.upgradeDowngradeStable[param.playerID], param.cardID];
    } else if (card.type === "magic") {
        G.temporaryStable[param.playerID] = [param.cardID];
    } else {
        G.stable[param.playerID] = [...G.stable[param.playerID], param.cardID];
    }

    const cardOnEnter = <OnEnter[] | undefined>card.on?.filter(c => c.trigger === "enter");

    if (cardOnEnter) {
        // all unicorns are basic — trigger no effect
        if (isCardBasicDueToEffect(G.playerEffects[param.playerID], card)) return;

        _addSceneFromDo(G, ctx, param.cardID, param.playerID, "enter");

        cardOnEnter.filter(on => on.do.type === "auto").forEach(on => {
            if (on.do.type === "auto" && on.do.info.key === "sacrifice_all_downgrades") {
                const toBeRemoved = _.filter(G.upgradeDowngradeStable[param.playerID], c => {
                    const card = G.deck[c];
                    return card.type === "downgrade";
                });

                G.upgradeDowngradeStable[param.playerID] = _.difference(G.upgradeDowngradeStable[param.playerID], toBeRemoved);

                G.discardPile = [...G.discardPile, ...toBeRemoved];
            }
        });

        cardOnEnter.filter(on => on.do.type === "add_effect").forEach(on => {
            const doAddEffect = <OnEnterAddEffect>on.do;
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
                const newAction: Action = {
                    type: "action",
                    instructions: [{
                        id: _.uniqueId(),
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

    // when another unicorn enters your stable
    // inject action after the current action
    const on = [...G.stable[param.playerID], ...G.upgradeDowngradeStable[param.playerID]].map(c => G.deck[c]).filter(s => s.on && s.on.filter(o => o.trigger === "unicorn_enters_your_stable").length > 0);
    on.forEach(card => {
        // all unicorns are basic — trigger no effect
        if (isCardBasicDueToEffect(G.playerEffects[param.playerID], card)) return;

        const on = card.on?.find(o => o.trigger === "unicorn_enters_your_stable")!;
        if (on.do.type === "inject_action") {
            const newAction: Action = {
                type: "action",
                instructions: [{
                    id: _.uniqueId(),
                    protagonist: param.playerID,
                    state: "open",
                    do: on.do.info.instruction.do,
                    ui: { ...on.do.info.instruction.ui, info: { source: card.id, ...on.do.info.instruction.ui.info } },
                }]
            };
            injectActionOrCreateScene(G, newAction);
        }
    });
}

export function canEnter(G: UnstableUnicornsGame, ctx: Ctx, param: ParamEnter) {
    if (G.deck[param.cardID].type === "neigh" || G.deck[param.cardID].type === "super_neigh") {
        return false;
    }

    if (G.stable[param.playerID].length === CONSTANTS.stableSeats) {
        return false;
    }

    const card = G.deck[param.cardID];

    if (G.playerEffects[param.playerID].find(s => s.effect.key === "you_cannot_play_upgrades")) {
        if (card.type === "upgrade") {
            return false;
        }
    }

    if (card.type === "basic") {
        let basic_unicorns_cannot_enter_isActive = false;
        _.keys(G.playerEffects).forEach(key => {
            const effect = G.playerEffects[key].find(eff => eff.effect.key === "basic_unicorns_can_only_join_your_stable");
            if (effect && key !== param.playerID) {
                basic_unicorns_cannot_enter_isActive = true;
            }
        });

        return !basic_unicorns_cannot_enter_isActive;
    }

    return true;
}
