import {
    returnToHand, findReturnToHandTargets,
    bringToStable, findBringToStableTargets, canBringToStableTargets,
    move, move2, findMoveTargets, findMoveTargets2,
    backKick, findBackKickTargets,
} from '../operations/move';
import { setupTestGame, createCtx, giveCardToStable, giveCardToUpgradeStable, giveCardToHand } from '../testHelpers';

// ─── returnToHand ─────────────────────────────────────────────────────────────

describe('returnToHand', () => {
    it('moves a unicorn from an opponent stable back to their hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '1', 'basic');

        returnToHand(G, ctx, { protagonist: '0', cardID });

        expect(G.stable['1']).not.toContain(cardID);
        expect(G.hand['1']).toContain(cardID);
    });

    it('sends a baby unicorn to the nursery (not hand) when returned', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const babyID = G.deck.find(c => c.type === 'baby')!.id;
        G.stable['1'] = [...G.stable['1'], babyID];

        returnToHand(G, ctx, { protagonist: '0', cardID: babyID });

        expect(G.nursery).toContain(babyID);
        expect(G.hand['1']).not.toContain(babyID);
    });

    it('moves an upgrade card from the stable back to its owner hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToUpgradeStable(G, '1', 'upgrade');

        returnToHand(G, ctx, { protagonist: '0', cardID });

        expect(G.upgradeDowngradeStable['1']).not.toContain(cardID);
        expect(G.hand['1']).toContain(cardID);
    });

    it('moves a downgrade card from the stable back to its owner hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToUpgradeStable(G, '1', 'downgrade');

        returnToHand(G, ctx, { protagonist: '0', cardID });

        expect(G.upgradeDowngradeStable['1']).not.toContain(cardID);
        expect(G.hand['1']).toContain(cardID);
    });
});

// ─── findReturnToHandTargets ──────────────────────────────────────────────────

describe('findReturnToHandTargets', () => {
    it('returns all cards from opponent stables for who=another', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const unicornID = giveCardToStable(G, '1', 'basic');
        const upgradeID = giveCardToUpgradeStable(G, '1', 'upgrade');

        const targets = findReturnToHandTargets(G, ctx, '0', { who: 'another' });

        expect(targets.some(t => t.cardID === unicornID)).toBe(true);
        expect(targets.some(t => t.cardID === upgradeID)).toBe(true);
    });

    it('does not include the protagonist own cards for who=another', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const ownCard = giveCardToStable(G, '0', 'basic');

        const targets = findReturnToHandTargets(G, ctx, '0', { who: 'another' });

        expect(targets.every(t => t.cardID !== ownCard)).toBe(true);
    });

    it('returns empty when all opponent stables are empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.stable['1'] = [];
        G.upgradeDowngradeStable['1'] = [];

        const targets = findReturnToHandTargets(G, ctx, '0', { who: 'another' });

        expect(targets).toHaveLength(0);
    });
});

// ─── bringToStable ────────────────────────────────────────────────────────────

describe('bringToStable', () => {
    it('moves a basic unicorn from hand directly into the protagonist stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToHand(G, '0', 'basic');

        bringToStable(G, ctx, { protagonist: '0', cardID });

        expect(G.stable['0']).toContain(cardID);
        expect(G.hand['0']).not.toContain(cardID);
    });
});

// ─── findBringToStableTargets ─────────────────────────────────────────────────

describe('findBringToStableTargets', () => {
    it('returns basic unicorns from hand for type=basic_unicorn', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToHand(G, '0', 'basic');

        const targets = findBringToStableTargets(G, ctx, '0', { type: 'basic_unicorn' });

        expect(targets.some(t => t.cardID === cardID)).toBe(true);
    });

    it('does not return non-basic cards for type=basic_unicorn', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        // Clear hand and add only a magic card
        G.hand['0'] = [];
        giveCardToHand(G, '0', 'magic');

        const targets = findBringToStableTargets(G, ctx, '0', { type: 'basic_unicorn' });

        expect(targets).toHaveLength(0);
    });

    it('returns empty when hand is empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['0'] = [];

        const targets = findBringToStableTargets(G, ctx, '0', { type: 'basic_unicorn' });

        expect(targets).toHaveLength(0);
    });
});

// ─── move + move2 ─────────────────────────────────────────────────────────────

describe('move', () => {
    it('removes the card from the original stable and stores it in the clipboard', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToUpgradeStable(G, '1', 'upgrade');

        move(G, ctx, { cardID, protagonist: '0' });

        expect(G.upgradeDowngradeStable['1']).not.toContain(cardID);
        expect(G.clipboard.move?.cardID).toBe(cardID);
    });

    it('records the original owner in the clipboard', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToUpgradeStable(G, '1', 'upgrade');

        move(G, ctx, { cardID, protagonist: '0' });

        expect(G.clipboard.move?.from).toBe('1');
    });
});

describe('move2', () => {
    it('places the clipboard card into the target player stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToUpgradeStable(G, '1', 'upgrade');

        move(G, ctx, { cardID, protagonist: '0' });
        move2(G, ctx, { playerID: '0' });

        expect(G.upgradeDowngradeStable['0']).toContain(cardID);
    });
});

// ─── findMoveTargets ──────────────────────────────────────────────────────────

describe('findMoveTargets', () => {
    it('returns upgrade/downgrade cards across all players', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const upgradeID = giveCardToUpgradeStable(G, '1', 'upgrade');
        const downgradeID = giveCardToUpgradeStable(G, '0', 'downgrade');

        const targets = findMoveTargets(G, ctx, '0', {} as any);

        expect(targets.some(t => t.cardID === upgradeID)).toBe(true);
        expect(targets.some(t => t.cardID === downgradeID)).toBe(true);
    });

    it('returns empty when no upgrade/downgrade cards are in play', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findMoveTargets(G, ctx, '0', {} as any);

        expect(targets).toHaveLength(0);
    });
});

// ─── findMoveTargets2 ─────────────────────────────────────────────────────────

describe('findMoveTargets2', () => {
    it('excludes both the protagonist and the original card owner', () => {
        // With only 2 players (0 as protagonist, 1 as original owner) the result must be empty.
        const G = setupTestGame(2);
        const ctx = createCtx({ numPlayers: 2 });
        const cardID = giveCardToUpgradeStable(G, '1', 'upgrade');
        move(G, ctx, { cardID, protagonist: '0' });

        const targets = findMoveTargets2(G, ctx, '0');

        // from='1' and protagonist='0' are both excluded → no remaining players
        expect(targets).toHaveLength(0);
    });
});

// ─── backKick ─────────────────────────────────────────────────────────────────

describe('backKick', () => {
    it('returns the card from the opponent stable to their hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '1', 'basic');

        backKick(G, ctx, { protagonist: '0', cardID });

        expect(G.stable['1']).not.toContain(cardID);
        expect(G.hand['1']).toContain(cardID);
    });

    it('creates a mandatory discard scene for the card owner', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '1', 'basic');
        const scenesBefore = G.script.scenes.length;

        backKick(G, ctx, { protagonist: '0', cardID });

        expect(G.script.scenes.length).toBeGreaterThan(scenesBefore);
        const addedScene = G.script.scenes[G.script.scenes.length - 1];
        expect(addedScene.mandatory).toBe(true);
        expect(addedScene.actions[0].instructions[0].protagonist).toBe('1');
    });
});

// ─── findBackKickTargets ──────────────────────────────────────────────────────

describe('findBackKickTargets', () => {
    it('returns unicorn cards from opponent stables', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const unicornID = giveCardToStable(G, '1', 'basic');

        const targets = findBackKickTargets(G, ctx, '0');

        expect(targets.some(t => t.cardID === unicornID)).toBe(true);
    });

    it('returns upgrade cards from opponent upgradeDowngradeStables', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const upgradeID = giveCardToUpgradeStable(G, '1', 'upgrade');

        const targets = findBackKickTargets(G, ctx, '0');

        expect(targets.some(t => t.cardID === upgradeID)).toBe(true);
    });

    it('does not include any of the protagonist own cards', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const ownCard = giveCardToStable(G, '0', 'basic');

        const targets = findBackKickTargets(G, ctx, '0');

        expect(targets.every(t => t.cardID !== ownCard)).toBe(true);
    });

    it('returns empty when opponents have no cards in play', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.stable['1'] = [];
        G.upgradeDowngradeStable['1'] = [];

        const targets = findBackKickTargets(G, ctx, '0');

        expect(targets).toHaveLength(0);
    });
});

// ─── canBringToStableTargets ──────────────────────────────────────────────────

describe('canBringToStableTargets', () => {
    it('returns true when a basic unicorn is in hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToHand(G, '0', 'basic');

        expect(canBringToStableTargets(G, ctx, '0', { type: 'basic_unicorn' })).toBe(true);
    });

    it('returns false when hand is empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['0'] = [];

        expect(canBringToStableTargets(G, ctx, '0', { type: 'basic_unicorn' })).toBe(false);
    });

    it('returns false when hand contains only non-basic cards', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['0'] = [];
        giveCardToHand(G, '0', 'magic');

        expect(canBringToStableTargets(G, ctx, '0', { type: 'basic_unicorn' })).toBe(false);
    });
});
