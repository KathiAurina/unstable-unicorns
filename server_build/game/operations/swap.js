"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swapHands = swapHands;
exports.findSwapHandsTargets = findSwapHandsTargets;
exports.shakeUp = shakeUp;
exports.reset = reset;
exports.shuffleDiscardPileIntoDrawPile = shuffleDiscardPileIntoDrawPile;
exports.unicornSwap1 = unicornSwap1;
exports.findUnicornSwap1Targets = findUnicornSwap1Targets;
exports.unicornSwap2 = unicornSwap2;
exports.findUnicornSwap2Targets = findUnicornSwap2Targets;
const card_1 = require("../card");
const underscore_1 = __importDefault(require("underscore"));
const enter_1 = require("./enter");
const sacrifice_1 = require("./sacrifice");
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
            (0, sacrifice_1.sacrifice)(G, ctx, { protagonist: pl.id, cardID });
        });
    });
    shuffleDiscardPileIntoDrawPile(G, ctx, param);
}
function shuffleDiscardPileIntoDrawPile(G, ctx, _param) {
    G.drawPile = underscore_1.default.shuffle([...G.drawPile, ...G.discardPile]);
    G.discardPile = [];
}
function unicornSwap1(G, ctx, param) {
    (0, enter_1.leave)(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
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
    (0, enter_1.enter)(G, ctx, { playerID: param.playerID, cardID: G.clipboard.unicornSwap.cardIDToMove });
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
