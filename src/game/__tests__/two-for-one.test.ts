import { enter } from '../operations/enter';
import { sacrifice } from '../operations/sacrifice';
import { destroy } from '../operations/destroy';
import { discard } from '../operations/discard';
import { draw } from '../operations/draw';
import { setupTestGame, createCtx, giveCardToStable, giveCardToHand } from '../testHelpers';

// ─── Two-For-One card ─────────────────────────────────────────────────────────
//
// The Two-For-One magic card on enter adds a mandatory scene with two actions:
//   1. SACRIFICE any card (from own stable)
//   2. DESTROY 2 any cards (from any stable)
//
// Tests below verify both the scene wiring and that the individual operations
// produce the expected side-effects (card counts, destination piles, etc.).

describe(`Two-For-One — scene added on enter`, () => {
    it('adds exactly one scene to the script when the card enters the stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;
        G.hand['0'] = [...G.hand['0'], twoForOne.id];

        enter(G, ctx, { playerID: '0', cardID: twoForOne.id });

        expect(G.script.scenes.length).toBe(1);
    });

    it('the added scene is mandatory', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;
        G.hand['0'] = [...G.hand['0'], twoForOne.id];

        enter(G, ctx, { playerID: '0', cardID: twoForOne.id });

        expect(G.script.scenes[0].mandatory).toBe(true);
    });

    it('the added scene contains exactly 2 actions (sacrifice + destroy)', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;
        G.hand['0'] = [...G.hand['0'], twoForOne.id];

        enter(G, ctx, { playerID: '0', cardID: twoForOne.id });

        expect(G.script.scenes[0].actions.length).toBe(2);
    });

    it('the first action in the scene is a sacrifice instruction', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;
        G.hand['0'] = [...G.hand['0'], twoForOne.id];

        enter(G, ctx, { playerID: '0', cardID: twoForOne.id });

        const firstInstruction = G.script.scenes[0].actions[0].instructions[0];
        expect(firstInstruction.do.key).toBe('sacrifice');
    });

    it('the second action in the scene is a destroy instruction', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;
        G.hand['0'] = [...G.hand['0'], twoForOne.id];

        enter(G, ctx, { playerID: '0', cardID: twoForOne.id });

        const secondInstruction = G.script.scenes[0].actions[1].instructions[0];
        expect(secondInstruction.do.key).toBe('destroy');
    });
});

// ─── sacrifice: stable count decreases by 1 ───────────────────────────────────

describe(`Two-For-One — sacrifice reduces own stable by 1`, () => {
    it('stable size decreases by exactly 1 after sacrifice', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '0', 'basic');
        giveCardToStable(G, '0', 'basic');
        const cardToSacrifice = giveCardToStable(G, '0', 'basic');
        const sizeBefore = G.stable['0'].length;

        sacrifice(G, ctx, { protagonist: '0', cardID: cardToSacrifice });

        expect(G.stable['0'].length).toBe(sizeBefore - 1);
    });

    it('the sacrificed card lands in the discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');

        sacrifice(G, ctx, { protagonist: '0', cardID });

        expect(G.discardPile).toContain(cardID);
    });
});

// ─── destroy: opponent stable count decreases by 1 ────────────────────────────

describe(`Two-For-One — destroy reduces opponent stable by 1`, () => {
    it("opponent stable size decreases by exactly 1 after destroy", () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '1', 'basic');
        giveCardToStable(G, '1', 'basic');
        const target = giveCardToStable(G, '1', 'basic');
        const sizeBefore = G.stable['1'].length;

        destroy(G, ctx, { protagonist: '0', cardID: target });

        expect(G.stable['1'].length).toBe(sizeBefore - 1);
    });

    it('destroying 2 opponent cards reduces opponent stable by 2', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const target1 = giveCardToStable(G, '1', 'basic');
        const target2 = giveCardToStable(G, '1', 'basic');
        const sizeBefore = G.stable['1'].length;

        destroy(G, ctx, { protagonist: '0', cardID: target1 });
        destroy(G, ctx, { protagonist: '0', cardID: target2 });

        expect(G.stable['1'].length).toBe(sizeBefore - 2);
    });

    it('own stable is unaffected when destroying opponent cards', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const ownCard = giveCardToStable(G, '0', 'basic');
        const opponentCard = giveCardToStable(G, '1', 'basic');

        destroy(G, ctx, { protagonist: '0', cardID: opponentCard });

        expect(G.stable['0']).toContain(ownCard);
    });
});

// ─── discard: hand count decreases by 1 ──────────────────────────────────────

describe(`Two-For-One — discard reduces hand by 1`, () => {
    it('hand size decreases by exactly 1 after discard', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToHand(G, '0', 'basic');
        const handSizeBefore = G.hand['0'].length;

        discard(G, ctx, { protagonist: '0', cardID });

        expect(G.hand['0'].length).toBe(handSizeBefore - 1);
    });

    it('the discarded card lands in the discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToHand(G, '0', 'basic');

        discard(G, ctx, { protagonist: '0', cardID });

        expect(G.discardPile).toContain(cardID);
    });
});

// ─── draw: draw pile count decreases by 1 ────────────────────────────────────

describe(`Two-For-One — draw reduces draw pile by 1`, () => {
    it('draw pile size decreases by exactly 1 after drawing 1 card', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const pileSizeBefore = G.drawPile.length;

        draw(G, ctx, { protagonist: '0', count: 1 });

        expect(G.drawPile.length).toBe(pileSizeBefore - 1);
    });

    it("drawn card is added to the player's hand", () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const topCard = G.drawPile[0];

        draw(G, ctx, { protagonist: '0', count: 1 });

        expect(G.hand['0']).toContain(topCard);
    });
});

// ─── win condition ────────────────────────────────────────────────────────────

describe(`Two-For-One — win condition`, () => {
    it('a player who fills their stable to 7 unicorns wins the game', () => {
        const G = setupTestGame();
        const ctx = createCtx({ currentPlayer: '0' });
        // Fill stable to the winning threshold (7)
        for (let i = 0; i < 7; i++) {
            giveCardToStable(G, '0', 'basic');
        }

        const UnstableUnicorns = require('../game').default;
        const endIf = (UnstableUnicorns as any).endIf as Function;

        expect(endIf(G, ctx)).toEqual({ winner: '0' });
    });

    it('a player with 6 unicorns does not win yet', () => {
        const G = setupTestGame();
        const ctx = createCtx({ currentPlayer: '0' });
        for (let i = 0; i < 6; i++) {
            giveCardToStable(G, '0', 'basic');
        }

        const UnstableUnicorns = require('../game').default;
        const endIf = (UnstableUnicorns as any).endIf as Function;

        expect(endIf(G, ctx)).toBeUndefined();
    });
});
