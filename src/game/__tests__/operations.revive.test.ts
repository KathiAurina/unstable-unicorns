import { revive, addFromDiscardPileToHand, reviveFromNursery, findReviveTarget, findAddFromDiscardPileToHand } from '../operations/revive';
import { setupTestGame, createCtx } from '../testHelpers';

// ─── revive ───────────────────────────────────────────────────────────────────

describe('revive', () => {
    it('adds the revived card to the protagonist stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = G.deck.find(c => c.type === 'basic')!.id;
        G.discardPile = [cardID];

        revive(G, ctx, { protagonist: '0', cardID });

        expect(G.stable['0']).toContain(cardID);
    });

    it('removes the revived card from the discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = G.deck.find(c => c.type === 'basic')!.id;
        G.discardPile = [cardID];

        revive(G, ctx, { protagonist: '0', cardID });

        expect(G.discardPile).not.toContain(cardID);
    });

    it('leaves other cards in the discard pile untouched', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const targetCard = G.deck.find(c => c.type === 'basic')!.id;
        const otherCard = G.deck.find(c => c.type === 'basic' && c.id !== targetCard)!.id;
        G.discardPile = [targetCard, otherCard];

        revive(G, ctx, { protagonist: '0', cardID: targetCard });

        expect(G.discardPile).toContain(otherCard);
    });
});

// ─── addFromDiscardPileToHand ─────────────────────────────────────────────────

describe('addFromDiscardPileToHand', () => {
    it('adds the card from the discard pile to protagonist hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = G.deck.find(c => c.type === 'magic')!.id;
        G.discardPile = [cardID];

        addFromDiscardPileToHand(G, ctx, { protagonist: '0', cardID });

        expect(G.hand['0']).toContain(cardID);
    });

    it('removes the card from the discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = G.deck.find(c => c.type === 'magic')!.id;
        G.discardPile = [cardID];

        addFromDiscardPileToHand(G, ctx, { protagonist: '0', cardID });

        expect(G.discardPile).not.toContain(cardID);
    });

    it('leaves other cards in the discard pile untouched', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const targetCard = G.deck.find(c => c.type === 'magic')!.id;
        const otherCard = G.deck.find(c => c.type === 'neigh')!.id;
        G.discardPile = [targetCard, otherCard];

        addFromDiscardPileToHand(G, ctx, { protagonist: '0', cardID: targetCard });

        expect(G.discardPile).toContain(otherCard);
    });
});

// ─── reviveFromNursery ────────────────────────────────────────────────────────

describe('reviveFromNursery', () => {
    it('adds a baby unicorn from the nursery to the protagonist stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const babyID = G.deck.find(c => c.type === 'baby')!.id;
        G.nursery = [babyID];

        reviveFromNursery(G, ctx, { protagonist: '0', cardID: babyID });

        expect(G.stable['0']).toContain(babyID);
    });

    it('removes the revived baby from the nursery', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const babyID = G.deck.find(c => c.type === 'baby')!.id;
        G.nursery = [babyID];

        reviveFromNursery(G, ctx, { protagonist: '0', cardID: babyID });

        expect(G.nursery).not.toContain(babyID);
    });

    it('leaves the rest of the nursery intact when reviving one baby', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const babies = G.deck.filter(c => c.type === 'baby').slice(0, 2);
        const [babyA, babyB] = babies.map(c => c.id);
        G.nursery = [babyA, babyB];
        if (babyB === undefined) return; // not enough babies to test — skip

        reviveFromNursery(G, ctx, { protagonist: '0', cardID: babyA });

        expect(G.nursery).toContain(babyB);
    });
});

// ─── findReviveTarget ───────────────────────────────────────────────────────────────

describe('findReviveTarget', () => {
    it('returns unicorns of all subtypes (basic, unicorn, narwhal) for type=unicorn', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const basicID = G.deck.find(c => c.type === 'basic')!.id;
        const unicornID = G.deck.find(c => c.type === 'unicorn')!.id;
        G.discardPile = [basicID, unicornID];

        const targets = findReviveTarget(G, ctx, '0', { type: 'unicorn' });

        expect(targets.some(t => t.cardID === basicID)).toBe(true);
        expect(targets.some(t => t.cardID === unicornID)).toBe(true);
    });

    it('returns only basic unicorns for type=basic_unicorn', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const basicID = G.deck.find(c => c.type === 'basic')!.id;
        const unicornID = G.deck.find(c => c.type === 'unicorn')!.id;
        G.discardPile = [basicID, unicornID];

        const targets = findReviveTarget(G, ctx, '0', { type: 'basic_unicorn' });

        expect(targets.some(t => t.cardID === basicID)).toBe(true);
        expect(targets.every(t => t.cardID !== unicornID)).toBe(true);
    });

    it('excludes non-unicorn cards from the discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const magicID = G.deck.find(c => c.type === 'magic')!.id;
        G.discardPile = [magicID];

        const targets = findReviveTarget(G, ctx, '0', { type: 'unicorn' });

        expect(targets).toHaveLength(0);
    });
});

// ─── findAddFromDiscardPileToHand ──────────────────────────────────────────────

describe('findAddFromDiscardPileToHand', () => {
    it('finds neigh cards in the discard pile for type=neigh', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const neighID = G.deck.find(c => c.type === 'neigh')!.id;
        G.discardPile = [neighID];

        const targets = findAddFromDiscardPileToHand(G, ctx, '0', { type: 'neigh' });

        expect(targets.some(t => t.cardID === neighID)).toBe(true);
    });

    it('finds unicorn cards in the discard pile for type=unicorn', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const basicID = G.deck.find(c => c.type === 'basic')!.id;
        G.discardPile = [basicID];

        const targets = findAddFromDiscardPileToHand(G, ctx, '0', { type: 'unicorn' });

        expect(targets.some(t => t.cardID === basicID)).toBe(true);
    });

    it('does not return magic cards when searching for type=neigh', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const magicID = G.deck.find(c => c.type === 'magic')!.id;
        G.discardPile = [magicID];

        const targets = findAddFromDiscardPileToHand(G, ctx, '0', { type: 'neigh' });

        expect(targets).toHaveLength(0);
    });
});
