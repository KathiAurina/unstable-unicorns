import { INVALID_MOVE } from 'boardgame.io/core';
import { setupTestGame, setupSandboxTestGame, createCtx, giveCardToStable, giveCardToHand } from '../testHelpers';
import { canPlayCard, canDraw } from '../game';
import UnstableUnicorns from '../game';
import {
    sandboxBypassActionLimit,
    sandboxSkipNeigh,
} from '../sandbox/sandboxOverrides';
import {
    sandboxAddToHand,
    sandboxAddToStable,
    sandboxAddToDiscard,
    sandboxAddToDeckTop,
    sandboxAddToNursery,
    sandboxBounceCard,
    sandboxDestroyCard,
    sandboxStealCard,
    sandboxHandToStable,
    sandboxSetSetting,
    sandboxDraw,
    serializeSandboxSnapshot,
    sandboxLoadState,
} from '../sandbox/sandboxMoves';
import { Cards } from '../card';

const ginormousDefIndex = Cards.findIndex(c => c.title === 'Ginormous Unicorn');
const basicDefIndex = Cards.findIndex(c => c.title === 'Basic Unicorn');

// ─── sandboxOverrides ─────────────────────────────────────────────────────────

describe('sandboxBypassActionLimit', () => {
    it('returns false when G.sandbox is falsy', () => {
        const G = setupTestGame();
        expect(sandboxBypassActionLimit(G)).toBe(false);
    });

    it('returns false when sandbox is true but infiniteActions is false', () => {
        const G = setupTestGame();
        G.sandbox = true;
        G.sandboxSettings = { infiniteActions: false, skipNeigh: false };
        expect(sandboxBypassActionLimit(G)).toBe(false);
    });

    it('returns true when sandbox is true and infiniteActions is true', () => {
        const G = setupTestGame();
        G.sandbox = true;
        G.sandboxSettings = { infiniteActions: true, skipNeigh: false };
        expect(sandboxBypassActionLimit(G)).toBe(true);
    });
});

describe('sandboxSkipNeigh', () => {
    it('returns false when G.sandbox is falsy', () => {
        const G = setupTestGame();
        expect(sandboxSkipNeigh(G)).toBe(false);
    });

    it('returns false when sandbox is true but skipNeigh is false', () => {
        const G = setupTestGame();
        G.sandbox = true;
        G.sandboxSettings = { infiniteActions: false, skipNeigh: false };
        expect(sandboxSkipNeigh(G)).toBe(false);
    });

    it('returns true when sandbox is true and skipNeigh is true', () => {
        const G = setupTestGame();
        G.sandbox = true;
        G.sandboxSettings = { infiniteActions: false, skipNeigh: true };
        expect(sandboxSkipNeigh(G)).toBe(true);
    });
});

// ─── sandbox guard ────────────────────────────────────────────────────────────

describe('sandbox guard rejects non-sandbox games', () => {
    it('sandboxAddToHand returns INVALID_MOVE when G.sandbox is not set', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        expect(sandboxAddToHand(G, ctx, '0', basicDefIndex)).toBe(INVALID_MOVE);
    });

    it('sandboxSetSetting returns INVALID_MOVE when G.sandbox is not set', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        expect(sandboxSetSetting(G, ctx, 'infiniteActions', true)).toBe(INVALID_MOVE);
    });

    it('sandboxBounceCard returns INVALID_MOVE when G.sandbox is not set', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');
        expect(sandboxBounceCard(G, ctx, cardID)).toBe(INVALID_MOVE);
    });
});

// ─── sandbox card spawning ────────────────────────────────────────────────────

describe('sandboxAddToHand', () => {
    it('spawns a card with the correct title into the target player hand', () => {
        const G = setupTestGame();
        G.sandbox = true;
        const ctx = createCtx();
        const sizeBefore = G.hand['0'].length;

        sandboxAddToHand(G, ctx, '0', ginormousDefIndex);

        expect(G.hand['0'].length).toBe(sizeBefore + 1);
        const spawned = G.deck[G.hand['0'][G.hand['0'].length - 1]];
        expect(spawned.title).toBe('Ginormous Unicorn');
    });
});

describe('sandboxAddToStable - without enter', () => {
    it('places a unicorn card directly into the stable', () => {
        const G = setupTestGame();
        G.sandbox = true;
        const ctx = createCtx();

        sandboxAddToStable(G, ctx, '0', basicDefIndex, false);

        const spawned = G.deck[G.stable['0'][G.stable['0'].length - 1]];
        expect(spawned.title).toBe('Basic Unicorn');
        expect(G.playerEffects['0']).toHaveLength(0);
    });

    it('places an upgrade card into upgradeDowngradeStable', () => {
        const G = setupTestGame();
        G.sandbox = true;
        const ctx = createCtx();
        const yayDefIndex = Cards.findIndex(c => c.title === 'Yay');
        const sizeBefore = G.upgradeDowngradeStable['0'].length;

        sandboxAddToStable(G, ctx, '0', yayDefIndex, false);

        expect(G.upgradeDowngradeStable['0'].length).toBe(sizeBefore + 1);
        expect(G.playerEffects['0']).toHaveLength(0);
    });
});

describe('sandboxAddToStable - with enter', () => {
    it('triggers enter effects when withEnter is true (Ginormous adds count_as_two)', () => {
        const G = setupTestGame();
        G.sandbox = true;
        const ctx = createCtx();

        sandboxAddToStable(G, ctx, '0', ginormousDefIndex, true);

        expect(G.playerEffects['0'].some(e => e.effect.key === 'count_as_two')).toBe(true);
        expect(G.playerEffects['0'].some(e => e.effect.key === 'you_cannot_play_neigh')).toBe(true);
    });
});

describe('sandboxAddToDiscard / sandboxAddToDeckTop / sandboxAddToNursery', () => {
    it('sandboxAddToDiscard places card in discard pile', () => {
        const G = setupTestGame();
        G.sandbox = true;
        const ctx = createCtx();
        const sizeBefore = G.discardPile.length;

        sandboxAddToDiscard(G, ctx, basicDefIndex);

        expect(G.discardPile.length).toBe(sizeBefore + 1);
    });

    it('sandboxAddToDeckTop places card at front of draw pile', () => {
        const G = setupTestGame();
        G.sandbox = true;
        const ctx = createCtx();

        sandboxAddToDeckTop(G, ctx, ginormousDefIndex);

        const topCard = G.deck[G.drawPile[0]];
        expect(topCard.title).toBe('Ginormous Unicorn');
    });

    it('sandboxAddToNursery places card in nursery', () => {
        const G = setupTestGame();
        G.sandbox = true;
        const ctx = createCtx();
        const sizeBefore = G.nursery.length;

        sandboxAddToNursery(G, ctx, basicDefIndex);

        expect(G.nursery.length).toBe(sizeBefore + 1);
    });
});

// ─── sandbox interactive moves ────────────────────────────────────────────────

describe('sandboxBounceCard', () => {
    it('returns a stable card to the owner hand', () => {
        const G = setupTestGame();
        G.sandbox = true;
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');
        const handSizeBefore = G.hand['0'].length;

        sandboxBounceCard(G, ctx, cardID);

        expect(G.stable['0']).not.toContain(cardID);
        expect(G.hand['0']).toContain(cardID);
        expect(G.hand['0'].length).toBe(handSizeBefore + 1);
    });

    it('returns a baby unicorn to the nursery instead of the hand', () => {
        const G = setupTestGame();
        G.sandbox = true;
        const ctx = createCtx();
        const babyID = G.deck.find(c => c.type === 'baby')!.id;
        G.stable['0'] = [...G.stable['0'], babyID];
        const nurseryBefore = G.nursery.length;

        sandboxBounceCard(G, ctx, babyID);

        expect(G.nursery).toContain(babyID);
        expect(G.nursery.length).toBe(nurseryBefore + 1);
        expect(G.hand['0']).not.toContain(babyID);
    });
});

describe('sandboxDestroyCard', () => {
    it('moves a stable card to the discard pile', () => {
        const G = setupTestGame();
        G.sandbox = true;
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');

        sandboxDestroyCard(G, ctx, cardID);

        expect(G.stable['0']).not.toContain(cardID);
        expect(G.discardPile).toContain(cardID);
    });

    it('returns a baby unicorn to nursery when destroyed', () => {
        const G = setupTestGame();
        G.sandbox = true;
        const ctx = createCtx();
        const babyID = G.deck.find(c => c.type === 'baby')!.id;
        G.stable['0'] = [...G.stable['0'], babyID];

        sandboxDestroyCard(G, ctx, babyID);

        expect(G.nursery).toContain(babyID);
        expect(G.discardPile).not.toContain(babyID);
    });
});

describe('sandboxStealCard', () => {
    it('moves a unicorn from one player stable to another', () => {
        const G = setupTestGame();
        G.sandbox = true;
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');

        sandboxStealCard(G, ctx, cardID, '1');

        expect(G.stable['0']).not.toContain(cardID);
        expect(G.stable['1']).toContain(cardID);
    });
});

describe('sandboxHandToStable', () => {
    it('moves a card from hand to the target player stable', () => {
        const G = setupTestGame();
        G.sandbox = true;
        const ctx = createCtx();
        const cardID = giveCardToHand(G, '0', 'basic');

        sandboxHandToStable(G, ctx, cardID, '1');

        expect(G.hand['0']).not.toContain(cardID);
        expect(G.stable['1']).toContain(cardID);
    });
});

// ─── sandbox settings ─────────────────────────────────────────────────────────

describe('sandboxSetSetting', () => {
    it('toggles infiniteActions off', () => {
        const G = setupTestGame();
        G.sandbox = true;
        G.sandboxSettings = { infiniteActions: true, skipNeigh: true };
        const ctx = createCtx();

        sandboxSetSetting(G, ctx, 'infiniteActions', false);

        expect(G.sandboxSettings!.infiniteActions).toBe(false);
    });

    it('toggles skipNeigh on', () => {
        const G = setupTestGame();
        G.sandbox = true;
        G.sandboxSettings = { infiniteActions: false, skipNeigh: false };
        const ctx = createCtx();

        sandboxSetSetting(G, ctx, 'skipNeigh', true);

        expect(G.sandboxSettings!.skipNeigh).toBe(true);
    });

    it('returns INVALID_MOVE when sandboxSettings is undefined', () => {
        const G = setupTestGame();
        G.sandbox = true;
        G.sandboxSettings = undefined;
        const ctx = createCtx();

        expect(sandboxSetSetting(G, ctx, 'infiniteActions', true)).toBe(INVALID_MOVE);
    });
});

// ─── sandbox save / load ──────────────────────────────────────────────────────

describe('serializeSandboxSnapshot / sandboxLoadState', () => {
    it('serializeSandboxSnapshot captures the expected state keys', () => {
        const G = setupSandboxTestGame();
        const snapshot = serializeSandboxSnapshot(G);

        expect(snapshot).toHaveProperty('hand');
        expect(snapshot).toHaveProperty('stable');
        expect(snapshot).toHaveProperty('temporaryStable');
        expect(snapshot).toHaveProperty('upgradeDowngradeStable');
        expect(snapshot).toHaveProperty('drawPile');
        expect(snapshot).toHaveProperty('discardPile');
        expect(snapshot).toHaveProperty('nursery');
        expect(snapshot).toHaveProperty('playerEffects');
        expect(snapshot).toHaveProperty('deck');
    });

    it('sandboxLoadState restores state from a snapshot (round-trip)', () => {
        const G = setupSandboxTestGame();
        const ctx = createCtx();
        const snapshot = JSON.parse(JSON.stringify(serializeSandboxSnapshot(G)));
        const originalHandLength = snapshot.hand['0'].length;

        // mutate state, then reload from the deep-copied snapshot
        G.hand['0'] = [];
        sandboxLoadState(G, ctx, snapshot);

        expect(G.hand['0'].length).toBe(originalHandLength);
    });
});

// ─── sandbox game setup ───────────────────────────────────────────────────────

describe('setupSandboxTestGame', () => {
    it('sets G.sandbox to true', () => {
        const G = setupSandboxTestGame();
        expect(G.sandbox).toBe(true);
    });

    it('initializes sandboxSettings with both toggles on by default', () => {
        const G = setupSandboxTestGame();
        expect(G.sandboxSettings?.infiniteActions).toBe(true);
        expect(G.sandboxSettings?.skipNeigh).toBe(true);
    });

    it('pre-assigns one baby unicorn per player in their stable', () => {
        const G = setupSandboxTestGame();
        G.players.forEach(pl => {
            expect(G.stable[pl.id].length).toBe(1);
            const babyCard = G.deck[G.stable[pl.id][0]];
            expect(babyCard.type).toBe('baby');
        });
    });

    it('marks all players as ready', () => {
        const G = setupSandboxTestGame();
        G.players.forEach(pl => {
            expect(G.ready[pl.id]).toBe(true);
        });
    });
});

// ─── sandbox integration with game flow ───────────────────────────────────────

describe('sandbox infinite actions integration', () => {
    it('canPlayCard returns true even after playing one card when infiniteActions is true', () => {
        const G = setupSandboxTestGame();
        const ctx = createCtx();
        G.countPlayedCardsInActionPhase = 1;
        const cardID = giveCardToHand(G, '0', 'basic');

        expect(canPlayCard(G, ctx, '0', cardID)).toBe(true);
    });

    it('canDraw returns true in action_phase when infiniteActions is true', () => {
        const G = setupSandboxTestGame();
        const ctx = createCtx({ activePlayers: { '0': 'action_phase', '1': 'action_phase' } });
        G.countPlayedCardsInActionPhase = 1;

        expect(canDraw(G, ctx)).toBe(true);
    });
});

describe('sandbox skipNeigh integration', () => {
    it('playCard skips neigh discussion and enters card directly when skipNeigh is true', () => {
        const G = setupSandboxTestGame();
        const ctx = createCtx();
        const cardID = giveCardToHand(G, '0', 'basic');
        const actionPhaseMoves = (UnstableUnicorns as any).turn.stages.action_phase.moves;

        actionPhaseMoves.playCard(G, ctx, '0', cardID);

        expect(G.neighDiscussion).toBeUndefined();
        expect(G.stable['0']).toContain(cardID);
    });

    it('playCard sets neighDiscussion when skipNeigh is false', () => {
        const G = setupSandboxTestGame();
        G.sandboxSettings!.skipNeigh = false;
        const ctx = createCtx();
        const cardID = giveCardToHand(G, '0', 'basic');
        const actionPhaseMoves = (UnstableUnicorns as any).turn.stages.action_phase.moves;

        actionPhaseMoves.playCard(G, ctx, '0', cardID);

        expect(G.neighDiscussion).toBeDefined();
    });
});
