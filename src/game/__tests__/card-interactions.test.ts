import { enter, canEnter, leave } from '../operations/enter';
import { destroy, findDestroyTargets } from '../operations/destroy';
import { isCardBasicDueToEffect } from '../effect';
import UnstableUnicorns from '../game';
import { canPlayCard } from '../game';
import {
    setupTestGame, createCtx,
    giveCardToStable, giveCardToHand, giveCardToUpgradeStable,
    giveCardByTitleToStable, giveCardByTitleToUpgradeStable, giveCardByTitleToHand,
} from '../testHelpers';

// ─── Pandamonium effect ───────────────────────────────────────────────────────

describe('Pandamonium — unicorn targeting', () => {
    it('findDestroyTargets excludes unicorns of a player with pandamonium', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '0', 'basic');
        G.playerEffects['0'] = [{ cardID: -1, effect: { key: 'pandamonium' } }];

        const targets = findDestroyTargets(G, ctx, '1', { type: 'unicorn' }, undefined);

        expect(targets.some(t => t.playerID === '0')).toBe(false);
    });

    it('findDestroyTargets still includes unicorns of players without pandamonium', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '0', 'basic');
        giveCardToStable(G, '1', 'basic');
        G.playerEffects['0'] = [{ cardID: -1, effect: { key: 'pandamonium' } }];

        const targets = findDestroyTargets(G, ctx, '0', { type: 'unicorn' }, undefined);

        expect(targets.some(t => t.playerID === '1')).toBe(true);
    });

    it('findDestroyTargets still includes upgrades of a pandamonium player (type "any")', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardByTitleToUpgradeStable(G, '0', 'Yay');
        G.playerEffects['0'] = [{ cardID: -1, effect: { key: 'pandamonium' } }];

        const targets = findDestroyTargets(G, ctx, '1', { type: 'any' }, undefined);

        expect(targets.some(t => t.playerID === '0')).toBe(true);
    });
});

describe('Pandamonium — win condition', () => {
    it('a player with 7 unicorns and pandamonium does NOT win', () => {
        const G = setupTestGame();
        const ctx = createCtx({ currentPlayer: '0' });
        for (let i = 0; i < 7; i++) giveCardToStable(G, '0', 'basic');
        G.playerEffects['0'] = [{ cardID: -1, effect: { key: 'pandamonium' } }];

        const endIf = (UnstableUnicorns as any).endIf as Function;

        expect(endIf(G, ctx)).toBeUndefined();
    });
});

// ─── Blinding Light (my_unicorns_are_basic) ───────────────────────────────────

describe('Blinding Light — suppresses enter triggers', () => {
    it('entering Ginormous Unicorn does NOT add count_as_two when my_unicorns_are_basic is active', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [{ cardID: -1, effect: { key: 'my_unicorns_are_basic' } }];
        const ginormous = G.deck.find(c => c.title === 'Ginormous Unicorn')!;
        G.hand['0'] = [...G.hand['0'], ginormous.id];

        enter(G, ctx, { playerID: '0', cardID: ginormous.id });

        expect(G.playerEffects['0'].some(e => e.effect.key === 'count_as_two')).toBe(false);
    });

    it('entering a unicorn with add_scene trigger creates no scene when my_unicorns_are_basic is active', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [{ cardID: -1, effect: { key: 'my_unicorns_are_basic' } }];
        const llamacorn = G.deck.find(c => c.title === 'Llamacorn')!;
        G.hand['0'] = [...G.hand['0'], llamacorn.id];

        enter(G, ctx, { playerID: '0', cardID: llamacorn.id });

        expect(G.script.scenes).toHaveLength(0);
    });
});

// ─── Pandamonium + Blinding Light interaction ─────────────────────────────────

describe('Pandamonium + Blinding Light — pandamonium wins', () => {
    it('isCardBasicDueToEffect returns false when both effects are active', () => {
        const G = setupTestGame();
        const ginormous = G.deck.find(c => c.title === 'Ginormous Unicorn')!;
        const effects = [
            { cardID: -1, effect: { key: 'my_unicorns_are_basic' as const } },
            { cardID: -2, effect: { key: 'pandamonium' as const } },
        ];

        expect(isCardBasicDueToEffect(effects, ginormous)).toBe(false);
    });

    it('entering Ginormous Unicorn still adds effects when both pandamonium and blinding light are active', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [
            { cardID: -1, effect: { key: 'my_unicorns_are_basic' } },
            { cardID: -2, effect: { key: 'pandamonium' } },
        ];
        const ginormous = G.deck.find(c => c.title === 'Ginormous Unicorn')!;
        G.hand['0'] = [...G.hand['0'], ginormous.id];

        enter(G, ctx, { playerID: '0', cardID: ginormous.id });

        expect(G.playerEffects['0'].some(e => e.effect.key === 'count_as_two')).toBe(true);
    });
});

// ─── Rainbow Aura (your_unicorns_cannot_be_destroyed) ─────────────────────────

describe('Rainbow Aura — unicorn immunity', () => {
    it('findDestroyTargets type unicorn excludes protected player unicorns', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '0', 'basic');
        G.playerEffects['0'] = [{ cardID: -1, effect: { key: 'your_unicorns_cannot_be_destroyed' } }];

        const targets = findDestroyTargets(G, ctx, '1', { type: 'unicorn' }, undefined);

        expect(targets.some(t => t.playerID === '0')).toBe(false);
    });

    it('findDestroyTargets type any excludes protected unicorns but includes their upgrades', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '0', 'basic');
        giveCardByTitleToUpgradeStable(G, '0', 'Yay');
        G.playerEffects['0'] = [{ cardID: -1, effect: { key: 'your_unicorns_cannot_be_destroyed' } }];

        const targets = findDestroyTargets(G, ctx, '1', { type: 'any' }, undefined);

        const p0Targets = targets.filter(t => t.playerID === '0');
        const p0Cards = p0Targets.map(t => G.deck[t.cardID]);
        expect(p0Cards.some(c => c.type === 'basic')).toBe(false);
        expect(p0Cards.some(c => c.title === 'Yay')).toBe(true);
    });

    it('unprotected player unicorns are still targetable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardToStable(G, '1', 'basic');

        const targets = findDestroyTargets(G, ctx, '0', { type: 'unicorn' }, undefined);

        expect(targets.some(t => t.playerID === '1')).toBe(true);
    });
});

// ─── Broken Stable (you_cannot_play_upgrades) ─────────────────────────────────

describe('Broken Stable — blocks upgrade plays', () => {
    it('canPlayCard returns false for an upgrade card when you_cannot_play_upgrades is active', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [{ cardID: -1, effect: { key: 'you_cannot_play_upgrades' } }];
        const cardID = giveCardByTitleToHand(G, '0', 'Yay');

        expect(canPlayCard(G, ctx, '0', cardID)).toBe(false);
    });

    it('canPlayCard still allows unicorn cards when you_cannot_play_upgrades is active', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [{ cardID: -1, effect: { key: 'you_cannot_play_upgrades' } }];
        const cardID = giveCardToHand(G, '0', 'basic');

        expect(canPlayCard(G, ctx, '0', cardID)).toBe(true);
    });
});

// ─── Ginormous Unicorn ────────────────────────────────────────────────────────

describe('Ginormous Unicorn — enter effects', () => {
    it('enter adds both count_as_two and you_cannot_play_neigh effects', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const ginormous = G.deck.find(c => c.title === 'Ginormous Unicorn')!;
        G.hand['0'] = [...G.hand['0'], ginormous.id];

        enter(G, ctx, { playerID: '0', cardID: ginormous.id });

        expect(G.playerEffects['0'].some(e => e.effect.key === 'count_as_two')).toBe(true);
        expect(G.playerEffects['0'].some(e => e.effect.key === 'you_cannot_play_neigh')).toBe(true);
    });
});

describe('Ginormous Unicorn — win condition', () => {
    it('a player with 6 unicorns and count_as_two wins (counts as 7)', () => {
        const G = setupTestGame();
        const ctx = createCtx({ currentPlayer: '0' });
        for (let i = 0; i < 6; i++) giveCardToStable(G, '0', 'basic');
        G.playerEffects['0'] = [{ cardID: -1, effect: { key: 'count_as_two' } }];

        const endIf = (UnstableUnicorns as any).endIf as Function;

        expect(endIf(G, ctx)).toEqual({ winner: '0' });
    });

    it('a player with 5 unicorns and count_as_two does NOT win', () => {
        const G = setupTestGame();
        const ctx = createCtx({ currentPlayer: '0' });
        for (let i = 0; i < 5; i++) giveCardToStable(G, '0', 'basic');
        G.playerEffects['0'] = [{ cardID: -1, effect: { key: 'count_as_two' } }];

        const endIf = (UnstableUnicorns as any).endIf as Function;

        expect(endIf(G, ctx)).toBeUndefined();
    });

    it('a player with 6 unicorns + count_as_two + pandamonium does NOT win', () => {
        const G = setupTestGame();
        const ctx = createCtx({ currentPlayer: '0' });
        for (let i = 0; i < 6; i++) giveCardToStable(G, '0', 'basic');
        G.playerEffects['0'] = [
            { cardID: -1, effect: { key: 'count_as_two' } },
            { cardID: -2, effect: { key: 'pandamonium' } },
        ];

        const endIf = (UnstableUnicorns as any).endIf as Function;

        expect(endIf(G, ctx)).toBeUndefined();
    });
});

// ─── Narwhal Torpedo — auto sacrifice downgrades ──────────────────────────────

describe('Narwhal Torpedo — auto sacrifice downgrades on enter', () => {
    it('removes all downgrades from upgradeDowngradeStable when Narwhal Torpedo enters', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardByTitleToUpgradeStable(G, '0', 'Pandamonium');
        giveCardByTitleToUpgradeStable(G, '0', 'Blinding Light');
        const torpedo = G.deck.find(c => c.title === 'Narwhal Torpedo')!;
        G.hand['0'] = [...G.hand['0'], torpedo.id];

        enter(G, ctx, { playerID: '0', cardID: torpedo.id });

        const remainingCards = G.upgradeDowngradeStable['0'].map(id => G.deck[id]);
        expect(remainingCards.some(c => c.title === 'Pandamonium')).toBe(false);
        expect(remainingCards.some(c => c.title === 'Blinding Light')).toBe(false);
    });

    it('discards the removed downgrades', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const downgradeID = giveCardByTitleToUpgradeStable(G, '0', 'Pandamonium');
        const torpedo = G.deck.find(c => c.title === 'Narwhal Torpedo')!;
        G.hand['0'] = [...G.hand['0'], torpedo.id];

        enter(G, ctx, { playerID: '0', cardID: torpedo.id });

        expect(G.discardPile).toContain(downgradeID);
    });

    it('does not remove upgrades — only downgrades', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const upgradeID = giveCardByTitleToUpgradeStable(G, '0', 'Yay');
        const torpedo = G.deck.find(c => c.title === 'Narwhal Torpedo')!;
        G.hand['0'] = [...G.hand['0'], torpedo.id];

        enter(G, ctx, { playerID: '0', cardID: torpedo.id });

        expect(G.upgradeDowngradeStable['0']).toContain(upgradeID);
    });

    it('Narwhal Torpedo itself stays in stable after entering', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const torpedo = G.deck.find(c => c.title === 'Narwhal Torpedo')!;
        G.hand['0'] = [...G.hand['0'], torpedo.id];

        enter(G, ctx, { playerID: '0', cardID: torpedo.id });

        expect(G.stable['0']).toContain(torpedo.id);
    });
});

// ─── Queen Bee — blocks basic unicorn entry ────────────────────────────────────

describe('Queen Bee Unicorn — basic unicorn entry restriction', () => {
    it('canEnter returns false for a basic unicorn entering another player stable when Queen Bee is active', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['1'] = [{ cardID: -1, effect: { key: 'basic_unicorns_can_only_join_your_stable' } }];
        const basicCard = G.deck.find(c => c.type === 'basic')!;

        expect(canEnter(G, ctx, { playerID: '0', cardID: basicCard.id })).toBe(false);
    });

    it('canEnter returns true for a basic unicorn entering the Queen Bee owner stable', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['1'] = [{ cardID: -1, effect: { key: 'basic_unicorns_can_only_join_your_stable' } }];
        const basicCard = G.deck.find(c => c.type === 'basic')!;

        expect(canEnter(G, ctx, { playerID: '1', cardID: basicCard.id })).toBe(true);
    });

    it('canEnter still allows non-basic unicorns to enter any stable when Queen Bee is active', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['1'] = [{ cardID: -1, effect: { key: 'basic_unicorns_can_only_join_your_stable' } }];
        const unicornCard = G.deck.find(c => c.type === 'unicorn')!;

        expect(canEnter(G, ctx, { playerID: '0', cardID: unicornCard.id })).toBe(true);
    });
});

// ─── Flying unicorns — return to hand on destroy ──────────────────────────────

describe('Flying unicorns — return to hand on destroy', () => {
    it('Annoying Flying Unicorn returns to owner hand when destroyed', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const flying = G.deck.find(c => c.title === 'Annoying Flying Unicorn')!;
        G.stable['0'] = [...G.stable['0'], flying.id];

        destroy(G, ctx, { protagonist: '1', cardID: flying.id });

        expect(G.stable['0']).not.toContain(flying.id);
        expect(G.hand['0']).toContain(flying.id);
        expect(G.discardPile).not.toContain(flying.id);
    });

    it('flying unicorn trigger is suppressed when my_unicorns_are_basic is active', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const flying = G.deck.find(c => c.title === 'Annoying Flying Unicorn')!;
        G.stable['0'] = [...G.stable['0'], flying.id];
        G.playerEffects['0'] = [{ cardID: -1, effect: { key: 'my_unicorns_are_basic' } }];

        destroy(G, ctx, { protagonist: '1', cardID: flying.id });

        expect(G.discardPile).toContain(flying.id);
        expect(G.hand['0']).not.toContain(flying.id);
    });
});

// ─── Barbed Wire — reactive trigger ──────────────────────────────────────────

describe('Barbed Wire — discard on unicorn enter', () => {
    it('injecting a unicorn into a stable with Barbed Wire creates a discard scene/action', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardByTitleToUpgradeStable(G, '0', 'Barbed Wire');
        const unicornCard = G.deck.find(c => c.type === 'basic' && G.drawPile.includes(c.id))!;
        G.hand['0'] = [...G.hand['0'], unicornCard.id];

        enter(G, ctx, { playerID: '0', cardID: unicornCard.id });

        const allInstructions = G.script.scenes.flatMap(s => s.actions.flatMap(a => a.instructions));
        expect(allInstructions.some(i => i.do.key === 'discard')).toBe(true);
    });
});

describe('Barbed Wire — discard on unicorn leave', () => {
    it('leaving a unicorn from a stable with Barbed Wire creates a discard scene/action', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        giveCardByTitleToUpgradeStable(G, '0', 'Barbed Wire');
        const unicornID = giveCardToStable(G, '0', 'basic');

        leave(G, ctx, { playerID: '0', cardID: unicornID });

        const allInstructions = G.script.scenes.flatMap(s => s.actions.flatMap(a => a.instructions));
        expect(allInstructions.some(i => i.do.key === 'discard')).toBe(true);
    });
});

// ─── Tiny Stable ──────────────────────────────────────────────────────────────

describe('Tiny Stable — sacrifice when over threshold', () => {
    it('entering a 6th unicorn with tiny_stable active creates a sacrifice instruction', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [{ cardID: -1, effect: { key: 'tiny_stable' } }];
        for (let i = 0; i < 5; i++) giveCardToStable(G, '0', 'basic');
        const sixthCardID = G.deck.find(c => c.type === 'basic' && G.drawPile.includes(c.id))!.id;
        G.hand['0'] = [...G.hand['0'], sixthCardID];

        enter(G, ctx, { playerID: '0', cardID: sixthCardID });

        const allInstructions = G.script.scenes.flatMap(s => s.actions.flatMap(a => a.instructions));
        expect(allInstructions.some(i => i.do.key === 'sacrifice')).toBe(true);
    });

    it('tiny_stable + count_as_two triggers sacrifice when entering 5th unicorn', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [
            { cardID: -1, effect: { key: 'tiny_stable' } },
            { cardID: -2, effect: { key: 'count_as_two' } },
        ];
        for (let i = 0; i < 4; i++) giveCardToStable(G, '0', 'basic');
        const fifthCardID = G.deck.find(c => c.type === 'basic' && G.drawPile.includes(c.id))!.id;
        G.hand['0'] = [...G.hand['0'], fifthCardID];

        enter(G, ctx, { playerID: '0', cardID: fifthCardID });

        const allInstructions = G.script.scenes.flatMap(s => s.actions.flatMap(a => a.instructions));
        expect(allInstructions.some(i => i.do.key === 'sacrifice')).toBe(true);
    });

    it('pandamonium makes tiny_stable inert', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        G.playerEffects['0'] = [
            { cardID: -1, effect: { key: 'tiny_stable' } },
            { cardID: -2, effect: { key: 'pandamonium' } },
        ];
        for (let i = 0; i < 5; i++) giveCardToStable(G, '0', 'basic');
        const sixthCardID = G.deck.find(c => c.type === 'basic' && G.drawPile.includes(c.id))!.id;
        G.hand['0'] = [...G.hand['0'], sixthCardID];

        enter(G, ctx, { playerID: '0', cardID: sixthCardID });

        const allInstructions = G.script.scenes.flatMap(s => s.actions.flatMap(a => a.instructions));
        expect(allInstructions.some(i => i.do.key === 'sacrifice')).toBe(false);
    });
});

// ─── Win condition edge cases ─────────────────────────────────────────────────

describe('Win condition', () => {
    it('7 unicorns in stable wins', () => {
        const G = setupTestGame();
        const ctx = createCtx({ currentPlayer: '0' });
        for (let i = 0; i < 7; i++) giveCardToStable(G, '0', 'basic');

        const endIf = (UnstableUnicorns as any).endIf as Function;

        expect(endIf(G, ctx)).toEqual({ winner: '0' });
    });

    it('6 unicorns without any effect does NOT win', () => {
        const G = setupTestGame();
        const ctx = createCtx({ currentPlayer: '0' });
        for (let i = 0; i < 6; i++) giveCardToStable(G, '0', 'basic');

        const endIf = (UnstableUnicorns as any).endIf as Function;

        expect(endIf(G, ctx)).toBeUndefined();
    });
});

// ─── Cost-then-effect scene wiring ────────────────────────────────────────────

describe('Dark Angel Unicorn — cost-then-effect scene', () => {
    it('creates a scene with sacrifice then revive actions', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const darkAngel = G.deck.find(c => c.title === 'Dark Angel Unicorn')!;
        G.hand['0'] = [...G.hand['0'], darkAngel.id];

        enter(G, ctx, { playerID: '0', cardID: darkAngel.id });

        expect(G.script.scenes.length).toBeGreaterThanOrEqual(1);
        const scene = G.script.scenes.find(s => s.actions.length === 2);
        expect(scene).toBeDefined();
        expect(scene!.actions[0].instructions[0].do.key).toBe('sacrifice');
        expect(scene!.actions[1].instructions[0].do.key).toBe('revive');
    });

    it('the created scene is optional (mandatory: false)', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const darkAngel = G.deck.find(c => c.title === 'Dark Angel Unicorn')!;
        G.hand['0'] = [...G.hand['0'], darkAngel.id];

        enter(G, ctx, { playerID: '0', cardID: darkAngel.id });

        const scene = G.script.scenes.find(s => s.actions.length === 2);
        expect(scene!.mandatory).toBe(false);
    });
});

describe('Seductive Unicorn — cost-then-effect scene', () => {
    it('creates a scene with discard then steal actions', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const seductive = G.deck.find(c => c.title === 'Seductive Unicorn')!;
        G.hand['0'] = [...G.hand['0'], seductive.id];

        enter(G, ctx, { playerID: '0', cardID: seductive.id });

        expect(G.script.scenes.length).toBeGreaterThanOrEqual(1);
        const scene = G.script.scenes.find(s => s.actions.length === 2);
        expect(scene).toBeDefined();
        expect(scene!.actions[0].instructions[0].do.key).toBe('discard');
        expect(scene!.actions[1].instructions[0].do.key).toBe('steal');
    });
});

// ─── Llamacorn — all players discard ─────────────────────────────────────────

describe('Llamacorn — all-player discard', () => {
    it('creates discard instructions for all players when Llamacorn enters', () => {
        const G = setupTestGame();
        const ctx = createCtx();
        const llamacorn = G.deck.find(c => c.title === 'Llamacorn')!;
        G.hand['0'] = [...G.hand['0'], llamacorn.id];

        enter(G, ctx, { playerID: '0', cardID: llamacorn.id });

        const allInstructions = G.script.scenes.flatMap(s => s.actions.flatMap(a => a.instructions));
        const discardInstructions = allInstructions.filter(i => i.do.key === 'discard');
        expect(discardInstructions.length).toBe(2);
        const protagonists = discardInstructions.map(i => i.protagonist).sort();
        expect(protagonists).toEqual(['0', '1']);
    });
});
