import * as engine from '../engine';
import { getDef } from '../cards/registry';
import { scenario, invariantViolations } from '../testing/scenario';

// Card interactions: a port of the old-engine `card-interactions.test.ts` (branch tests-sandbox) to the
// scenario builder, plus the rulings of expansion-plan.md 10.2 that concern cards in the registry today.
// Legacy preset unless stated.

const NEIGH = getDef('neigh');

// ─── Pandamonium effect ───────────────────────────────────────────────────────

describe('Pandamonium — unicorn targeting', () => {
    it('"destroy a Unicorn card" excludes unicorns of a player with pandamonium', () => {
        const s = scenario(2).stable('0', 'pandamonium', 'basic_unicorn_0').stable('1', 'rhinocorn').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison');
        expect(s.candidates('1')).toEqual(['rhinocorn']);
        expect(s.prompt('1').disabled!.map(d => d.reason.rule)).toEqual(['masquerade']);
    });

    it('"destroy a Unicorn card" still includes unicorns of players without pandamonium', () => {
        const s = scenario(2).stable('0', 'pandamonium', 'basic_unicorn_0').stable('1', 'basic_unicorn_1').hand('0', 'unicorn_poison').start();
        s.play('0', 'unicorn_poison');
        expect(s.candidates('0')).toEqual(['basic_unicorn_1']);
    });

    it('"destroy a card" still includes upgrades of a pandamonium player', () => {
        const s = scenario(2).stable('0', 'pandamonium', 'yay').stable('1', 'basic_unicorn_1').hand('1', 'two_for_one').start('1');
        s.play('1', 'two_for_one').pick('1', 'basic_unicorn_1');
        expect(s.candidates('1')).toContain('yay');
    });
});

describe('Pandamonium — win condition', () => {
    it('a player with 7 unicorns and pandamonium does NOT win', () => {
        const s = scenario(2).stable('0', 'pandamonium', ...Array(6).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        s.play('0', 'basic_unicorn_1');
        expect(s.G.zones.stable['0'].filter(c => engine.isUnicorn(s.G, c) || engine.defOf(s.G, c).type === 'basic')).toHaveLength(7);
        expect(engine.playersWhoWin(s.G)).toEqual([]);
        expect(s.G.gameOver).toBeUndefined();
    });
});

// ─── Blinding Light ───────────────────────────────────────────────────────────

describe('Blinding Light — suppresses enter triggers', () => {
    it('an entering Ginormous Unicorn neither counts as two nor stops its owner from playing Neigh cards', () => {
        const s = scenario(2).stable('0', 'blinding_light').hand('0', 'ginormous_unicorn', 'neigh').start();
        s.play('0', 'ginormous_unicorn');
        expect(engine.unicornCount(s.G, '0')).toBe(1);
        expect(engine.playRestriction(s.G, '0', NEIGH)).toBeUndefined();
    });

    it('an entering unicorn with an enter ability (Llamacorn) asks nothing', () => {
        const s = scenario(2).stable('0', 'blinding_light').hand('0', 'llamacorn', 'neigh').hand('1', 'yay').start();
        s.play('0', 'llamacorn');
        expect(s.prompts()).toEqual([]);
        expect(s.handOf('1')).toEqual(['yay']);
    });
});

describe('Pandamonium + Blinding Light — pandamonium wins (legacy R1)', () => {
    it('the unicorns are not blinded when both are in the stable', () => {
        const s = scenario(2).stable('0', 'blinding_light', 'pandamonium', 'ginormous_unicorn').start();
        expect(engine.isBlinded(s.G, s.id('ginormous_unicorn'))).toBe(false);
        expect(engine.isMasked(s.G, s.id('ginormous_unicorn'))).toBe(true);
    });

    it('an entering Ginormous Unicorn still gets its continuous effects', () => {
        const s = scenario(2).stable('0', 'blinding_light', 'pandamonium').hand('0', 'ginormous_unicorn', 'neigh').start();
        s.play('0', 'ginormous_unicorn');
        expect(engine.staticsActive(s.G, s.id('ginormous_unicorn'))).toBe(true);
        expect(engine.playRestriction(s.G, '0', NEIGH)).toEqual({ rule: 'cannotPlay', card: s.id('ginormous_unicorn') });
    });
});

// ─── Rainbow Aura ─────────────────────────────────────────────────────────────

describe('Rainbow Aura — unicorn immunity', () => {
    it('"destroy a Unicorn card" excludes the protected player\'s unicorns', () => {
        const s = scenario(2).stable('0', 'rainbow_aura', 'basic_unicorn_0').stable('1', 'rhinocorn').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison');
        expect(s.candidates('1')).toEqual(['rhinocorn']);
        expect(s.prompt('1').disabled).toEqual([{ candidate: { card: s.id('basic_unicorn_0'), zone: 'stable', owner: '0' }, reason: { rule: 'protected', card: s.id('rainbow_aura') } }]);
    });

    it('"destroy a card" excludes protected unicorns but includes their upgrades', () => {
        const s = scenario(2).stable('0', 'rainbow_aura', 'basic_unicorn_0', 'yay').stable('1', 'basic_unicorn_1').hand('1', 'two_for_one').start('1');
        s.play('1', 'two_for_one').pick('1', 'basic_unicorn_1');
        expect(s.candidates('1')).toEqual(['rainbow_aura', 'yay']);
    });

    it('unprotected player unicorns are still targetable', () => {
        const s = scenario(2).stable('0', 'rainbow_aura').stable('1', 'basic_unicorn_1').hand('0', 'unicorn_poison').start();
        s.play('0', 'unicorn_poison');
        expect(s.candidates('0')).toEqual(['basic_unicorn_1']);
    });
});

// ─── Broken Stable ────────────────────────────────────────────────────────────

describe('Broken Stable — blocks upgrade plays', () => {
    it('an Upgrade card cannot be played', () => {
        const s = scenario(2).stable('0', 'broken_stable').hand('0', 'yay').start();
        expect(engine.canPlay(s.G, '0', s.id('yay'), '0')).toEqual({ ok: false, reason: { rule: 'cannotPlay', card: s.id('broken_stable') } });
        expect(s.tryPlay('0', 'yay', '0')).toBe('cannotPlay');
    });

    it('Unicorn cards can still be played', () => {
        const s = scenario(2).stable('0', 'broken_stable').hand('0', 'basic_unicorn_0').start();
        expect(engine.canPlay(s.G, '0', s.id('basic_unicorn_0'))).toEqual({ ok: true });
        s.play('0', 'basic_unicorn_0');
        expect(s.stableOf('0')).toEqual(['broken_stable', 'basic_unicorn_0']);
    });
});

// ─── Ginormous Unicorn ────────────────────────────────────────────────────────

describe('Ginormous Unicorn — enter effects', () => {
    it('once it has entered it counts as two and its owner cannot play Neigh cards', () => {
        const s = scenario(2).hand('0', 'ginormous_unicorn', 'neigh').start();
        s.play('0', 'ginormous_unicorn');
        expect(engine.unicornCount(s.G, '0')).toBe(2);
        expect(engine.playRestriction(s.G, '0', NEIGH)).toEqual({ rule: 'cannotPlay', card: s.id('ginormous_unicorn') });
    });
});

describe('Ginormous Unicorn — win condition', () => {
    it('a player with 6 unicorns including Ginormous Unicorn wins (counts as 7)', () => {
        const s = scenario(2).stable('0', ...Array(5).fill('basic_unicorn_0')).hand('0', 'ginormous_unicorn').start();
        s.play('0', 'ginormous_unicorn');
        expect(s.G.gameOver).toMatchObject({ winner: '0', reason: 'unicorns' });
    });

    it('a player with 5 unicorns including Ginormous Unicorn does NOT win', () => {
        const s = scenario(2).stable('0', ...Array(4).fill('basic_unicorn_0')).hand('0', 'ginormous_unicorn').start();
        s.play('0', 'ginormous_unicorn');
        expect(engine.unicornCount(s.G, '0')).toBe(6);
        expect(s.G.gameOver).toBeUndefined();
    });

    it('a player with 6 unicorns including Ginormous Unicorn and pandamonium does NOT win', () => {
        const s = scenario(2).stable('0', 'pandamonium', ...Array(5).fill('basic_unicorn_0')).hand('0', 'ginormous_unicorn').start();
        s.play('0', 'ginormous_unicorn');
        expect(s.G.gameOver).toBeUndefined();
    });
});

// ─── Narwhal Torpedo ──────────────────────────────────────────────────────────

describe('Narwhal Torpedo — auto sacrifice downgrades on enter', () => {
    // Pandamonium + Blinding Light: under legacy R1 the unicorns keep their abilities, so the enter
    // ability works although Blinding Light is in the stable.
    const build = () => scenario(2).stable('0', 'pandamonium', 'blinding_light', 'yay').hand('0', 'narwhal_torpedo').start();

    it('removes all downgrades from the stable when Narwhal Torpedo enters, without asking', () => {
        const s = build();
        s.play('0', 'narwhal_torpedo');
        expect(s.prompts()).toEqual([]);
        expect(s.stableOf('0')).not.toContain('pandamonium');
        expect(s.stableOf('0')).not.toContain('blinding_light');
    });

    it('discards the removed downgrades', () => {
        const s = build();
        s.play('0', 'narwhal_torpedo');
        expect(s.discardPile()).toEqual(['pandamonium', 'blinding_light']);
    });

    it('does not remove upgrades — only downgrades', () => {
        const s = build();
        s.play('0', 'narwhal_torpedo');
        expect(s.stableOf('0')).toContain('yay');
    });

    it('Narwhal Torpedo itself stays in stable after entering', () => {
        const s = build();
        s.play('0', 'narwhal_torpedo');
        expect(s.stableOf('0')).toEqual(['yay', 'narwhal_torpedo']);
    });
});

// ─── Queen Bee Unicorn ────────────────────────────────────────────────────────

describe('Queen Bee Unicorn — basic unicorn entry restriction', () => {
    it('a basic unicorn cannot enter another player\'s stable while Queen Bee is active', () => {
        const s = scenario(2).stable('1', 'queen_bee_unicorn').hand('0', 'basic_unicorn_0').start();
        expect(engine.canEnter(s.G, s.id('basic_unicorn_0'), '0')).toEqual({ ok: false, reason: { rule: 'cannotEnter', card: s.id('queen_bee_unicorn') } });
    });

    it('a basic unicorn can enter the Queen Bee owner\'s stable', () => {
        const s = scenario(2).stable('1', 'queen_bee_unicorn').hand('0', 'basic_unicorn_0').start();
        expect(engine.canEnter(s.G, s.id('basic_unicorn_0'), '1')).toEqual({ ok: true });
    });

    it('non-basic unicorns can still enter any stable', () => {
        const s = scenario(2).stable('1', 'queen_bee_unicorn').hand('0', 'rhinocorn', 'narwhal').start();
        expect(engine.canEnter(s.G, s.id('rhinocorn'), '0')).toEqual({ ok: true });
        // the Narwhal is a Basic Unicorn as well
        expect(engine.canEnter(s.G, s.id('narwhal'), '0').ok).toBe(false);
    });
});

// ─── Flying unicorns ──────────────────────────────────────────────────────────

describe('Flying unicorns — return to hand on destroy', () => {
    it('Annoying Flying Unicorn returns to its owner\'s hand when destroyed', () => {
        const s = scenario(2).stable('0', 'annoying_flying_unicorn').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'annoying_flying_unicorn');
        expect(s.stableOf('0')).toEqual([]);
        expect(s.handOf('0')).toEqual(['annoying_flying_unicorn']);
        expect(s.discardPile()).not.toContain('annoying_flying_unicorn');
    });

    it('the flying trigger is suppressed by Blinding Light', () => {
        const s = scenario(2).stable('0', 'blinding_light', 'annoying_flying_unicorn').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'annoying_flying_unicorn');
        expect(s.discardPile()).toContain('annoying_flying_unicorn');
        expect(s.handOf('0')).toEqual([]);
    });
});

// ─── Barbed Wire ──────────────────────────────────────────────────────────────

describe('Barbed Wire — discard on unicorn enter', () => {
    it('a unicorn entering a stable with Barbed Wire asks its owner to discard', () => {
        const s = scenario(2).stable('0', 'barbed_wire').hand('0', 'basic_unicorn_0', 'neigh').start();
        s.play('0', 'basic_unicorn_0');
        expect(s.prompt('0')).toMatchObject({ kind: 'chooseCards', verb: 'discard', optional: false });
    });
});

describe('Barbed Wire — discard on unicorn leave', () => {
    it('a unicorn leaving a stable with Barbed Wire asks its owner to discard', () => {
        const s = scenario(2).stable('0', 'barbed_wire', 'basic_unicorn_0').hand('0', 'neigh').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'basic_unicorn_0');
        expect(s.prompt('0')).toMatchObject({ kind: 'chooseCards', verb: 'discard', optional: false });
        expect(s.prompt('0').source?.card).toBe(s.id('barbed_wire'));
    });
});

// ─── Tiny Stable ──────────────────────────────────────────────────────────────

describe('Tiny Stable — sacrifice when over threshold', () => {
    it('entering a 6th unicorn asks for a sacrifice', () => {
        const s = scenario(2).stable('0', 'tiny_stable', ...Array(5).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        s.play('0', 'basic_unicorn_1');
        expect(s.prompt('0')).toMatchObject({ verb: 'sacrifice', optional: false });
    });

    it('with Ginormous Unicorn the 5th unicorn already triggers it', () => {
        const s = scenario(2).stable('0', 'tiny_stable', 'ginormous_unicorn', ...Array(3).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        s.play('0', 'basic_unicorn_1');
        expect(s.prompt('0')).toMatchObject({ verb: 'sacrifice' });
    });

    it('pandamonium makes Tiny Stable inert', () => {
        const s = scenario(2).stable('0', 'tiny_stable', 'pandamonium', ...Array(5).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        s.play('0', 'basic_unicorn_1');
        expect(s.prompts()).toEqual([]);
    });
});

// ─── Win condition ────────────────────────────────────────────────────────────

describe('Win condition', () => {
    it('7 unicorns in stable wins', () => {
        const s = scenario(2).stable('0', ...Array(6).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        s.play('0', 'basic_unicorn_1');
        expect(s.G.gameOver).toMatchObject({ winner: '0', winners: ['0'], reason: 'unicorns' });
    });

    it('6 unicorns without any effect does NOT win', () => {
        const s = scenario(2).stable('0', ...Array(5).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        s.play('0', 'basic_unicorn_1');
        expect(s.G.gameOver).toBeUndefined();
    });
});

// ─── Cost then effect ─────────────────────────────────────────────────────────

describe('Dark Angel Unicorn — cost-then-effect', () => {
    it('sacrifice first (cost), then bring a unicorn from the discard pile (effect)', () => {
        const s = scenario(2).stable('0', 'basic_unicorn_0').discard('rhinocorn').hand('0', 'dark_angel_unicorn').start();
        s.play('0', 'dark_angel_unicorn');
        expect(s.prompt('0')).toMatchObject({ verb: 'sacrifice', role: 'cost' });
        s.pick('0', 'basic_unicorn_0');
        expect(s.prompt('0')).toMatchObject({ verb: 'bring', role: 'effect' });
    });

    it('is optional: the first step can be skipped', () => {
        const s = scenario(2).stable('0', 'basic_unicorn_0').discard('rhinocorn').hand('0', 'dark_angel_unicorn').start();
        s.play('0', 'dark_angel_unicorn');
        expect(s.prompt('0').optional).toBe(true);
        s.skip('0');
        expect(s.prompts()).toEqual([]);
    });
});

describe('Seductive Unicorn — cost-then-effect', () => {
    it('discard first (cost), then steal (effect)', () => {
        const s = scenario(2).stable('1', 'basic_unicorn_0').hand('0', 'seductive_unicorn', 'neigh').start();
        s.play('0', 'seductive_unicorn');
        expect(s.prompt('0')).toMatchObject({ verb: 'discard', role: 'cost', optional: true });
        s.pick('0', 'neigh');
        expect(s.prompt('0')).toMatchObject({ verb: 'steal', role: 'effect', optional: false });
    });
});

// ─── Llamacorn ────────────────────────────────────────────────────────────────

describe('Llamacorn — all-player discard', () => {
    it('asks every player, including its owner, to discard', () => {
        const s = scenario(2).hand('0', 'llamacorn', 'neigh').hand('1', 'yay').start();
        s.play('0', 'llamacorn');
        expect(s.prompts().map(p => `${p.player}:${p.verb}`).sort()).toEqual(['0:discard', '1:discard']);
    });
});

// ─── Rulings (expansion-plan.md 10.2) ─────────────────────────────────────────

describe('rulings', () => {
    it('K3: a card that arrived through one begin-of-turn effect can be used by the next one (Claw Machine → Stable Artillery)', () => {
        const s = scenario(2).stable('0', 'claw_machine', 'stable_artillery').stable('1', 'basic_unicorn_0')
            .deck('yay').hand('0', 'neigh', 'slowdown').start('0', 'bot');
        s.useBot('0', 'claw_machine').pick('0', 'neigh');
        expect(s.handOf('0')).toEqual(['slowdown', 'yay']);
        s.useBot('0', 'stable_artillery');
        expect(s.candidates('0')).toEqual(['slowdown', 'yay']);
        s.pick('0', 'slowdown', 'yay').pick('0', 'basic_unicorn_0');
        expect(s.discardPile()).toEqual(['neigh', 'slowdown', 'yay', 'basic_unicorn_0']);
    });

    it('legacy R4: "steal a Unicorn card" can take a Panda; "destroy a card" can destroy it', () => {
        const s = scenario(2).stable('1', 'pandamonium', 'basic_unicorn_0').hand('0', 'alignment_change', 'neigh', 'neigh').start();
        s.play('0', 'alignment_change').pick('0', 'neigh', 'neigh');
        expect(s.candidates('0')).toEqual(['basic_unicorn_0']);

        const t = scenario(2).stable('0', 'basic_unicorn_1').stable('1', 'pandamonium', 'basic_unicorn_0').hand('0', 'two_for_one').start();
        t.play('0', 'two_for_one').pick('0', 'basic_unicorn_1');
        expect(t.candidates('0')).toContain('basic_unicorn_0');
    });

    it('standard R4: "steal a Unicorn card" cannot take a Panda; "destroy a card" can', () => {
        const rules = { masqueradeScope: 'unicornFilters' as const };
        const s = scenario(2, rules).stable('1', 'pandamonium', 'basic_unicorn_0').hand('0', 'alignment_change', 'neigh', 'neigh').start();
        s.play('0', 'alignment_change').pick('0', 'neigh', 'neigh');
        expect(s.prompts()).toEqual([]);
        expect(s.stableOf('1')).toEqual(['pandamonium', 'basic_unicorn_0']);

        const t = scenario(2, rules).stable('0', 'basic_unicorn_1').stable('1', 'pandamonium', 'basic_unicorn_0').hand('0', 'two_for_one').start();
        t.play('0', 'two_for_one').pick('0', 'basic_unicorn_1');
        expect(t.candidates('0')).toContain('basic_unicorn_0');
    });

    it('legacy R3: a Super Neigh ends the voting; the card below is not voted on again', () => {
        const s = scenario(3).hand('0', 'basic_unicorn_0').hand('1', 'super_neigh').hand('2', 'neigh').start();
        s.playOnly('0', 'basic_unicorn_0');
        s.neigh('1', 'super_neigh');
        expect(s.prompts()).toEqual([]);
        expect(s.discardPile()).toEqual(['super_neigh', 'basic_unicorn_0']);
        expect(s.handOf('2')).toEqual(['neigh']);
    });

    it.todo('standard R3: a Super Neigh cancels its target and the voting re-opens on the card below (superNeigh: cancelsTarget is not implemented yet)');

    it('legacy R14: Barbed Wire with Pandamonium — discard when a Panda enters and when it leaves', () => {
        const s = scenario(2).stable('0', 'pandamonium', 'barbed_wire').hand('0', 'basic_unicorn_0', 'neigh', 'neigh').hand('1', 'two_for_one').stable('1', 'basic_unicorn_3').start();
        s.play('0', 'basic_unicorn_0');
        expect(s.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['0:discard']);
        s.pick('0', 'neigh');
        s.endTurn('0').drawForTurn('1');
        s.play('1', 'two_for_one').pick('1', 'basic_unicorn_3').pick('1', 'basic_unicorn_0');
        expect(s.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['0:discard']);
    });

    it('standard R14: Barbed Wire with Pandamonium — discard when a Panda enters, none when it leaves', () => {
        const rules = { barbedWireOnMaskedLeave: false };
        const s = scenario(2, rules).stable('0', 'pandamonium', 'barbed_wire').hand('0', 'basic_unicorn_0', 'neigh', 'neigh').hand('1', 'two_for_one').stable('1', 'basic_unicorn_3').start();
        s.play('0', 'basic_unicorn_0');
        expect(s.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['0:discard']);
        s.pick('0', 'neigh');
        s.endTurn('0').drawForTurn('1');
        s.play('1', 'two_for_one').pick('1', 'basic_unicorn_3').pick('1', 'basic_unicorn_0');
        expect(s.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['1:destroy']);
        expect(s.handOf('0')).toEqual(['neigh']);
    });

    it('standard R15: Two-For-One cannot destroy an Upgrade to unlock a protected unicorn as its second target', () => {
        const s = scenario(2, { multiTarget: 'atOnce' }).stable('0', 'basic_unicorn_1').stable('1', 'rainbow_aura', 'basic_unicorn_0').hand('0', 'two_for_one').start();
        s.play('0', 'two_for_one').pick('0', 'basic_unicorn_1');
        // only one legal target: as many as possible are destroyed, the protected unicorn is not among them
        expect(s.candidates('0')).toEqual(['rainbow_aura']);
        expect(s.prompt('0')).toMatchObject({ min: 1, max: 1 });
        s.pick('0', 'rainbow_aura');
        expect(s.prompts()).toEqual([]);
        expect(s.stableOf('1')).toEqual(['basic_unicorn_0']);
    });

    it('legacy R15: targets are chosen one after another, so destroying Rainbow Aura first unlocks the unicorn', () => {
        const s = scenario(2).stable('0', 'basic_unicorn_1').stable('1', 'rainbow_aura', 'basic_unicorn_0').hand('0', 'two_for_one').start();
        s.play('0', 'two_for_one').pick('0', 'basic_unicorn_1').pick('0', 'rainbow_aura');
        expect(s.candidates('0')).toEqual(['basic_unicorn_0']);
    });

    it('Queen Bee (standard R9): another player\'s Basic Unicorn can only be played into the Queen Bee stable', () => {
        const s = scenario(2, { playUnicornIntoAnyStable: true }).stable('0', 'queen_bee_unicorn').hand('1', 'basic_unicorn_0').start('1');
        expect(engine.playTargets(s.G, '1', s.id('basic_unicorn_0'))).toEqual(['0']);
        expect(s.tryPlay('1', 'basic_unicorn_0', '1')).toBeDefined();
        s.play('1', 'basic_unicorn_0', '0');
        expect(s.stableOf('0')).toEqual(['queen_bee_unicorn', 'basic_unicorn_0']);
    });

    it('Queen Bee (legacy R9): unicorns go into your own stable only, so another player cannot play a Basic Unicorn at all', () => {
        const s = scenario(2).stable('0', 'queen_bee_unicorn').hand('1', 'basic_unicorn_0').start('1');
        expect(engine.playTargets(s.G, '1', s.id('basic_unicorn_0'))).toEqual([]);
        expect(s.free('1').play).toEqual([]);
    });

    it('a card that just entered is a legal target of its own enter cost when nothing else is available (Dark Angel Unicorn)', () => {
        const s = scenario(2).discard('rhinocorn').hand('0', 'dark_angel_unicorn').start();
        s.play('0', 'dark_angel_unicorn');
        expect(s.candidates('0')).toEqual(['dark_angel_unicorn']);
        s.pick('0', 'dark_angel_unicorn');
        expect(s.candidates('0')).toEqual(['rhinocorn', 'dark_angel_unicorn']);
        s.pick('0', 'rhinocorn');
        expect(s.stableOf('0')).toEqual(['rhinocorn']);
        expect(s.discardPile()).toEqual(['dark_angel_unicorn']);
    });

    it('Dark Angel Unicorn may revive the card it just sacrificed — itself included, which enters again', () => {
        const s = scenario(2).stable('0', 'basic_unicorn_0').hand('0', 'dark_angel_unicorn').start();
        s.play('0', 'dark_angel_unicorn').pick('0', 'basic_unicorn_0');
        expect(s.candidates('0')).toEqual(['basic_unicorn_0']);
        s.pick('0', 'basic_unicorn_0');
        expect(s.stableOf('0')).toEqual(['dark_angel_unicorn', 'basic_unicorn_0']);

        const t = scenario(2).hand('0', 'dark_angel_unicorn').start();
        t.play('0', 'dark_angel_unicorn').pick('0', 'dark_angel_unicorn').pick('0', 'dark_angel_unicorn');
        expect(t.stableOf('0')).toEqual(['dark_angel_unicorn']);
        // it entered again, so its enter ability asks again
        expect(t.prompt('0')).toMatchObject({ verb: 'sacrifice', optional: true });
        t.skip('0');
        expect(t.prompts()).toEqual([]);
        expect(invariantViolations(t.G)).toEqual([]);
    });

    it('Change of Luck needs 3 cards to discard for the extra turn', () => {
        const s = scenario(2).deck('neigh', 'yay').hand('0', 'change_of_luck').start();
        s.play('0', 'change_of_luck').pick('0', 'neigh', 'yay');
        expect(s.G.extraTurns).toEqual([]);

        const t = scenario(2).deck('neigh', 'yay').hand('0', 'change_of_luck', 'slowdown').start();
        t.play('0', 'change_of_luck').pick('0', 'neigh', 'yay', 'slowdown');
        expect(t.G.extraTurns).toEqual(['0']);
    });
});
