"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sacrifice = sacrifice;
exports.findSacrificeTargets = findSacrificeTargets;
const card_1 = require("../card");
const state_1 = require("../state");
const effect_1 = require("../effect");
const underscore_1 = __importDefault(require("underscore"));
const enter_1 = require("./enter");
function sacrifice(G, ctx, param) {
    const card = G.deck[param.cardID];
    (0, enter_1.leave)(G, ctx, { playerID: param.protagonist, cardID: param.cardID });
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
            (0, state_1._addSceneFromDo)(G, ctx, card.id, param.protagonist, "any");
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
        const hasPandamonium = G.playerEffects[protagonist].find(s => s.effect.key === "pandamonium") !== undefined;
        G.stable[protagonist].forEach(c => {
            if (hasPandamonium && (0, card_1.isUnicorn)(G.deck[c]))
                return;
            targets.push({ cardID: c });
        });
        G.upgradeDowngradeStable[protagonist].forEach(c => {
            targets.push({ cardID: c });
        });
    }
    return targets;
}
