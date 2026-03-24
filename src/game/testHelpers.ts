import type { Ctx } from 'boardgame.io';
import UnstableUnicorns, { UnstableUnicornsGame } from './game';
import type { CardID } from './card';
import type { PlayerID } from './player';

export function createCtx(overrides: Partial<Ctx> = {}): Ctx {
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
    } as unknown as Ctx;
}

export function setupTestGame(numPlayers = 2, overrides: Partial<UnstableUnicornsGame> = {}): UnstableUnicornsGame {
    const ctx = createCtx({ numPlayers });
    const G = (UnstableUnicorns.setup as Function)(ctx, undefined) as UnstableUnicornsGame;
    return { ...G, ...overrides };
}

/**
 * Place a card from the drawPile into a player's stable.
 * Finds the first card of `type` in the draw pile (or anywhere in the deck if not in draw pile).
 */
export function giveCardToStable(G: UnstableUnicornsGame, playerID: PlayerID, type: string): CardID {
    const cardID = G.deck.find(c => c.type === type && G.drawPile.includes(c.id))?.id
        ?? G.deck.find(c => c.type === type)!.id;
    G.drawPile = G.drawPile.filter(id => id !== cardID);
    G.stable[playerID] = [...G.stable[playerID], cardID];
    return cardID;
}

/**
 * Place a card from the drawPile into a player's upgradeDowngradeStable.
 */
export function giveCardToUpgradeStable(G: UnstableUnicornsGame, playerID: PlayerID, type: string): CardID {
    const cardID = G.deck.find(c => c.type === type && G.drawPile.includes(c.id))?.id
        ?? G.deck.find(c => c.type === type)!.id;
    G.drawPile = G.drawPile.filter(id => id !== cardID);
    G.upgradeDowngradeStable[playerID] = [...G.upgradeDowngradeStable[playerID], cardID];
    return cardID;
}

/**
 * Place a card into a player's hand.
 */
export function giveCardToHand(G: UnstableUnicornsGame, playerID: PlayerID, type: string): CardID {
    const cardID = G.deck.find(c => c.type === type && G.drawPile.includes(c.id))?.id
        ?? G.deck.find(c => c.type === type && !G.hand[playerID].includes(c.id))!.id;
    G.drawPile = G.drawPile.filter(id => id !== cardID);
    G.hand[playerID] = [...G.hand[playerID], cardID];
    return cardID;
}
