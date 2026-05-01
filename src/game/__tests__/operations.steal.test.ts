import { steal, pull, findPullTargets, findStealTargets } from '../operations/steal';
import { pullRandom } from '../operations/misc';
import { setupTestGame, createCtx, giveCardToStable, giveCardToUpgradeStable, giveCardToHand } from '../testHelpers';

// ─── steal ────────────────────────────────────────────────────────────────────

describe('steal', () => {
    it('moves the target card from the opponent stable into the protagonist stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '1', 'basic');

        steal(G, ctx, { protagonist: '0', cardID });

        expect(G.stable['1']).not.toContain(cardID);
        expect(G.stable['0']).toContain(cardID);
    });

    it('leaves the opponent stable otherwise intact', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardA = giveCardToStable(G, '1', 'basic');
        const cardB = giveCardToStable(G, '1', 'basic');

        steal(G, ctx, { protagonist: '0', cardID: cardA });

        expect(G.stable['1']).not.toContain(cardA);
        expect(G.stable['1']).toContain(cardB);
    });

    it('does not add the card to the discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '1', 'basic');

        steal(G, ctx, { protagonist: '0', cardID });

        expect(G.discardPile).not.toContain(cardID);
    });

    it('moves an upgrade card from the opponent upgrade stable into the protagonist upgrade stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToUpgradeStable(G, '1', 'upgrade');

        steal(G, ctx, { protagonist: '0', cardID });

        expect(G.upgradeDowngradeStable['1']).not.toContain(cardID);
        expect(G.upgradeDowngradeStable['0']).toContain(cardID);
    });
});

// ─── findPullTargets ──────────────────────────────────────────────────────────

describe('findPullTargets', () => {
    it('returns players other than the protagonist who have cards in hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findPullTargets(G, ctx, '0');

        expect(targets.some(t => t.playerID === '1')).toBe(true);
        expect(targets.every(t => t.playerID !== '0')).toBe(true);
    });

    it('excludes players with empty hands', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['1'] = [];

        const targets = findPullTargets(G, ctx, '0');

        expect(targets.every(t => t.playerID !== '1')).toBe(true);
    });

    it('returns empty when all other players have empty hands', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['1'] = [];

        const targets = findPullTargets(G, ctx, '0');

        expect(targets).toHaveLength(0);
    });
});

// ─── findStealTargets ────────────────────────────────────────────────────────────────

describe('findStealTargets', () => {
    it('returns opponent unicorns for type=unicorn', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const unicornID = giveCardToStable(G, '1', 'basic');

        const targets = findStealTargets(G, ctx, '0', { type: 'unicorn' });

        expect(targets.some(t => t.cardID === unicornID)).toBe(true);
    });

    it('returns upgrade cards from opponent upgradeDowngradeStable for type=upgrade', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const upgradeID = giveCardToUpgradeStable(G, '1', 'upgrade');

        const targets = findStealTargets(G, ctx, '0', { type: 'upgrade' });

        expect(targets.some(t => t.cardID === upgradeID)).toBe(true);
    });

    it('does not return own upgrade cards for type=upgrade', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const ownUpgrade = giveCardToUpgradeStable(G, '0', 'upgrade');

        const targets = findStealTargets(G, ctx, '0', { type: 'upgrade' });

        expect(targets.every(t => t.cardID !== ownUpgrade)).toBe(true);
    });

    it('returns empty for type=unicorn when all opponent stables are empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.stable['1'] = [];

        const targets = findStealTargets(G, ctx, '0', { type: 'unicorn' });

        expect(targets).toHaveLength(0);
    });

    it('filters unicorn swap targets to the selected target player only', () => {
        const G = setupTestGame(3);
        const ctx = createCtx({ numPlayers: 3, playOrder: ['0', '1', '2'] });
        const playerOneCard = giveCardToStable(G, '1', 'basic');
        const playerTwoCard = giveCardToStable(G, '2', 'basic');
        G.clipboard.unicornSwap = { targetPlayer: '2', cardIDToMove: playerOneCard } as any;

        const targets = findStealTargets(G, ctx, '0', { type: 'unicorn', unicornSwap: true });
        const targetIDs = targets.map(t => t.cardID);

        expect(targetIDs).not.toContain(playerOneCard);
        expect(targetIDs).toContain(playerTwoCard);
    });

    it('excludes unicorn steal targets when the protagonist stable is already full', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        for (let i = 0; i < 7; i++) {
            giveCardToStable(G, '0', 'basic');
        }
        giveCardToStable(G, '1', 'basic');

        const targets = findStealTargets(G, ctx, '0', { type: 'unicorn' });

        expect(targets).toHaveLength(0);
    });
});

// ─── pull ─────────────────────────────────────────────────────────────────────

describe('pull', () => {
    it('moves the card at the given index from the opponent hand to the protagonist hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToHand(G, '1', 'basic');

        pull(G, ctx, { protagonist: '0', from: '1', handIndex: G.hand['1'].indexOf(cardID) });

        expect(G.hand['0']).toContain(cardID);
        expect(G.hand['1']).not.toContain(cardID);
    });

    it("decreases the opponent's hand size by 1", () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToHand(G, '1', 'basic');
        const sizeBefore = G.hand['1'].length;

        pull(G, ctx, { protagonist: '0', from: '1', handIndex: 0 });

        expect(G.hand['1'].length).toBe(sizeBefore - 1);
    });

    it('is a no-op when the hand index is out of range', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['1'] = [];
        const hand0Before = [...G.hand['0']];

        pull(G, ctx, { protagonist: '0', from: '1', handIndex: 0 });

        expect(G.hand['0']).toEqual(hand0Before);
    });
});

// ─── pullRandom ───────────────────────────────────────────────────────────────

describe('pullRandom', () => {
    it('moves exactly one card from the target hand to the protagonist hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToHand(G, '1', 'basic');
        const hand0SizeBefore = G.hand['0'].length;
        const hand1SizeBefore = G.hand['1'].length;

        pullRandom(G, ctx, { protagonist: '0', playerID: '1' });

        expect(G.hand['0'].length).toBe(hand0SizeBefore + 1);
        expect(G.hand['1'].length).toBe(hand1SizeBefore - 1);
    });

    it('does not change total card count in the two hands combined', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToHand(G, '1', 'basic');
        const totalBefore = G.hand['0'].length + G.hand['1'].length;

        pullRandom(G, ctx, { protagonist: '0', playerID: '1' });

        expect(G.hand['0'].length + G.hand['1'].length).toBe(totalBefore);
    });
});
