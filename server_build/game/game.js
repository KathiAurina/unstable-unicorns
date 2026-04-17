"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._addSceneFromDo = exports._findInProgressScenesWithProtagonist = exports._findOpenScenesWithProtagonist = exports._findInstruction = void 0;
exports.canPlayCard = canPlayCard;
exports.canDraw = canDraw;
const core_1 = require("boardgame.io/core");
const operations_1 = require("./operations");
const operations_2 = require("./operations");
const card_1 = require("./card");
const constants_1 = require("./constants");
const effect_1 = require("./effect");
const underscore_1 = __importDefault(require("underscore"));
const state_1 = require("./state");
var state_2 = require("./state");
Object.defineProperty(exports, "_findInstruction", { enumerable: true, get: function () { return state_2._findInstruction; } });
Object.defineProperty(exports, "_findOpenScenesWithProtagonist", { enumerable: true, get: function () { return state_2._findOpenScenesWithProtagonist; } });
Object.defineProperty(exports, "_findInProgressScenesWithProtagonist", { enumerable: true, get: function () { return state_2._findInProgressScenesWithProtagonist; } });
Object.defineProperty(exports, "_addSceneFromDo", { enumerable: true, get: function () { return state_2._addSceneFromDo; } });
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
        let drawPile = underscore_1.default.shuffle(deck).filter(c => !(0, card_1.hasType)(c, "baby")).map(c => c.id);
        let hand = {};
        let stable = {};
        let temporaryStable = {};
        let upgradeDowngradeStable = {};
        let playerEffects = {};
        let ready = {};
        let lastHeartbeat = {};
        players.forEach(pl => {
            ready[pl.id] = false;
            hand[pl.id] = underscore_1.default.first(drawPile, constants_1.CONSTANTS.numberOfHandCardsAtStart);
            drawPile = underscore_1.default.rest(drawPile, constants_1.CONSTANTS.numberOfHandCardsAtStart);
            stable[pl.id] = [];
            temporaryStable[pl.id] = [];
            upgradeDowngradeStable[pl.id] = [];
            playerEffects[pl.id] = [];
            lastHeartbeat[pl.id] = Date.now();
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
            lastNeighResult: undefined,
            owner: setupData?.ownerPlayerID ?? "0",
            lastHeartbeat,
            deckWasReshuffled: false,
        };
    },
    phases: {
        pregame: {
            start: true,
            onBegin: (G, ctx) => {
                ctx.events?.setActivePlayers({ all: "pregame" });
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
            if (ctx.phase === "pregame") {
                return;
            }
            G.deckWasReshuffled = false;
            // this is run whenever a new player starts its turn
            // perfect for placing players in a stage
            if (G.drawPile.length > 0 || G.discardPile.length > 0) {
                G.script = { scenes: [] };
                G.countPlayedCardsInActionPhase = 0;
                G.mustEndTurnImmediately = false;
                // begin of turn: add scene
                [...G.stable[ctx.currentPlayer], ...G.upgradeDowngradeStable[ctx.currentPlayer]].forEach(c => (0, state_1._addSceneFromDo)(G, ctx, c, ctx.currentPlayer, "begin_of_turn"));
                // begin of turn: add effect
                [...G.stable[ctx.currentPlayer], ...G.upgradeDowngradeStable[ctx.currentPlayer]].forEach(c => {
                    const card = G.deck[c];
                    const cardOnBegin = card.on?.filter(c => c.trigger === "begin_of_turn");
                    // all unicorns are basic — trigger no effect
                    if ((0, effect_1.isCardBasicDueToEffect)(G.playerEffects[ctx.currentPlayer], card))
                        return;
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
                (0, operations_2.autoFizzleUnsatisfiable)(G, ctx);
                ctx.events?.setActivePlayers({ all: "beginning" });
            }
            else {
                // no cards to draw
                // need to end the game
                ctx.events?.setPhase("end");
            }
        },
        stages: {
            pregame: {
                moves: { ready, selectBaby, deselectBaby, changeName, abolishGame, heartbeat, cancelAbandonedGame }
            },
            beginning: {
                moves: { drawAndAdvance, executeDo: operations_2.executeDo, end, commit, skipExecuteDo, abolishGame }
            },
            action_phase: {
                moves: {
                    commit, executeDo: operations_2.executeDo, end, drawAndEnd, playCard, playUpgradeDowngradeCard, playNeigh, playSuperNeigh, dontPlayNeigh, skipExecuteDo, abolishGame
                }
            }
        }
    },
    endIf: (G, ctx) => {
        for (const player of G.players) {
            // Check for Pandamonium
            const hasPandamonium = G.playerEffects[player.id].some(e => e.effect.key === "pandamonium");
            if (hasPandamonium) {
                // Cannot win if all unicorns are pandas
                continue;
            }
            let unicornCount = G.stable[player.id].length;
            // Check for Ginormous Unicorn (counts as 2)
            const hasGinormous = G.playerEffects[player.id].some(e => e.effect.key === "count_as_two");
            if (hasGinormous) {
                unicornCount += 1; // It's already counted once in length
            }
            if (unicornCount >= constants_1.CONSTANTS.stableSeats) {
                return { winner: player.id };
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
    const myBaby = G.babyStarter.find(s => s.owner === protagonist);
    if (!myBaby)
        return core_1.INVALID_MOVE;
    if (G.babyStarter.some(s => s.cardID === myBaby.cardID && s.owner !== protagonist))
        return core_1.INVALID_MOVE;
    G.ready[protagonist] = true;
    if (underscore_1.default.every(underscore_1.default.values(G.ready), bo => bo)) {
        initializeGame(G, ctx);
        ctx.events?.setPhase("main");
    }
}
function selectBaby(G, ctx, protagonist, cardID) {
    if (G.babyStarter.some(s => s.cardID === cardID && s.owner !== protagonist))
        return core_1.INVALID_MOVE;
    G.babyStarter = G.babyStarter.filter(s => s.owner !== protagonist);
    G.babyStarter.push({ cardID, owner: protagonist });
    G.ready[protagonist] = false;
}
function deselectBaby(G, ctx, protagonist) {
    G.babyStarter = G.babyStarter.filter(s => s.owner !== protagonist);
    G.ready[protagonist] = false;
}
function abolishGame(G, ctx, protagonist) {
    if (ctx.playerID !== protagonist)
        return core_1.INVALID_MOVE;
    if (G.owner === protagonist) {
        ctx.events?.endGame({ aborted: true });
    }
}
function heartbeat(G, ctx, protagonist) {
    G.lastHeartbeat[protagonist] = Date.now();
}
function cancelAbandonedGame(G, ctx) {
    if (Date.now() - G.lastHeartbeat[G.owner] > 60000) {
        ctx.events?.endGame({ aborted: true });
    }
}
function drawAndAdvance(G, ctx) {
    G.hand[ctx.currentPlayer].push(underscore_1.default.first(G.drawPile));
    G.drawPile = underscore_1.default.rest(G.drawPile, 1);
    ctx.events?.setActivePlayers({ all: "action_phase" });
    G.script = { scenes: [] };
}
function canPlayCard(G, ctx, protagonist, cardID) {
    if (ctx.currentPlayer === protagonist && ctx.activePlayers[protagonist] === "action_phase" && (G.countPlayedCardsInActionPhase === 0 || (G.countPlayedCardsInActionPhase === 1 && G.playerEffects[protagonist].find(c => c.effect.key === "double_dutch")))) {
        const card = G.deck[cardID];
        if ((0, card_1.hasType)(card, "upgrade") && G.playerEffects[protagonist].find(s => s.effect.key === "you_cannot_play_upgrades")) {
            return false;
        }
        return (0, operations_1.canEnter)(G, ctx, { playerID: protagonist, cardID });
    }
    return false;
}
function playCard(G, ctx, protagonist, cardID) {
    G.countPlayedCardsInActionPhase = G.countPlayedCardsInActionPhase + 1;
    G.hand[protagonist] = underscore_1.default.without(G.hand[protagonist], cardID);
    if (G.playerEffects[protagonist].findIndex(f => f.effect.key === "your_cards_cannot_be_neighed") > -1) {
        (0, operations_1.enter)(G, ctx, { playerID: protagonist, cardID });
    }
    else {
        // resolve neigh
        G.neighDiscussion = {
            cardID, protagonist, rounds: [{
                    state: "open",
                    playerState: Object.fromEntries(G.players.map(pl => ([pl.id, { vote: initialNeighVote(G, pl.id, protagonist) }])))
                }],
            target: protagonist,
        };
    }
}
function initialNeighVote(G, playerID, protagonist) {
    if (playerID === protagonist)
        return "no_neigh";
    if (G.playerEffects[playerID].find(e => e.effect.key === "you_cannot_play_neigh"))
        return "no_neigh";
    return "undecided";
}
function playUpgradeDowngradeCard(G, ctx, protagonist, targetPlayer, cardID) {
    G.countPlayedCardsInActionPhase = G.countPlayedCardsInActionPhase + 1;
    G.hand[protagonist] = underscore_1.default.without(G.hand[protagonist], cardID);
    if (G.playerEffects[protagonist].findIndex(f => f.effect.key === "your_cards_cannot_be_neighed") > -1) {
        (0, operations_1.enter)(G, ctx, { playerID: targetPlayer, cardID });
    }
    else {
        // resolve neigh
        G.neighDiscussion = {
            cardID, protagonist, rounds: [{
                    state: "open",
                    playerState: Object.fromEntries(G.players.map(pl => ([pl.id, { vote: initialNeighVote(G, pl.id, protagonist) }]))),
                }],
            target: targetPlayer,
        };
    }
}
function playNeigh(G, ctx, cardID, protagonist, roundIndex) {
    if (G.playerEffects[protagonist].find(e => e.effect.key === "you_cannot_play_neigh"))
        return;
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
            playerState: Object.fromEntries(G.players.map(pl => ([pl.id, { vote: initialNeighVote(G, pl.id, protagonist) }])))
        });
    }
}
function playSuperNeigh(G, ctx, cardID, protagonist, roundIndex) {
    if (G.playerEffects[protagonist].find(e => e.effect.key === "you_cannot_play_neigh"))
        return;
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
            (0, operations_1.enter)(G, ctx, { playerID: G.neighDiscussion.protagonist, cardID: G.neighDiscussion.cardID });
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
                (0, operations_1.enter)(G, ctx, { playerID: G.neighDiscussion.target, cardID: G.neighDiscussion.cardID });
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
        if ((0, state_1._findOpenScenesWithProtagonist)(G, ctx.currentPlayer).find(([instr, sc]) => sc.mandatory === true)) {
            return false;
        }
        // if there is an ongoing scene => one cannot draw
        if ((0, state_1._findInProgressScenesWithProtagonist)(G, ctx.currentPlayer).length > 0) {
            return false;
        }
        return true;
    }
    if (ctx.activePlayers[ctx.currentPlayer] === "action_phase") {
        return G.countPlayedCardsInActionPhase === 0;
    }
    return false;
}
function drawAndEnd(G, ctx) {
    G.script = { scenes: [] };
    G.hand[ctx.currentPlayer].push(underscore_1.default.first(G.drawPile));
    G.drawPile = underscore_1.default.rest(G.drawPile, 1);
    G.countPlayedCardsInActionPhase = G.countPlayedCardsInActionPhase + 1;
}
function _createDiscardOverLimitScene(G, protagonist) {
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
function end(G, ctx, protagonist) {
    if (ctx.playerID !== protagonist && ctx.playerID !== G.owner)
        return core_1.INVALID_MOVE;
    if (G.playerEffects[protagonist].find(o => o.effect.key === "change_of_luck")) {
        G.playerEffects[protagonist] = G.playerEffects[protagonist].filter(o => o.effect.key !== "change_of_luck");
        if (G.hand[protagonist].length > 7) {
            _createDiscardOverLimitScene(G, protagonist);
        }
        else {
            ctx.events?.endTurn({ next: protagonist });
        }
    }
    else {
        if (G.hand[protagonist].length > 7) {
            _createDiscardOverLimitScene(G, protagonist);
        }
        else {
            ctx.events?.endTurn();
        }
    }
}
function commit(G, ctx, sceneID) {
    G.script.scenes.find(sc => sc.id === sceneID).mandatory = true;
}
function skipExecuteDo(G, ctx, protagonist, instructionID) {
    if (ctx.playerID !== protagonist && ctx.playerID !== G.owner)
        return core_1.INVALID_MOVE;
    const found = (0, state_1._findInstruction)(G, instructionID);
    if (found !== undefined) {
        found.action.instructions.filter((ins) => ins.protagonist === protagonist).forEach((ins) => ins.state = "executed");
    }
}
exports.default = UnstableUnicorns;
