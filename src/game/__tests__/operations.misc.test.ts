import { makeSomeoneDiscard, blatantThievery1, findBlatantThieveryTargets, findMakeSomeoneDiscardTarget, findPullRandomTargets } from '../operations/misc';
import { setupTestGame, createCtx, giveCardToHand } from '../testHelpers';

// ─── makeSomeoneDiscard ───────────────────────────────────────────────────────

describe('makeSomeoneDiscard', () => {
    it('adds exactly one new scene to the script', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const scenesBefore = G.script.scenes.length;

        makeSomeoneDiscard(G, ctx, { protagonist: '0', playerID: '1' });

        expect(G.script.scenes.length).toBe(scenesBefore + 1);
    });

    it('the added scene is mandatory', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        makeSomeoneDiscard(G, ctx, { protagonist: '0', playerID: '1' });

        const scene = G.script.scenes[G.script.scenes.length - 1];
        expect(scene.mandatory).toBe(true);
    });

    it('the instruction in the scene targets the specified player', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        makeSomeoneDiscard(G, ctx, { protagonist: '0', playerID: '1' });

        const scene = G.script.scenes[G.script.scenes.length - 1];
        expect(scene.actions[0].instructions[0].protagonist).toBe('1');
    });

    it('the instruction is a discard of 1 card of any type', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        makeSomeoneDiscard(G, ctx, { protagonist: '0', playerID: '1' });

        const instruction = G.script.scenes[G.script.scenes.length - 1].actions[0].instructions[0];
        expect(instruction.do.key).toBe('discard');
        expect((instruction.do as any).info.count).toBe(1);
        expect((instruction.do as any).info.type).toBe('any');
    });

    it('the added instruction state is open (not yet executed)', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        makeSomeoneDiscard(G, ctx, { protagonist: '0', playerID: '1' });

        const instruction = G.script.scenes[G.script.scenes.length - 1].actions[0].instructions[0];
        expect(instruction.state).toBe('open');
    });

    it('calling makeSomeoneDiscard twice adds two independent scenes', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const scenesBefore = G.script.scenes.length;

        makeSomeoneDiscard(G, ctx, { protagonist: '0', playerID: '1' });
        makeSomeoneDiscard(G, ctx, { protagonist: '0', playerID: '1' });

        expect(G.script.scenes.length).toBe(scenesBefore + 2);
    });
});

// ─── blatantThievery1 ─────────────────────────────────────────────────────────

describe('blatantThievery1', () => {
    it('moves the card at the specified hand index from the target to the protagonist', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const targetCard = G.hand['1'][0];

        blatantThievery1(G, ctx, { protagonist: '0', handIndex: 0, from: '1' });

        expect(G.hand['1']).not.toContain(targetCard);
        expect(G.hand['0']).toContain(targetCard);
    });

    it('reduces the target hand by one card', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const sizeBefore = G.hand['1'].length;

        blatantThievery1(G, ctx, { protagonist: '0', handIndex: 0, from: '1' });

        expect(G.hand['1'].length).toBe(sizeBefore - 1);
    });

    it('increases the protagonist hand by one card', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const sizeBefore = G.hand['0'].length;

        blatantThievery1(G, ctx, { protagonist: '0', handIndex: 0, from: '1' });

        expect(G.hand['0'].length).toBe(sizeBefore + 1);
    });
});

// ─── findBlatantThieveryTargets ───────────────────────────────────────────────

describe('findBlatantThieveryTargets', () => {
    it('returns opponent players who have cards in hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findBlatantThieveryTargets(G, ctx, '0');

        expect(targets.some(t => t.playerID === '1')).toBe(true);
    });

    it('never includes the protagonist themselves', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findBlatantThieveryTargets(G, ctx, '0');

        expect(targets.every(t => t.playerID !== '0')).toBe(true);
    });

    it('excludes opponents with empty hands', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['1'] = [];

        const targets = findBlatantThieveryTargets(G, ctx, '0');

        expect(targets.every(t => t.playerID !== '1')).toBe(true);
    });

    it('returns empty when all other players have empty hands', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['1'] = [];

        const targets = findBlatantThieveryTargets(G, ctx, '0');

        expect(targets).toHaveLength(0);
    });
});

// ─── findMakeSomeoneDiscardTarget ─────────────────────────────────────────────

describe('findMakeSomeoneDiscardTarget', () => {
    it('returns opponents who have at least 1 card in hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToHand(G, '1', 'basic');

        const targets = findMakeSomeoneDiscardTarget(G, ctx, '0');

        expect(targets.some(t => t.playerID === '1')).toBe(true);
    });

    it('never includes the protagonist', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findMakeSomeoneDiscardTarget(G, ctx, '0');

        expect(targets.every(t => t.playerID !== '0')).toBe(true);
    });

    it('excludes opponents with empty hands', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['1'] = [];

        const targets = findMakeSomeoneDiscardTarget(G, ctx, '0');

        expect(targets.every(t => t.playerID !== '1')).toBe(true);
    });

    it('returns empty when all opponents have empty hands', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.players.forEach(p => { if (p.id !== '0') G.hand[p.id] = []; });

        const targets = findMakeSomeoneDiscardTarget(G, ctx, '0');

        expect(targets).toHaveLength(0);
    });
});

// ─── findPullRandomTargets ────────────────────────────────────────────────────

describe('findPullRandomTargets', () => {
    it('returns all opponents who have cards in hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToHand(G, '1', 'basic');

        const targets = findPullRandomTargets(G, ctx, '0');

        expect(targets.some(t => t.playerID === '1')).toBe(true);
    });

    it('never includes the protagonist', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findPullRandomTargets(G, ctx, '0');

        expect(targets.every(t => t.playerID !== '0')).toBe(true);
    });

    it('excludes opponents with empty hands', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['1'] = [];

        const targets = findPullRandomTargets(G, ctx, '0');

        expect(targets.every(t => t.playerID !== '1')).toBe(true);
    });

    it('returns empty when all opponents have empty hands', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.players.forEach(p => { if (p.id !== '0') G.hand[p.id] = []; });

        const targets = findPullRandomTargets(G, ctx, '0');

        expect(targets).toHaveLength(0);
    });
});
