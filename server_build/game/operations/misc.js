"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pullRandom = pullRandom;
exports.findPullRandomTargets = findPullRandomTargets;
exports.makeSomeoneDiscard = makeSomeoneDiscard;
exports.findMakeSomeoneDiscardTarget = findMakeSomeoneDiscardTarget;
exports.blatantThievery1 = blatantThievery1;
exports.findBlatantThieveryTargets = findBlatantThieveryTargets;
const underscore_1 = __importDefault(require("underscore"));
const discard_1 = require("./discard");
const steal_1 = require("./steal");
function pullRandom(G, ctx, param) {
    (0, steal_1.pull)(G, ctx, {
        protagonist: param.protagonist,
        from: param.playerID,
        handIndex: underscore_1.default.random(0, G.hand[param.playerID].length - 1)
    });
}
function findPullRandomTargets(G, ctx, protagonist) {
    return (0, steal_1.findPullTargets)(G, ctx, protagonist);
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
                            type: "click_on_own_card_in_hand",
                            info: param.source !== undefined ? { source: param.source } : undefined
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
    return G.players.filter(pl => pl.id !== protagonist && (0, discard_1.canDiscard)(G, ctx, pl.id, { count: 1, type: "any" })).map(pl => ({ playerID: pl.id }));
}
function blatantThievery1(G, ctx, param) {
    (0, steal_1.pull)(G, ctx, { protagonist: param.protagonist, handIndex: param.handIndex, from: param.from });
}
function findBlatantThieveryTargets(G, ctx, protagonist) {
    return (0, steal_1.findPullTargets)(G, ctx, protagonist);
}
