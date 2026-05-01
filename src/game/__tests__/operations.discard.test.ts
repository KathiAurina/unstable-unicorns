import { discard, canDiscard, findDiscardTargets } from '../operations/discard';
import { setupTestGame, createCtx, giveCardToHand } from '../testHelpers';

// ─── discard ──────────────────────────────────────────────────────────────────

describe('discard', () => {
    it("removes the card from the protagonist's hand", () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToHand(G, '0', 'basic');

        discard(G, ctx, { protagonist: '0', cardID });

        expect(G.hand['0']).not.toContain(cardID);
    });

    it('decreases the protagonist hand size by exactly 1', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToHand(G, '0', 'basic');
        const handSizeBefore = G.hand['0'].length;

        discard(G, ctx, { protagonist: '0', cardID });

        expect(G.hand['0'].length).toBe(handSizeBefore - 1);
    });

    it('adds the discarded card to the discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToHand(G, '0', 'basic');

        discard(G, ctx, { protagonist: '0', cardID });

        expect(G.discardPile).toContain(cardID);
    });

    it('leaves the other cards in hand untouched', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardA = giveCardToHand(G, '0', 'basic');
        const cardB = giveCardToHand(G, '0', 'basic');

        discard(G, ctx, { protagonist: '0', cardID: cardA });

        expect(G.hand['0']).not.toContain(cardA);
        expect(G.hand['0']).toContain(cardB);
    });

    it("does not modify the other player's hand", () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToHand(G, '0', 'basic');
        const opponent1HandBefore = [...G.hand['1']];

        discard(G, ctx, { protagonist: '0', cardID });

        expect(G.hand['1']).toEqual(opponent1HandBefore);
    });
});

// ─── canDiscard ───────────────────────────────────────────────────────────────

describe('canDiscard', () => {
    it('returns true when the player has enough cards to discard', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToHand(G, '0', 'basic');

        expect(canDiscard(G, ctx, '0', { count: 1, type: 'any' })).toBe(true);
    });

    it("returns false when the player's hand is empty", () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['0'] = [];

        expect(canDiscard(G, ctx, '0', { count: 1, type: 'any' })).toBe(false);
    });

    it('returns false when the player has fewer cards than required count', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['0'] = [G.drawPile[0]]; // exactly 1 card

        expect(canDiscard(G, ctx, '0', { count: 2, type: 'any' })).toBe(false);
    });

    it('returns true when the player has exactly the required number of cards', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['0'] = [G.drawPile[0], G.drawPile[1]];

        expect(canDiscard(G, ctx, '0', { count: 2, type: 'any' })).toBe(true);
    });
});

// ─── findDiscardTargets ───────────────────────────────────────────────────────

describe('findDiscardTargets', () => {
    it('returns all hand cards for type=any', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToHand(G, '0', 'basic');
        giveCardToHand(G, '0', 'basic');

        const targets = findDiscardTargets(G, ctx, '0', { count: 1, type: 'any' });

        expect(targets.length).toBe(G.hand['0'].length);
    });

    it('returns empty when hand is empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['0'] = [];

        const targets = findDiscardTargets(G, ctx, '0', { count: 1, type: 'any' });

        expect(targets).toHaveLength(0);
    });

    it('only returns unicorn cards for type=unicorn', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToHand(G, '0', 'unicorn');

        const targets = findDiscardTargets(G, ctx, '0', { count: 1, type: 'unicorn' });

        expect(targets.length).toBeGreaterThanOrEqual(1);
    });
});
