"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = search;
exports.findSearchTargets = findSearchTargets;
const card_1 = require("../card");
const underscore_1 = __importDefault(require("underscore"));
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
