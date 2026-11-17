import * as engine from '../engine';
import { scenario, invariantViolations } from '../testing/scenario';

// Upgrades, Downgrades and Magic cards of the base set (legacy preset unless stated).

// ─── Upgrades ─────────────────────────────────────────────────────────────────

describe('Stable Artillery — begin of turn: may DISCARD 2 cards, then DESTROY a Unicorn card', () => {
    it('discard two, then destroy', () => {
        const s = scenario(2).stable('0', 'stable_artillery').stable('1', 'basic_unicorn_0', 'yay').hand('0', 'neigh', 'neigh', 'yay').start('0', 'bot');
        s.useBot('0', 'stable_artillery');
        expect(s.prompt('0')).toMatchObject({ verb: 'discard', min: 2, max: 2, optional: true, role: 'cost' });
        s.pick('0', 'neigh', 'neigh');
        expect(s.prompt('0')).toMatchObject({ verb: 'destroy', optional: false, role: 'effect' });
        expect(s.candidates('0')).toEqual(['basic_unicorn_0']);
        s.pick('0', 'basic_unicorn_0');
        expect(s.discardPile()).toEqual(['neigh', 'neigh', 'basic_unicorn_0']);
        // the turn goes on: the ability is used up, the player draws
        expect(s.free('0')).toMatchObject({ bot: [], drawForTurn: true });
    });

    it('is not offered with fewer than two cards in hand', () => {
        const s = scenario(2).stable('0', 'stable_artillery').stable('1', 'basic_unicorn_0').hand('0', 'neigh').start('0', 'bot');
        expect(s.free('0').bot).toEqual([]);
    });

    it('several copies are separate abilities, used in any order', () => {
        const s = scenario(2).stable('0', 'stable_artillery', 'claw_machine', 'stable_artillery').stable('1', 'basic_unicorn_0').hand('0', 'neigh', 'neigh').start('0', 'bot');
        expect(s.free('0').bot).toEqual([0, 1, 2]);
        s.useBot('0', 'claw_machine').pick('0', 'neigh');
        // one card was discarded and one drawn: two cards again
        expect(s.free('0').bot).toEqual([0, 2]);
    });
});

describe('Rainbow Lasso — begin of turn: may DISCARD 3 cards, then STEAL a Unicorn card', () => {
    it('discard three, then steal', () => {
        const s = scenario(2).stable('0', 'rainbow_lasso').stable('1', 'basic_unicorn_0').hand('0', 'neigh', 'neigh', 'yay').start('0', 'bot');
        s.useBot('0', 'rainbow_lasso').pick('0', 'neigh', 'neigh', 'yay').pick('0', 'basic_unicorn_0');
        expect(s.stableOf('0')).toEqual(['rainbow_lasso', 'basic_unicorn_0']);
    });

    it('K3: a unicorn that arrived through one begin-of-turn ability can be used by the next one', () => {
        const s = scenario(2).stable('0', 'rainbow_lasso', 'glitter_bomb').stable('1', 'basic_unicorn_0', 'yay')
            .hand('0', 'neigh', 'neigh', 'neigh').start('0', 'bot');
        s.useBot('0', 'rainbow_lasso').pick('0', 'neigh', 'neigh', 'neigh').pick('0', 'basic_unicorn_0');
        s.useBot('0', 'glitter_bomb');
        expect(s.candidates('0')).toContain('basic_unicorn_0');
        s.pick('0', 'basic_unicorn_0').pick('0', 'yay');
        expect(s.discardPile()).toEqual(['neigh', 'neigh', 'neigh', 'basic_unicorn_0', 'yay']);
    });
});

describe('Rainbow Aura — your Unicorn cards cannot be destroyed', () => {
    it('protects unicorns from "destroy a Unicorn card" and from "destroy a card", but not Upgrades', () => {
        const s = scenario(2).stable('0', 'basic_unicorn_1').stable('1', 'rainbow_aura', 'basic_unicorn_0', 'baby_unicorn_0').hand('0', 'two_for_one', 'unicorn_poison').start();
        s.play('0', 'two_for_one').pick('0', 'basic_unicorn_1');
        expect(s.candidates('0')).toEqual(['rainbow_aura']);
        expect(s.prompt('0').disabled!.map(d => d.reason.rule)).toEqual(['protected', 'protected']);
    });

    it('legacy R15: targets are chosen one after another, so destroying Rainbow Aura unlocks the unicorns', () => {
        const s = scenario(2).stable('0', 'basic_unicorn_1').stable('1', 'rainbow_aura', 'basic_unicorn_0').hand('0', 'two_for_one').start();
        s.play('0', 'two_for_one').pick('0', 'basic_unicorn_1');
        expect(s.prompt('0')).toMatchObject({ min: 1, max: 1 });
        s.pick('0', 'rainbow_aura');
        expect(s.candidates('0')).toEqual(['basic_unicorn_0']);
        s.pick('0', 'basic_unicorn_0');
        expect(s.stableOf('1')).toEqual([]);
    });

    it('standard R15: all targets are chosen at once, so the unicorns stay protected', () => {
        const s = scenario(2, { multiTarget: 'atOnce' }).stable('0', 'basic_unicorn_1').stable('1', 'rainbow_aura', 'yay', 'basic_unicorn_0').hand('0', 'two_for_one').start();
        s.play('0', 'two_for_one').pick('0', 'basic_unicorn_1');
        expect(s.prompt('0')).toMatchObject({ min: 2, max: 2 });
        expect(s.candidates('0')).toEqual(['rainbow_aura', 'yay']);
        s.pick('0', 'rainbow_aura', 'yay');
        expect(s.stableOf('1')).toEqual(['basic_unicorn_0']);
        expect(s.prompts()).toEqual([]);
    });

    it('does not protect against stealing or sacrificing', () => {
        const s = scenario(2).stable('1', 'rainbow_aura', 'basic_unicorn_0').hand('0', 'alignment_change', 'neigh', 'neigh').start();
        s.play('0', 'alignment_change').pick('0', 'neigh', 'neigh');
        expect(s.candidates('0')).toEqual(['basic_unicorn_0']);
    });
});

describe('Glitter Bomb — begin of turn: may SACRIFICE a card, then DESTROY a card', () => {
    it('sacrifice any own card, then destroy any card', () => {
        const s = scenario(2).stable('0', 'glitter_bomb', 'basic_unicorn_0').stable('1', 'basic_unicorn_1', 'yay').start('0', 'bot');
        s.useBot('0', 'glitter_bomb');
        expect(s.candidates('0')).toEqual(['glitter_bomb', 'basic_unicorn_0']);
        s.pick('0', 'basic_unicorn_0');
        // legacy R11: own cards are legal destroy targets as well
        expect(s.candidates('0')).toEqual(['glitter_bomb', 'basic_unicorn_1', 'yay']);
        s.pick('0', 'yay');
        expect(s.discardPile()).toEqual(['basic_unicorn_0', 'yay']);
    });

    it('standard R11: destroy never targets your own stable', () => {
        const s = scenario(2, { destroyOwnStable: false }).stable('0', 'glitter_bomb', 'basic_unicorn_0').stable('1', 'yay').start('0', 'bot');
        s.useBot('0', 'glitter_bomb').pick('0', 'basic_unicorn_0');
        expect(s.candidates('0')).toEqual(['yay']);
    });
});

describe('Double Dutch — if in your Stable at the beginning of your turn, you may play 2 cards', () => {
    it('allows a second card, not a third', () => {
        const s = scenario(2).stable('0', 'double_dutch').hand('0', 'basic_unicorn_0', 'basic_unicorn_1', 'basic_unicorn_2').start();
        expect(engine.playsAllowed(s.G, '0')).toBe(2);
        s.play('0', 'basic_unicorn_0');
        expect(s.free('0')).toMatchObject({ endTurn: true, drawForAction: false });
        expect(s.free('0').play).toHaveLength(2);
        s.play('0', 'basic_unicorn_1');
        expect(s.free('0').play).toEqual([]);
        expect(s.tryPlay('0', 'basic_unicorn_2')).toBe('noPlaysLeft');
    });

    it('does nothing in the turn it enters', () => {
        const s = scenario(2).hand('0', 'double_dutch', 'basic_unicorn_0').start();
        s.play('0', 'double_dutch', '0');
        expect(engine.playsAllowed(s.G, '0')).toBe(1);
        expect(s.free('0').play).toEqual([]);
    });

    it('never draw plus play', () => {
        const s = scenario(2).stable('0', 'double_dutch').hand('0', 'basic_unicorn_0').start();
        s.drawForAction('0');
        expect(s.free('0').play).toEqual([]);
    });

    it('is lost when the card leaves during the turn', () => {
        const s = scenario(2).stable('0', 'double_dutch', 'basic_unicorn_3').stable('1', 'yay').hand('0', 'two_for_one', 'basic_unicorn_0').start();
        s.play('0', 'two_for_one').pick('0', 'double_dutch').pick('0', 'yay');
        expect(engine.playsAllowed(s.G, '0')).toBe(1);
        expect(s.free('0').play).toEqual([]);
    });
});

describe('Claw Machine / Caffeine Overload', () => {
    it('Claw Machine: discard a card, then draw a card', () => {
        const s = scenario(2).stable('0', 'claw_machine').deck('yay').hand('0', 'neigh').start('0', 'bot');
        s.useBot('0', 'claw_machine').pick('0', 'neigh');
        expect(s.handOf('0')).toEqual(['yay']);
        expect(s.prompts()).toEqual([]);
    });

    it('Caffeine Overload: sacrifice a card, then draw 2 cards', () => {
        const s = scenario(2).stable('0', 'caffeine_overload', 'basic_unicorn_0').deck('yay', 'neigh').start('0', 'bot');
        s.useBot('0', 'caffeine_overload');
        expect(s.candidates('0')).toEqual(['caffeine_overload', 'basic_unicorn_0']);
        s.pick('0', 'basic_unicorn_0');
        expect(s.handOf('0')).toEqual(['yay', 'neigh']);
    });
});

// ─── Downgrades ───────────────────────────────────────────────────────────────

describe('Barbed Wire — each time a Unicorn card enters or leaves your Stable, DISCARD a card', () => {
    it('discard when a unicorn enters', () => {
        const s = scenario(2).stable('0', 'barbed_wire').hand('0', 'basic_unicorn_0', 'neigh').start();
        s.play('0', 'basic_unicorn_0');
        const prompt = s.prompt('0');
        expect(prompt).toMatchObject({ verb: 'discard', optional: false });
        expect(prompt.source).toMatchObject({ card: s.id('barbed_wire') });
        s.pick('0', 'neigh');
        expect(s.discardPile()).toEqual(['neigh']);
    });

    it('discard when a unicorn leaves — before the effect that removed it continues', () => {
        const s = scenario(2).stable('0', 'basic_unicorn_1').stable('1', 'barbed_wire', 'basic_unicorn_0', 'yay').hand('0', 'two_for_one').hand('1', 'neigh').start();
        s.play('0', 'two_for_one').pick('0', 'basic_unicorn_1').pick('0', 'basic_unicorn_0');
        // player 1 discards first; player 0's second destroy waits
        expect(s.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['1:discard']);
        s.pick('1', 'neigh');
        expect(s.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['0:destroy']);
    });

    it('nothing happens with an empty hand, and not for Upgrades or Downgrades', () => {
        const s = scenario(2).stable('0', 'barbed_wire').hand('0', 'basic_unicorn_0').start();
        s.play('0', 'basic_unicorn_0');
        expect(s.prompts()).toEqual([]);

        const t = scenario(2).stable('0', 'barbed_wire').hand('0', 'yay', 'neigh').start();
        t.play('0', 'yay', '0');
        expect(t.prompts()).toEqual([]);
    });

    it('a stolen unicorn triggers the Barbed Wire of both stables: the mandatory discards come before the optional enter ability', () => {
        const s = scenario(2).stable('0', 'barbed_wire').stable('1', 'barbed_wire', 'alluring_narwhal', 'yay')
            .hand('0', 'alignment_change', 'neigh', 'neigh', 'neigh').hand('1', 'neigh').start();
        s.play('0', 'alignment_change');
        s.pick('0', 'neigh', 'neigh').pick('0', 'alluring_narwhal');
        expect(s.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['1:discard']);
        s.pick('1', 'neigh');
        expect(s.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['0:discard']);
        s.pick('0', 'neigh');
        // now Alluring Narwhal's own enter ability
        expect(s.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['0:steal']);
    });
});

describe('Blinding Light — all of your Unicorn cards are considered Basic Unicorns with no effects', () => {
    it('suppresses enter abilities', () => {
        const s = scenario(2).stable('0', 'blinding_light').stable('1', 'yay').hand('0', 'alluring_narwhal').start();
        s.play('0', 'alluring_narwhal');
        expect(s.prompts()).toEqual([]);
        expect(s.G.log.some(e => e.verb === 'steal')).toBe(false);
    });

    it('suppresses begin-of-turn abilities of unicorns but not of Upgrades', () => {
        const s = scenario(2).stable('0', 'blinding_light', 'rhinocorn', 'claw_machine').stable('1', 'basic_unicorn_0').hand('0', 'neigh').start('0', 'bot');
        expect(s.G.turn.bot.map(b => s.G.cards[b.card].def)).toEqual(['claw_machine']);
    });

    it('suppresses "if this card is sacrificed or destroyed"', () => {
        const s = scenario(2).stable('0', 'blinding_light', 'annoying_flying_unicorn').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'annoying_flying_unicorn');
        expect(s.zone('annoying_flying_unicorn')).toEqual({ zone: 'discard' });
    });

    it('suppresses continuous effects while it is there', () => {
        const s = scenario(2).stable('0', 'ginormous_unicorn', 'basic_unicorn_0').hand('0', 'blinding_light').hand('1', 'unicorn_poison').start();
        expect(engine.unicornCount(s.G, '0')).toBe(3);
        s.play('0', 'blinding_light', '0');
        expect(engine.isBlinded(s.G, s.id('ginormous_unicorn'))).toBe(true);
        expect(engine.isBlinded(s.G, s.id('basic_unicorn_0'))).toBe(true);
        expect(engine.unicornCount(s.G, '0')).toBe(2);
    });

    it('does not change card types: a blinded Magical Unicorn is not a Basic Unicorn for Queen Bee', () => {
        const s = scenario(2).stable('0', 'blinding_light').stable('1', 'queen_bee_unicorn').hand('0', 'rhinocorn').start();
        expect(s.tryPlay('0', 'rhinocorn')).toBeUndefined();
    });

    it('Barbed Wire still fires for a blinded unicorn that enters (issue I2 fixed)', () => {
        const s = scenario(2).stable('0', 'blinding_light', 'barbed_wire').hand('0', 'rhinocorn', 'neigh').start();
        s.play('0', 'rhinocorn');
        expect(s.prompt('0')).toMatchObject({ verb: 'discard' });
    });

    it('legacy R13: a unicorn that entered while blinded never gets its continuous effect', () => {
        const s = scenario(2).stable('0', 'blinding_light').stable('1', 'basic_unicorn_3').hand('0', 'ginormous_unicorn').hand('1', 'two_for_one').start();
        s.play('0', 'ginormous_unicorn');
        s.endTurn('0').drawForTurn('1');
        s.play('1', 'two_for_one').pick('1', 'basic_unicorn_3').pick('1', 'blinding_light');
        expect(engine.blindingCard(s.G, '0')).toBeUndefined();
        expect(engine.unicornCount(s.G, '0')).toBe(1);
    });

    it('standard R13: the continuous effect is active again when Blinding Light leaves', () => {
        const s = scenario(2, { blindingRestoresEffects: true }).stable('0', 'blinding_light').stable('1', 'basic_unicorn_3').hand('0', 'ginormous_unicorn').hand('1', 'two_for_one').start();
        s.play('0', 'ginormous_unicorn');
        s.endTurn('0').drawForTurn('1');
        s.play('1', 'two_for_one').pick('1', 'basic_unicorn_3').pick('1', 'blinding_light');
        expect(engine.unicornCount(s.G, '0')).toBe(2);
    });

    it('legacy R1: with Pandamonium in the same stable the unicorns keep their abilities', () => {
        const s = scenario(2).stable('0', 'blinding_light', 'pandamonium').stable('1', 'yay').hand('0', 'alluring_narwhal').start();
        s.play('0', 'alluring_narwhal');
        expect(s.prompt('0')).toMatchObject({ verb: 'steal' });
    });

    it('standard R1: blinding has priority over Pandamonium', () => {
        const s = scenario(2, { blindingBeatsMasquerade: true }).stable('0', 'blinding_light', 'pandamonium').stable('1', 'yay').hand('0', 'alluring_narwhal').start();
        s.play('0', 'alluring_narwhal');
        expect(s.prompts()).toEqual([]);
    });
});

describe('Broken Stable — you cannot play Upgrade cards', () => {
    it('blocks playing Upgrades (into any stable), nothing else', () => {
        const s = scenario(2).stable('0', 'broken_stable').hand('0', 'yay', 'slowdown', 'basic_unicorn_0').start();
        expect(s.tryPlay('0', 'yay', '1')).toBe('cannotPlay');
        expect(s.free('0').play.map(p => s.G.cards[p.card].def)).toEqual(['slowdown', 'basic_unicorn_0']);
    });

    it('other players may still play Upgrades into that stable, and Upgrades can be stolen into it', () => {
        const s = scenario(2).stable('0', 'broken_stable').stable('1', 'rainbow_aura').hand('1', 'yay').hand('0', 'alluring_narwhal').start('1');
        s.play('1', 'yay', '0');
        expect(s.stableOf('0')).toEqual(['broken_stable', 'yay']);
        s.endTurn('1').drawForTurn('0');
        s.play('0', 'alluring_narwhal').pick('0', 'rainbow_aura');
        expect(s.stableOf('0')).toContain('rainbow_aura');
    });
});

describe('Pandamonium — all of your Unicorns are Pandas', () => {
    const table = (rules = {}) => scenario(2, rules).stable('0', 'basic_unicorn_1').stable('1', 'pandamonium', 'basic_unicorn_0', 'yay');

    it('"destroy a Unicorn card" cannot target a Panda; "destroy a card" can', () => {
        const s = table().hand('0', 'unicorn_poison', 'two_for_one').start();
        s.play('0', 'unicorn_poison');
        expect(s.candidates('0')).toEqual(['basic_unicorn_1']);
        expect(s.prompt('0').disabled).toEqual([{ candidate: { card: s.id('basic_unicorn_0'), zone: 'stable', owner: '1' }, reason: { rule: 'masquerade' } }]);

        const t = table().hand('0', 'two_for_one').start();
        t.play('0', 'two_for_one').pick('0', 'basic_unicorn_1');
        expect(t.candidates('0')).toEqual(['pandamonium', 'basic_unicorn_0', 'yay']);
    });

    it('legacy R4: Pandas cannot be sacrificed at all, but can be stolen and returned to hand', () => {
        const s = scenario(2).stable('0', 'pandamonium', 'basic_unicorn_0', 'yay').hand('0', 'two_for_one').start();
        s.play('0', 'two_for_one');
        expect(s.candidates('0')).toEqual(['pandamonium', 'yay']);

        const t = table().hand('0', 'alignment_change', 'neigh', 'neigh').start();
        t.play('0', 'alignment_change').pick('0', 'neigh', 'neigh');
        expect(t.candidates('0')).toEqual(['basic_unicorn_0']);

        const u = table().hand('0', 'back_kick').start();
        u.play('0', 'back_kick');
        expect(u.candidates('0')).toEqual(['pandamonium', 'basic_unicorn_0', 'yay']);
    });

    it('standard R4: "Unicorn card" effects cannot affect Pandas, "a card" effects can', () => {
        const rules = { masqueradeScope: 'unicornFilters' as const };
        const s = scenario(2, rules).stable('0', 'pandamonium', 'basic_unicorn_0', 'yay').hand('0', 'two_for_one').start();
        s.play('0', 'two_for_one');
        expect(s.candidates('0')).toEqual(['pandamonium', 'basic_unicorn_0', 'yay']);

        const t = table(rules).hand('0', 'alignment_change', 'neigh', 'neigh').start();
        t.play('0', 'alignment_change').pick('0', 'neigh', 'neigh');
        expect(t.prompts()).toEqual([]);
        expect(t.logVerbs('fizzled')).toEqual(['steal']);

        const u = table(rules).hand('0', 'back_kick').start();
        u.play('0', 'back_kick');
        expect(u.candidates('0')).toEqual(['pandamonium', 'basic_unicorn_0', 'yay']);
    });

    it('legacy R14: Barbed Wire fires when a Panda enters and when it leaves', () => {
        const s = scenario(2).stable('0', 'basic_unicorn_3').stable('1', 'pandamonium', 'barbed_wire', 'basic_unicorn_0').hand('0', 'two_for_one').hand('1', 'neigh').start();
        s.play('0', 'two_for_one').pick('0', 'basic_unicorn_3').pick('0', 'basic_unicorn_0');
        expect(s.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['1:discard']);
    });

    it('standard R14: Barbed Wire fires when a Panda enters, not when it leaves', () => {
        const rules = { barbedWireOnMaskedLeave: false };
        const s = scenario(2, rules).stable('0', 'basic_unicorn_3').stable('1', 'pandamonium', 'barbed_wire', 'basic_unicorn_0').hand('0', 'two_for_one').hand('1', 'neigh').start();
        s.play('0', 'two_for_one').pick('0', 'basic_unicorn_3').pick('0', 'basic_unicorn_0');
        expect(s.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['0:destroy']);

        const t = scenario(2, rules).stable('0', 'pandamonium', 'barbed_wire').hand('0', 'basic_unicorn_0', 'neigh').start();
        t.play('0', 'basic_unicorn_0');
        expect(t.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['0:discard']);
    });
});

describe('Slowdown — you cannot play Neigh cards', () => {
    it('ends when Slowdown leaves', () => {
        const s = scenario(2).stable('1', 'slowdown').hand('0', 'basic_unicorn_0').hand('1', 'neigh').start();
        expect(engine.playRestriction(s.G, '1', engine.defOf(s.G, s.id('neigh')))).toEqual({ rule: 'cannotPlay', card: s.id('slowdown') });
        expect(engine.playRestriction(s.G, '0', engine.defOf(s.G, s.id('neigh')))).toBeUndefined();
    });
});

describe('Tiny Stable — if at any time you have more than 5 Unicorns, SACRIFICE a Unicorn card', () => {
    it('legacy R5: asks for a sacrifice when the 6th unicorn enters', () => {
        const s = scenario(2).stable('0', 'tiny_stable', ...Array(5).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        s.play('0', 'basic_unicorn_1');
        const prompt = s.prompt('0');
        expect(prompt).toMatchObject({ verb: 'sacrifice', optional: false });
        expect(prompt.source?.card).toBe(s.id('tiny_stable'));
        s.pick('0', 'basic_unicorn_1');
        expect(engine.unicornCount(s.G, '0')).toBe(5);
        expect(s.prompts()).toEqual([]);
    });

    it('does nothing at 5 unicorns', () => {
        const s = scenario(2).stable('0', 'tiny_stable', ...Array(4).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        s.play('0', 'basic_unicorn_1');
        expect(s.prompts()).toEqual([]);
    });

    it('Ginormous Unicorn counts as 2: the 5th card already triggers it', () => {
        const s = scenario(2).stable('0', 'tiny_stable', 'ginormous_unicorn', ...Array(3).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        s.play('0', 'basic_unicorn_1');
        expect(s.prompt('0')).toMatchObject({ verb: 'sacrifice' });
    });

    it('is inert while Pandamonium is active', () => {
        const s = scenario(2).stable('0', 'tiny_stable', 'pandamonium', ...Array(5).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        s.play('0', 'basic_unicorn_1');
        expect(s.prompts()).toEqual([]);
    });

    it('is checked when Tiny Stable itself enters a stable that is too full', () => {
        const s = scenario(2).stable('1', ...Array(6).fill('basic_unicorn_0')).hand('0', 'tiny_stable').start();
        s.play('0', 'tiny_stable', '1');
        expect(s.prompt('1')).toMatchObject({ verb: 'sacrifice' });
    });

    it('legacy R5: not checked when Pandamonium leaves; standard: checked at any time', () => {
        const build = (rules = {}) => scenario(2, rules)
            .stable('0', 'tiny_stable', 'pandamonium', ...Array(6).fill('basic_unicorn_0'))
            .stable('1', 'basic_unicorn_3').hand('1', 'two_for_one').start('1');
        const legacy = build();
        legacy.play('1', 'two_for_one').pick('1', 'basic_unicorn_3').pick('1', 'pandamonium');
        expect(legacy.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['1:destroy']);

        const standard = build({ tinyStable: 'continuous', winCheck: 'whenResolved' });
        standard.play('1', 'two_for_one').pick('1', 'basic_unicorn_3').pick('1', 'pandamonium');
        expect(standard.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['0:sacrifice']);
        standard.pick('0', 'basic_unicorn_0');
        expect(standard.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['1:destroy']);
    });
});

// ─── Magic ────────────────────────────────────────────────────────────────────

describe('Unicorn Poison — DESTROY a Unicorn card', () => {
    it('destroys a unicorn of any player (legacy R11: also your own)', () => {
        const s = scenario(3).stable('0', 'basic_unicorn_0').stable('1', 'basic_unicorn_1', 'yay').stable('2', 'rhinocorn').hand('0', 'unicorn_poison').start();
        s.play('0', 'unicorn_poison');
        expect(s.prompt('0')).toMatchObject({ kind: 'chooseCards', verb: 'destroy', optional: false });
        expect(s.candidates('0')).toEqual(['basic_unicorn_0', 'basic_unicorn_1', 'rhinocorn']);
        s.pick('0', 'rhinocorn');
        expect(s.discardPile()).toEqual(['rhinocorn', 'unicorn_poison']);
        const entry = s.G.log.find(e => e.verb === 'destroy')!;
        expect(entry).toMatchObject({ actor: '0', cards: [s.id('rhinocorn')], players: ['2'], outcome: 'done' });
        expect(entry.source?.card).toBe(s.id('unicorn_poison'));
    });

    it('the log is a tree: the destroy is a child of the play', () => {
        const s = scenario(2).stable('1', 'basic_unicorn_1').hand('0', 'unicorn_poison').start();
        s.play('0', 'unicorn_poison').pick('0', 'basic_unicorn_1');
        const play = s.G.log.find(e => e.verb === 'play')!;
        expect(s.G.log.find(e => e.verb === 'destroy')!.parent).toBe(play.id);
    });
});

describe('Alignment Change — DISCARD 2 cards, then STEAL a Unicorn card', () => {
    it('discard two, then steal', () => {
        const s = scenario(2).stable('1', 'basic_unicorn_0').hand('0', 'alignment_change', 'neigh', 'yay').start();
        s.play('0', 'alignment_change');
        expect(s.prompt('0')).toMatchObject({ verb: 'discard', min: 2, max: 2, optional: false });
        s.pick('0', 'neigh', 'yay').pick('0', 'basic_unicorn_0');
        expect(s.stableOf('0')).toEqual(['basic_unicorn_0']);
    });

    it('with only one other card: discards it, and nothing is stolen', () => {
        const s = scenario(2).stable('1', 'basic_unicorn_0').hand('0', 'alignment_change', 'neigh').start();
        s.play('0', 'alignment_change');
        expect(s.prompt('0')).toMatchObject({ verb: 'discard', min: 1, max: 1 });
        s.pick('0', 'neigh');
        expect(s.prompts()).toEqual([]);
        expect(s.stableOf('1')).toEqual(['basic_unicorn_0']);
        expect(s.zone('alignment_change')).toEqual({ zone: 'discard' });
    });

    it('a stolen unicorn\'s enter ability triggers for the new owner', () => {
        const s = scenario(2).stable('1', 'greedy_flying_unicorn').deck('yay').hand('0', 'alignment_change', 'neigh', 'neigh').start();
        s.play('0', 'alignment_change').pick('0', 'neigh', 'neigh').pick('0', 'greedy_flying_unicorn');
        expect(s.handOf('0')).toEqual(['yay']);
    });

    it('legacy R8: a unicorn cannot be stolen into a full stable', () => {
        const s = scenario(2).stable('0', 'pandamonium', ...Array(7).fill('basic_unicorn_1')).stable('1', 'basic_unicorn_0').hand('0', 'alignment_change', 'neigh', 'neigh').start();
        expect(engine.canEnter(s.G, s.id('basic_unicorn_0'), '0')).toEqual({ ok: false, reason: { rule: 'stableFull' } });
    });
});

describe('Unfair Bargain — trade hands with any other player', () => {
    it('swaps the two hands', () => {
        const s = scenario(3).hand('0', 'unfair_bargain', 'neigh').hand('1', 'yay', 'slowdown').hand('2', 'rhinocorn').start();
        s.play('0', 'unfair_bargain');
        const prompt = s.prompt('0');
        expect(prompt).toMatchObject({ kind: 'choosePlayers', verb: 'trade', optional: false });
        expect(engine.candidatePlayers(prompt)).toEqual(['1', '2']);
        s.pickPlayer('0', '1');
        expect(s.handOf('0')).toEqual(['yay', 'slowdown']);
        expect(s.handOf('1')).toEqual(['neigh']);
        expect(s.handOf('2')).toEqual(['rhinocorn']);
        expect(invariantViolations(s.G)).toEqual([]);
    });
});

describe('Two-For-One — SACRIFICE a card, then DESTROY 2 cards', () => {
    it('sacrifice one, destroy two', () => {
        const s = scenario(2).stable('0', 'basic_unicorn_0').stable('1', 'basic_unicorn_1', 'yay', 'slowdown').hand('0', 'two_for_one').start();
        s.play('0', 'two_for_one');
        expect(s.prompt('0')).toMatchObject({ verb: 'sacrifice', optional: false, role: 'cost' });
        s.pick('0', 'basic_unicorn_0').pick('0', 'yay').pick('0', 'basic_unicorn_1');
        expect(s.stableOf('1')).toEqual(['slowdown']);
        expect(s.discardPile()).toEqual(['basic_unicorn_0', 'yay', 'basic_unicorn_1', 'two_for_one']);
    });

    it('destroys as many as possible when only one target exists', () => {
        const s = scenario(2, { destroyOwnStable: false }).stable('0', 'basic_unicorn_0').stable('1', 'yay').hand('0', 'two_for_one').start();
        s.play('0', 'two_for_one').pick('0', 'basic_unicorn_0').pick('0', 'yay');
        expect(s.prompts()).toEqual([]);
        expect(s.zone('two_for_one')).toEqual({ zone: 'discard' });
    });

    it('without anything to sacrifice nothing is destroyed', () => {
        const s = scenario(2).stable('1', 'yay').hand('0', 'two_for_one').start();
        s.play('0', 'two_for_one');
        expect(s.prompts()).toEqual([]);
        expect(s.stableOf('1')).toEqual(['yay']);
        expect(s.logVerbs('fizzled')).toEqual(['sacrifice']);
    });
});

describe('Targeted Destruction — DESTROY an Upgrade card or SACRIFICE a Downgrade card', () => {
    it('is mandatory: no Skip', () => {
        const s = scenario(2).stable('0', 'slowdown').stable('1', 'yay').hand('0', 'targeted_destruction').start();
        s.play('0', 'targeted_destruction');
        expect(s.prompt('0')).toMatchObject({ kind: 'chooseMode', optional: false });
        s.mode('0', 1).pick('0', 'slowdown');
        expect(s.discardPile()).toEqual(['slowdown', 'targeted_destruction']);
    });
});

describe('Shake Up — shuffle this card, your hand and the discard pile into the deck; DRAW 5 cards', () => {
    it('everything goes into the deck, then 5 cards are drawn', () => {
        const s = scenario(2).discard('neigh', 'yay').hand('0', 'shake_up', 'slowdown', 'rhinocorn').start('0', 'action', 3);
        s.play('0', 'shake_up');
        expect(s.prompts()).toEqual([]);
        expect(s.G.zones.hand['0']).toHaveLength(5);
        expect(s.G.zones.discard).toEqual([]);
        expect(s.G.zones.pile).toEqual([]);
        // 3 filler + shake_up + 2 hand + 2 discard = 8 cards, 5 drawn
        expect(s.G.zones.deck).toHaveLength(3);
        expect(invariantViolations(s.G)).toEqual([]);
    });
});

describe('Reset Button — each player sacrifices all Upgrade and Downgrade cards; shuffle the discard pile into the deck', () => {
    it('clears all Upgrades and Downgrades and empties the discard pile; the card itself is discarded afterwards', () => {
        const s = scenario(2).stable('0', 'yay', 'basic_unicorn_0', 'slowdown').stable('1', 'barbed_wire', 'rhinocorn').discard('neigh').hand('0', 'reset_button').start();
        const deckBefore = s.G.zones.deck.length;
        s.play('0', 'reset_button');
        expect(s.prompts()).toEqual([]);
        expect(s.stableOf('0')).toEqual(['basic_unicorn_0']);
        expect(s.stableOf('1')).toEqual(['rhinocorn']);
        expect(s.G.zones.deck).toHaveLength(deckBefore + 4);
        expect(s.discardPile()).toEqual(['reset_button']);
    });
});

describe('Mystical Vortex — each player discards a card; shuffle the discard pile into the deck', () => {
    it('the discard pile is shuffled in once everybody has discarded', () => {
        const s = scenario(2).hand('0', 'mystical_vortex', 'neigh').hand('1', 'yay').discard('slowdown').start();
        const deckBefore = s.G.zones.deck.length;
        s.play('0', 'mystical_vortex');
        s.pick('0', 'neigh');
        expect(s.G.zones.discard).toHaveLength(2);
        s.pick('1', 'yay');
        expect(s.G.zones.deck).toHaveLength(deckBefore + 3);
        expect(s.discardPile()).toEqual(['mystical_vortex']);
    });
});

describe('Kiss of Life — bring a Unicorn card from the discard pile into your Stable', () => {
    it('revives a unicorn and triggers its enter ability', () => {
        const s = scenario(2).discard('neigh', 'greedy_flying_unicorn').deck('yay').hand('0', 'kiss_of_life').start();
        s.play('0', 'kiss_of_life');
        expect(s.prompt('0')).toMatchObject({ verb: 'bring', optional: false });
        expect(s.candidates('0')).toEqual(['greedy_flying_unicorn']);
        s.pick('0', 'greedy_flying_unicorn');
        expect(s.stableOf('0')).toEqual(['greedy_flying_unicorn']);
        expect(s.handOf('0')).toEqual(['yay']);
    });
});

describe('Good Deal — DRAW 3 cards and DISCARD a card', () => {
    it('draws three, then asks for a discard', () => {
        const s = scenario(2).deck('neigh', 'yay', 'slowdown').hand('0', 'good_deal').start();
        s.play('0', 'good_deal');
        expect(s.handOf('0')).toEqual(['neigh', 'yay', 'slowdown']);
        s.pick('0', 'yay');
        expect(s.discardPile()).toEqual(['yay', 'good_deal']);
    });
});

describe('Change of Luck — DRAW 2 cards and DISCARD 3 cards, then take another turn', () => {
    it('grants an extra turn after the current one', () => {
        const s = scenario(2).deck('neigh', 'yay').hand('0', 'change_of_luck', 'slowdown').start();
        s.play('0', 'change_of_luck');
        expect(s.prompt('0')).toMatchObject({ verb: 'discard', min: 3, max: 3 });
        s.pick('0', 'neigh', 'yay', 'slowdown');
        expect(s.G.extraTurns).toEqual(['0']);
        expect(s.logVerbs()).toContain('extraTurn');
        s.endTurn('0');
        expect(s.G.turn).toMatchObject({ number: 2, player: '0', phase: 'bot' });
        expect(s.G.extraTurns).toEqual([]);
        s.drawForTurn('0').drawForAction('0').endTurn('0');
        expect(s.G.turn.player).toBe('1');
    });

    it('no extra turn if fewer than 3 cards could be discarded', () => {
        const s = scenario(2).deck('neigh', 'yay').hand('0', 'change_of_luck').start();
        s.play('0', 'change_of_luck');
        expect(s.prompt('0')).toMatchObject({ min: 2, max: 2 });
        s.pick('0', 'neigh', 'yay');
        expect(s.G.extraTurns).toEqual([]);
    });
});

describe('Back Kick — return a card in another player\'s Stable to their hand; that player must DISCARD a card', () => {
    it('the owner of the returned card discards', () => {
        const s = scenario(3).stable('1', 'basic_unicorn_0', 'yay').stable('0', 'rhinocorn').hand('0', 'back_kick').hand('2', 'neigh').start();
        s.play('0', 'back_kick');
        expect(s.candidates('0')).toEqual(['basic_unicorn_0', 'yay']);
        s.pick('0', 'yay');
        expect(s.handOf('1')).toEqual(['yay']);
        expect(s.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['1:discard']);
        s.pick('1', 'yay');
        expect(s.discardPile()).toEqual(['yay', 'back_kick']);
    });

    it('a returned Baby Unicorn goes to the Nursery; its owner still discards', () => {
        const s = scenario(2).stable('1', 'baby_unicorn_0').hand('0', 'back_kick').hand('1', 'yay').start();
        s.play('0', 'back_kick');
        s.pick('0', 'baby_unicorn_0');
        expect(s.zone('baby_unicorn_0')).toEqual({ zone: 'nursery' });
        expect(s.prompt('1')).toMatchObject({ verb: 'discard' });
    });
});
