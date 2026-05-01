import { executeDo } from '../operations/executeDo';
import { _addSceneFromDo } from '../state';
import { setupTestGame, createCtx, giveCardToStable, giveCardToHand } from '../testHelpers';

// Helper: add a scene for the Two-For-One card and return the first instruction ID
function setupTwoForOneScene(G: ReturnType<typeof setupTestGame>, ctx: ReturnType<typeof createCtx>) {
    const twoForOne = G.deck.find(c => c.title === 'Two-For-One')!;
    // Place the magic card in temporaryStable so executeDo can clean it up
    G.temporaryStable['0'] = [twoForOne.id];
    _addSceneFromDo(G, ctx, twoForOne.id, '0', 'enter');
    return G.script.scenes[0];
}

// ─── executeDo — instruction state transitions ────────────────────────────────

describe('executeDo — instruction state transitions', () => {
    it('marks the instruction as in_progress after execution', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const scene = setupTwoForOneScene(G, ctx);
        const instruction = scene.actions[0].instructions[0];
        // sacrifice needs a card in the stable
        const cardID = giveCardToStable(G, '0', 'basic');

        executeDo(G, ctx, instruction.id, { protagonist: '0', cardID } as any);

        expect(instruction.state).toBe('executed');
    });

    it('marks all instructions in the action as executed after a non-counted operation', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const scene = setupTwoForOneScene(G, ctx);
        const action = scene.actions[0];
        const instruction = action.instructions[0];
        const cardID = giveCardToStable(G, '0', 'basic');

        executeDo(G, ctx, instruction.id, { protagonist: '0', cardID } as any);

        action.instructions.forEach(ins => {
            expect(ins.state).toBe('executed');
        });
    });

    it('decrements destroy count instead of marking executed when count > 1', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        // Build a scene with a destroy count=2 instruction manually
        const instructionID = 'test-destroy-ins';
        G.script.scenes.push({
            id: 'test-scene',
            mandatory: true,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: instructionID,
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'destroy', info: { type: 'any', count: 2 } },
                    ui: { type: 'card_to_card' },
                }]
            }]
        });

        // Add 2 cards so after destroying 1, a target still exists (prevents autoFizzle)
        const cardID = giveCardToStable(G, '1', 'basic');
        giveCardToStable(G, '1', 'basic');

        executeDo(G, ctx, instructionID, { protagonist: '0', cardID } as any);

        const ins = G.script.scenes[0].actions[0].instructions[0];
        // count should have been decremented to 1, not marked executed yet
        expect((ins.do as any).info.count).toBe(1);
        expect(ins.state).not.toBe('executed');
    });

    it('marks instruction executed when destroy count reaches 1 (last destroy)', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const instructionID = 'test-destroy-last';
        G.script.scenes.push({
            id: 'test-scene-2',
            mandatory: true,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: instructionID,
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'destroy', info: { type: 'any', count: 1 } },
                    ui: { type: 'card_to_card' },
                }]
            }]
        });

        const cardID = giveCardToStable(G, '1', 'basic');

        executeDo(G, ctx, instructionID, { protagonist: '0', cardID } as any);

        const ins = G.script.scenes[0].actions[0].instructions[0];
        expect(ins.state).toBe('executed');
    });

    it('decrements discard count instead of marking executed when count > 1', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const instructionID = 'test-discard-ins';
        G.script.scenes.push({
            id: 'test-discard-scene',
            mandatory: true,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: instructionID,
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'discard', info: { count: 2, type: 'any' } },
                    ui: { type: 'card_to_card' },
                }]
            }]
        });

        const cardID = giveCardToHand(G, '0', 'basic');

        executeDo(G, ctx, instructionID, { protagonist: '0', cardID } as any);

        const ins = G.script.scenes[0].actions[0].instructions[0];
        expect((ins.do as any).info.count).toBe(1);
        expect(ins.state).not.toBe('executed');
    });

    it('marks destroy instructions executed immediately when no count is provided', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const instructionID = 'test-destroy-no-count';
        G.script.scenes.push({
            id: 'test-scene-no-count',
            mandatory: true,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: instructionID,
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'destroy', info: { type: 'any' } },
                    ui: { type: 'card_to_card' },
                }]
            }]
        });

        const cardID = giveCardToStable(G, '1', 'basic');

        executeDo(G, ctx, instructionID, { protagonist: '0', cardID } as any);

        expect(G.script.scenes[0].actions[0].instructions[0].state).toBe('executed');
    });
});

// ─── executeDo — magic card cleanup ──────────────────────────────────────────

describe('executeDo — magic card cleanup after last action', () => {
    it('moves the magic card from temporaryStable to discardPile after last action executes', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const scene = setupTwoForOneScene(G, ctx);
        const twoForOneID = G.temporaryStable['0'][0];

        // Mark all actions except the last as executed so the last action triggers cleanup
        scene.actions.forEach((action, idx) => {
            if (idx < scene.actions.length - 1) {
                action.instructions.forEach(ins => { ins.state = 'executed'; });
            }
        });

        const lastAction = scene.actions[scene.actions.length - 1];
        const lastInstruction = lastAction.instructions[0];
        const cardID = giveCardToStable(G, '1', 'basic');

        executeDo(G, ctx, lastInstruction.id, { protagonist: '0', cardID } as any);

        expect(G.temporaryStable['0']).toHaveLength(0);
        expect(G.discardPile).toContain(twoForOneID);
    });

    it('does not discard the Shake Up magic card after its last action executes', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const shakeUp = G.deck.find(c => c.title === 'Shake Up')!;
        G.temporaryStable['0'] = [shakeUp.id];
        G.script.scenes.push({
            id: 'shake-up-scene',
            mandatory: true,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: 'shake-up-instruction',
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'shakeUp' },
                    ui: { type: 'none' } as any,
                }]
            }]
        });

        executeDo(G, ctx, 'shake-up-instruction', { protagonist: '0', sourceCardID: shakeUp.id } as any);

        expect(G.temporaryStable['0']).toHaveLength(0);
        expect(G.discardPile).not.toContain(shakeUp.id);
    });

    it('does not change the discard pile when the last action executes without a temporary magic card', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const discardBefore = [...G.discardPile];
        const handSizeBefore = G.hand['0'].length;
        G.script.scenes.push({
            id: 'cleanup-no-temp-scene',
            mandatory: true,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: 'cleanup-no-temp-instruction',
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'draw', info: { count: 1 } },
                    ui: { type: 'click_on_drawPile' },
                }]
            }]
        });

        executeDo(G, ctx, 'cleanup-no-temp-instruction', { protagonist: '0', count: 1 } as any);

        expect(G.discardPile).toEqual(discardBefore);
        expect(G.temporaryStable['0']).toEqual([]);
        expect(G.hand['0']).toHaveLength(handSizeBefore + 1);
    });
});

// ─── executeDo — save_mate_by_sacrifice skips destroy ─────────────────────────

describe('executeDo — save_mate_by_sacrifice effect', () => {
    it('skips the actual destroy when the target has save_mate_by_sacrifice', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const instructionID = 'test-save-mate';
        G.script.scenes.push({
            id: 'save-mate-scene',
            mandatory: true,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: instructionID,
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'destroy', info: { type: 'any', count: 1 } },
                    ui: { type: 'card_to_card' },
                }]
            }]
        });

        const cardID = giveCardToStable(G, '1', 'basic');
        G.playerEffects['1'] = [{ effect: { key: 'save_mate_by_sacrifice' } }];
        const stableSizeBefore = G.stable['1'].length;

        executeDo(G, ctx, instructionID, { protagonist: '0', cardID } as any);

        // Card should NOT have been removed (destroy was skipped)
        expect(G.stable['1'].length).toBe(stableSizeBefore);
    });
});

// ─── executeDo — changeOfLuck effect ─────────────────────────────────────────

describe('executeDo — changeOfLuck applied after discard', () => {
    it('adds a change_of_luck player effect when the discard instruction has changeOfLuck=true', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const instructionID = 'test-change-of-luck';
        G.script.scenes.push({
            id: 'change-of-luck-scene',
            mandatory: true,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: instructionID,
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'discard', info: { count: 1, type: 'any', changeOfLuck: true } },
                    ui: { type: 'card_to_card' },
                }]
            }]
        });

        const cardID = giveCardToHand(G, '0', 'basic');

        executeDo(G, ctx, instructionID, { protagonist: '0', cardID } as any);

        const hasEffect = G.playerEffects['0'].some(e => e.effect.key === 'change_of_luck');
        expect(hasEffect).toBe(true);
    });

    it('does not add change_of_luck when the flag is absent', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const instructionID = 'test-no-change-of-luck';
        G.script.scenes.push({
            id: 'no-change-of-luck-scene',
            mandatory: true,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: instructionID,
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'discard', info: { count: 1, type: 'any' } },
                    ui: { type: 'card_to_card' },
                }]
            }]
        });

        const cardID = giveCardToHand(G, '0', 'basic');

        executeDo(G, ctx, instructionID, { protagonist: '0', cardID } as any);

        const hasEffect = G.playerEffects['0'].some(e => e.effect.key === 'change_of_luck');
        expect(hasEffect).toBe(false);
    });
});

// ─── executeDo — endTurnImmediately flag ──────────────────────────────────────

describe('executeDo — endTurnImmediately flag', () => {
    it('sets mustEndTurnImmediately when the scene has endTurnImmediately=true', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const instructionID = 'test-end-turn';
        const cardID = giveCardToStable(G, '0', 'basic');
        G.script.scenes.push({
            id: 'end-turn-scene',
            mandatory: true,
            endTurnImmediately: true,
            actions: [{
                type: 'action',
                instructions: [{
                    id: instructionID,
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'sacrifice', info: { type: 'any' } },
                    ui: { type: 'card_to_card' },
                }]
            }]
        });

        executeDo(G, ctx, instructionID, { protagonist: '0', cardID } as any);

        expect(G.mustEndTurnImmediately).toBe(true);
    });

    it('does not set mustEndTurnImmediately when endTurnImmediately=false', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const instructionID = 'test-no-end-turn';
        G.mustEndTurnImmediately = false;
        const cardID = giveCardToStable(G, '0', 'basic');
        G.script.scenes.push({
            id: 'no-end-turn-scene',
            mandatory: false,
            endTurnImmediately: false,
            actions: [{
                type: 'action',
                instructions: [{
                    id: instructionID,
                    protagonist: '0',
                    state: 'open',
                    do: { key: 'sacrifice', info: { type: 'any' } },
                    ui: { type: 'card_to_card' },
                }]
            }]
        });

        executeDo(G, ctx, instructionID, { protagonist: '0', cardID } as any);

        expect(G.mustEndTurnImmediately).toBe(false);
    });
});
