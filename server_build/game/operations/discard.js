"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discard = discard;
exports.canDiscard = canDiscard;
exports.findDiscardTargets = findDiscardTargets;
const card_1 = require("../card");
const underscore_1 = __importDefault(require("underscore"));
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
