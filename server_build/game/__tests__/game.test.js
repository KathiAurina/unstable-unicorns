"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../game");
const testHelpers_1 = require("../testHelpers");
const underscore_1 = __importDefault(require("underscore"));
// ─── _findInstruction ─────────────────────────────────────────────────────────
describe('_findInstruction', () => {
    it('finds an instruction by ID', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)();
        const instructionID = underscore_1.default.uniqueId();
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
        const result = (0, game_1._findInstruction)(G, instructionID);
        expect(result).not.toBeUndefined();
        const { instruction, scene } = result;
        expect(instruction.id).toBe(instructionID);
        expect(scene.id).toBe('1');
    });
    it('returns undefined for unknown instructionID', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        expect((0, game_1._findInstruction)(G, 'nonexistent')).toBeUndefined();
    });
});
// ─── _findOpenScenesWithProtagonist ───────────────────────────────────────────
describe('_findOpenScenesWithProtagonist', () => {
    it('returns open instructions for protagonist', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const instructionID = underscore_1.default.uniqueId();
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
        const results = (0, game_1._findOpenScenesWithProtagonist)(G, '0');
        expect(results.length).toBe(1);
        expect(results[0][0].id).toBe(instructionID);
    });
    it('returns empty when no open instructions for protagonist', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        G.script.scenes = [{
                id: '1',
                mandatory: false,
                endTurnImmediately: false,
                actions: [{
                        type: 'action',
                        instructions: [{
                                id: underscore_1.default.uniqueId(),
                                protagonist: '1', // different player
                                state: 'open',
                                do: { key: 'discard', info: { count: 1, type: 'any' } },
                                ui: { type: 'click_on_own_card_in_hand' },
                            }]
                    }]
            }];
        const results = (0, game_1._findOpenScenesWithProtagonist)(G, '0');
        expect(results.length).toBe(0);
    });
    it('does not return executed instructions', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        G.script.scenes = [{
                id: '1',
                mandatory: false,
                endTurnImmediately: false,
                actions: [{
                        type: 'action',
                        instructions: [{
                                id: underscore_1.default.uniqueId(),
                                protagonist: '0',
                                state: 'executed',
                                do: { key: 'discard', info: { count: 1, type: 'any' } },
                                ui: { type: 'click_on_own_card_in_hand' },
                            }]
                    }]
            }];
        const results = (0, game_1._findOpenScenesWithProtagonist)(G, '0');
        expect(results.length).toBe(0);
    });
});
// ─── _findInProgressScenesWithProtagonist ─────────────────────────────────────
describe('_findInProgressScenesWithProtagonist', () => {
    it('finds in-progress mandatory scene for protagonist', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const instructionID = underscore_1.default.uniqueId();
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
        const results = (0, game_1._findInProgressScenesWithProtagonist)(G, '0');
        expect(results.length).toBe(1);
    });
    it('returns empty when no in-progress scenes', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const results = (0, game_1._findInProgressScenesWithProtagonist)(G, '0');
        expect(results.length).toBe(0);
    });
});
// ─── canDraw ──────────────────────────────────────────────────────────────────
describe('canDraw', () => {
    it('allows draw in beginning stage when no mandatory scenes', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ activePlayers: { '0': 'beginning', '1': 'beginning' } });
        expect((0, game_1.canDraw)(G, ctx)).toBe(true);
    });
    it('blocks draw when mustEndTurnImmediately is true', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ activePlayers: { '0': 'beginning' } });
        G.mustEndTurnImmediately = true;
        expect((0, game_1.canDraw)(G, ctx)).toBe(false);
    });
    it('blocks draw in beginning stage when mandatory scene exists', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ currentPlayer: '0', activePlayers: { '0': 'beginning' } });
        G.script.scenes = [{
                id: '1',
                mandatory: true,
                endTurnImmediately: false,
                actions: [{
                        type: 'action',
                        instructions: [{
                                id: underscore_1.default.uniqueId(),
                                protagonist: '0',
                                state: 'open',
                                do: { key: 'discard', info: { count: 1, type: 'any' } },
                                ui: { type: 'click_on_own_card_in_hand' },
                            }]
                    }]
            }];
        expect((0, game_1.canDraw)(G, ctx)).toBe(false);
    });
    it('allows draw in action_phase when no card played yet', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ activePlayers: { '0': 'action_phase' } });
        G.countPlayedCardsInActionPhase = 0;
        expect((0, game_1.canDraw)(G, ctx)).toBe(true);
    });
    it('blocks draw in action_phase when a card was already played', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ activePlayers: { '0': 'action_phase' } });
        G.countPlayedCardsInActionPhase = 1;
        expect((0, game_1.canDraw)(G, ctx)).toBe(false);
    });
});
// ─── canPlayCard ──────────────────────────────────────────────────────────────
describe('canPlayCard', () => {
    it('allows current player to play a valid card in action_phase', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({
            currentPlayer: '0',
            activePlayers: { '0': 'action_phase', '1': 'action_phase' },
        });
        const cardID = (0, testHelpers_1.giveCardToHand)(G, '0', 'basic');
        G.countPlayedCardsInActionPhase = 0;
        expect((0, game_1.canPlayCard)(G, ctx, '0', cardID)).toBe(true);
    });
    it('blocks non-current player from playing', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({
            currentPlayer: '0',
            activePlayers: { '0': 'action_phase', '1': 'action_phase' },
        });
        const cardID = (0, testHelpers_1.giveCardToHand)(G, '1', 'basic');
        expect((0, game_1.canPlayCard)(G, ctx, '1', cardID)).toBe(false);
    });
    it('blocks playing a second card without double_dutch', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({
            currentPlayer: '0',
            activePlayers: { '0': 'action_phase', '1': 'action_phase' },
        });
        const cardID = (0, testHelpers_1.giveCardToHand)(G, '0', 'basic');
        G.countPlayedCardsInActionPhase = 1;
        expect((0, game_1.canPlayCard)(G, ctx, '0', cardID)).toBe(false);
    });
    it('allows playing a second card with double_dutch effect', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({
            currentPlayer: '0',
            activePlayers: { '0': 'action_phase', '1': 'action_phase' },
        });
        const cardID = (0, testHelpers_1.giveCardToHand)(G, '0', 'basic');
        G.countPlayedCardsInActionPhase = 1;
        G.playerEffects['0'] = [{ effect: { key: 'double_dutch' } }];
        expect((0, game_1.canPlayCard)(G, ctx, '0', cardID)).toBe(true);
    });
});
// ─── _addSceneFromDo ──────────────────────────────────────────────────────────
describe('_addSceneFromDo', () => {
    it('does not add scene for card with no `on` triggers', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)();
        // Basic unicorn cards have no on triggers
        const basicID = G.deck.find(c => c.type === 'basic' && !c.on?.length)?.id;
        if (basicID === undefined)
            return;
        (0, game_1._addSceneFromDo)(G, ctx, basicID, '0', 'enter');
        expect(G.script.scenes.length).toBe(0);
    });
    it('suppresses scene when my_unicorns_are_basic active for unicorn card', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)();
        const unicornWithScene = G.deck.find(c => (c.type === 'unicorn' || c.type === 'narwhal') &&
            c.on?.some(o => o.trigger === 'enter' && o.do.type === 'add_scene'));
        if (!unicornWithScene)
            return;
        G.playerEffects['0'] = [{ effect: { key: 'my_unicorns_are_basic' } }];
        (0, game_1._addSceneFromDo)(G, ctx, unicornWithScene.id, '0', 'enter');
        expect(G.script.scenes.length).toBe(0);
    });
});
