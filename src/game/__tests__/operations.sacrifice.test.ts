import { sacrifice } from '../operations/sacrifice';
import { setupTestGame, createCtx, giveCardToStable, giveCardToUpgradeStable } from '../testHelpers';

// ─── sacrifice ────────────────────────────────────────────────────────────────

describe('sacrifice', () => {
    it('removes a unicorn card from own stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');

        sacrifice(G, ctx, { protagonist: '0', cardID });

        expect(G.stable['0']).not.toContain(cardID);
    });

    it('adds the sacrificed unicorn to the discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');

        sacrifice(G, ctx, { protagonist: '0', cardID });

        expect(G.discardPile).toContain(cardID);
    });

    it('sends a sacrificed baby unicorn to the nursery instead of discard', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const babyID = G.deck.find(c => c.type === 'baby')!.id;
        G.stable['0'] = [...G.stable['0'], babyID];

        sacrifice(G, ctx, { protagonist: '0', cardID: babyID });

        expect(G.nursery).toContain(babyID);
        expect(G.discardPile).not.toContain(babyID);
    });

    it('removes an upgrade card from upgradeDowngradeStable and discards it', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToUpgradeStable(G, '0', 'upgrade');

        sacrifice(G, ctx, { protagonist: '0', cardID });

        expect(G.upgradeDowngradeStable['0']).not.toContain(cardID);
        expect(G.discardPile).toContain(cardID);
    });

    it('removes a downgrade card from upgradeDowngradeStable and discards it', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToUpgradeStable(G, '0', 'downgrade');

        sacrifice(G, ctx, { protagonist: '0', cardID });

        expect(G.upgradeDowngradeStable['0']).not.toContain(cardID);
        expect(G.discardPile).toContain(cardID);
    });

    it('leaves the rest of the stable intact when sacrificing one card', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardA = giveCardToStable(G, '0', 'basic');
        const cardB = giveCardToStable(G, '0', 'basic');

        sacrifice(G, ctx, { protagonist: '0', cardID: cardA });

        expect(G.stable['0']).not.toContain(cardA);
        expect(G.stable['0']).toContain(cardB);
    });

    it('does not touch the other player stable when sacrificing own card', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const ownCard = giveCardToStable(G, '0', 'basic');
        const opponentCard = giveCardToStable(G, '1', 'basic');

        sacrifice(G, ctx, { protagonist: '0', cardID: ownCard });

        expect(G.stable['1']).toContain(opponentCard);
    });

    it('findSacrificeTargets returns empty for type=unicorn when stable is empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.stable['0'] = [];

        const { findSacrificeTargets } = require('../operations/sacrifice');
        const targets = findSacrificeTargets(G, ctx, '0', { type: 'unicorn' });
        expect(targets).toHaveLength(0);
    });

    it('findSacrificeTargets returns empty for type=downgrade when upgradeDowngradeStable has only upgrades', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToUpgradeStable(G, '0', 'upgrade');

        const { findSacrificeTargets } = require('../operations/sacrifice');
        const targets = findSacrificeTargets(G, ctx, '0', { type: 'downgrade' });
        expect(targets).toHaveLength(0);
    });

    it('returns a return_to_hand card to the owner hand when it is sacrificed', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardWithReturnToHand = G.deck.find(
            c => c.on?.some(o => o.trigger === 'this_destroyed_or_sacrificed' && o.do.type === 'return_to_hand')
        )!;
        G.stable['0'] = [...G.stable['0'], cardWithReturnToHand.id];

        sacrifice(G, ctx, { protagonist: '0', cardID: cardWithReturnToHand.id });

        expect(G.discardPile).not.toContain(cardWithReturnToHand.id);
        expect(G.hand['0']).toContain(cardWithReturnToHand.id);
    });

    it('adds a follow-up scene when a sacrificed card has a destroyed_or_sacrificed add_scene trigger', () => {
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
        G.stable['0'] = [...G.stable['0'], cardWithAddScene.id];

        sacrifice(G, ctx, { protagonist: '0', cardID: cardWithAddScene.id });

        expect(G.script.scenes.length).toBeGreaterThan(0);
    });

    it('findSacrificeTargets for type=any excludes stable unicorns under pandamonium, but keeps upgrades', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const unicornID = giveCardToStable(G, '0', 'basic');
        const babyID = G.deck.find(c => c.type === 'baby')!.id;
        const upgradeID = giveCardToUpgradeStable(G, '0', 'upgrade');
        G.stable['0'] = [...G.stable['0'], babyID];
        G.playerEffects['0'] = [{ effect: { key: 'pandamonium' } }];

        const { findSacrificeTargets } = require('../operations/sacrifice');
        const targets = findSacrificeTargets(G, ctx, '0', { type: 'any' });
        const targetIDs = targets.map((target: { cardID: number }) => target.cardID);

        expect(targetIDs).not.toContain(unicornID);
        expect(targetIDs).not.toContain(babyID);
        expect(targetIDs).toContain(upgradeID);
    });

    it('findSacrificeTargets for type=any includes unicorns when pandamonium is not active', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const unicornID = giveCardToStable(G, '0', 'basic');
        const downgradeID = giveCardToUpgradeStable(G, '0', 'downgrade');

        const { findSacrificeTargets } = require('../operations/sacrifice');
        const targets = findSacrificeTargets(G, ctx, '0', { type: 'any' });
        const targetIDs = targets.map((target: { cardID: number }) => target.cardID);

        expect(targetIDs).toContain(unicornID);
        expect(targetIDs).toContain(downgradeID);
    });
});
