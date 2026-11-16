import { canSatisfyDo, autoFizzleUnsatisfiable } from '../operations/canSatisfy';
import { setupTestGame, createCtx, giveCardToStable, giveCardToUpgradeStable } from '../testHelpers';
import _ from 'underscore';

// ─── canSatisfyDo ─────────────────────────────────────────────────────────────

describe('canSatisfyDo', () => {
    // draw / pullRandom are always satisfiable (no target required)
    it('returns true for draw (always satisfiable)', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        expect(canSatisfyDo(G, ctx, '0', { key: 'draw', info: { count: 1 } })).toBe(true);
    });

    it('returns true for pullRandom (always satisfiable)', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        expect(canSatisfyDo(G, ctx, '0', { key: 'pullRandom' } as any)).toBe(true);
    });

    // discard
    it('returns true for discard when the protagonist has cards in hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        expect(canSatisfyDo(G, ctx, '0', { key: 'discard', info: { count: 1, type: 'any' } })).toBe(true);
    });

    it('returns false for discard when the protagonist hand is empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['0'] = [];

        expect(canSatisfyDo(G, ctx, '0', { key: 'discard', info: { count: 1, type: 'any' } })).toBe(false);
    });

    // destroy
    it('returns true for destroy when a valid unicorn target exists', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '1', 'basic');

        expect(canSatisfyDo(G, ctx, '0', { key: 'destroy', info: { type: 'unicorn' } })).toBe(true);
    });

    it('returns false for destroy when no valid unicorn targets exist', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.stable['0'] = [];
        G.stable['1'] = [];

        expect(canSatisfyDo(G, ctx, '0', { key: 'destroy', info: { type: 'unicorn' } })).toBe(false);
    });

    // sacrifice
    it('returns true for sacrifice when the protagonist has unicorns in stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '0', 'basic');

        expect(canSatisfyDo(G, ctx, '0', { key: 'sacrifice', info: { type: 'unicorn' } })).toBe(true);
    });

    it('returns false for sacrifice when the protagonist stable is empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.stable['0'] = [];

        expect(canSatisfyDo(G, ctx, '0', { key: 'sacrifice', info: { type: 'unicorn' } })).toBe(false);
    });

    // steal
    it('returns true for steal when an opponent has a unicorn in their stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '1', 'basic');

        expect(canSatisfyDo(G, ctx, '0', { key: 'steal', info: { type: 'unicorn' } })).toBe(true);
    });

    it('returns false for steal when no opponent has unicorns', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.stable['1'] = [];

        expect(canSatisfyDo(G, ctx, '0', { key: 'steal', info: { type: 'unicorn' } })).toBe(false);
    });

    // revive
    it('returns true for revive when a unicorn is in the discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const basicID = G.deck.find(c => c.type === 'basic')!.id;
        G.discardPile = [basicID];

        expect(canSatisfyDo(G, ctx, '0', { key: 'revive', info: { type: 'unicorn' } })).toBe(true);
    });

    it('returns false for revive when the discard pile is empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.discardPile = [];

        expect(canSatisfyDo(G, ctx, '0', { key: 'revive', info: { type: 'unicorn' } })).toBe(false);
    });

    // reviveFromNursery
    it('returns true for reviveFromNursery when the nursery has babies', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.nursery = [G.deck.find(c => c.type === 'baby')!.id];

        expect(canSatisfyDo(G, ctx, '0', { key: 'reviveFromNursery' } as any)).toBe(true);
    });

    it('returns false for reviveFromNursery when the nursery is empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.nursery = [];

        expect(canSatisfyDo(G, ctx, '0', { key: 'reviveFromNursery' } as any)).toBe(false);
    });

    // backKick
    it('returns true for backKick when an opponent has cards in play', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '1', 'basic');

        expect(canSatisfyDo(G, ctx, '0', { key: 'backKick' } as any)).toBe(true);
    });

    it('returns false for backKick when all opponent stables are empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.stable['1'] = [];
        G.upgradeDowngradeStable['1'] = [];

        expect(canSatisfyDo(G, ctx, '0', { key: 'backKick' } as any)).toBe(false);
    });

    // addFromDiscardPileToHand
    it('returns true for addFromDiscardPileToHand when matching cards are in discard', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.discardPile = [G.deck.find(c => c.type === 'magic')!.id];

        expect(canSatisfyDo(G, ctx, '0', { key: 'addFromDiscardPileToHand', info: { type: 'magic' } })).toBe(true);
    });

    it('returns false for addFromDiscardPileToHand when discard pile is empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.discardPile = [];

        expect(canSatisfyDo(G, ctx, '0', { key: 'addFromDiscardPileToHand', info: { type: 'magic' } })).toBe(false);
    });

    // search
    it('returns true for search when the draw pile has cards', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        expect(canSatisfyDo(G, ctx, '0', { key: 'search', info: { type: 'any' } })).toBe(true);
    });

    it('returns false for search when the draw pile is empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.drawPile = [];

        expect(canSatisfyDo(G, ctx, '0', { key: 'search', info: { type: 'any' } })).toBe(false);
    });

    // unicornSwap1
    it('returns true for unicornSwap1 when protagonist has a unicorn (no pandamonium)', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '0', 'basic');

        expect(canSatisfyDo(G, ctx, '0', { key: 'unicornSwap1' } as any)).toBe(true);
    });

    it('returns false for unicornSwap1 when protagonist stable is empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.stable['0'] = [];

        expect(canSatisfyDo(G, ctx, '0', { key: 'unicornSwap1' } as any)).toBe(false);
    });
});

// ─── autoFizzleUnsatisfiable ──────────────────────────────────────────────────

describe('autoFizzleUnsatisfiable', () => {
    it('marks an unsatisfiable instruction as executed', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.stable['0'] = [];
        G.script.scenes = [{
            id: '1',
            mandatory: true,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: _.uniqueId(),
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'sacrifice', info: { type: 'unicorn' } },
                    ui: { type: 'click_on_own_card_in_stable' },
                }]
            }]
        }];

        autoFizzleUnsatisfiable(G, ctx);

        expect(G.script.scenes[0].actions[0].instructions[0].state).toBe('executed');
    });

    it('does not fizzle a satisfiable instruction', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '0', 'basic');
        G.script.scenes = [{
            id: '1',
            mandatory: true,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: _.uniqueId(),
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'sacrifice', info: { type: 'unicorn' } },
                    ui: { type: 'click_on_own_card_in_stable' },
                }]
            }]
        }];

        autoFizzleUnsatisfiable(G, ctx);

        expect(G.script.scenes[0].actions[0].instructions[0].state).toBe('open');
    });

    it('does not fizzle instructions in non-mandatory scenes', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.stable['0'] = [];
        G.script.scenes = [{
            id: '1',
            mandatory: false,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: _.uniqueId(),
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'sacrifice', info: { type: 'unicorn' } },
                    ui: { type: 'click_on_own_card_in_stable' },
                }]
            }]
        }];

        autoFizzleUnsatisfiable(G, ctx);

        expect(G.script.scenes[0].actions[0].instructions[0].state).toBe('open');
    });

    it('fizzles all unsatisfiable instructions across multiple scenes', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.stable['0'] = [];
        G.stable['1'] = [];
        G.script.scenes = [
            {
                id: 'scene-a',
                mandatory: true,
                endTurnImmediately: false,
                actions: [{
                    type: 'action',
                    instructions: [{
                        id: _.uniqueId(),
                        protagonist: '0',
                        state: 'open',
                        do: { key: 'sacrifice', info: { type: 'unicorn' } },
                        ui: { type: 'click_on_own_card_in_stable' },
                    }]
                }]
            },
            {
                id: 'scene-b',
                mandatory: true,
                endTurnImmediately: false,
                actions: [{
                    type: 'action',
                    instructions: [{
                        id: _.uniqueId(),
                        protagonist: '1',
                        state: 'open',
                        do: { key: 'sacrifice', info: { type: 'unicorn' } },
                        ui: { type: 'click_on_own_card_in_stable' },
                    }]
                }]
            }
        ];

        autoFizzleUnsatisfiable(G, ctx);

        expect(G.script.scenes[0].actions[0].instructions[0].state).toBe('executed');
        expect(G.script.scenes[1].actions[0].instructions[0].state).toBe('executed');
    });

    it('removes a scene from the script once all its instructions are executed', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.stable['0'] = [];
        G.script.scenes = [{
            id: 'cleanup-scene',
            mandatory: true,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: _.uniqueId(),
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'sacrifice', info: { type: 'unicorn' } },
                    ui: { type: 'click_on_own_card_in_stable' },
                }]
            }]
        }];

        autoFizzleUnsatisfiable(G, ctx);

        // After fizzling, the executed scene should be removed from the script
        const remaining = G.script.scenes.filter(s =>
            s.actions.some(a => a.instructions.some(i => i.state !== 'executed'))
        );
        expect(remaining).toHaveLength(0);
    });
});
