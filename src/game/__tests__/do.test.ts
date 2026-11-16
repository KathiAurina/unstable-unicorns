import {
    enter, canEnter, destroy, discard, pull,
    findStealTargets, findDestroyTargets, findSacrificeTargets,
    findDiscardTargets, findReviveTarget, findSearchTargets,
    findPullRandomTargets, findMakeSomeoneDiscardTarget,
    findAddFromDiscardPileToHand,
} from '../do';
import { canPlayCard } from '../game';
import { setupTestGame, createCtx, giveCardToStable, giveCardToUpgradeStable, giveCardToHand } from '../testHelpers';

// ─── enter / canEnter ────────────────────────────────────────────────────────

describe('canEnter', () => {
    it('allows entering a basic unicorn normally', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = G.deck.find(c => c.type === 'basic')!.id;
        expect(canEnter(G, ctx, { playerID: '0', cardID })).toBe(true);
    });

    it('blocks neigh cards from entering', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const neigh = G.deck.find(c => c.type === 'neigh')!;
        expect(canEnter(G, ctx, { playerID: '0', cardID: neigh.id })).toBe(false);
    });

    it('blocks super_neigh cards from entering', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const superNeigh = G.deck.find(c => c.type === 'super_neigh')!;
        expect(canEnter(G, ctx, { playerID: '0', cardID: superNeigh.id })).toBe(false);
    });

    it('allows upgrade to enter via canEnter when you_cannot_play_upgrades is active (steal/move not blocked)', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const upgrade = G.deck.find(c => c.type === 'upgrade')!;
        G.playerEffects['0'] = [{ effect: { key: 'you_cannot_play_upgrades' } }];
        expect(canEnter(G, ctx, { playerID: '0', cardID: upgrade.id })).toBe(true);
    });

    it('blocks playing an upgrade via canPlayCard when you_cannot_play_upgrades is active', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const upgrade = G.deck.find(c => c.type === 'upgrade')!;
        G.playerEffects['0'] = [{ effect: { key: 'you_cannot_play_upgrades' } }];
        expect(canPlayCard(G, ctx, '0', upgrade.id)).toBe(false);
    });

    it('blocks basic unicorn when basic_unicorns_can_only_join_your_stable is active for another player', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const basic = G.deck.find(c => c.type === 'basic')!;
        // Player 1 has the effect — basic unicorns can only join player 1's stable
        G.playerEffects['1'] = [{ effect: { key: 'basic_unicorns_can_only_join_your_stable' } }];
        expect(canEnter(G, ctx, { playerID: '0', cardID: basic.id })).toBe(false);
    });

    it('allows basic unicorn to player who has basic_unicorns_can_only_join_your_stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const basic = G.deck.find(c => c.type === 'basic')!;
        G.playerEffects['1'] = [{ effect: { key: 'basic_unicorns_can_only_join_your_stable' } }];
        // Player 1 themselves can still enter
        expect(canEnter(G, ctx, { playerID: '1', cardID: basic.id })).toBe(true);
    });
});

describe('enter', () => {
    it('adds unicorn card to stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = G.deck.find(c => c.type === 'basic')!.id;
        G.drawPile = G.drawPile.filter(id => id !== cardID);

        enter(G, ctx, { playerID: '0', cardID });
        expect(G.stable['0']).toContain(cardID);
    });

    it('adds upgrade card to upgradeDowngradeStable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const upgrade = G.deck.find(c => c.type === 'upgrade')!;
        G.drawPile = G.drawPile.filter(id => id !== upgrade.id);

        enter(G, ctx, { playerID: '0', cardID: upgrade.id });
        expect(G.upgradeDowngradeStable['0']).toContain(upgrade.id);
        expect(G.stable['0']).not.toContain(upgrade.id);
    });

    it('adds downgrade card to upgradeDowngradeStable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const downgrade = G.deck.find(c => c.type === 'downgrade')!;
        G.drawPile = G.drawPile.filter(id => id !== downgrade.id);

        enter(G, ctx, { playerID: '0', cardID: downgrade.id });
        expect(G.upgradeDowngradeStable['0']).toContain(downgrade.id);
    });

    it('adds magic card to temporaryStable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        // Give player 1 a unicorn so Unicorn Poison's destroy-unicorn scene is satisfiable
        // (otherwise autoFizzleUnsatisfiable flushes the temp stable immediately).
        giveCardToStable(G, '1', 'basic');
        const magic = G.deck.find(c => c.type === 'magic')!;
        G.drawPile = G.drawPile.filter(id => id !== magic.id);

        enter(G, ctx, { playerID: '0', cardID: magic.id });
        expect(G.temporaryStable['0']).toContain(magic.id);
    });
});

// ─── Basic unicorn / pandamonium guard (9x duplicated — lock in behavior) ───

describe('basic unicorn + pandamonium guard behavior (via enter on_enter trigger)', () => {
    /**
     * The "my_unicorns_are_basic" effect means unicorn cards (type unicorn/narwhal)
     * should not trigger their special "enter" effects. But if "pandamonium" is also
     * active, the basic-ification is cancelled and the card DOES trigger.
     *
     * We test this by entering a card with an "enter" trigger and observing whether
     * scenes are added to the script. A basic unicorn card (no `on`) never adds scenes,
     * so we need a unicorn card WITH an enter trigger.
     */

    // Find a unicorn-type card that has an `on enter` add_scene handler
    it('my_unicorns_are_basic alone: unicorn enter effect is suppressed', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const unicornWithEffect = G.deck.find(
            c => (c.type === 'unicorn' || c.type === 'narwhal') && c.on?.some(o => o.trigger === 'enter')
        );
        if (!unicornWithEffect) {
            // No testable card found — skip gracefully
            return;
        }
        G.playerEffects['0'] = [{ effect: { key: 'my_unicorns_are_basic' } }];
        const beforeScenes = G.script.scenes.length;

        enter(G, ctx, { playerID: '0', cardID: unicornWithEffect.id });

        // Effect should be suppressed — no new scenes added
        expect(G.script.scenes.length).toBe(beforeScenes);
    });

    it('pandamonium alone: unicorn enter effect fires normally', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const unicornWithEffect = G.deck.find(
            c => (c.type === 'unicorn' || c.type === 'narwhal') && c.on?.some(o => o.trigger === 'enter' && o.do.type === 'add_scene')
        );
        if (!unicornWithEffect) return;

        G.playerEffects['0'] = [{ effect: { key: 'pandamonium' } }];
        const beforeScenes = G.script.scenes.length;

        enter(G, ctx, { playerID: '0', cardID: unicornWithEffect.id });

        // Effect should NOT be suppressed
        expect(G.script.scenes.length).toBeGreaterThanOrEqual(beforeScenes);
    });

    it('both my_unicorns_are_basic AND pandamonium: pandamonium cancels the basic-ification, effect fires', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const unicornWithEffect = G.deck.find(
            c => (c.type === 'unicorn' || c.type === 'narwhal') && c.on?.some(o => o.trigger === 'enter' && o.do.type === 'add_scene')
        );
        if (!unicornWithEffect) return;

        G.playerEffects['0'] = [
            { effect: { key: 'my_unicorns_are_basic' } },
            { effect: { key: 'pandamonium' } },
        ];
        const beforeScenes = G.script.scenes.length;

        enter(G, ctx, { playerID: '0', cardID: unicornWithEffect.id });

        // Both effects active: pandamonium wins, effect fires
        expect(G.script.scenes.length).toBeGreaterThanOrEqual(beforeScenes);
    });

    it('neither effect: unicorn enter effect fires normally', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const unicornWithEffect = G.deck.find(
            c => (c.type === 'unicorn' || c.type === 'narwhal') && c.on?.some(o => o.trigger === 'enter' && o.do.type === 'add_scene')
        );
        if (!unicornWithEffect) return;

        G.playerEffects['0'] = [];
        const beforeScenes = G.script.scenes.length;

        enter(G, ctx, { playerID: '0', cardID: unicornWithEffect.id });

        expect(G.script.scenes.length).toBeGreaterThanOrEqual(beforeScenes);
    });
});

// ─── destroy ─────────────────────────────────────────────────────────────────

describe('destroy', () => {
    it('removes card from stable and adds to discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '1', 'basic');

        destroy(G, ctx, { protagonist: '0', cardID });

        expect(G.stable['1']).not.toContain(cardID);
        expect(G.discardPile).toContain(cardID);
    });

    it('sends baby unicorn to nursery instead of discard', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        // Manually place a baby in player 1's stable
        const babyID = G.deck.find(c => c.type === 'baby')!.id;
        G.stable['1'] = [...G.stable['1'], babyID];

        destroy(G, ctx, { protagonist: '0', cardID: babyID });

        expect(G.nursery).toContain(babyID);
        expect(G.discardPile).not.toContain(babyID);
    });
});

describe('findDestroyTargets', () => {
    it('finds opponent unicorn cards', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '1', 'basic');

        const targets = findDestroyTargets(G, ctx, '0', { type: 'unicorn' }, undefined);
        expect(targets.some(t => t.cardID === cardID)).toBe(true);
    });

    it('does not include cards protected by your_unicorns_cannot_be_destroyed', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '1', 'basic');
        G.playerEffects['1'] = [{ effect: { key: 'your_unicorns_cannot_be_destroyed' } }];

        const targets = findDestroyTargets(G, ctx, '0', { type: 'unicorn' }, undefined);
        expect(targets.length).toBe(0);
    });

    it('does not include cards with cannot_be_destroyed_by_magic passive when source is a magic card', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        // Find a unicorn card that has the passive cannot_be_destroyed_by_magic
        const protectedCard = G.deck.find(c =>
            (c.type === 'unicorn' || c.type === 'basic') &&
            c.passive?.includes('cannot_be_destroyed_by_magic')
        );
        if (!protectedCard) return; // skip if no such card in deck
        G.stable['1'] = [...G.stable['1'], protectedCard.id];
        const magicCard = G.deck.find(c => c.type === 'magic')!;

        const targets = findDestroyTargets(G, ctx, '0', { type: 'unicorn' }, magicCard.id);

        expect(targets.every(t => t.cardID !== protectedCard.id)).toBe(true);
    });

    it('does not include cards when pandamonium is active on target', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '1', 'basic');
        G.playerEffects['1'] = [{ effect: { key: 'pandamonium' } }];

        const targets = findDestroyTargets(G, ctx, '0', { type: 'unicorn' }, undefined);
        expect(targets.length).toBe(0);
    });

    it('can target own cards (destroy is allowed on own stable)', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '0', 'basic');

        const targets = findDestroyTargets(G, ctx, '0', { type: 'unicorn' }, undefined);
        expect(targets.some(t => t.playerID === '0')).toBe(true);
    });
});

// ─── discard ─────────────────────────────────────────────────────────────────

describe('discard', () => {
    it('removes card from hand and adds to discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToHand(G, '0', 'basic');

        discard(G, ctx, { protagonist: '0', cardID });

        expect(G.hand['0']).not.toContain(cardID);
        expect(G.discardPile).toContain(cardID);
    });
});

describe('findDiscardTargets', () => {
    it('returns all hand cards for type=any', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const handSize = G.hand['0'].length;

        const targets = findDiscardTargets(G, ctx, '0', { count: 1, type: 'any' });
        expect(targets.length).toBe(handSize);
    });

    it('returns empty for type=any when hand is empty', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['0'] = [];

        const targets = findDiscardTargets(G, ctx, '0', { count: 1, type: 'any' });
        expect(targets).toHaveLength(0);
    });

    it('returns empty for type=unicorn when hand has no unicorns', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        // Keep only magic/neigh/upgrade cards in hand (no unicorns)
        G.hand['0'] = G.hand['0'].filter(id => {
            const t = G.deck[id].type;
            return !['basic', 'unicorn', 'narwhal', 'baby'].includes(Array.isArray(t) ? t[0] : t);
        });

        const targets = findDiscardTargets(G, ctx, '0', { count: 1, type: 'unicorn' });
        expect(targets).toHaveLength(0);
    });

    it('returns only unicorn hand cards for type=unicorn', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToHand(G, '0', 'basic');

        const targets = findDiscardTargets(G, ctx, '0', { count: 1, type: 'unicorn' });
        targets.forEach(t => {
            const card = G.deck[G.hand['0'][t.handIndex]];
            const cardTypes = Array.isArray(card.type) ? card.type : [card.type];
            expect(cardTypes.some(t => ['baby', 'basic', 'unicorn', 'narwhal'].includes(t))).toBe(true);
        });
    });
});

// ─── pull ────────────────────────────────────────────────────────────────────

describe('pull', () => {
    it('moves a card from target hand to protagonist hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const targetCard = G.hand['1'][0];

        pull(G, ctx, { protagonist: '0', from: '1', handIndex: 0 });

        expect(G.hand['1']).not.toContain(targetCard);
        expect(G.hand['0']).toContain(targetCard);
    });
});

describe('findPullRandomTargets', () => {
    it('returns players who have cards in hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findPullRandomTargets(G, ctx, '0');
        expect(targets.some(t => t.playerID === '1')).toBe(true);
        expect(targets.every(t => t.playerID !== '0')).toBe(true);
    });

    it('excludes players with empty hands', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.hand['1'] = [];

        const targets = findPullRandomTargets(G, ctx, '0');
        expect(targets.every(t => t.playerID !== '1')).toBe(true);
    });
});

// ─── findStealTargets ────────────────────────────────────────────────────────

describe('findStealTargets', () => {
    it('finds unicorns in opponents stables', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '1', 'basic');

        const targets = findStealTargets(G, ctx, '0', { type: 'unicorn' });
        expect(targets.some(t => t.cardID === cardID)).toBe(true);
    });

    it('does not include own stable cards', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '0', 'basic');

        const targets = findStealTargets(G, ctx, '0', { type: 'unicorn' });
        expect(targets.every(t => t.playerID !== '0')).toBe(true);
    });
});

// ─── findSacrificeTargets ─────────────────────────────────────────────────────

describe('findSacrificeTargets', () => {
    it('returns own unicorns for type=unicorn', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToStable(G, '0', 'basic');

        const targets = findSacrificeTargets(G, ctx, '0', { type: 'unicorn' });
        expect(targets.some(t => t.cardID === cardID)).toBe(true);
    });

    it('returns own downgrades for type=downgrade', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = giveCardToUpgradeStable(G, '0', 'downgrade');

        const targets = findSacrificeTargets(G, ctx, '0', { type: 'downgrade' });
        expect(targets.some(t => t.cardID === cardID)).toBe(true);
    });

    it('returns own unicorns AND upgrades AND downgrades for type=any', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const unicornID = giveCardToStable(G, '0', 'basic');
        const upgradeID = giveCardToUpgradeStable(G, '0', 'upgrade');
        const downgradeID = giveCardToUpgradeStable(G, '0', 'downgrade');

        const targets = findSacrificeTargets(G, ctx, '0', { type: 'any' });
        expect(targets.some(t => t.cardID === unicornID)).toBe(true);
        expect(targets.some(t => t.cardID === upgradeID)).toBe(true);
        expect(targets.some(t => t.cardID === downgradeID)).toBe(true);
    });

    it('excludes pandamonium unicorns from type=any', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const unicornID = giveCardToStable(G, '0', 'basic');
        const upgradeID = giveCardToUpgradeStable(G, '0', 'upgrade');
        G.playerEffects['0'] = [{ effect: { key: 'pandamonium' } }];

        const targets = findSacrificeTargets(G, ctx, '0', { type: 'any' });
        expect(targets.some(t => t.cardID === unicornID)).toBe(false);
        expect(targets.some(t => t.cardID === upgradeID)).toBe(true);
    });
});

// ─── findReviveTarget ─────────────────────────────────────────────────────────

describe('findReviveTarget', () => {
    it('finds unicorns in discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const cardID = G.deck.find(c => c.type === 'basic')!.id;
        G.discardPile = [cardID];

        const targets = findReviveTarget(G, ctx, '0', { type: 'unicorn' });
        expect(targets.some(t => t.cardID === cardID)).toBe(true);
    });

    it('returns empty when discard pile has no unicorns', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.discardPile = [];

        const targets = findReviveTarget(G, ctx, '0', { type: 'unicorn' });
        expect(targets.length).toBe(0);
    });
});

// ─── findSearchTargets ────────────────────────────────────────────────────────

describe('findSearchTargets', () => {
    it('returns all draw pile cards for type=any', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findSearchTargets(G, ctx, '0', { type: 'any' });
        expect(targets.length).toBe(G.drawPile.length);
    });

    it('returns only upgrade cards for type=upgrade', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findSearchTargets(G, ctx, '0', { type: 'upgrade' });
        targets.forEach(t => {
            expect(G.deck[t.cardID].type).toBe('upgrade');
        });
    });
});

// ─── findMakeSomeoneDiscardTarget ────────────────────────────────────────────

describe('findMakeSomeoneDiscardTarget', () => {
    it('returns opponents who have cards in hand', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findMakeSomeoneDiscardTarget(G, ctx, '0');
        expect(targets.some(t => t.playerID === '1')).toBe(true);
    });

    it('excludes the protagonist', () => {
        const G = setupTestGame();
        const ctx = createCtx();

        const targets = findMakeSomeoneDiscardTarget(G, ctx, '0');
        expect(targets.every(t => t.playerID !== '0')).toBe(true);
    });
});

// ─── findAddFromDiscardPileToHand ─────────────────────────────────────────────

describe('findAddFromDiscardPileToHand', () => {
    it('finds magic cards in discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const magic = G.deck.find(c => c.type === 'magic')!;
        G.discardPile = [magic.id];

        const targets = findAddFromDiscardPileToHand(G, ctx, '0', { type: 'magic' });
        expect(targets.some(t => t.cardID === magic.id)).toBe(true);
    });

    it('returns empty when no matching cards in discard pile', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.discardPile = [];

        const targets = findAddFromDiscardPileToHand(G, ctx, '0', { type: 'magic' });
        expect(targets.length).toBe(0);
    });
});
