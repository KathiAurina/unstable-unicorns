"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._findInstruction = exports._findInProgressScenesWithProtagonist = exports._findOpenScenesWithProtagonist = exports._addSceneFromDo = exports.canDraw = exports.canPlayCard = void 0;
const do_1 = require("./do");
const card_1 = require("./card");
const constants_1 = require("./constants");
const do_2 = require("./do");
const underscore_1 = __importDefault(require("underscore"));
const UnstableUnicorns = {
    name: "unstable_unicorns",
    setup: (ctx, setupData) => {
        const players = Array.from({ length: ctx.numPlayers }, (val, idx) => {
            return {
                id: `${idx}`,
                name: `Spieler ${idx}`,
            };
        });
        const deck = (0, card_1.initializeDeck)();
        const discardPile = [];
        let nursery = [];
        let drawPile = underscore_1.default.shuffle(deck).filter(c => c.type !== "baby").map(c => c.id);
        let hand = {};
        let stable = {};
        let temporaryStable = {};
        let upgradeDowngradeStable = {};
        let playerEffects = {};
        let ready = {};
        players.forEach(pl => {
            ready[pl.id] = false;
            hand[pl.id] = underscore_1.default.first(drawPile, constants_1.CONSTANTS.numberOfHandCardsAtStart);
            drawPile = underscore_1.default.rest(drawPile, constants_1.CONSTANTS.numberOfHandCardsAtStart);
            stable[pl.id] = [];
            temporaryStable[pl.id] = [];
            upgradeDowngradeStable[pl.id] = [];
            playerEffects[pl.id] = [];
        });
        return {
            players,
            deck,
            drawPile,
            nursery,
            discardPile,
            hand,
            stable,
            temporaryStable,
            upgradeDowngradeStable,
            script: { scenes: [] },
            playerEffects,
            mustEndTurnImmediately: false,
            countPlayedCardsInActionPhase: 0,
            clipboard: {},
            endGame: false,
            babyStarter: [],
            ready,
            uiHoverHandIndex: undefined,
            uiExecuteDo: undefined,
            uiCardToCard: undefined,
            lastNeighResult: undefined,
        };
    },
    phases: {
        pregame: {
            start: true,
            onBegin: (G, ctx) => {
                var _a;
                (_a = ctx.events) === null || _a === void 0 ? void 0 : _a.setActivePlayers({ all: "pregame" });
            }
        },
        main: {
            //start: true,
            onBegin: (G, ctx) => {
            }
        }
    },
    turn: {
        onBegin: (G, ctx) => {
            var _a, _b;
            if (ctx.phase === "pregame") {
                return;
            }
            // this is run whenever a new player starts its turn
            // perfect for placing players in a stage
            if (G.drawPile.length > 0) {
                G.script = { scenes: [] };
                G.countPlayedCardsInActionPhase = 0;
                G.mustEndTurnImmediately = false;
                // begin of turn: add scene
                [...G.stable[ctx.currentPlayer], ...G.upgradeDowngradeStable[ctx.currentPlayer]].forEach(c => _addSceneFromDo(G, ctx, c, ctx.currentPlayer, "begin_of_turn"));
                // begin of turn: add effect
                [...G.stable[ctx.currentPlayer], ...G.upgradeDowngradeStable[ctx.currentPlayer]].forEach(c => {
                    var _a;
                    const card = G.deck[c];
                    const cardOnBegin = (_a = card.on) === null || _a === void 0 ? void 0 : _a.filter(c => c.trigger === "begin_of_turn");
                    // all unicorns are basic
                    // trigger no effect
                    if (G.playerEffects[ctx.currentPlayer].find(s => s.effect.key === "my_unicorns_are_basic")) {
                        if (G.playerEffects[ctx.currentPlayer].find(s => s.effect.key === "pandamonium") === undefined) {
                            if (card.type === "narwhal" || card.type === "unicorn") {
                                return;
                            }
                        }
                    }
                    if (cardOnBegin) {
                        cardOnBegin.filter(on => on.do.type === "add_effect").forEach(on => {
                            const doAddEffect = on.do;
                            // check if effect has already been added
                            if (G.playerEffects[ctx.currentPlayer].filter(s => s.cardID === c).length === 0) {
                                G.playerEffects[ctx.currentPlayer] = [...G.playerEffects[ctx.currentPlayer], { cardID: c, effect: doAddEffect.info }];
                            }
                        });
                    }
                });
                (_a = ctx.events) === null || _a === void 0 ? void 0 : _a.setActivePlayers({ all: "beginning" });
            }
            else {
                // no cards to draw
                // need to end the game
                (_b = ctx.events) === null || _b === void 0 ? void 0 : _b.setPhase("end");
            }
        },
        stages: {
            pregame: {
                moves: { ready, selectBaby, changeName }
            },
            beginning: {
                moves: { drawAndAdvance, executeDo: do_2.executeDo, end, commit, skipExecuteDo, setUIHoverHandIndex, setUICardToCard }
            },
            action_phase: {
                moves: {
                    commit, executeDo: do_2.executeDo, end, drawAndEnd, playCard, playUpgradeDowngradeCard, playNeigh, playSuperNeigh, dontPlayNeigh, skipExecuteDo, setUIHoverHandIndex, setUICardToCard
                }
            }
        }
    }
};
function initializeGame(G, ctx) {
    let a = [];
    for (let i = 0; i < 13; i++) {
        a.push(i);
    }
    G.babyStarter.forEach(({ cardID, owner }) => {
        G.stable[owner].push(cardID);
        a = underscore_1.default.without(a, cardID);
    });
    a.forEach(cardId => {
        G.nursery.push(cardId);
    });
}
function changeName(G, ctx, protagonist, name) {
    G.players[parseInt(protagonist)].name = name;
}
function ready(G, ctx, protagonist) {
    var _a;
    G.ready[protagonist] = true;
    if (underscore_1.default.every(underscore_1.default.values(G.ready), bo => bo)) {
        initializeGame(G, ctx);
        (_a = ctx.events) === null || _a === void 0 ? void 0 : _a.setPhase("main");
    }
}
function selectBaby(G, ctx, protagonist, cardID) {
    G.babyStarter.push({
        cardID, owner: protagonist
    });
}
function drawAndAdvance(G, ctx) {
    var _a;
    G.hand[ctx.currentPlayer].push(underscore_1.default.first(G.drawPile));
    G.drawPile = underscore_1.default.rest(G.drawPile, 1);
    (_a = ctx.events) === null || _a === void 0 ? void 0 : _a.setActivePlayers({ all: "action_phase" });
    G.script = { scenes: [] };
}
function canPlayCard(G, ctx, protagonist, cardID) {
    if (ctx.currentPlayer === protagonist && ctx.activePlayers[protagonist] === "action_phase" && (G.countPlayedCardsInActionPhase === 0 || (G.countPlayedCardsInActionPhase === 1 && G.playerEffects[protagonist].find(c => c.effect.key === "double_dutch")))) {
        return (0, do_1.canEnter)(G, ctx, { playerID: protagonist, cardID });
    }
    return false;
}
exports.canPlayCard = canPlayCard;
function playCard(G, ctx, protagonist, cardID) {
    G.countPlayedCardsInActionPhase = G.countPlayedCardsInActionPhase + 1;
    G.hand[protagonist] = underscore_1.default.without(G.hand[protagonist], cardID);
    if (G.playerEffects[protagonist].findIndex(f => f.effect.key === "your_cards_cannot_be_neighed") > -1) {
        (0, do_1.enter)(G, ctx, { playerID: protagonist, cardID });
    }
    else {
        // resolve neigh
        G.neighDiscussion = {
            cardID, protagonist, rounds: [{
                    state: "open",
                    playerState: Object.fromEntries(G.players.map(pl => ([pl.id, { vote: pl.id === protagonist ? "no_neigh" : "undecided" }])))
                }],
            target: protagonist,
        };
    }
}
function playUpgradeDowngradeCard(G, ctx, protagonist, targetPlayer, cardID) {
    G.countPlayedCardsInActionPhase = G.countPlayedCardsInActionPhase + 1;
    G.hand[protagonist] = underscore_1.default.without(G.hand[protagonist], cardID);
    if (G.playerEffects[protagonist].findIndex(f => f.effect.key === "your_cards_cannot_be_neighed") > -1) {
        (0, do_1.enter)(G, ctx, { playerID: targetPlayer, cardID });
    }
    else {
        // resolve neigh
        G.neighDiscussion = {
            cardID, protagonist, rounds: [{
                    state: "open",
                    playerState: Object.fromEntries(G.players.map(pl => ([pl.id, { vote: pl.id === protagonist ? "no_neigh" : "undecided" }]))),
                }],
            target: targetPlayer,
        };
    }
}
function playNeigh(G, ctx, cardID, protagonist, roundIndex) {
    if (G.neighDiscussion) {
        G.hand[protagonist] = underscore_1.default.without(G.hand[protagonist], cardID);
        G.discardPile = [...G.discardPile, cardID];
        const round = G.neighDiscussion.rounds[roundIndex];
        // check if there was already a neigh vote during this round
        // if yes do nothing
        if (round.state !== "open") {
            return;
        }
        // there was no neigh round yet
        // hence neigh the round and add a next round
        round.playerState[protagonist] = { vote: "neigh" };
        round.state = "neigh";
        G.neighDiscussion.rounds.push({
            state: "open",
            playerState: Object.fromEntries(G.players.map(pl => ([pl.id, { vote: pl.id === protagonist ? "no_neigh" : "undecided" }])))
        });
    }
}
function playSuperNeigh(G, ctx, cardID, protagonist, roundIndex) {
    if (G.neighDiscussion) {
        G.hand[protagonist] = underscore_1.default.without(G.hand[protagonist], cardID);
        G.discardPile = [...G.discardPile, cardID];
        const round = G.neighDiscussion.rounds[roundIndex];
        // check if there was already a neigh vote during this round
        // if yes do nothing
        if (round.state !== "open") {
            return;
        }
        // there was no neigh round yet
        // hence neigh the round and add a next round
        round.playerState[protagonist] = { vote: "neigh" };
        round.state = "neigh";
        const cardWasNeighed = (G.neighDiscussion.rounds.length + 1) % 2 === 0;
        if (cardWasNeighed) {
            G.discardPile.push(G.neighDiscussion.cardID);
            G.lastNeighResult = { id: underscore_1.default.uniqueId(), result: "cardWasNeighed" };
        }
        else {
            (0, do_1.enter)(G, ctx, { playerID: G.neighDiscussion.protagonist, cardID: G.neighDiscussion.cardID });
            G.lastNeighResult = { id: underscore_1.default.uniqueId(), result: "cardWasPlayed" };
        }
        G.neighDiscussion = undefined;
    }
}
function dontPlayNeigh(G, ctx, protagonist, roundIndex) {
    // end
    if (G.neighDiscussion) {
        const round = G.neighDiscussion.rounds[roundIndex];
        round.playerState[protagonist] = { vote: "no_neigh" };
        if (underscore_1.default.findKey(round.playerState, val => val.vote === "undecided") === undefined) {
            // everyone has voted => advance the game
            const cardWasNeighed = G.neighDiscussion.rounds.length % 2 === 0;
            if (cardWasNeighed) {
                G.discardPile.push(G.neighDiscussion.cardID);
                G.lastNeighResult = { id: underscore_1.default.uniqueId(), result: "cardWasNeighed" };
            }
            else {
                (0, do_1.enter)(G, ctx, { playerID: G.neighDiscussion.target, cardID: G.neighDiscussion.cardID });
                G.lastNeighResult = { id: underscore_1.default.uniqueId(), result: "cardWasPlayed" };
            }
            G.neighDiscussion = undefined;
        }
    }
}
function canDraw(G, ctx) {
    if (G.mustEndTurnImmediately === true) {
        return false;
    }
    if (ctx.activePlayers[ctx.currentPlayer] === "beginning") {
        // if there is a mandatory scene => one cannot draw
        if (_findOpenScenesWithProtagonist(G, ctx.currentPlayer).find(([instr, sc]) => sc.mandatory === true)) {
            return false;
        }
        // if there is an ongoing scene => one cannot draw
        if (_findInProgressScenesWithProtagonist(G, ctx.currentPlayer).length > 0) {
            return false;
        }
        return true;
    }
    if (ctx.activePlayers[ctx.currentPlayer] === "action_phase") {
        return G.countPlayedCardsInActionPhase === 0;
    }
    return false;
}
exports.canDraw = canDraw;
function drawAndEnd(G, ctx) {
    G.script = { scenes: [] };
    G.hand[ctx.currentPlayer].push(underscore_1.default.first(G.drawPile));
    G.drawPile = underscore_1.default.rest(G.drawPile, 1);
    G.countPlayedCardsInActionPhase = G.countPlayedCardsInActionPhase + 1;
}
function end(G, ctx, protagonist) {
    var _a, _b;
    if (G.playerEffects[protagonist].find(o => o.effect.key === "change_of_luck")) {
        G.playerEffects[protagonist] = G.playerEffects[protagonist].filter(o => o.effect.key !== "change_of_luck");
        if (G.hand[protagonist].length > 7) {
            const newScene = {
                id: underscore_1.default.uniqueId(),
                mandatory: true,
                endTurnImmediately: false,
                actions: [{
                        type: "action",
                        instructions: [{
                                id: underscore_1.default.uniqueId(),
                                protagonist,
                                state: "open",
                                do: {
                                    key: "discard",
                                    info: { count: G.hand[protagonist].length - 7, type: "any" }
                                },
                                ui: { type: "click_on_own_card_in_hand" }
                            }]
                    }]
            };
            G.script.scenes = [...G.script.scenes, newScene];
        }
        else {
            (_a = ctx.events) === null || _a === void 0 ? void 0 : _a.endTurn({ next: protagonist });
        }
    }
    else {
        if (G.hand[protagonist].length > 7) {
            const newScene = {
                id: underscore_1.default.uniqueId(),
                mandatory: true,
                endTurnImmediately: false,
                actions: [{
                        type: "action",
                        instructions: [{
                                id: underscore_1.default.uniqueId(),
                                protagonist,
                                state: "open",
                                do: {
                                    key: "discard",
                                    info: { count: G.hand[protagonist].length - 7, type: "any" }
                                },
                                ui: { type: "click_on_own_card_in_hand" }
                            }]
                    }]
            };
            G.script.scenes = [...G.script.scenes, newScene];
        }
        else {
            (_b = ctx.events) === null || _b === void 0 ? void 0 : _b.endTurn();
        }
    }
}
function commit(G, ctx, sceneID) {
    G.script.scenes.find(sc => sc.id === sceneID).mandatory = true;
}
function skipExecuteDo(G, ctx, protagonist, instructionID) {
    if ((0, do_1._findInstructionWithID)(G, instructionID) !== null) {
        const [scene, action, instruction] = (0, do_1._findInstructionWithID)(G, instructionID);
        console.log("cc");
        action.instructions.filter((ins) => ins.protagonist === protagonist).forEach((ins) => ins.state = "executed");
    }
}
//
function setUIHoverHandIndex(G, ctx, index) {
    if (index === undefined || G.hand[ctx.currentPlayer].length > index) {
        G.uiHoverHandIndex = index;
    }
}
function setUICardToCard(G, ctx, param) {
    if (param !== undefined) {
        G.uiCardToCard = { ...param, id: underscore_1.default.uniqueId() };
    }
    else {
        G.uiCardToCard = undefined;
    }
}
exports.default = UnstableUnicorns;
// Helper
function _addSceneFromDo(G, ctx, cardID, owner, trigger) {
    const card = G.deck[cardID];
    if (!card.on) {
        return;
    }
    // all unicorns are basic
    // trigger no effect
    if (G.playerEffects[owner].find(s => s.effect.key === "my_unicorns_are_basic")) {
        if (G.playerEffects[owner].find(s => s.effect.key === "pandamonium") === undefined) {
            if (card.type === "narwhal" || card.type === "unicorn") {
                return;
            }
        }
    }
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
exports._addSceneFromDo = _addSceneFromDo;
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
exports._findOpenScenesWithProtagonist = _findOpenScenesWithProtagonist;
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
exports._findInProgressScenesWithProtagonist = _findInProgressScenesWithProtagonist;
function _findInstruction(G, instructionID) {
    let instruction, action, scene = undefined;
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
    return [instruction, action, scene];
}
exports._findInstruction = _findInstruction;
