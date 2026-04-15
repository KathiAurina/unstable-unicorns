"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnToHand = returnToHand;
exports.findReturnToHandTargets = findReturnToHandTargets;
exports.bringToStable = bringToStable;
exports.findBringToStableTargets = findBringToStableTargets;
exports.canBringToStableTargets = canBringToStableTargets;
exports.move = move;
exports.findMoveTargets = findMoveTargets;
exports.move2 = move2;
exports.findMoveTargets2 = findMoveTargets2;
exports.backKick = backKick;
exports.findBackKickTargets = findBackKickTargets;
const underscore_1 = __importDefault(require("underscore"));
const card_1 = require("../card");
const enter_1 = require("./enter");
const destroy_1 = require("./destroy");
const misc_1 = require("./misc");
function returnToHand(G, ctx, param) {
    const card = G.deck[param.cardID];
    const playerID = (0, destroy_1.findOwnerOfCard)(G, param.cardID);
    (0, enter_1.leave)(G, ctx, { playerID: playerID, cardID: param.cardID });
    if ((0, card_1.hasType)(card, "baby")) {
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
    (0, enter_1.enter)(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
    G.hand[param.protagonist] = underscore_1.default.without(G.hand[param.protagonist], param.cardID);
}
function findBringToStableTargets(G, ctx, protagonist, info) {
    let targets = [];
    if (info.type === "basic_unicorn") {
        targets = G.hand[protagonist].map(c => G.deck[c]).filter(c => (0, card_1.hasType)(c, "basic") && (0, enter_1.canEnter)(G, ctx, { cardID: c.id, playerID: protagonist })).map(c => ({ cardID: c.id }));
    }
    return targets;
}
function canBringToStableTargets(G, ctx, protagonist, info) {
    return findBringToStableTargets(G, ctx, protagonist, info).length > 0;
}
function move(G, ctx, param) {
    const from = (0, destroy_1.findOwnerOfCard)(G, param.cardID);
    (0, enter_1.leave)(G, ctx, { playerID: from, cardID: param.cardID });
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
    (0, enter_1.enter)(G, ctx, { playerID: param.playerID, cardID: G.clipboard.move.cardID });
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
function backKick(G, ctx, param) {
    const owner = (0, destroy_1.findOwnerOfCard)(G, param.cardID);
    returnToHand(G, ctx, { cardID: param.cardID, protagonist: param.protagonist });
    (0, misc_1.makeSomeoneDiscard)(G, ctx, { protagonist: param.protagonist, playerID: owner });
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
