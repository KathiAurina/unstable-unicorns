import { search, findSearchTargets } from '../operations/search';
import { setupTestGame, createCtx } from '../testHelpers';

// ─── search ───────────────────────────────────────────────────────────────────

describe('search', () => {
    it('adds the searched card to the protagonist hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = G.drawPile[0];

        search(G, ctx, { protagonist: '0', cardID });

        expect(G.hand['0']).toContain(cardID);
    });

    it('removes the searched card from the draw pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = G.drawPile[0];

        search(G, ctx, { protagonist: '0', cardID });

        expect(G.drawPile).not.toContain(cardID);
    });

    it('keeps all other draw pile cards (just shuffled) after the search', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = G.drawPile[0];
        const restOfPile = G.drawPile.slice(1).sort();

        search(G, ctx, { protagonist: '0', cardID });

        expect([...G.drawPile].sort()).toEqual(restOfPile);
    });

    it('does not affect the discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const discardBefore = [...G.discardPile];
        const cardID = G.drawPile[0];

        search(G, ctx, { protagonist: '0', cardID });

        expect(G.discardPile).toEqual(discardBefore);
    });
});

// ─── findSearchTargets ────────────────────────────────────────────────────────

describe('findSearchTargets', () => {
    it('returns empty when draw pile is empty regardless of type', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.drawPile = [];

        expect(findSearchTargets(G, ctx, '0', { type: 'any' })).toHaveLength(0);
        expect(findSearchTargets(G, ctx, '0', { type: 'unicorn' })).toHaveLength(0);
        expect(findSearchTargets(G, ctx, '0', { type: 'upgrade' })).toHaveLength(0);
    });

    it('returns only narwhal cards for type=narwhal', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findSearchTargets(G, ctx, '0', { type: 'narwhal' });

        targets.forEach(t => {
            const card = G.deck[t.cardID];
            const types = Array.isArray(card.type) ? card.type : [card.type];
            expect(types).toContain('narwhal');
        });
    });

    it('returns only downgrade cards for type=downgrade', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findSearchTargets(G, ctx, '0', { type: 'downgrade' });

        targets.forEach(t => {
            expect(G.deck[t.cardID].type).toBe('downgrade');
        });
    });

    it('returns only unicorn cards (basic/unicorn/narwhal) for type=unicorn', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findSearchTargets(G, ctx, '0', { type: 'unicorn' });

        targets.forEach(t => {
            const card = G.deck[t.cardID];
            const types = Array.isArray(card.type) ? card.type : [card.type];
            const isUnicornType = types.some(ty => ['basic', 'unicorn', 'narwhal', 'baby'].includes(ty));
            expect(isUnicornType).toBe(true);
        });
    });
});
