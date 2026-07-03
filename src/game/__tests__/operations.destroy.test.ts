import { destroy, findDestroyTargets } from '../operations/destroy';
import { enter } from '../operations/enter';
import { setupTestGame, createCtx, giveCardToStable, giveCardToUpgradeStable } from '../testHelpers';

// ─── destroy ──────────────────────────────────────────────────────────────────

describe('destroy', () => {
    it("removes the card from the target player's stable", () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '1', 'basic');

        destroy(G, ctx, { protagonist: '0', cardID });

        expect(G.stable['1']).not.toContain(cardID);
    });

    it("decreases the opponent's stable size by exactly 1", () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '1', 'basic');
        const sizeBefore = G.stable['1'].length;

        destroy(G, ctx, { protagonist: '0', cardID });

        expect(G.stable['1'].length).toBe(sizeBefore - 1);
    });

    it('adds the destroyed card to the discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '1', 'basic');

        destroy(G, ctx, { protagonist: '0', cardID });

        expect(G.discardPile).toContain(cardID);
    });

    it('sends a destroyed baby unicorn to the nursery instead of discard', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const babyID = G.deck.find(c => c.type === 'baby')!.id;
        G.stable['1'] = [...G.stable['1'], babyID];

        destroy(G, ctx, { protagonist: '0', cardID: babyID });

        expect(G.nursery).toContain(babyID);
        expect(G.discardPile).not.toContain(babyID);
    });

    it('leaves the rest of the opponent stable intact when one card is destroyed', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardA = giveCardToStable(G, '1', 'basic');
        const cardB = giveCardToStable(G, '1', 'basic');

        destroy(G, ctx, { protagonist: '0', cardID: cardA });

        expect(G.stable['1']).not.toContain(cardA);
        expect(G.stable['1']).toContain(cardB);
    });

    it('does not touch the protagonist stable when destroying an opponent card', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const ownCard = giveCardToStable(G, '0', 'basic');
        const opponentCard = giveCardToStable(G, '1', 'basic');

        destroy(G, ctx, { protagonist: '0', cardID: opponentCard });

        expect(G.stable['0']).toContain(ownCard);
    });

    it('removes an upgrade card from upgradeDowngradeStable and discards it', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToUpgradeStable(G, '1', 'upgrade');

        destroy(G, ctx, { protagonist: '0', cardID });

        expect(G.upgradeDowngradeStable['1']).not.toContain(cardID);
        expect(G.discardPile).toContain(cardID);
    });

    it(`returns a "return_to_hand" card to the owner's hand instead of the discard pile`, () => {
        // Greedy/Majestic/Swift/Annoying Flying Unicorn have this trigger
        const G = setupTestGame();
        const ctx = createCtx();
        const cardWithReturnToHand = G.deck.find(
            c => c.on?.some(o => o.trigger === 'this_destroyed_or_sacrificed' && o.do.type === 'return_to_hand')
        )!;
        G.stable['1'] = [...G.stable['1'], cardWithReturnToHand.id];

        destroy(G, ctx, { protagonist: '0', cardID: cardWithReturnToHand.id });

        expect(G.stable['1']).not.toContain(cardWithReturnToHand.id);
        expect(G.discardPile).not.toContain(cardWithReturnToHand.id);
        expect(G.hand['1']).toContain(cardWithReturnToHand.id);
    });

    it('adds a follow-up scene when a destroyed card has a destroyed_or_sacrificed add_scene trigger', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardWithAddScene = G.deck.find(c => c.type === 'basic')!;
        G.deck[cardWithAddScene.id] = {
            ...cardWithAddScene,
            on: [{
                trigger: 'this_destroyed_or_sacrificed',
                do: {
                    type: 'add_scene',
                    info: {
                        actions: [{
                            instructions: [{
                                protagonist: 'owner',
                                do: { key: 'draw', info: { count: 1 } },
                                ui: { type: 'click_on_drawPile' },
                            }]
                        }],
                        mandatory: true,
                        endTurnImmediately: false,
                    }
                }
            }],
        };
        G.stable['1'] = [...G.stable['1'], cardWithAddScene.id];

        destroy(G, ctx, { protagonist: '0', cardID: cardWithAddScene.id });

        expect(G.script.scenes.length).toBeGreaterThan(0);
    });
});

// ─── findDestroyTargets ───────────────────────────────────────────────────────

describe('findDestroyTargets', () => {
    it('returns all unicorns across all players for type=unicorn', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '0', 'basic');
        giveCardToStable(G, '1', 'basic');

        const targets = findDestroyTargets(G, ctx, '0', { type: 'unicorn' }, undefined);

        expect(targets.length).toBeGreaterThanOrEqual(2);
    });

    it('returns only upgrade cards for type=upgrade', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToUpgradeStable(G, '1', 'upgrade');

        const targets = findDestroyTargets(G, ctx, '0', { type: 'upgrade' }, undefined);

        expect(targets.length).toBeGreaterThanOrEqual(1);
        targets.forEach(t => {
            expect(['upgrade']).toContain(G.deck[t.cardID].type);
        });
    });

    it('returns empty when no unicorns are in any stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.players.forEach(p => { G.stable[p.id] = []; });

        const targets = findDestroyTargets(G, ctx, '0', { type: 'unicorn' }, undefined);

        expect(targets).toHaveLength(0);
    });

    it('returns own downgrades and other upgrades for type=my_downgrade_other_upgrade', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const ownDowngrade = giveCardToUpgradeStable(G, '0', 'downgrade');
        const opponentUpgrade = giveCardToUpgradeStable(G, '1', 'upgrade');

        const targets = findDestroyTargets(G, ctx, '0', { type: 'my_downgrade_other_upgrade' }, undefined);
        const targetIDs = targets.map(t => t.cardID);

        expect(targetIDs).toContain(ownDowngrade);
        expect(targetIDs).toContain(opponentUpgrade);
    });

    it('returns stable cards and upgrade cards for type=any', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const unicornID = giveCardToStable(G, '1', 'basic');
        const upgradeID = giveCardToUpgradeStable(G, '1', 'upgrade');

        const targets = findDestroyTargets(G, ctx, '0', { type: 'any' }, undefined);
        const targetIDs = targets.map(t => t.cardID);

        expect(targetIDs).toContain(unicornID);
        expect(targetIDs).toContain(upgradeID);
    });

    it('excludes protected unicorns from type=any when the source card is magic', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const protectedCard = G.deck.find(c =>
            (c.type === 'unicorn' || c.type === 'basic') && c.passive?.includes('cannot_be_destroyed_by_magic')
        )!;
        const magicSource = G.deck.find(c => c.type === 'magic')!;
        G.stable['1'] = [...G.stable['1'], protectedCard.id];

        const targets = findDestroyTargets(G, ctx, '0', { type: 'any' }, magicSource.id);

        expect(targets.some(t => t.cardID === protectedCard.id)).toBe(false);
    });
});
