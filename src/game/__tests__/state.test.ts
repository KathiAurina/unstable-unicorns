import {
    _addSceneFromDo,
    _findOpenScenesWithProtagonist,
    _findInProgressScenesWithProtagonist,
    _findInstruction,
} from '../state';
import { setupTestGame, createCtx, giveCardToStable } from '../testHelpers';
import _ from 'underscore';

// ─── _addSceneFromDo ──────────────────────────────────────────────────────────

describe('_addSceneFromDo', () => {
    it('adds a scene when a card with an enter trigger is provided', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;

        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'enter');

        expect(G.script.scenes.length).toBe(1);
    });

    it('does nothing when the card has no on triggers', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardWithNoTriggers = G.deck.find(c => !c.on || c.on.length === 0)!;

        _addSceneFromDo(G, ctx, cardWithNoTriggers.id, '0', 'enter');

        expect(G.script.scenes.length).toBe(0);
    });

    it('does nothing when the trigger does not match', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        // Two-For-One fires on "enter", not "begin_of_turn"
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;

        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'begin_of_turn');

        expect(G.script.scenes.length).toBe(0);
    });

    it('fires for any trigger regardless of the card on-trigger', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;

        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'any');

        expect(G.script.scenes.length).toBe(1);
    });

    it('does nothing when my_unicorns_are_basic suppresses the unicorn card', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        // Find a unicorn card that would normally add a scene on enter
        const unicornCard = G.deck.find(
            c => (c.type === 'unicorn' || c.type === 'narwhal') &&
                c.on?.some(o => o.trigger === 'enter' && o.do.type === 'add_scene')
        );
        if (!unicornCard) return; // skip if no such card in deck
        // my_unicorns_are_basic without pandamonium suppresses unicorn on-enter effects
        G.playerEffects['0'] = [{ effect: { key: 'my_unicorns_are_basic' } }];

        _addSceneFromDo(G, ctx, unicornCard.id, '0', 'enter');

        expect(G.script.scenes.length).toBe(0);
    });

    it('does NOT suppress the scene when both my_unicorns_are_basic and pandamonium are active', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const unicornCard = G.deck.find(
            c => (c.type === 'unicorn' || c.type === 'narwhal') &&
                c.on?.some(o => o.trigger === 'enter' && o.do.type === 'add_scene')
        );
        if (!unicornCard) return;
        // pandamonium cancels out my_unicorns_are_basic — effects are restored
        G.playerEffects['0'] = [
            { effect: { key: 'my_unicorns_are_basic' } },
            { effect: { key: 'pandamonium' } },
        ];

        _addSceneFromDo(G, ctx, unicornCard.id, '0', 'enter');

        expect(G.script.scenes.length).toBe(1);
    });

    it('sets mandatory from the card definition', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;

        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'enter');

        expect(G.script.scenes[0].mandatory).toBe(true);
    });

    it('wires the owner as protagonist for "owner" protagonist cards', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;

        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'enter');

        const protagonists = G.script.scenes[0].actions.flatMap(a =>
            a.instructions.map(i => i.protagonist)
        );
        expect(protagonists.every(p => p === '0')).toBe(true);
    });
});

// ─── _findInstruction ─────────────────────────────────────────────────────────

describe('_findInstruction', () => {
    it('returns undefined for an unknown instruction ID', () => {
        const G = setupTestGame();

        expect(_findInstruction(G, 'nonexistent-id')).toBeUndefined();
    });

    it('returns the correct instruction, action and scene by ID', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;
        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'enter');

        const scene = G.script.scenes[0];
        const action = scene.actions[0];
        const instruction = action.instructions[0];

        const result = _findInstruction(G, instruction.id);

        expect(result).not.toBeUndefined();
        expect(result!.instruction.id).toBe(instruction.id);
        expect(result!.action).toBe(action);
        expect(result!.scene).toBe(scene);
    });

    it('finds instructions in later scenes too', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;
        // Add two scenes
        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'enter');
        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'enter');

        const secondScene = G.script.scenes[1];
        const instruction = secondScene.actions[0].instructions[0];

        const result = _findInstruction(G, instruction.id);

        expect(result!.scene).toBe(secondScene);
    });
});

// ─── _findOpenScenesWithProtagonist ───────────────────────────────────────────

describe('_findOpenScenesWithProtagonist', () => {
    it('returns empty when there are no scenes', () => {
        const G = setupTestGame();

        expect(_findOpenScenesWithProtagonist(G, '0')).toHaveLength(0);
    });

    it('returns the open instruction for the matching protagonist', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;
        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'enter');

        const open = _findOpenScenesWithProtagonist(G, '0');

        expect(open.length).toBeGreaterThanOrEqual(1);
        expect(open[0][0].protagonist).toBe('0');
        expect(open[0][0].state).toBe('open');
    });

    it('returns nothing for a player who is not the protagonist', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;
        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'enter');

        const open = _findOpenScenesWithProtagonist(G, '1');

        expect(open).toHaveLength(0);
    });

    it('does not return in-progress instructions from a later scene when the first scene is incomplete', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;
        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'enter');
        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'enter');

        // Only the first scene should surface
        const open = _findOpenScenesWithProtagonist(G, '0');
        expect(open[0][1]).toBe(G.script.scenes[0]);
    });
});

// ─── _findInProgressScenesWithProtagonist ─────────────────────────────────────

describe('_findInProgressScenesWithProtagonist', () => {
    it('returns empty when there are no scenes', () => {
        const G = setupTestGame();

        expect(_findInProgressScenesWithProtagonist(G, '0')).toHaveLength(0);
    });

    it('returns the mandatory first-action instruction when it is open (in-progress semantics)', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;
        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'enter');

        // For a mandatory scene the first action is always surfaced
        const inProgress = _findInProgressScenesWithProtagonist(G, '0');

        expect(inProgress.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty for a non-protagonist player', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;
        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'enter');

        const inProgress = _findInProgressScenesWithProtagonist(G, '1');

        expect(inProgress).toHaveLength(0);
    });

    it('surfaces the second action once the first action is fully executed', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;
        _addSceneFromDo(G, ctx, twoForOne.id, '0', 'enter');

        // Mark the first action as fully executed
        const scene = G.script.scenes[0];
        scene.actions[0].instructions.forEach(i => { i.state = 'executed'; });

        const inProgress = _findInProgressScenesWithProtagonist(G, '0');

        // The second action (destroy) should now be surfaced
        expect(inProgress.length).toBeGreaterThanOrEqual(1);
        expect(inProgress[0][0].do.key).toBe('destroy');
    });
});
