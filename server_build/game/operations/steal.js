"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.steal = steal;
exports.findStealTargets = findStealTargets;
exports.pull = pull;
exports.findPullTargets = findPullTargets;
const underscore_1 = __importDefault(require("underscore"));
const enter_1 = require("./enter");
const destroy_1 = require("./destroy");
function steal(G, ctx, param) {
    (0, enter_1.leave)(G, ctx, { playerID: (0, destroy_1.findOwnerOfCard)(G, param.cardID), cardID: param.cardID });
    (0, enter_1.enter)(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
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
                    if ((0, enter_1.canEnter)(G, ctx, { playerID: protagonist, cardID: c })) {
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
                    if ((0, enter_1.canEnter)(G, ctx, { playerID: protagonist, cardID: c })) {
                        targets.push({ playerID: pl.id, cardID: c });
                    }
                });
            });
            break;
        }
        case "baby": {
            G.players.forEach(pl => {
                if (pl.id === protagonist) {
                    return;
                }
                ;
                G.stable[pl.id].forEach(c => {
                    const card = G.deck[c];
                    if (card.type === "baby" && (0, enter_1.canEnter)(G, ctx, { playerID: protagonist, cardID: c })) {
                        targets.push({ playerID: pl.id, cardID: c });
                    }
                });
            });
            break;
        }
    }
    return targets;
}
function pull(G, ctx, param) {
    const cardToPull = G.hand[param.from][param.handIndex];
    if (cardToPull === undefined)
        return;
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
