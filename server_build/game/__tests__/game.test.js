"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../game");
const game_2 = __importDefault(require("../game"));
const core_1 = require("boardgame.io/core");
const testHelpers_1 = require("../testHelpers");
const constants_1 = require("../constants");
const underscore_1 = __importDefault(require("underscore"));
// ─── setup and phase hooks ───────────────────────────────────────────────────
describe('setup and phase hooks', () => {
    it('setup deals the starting hand, excludes babies from the draw pile, and defaults owner to player 0', () => {
        const ctx = (0, testHelpers_1.createCtx)({ numPlayers: 2 });
        const G = game_2.default.setup(ctx, undefined);
        expect(G.owner).toBe('0');
        expect(G.hand['0']).toHaveLength(constants_1.CONSTANTS.numberOfHandCardsAtStart);
        expect(G.hand['1']).toHaveLength(constants_1.CONSTANTS.numberOfHandCardsAtStart);
        expect(G.drawPile.every((cardID) => G.deck[cardID].type !== 'baby')).toBe(true);
    });
    it('setup honors a custom owner from setup data', () => {
        const ctx = (0, testHelpers_1.createCtx)({ numPlayers: 2 });
        const G = game_2.default.setup(ctx, { ownerPlayerID: '1' });
        expect(G.owner).toBe('1');
    });
    it('pregame phase onBegin places every player into the pregame stage', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const setActivePlayers = jest.fn();
        const ctx = (0, testHelpers_1.createCtx)({ events: { ...(0, testHelpers_1.createCtx)().events, setActivePlayers } });
        game_2.default.phases.pregame.onBegin(G, ctx);
        expect(setActivePlayers).toHaveBeenCalledWith({ all: 'pregame' });
    });
});
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
    it('blocks draw in beginning stage when an instruction is already in progress', () => {
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
                                state: 'in_progress',
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
// ─── action phase play + neigh moves ─────────────────────────────────────────
describe('action phase play and neigh moves', () => {
    const actionPhaseMoves = game_2.default.turn.stages.action_phase.moves;
    it('playCard enters the card immediately when your_cards_cannot_be_neighed is active', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0', currentPlayer: '0' });
        const cardID = (0, testHelpers_1.giveCardToHand)(G, '0', 'basic');
        G.playerEffects['0'] = [{ effect: { key: 'your_cards_cannot_be_neighed' } }];
        actionPhaseMoves.playCard(G, ctx, '0', cardID);
        expect(G.hand['0']).not.toContain(cardID);
        expect(G.stable['0']).toContain(cardID);
        expect(G.neighDiscussion).toBeUndefined();
        expect(G.countPlayedCardsInActionPhase).toBe(1);
    });
    it('playCard opens a neigh discussion and pre-fills no_neigh for blocked opponents', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0', currentPlayer: '0' });
        const cardID = (0, testHelpers_1.giveCardToHand)(G, '0', 'basic');
        G.playerEffects['1'] = [{ effect: { key: 'you_cannot_play_neigh' } }];
        actionPhaseMoves.playCard(G, ctx, '0', cardID);
        expect(G.neighDiscussion?.cardID).toBe(cardID);
        expect(G.neighDiscussion?.target).toBe('0');
        expect(G.neighDiscussion?.rounds[0].playerState['0'].vote).toBe('no_neigh');
        expect(G.neighDiscussion?.rounds[0].playerState['1'].vote).toBe('no_neigh');
    });
    it('playUpgradeDowngradeCard enters directly into the target upgrade stable when neigh is blocked', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0', currentPlayer: '0' });
        const cardID = (0, testHelpers_1.giveCardToHand)(G, '0', 'upgrade');
        G.playerEffects['0'] = [{ effect: { key: 'your_cards_cannot_be_neighed' } }];
        actionPhaseMoves.playUpgradeDowngradeCard(G, ctx, '0', '1', cardID);
        expect(G.upgradeDowngradeStable['1']).toContain(cardID);
        expect(G.neighDiscussion).toBeUndefined();
    });
    it('playUpgradeDowngradeCard opens a neigh discussion targeting the chosen player', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0', currentPlayer: '0' });
        const cardID = (0, testHelpers_1.giveCardToHand)(G, '0', 'upgrade');
        actionPhaseMoves.playUpgradeDowngradeCard(G, ctx, '0', '1', cardID);
        expect(G.neighDiscussion?.cardID).toBe(cardID);
        expect(G.neighDiscussion?.target).toBe('1');
    });
    it('playNeigh discards the neigh card, marks the round as neigh, and opens a new round', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '1', currentPlayer: '0' });
        const playedCardID = (0, testHelpers_1.giveCardToHand)(G, '0', 'basic');
        const neighID = (0, testHelpers_1.giveCardToHand)(G, '1', 'neigh');
        actionPhaseMoves.playCard(G, ctx, '0', playedCardID);
        actionPhaseMoves.playNeigh(G, ctx, neighID, '1', 0);
        expect(G.hand['1']).not.toContain(neighID);
        expect(G.discardPile).toContain(neighID);
        expect(G.neighDiscussion?.rounds[0].state).toBe('neigh');
        expect(G.neighDiscussion?.rounds).toHaveLength(2);
    });
    it('playNeigh does nothing when the player is forbidden from playing neigh cards', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '1', currentPlayer: '0' });
        const playedCardID = (0, testHelpers_1.giveCardToHand)(G, '0', 'basic');
        const neighID = (0, testHelpers_1.giveCardToHand)(G, '1', 'neigh');
        actionPhaseMoves.playCard(G, ctx, '0', playedCardID);
        G.playerEffects['1'] = [{ effect: { key: 'you_cannot_play_neigh' } }];
        actionPhaseMoves.playNeigh(G, ctx, neighID, '1', 0);
        expect(G.hand['1']).toContain(neighID);
        expect(G.discardPile).not.toContain(neighID);
        expect(G.neighDiscussion?.rounds).toHaveLength(1);
    });
    it('playSuperNeigh can resolve the played card as neighd immediately', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '1', currentPlayer: '0' });
        const playedCardID = (0, testHelpers_1.giveCardToHand)(G, '0', 'basic');
        const superNeighID = (0, testHelpers_1.giveCardToHand)(G, '1', 'super_neigh');
        actionPhaseMoves.playCard(G, ctx, '0', playedCardID);
        actionPhaseMoves.playSuperNeigh(G, ctx, superNeighID, '1', 0);
        expect(G.discardPile).toContain(superNeighID);
        expect(G.discardPile).toContain(playedCardID);
        expect(G.lastNeighResult?.result).toBe('cardWasNeighed');
        expect(G.neighDiscussion).toBeUndefined();
    });
    it('playSuperNeigh can resolve the originally played card as played when parity flips', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '1', currentPlayer: '0' });
        const playedCardID = (0, testHelpers_1.giveCardToHand)(G, '0', 'basic');
        const superNeighID = (0, testHelpers_1.giveCardToHand)(G, '1', 'super_neigh');
        G.neighDiscussion = {
            protagonist: '0',
            target: '0',
            cardID: playedCardID,
            rounds: [{
                    state: 'neigh',
                    playerState: {
                        '0': { vote: 'no_neigh' },
                        '1': { vote: 'neigh' },
                    },
                }, {
                    state: 'open',
                    playerState: {
                        '0': { vote: 'undecided' },
                        '1': { vote: 'no_neigh' },
                    },
                }],
        };
        actionPhaseMoves.playSuperNeigh(G, ctx, superNeighID, '1', 1);
        expect(G.stable['0']).toContain(playedCardID);
        expect(G.lastNeighResult?.result).toBe('cardWasPlayed');
        expect(G.neighDiscussion).toBeUndefined();
    });
    it('dontPlayNeigh keeps the discussion open while another player is still undecided', () => {
        const G = (0, testHelpers_1.setupTestGame)(3);
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '1', currentPlayer: '0', numPlayers: 3, playOrder: ['0', '1', '2'], activePlayers: { '0': 'action_phase', '1': 'action_phase', '2': 'action_phase' } });
        const playedCardID = (0, testHelpers_1.giveCardToHand)(G, '0', 'basic');
        actionPhaseMoves.playCard(G, ctx, '0', playedCardID);
        actionPhaseMoves.dontPlayNeigh(G, ctx, '1', 0);
        expect(G.neighDiscussion).toBeDefined();
        expect(G.neighDiscussion?.rounds[0].playerState['1'].vote).toBe('no_neigh');
    });
    it('dontPlayNeigh resolves the card into the target stable when all votes are no_neigh', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '1', currentPlayer: '0' });
        const playedCardID = (0, testHelpers_1.giveCardToHand)(G, '0', 'basic');
        actionPhaseMoves.playCard(G, ctx, '0', playedCardID);
        actionPhaseMoves.dontPlayNeigh(G, ctx, '1', 0);
        expect(G.stable['0']).toContain(playedCardID);
        expect(G.lastNeighResult?.result).toBe('cardWasPlayed');
        expect(G.neighDiscussion).toBeUndefined();
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
// ─── endIf (win condition) ────────────────────────────────────────────────────
describe('endIf — normal win condition', () => {
    const endIf = game_2.default.endIf;
    it('returns undefined when no player has enough unicorns', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)();
        expect(endIf(G, ctx)).toBeUndefined();
    });
    it('returns the winner when a player reaches 7 unicorns in stable', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)();
        for (let i = 0; i < constants_1.CONSTANTS.stableSeats; i++) {
            (0, testHelpers_1.giveCardToStable)(G, '0', 'basic');
        }
        expect(endIf(G, ctx)).toEqual({ winner: '0' });
    });
    it('does not declare a winner with only 6 unicorns (one short)', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)();
        for (let i = 0; i < constants_1.CONSTANTS.stableSeats - 1; i++) {
            (0, testHelpers_1.giveCardToStable)(G, '0', 'basic');
        }
        expect(endIf(G, ctx)).toBeUndefined();
    });
});
// ─── endIf — count_as_two (Ginormous Unicorn) ─────────────────────────────────
describe('endIf — count_as_two effect', () => {
    const endIf = game_2.default.endIf;
    it('counts the stable size as +1 when count_as_two is active', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)();
        // Fill stable to 6 (one short of the normal 7 required)
        for (let i = 0; i < constants_1.CONSTANTS.stableSeats - 1; i++) {
            (0, testHelpers_1.giveCardToStable)(G, '0', 'basic');
        }
        // Without count_as_two: 6 unicorns → not a win
        expect(endIf(G, ctx)).toBeUndefined();
        // Add the count_as_two effect — now 6 counts as 7 → win
        G.playerEffects['0'] = [{ effect: { key: 'count_as_two' } }];
        expect(endIf(G, ctx)).toEqual({ winner: '0' });
    });
    it('does not trigger a win with count_as_two and only 5 unicorns', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)();
        for (let i = 0; i < constants_1.CONSTANTS.stableSeats - 2; i++) {
            (0, testHelpers_1.giveCardToStable)(G, '0', 'basic');
        }
        G.playerEffects['0'] = [{ effect: { key: 'count_as_two' } }];
        expect(endIf(G, ctx)).toBeUndefined();
    });
    it('still requires 7 unicorns to win without the count_as_two effect', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)();
        for (let i = 0; i < constants_1.CONSTANTS.stableSeats - 1; i++) {
            (0, testHelpers_1.giveCardToStable)(G, '0', 'basic');
        }
        // No effect — 6 unicorns must not be a win
        expect(endIf(G, ctx)).toBeUndefined();
    });
});
// ─── endIf — pandamonium blocks win ───────────────────────────────────────────
describe('endIf — pandamonium blocks win', () => {
    const endIf = game_2.default.endIf;
    it('does not declare a winner when pandamonium is active, even with 7+ unicorns', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)();
        for (let i = 0; i < constants_1.CONSTANTS.stableSeats; i++) {
            (0, testHelpers_1.giveCardToStable)(G, '0', 'basic');
        }
        G.playerEffects['0'] = [{ effect: { key: 'pandamonium' } }];
        expect(endIf(G, ctx)).toBeUndefined();
    });
    it('declares the correct winner when one player has pandamonium but the other does not', () => {
        const G = (0, testHelpers_1.setupTestGame)(2);
        const ctx = (0, testHelpers_1.createCtx)({ numPlayers: 2 });
        // Player 0 — pandamonium: cannot win
        for (let i = 0; i < constants_1.CONSTANTS.stableSeats; i++) {
            (0, testHelpers_1.giveCardToStable)(G, '0', 'basic');
        }
        G.playerEffects['0'] = [{ effect: { key: 'pandamonium' } }];
        // Player 1 — no pandamonium: can win
        for (let i = 0; i < constants_1.CONSTANTS.stableSeats; i++) {
            (0, testHelpers_1.giveCardToStable)(G, '1', 'basic');
        }
        expect(endIf(G, ctx)).toEqual({ winner: '1' });
    });
});
// ─── pregame moves ───────────────────────────────────────────────────────────
describe('pregame moves', () => {
    const pregameMoves = game_2.default.turn.stages.pregame.moves;
    it('ready returns INVALID_MOVE when the player has not selected a baby unicorn', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0' });
        expect(pregameMoves.ready(G, ctx, '0')).toBe(core_1.INVALID_MOVE);
    });
    it('ready returns INVALID_MOVE when another player claimed the same baby unicorn', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0' });
        G.babyStarter = [
            { cardID: 0, owner: '0' },
            { cardID: 0, owner: '1' },
        ];
        expect(pregameMoves.ready(G, ctx, '0')).toBe(core_1.INVALID_MOVE);
    });
    it('ready initializes the game and enters main phase when all players are ready', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const setPhase = jest.fn();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '1', events: { ...(0, testHelpers_1.createCtx)().events, setPhase } });
        G.babyStarter = [
            { cardID: 0, owner: '0' },
            { cardID: 1, owner: '1' },
        ];
        G.ready['0'] = true;
        pregameMoves.ready(G, ctx, '1');
        expect(G.stable['0']).toContain(0);
        expect(G.stable['1']).toContain(1);
        expect(G.nursery).toContain(2);
        expect(setPhase).toHaveBeenCalledWith('main');
    });
    it('selectBaby replaces the previous baby selection and clears readiness', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0' });
        G.babyStarter = [{ cardID: 0, owner: '0' }];
        G.ready['0'] = true;
        pregameMoves.selectBaby(G, ctx, '0', 1);
        expect(G.babyStarter).toEqual([{ cardID: 1, owner: '0' }]);
        expect(G.ready['0']).toBe(false);
    });
    it('deselectBaby removes the player selection and clears readiness', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0' });
        G.babyStarter = [{ cardID: 0, owner: '0' }];
        G.ready['0'] = true;
        pregameMoves.deselectBaby(G, ctx, '0');
        expect(G.babyStarter).toEqual([]);
        expect(G.ready['0']).toBe(false);
    });
});
// ─── turn.onBegin ────────────────────────────────────────────────────────────
describe('turn.onBegin', () => {
    const onBegin = game_2.default.turn.onBegin;
    it('returns immediately during pregame without altering turn state', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const setActivePlayers = jest.fn();
        const ctx = (0, testHelpers_1.createCtx)({ phase: 'pregame', events: { ...(0, testHelpers_1.createCtx)().events, setActivePlayers } });
        const originalScenes = [{
                id: 'scene-1',
                mandatory: true,
                endTurnImmediately: false,
                actions: [],
            }];
        G.script.scenes = originalScenes;
        G.mustEndTurnImmediately = true;
        G.countPlayedCardsInActionPhase = 3;
        onBegin(G, ctx);
        expect(G.script.scenes).toBe(originalScenes);
        expect(G.mustEndTurnImmediately).toBe(true);
        expect(G.countPlayedCardsInActionPhase).toBe(3);
        expect(setActivePlayers).not.toHaveBeenCalled();
    });
    it('reshuffles the discard pile into the draw pile when the draw pile is empty', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const setActivePlayers = jest.fn();
        const ctx = (0, testHelpers_1.createCtx)({ phase: 'main', currentPlayer: '0', events: { ...(0, testHelpers_1.createCtx)().events, setActivePlayers } });
        G.drawPile = [];
        G.discardPile = [1, 2, 3];
        onBegin(G, ctx);
        expect(G.drawPile).toHaveLength(3);
        expect(G.discardPile).toEqual([]);
        expect(G.deckWasReshuffled).toBe(true);
        expect(setActivePlayers).toHaveBeenCalledWith({ all: 'beginning' });
    });
    it('ends the phase when there are no cards available to draw', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const setPhase = jest.fn();
        const ctx = (0, testHelpers_1.createCtx)({ phase: 'main', currentPlayer: '0', events: { ...(0, testHelpers_1.createCtx)().events, setPhase } });
        G.drawPile = [];
        G.discardPile = [];
        onBegin(G, ctx);
        expect(setPhase).toHaveBeenCalledWith('end');
    });
    it('adds begin_of_turn scenes and effects for stable cards', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const setActivePlayers = jest.fn();
        const ctx = (0, testHelpers_1.createCtx)({ phase: 'main', currentPlayer: '0', events: { ...(0, testHelpers_1.createCtx)().events, setActivePlayers } });
        const rhinocorn = G.deck.find((card) => card.title === 'Rhinocorn');
        const doubleDutch = G.deck.find((card) => card.title === 'Double Dutch');
        G.stable['0'] = [rhinocorn.id];
        G.upgradeDowngradeStable['0'] = [doubleDutch.id];
        G.script.scenes = [{ id: 'old-scene', mandatory: true, endTurnImmediately: false, actions: [] }];
        G.countPlayedCardsInActionPhase = 2;
        G.mustEndTurnImmediately = true;
        onBegin(G, ctx);
        expect(G.script.scenes.length).toBeGreaterThan(0);
        expect(G.playerEffects['0'].some((entry) => entry.cardID === doubleDutch.id && entry.effect.key === 'double_dutch')).toBe(true);
        expect(G.countPlayedCardsInActionPhase).toBe(0);
        expect(G.mustEndTurnImmediately).toBe(false);
        expect(setActivePlayers).toHaveBeenCalledWith({ all: 'beginning' });
    });
    it('does not add begin_of_turn unicorn scenes when my_unicorns_are_basic suppresses them', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const setActivePlayers = jest.fn();
        const ctx = (0, testHelpers_1.createCtx)({ phase: 'main', currentPlayer: '0', events: { ...(0, testHelpers_1.createCtx)().events, setActivePlayers } });
        const rhinocorn = G.deck.find((card) => card.title === 'Rhinocorn');
        G.stable['0'] = [rhinocorn.id];
        G.playerEffects['0'] = [{ effect: { key: 'my_unicorns_are_basic' } }];
        onBegin(G, ctx);
        expect(G.script.scenes).toEqual([]);
        expect(setActivePlayers).toHaveBeenCalledWith({ all: 'beginning' });
    });
});
// ─── game management moves ───────────────────────────────────────────────────
describe('game management moves', () => {
    const pregameMoves = game_2.default.turn.stages.pregame.moves;
    const beginningMoves = game_2.default.turn.stages.beginning.moves;
    const actionPhaseMoves = game_2.default.turn.stages.action_phase.moves;
    it('abolishGame returns INVALID_MOVE when someone else tries to abort', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '1' });
        expect(pregameMoves.abolishGame(G, ctx, '0')).toBe(core_1.INVALID_MOVE);
    });
    it('abolishGame ends the game when called by the owner', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const endGame = jest.fn();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0', events: { ...(0, testHelpers_1.createCtx)().events, endGame } });
        pregameMoves.abolishGame(G, ctx, '0');
        expect(endGame).toHaveBeenCalledWith({ aborted: true });
    });
    it('heartbeat updates the player lastHeartbeat value', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0' });
        const previous = G.lastHeartbeat['0'];
        pregameMoves.heartbeat(G, ctx, '0');
        expect(G.lastHeartbeat['0']).toBeGreaterThanOrEqual(previous);
    });
    it('cancelAbandonedGame ends the game when the owner heartbeat is too old', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const endGame = jest.fn();
        const ctx = (0, testHelpers_1.createCtx)({ events: { ...(0, testHelpers_1.createCtx)().events, endGame } });
        G.lastHeartbeat[G.owner] = Date.now() - 61000;
        pregameMoves.cancelAbandonedGame(G, ctx);
        expect(endGame).toHaveBeenCalledWith({ aborted: true });
    });
    it('drawAndAdvance draws one card, clears scenes, and enters action phase', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const setActivePlayers = jest.fn();
        const ctx = (0, testHelpers_1.createCtx)({ currentPlayer: '0', events: { ...(0, testHelpers_1.createCtx)().events, setActivePlayers } });
        const handSizeBefore = G.hand['0'].length;
        G.script.scenes = [{
                id: 'scene',
                mandatory: true,
                endTurnImmediately: false,
                actions: [],
            }];
        beginningMoves.drawAndAdvance(G, ctx);
        expect(G.hand['0']).toHaveLength(handSizeBefore + 1);
        expect(G.script.scenes).toEqual([]);
        expect(setActivePlayers).toHaveBeenCalledWith({ all: 'action_phase' });
    });
    it('drawAndEnd draws one card, clears scenes, and increments played-card count', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ currentPlayer: '0' });
        const handSizeBefore = G.hand['0'].length;
        G.script.scenes = [{
                id: 'scene',
                mandatory: true,
                endTurnImmediately: false,
                actions: [],
            }];
        actionPhaseMoves.drawAndEnd(G, ctx);
        expect(G.hand['0']).toHaveLength(handSizeBefore + 1);
        expect(G.script.scenes).toEqual([]);
        expect(G.countPlayedCardsInActionPhase).toBe(1);
    });
});
// ─── ending and skipping moves ───────────────────────────────────────────────
describe('end and skipExecuteDo moves', () => {
    const beginningMoves = game_2.default.turn.stages.beginning.moves;
    it('end returns INVALID_MOVE when invoked by a non-owner for another player', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '1' });
        expect(beginningMoves.end(G, ctx, '0')).toBe(core_1.INVALID_MOVE);
    });
    it('end creates a discard-over-limit scene instead of ending the turn when hand is too large', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0' });
        while (G.hand['0'].length <= 7) {
            (0, testHelpers_1.giveCardToHand)(G, '0', 'basic');
        }
        beginningMoves.end(G, ctx, '0');
        expect(G.script.scenes).toHaveLength(1);
        expect(G.script.scenes[0].mandatory).toBe(true);
        expect(G.script.scenes[0].actions[0].instructions[0].do.key).toBe('discard');
    });
    it('end consumes change_of_luck and keeps the same player on the next turn', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const endTurn = jest.fn();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0', events: { ...(0, testHelpers_1.createCtx)().events, endTurn } });
        G.playerEffects['0'] = [{ effect: { key: 'change_of_luck' } }];
        beginningMoves.end(G, ctx, '0');
        expect(G.playerEffects['0']).toEqual([]);
        expect(endTurn).toHaveBeenCalledWith({ next: '0' });
    });
    it('end without change_of_luck ends the turn immediately when the hand is within limit', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const endTurn = jest.fn();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0', events: { ...(0, testHelpers_1.createCtx)().events, endTurn } });
        beginningMoves.end(G, ctx, '0');
        expect(endTurn).toHaveBeenCalledWith();
    });
    it('commit marks the chosen scene as mandatory', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0' });
        G.script.scenes = [{
                id: 'scene-1',
                mandatory: false,
                endTurnImmediately: false,
                actions: [],
            }];
        beginningMoves.commit(G, ctx, 'scene-1');
        expect(G.script.scenes[0].mandatory).toBe(true);
    });
    it('skipExecuteDo marks only the protagonist instructions as executed', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0' });
        G.script.scenes = [{
                id: 'scene-1',
                mandatory: true,
                endTurnImmediately: false,
                actions: [{
                        type: 'action',
                        instructions: [{
                                id: 'instruction-1',
                                protagonist: '0',
                                state: 'open',
                                do: { key: 'discard', info: { count: 1, type: 'any' } },
                                ui: { type: 'click_on_own_card_in_hand' },
                            }, {
                                id: 'instruction-2',
                                protagonist: '1',
                                state: 'open',
                                do: { key: 'discard', info: { count: 1, type: 'any' } },
                                ui: { type: 'click_on_own_card_in_hand' },
                            }]
                    }]
            }];
        beginningMoves.skipExecuteDo(G, ctx, '0', 'instruction-1');
        expect(G.script.scenes[0].actions[0].instructions[0].state).toBe('executed');
        expect(G.script.scenes[0].actions[0].instructions[1].state).toBe('open');
    });
    it('skipExecuteDo returns INVALID_MOVE when invoked by a different player', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '1' });
        expect(beginningMoves.skipExecuteDo(G, ctx, '0', 'instruction-1')).toBe(core_1.INVALID_MOVE);
    });
    it('skipExecuteDo leaves scenes unchanged when the instruction ID does not exist', () => {
        const G = (0, testHelpers_1.setupTestGame)();
        const ctx = (0, testHelpers_1.createCtx)({ playerID: '0' });
        G.script.scenes = [{
                id: 'scene-1',
                mandatory: true,
                endTurnImmediately: false,
                actions: [{
                        type: 'action',
                        instructions: [{
                                id: 'instruction-1',
                                protagonist: '0',
                                state: 'open',
                                do: { key: 'discard', info: { count: 1, type: 'any' } },
                                ui: { type: 'click_on_own_card_in_hand' },
                            }]
                    }]
            }];
        beginningMoves.skipExecuteDo(G, ctx, '0', 'missing-instruction');
        expect(G.script.scenes[0].actions[0].instructions[0].state).toBe('open');
    });
});
