import { leave, canEnter, enter } from '../operations/enter';
import { findOwnerOfCard } from '../operations/destroy';
import { setupTestGame, createCtx, giveCardToStable, giveCardToUpgradeStable } from '../testHelpers';

// ─── findOwnerOfCard ──────────────────────────────────────────────────────────

describe('findOwnerOfCard', () => {
    it('returns the playerID of the player who has the card in their stable', () => {
        const G = setupTestGame();
        const cardID = giveCardToStable(G, '1', 'basic');

        expect(findOwnerOfCard(G, cardID)).toBe('1');
    });

    it('returns the playerID of the player who has the card in their upgradeDowngradeStable', () => {
        const G = setupTestGame();
        const cardID = giveCardToUpgradeStable(G, '0', 'upgrade');

        expect(findOwnerOfCard(G, cardID)).toBe('0');
    });

    it('returns null when no player owns the card', () => {
        const G = setupTestGame();
        // Use a card that exists in the deck but is only in the draw pile (no stable owner)
        const cardID = G.drawPile[0];

        expect(findOwnerOfCard(G, cardID)).toBeNull();
    });

    it('finds the owner regardless of which player it is', () => {
        const G = setupTestGame();
        const cardID = giveCardToStable(G, '0', 'basic');

        expect(findOwnerOfCard(G, cardID)).toBe('0');
    });
});

// ─── leave ────────────────────────────────────────────────────────────────────

describe('leave', () => {
    it('removes a unicorn card from the stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');

        leave(G, ctx, { playerID: '0', cardID });

        expect(G.stable['0']).not.toContain(cardID);
    });

    it('removes an upgrade card from upgradeDowngradeStable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToUpgradeStable(G, '0', 'upgrade');

        leave(G, ctx, { playerID: '0', cardID });

        expect(G.upgradeDowngradeStable['0']).not.toContain(cardID);
    });

    it('removes a downgrade card from upgradeDowngradeStable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToUpgradeStable(G, '0', 'downgrade');

        leave(G, ctx, { playerID: '0', cardID });

        expect(G.upgradeDowngradeStable['0']).not.toContain(cardID);
    });

    it('removes the player effect that was added by the leaving card', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');
        G.playerEffects['0'] = [{ cardID, effect: { key: 'double_dutch' } }];

        leave(G, ctx, { playerID: '0', cardID });

        expect(G.playerEffects['0'].some(e => e.cardID === cardID)).toBe(false);
    });

    it('does not remove effects belonging to other cards', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardToLeave = giveCardToStable(G, '0', 'basic');
        const otherCardID = 99999;
        G.playerEffects['0'] = [{ cardID: otherCardID, effect: { key: 'double_dutch' } }];

        leave(G, ctx, { playerID: '0', cardID: cardToLeave });

        expect(G.playerEffects['0'].some(e => e.cardID === otherCardID)).toBe(true);
    });

    it('leaves the stable otherwise intact when removing a single card', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardA = giveCardToStable(G, '0', 'basic');
        const cardB = giveCardToStable(G, '0', 'basic');

        leave(G, ctx, { playerID: '0', cardID: cardA });

        expect(G.stable['0']).not.toContain(cardA);
        expect(G.stable['0']).toContain(cardB);
    });

    it('is a no-op on the stable when the card is not present', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        // Pick a real card that is in the draw pile (not in any stable)
        const cardID = G.drawPile[0];
        const sizeBefore = G.stable['0'].length;

        leave(G, ctx, { playerID: '0', cardID });

        expect(G.stable['0'].length).toBe(sizeBefore);
    });

    it('does not touch the other player stable when leaving from player 0', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardA = giveCardToStable(G, '0', 'basic');
        const cardB = giveCardToStable(G, '1', 'basic');

        leave(G, ctx, { playerID: '0', cardID: cardA });

        expect(G.stable['1']).toContain(cardB);
    });

    it('injects a leave-triggered action when a reactive card is in the stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const reactiveCard = G.deck.find(card =>
            card.on?.some(on => on.trigger === 'unicorn_leaves_your_stable' && on.do.type === 'inject_action')
        )!;
        const unicornToLeave = giveCardToStable(G, '0', 'basic');
        G.stable['0'] = [...G.stable['0'], reactiveCard.id];

        leave(G, ctx, { playerID: '0', cardID: unicornToLeave });

        expect(G.script.scenes).toHaveLength(1);
        expect(G.script.scenes[0].actions[0].instructions[0].ui.info?.source).toBe(reactiveCard.id);
    });
});

// ─── canEnter — stable capacity ───────────────────────────────────────────────

describe('canEnter — stable capacity', () => {
    it('blocks entering when the stable is already full (7 seats)', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        // Fill the stable to the maximum
        for (let i = 0; i < 7; i++) {
            giveCardToStable(G, '0', 'basic');
        }

        const extraCard = G.deck.find(c => c.type === 'basic' && !G.stable['0'].includes(c.id))!;
        expect(canEnter(G, ctx, { playerID: '0', cardID: extraCard.id })).toBe(false);
    });

    it('allows entering when the stable has exactly one free seat', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        for (let i = 0; i < 6; i++) {
            giveCardToStable(G, '0', 'basic');
        }

        const extraCard = G.deck.find(c => c.type === 'basic' && !G.stable['0'].includes(c.id))!;
        expect(canEnter(G, ctx, { playerID: '0', cardID: extraCard.id })).toBe(true);
    });
});

// ─── tiny_stable effect ───────────────────────────────────────────────────────

describe('enter — tiny_stable triggers sacrifice scene at 6 unicorns', () => {
    it('injects a sacrifice scene when 6th unicorn enters with tiny_stable active', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [{ effect: { key: 'tiny_stable' } }];
        for (let i = 0; i < 5; i++) {
            giveCardToStable(G, '0', 'basic');
        }
        G.script.scenes = [];

        const extraCard = G.deck.find(c => c.type === 'basic' && !G.stable['0'].includes(c.id))!;
        enter(G, ctx, { playerID: '0', cardID: extraCard.id });

        const hasSacrifice = G.script.scenes.some(s =>
            s.actions.some(a => a.instructions.some(i => i.do.key === 'sacrifice'))
        );
        expect(hasSacrifice).toBe(true);
    });

    it('triggers sacrifice at 5 unicorns when count_as_two is also active (threshold is >4)', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [
            { effect: { key: 'tiny_stable' } },
            { effect: { key: 'count_as_two' } },
        ];
        for (let i = 0; i < 4; i++) {
            giveCardToStable(G, '0', 'basic');
        }
        G.script.scenes = [];

        const extraCard = G.deck.find(c => c.type === 'basic' && !G.stable['0'].includes(c.id))!;
        enter(G, ctx, { playerID: '0', cardID: extraCard.id });

        const hasSacrifice = G.script.scenes.some(s =>
            s.actions.some(a => a.instructions.some(i => i.do.key === 'sacrifice'))
        );
        expect(hasSacrifice).toBe(true);
    });

    it('does not trigger tiny_stable logic when pandamonium is also active', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [
            { effect: { key: 'tiny_stable' } },
            { effect: { key: 'pandamonium' } },
        ];
        for (let i = 0; i < 5; i++) {
            giveCardToStable(G, '0', 'basic');
        }
        G.script.scenes = [];

        const extraCard = G.deck.find(c => c.type === 'basic' && !G.stable['0'].includes(c.id))!;
        enter(G, ctx, { playerID: '0', cardID: extraCard.id });

        const hasSacrifice = G.script.scenes.some(s =>
            s.actions.some(a => a.instructions.some(i => i.do.key === 'sacrifice'))
        );
        expect(hasSacrifice).toBe(false);
    });
});

// ─── tiny_stable + count_as_two ───────────────────────────────────────────────

describe('tiny_stable capacity with count_as_two effect', () => {
    it('triggers sacrifice at 5 cards with count_as_two (threshold is > 4)', () => {
        // Without count_as_two the threshold is > 5 (triggers at 6).
        // With count_as_two a card "counts as two", so threshold drops to > 4.
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [
            { effect: { key: 'tiny_stable' } },
            { effect: { key: 'count_as_two' } },
        ];
        for (let i = 0; i < 5; i++) {
            giveCardToStable(G, '0', 'basic');
        }
        G.script.scenes = [];

        const extraCard = G.deck.find(c => c.type === 'basic' && !G.stable['0'].includes(c.id))!;
        enter(G, ctx, { playerID: '0', cardID: extraCard.id });

        const hasSacrifice = G.script.scenes.some(s =>
            s.actions.some(a => a.instructions.some(i => i.do.key === 'sacrifice'))
        );
        expect(hasSacrifice).toBe(true);
    });

    it('does NOT trigger sacrifice at 4 cards WITHOUT count_as_two (5 after entering, not > 5)', () => {
        // enter() adds the card first, then checks. So 4 before → 5 after → 5 is not > 5 → no sacrifice.
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [{ effect: { key: 'tiny_stable' } }];
        for (let i = 0; i < 4; i++) {
            giveCardToStable(G, '0', 'basic');
        }
        G.script.scenes = [];

        const extraCard = G.deck.find(c => c.type === 'basic' && !G.stable['0'].includes(c.id))!;
        enter(G, ctx, { playerID: '0', cardID: extraCard.id });

        const hasSacrifice = G.script.scenes.some(s =>
            s.actions.some(a => a.instructions.some(i => i.do.key === 'sacrifice'))
        );
        expect(hasSacrifice).toBe(false);
    });

    it('triggers sacrifice at 6 cards WITHOUT count_as_two', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [{ effect: { key: 'tiny_stable' } }];
        for (let i = 0; i < 6; i++) {
            giveCardToStable(G, '0', 'basic');
        }
        G.script.scenes = [];

        const extraCard = G.deck.find(c => c.type === 'basic' && !G.stable['0'].includes(c.id))!;
        enter(G, ctx, { playerID: '0', cardID: extraCard.id });

        const hasSacrifice = G.script.scenes.some(s =>
            s.actions.some(a => a.instructions.some(i => i.do.key === 'sacrifice'))
        );
        expect(hasSacrifice).toBe(true);
    });

    it('pandamonium suppresses the count_as_two tiny_stable threshold too', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [
            { effect: { key: 'tiny_stable' } },
            { effect: { key: 'count_as_two' } },
            { effect: { key: 'pandamonium' } },
        ];
        for (let i = 0; i < 5; i++) {
            giveCardToStable(G, '0', 'basic');
        }
        G.script.scenes = [];

        const extraCard = G.deck.find(c => c.type === 'basic' && !G.stable['0'].includes(c.id))!;
        enter(G, ctx, { playerID: '0', cardID: extraCard.id });

        const hasSacrifice = G.script.scenes.some(s =>
            s.actions.some(a => a.instructions.some(i => i.do.key === 'sacrifice'))
        );
        expect(hasSacrifice).toBe(false);
    });
});

// ─── reactive unicorn enter/leave triggers ───────────────────────────────────

describe('enter/leave — reactive unicorn triggers', () => {
    it('inserts an enter-triggered action before the current in-progress action', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const reactiveCard = G.deck.find(card =>
            card.on?.some(on => on.trigger === 'unicorn_enters_your_stable' && on.do.type === 'inject_action')
        )!;
        G.stable['0'] = [...G.stable['0'], reactiveCard.id];
        G.script.scenes.push({
            id: 'existing-scene',
            mandatory: true,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: 'in-progress-instruction',
                    protagonist: '0',
                    state: 'in_progress',
                    do: { key: 'draw', info: { count: 1 } },
                    ui: { type: 'none' } as any,
                }]
            }]
        });

        const unicornToEnter = G.deck.find(card => card.type === 'basic' && !G.stable['0'].includes(card.id))!;

        enter(G, ctx, { playerID: '0', cardID: unicornToEnter.id });

        expect(G.script.scenes[0].actions).toHaveLength(2);
        expect(G.script.scenes[0].actions[0].instructions[0].ui.info?.source).toBe(reactiveCard.id);
        expect(G.script.scenes[0].actions[1].instructions[0].id).toBe('in-progress-instruction');
    });

    it('does not fire leave triggers when a non-unicorn leaves the stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const reactiveCard = G.deck.find(card =>
            card.on?.some(on => on.trigger === 'unicorn_leaves_your_stable' && on.do.type === 'inject_action')
        )!;
        const upgradeToLeave = giveCardToUpgradeStable(G, '0', 'upgrade');
        G.stable['0'] = [...G.stable['0'], reactiveCard.id];

        leave(G, ctx, { playerID: '0', cardID: upgradeToLeave });

        expect(G.script.scenes).toHaveLength(0);
    });
});

// ─── enter — auto and add_effect triggers ────────────────────────────────────

describe('enter — auto and add_effect triggers', () => {
    it('sacrifices all downgrades when Narwhal Torpedo enters, but keeps upgrades', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const downgradeID = giveCardToUpgradeStable(G, '0', 'downgrade');
        const upgradeID = giveCardToUpgradeStable(G, '0', 'upgrade');
        const torpedo = G.deck.find(card => card.title === 'Narwhal Torpedo')!;
        G.drawPile = G.drawPile.filter(id => id !== torpedo.id);

        enter(G, ctx, { playerID: '0', cardID: torpedo.id });

        expect(G.upgradeDowngradeStable['0']).not.toContain(downgradeID);
        expect(G.upgradeDowngradeStable['0']).toContain(upgradeID);
        expect(G.discardPile).toContain(downgradeID);
    });

    it('adds every enter effect from Ginormous Unicorn', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const ginormous = G.deck.find(card => card.title === 'Ginormous Unicorn')!;
        G.drawPile = G.drawPile.filter(id => id !== ginormous.id);

        enter(G, ctx, { playerID: '0', cardID: ginormous.id });

        const effectKeys = G.playerEffects['0']
            .filter(effect => effect.cardID === ginormous.id)
            .map(effect => effect.effect.key);

        expect(effectKeys).toContain('you_cannot_play_neigh');
        expect(effectKeys).toContain('count_as_two');
    });

    it('does not duplicate enter effects that were already added for the same card', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const ginormous = G.deck.find(card => card.title === 'Ginormous Unicorn')!;
        G.playerEffects['0'] = [
            { cardID: ginormous.id, effect: { key: 'you_cannot_play_neigh' } },
            { cardID: ginormous.id, effect: { key: 'count_as_two' } },
        ];
        G.drawPile = G.drawPile.filter(id => id !== ginormous.id);

        enter(G, ctx, { playerID: '0', cardID: ginormous.id });

        const effectEntries = G.playerEffects['0'].filter(effect => effect.cardID === ginormous.id);
        expect(effectEntries).toHaveLength(2);
    });
});
