import { draw, canDraw } from '../operations/draw';
import { setupTestGame, createCtx } from '../testHelpers';

// ─── draw ─────────────────────────────────────────────────────────────────────

describe('draw (operation)', () => {
    it('adds the drawn cards to the protagonist hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const handBefore = G.hand['0'].length;

        draw(G, ctx, { protagonist: '0', count: 2 });

        expect(G.hand['0'].length).toBe(handBefore + 2);
    });

    it('removes the drawn cards from the draw pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const pileBefore = G.drawPile.length;

        draw(G, ctx, { protagonist: '0', count: 3 });

        expect(G.drawPile.length).toBe(pileBefore - 3);
    });

    it('the drawn cards are the top cards of the draw pile (FIFO order)', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const topTwo = G.drawPile.slice(0, 2);

        draw(G, ctx, { protagonist: '0', count: 2 });

        expect(G.hand['0']).toEqual(expect.arrayContaining(topTwo));
    });

    it('reshuffles the discard pile into the draw pile when the draw pile is too small', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const extraCards = G.drawPile.splice(0, 10);
        G.discardPile = [...G.discardPile, ...extraCards];
        G.drawPile = G.drawPile.slice(0, 1); // only 1 card in draw pile

        draw(G, ctx, { protagonist: '0', count: 3 });

        expect(G.deckWasReshuffled).toBe(true);
        expect(G.hand['0'].length).toBeGreaterThan(0);
    });

    it('does not set deckWasReshuffled when the draw pile has enough cards', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.deckWasReshuffled = false;

        draw(G, ctx, { protagonist: '0', count: 1 });

        expect(G.deckWasReshuffled).toBe(false);
    });

    it('does not add cards when draw pile and discard pile are both empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const handBefore = G.hand['0'].length;
        G.drawPile = [];
        G.discardPile = [];

        draw(G, ctx, { protagonist: '0', count: 3 });

        expect(G.hand['0'].length).toBe(handBefore);
    });

    it('drawing count=0 leaves both hand and draw pile unchanged', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const handBefore = G.hand['0'].length;
        const pileBefore = G.drawPile.length;

        draw(G, ctx, { protagonist: '0', count: 0 });

        expect(G.hand['0'].length).toBe(handBefore);
        expect(G.drawPile.length).toBe(pileBefore);
    });

    it('does not affect another player hand when drawing for the protagonist', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const hand1Before = [...G.hand['1']];

        draw(G, ctx, { protagonist: '0', count: 2 });

        expect(G.hand['1']).toEqual(hand1Before);
    });

    it('draws all remaining cards if count exceeds what the combined piles can supply', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.drawPile = [G.drawPile[0]];
        G.discardPile = [];

        draw(G, ctx, { protagonist: '0', count: 99 });

        // draw pile is now empty; one card must have been drawn
        expect(G.drawPile.length).toBe(0);
    });
});

// ─── canDraw (operation-level) ────────────────────────────────────────────────

describe('canDraw (operation)', () => {
    it('returns true when the draw pile alone has enough cards', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        expect(canDraw(G, ctx, { count: 1 })).toBe(true);
    });

    it('returns true when combined draw pile + discard pile reaches the required count', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const spareCards = G.drawPile.splice(0, 5);
        G.discardPile = spareCards;
        G.drawPile = [];

        expect(canDraw(G, ctx, { count: 5 })).toBe(true);
    });

    it('returns false when both piles are empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.drawPile = [];
        G.discardPile = [];

        expect(canDraw(G, ctx, { count: 1 })).toBe(false);
    });

    it('returns false when combined total is less than the required count', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.drawPile = [G.drawPile[0]]; // 1 card
        G.discardPile = [];

        expect(canDraw(G, ctx, { count: 2 })).toBe(false);
    });
});

// ─── draw pile reshuffle ──────────────────────────────────────────────────────

describe('draw — discard pile reshuffle when draw pile is exhausted', () => {
    it('shuffles discard pile into draw pile when draw pile has fewer cards than requested', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const discardCard = G.drawPile[5];
        G.drawPile = [G.drawPile[0]];        // only 1 card in draw pile
        G.discardPile = [discardCard];        // 1 card in discard pile

        draw(G, ctx, { protagonist: '0', count: 2 });

        // The discard pile should have been consumed
        expect(G.discardPile).toHaveLength(0);
    });

    it('sets deckWasReshuffled flag when reshuffle occurs', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.deckWasReshuffled = false;
        const discardCard = G.drawPile[5];
        G.drawPile = [G.drawPile[0]];
        G.discardPile = [discardCard];

        draw(G, ctx, { protagonist: '0', count: 2 });

        expect(G.deckWasReshuffled).toBe(true);
    });

    it('does NOT set deckWasReshuffled when draw pile has enough cards', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.deckWasReshuffled = false;

        draw(G, ctx, { protagonist: '0', count: 1 });

        expect(G.deckWasReshuffled).toBe(false);
    });

    it('draws all available cards when draw pile + discard pile together are fewer than requested', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const only = G.drawPile[0];
        G.drawPile = [only];
        G.discardPile = [];
        const handBefore = G.hand['0'].length;

        draw(G, ctx, { protagonist: '0', count: 3 });

        // Only 1 card was available — hand grows by 1
        expect(G.hand['0'].length).toBe(handBefore + 1);
        expect(G.hand['0']).toContain(only);
    });
});
