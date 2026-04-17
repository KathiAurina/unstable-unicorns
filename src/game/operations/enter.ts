import { CardID, OnEnter, OnEnterAddEffect, isUnicorn, hasType } from "../card";
import type { UnstableUnicornsGame, Ctx, Scene, Action, Instruction } from "../state";
import { _addSceneFromDo } from "../state";
import type { PlayerID } from "../player";
import { isCardBasicDueToEffect } from "../effect";
import _ from 'underscore';
import { CONSTANTS } from "../constants";
import { autoFizzleUnsatisfiable } from "./canSatisfy";

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

/** Fires reactive `inject_action` triggers on every card in the given player's
 *  stable (including upgrades/downgrades) whose `on` array contains `trigger`.
 *  The caller is responsible for gating on the moving card's type when the
 *  trigger's game semantics require it (e.g. `unicorn_*` triggers). */
function fireReactiveStableTrigger(
    G: UnstableUnicornsGame,
    playerID: PlayerID,
    trigger: "unicorn_enters_your_stable" | "unicorn_leaves_your_stable"
): void {
    const cards = [...G.stable[playerID], ...G.upgradeDowngradeStable[playerID]]
        .map(c => G.deck[c])
        .filter(s => s.on?.some(o => o.trigger === trigger));

    cards.forEach(card => {
        // all unicorns are basic — trigger no effect
        if (isCardBasicDueToEffect(G.playerEffects[playerID], card)) return;

        const on = card.on!.find(o => o.trigger === trigger)!;
        if (on.do.type === "inject_action") {
            const newAction: Action = {
                type: "action",
                instructions: [{
                    id: _.uniqueId(),
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

type ParamLeave = {
    playerID: PlayerID;
    cardID: CardID;
}

export function leave(G: UnstableUnicornsGame, ctx: Ctx, param: ParamLeave) {
    G.stable[param.playerID] = _.without(G.stable[param.playerID], param.cardID);
    G.upgradeDowngradeStable[param.playerID] = _.without(G.upgradeDowngradeStable[param.playerID], param.cardID);

    // remove player effect
    G.playerEffects[param.playerID] = _.filter(G.playerEffects[param.playerID], eff => eff.cardID !== param.cardID);

    // unicorn_leaves_your_stable is unicorn-specific by game semantics
    if (!isUnicorn(G.deck[param.cardID])) return;
    fireReactiveStableTrigger(G, param.playerID, "unicorn_leaves_your_stable");
    autoFizzleUnsatisfiable(G, ctx);
}

type ParamEnter = {
    playerID: PlayerID;
    cardID: CardID;
}

export function enter(G: UnstableUnicornsGame, ctx: Ctx, param: ParamEnter) {
    const card = G.deck[param.cardID];

    if (hasType(card, "upgrade") || hasType(card, "downgrade")) {
        G.upgradeDowngradeStable[param.playerID] = [...G.upgradeDowngradeStable[param.playerID], param.cardID];
    } else if (hasType(card, "magic")) {
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
                    return hasType(card, "downgrade");
                });

                toBeRemoved.forEach(cid => {
                    leave(G, ctx, { playerID: param.playerID, cardID: cid });
                });
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

    // unicorn_enters_your_stable is unicorn-specific by game semantics
    if (isUnicorn(card)) {
        fireReactiveStableTrigger(G, param.playerID, "unicorn_enters_your_stable");
    }

    autoFizzleUnsatisfiable(G, ctx);
}

export function canEnter(G: UnstableUnicornsGame, ctx: Ctx, param: ParamEnter) {
    if (hasType(G.deck[param.cardID], "neigh") || hasType(G.deck[param.cardID], "super_neigh")) {
        return false;
    }

    if (G.stable[param.playerID].length === CONSTANTS.stableSeats) {
        return false;
    }

    const card = G.deck[param.cardID];

    if (hasType(card, "basic")) {
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
