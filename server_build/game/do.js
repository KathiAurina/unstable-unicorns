"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enter = enter;
exports.canEnter = canEnter;
exports.executeDo = executeDo;
exports.findStealTargets = findStealTargets;
exports.findPullRandomTargets = findPullRandomTargets;
exports.pull = pull;
exports.discard = discard;
exports.canDiscard = canDiscard;
exports.findDiscardTargets = findDiscardTargets;
exports.destroy = destroy;
exports.findDestroyTargets = findDestroyTargets;
exports.findSacrificeTargets = findSacrificeTargets;
exports.findSearchTargets = findSearchTargets;
exports.findReviveTarget = findReviveTarget;
exports.findAddFromDiscardPileToHand = findAddFromDiscardPileToHand;
exports.findReturnToHandTargets = findReturnToHandTargets;
exports.findBringToStableTargets = findBringToStableTargets;
exports.canBringToStableTargets = canBringToStableTargets;
exports.findSwapHandsTargets = findSwapHandsTargets;
exports.findMoveTargets = findMoveTargets;
exports.findMoveTargets2 = findMoveTargets2;
exports.findBackKickTargets = findBackKickTargets;
exports.findUnicornSwap1Targets = findUnicornSwap1Targets;
exports.findUnicornSwap2Targets = findUnicornSwap2Targets;
exports.findMakeSomeoneDiscardTarget = findMakeSomeoneDiscardTarget;
const card_1 = require("./card");
const game_1 = require("./game");
const effect_1 = require("./effect");
const underscore_1 = __importDefault(require("underscore"));
const constants_1 = require("./constants");
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
function leave(G, ctx, param) {
    G.stable[param.playerID] = underscore_1.default.without(G.stable[param.playerID], param.cardID);
    G.upgradeDowngradeStable[param.playerID] = underscore_1.default.without(G.upgradeDowngradeStable[param.playerID], param.cardID);
    // remove player effect
    G.playerEffects[param.playerID] = underscore_1.default.filter(G.playerEffects[param.playerID], eff => eff.cardID !== param.cardID);
    // when another unicorn enters your stable
    // inject action after the current action
    const on = [...G.stable[param.playerID], ...G.upgradeDowngradeStable[param.playerID]].map(c => G.deck[c]).filter(s => s.on && s.on.filter(o => o.trigger === "unicorn_leaves_your_stable").length > 0);
    on.forEach(card => {
        // all unicorns are basic — trigger no effect
        if ((0, effect_1.isCardBasicDueToEffect)(G.playerEffects[param.playerID], card))
            return;
        const on = card.on?.find(o => o.trigger === "unicorn_leaves_your_stable");
        if (on.do.type === "inject_action") {
            const newAction = {
                type: "action",
                instructions: [{
                        id: underscore_1.default.uniqueId(),
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
function enter(G, ctx, param) {
    const card = G.deck[param.cardID];
    if (card.type === "upgrade" || card.type === "downgrade") {
        G.upgradeDowngradeStable[param.playerID] = [...G.upgradeDowngradeStable[param.playerID], param.cardID];
    }
    else if (card.type === "magic") {
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
        (0, game_1._addSceneFromDo)(G, ctx, param.cardID, param.playerID, "enter");
        cardOnEnter.filter(on => on.do.type === "auto").forEach(on => {
            if (on.do.type === "auto" && on.do.info.key === "sacrifice_all_downgrades") {
                const toBeRemoved = underscore_1.default.filter(G.upgradeDowngradeStable[param.playerID], c => {
                    const card = G.deck[c];
                    return card.type === "downgrade";
                });
                G.upgradeDowngradeStable[param.playerID] = underscore_1.default.difference(G.upgradeDowngradeStable[param.playerID], toBeRemoved);
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
    // when another unicorn enters your stable
    // inject action after the current action
    const on = [...G.stable[param.playerID], ...G.upgradeDowngradeStable[param.playerID]].map(c => G.deck[c]).filter(s => s.on && s.on.filter(o => o.trigger === "unicorn_enters_your_stable").length > 0);
    on.forEach(card => {
        // all unicorns are basic — trigger no effect
        if ((0, effect_1.isCardBasicDueToEffect)(G.playerEffects[param.playerID], card))
            return;
        const on = card.on?.find(o => o.trigger === "unicorn_enters_your_stable");
        if (on.do.type === "inject_action") {
            const newAction = {
                type: "action",
                instructions: [{
                        id: underscore_1.default.uniqueId(),
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
function canEnter(G, ctx, param) {
    if (G.deck[param.cardID].type === "neigh" || G.deck[param.cardID].type === "super_neigh") {
        return false;
    }
    if (G.stable[param.playerID].length === constants_1.CONSTANTS.stableSeats) {
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
function executeDo(G, ctx, instructionID, param) {
    const { scene, action, instruction } = (0, game_1._findInstruction)(G, instructionID);
    if (scene.endTurnImmediately) {
        G.mustEndTurnImmediately = true;
    }
    instruction.state = "in_progress";
    // ui sound
    G.uiExecuteDo = { id: underscore_1.default.uniqueId(), cardID: instruction.ui.info?.source, do: instruction.do };
    // execute instruction
    if (instruction.do.key === "destroy") {
        const paramDestroy = param;
        const targetPlayer = findOwnerOfCard(G, paramDestroy.cardID);
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
        discard(G, ctx, param);
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
function steal(G, ctx, param) {
    leave(G, ctx, { playerID: findOwnerOfCard(G, param.cardID), cardID: param.cardID });
    enter(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
}
function findStealTargets(G, ctx, protagonist, info) {
    let targets = [];
    switch (info.type) {
        case "unicorn": {
            G.players.forEach(pl => {
                if (pl.id === protagonist) {
                    return;
                }
                ;
                G.stable[pl.id].forEach(c => {
                    if (info.unicornSwap === true) {
                        if (pl.id !== G.clipboard.unicornSwap?.targetPlayer) {
                            return;
                        }
                    }
                    if (canEnter(G, ctx, { playerID: protagonist, cardID: c })) {
                        targets.push({ playerID: pl.id, cardID: c });
                    }
                });
            });
            break;
        }
        case "upgrade": {
            G.players.forEach(pl => {
                if (pl.id === protagonist) {
                    return;
                }
                ;
                G.upgradeDowngradeStable[pl.id].forEach(c => {
                    if (canEnter(G, ctx, { playerID: protagonist, cardID: c })) {
                        targets.push({ playerID: pl.id, cardID: c });
                    }
                });
            });
            break;
        }
    }
    return targets;
}
function pullRandom(G, ctx, param) {
    pull(G, ctx, {
        protagonist: param.protagonist,
        from: param.playerID,
        handIndex: underscore_1.default.random(0, G.hand[param.playerID].length - 1)
    });
}
function findPullRandomTargets(G, ctx, protagonist) {
    return findPullTargets(G, ctx, protagonist);
}
function pull(G, ctx, param) {
    const cardToPull = G.hand[param.from][param.handIndex];
    G.hand[param.from] = underscore_1.default.without(G.hand[param.from], cardToPull);
    G.hand[param.protagonist] = [...G.hand[param.protagonist], cardToPull];
}
function findPullTargets(G, ctx, protagonist) {
    let targets = [];
    G.players.forEach(pl => {
        if (G.hand[pl.id].length > 0 && pl.id !== protagonist) {
            targets.push({ playerID: pl.id });
        }
    });
    return targets;
}
function discard(G, ctx, param) {
    G.hand[param.protagonist] = underscore_1.default.without(G.hand[param.protagonist], param.cardID);
    G.discardPile = [...G.discardPile, param.cardID];
}
function canDiscard(G, ctx, protagonist, info) {
    return findDiscardTargets(G, ctx, protagonist, info).length >= info.count;
}
function findDiscardTargets(G, ctx, protagonist, info) {
    let targets = [];
    G.hand[protagonist].forEach((cid, index) => {
        if (info.type === "any") {
            targets.push({ handIndex: index });
        }
        else if (info.type === "unicorn") {
            const card = G.deck[cid];
            if ((0, card_1.isUnicorn)(card)) {
                targets.push({ handIndex: index });
            }
        }
    });
    return targets;
}
function destroy(G, ctx, param) {
    const card = G.deck[param.cardID];
    const targetPlayer = findOwnerOfCard(G, param.cardID);
    leave(G, ctx, { playerID: targetPlayer, cardID: param.cardID });
    if (card.type === "baby") {
        G.nursery.push(param.cardID);
    }
    else {
        G.discardPile.push(param.cardID);
    }
    const ons = card.on?.filter(on => on.trigger === "this_destroyed_or_sacrificed");
    ons?.forEach(on => {
        // all unicorns are basic — trigger no effect
        if ((0, effect_1.isCardBasicDueToEffect)(G.playerEffects[targetPlayer], card))
            return;
        if (on.do.type === "return_to_hand") {
            G.discardPile = underscore_1.default.without(G.discardPile, param.cardID);
            G.hand[targetPlayer] = [...G.hand[targetPlayer], param.cardID];
        }
        else if (on.do.type === "add_scene") {
            (0, game_1._addSceneFromDo)(G, ctx, card.id, targetPlayer, "any");
        }
    });
}
// source: card which caused the destroy action
function canDestroy(G, ctx, protagonist, info, source) {
    return findDestroyTargets(G, ctx, protagonist, info, source).length > 0;
}
function findDestroyTargets(G, ctx, protagonist, info, sourceCard) {
    let targets = [];
    G.players.forEach(pl => {
        // special case
        // this is actually a combination of sacrifice and destroy
        if (info.type === "my_downgrade_other_upgrade") {
            G.upgradeDowngradeStable[pl.id].forEach(cid => {
                const card = G.deck[cid];
                if (pl.id === protagonist && card.type === "downgrade") {
                    targets.push({ playerID: pl.id, cardID: cid });
                }
                else if (pl.id !== protagonist && card.type === "upgrade") {
                    targets.push({ playerID: pl.id, cardID: cid });
                }
            });
        }
        if (pl.id === protagonist) {
            return;
        }
        if (info.type === "unicorn") {
            G.stable[pl.id].forEach(cid => {
                const card = G.deck[cid];
                if ((0, card_1.isUnicorn)(card)) {
                    if (sourceCard && G.deck[sourceCard].type === "magic" && card.passive?.includes("cannot_be_destroyed_by_magic")) {
                        return;
                    }
                    if (G.playerEffects[pl.id].find(s => s.effect.key === "your_unicorns_cannot_be_destroyed")) {
                        return;
                    }
                    if (G.playerEffects[pl.id].find(s => s.effect.key === "pandamonium")) {
                        return;
                    }
                    targets.push({ playerID: pl.id, cardID: cid });
                }
            });
        }
        else if (info.type === "upgrade") {
            G.upgradeDowngradeStable[pl.id].forEach(cid => {
                const card = G.deck[cid];
                if (card.type === "upgrade") {
                    targets.push({ playerID: pl.id, cardID: cid });
                }
            });
        }
        else if (info.type === "any") {
            G.stable[pl.id].forEach(cid => {
                const card = G.deck[cid];
                if ((0, card_1.isUnicorn)(card)) {
                    if (sourceCard && G.deck[sourceCard].type === "magic" && card.passive?.includes("cannot_be_destroyed_by_magic")) {
                        return;
                    }
                    if (G.playerEffects[pl.id].find(s => s.effect.key === "your_unicorns_cannot_be_destroyed")) {
                        return;
                    }
                    targets.push({ playerID: pl.id, cardID: cid });
                }
            });
            G.upgradeDowngradeStable[pl.id].forEach(cid => {
                targets.push({ playerID: pl.id, cardID: cid });
            });
        }
    });
    return targets;
}
function sacrifice(G, ctx, param) {
    const card = G.deck[param.cardID];
    leave(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
    if (card.type === "baby") {
        G.nursery.push(param.cardID);
    }
    else {
        G.discardPile.push(param.cardID);
    }
    const ons = card.on?.filter(on => on.trigger === "this_destroyed_or_sacrificed");
    ons?.forEach(on => {
        // all unicorns are basic — trigger no effect
        if ((0, effect_1.isCardBasicDueToEffect)(G.playerEffects[param.protagonist], card))
            return;
        if (on.do.type === "return_to_hand") {
            G.discardPile = underscore_1.default.without(G.discardPile, param.cardID);
            G.hand[param.protagonist] = [...G.hand[param.protagonist], param.cardID];
        }
        else if (on.do.type === "add_scene") {
            (0, game_1._addSceneFromDo)(G, ctx, card.id, param.protagonist, "any");
        }
    });
}
function findSacrificeTargets(G, ctx, protagonist, info) {
    let targets = [];
    if (info.type === "downgrade") {
        G.upgradeDowngradeStable[protagonist].forEach(c => {
            const card = G.deck[c];
            if (card.type === "downgrade") {
                targets.push({ cardID: c });
            }
        });
    }
    if (info.type === "unicorn") {
        G.stable[protagonist].forEach(c => {
            const card = G.deck[c];
            if ((0, card_1.isUnicorn)(card)) {
                if (G.playerEffects[protagonist].find(s => s.effect.key === "pandamonium") === undefined) {
                    targets.push({ cardID: c });
                }
            }
        });
    }
    if (info.type === "any") {
        targets = G.stable[protagonist].map(c => ({ cardID: c }));
    }
    return targets;
}
function search(G, ctx, param) {
    G.drawPile = underscore_1.default.shuffle(underscore_1.default.without(G.drawPile, param.cardID));
    G.hand[param.protagonist] = [...G.hand[param.protagonist], param.cardID];
}
function findSearchTargets(G, ctx, protagonist, info) {
    let targets = [];
    if (info.type === "any") {
        targets = G.drawPile.map(c => ({ cardID: c }));
    }
    if (info.type === "downgrade") {
        targets = G.drawPile.map(c => G.deck[c]).filter(c => c.type === "downgrade").map(c => ({ cardID: c.id }));
    }
    if (info.type === "narwhal") {
        targets = G.drawPile.map(c => G.deck[c]).filter(c => c.type === "narwhal").map(c => ({ cardID: c.id }));
    }
    if (info.type === "unicorn") {
        targets = G.drawPile.map(c => G.deck[c]).filter(c => (0, card_1.isUnicorn)(c)).map(c => ({ cardID: c.id }));
    }
    if (info.type === "upgrade") {
        targets = G.drawPile.map(c => G.deck[c]).filter(c => c.type === "upgrade").map(c => ({ cardID: c.id }));
    }
    return targets;
}
function revive(G, ctx, param) {
    G.discardPile = underscore_1.default.without(G.discardPile, param.cardID);
    enter(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
}
function findReviveTarget(G, ctx, protagonist, info) {
    let targets = [];
    if (info.type === "unicorn") {
        targets = G.discardPile.filter(c => {
            const card = G.deck[c];
            return (0, card_1.isUnicorn)(card) && canEnter(G, ctx, { playerID: protagonist, cardID: c });
        }).map(c => ({ cardID: c }));
    }
    if (info.type === "basic_unicorn") {
        targets = G.discardPile.filter(c => {
            const card = G.deck[c];
            return canEnter(G, ctx, { playerID: protagonist, cardID: c }) && card.type === "basic";
        }).map(c => ({ cardID: c }));
    }
    return targets;
}
function draw(G, ctx, param) {
    const toDraw = underscore_1.default.first(G.drawPile, param.count);
    G.drawPile = underscore_1.default.rest(G.drawPile, param.count);
    G.hand[param.protagonist] = [...G.hand[param.protagonist], ...toDraw];
}
function canDraw(G, ctx, param) {
    return G.drawPile.length >= param.count;
}
function addFromDiscardPileToHand(G, ctx, param) {
    G.discardPile = underscore_1.default.without(G.discardPile, param.cardID);
    G.hand[param.protagonist].push(param.cardID);
}
function findAddFromDiscardPileToHand(G, ctx, protagonist, info) {
    let targets = [];
    if (info.type === "magic" || info.type === "neigh") {
        targets = G.discardPile.map(c => G.deck[c]).filter(c => c.type === info.type).map(c => ({ cardID: c.id }));
    }
    if (info.type === "unicorn") {
        targets = G.discardPile.map(c => G.deck[c]).filter(c => (0, card_1.isUnicorn)(c)).map(c => ({ cardID: c.id }));
    }
    return targets;
}
function reviveFromNursery(G, ctx, param) {
    G.nursery = underscore_1.default.without(G.nursery, param.cardID);
    enter(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
}
function returnToHand(G, ctx, param) {
    const card = G.deck[param.cardID];
    const playerID = findOwnerOfCard(G, param.cardID);
    leave(G, ctx, { playerID: playerID, cardID: param.cardID });
    if (card.type === "baby") {
        G.nursery.push(param.cardID);
    }
    else {
        G.hand[playerID].push(param.cardID);
    }
}
function findReturnToHandTargets(G, ctx, protagonist, info) {
    let targets = [];
    if (info.who === "another") {
        G.players.filter(pl => pl.id !== protagonist).forEach(pl => {
            targets = [...targets, ...G.stable[pl.id].map(c => ({ playerID: pl.id, cardID: c }))];
            targets = [...targets, ...G.upgradeDowngradeStable[pl.id].map(c => ({ playerID: pl.id, cardID: c }))];
        });
    }
    return targets;
}
function bringToStable(G, ctx, param) {
    enter(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
    G.hand[param.protagonist] = underscore_1.default.without(G.hand[param.protagonist], param.cardID);
}
function findBringToStableTargets(G, ctx, protagonist, info) {
    let targets = [];
    if (info.type === "basic_unicorn") {
        targets = G.hand[protagonist].map(c => G.deck[c]).filter(c => c.type === "basic" && canEnter(G, ctx, { cardID: c.id, playerID: protagonist })).map(c => ({ cardID: c.id }));
    }
    return targets;
}
function canBringToStableTargets(G, ctx, protagonist, info) {
    return findBringToStableTargets(G, ctx, protagonist, info).length > 0;
}
function swapHands(G, ctx, param) {
    const myHand = G.hand[param.protagonist];
    G.hand[param.protagonist] = G.hand[param.playerID];
    G.hand[param.playerID] = myHand;
}
function findSwapHandsTargets(G, ctx, protagonist) {
    let targets = [];
    targets = G.players.map(pl => pl.id).filter(plid => plid !== protagonist).map(d => ({ playerID: d }));
    return targets;
}
function shakeUp(G, ctx, param) {
    G.drawPile = underscore_1.default.shuffle([...G.drawPile, param.sourceCardID, ...G.hand[param.protagonist], ...G.discardPile]);
    G.discardPile = [];
    G.hand[param.protagonist] = underscore_1.default.first(G.drawPile, 5);
    G.drawPile = underscore_1.default.rest(G.drawPile, 5);
}
function reset(G, ctx, param) {
    G.players.forEach(pl => {
        G.upgradeDowngradeStable[pl.id].forEach(cardID => {
            sacrifice(G, ctx, { protagonist: pl.id, cardID });
        });
    });
    G.drawPile = underscore_1.default.shuffle([...G.drawPile, ...G.discardPile]);
}
function move(G, ctx, param) {
    const from = findOwnerOfCard(G, param.cardID);
    leave(G, ctx, { playerID: from, cardID: param.cardID });
    G.clipboard["move"] = { cardID: param.cardID, from: from };
}
function findMoveTargets(G, ctx, protagonist, info) {
    let targets = [];
    G.players.forEach(pl => {
        targets = [...targets, ...G.upgradeDowngradeStable[pl.id].map(c => ({ cardID: c, playerID: pl.id }))];
    });
    return targets;
}
function move2(G, ctx, param) {
    enter(G, ctx, { playerID: param.playerID, cardID: G.clipboard.move.cardID });
}
// to fix
// a protagonist cannot move a card into his own stable
function findMoveTargets2(G, ctx, protagonist) {
    let targets = [];
    G.players.forEach(pl => {
        if (pl.id !== G.clipboard.move.from && pl.id !== protagonist) {
            targets.push({ playerID: pl.id });
        }
    });
    return targets;
}
function shuffleDiscardPileIntoDrawPile(G, ctx, _param) {
    G.drawPile = underscore_1.default.shuffle([...G.drawPile, ...G.discardPile]);
    G.discardPile = [];
}
function backKick(G, ctx, param) {
    const owner = findOwnerOfCard(G, param.cardID);
    returnToHand(G, ctx, { cardID: param.cardID, protagonist: param.protagonist });
    makeSomeoneDiscard(G, ctx, { protagonist: param.protagonist, playerID: owner });
}
function findBackKickTargets(G, ctx, protagonist) {
    let targets = [];
    G.players.forEach(pl => {
        if (pl.id === protagonist) {
            return;
        }
        [...G.stable[pl.id], ...G.upgradeDowngradeStable[pl.id]].forEach(c => {
            targets.push({ cardID: c });
        });
    });
    return targets;
}
function unicornSwap1(G, ctx, param) {
    leave(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
    G.clipboard.unicornSwap = { cardIDToMove: param.cardID };
}
function findUnicornSwap1Targets(G, ctx, protagonist) {
    let targets = [];
    G.stable[protagonist].forEach(c => {
        const card = G.deck[c];
        if ((0, card_1.isUnicorn)(card)) {
            if (G.playerEffects[protagonist].find(s => s.effect.key === "pandamonium") === undefined) {
                targets.push({ cardID: c });
            }
        }
    });
    return targets;
}
function unicornSwap2(G, ctx, param) {
    // unicornSwap1 always runs before unicornSwap2, guaranteeing clipboardID is set
    enter(G, ctx, { playerID: param.playerID, cardID: G.clipboard.unicornSwap.cardIDToMove });
    G.clipboard.unicornSwap = { targetPlayer: param.playerID };
}
function findUnicornSwap2Targets(G, ctx, protagonist) {
    let targets = [];
    G.players.forEach(p => {
        if (p.id === protagonist) {
            return;
        }
        targets.push({ playerID: p.id });
    });
    return targets;
}
function blatantThievery1(G, ctx, param) {
    pull(G, ctx, { protagonist: param.protagonist, handIndex: param.handIndex, from: param.from });
}
function makeSomeoneDiscard(G, ctx, param) {
    G.script.scenes.push({
        id: underscore_1.default.uniqueId(),
        mandatory: true,
        actions: [{
                type: "action",
                instructions: [{
                        id: underscore_1.default.uniqueId(),
                        protagonist: param.playerID,
                        state: "open",
                        ui: {
                            type: "click_on_own_card_in_hand"
                        },
                        do: {
                            key: "discard",
                            info: { count: 1, type: "any" }
                        }
                    }]
            }],
        endTurnImmediately: false,
    });
}
function findMakeSomeoneDiscardTarget(G, ctx, protagonist) {
    return G.players.filter(pl => pl.id !== protagonist && canDiscard(G, ctx, pl.id, { count: 1, type: "any" })).map(pl => ({ playerID: pl.id }));
}
/////////////////////////////////////////////////
// KeyToFunc is a runtime dispatch table keyed on Do.key.
// The param type is intentionally loose — callers (executeDo) cast before passing.
// The public move APIs (steal, destroy, etc.) are each fully typed above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const KeyToFunc = {
    steal, pull, pullRandom, discard, destroy, sacrifice, search, revive, draw, addFromDiscardPileToHand, reviveFromNursery, returnToHand, bringToStable, makeSomeoneDiscard, swapHands, shakeUp, move, move2, reset, shuffleDiscardPileIntoDrawPile, backKick, unicornSwap1, unicornSwap2, blatantThievery1,
};
/////////////////////////////////////////////////
//
// Helper
//
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
function findOwnerOfCard(G, cardID) {
    let playerID = null;
    G.players.forEach(pl => {
        if ([...G.stable[pl.id], ...G.upgradeDowngradeStable[pl.id]].findIndex(c => c === cardID) > -1) {
            playerID = pl.id;
        }
    });
    return playerID;
}
