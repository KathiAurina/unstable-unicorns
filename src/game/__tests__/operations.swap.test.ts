import {
    swapHands, findSwapHandsTargets,
    shakeUp,
    reset,
    shuffleDiscardPileIntoDrawPile,
    unicornSwap1, unicornSwap2,
    findUnicornSwap1Targets, findUnicornSwap2Targets,
} from '../operations/swap';
import { setupTestGame, createCtx, giveCardToStable, giveCardToUpgradeStable, giveCardToHand } from '../testHelpers';

// ─── swapHands ────────────────────────────────────────────────────────────────

describe('swapHands', () => {
    it('exchanges the full hand contents between the two players', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const hand0Before = [...G.hand['0']];
        const hand1Before = [...G.hand['1']];

        swapHands(G, ctx, { protagonist: '0', playerID: '1' });

        expect(G.hand['0']).toEqual(hand1Before);
        expect(G.hand['1']).toEqual(hand0Before);
    });

    it('leaves both hands with the same total card count as before', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const totalBefore = G.hand['0'].length + G.hand['1'].length;

        swapHands(G, ctx, { protagonist: '0', playerID: '1' });

        expect(G.hand['0'].length + G.hand['1'].length).toBe(totalBefore);
    });

    it('swapping twice restores the original hands', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const original0 = [...G.hand['0']];

        swapHands(G, ctx, { protagonist: '0', playerID: '1' });
        swapHands(G, ctx, { protagonist: '0', playerID: '1' });

        expect(G.hand['0']).toEqual(original0);
    });
});

// ─── findSwapHandsTargets ─────────────────────────────────────────────────────

describe('findSwapHandsTargets', () => {
    it('returns all players except the protagonist', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findSwapHandsTargets(G, ctx, '0');

        expect(targets.every(t => t.playerID !== '0')).toBe(true);
        expect(targets.some(t => t.playerID === '1')).toBe(true);
    });

    it('returns exactly numPlayers - 1 targets', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findSwapHandsTargets(G, ctx, '0');

        expect(targets).toHaveLength(G.players.length - 1);
    });
});

// ─── shakeUp ──────────────────────────────────────────────────────────────────

describe('shakeUp', () => {
    it('gives the protagonist exactly 5 cards in hand after the shake-up', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        // Use a card that was removed from the draw pile so it isn't doubled in the pool.
        const sourceCardID = giveCardToHand(G, '0', 'magic');
        G.hand['0'] = G.hand['0'].filter(id => id !== sourceCardID); // simulate it was "played"

        shakeUp(G, ctx, { protagonist: '0', sourceCardID });

        expect(G.hand['0']).toHaveLength(5);
    });

    it('empties the discard pile after the shake-up', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const sourceCardID = giveCardToHand(G, '0', 'magic');
        G.hand['0'] = G.hand['0'].filter(id => id !== sourceCardID);
        G.discardPile = [G.drawPile.pop()!];

        shakeUp(G, ctx, { protagonist: '0', sourceCardID });

        expect(G.discardPile).toHaveLength(0);
    });

    it('the sourceCard ends up somewhere in the combined card pool after the shake-up', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const sourceCardID = giveCardToHand(G, '0', 'magic');
        G.hand['0'] = G.hand['0'].filter(id => id !== sourceCardID);

        shakeUp(G, ctx, { protagonist: '0', sourceCardID });

        const allCards = [...G.hand['0'], ...G.drawPile];
        expect(allCards).toContain(sourceCardID);
    });
});

// ─── shuffleDiscardPileIntoDrawPile ───────────────────────────────────────────

describe('shuffleDiscardPileIntoDrawPile', () => {
    it('merges all discard pile cards into the draw pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const discardCards = G.drawPile.splice(0, 5);
        G.discardPile = discardCards;
        const totalBefore = G.drawPile.length + discardCards.length;

        shuffleDiscardPileIntoDrawPile(G, ctx, null);

        expect(G.drawPile).toHaveLength(totalBefore);
    });

    it('empties the discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.discardPile = [G.drawPile.pop()!];

        shuffleDiscardPileIntoDrawPile(G, ctx, null);

        expect(G.discardPile).toHaveLength(0);
    });

    it('is a no-op when the discard pile is already empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.discardPile = [];
        const pileSizeBefore = G.drawPile.length;

        shuffleDiscardPileIntoDrawPile(G, ctx, null);

        expect(G.drawPile).toHaveLength(pileSizeBefore);
        expect(G.discardPile).toHaveLength(0);
    });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe('reset', () => {
    it('clears all upgrade/downgrade cards from every player stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToUpgradeStable(G, '0', 'upgrade');
        giveCardToUpgradeStable(G, '1', 'downgrade');

        reset(G, ctx, { protagonist: '0' });

        expect(G.upgradeDowngradeStable['0']).toHaveLength(0);
        expect(G.upgradeDowngradeStable['1']).toHaveLength(0);
    });

    it('empties the discard pile by merging it into the draw pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.discardPile = [G.drawPile.pop()!];

        reset(G, ctx, { protagonist: '0' });

        expect(G.discardPile).toHaveLength(0);
    });
});

// ─── unicornSwap1 + unicornSwap2 ──────────────────────────────────────────────

describe('unicornSwap1', () => {
    it('removes the chosen unicorn from the protagonist stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');

        unicornSwap1(G, ctx, { protagonist: '0', cardID });

        expect(G.stable['0']).not.toContain(cardID);
    });

    it('stores the card ID in the clipboard', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');

        unicornSwap1(G, ctx, { protagonist: '0', cardID });

        expect(G.clipboard.unicornSwap?.cardIDToMove).toBe(cardID);
    });
});

describe('unicornSwap2', () => {
    it('places the clipboard unicorn into the target player stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');

        unicornSwap1(G, ctx, { protagonist: '0', cardID });
        unicornSwap2(G, ctx, { protagonist: '0', playerID: '1' });

        expect(G.stable['1']).toContain(cardID);
    });

    it('records the target player in the clipboard', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');

        unicornSwap1(G, ctx, { protagonist: '0', cardID });
        unicornSwap2(G, ctx, { protagonist: '0', playerID: '1' });

        expect(G.clipboard.unicornSwap?.targetPlayer).toBe('1');
    });
});

// ─── findUnicornSwap1Targets ──────────────────────────────────────────────────

describe('findUnicornSwap1Targets', () => {
    it('returns own unicorns in stable when pandamonium is not active', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');

        const targets = findUnicornSwap1Targets(G, ctx, '0');

        expect(targets.some(t => t.cardID === cardID)).toBe(true);
    });

    it('returns empty when pandamonium is active for the protagonist', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '0', 'basic');
        G.playerEffects['0'] = [{ effect: { key: 'pandamonium' } }];

        const targets = findUnicornSwap1Targets(G, ctx, '0');

        expect(targets).toHaveLength(0);
    });

    it('returns empty when the protagonist stable is empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.stable['0'] = [];

        const targets = findUnicornSwap1Targets(G, ctx, '0');

        expect(targets).toHaveLength(0);
    });
});

// ─── findUnicornSwap2Targets ──────────────────────────────────────────────────

describe('findUnicornSwap2Targets', () => {
    it('returns all players except the protagonist', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findUnicornSwap2Targets(G, ctx, '0');

        expect(targets.every(t => t.playerID !== '0')).toBe(true);
        expect(targets.some(t => t.playerID === '1')).toBe(true);
    });

    it('returns exactly numPlayers - 1 targets', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findUnicornSwap2Targets(G, ctx, '0');

        expect(targets).toHaveLength(G.players.length - 1);
    });
});
