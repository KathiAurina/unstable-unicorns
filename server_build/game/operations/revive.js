"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revive = revive;
exports.findReviveTarget = findReviveTarget;
exports.addFromDiscardPileToHand = addFromDiscardPileToHand;
exports.findAddFromDiscardPileToHand = findAddFromDiscardPileToHand;
exports.reviveFromNursery = reviveFromNursery;
const card_1 = require("../card");
const underscore_1 = __importDefault(require("underscore"));
const enter_1 = require("./enter");
function revive(G, ctx, param) {
    G.discardPile = underscore_1.default.without(G.discardPile, param.cardID);
    (0, enter_1.enter)(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
}
function findReviveTarget(G, ctx, protagonist, info) {
    let targets = [];
    if (info.type === "unicorn") {
        targets = G.discardPile.filter(c => {
            const card = G.deck[c];
            return (0, card_1.isUnicorn)(card) && (0, enter_1.canEnter)(G, ctx, { playerID: protagonist, cardID: c });
        }).map(c => ({ cardID: c }));
    }
    if (info.type === "basic_unicorn") {
        targets = G.discardPile.filter(c => {
            const card = G.deck[c];
            return (0, enter_1.canEnter)(G, ctx, { playerID: protagonist, cardID: c }) && card.type === "basic";
        }).map(c => ({ cardID: c }));
    }
    return targets;
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
    (0, enter_1.enter)(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
}
