"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCtx = createCtx;
exports.setupTestGame = setupTestGame;
exports.giveCardToStable = giveCardToStable;
exports.giveCardToUpgradeStable = giveCardToUpgradeStable;
exports.giveCardToHand = giveCardToHand;
const game_1 = __importDefault(require("./game"));
function createCtx(overrides = {}) {
    return {
        numPlayers: 2,
        currentPlayer: "0",
        playOrder: ["0", "1"],
        playOrderPos: 0,
        activePlayers: { "0": "action_phase", "1": "action_phase" },
        phase: "main",
        turn: 1,
        events: {
            endTurn: jest.fn(),
            endPhase: jest.fn(),
            setPhase: jest.fn(),
            setActivePlayers: jest.fn(),
            endStage: jest.fn(),
            setStage: jest.fn(),
            pass: jest.fn(),
        },
        ...overrides,
    };
}
function setupTestGame(numPlayers = 2, overrides = {}) {
    const ctx = createCtx({ numPlayers });
    const G = game_1.default.setup(ctx, undefined);
    return { ...G, ...overrides };
}
/**
 * Place a card from the drawPile into a player's stable.
 * Finds the first card of `type` in the draw pile (or anywhere in the deck if not in draw pile).
 */
function giveCardToStable(G, playerID, type) {
    const cardID = G.deck.find(c => c.type === type && G.drawPile.includes(c.id))?.id
        ?? G.deck.find(c => c.type === type).id;
    G.drawPile = G.drawPile.filter(id => id !== cardID);
    G.stable[playerID] = [...G.stable[playerID], cardID];
    return cardID;
}
/**
 * Place a card from the drawPile into a player's upgradeDowngradeStable.
 */
function giveCardToUpgradeStable(G, playerID, type) {
    const cardID = G.deck.find(c => c.type === type && G.drawPile.includes(c.id))?.id
        ?? G.deck.find(c => c.type === type).id;
    G.drawPile = G.drawPile.filter(id => id !== cardID);
    G.upgradeDowngradeStable[playerID] = [...G.upgradeDowngradeStable[playerID], cardID];
    return cardID;
}
/**
 * Place a card into a player's hand.
 */
function giveCardToHand(G, playerID, type) {
    const cardID = G.deck.find(c => c.type === type && G.drawPile.includes(c.id))?.id
        ?? G.deck.find(c => c.type === type && !G.hand[playerID].includes(c.id)).id;
    G.drawPile = G.drawPile.filter(id => id !== cardID);
    G.hand[playerID] = [...G.hand[playerID], cardID];
    return cardID;
}
