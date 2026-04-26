"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOwnerOfCard = findOwnerOfCard;
exports.destroy = destroy;
exports.findDestroyTargets = findDestroyTargets;
const card_1 = require("../card");
const state_1 = require("../state");
const effect_1 = require("../effect");
const underscore_1 = __importDefault(require("underscore"));
const enter_1 = require("./enter");
function findOwnerOfCard(G, cardID) {
    let playerID = null;
    G.players.forEach(pl => {
        if ([...G.stable[pl.id], ...G.upgradeDowngradeStable[pl.id]].findIndex(c => c === cardID) > -1) {
            playerID = pl.id;
        }
    });
    return playerID;
}
function destroy(G, ctx, param) {
    const card = G.deck[param.cardID];
    const targetPlayer = findOwnerOfCard(G, param.cardID);
    (0, enter_1.leave)(G, ctx, { playerID: targetPlayer, cardID: param.cardID });
    if ((0, card_1.hasType)(card, "baby")) {
        G.nursery.push(param.cardID);
    }
    else {
        G.discardPile.push(param.cardID);
    }
    const ons = card.on?.filter(on => on.trigger === "this_destroyed_or_sacrificed");
    ons?.forEach(on => {
        // all unicorns are basic — trigger no effect
        if ((0, effect_1.isCardBasicDueToEffect)(G.playerEffects[targetPlayer], card))
            return;
        if (on.do.type === "return_to_hand") {
            G.discardPile = underscore_1.default.without(G.discardPile, param.cardID);
            G.hand[targetPlayer] = [...G.hand[targetPlayer], param.cardID];
        }
        else if (on.do.type === "add_scene") {
            (0, state_1._addSceneFromDo)(G, ctx, card.id, targetPlayer, "any");
        }
    });
}
function findDestroyTargets(G, ctx, protagonist, info, sourceCard) {
    let targets = [];
    G.players.forEach(pl => {
        // special case
        // this is actually a combination of sacrifice and destroy
        if (info.type === "my_downgrade_other_upgrade") {
            G.upgradeDowngradeStable[pl.id].forEach(cid => {
                const card = G.deck[cid];
                if (pl.id === protagonist && (0, card_1.hasType)(card, "downgrade")) {
                    targets.push({ playerID: pl.id, cardID: cid });
                }
                else if ((0, card_1.hasType)(card, "upgrade")) {
                    targets.push({ playerID: pl.id, cardID: cid });
                }
            });
        }
        if (info.type === "unicorn") {
            G.stable[pl.id].forEach(cid => {
                const card = G.deck[cid];
                if ((0, card_1.isUnicorn)(card)) {
                    if (sourceCard && (0, card_1.hasType)(G.deck[sourceCard], "magic") && card.passive?.includes("cannot_be_destroyed_by_magic")) {
                        return;
                    }
                    if (G.playerEffects[pl.id].find(s => s.effect.key === "your_unicorns_cannot_be_destroyed")) {
                        return;
                    }
                    if (G.playerEffects[pl.id].find(s => s.effect.key === "pandamonium")) {
                        return;
                    }
                    targets.push({ playerID: pl.id, cardID: cid });
                }
            });
        }
        else if (info.type === "upgrade") {
            G.upgradeDowngradeStable[pl.id].forEach(cid => {
                const card = G.deck[cid];
                if ((0, card_1.hasType)(card, "upgrade")) {
                    targets.push({ playerID: pl.id, cardID: cid });
                }
            });
        }
        else if (info.type === "any") {
            G.stable[pl.id].forEach(cid => {
                const card = G.deck[cid];
                if ((0, card_1.isUnicorn)(card)) {
                    if (sourceCard && (0, card_1.hasType)(G.deck[sourceCard], "magic") && card.passive?.includes("cannot_be_destroyed_by_magic")) {
                        return;
                    }
                    if (G.playerEffects[pl.id].find(s => s.effect.key === "your_unicorns_cannot_be_destroyed")) {
                        return;
                    }
                    targets.push({ playerID: pl.id, cardID: cid });
                }
            });
            G.upgradeDowngradeStable[pl.id].forEach(cid => {
                targets.push({ playerID: pl.id, cardID: cid });
            });
        }
    });
    return targets;
}
