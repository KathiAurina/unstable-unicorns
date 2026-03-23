import {
    _findOpenScenesWithProtagonist,
    _findInProgressScenesWithProtagonist,
    _findInstruction,
    _addSceneFromDo,
    canPlayCard,
    canDraw,
} from '../game';
import { setupTestGame, createCtx, giveCardToHand, giveCardToStable } from '../testHelpers';
import _ from 'underscore';

// ─── _findInstruction ─────────────────────────────────────────────────────────

describe('_findInstruction', () => {
    it('finds an instruction by ID', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const instructionID = _.uniqueId();
        G.script.scenes = [{
            id: '1',
            mandatory: false,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: instructionID,
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'discard', info: { count: 1, type: 'any' } },
                    ui: { type: 'click_on_own_card_in_hand' },
                }]
            }]
        }];

        const result = _findInstruction(G, instructionID);
        expect(result).not.toBeUndefined();
        const { instruction, scene } = result!;
        expect(instruction.id).toBe(instructionID);
        expect(scene.id).toBe('1');
    });

    it('returns undefined for unknown instructionID', () => {
        const G = setupTestGame();
        expect(_findInstruction(G, 'nonexistent')).toBeUndefined();
    });
});

// ─── _findOpenScenesWithProtagonist ───────────────────────────────────────────

describe('_findOpenScenesWithProtagonist', () => {
    it('returns open instructions for protagonist', () => {
        const G = setupTestGame();
        const instructionID = _.uniqueId();
        G.script.scenes = [{
            id: '1',
            mandatory: false,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: instructionID,
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'discard', info: { count: 1, type: 'any' } },
                    ui: { type: 'click_on_own_card_in_hand' },
                }]
            }]
        }];

        const results = _findOpenScenesWithProtagonist(G, '0');
        expect(results.length).toBe(1);
        expect(results[0][0].id).toBe(instructionID);
    });

    it('returns empty when no open instructions for protagonist', () => {
        const G = setupTestGame();
        G.script.scenes = [{
            id: '1',
            mandatory: false,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: _.uniqueId(),
                    protagonist: '1',  // different player
                    state: 'open',
                    do: { key: 'discard', info: { count: 1, type: 'any' } },
                    ui: { type: 'click_on_own_card_in_hand' },
                }]
            }]
        }];

        const results = _findOpenScenesWithProtagonist(G, '0');
        expect(results.length).toBe(0);
    });

    it('does not return executed instructions', () => {
        const G = setupTestGame();
        G.script.scenes = [{
            id: '1',
            mandatory: false,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: _.uniqueId(),
                    protagonist: '0',
                    state: 'executed',
                    do: { key: 'discard', info: { count: 1, type: 'any' } },
                    ui: { type: 'click_on_own_card_in_hand' },
                }]
            }]
        }];

        const results = _findOpenScenesWithProtagonist(G, '0');
        expect(results.length).toBe(0);
    });
});

// ─── _findInProgressScenesWithProtagonist ─────────────────────────────────────

describe('_findInProgressScenesWithProtagonist', () => {
    it('finds in-progress mandatory scene for protagonist', () => {
        const G = setupTestGame();
        const instructionID = _.uniqueId();
        G.script.scenes = [{
            id: '1',
            mandatory: true,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: instructionID,
                    protagonist: '0',
                    state: 'in_progress',
                    do: { key: 'discard', info: { count: 1, type: 'any' } },
                    ui: { type: 'click_on_own_card_in_hand' },
                }]
            }]
        }];

        const results = _findInProgressScenesWithProtagonist(G, '0');
        expect(results.length).toBe(1);
    });

    it('returns empty when no in-progress scenes', () => {
        const G = setupTestGame();
        const results = _findInProgressScenesWithProtagonist(G, '0');
        expect(results.length).toBe(0);
    });
});

// ─── canDraw ──────────────────────────────────────────────────────────────────

describe('canDraw', () => {
    it('allows draw in beginning stage when no mandatory scenes', () => {
        const G = setupTestGame();
        const ctx = createCtx({ activePlayers: { '0': 'beginning', '1': 'beginning' } });

        expect(canDraw(G, ctx)).toBe(true);
    });

    it('blocks draw when mustEndTurnImmediately is true', () => {
        const G = setupTestGame();
        const ctx = createCtx({ activePlayers: { '0': 'beginning' } });
        G.mustEndTurnImmediately = true;

        expect(canDraw(G, ctx)).toBe(false);
    });

    it('blocks draw in beginning stage when mandatory scene exists', () => {
        const G = setupTestGame();
        const ctx = createCtx({ currentPlayer: '0', activePlayers: { '0': 'beginning' } });
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
                    do: { key: 'discard', info: { count: 1, type: 'any' } },
                    ui: { type: 'click_on_own_card_in_hand' },
                }]
            }]
        }];

        expect(canDraw(G, ctx)).toBe(false);
    });

    it('allows draw in action_phase when no card played yet', () => {
        const G = setupTestGame();
        const ctx = createCtx({ activePlayers: { '0': 'action_phase' } });
        G.countPlayedCardsInActionPhase = 0;

        expect(canDraw(G, ctx)).toBe(true);
    });

    it('blocks draw in action_phase when a card was already played', () => {
        const G = setupTestGame();
        const ctx = createCtx({ activePlayers: { '0': 'action_phase' } });
        G.countPlayedCardsInActionPhase = 1;

        expect(canDraw(G, ctx)).toBe(false);
    });
});

// ─── canPlayCard ──────────────────────────────────────────────────────────────

describe('canPlayCard', () => {
    it('allows current player to play a valid card in action_phase', () => {
        const G = setupTestGame();
        const ctx = createCtx({
            currentPlayer: '0',
            activePlayers: { '0': 'action_phase', '1': 'action_phase' },
        });
        const cardID = giveCardToHand(G, '0', 'basic');
        G.countPlayedCardsInActionPhase = 0;

        expect(canPlayCard(G, ctx, '0', cardID)).toBe(true);
    });

    it('blocks non-current player from playing', () => {
        const G = setupTestGame();
        const ctx = createCtx({
            currentPlayer: '0',
            activePlayers: { '0': 'action_phase', '1': 'action_phase' },
        });
        const cardID = giveCardToHand(G, '1', 'basic');

        expect(canPlayCard(G, ctx, '1', cardID)).toBe(false);
    });

    it('blocks playing a second card without double_dutch', () => {
        const G = setupTestGame();
        const ctx = createCtx({
            currentPlayer: '0',
            activePlayers: { '0': 'action_phase', '1': 'action_phase' },
        });
        const cardID = giveCardToHand(G, '0', 'basic');
        G.countPlayedCardsInActionPhase = 1;

        expect(canPlayCard(G, ctx, '0', cardID)).toBe(false);
    });

    it('allows playing a second card with double_dutch effect', () => {
        const G = setupTestGame();
        const ctx = createCtx({
            currentPlayer: '0',
            activePlayers: { '0': 'action_phase', '1': 'action_phase' },
        });
        const cardID = giveCardToHand(G, '0', 'basic');
        G.countPlayedCardsInActionPhase = 1;
        G.playerEffects['0'] = [{ effect: { key: 'double_dutch' } }];

        expect(canPlayCard(G, ctx, '0', cardID)).toBe(true);
    });
});

// ─── _addSceneFromDo ──────────────────────────────────────────────────────────

describe('_addSceneFromDo', () => {
    it('does not add scene for card with no `on` triggers', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        // Basic unicorn cards have no on triggers
        const basicID = G.deck.find(c => c.type === 'basic' && !c.on?.length)?.id;
        if (basicID === undefined) return;

        _addSceneFromDo(G, ctx, basicID, '0', 'enter');
        expect(G.script.scenes.length).toBe(0);
    });

    it('suppresses scene when my_unicorns_are_basic active for unicorn card', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const unicornWithScene = G.deck.find(
            c => (c.type === 'unicorn' || c.type === 'narwhal') &&
                 c.on?.some(o => o.trigger === 'enter' && o.do.type === 'add_scene')
        );
        if (!unicornWithScene) return;

        G.playerEffects['0'] = [{ effect: { key: 'my_unicorns_are_basic' } }];
        _addSceneFromDo(G, ctx, unicornWithScene.id, '0', 'enter');

        expect(G.script.scenes.length).toBe(0);
    });
});
