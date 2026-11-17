import * as engine from '../engine';
import { scenario, invariantViolations } from '../testing/scenario';

// One scenario per ability of the 12 Magical Unicorns of the Adventures set (legacy preset unless stated).

// ─── Begin of turn ────────────────────────────────────────────────────────────

describe('Vagabond Unicorn — begin of turn: may DISCARD a card, then pull a card at random from another player\'s hand', () => {
    it('discard, then pull', () => {
        const s = scenario(3).stable('0', 'vagabond_unicorn').hand('0', 'neigh').hand('1', 'yay', 'slowdown').start('0', 'bot');
        expect(s.free('0').bot).toEqual([0]);
        s.useBot('0', 'vagabond_unicorn');
        expect(s.prompt('0')).toMatchObject({ kind: 'chooseCards', verb: 'discard', role: 'cost', optional: true, min: 1, max: 1 });
        s.pick('0', 'neigh');
        const pull = s.prompt('0');
        expect(pull).toMatchObject({ kind: 'choosePlayers', verb: 'pull', role: 'effect', optional: false });
        // players with an empty hand are not offered
        expect(engine.candidatePlayers(pull)).toEqual(['1']);
        s.pickPlayer('0', '1');
        // fixedRng: the first card of the hand
        expect(s.handOf('0')).toEqual(['yay']);
        expect(s.handOf('1')).toEqual(['slowdown']);
        expect(s.discardPile()).toEqual(['neigh']);
        expect(s.G.log.find(e => e.verb === 'pull')!.visibility).toEqual(['0', '1']);
        expect(s.free('0')).toMatchObject({ bot: [], drawForTurn: true });
    });

    it('backing out at the discard leaves the ability available', () => {
        const s = scenario(2).stable('0', 'vagabond_unicorn').hand('0', 'neigh').hand('1', 'yay').start('0', 'bot');
        s.useBot('0', 'vagabond_unicorn').skip('0');
        expect(s.handOf('0')).toEqual(['neigh']);
        expect(s.free('0')).toMatchObject({ bot: [0], drawForTurn: true });
    });

    it('is not offered with an empty hand', () => {
        const s = scenario(2).stable('0', 'vagabond_unicorn').hand('1', 'yay').start('0', 'bot');
        expect(s.free('0').bot).toEqual([]);
    });

    it('the discard is lost if no other player has a card', () => {
        const s = scenario(2).stable('0', 'vagabond_unicorn').hand('0', 'neigh').start('0', 'bot');
        s.useBot('0', 'vagabond_unicorn').pick('0', 'neigh');
        expect(s.prompts()).toEqual([]);
        expect(s.discardPile()).toEqual(['neigh']);
        expect(s.logVerbs('fizzled')).toEqual(['pull']);
    });

    it('is forfeited by drawing for the turn', () => {
        const s = scenario(2).stable('0', 'vagabond_unicorn').hand('0', 'neigh').hand('1', 'yay').start('0', 'bot');
        s.drawForTurn('0');
        expect(s.free('0').bot).toEqual([]);
        expect(engine.useBotAbility(s.G, s.rng, '0', 0)).toBe('notUsable');
    });
});

describe('Survivalist Unicorn — begin of turn: may DISCARD a card, then SACRIFICE a Downgrade card', () => {
    it('discard, then sacrifice a Downgrade', () => {
        const s = scenario(2).stable('0', 'survivalist_unicorn', 'barbed_wire', 'yay').hand('0', 'neigh').start('0', 'bot');
        s.useBot('0', 'survivalist_unicorn');
        expect(s.prompt('0')).toMatchObject({ verb: 'discard', role: 'cost', optional: true });
        s.pick('0', 'neigh');
        expect(s.prompt('0')).toMatchObject({ verb: 'sacrifice', role: 'effect', optional: false });
        expect(s.candidates('0')).toEqual(['barbed_wire']);
        s.pick('0', 'barbed_wire');
        expect(s.stableOf('0')).toEqual(['survivalist_unicorn', 'yay']);
        expect(s.discardPile()).toEqual(['neigh', 'barbed_wire']);
    });

    it('can be declined', () => {
        const s = scenario(2).stable('0', 'survivalist_unicorn', 'barbed_wire').hand('0', 'neigh').start('0', 'bot');
        s.useBot('0', 'survivalist_unicorn').skip('0');
        expect(s.stableOf('0')).toEqual(['survivalist_unicorn', 'barbed_wire']);
        expect(s.free('0').bot).toEqual([0]);
    });

    it('is not offered with an empty hand', () => {
        const s = scenario(2).stable('0', 'survivalist_unicorn', 'barbed_wire').start('0', 'bot');
        expect(s.free('0').bot).toEqual([]);
    });

    it('only the cost is checked: without a Downgrade the discard is lost', () => {
        const s = scenario(2).stable('0', 'survivalist_unicorn').stable('1', 'barbed_wire').hand('0', 'neigh').start('0', 'bot');
        expect(s.free('0').bot).toEqual([0]);
        s.useBot('0', 'survivalist_unicorn').pick('0', 'neigh');
        expect(s.prompts()).toEqual([]);
        // a Downgrade in another player's stable is never a candidate
        expect(s.stableOf('1')).toEqual(['barbed_wire']);
        expect(s.logVerbs('fizzled')).toEqual(['sacrifice']);
    });
});

describe('Extreme Adventurer Unicorn — Basic Unicorn cards cannot enter your Stable; begin of turn: may DRAW a card', () => {
    it('a Basic Unicorn cannot be played into that stable', () => {
        const s = scenario(2).stable('0', 'extreme_adventurer_unicorn').hand('0', 'basic_unicorn_0', 'rhinocorn').start();
        expect(s.tryPlay('0', 'basic_unicorn_0')).toBe('cannotEnter');
        expect(s.free('0').play.map(p => p.card)).toEqual([s.id('rhinocorn')]);
        expect(engine.canEnter(s.G, s.id('basic_unicorn_0'), '0')).toEqual({ ok: false, reason: { rule: 'cannotEnter', card: s.id('extreme_adventurer_unicorn') } });
    });

    it('a Basic Unicorn cannot be brought in (Rainbow Unicorn, Kiss of Life)', () => {
        const s = scenario(2).stable('0', 'extreme_adventurer_unicorn').hand('0', 'rainbow_unicorn', 'basic_unicorn_0').start();
        s.play('0', 'rainbow_unicorn');
        expect(s.prompts()).toEqual([]);
        expect(s.handOf('0')).toEqual(['basic_unicorn_0']);

        const t = scenario(2).stable('0', 'extreme_adventurer_unicorn').discard('basic_unicorn_0', 'rhinocorn').hand('0', 'kiss_of_life').start();
        t.play('0', 'kiss_of_life');
        expect(t.candidates('0')).toEqual(['rhinocorn']);
        expect(t.prompt('0').disabled).toEqual([{ candidate: { card: t.id('basic_unicorn_0'), zone: 'discard' }, reason: { rule: 'cannotEnter', card: t.id('extreme_adventurer_unicorn') } }]);
    });

    it('a Basic Unicorn cannot be stolen into that stable', () => {
        const s = scenario(2).stable('0', 'extreme_adventurer_unicorn').stable('1', 'basic_unicorn_0', 'rhinocorn').hand('0', 'alignment_change', 'neigh', 'neigh').start();
        s.play('0', 'alignment_change').pick('0', 'neigh', 'neigh');
        expect(s.candidates('0')).toEqual(['rhinocorn']);
    });

    it('only its own stable is affected, and Basic Unicorns already there stay', () => {
        const s = scenario(2).stable('0', 'basic_unicorn_1').stable('1', 'extreme_adventurer_unicorn').hand('0', 'basic_unicorn_0').hand('1', 'unicorn_poison').start();
        s.play('0', 'basic_unicorn_0');
        expect(s.stableOf('0')).toEqual(['basic_unicorn_1', 'basic_unicorn_0']);

        const t = scenario(2).stable('0', 'basic_unicorn_1').hand('0', 'extreme_adventurer_unicorn').start();
        t.play('0', 'extreme_adventurer_unicorn');
        expect(t.stableOf('0')).toEqual(['basic_unicorn_1', 'extreme_adventurer_unicorn']);
    });

    it('the restriction ends when it leaves', () => {
        const s = scenario(2).stable('0', 'extreme_adventurer_unicorn').hand('1', 'unicorn_poison').hand('0', 'basic_unicorn_0').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'extreme_adventurer_unicorn');
        expect(engine.canEnter(s.G, s.id('basic_unicorn_0'), '0')).toEqual({ ok: true });
    });

    it('begin of turn: draws without a further question when used', () => {
        const s = scenario(2).stable('0', 'extreme_adventurer_unicorn').deck('yay').start('0', 'bot');
        expect(s.free('0').bot).toEqual([0]);
        s.useBot('0', 'extreme_adventurer_unicorn');
        expect(s.prompts()).toEqual([]);
        expect(s.handOf('0')).toEqual(['yay']);
        // the turn draw is still due
        expect(s.free('0')).toMatchObject({ bot: [], drawForTurn: true });
        s.drawForTurn('0');
        expect(s.handOf('0')).toHaveLength(2);
    });

    it('begin of turn: forfeited by drawing for the turn', () => {
        const s = scenario(2).stable('0', 'extreme_adventurer_unicorn').start('0', 'bot');
        s.drawForTurn('0');
        expect(s.handOf('0')).toHaveLength(1);
        expect(s.free('0').bot).toEqual([]);
    });
});

// ─── Sacrificed or destroyed ──────────────────────────────────────────────────

describe('Bungee Jumping Unicorn — if sacrificed or destroyed: may SACRIFICE a Downgrade card OR return this card to your hand', () => {
    it('the card is already in the discard pile when the choice is made; it returns to its owner\'s hand', () => {
        const s = scenario(2).stable('0', 'bungee_jumping_unicorn', 'barbed_wire').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'bungee_jumping_unicorn');
        expect(s.zone('bungee_jumping_unicorn')).toEqual({ zone: 'discard' });
        const prompt = s.prompt('0');
        expect(prompt).toMatchObject({ kind: 'chooseMode', optional: true });
        expect(prompt.candidates).toEqual([
            { mode: 0, label: 'SACRIFICE a Downgrade card' },
            { mode: 1, label: 'Return this card to your hand' },
        ]);
        s.mode('0', 'return');
        expect(s.zone('bungee_jumping_unicorn')).toEqual({ zone: 'hand', player: '0' });
        expect(s.discardPile()).toEqual(['unicorn_poison']);
        expect(s.stableOf('0')).toEqual(['barbed_wire']);
    });

    it('sacrifices a Downgrade card instead; the card stays in the discard pile', () => {
        const s = scenario(2).stable('0', 'bungee_jumping_unicorn', 'barbed_wire', 'yay').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'bungee_jumping_unicorn');
        s.mode('0', 'sacrifice');
        expect(s.candidates('0')).toEqual(['barbed_wire']);
        s.pick('0', 'barbed_wire');
        expect(s.stableOf('0')).toEqual(['yay']);
        expect(s.discardPile()).toEqual(['bungee_jumping_unicorn', 'barbed_wire', 'unicorn_poison']);
    });

    it('can be declined', () => {
        const s = scenario(2).stable('0', 'bungee_jumping_unicorn').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'bungee_jumping_unicorn').skip('0');
        expect(s.zone('bungee_jumping_unicorn')).toEqual({ zone: 'discard' });
        expect(s.prompts()).toEqual([]);
    });

    it('without a Downgrade only "return to hand" is offered', () => {
        const s = scenario(2).stable('0', 'bungee_jumping_unicorn', 'basic_unicorn_0').stable('1', 'yay').hand('0', 'two_for_one').start();
        // sacrificed by its own player
        s.play('0', 'two_for_one').pick('0', 'bungee_jumping_unicorn');
        const prompt = s.prompt('0');
        expect(prompt.kind).toBe('chooseMode');
        expect(engine.candidateModes(prompt)).toEqual([1]);
        expect(prompt.disabled).toEqual([{ candidate: { mode: 0, label: 'SACRIFICE a Downgrade card' }, reason: { rule: 'notPossible' } }]);
        s.mode('0', 1);
        expect(s.zone('bungee_jumping_unicorn')).toEqual({ zone: 'hand', player: '0' });
        // Two-For-One goes on with its destroys
        expect(s.prompt('0')).toMatchObject({ verb: 'destroy' });
    });

    it('a Bungee Jumping Unicorn that is returned to hand does not trigger', () => {
        const s = scenario(2).stable('1', 'bungee_jumping_unicorn').hand('0', 'back_kick').hand('1', 'neigh').start();
        s.play('0', 'back_kick').pick('0', 'bungee_jumping_unicorn');
        expect(s.zone('bungee_jumping_unicorn')).toEqual({ zone: 'hand', player: '1' });
        expect(s.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['1:discard']);
    });
});

describe('Fearless Unicorn — if sacrificed or destroyed: may add an Instant card from the discard pile to your hand', () => {
    it('offers every Instant card of the discard pile, not only Neighs', () => {
        const s = scenario(2).stable('0', 'fearless_unicorn').discard('neigh', 'unicorn_poison', 'super_neigh', 'basic_unicorn_0').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'fearless_unicorn');
        expect(s.prompt('0')).toMatchObject({ kind: 'chooseCards', verb: 'add', optional: true, min: 1, max: 1 });
        expect(s.candidates('0')).toEqual(['neigh', 'super_neigh']);
        s.pick('0', 'super_neigh');
        expect(s.handOf('0')).toEqual(['super_neigh']);
        expect(s.zone('fearless_unicorn')).toEqual({ zone: 'discard' });
    });

    it('can be declined', () => {
        const s = scenario(2).stable('0', 'fearless_unicorn').discard('neigh').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'fearless_unicorn').skip('0');
        expect(s.handOf('0')).toEqual([]);
        expect(s.logVerbs('declined')).toEqual(['add']);
    });

    it('asks nothing when the discard pile holds no Instant card', () => {
        const s = scenario(2).stable('0', 'fearless_unicorn').discard('yay').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'fearless_unicorn');
        expect(s.prompts()).toEqual([]);
        expect(s.logVerbs('fizzled')).toEqual(['add']);
    });
});

describe('First Mer-Mate Unicorn — if sacrificed or destroyed: may DRAW 2 cards OR bring a Basic Unicorn card from your hand into your Stable', () => {
    it('draws 2 cards', () => {
        const s = scenario(2).stable('0', 'first_mer_mate_unicorn').deck('neigh', 'yay').hand('0', 'basic_unicorn_0').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'first_mer_mate_unicorn');
        const prompt = s.prompt('0');
        expect(prompt).toMatchObject({ kind: 'chooseMode', optional: true });
        expect(prompt.candidates).toEqual([
            { mode: 0, label: 'DRAW 2 cards' },
            { mode: 1, label: 'Bring a Basic Unicorn card from your hand into your Stable' },
        ]);
        s.mode('0', 'draw');
        expect(s.handOf('0')).toEqual(['basic_unicorn_0', 'neigh', 'yay']);
    });

    it('brings a Basic Unicorn from hand', () => {
        const s = scenario(2).stable('0', 'first_mer_mate_unicorn').hand('0', 'basic_unicorn_0', 'rhinocorn').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'first_mer_mate_unicorn');
        s.mode('0', 'bring');
        expect(s.candidates('0')).toEqual(['basic_unicorn_0']);
        s.pick('0', 'basic_unicorn_0');
        expect(s.stableOf('0')).toEqual(['basic_unicorn_0']);
        expect(s.handOf('0')).toEqual(['rhinocorn']);
    });

    it('without a Basic Unicorn in hand only the draw is offered', () => {
        const s = scenario(2).stable('0', 'first_mer_mate_unicorn').hand('0', 'rhinocorn').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'first_mer_mate_unicorn');
        expect(engine.candidateModes(s.prompt('0'))).toEqual([0]);
    });

    it('can be declined', () => {
        const s = scenario(2).stable('0', 'first_mer_mate_unicorn').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'first_mer_mate_unicorn').skip('0');
        expect(s.handOf('0')).toEqual([]);
        expect(s.prompts()).toEqual([]);
    });
});

// ─── When this card enters ────────────────────────────────────────────────────

describe('Cutthroat Captain Unicorn — may STEAL a Baby Unicorn card OR bring a Basic Unicorn card from the discard pile into your Stable', () => {
    it('steals a Baby Unicorn', () => {
        const s = scenario(2).stable('0', 'baby_unicorn_0').stable('1', 'baby_unicorn_1', 'basic_unicorn_0').discard('basic_unicorn_2').hand('0', 'cutthroat_captain_unicorn').start();
        s.play('0', 'cutthroat_captain_unicorn');
        const prompt = s.prompt('0');
        expect(prompt).toMatchObject({ kind: 'chooseMode', optional: true });
        expect(prompt.candidates).toEqual([
            { mode: 0, label: 'STEAL a Baby Unicorn card' },
            { mode: 1, label: 'Bring a Basic Unicorn card from the discard pile into your Stable' },
        ]);
        s.mode('0', 'steal');
        expect(s.candidates('0')).toEqual(['baby_unicorn_1']);
        s.pick('0', 'baby_unicorn_1');
        expect(s.stableOf('0')).toEqual(['baby_unicorn_0', 'cutthroat_captain_unicorn', 'baby_unicorn_1']);
        expect(s.stableOf('1')).toEqual(['basic_unicorn_0']);
    });

    it('brings a Basic Unicorn from the discard pile', () => {
        const s = scenario(2).discard('basic_unicorn_2', 'rhinocorn').hand('0', 'cutthroat_captain_unicorn').start();
        s.play('0', 'cutthroat_captain_unicorn');
        expect(engine.candidateModes(s.prompt('0'))).toEqual([1]);
        s.mode('0', 'bring');
        expect(s.candidates('0')).toEqual(['basic_unicorn_2']);
        s.pick('0', 'basic_unicorn_2');
        expect(s.stableOf('0')).toEqual(['cutthroat_captain_unicorn', 'basic_unicorn_2']);
        expect(s.discardPile()).toEqual(['rhinocorn']);
    });

    it('can be declined', () => {
        const s = scenario(2).stable('1', 'baby_unicorn_1').hand('0', 'cutthroat_captain_unicorn').start();
        s.play('0', 'cutthroat_captain_unicorn').skip('0');
        expect(s.stableOf('1')).toEqual(['baby_unicorn_1']);
        expect(s.prompts()).toEqual([]);
    });

    it('asks nothing when neither mode is possible', () => {
        const s = scenario(2).stable('0', 'baby_unicorn_0').discard('rhinocorn').hand('0', 'cutthroat_captain_unicorn').start();
        s.play('0', 'cutthroat_captain_unicorn');
        expect(s.prompts()).toEqual([]);
        expect(s.logVerbs('fizzled')).toEqual(['choose']);
    });

    it('Queen Bee Unicorn in another stable blocks the bring mode', () => {
        const s = scenario(2).stable('1', 'queen_bee_unicorn', 'baby_unicorn_1').discard('basic_unicorn_2').hand('0', 'cutthroat_captain_unicorn').start();
        s.play('0', 'cutthroat_captain_unicorn');
        expect(engine.candidateModes(s.prompt('0'))).toEqual([0]);
    });

    it('Extreme Adventurer Unicorn in its own stable blocks the bring mode', () => {
        const s = scenario(2).stable('0', 'extreme_adventurer_unicorn').discard('basic_unicorn_2').hand('0', 'cutthroat_captain_unicorn').start();
        s.play('0', 'cutthroat_captain_unicorn');
        expect(s.prompts()).toEqual([]);
        expect(s.zone('basic_unicorn_2')).toEqual({ zone: 'discard' });
    });
});

describe('Fisherman Unicorn — may look at another player\'s hand and take a card', () => {
    it('chooses a player, sees that hand privately and takes one card', () => {
        const s = scenario(3).hand('0', 'fisherman_unicorn').hand('1', 'neigh', 'yay').start();
        s.play('0', 'fisherman_unicorn');
        const choose = s.prompt('0');
        expect(choose).toMatchObject({ kind: 'choosePlayers', verb: 'take', optional: true });
        // players with an empty hand are not offered
        expect(engine.candidatePlayers(choose)).toEqual(['1']);
        s.pickPlayer('0', '1');
        const take = s.prompt('0');
        expect(take).toMatchObject({ kind: 'chooseCards', verb: 'take', optional: false, min: 1, max: 1 });
        expect(s.candidates('0')).toEqual(['neigh', 'yay']);
        expect(take.privateCards).toEqual([s.id('neigh'), s.id('yay')]);
        s.pick('0', 'yay');
        expect(s.handOf('0')).toEqual(['yay']);
        expect(s.handOf('1')).toEqual(['neigh']);
        const entry = s.G.log.find(e => e.verb === 'take')!;
        expect(entry.visibility).toEqual(['0', '1']);
        expect(entry.publicText).toBe('count-only');
    });

    it('can be declined', () => {
        const s = scenario(2).hand('0', 'fisherman_unicorn').hand('1', 'neigh').start();
        s.play('0', 'fisherman_unicorn').skip('0');
        expect(s.handOf('1')).toEqual(['neigh']);
        expect(s.logVerbs('declined')).toEqual(['take']);
    });

    it('asks nothing when every other hand is empty', () => {
        const s = scenario(2).hand('0', 'fisherman_unicorn').start();
        s.play('0', 'fisherman_unicorn');
        expect(s.prompts()).toEqual([]);
    });
});

describe('Hornswoggler Unicorn — may DISCARD your hand, then DRAW 3 cards OR trade hands with another player', () => {
    it('discards the whole hand, then draws 3', () => {
        const s = scenario(2).deck('rhinocorn', 'yay', 'slowdown').hand('0', 'hornswoggler_unicorn', 'neigh', 'neigh').hand('1', 'basic_unicorn_0').start();
        s.play('0', 'hornswoggler_unicorn');
        const prompt = s.prompt('0');
        expect(prompt).toMatchObject({ kind: 'chooseMode', optional: true });
        expect(prompt.candidates).toEqual([
            { mode: 0, label: 'DISCARD your hand, then DRAW 3 cards' },
            { mode: 1, label: 'Trade hands with another player' },
        ]);
        s.mode('0', 'discard');
        // no choice: all cards go
        expect(s.prompts()).toEqual([]);
        expect(s.discardPile()).toEqual(['neigh', 'neigh']);
        expect(s.handOf('0')).toEqual(['rhinocorn', 'yay', 'slowdown']);
    });

    it('with an empty hand it still draws 3', () => {
        const s = scenario(2).deck('rhinocorn', 'yay', 'slowdown').hand('0', 'hornswoggler_unicorn').start();
        s.play('0', 'hornswoggler_unicorn').mode('0', 'discard');
        expect(s.handOf('0')).toEqual(['rhinocorn', 'yay', 'slowdown']);
    });

    it('trades hands with a chosen player', () => {
        const s = scenario(3).hand('0', 'hornswoggler_unicorn', 'neigh').hand('1', 'yay').hand('2', 'slowdown', 'rhinocorn').start();
        s.play('0', 'hornswoggler_unicorn').mode('0', 'trade');
        const prompt = s.prompt('0');
        expect(prompt).toMatchObject({ kind: 'choosePlayers', verb: 'trade', optional: false });
        expect(engine.candidatePlayers(prompt)).toEqual(['1', '2']);
        s.pickPlayer('0', '2');
        expect(s.handOf('0')).toEqual(['slowdown', 'rhinocorn']);
        expect(s.handOf('2')).toEqual(['neigh']);
        expect(s.handOf('1')).toEqual(['yay']);
        expect(invariantViolations(s.G)).toEqual([]);
    });

    it('can be declined', () => {
        const s = scenario(2).hand('0', 'hornswoggler_unicorn', 'neigh').start();
        s.play('0', 'hornswoggler_unicorn').skip('0');
        expect(s.handOf('0')).toEqual(['neigh']);
        expect(s.prompts()).toEqual([]);
    });
});

describe('Pillaging Pirate Unicorn — may STEAL an Upgrade card OR move a Downgrade card in your Stable to another player\'s Stable', () => {
    it('steals an Upgrade card, never a Downgrade', () => {
        const s = scenario(2).stable('1', 'yay', 'barbed_wire').hand('0', 'pillaging_pirate_unicorn').start();
        s.play('0', 'pillaging_pirate_unicorn');
        const prompt = s.prompt('0');
        expect(prompt).toMatchObject({ kind: 'chooseMode', optional: true });
        expect(engine.candidateModes(prompt)).toEqual([0]);
        s.mode('0', 'steal');
        expect(s.candidates('0')).toEqual(['yay']);
        s.pick('0', 'yay');
        expect(s.stableOf('0')).toEqual(['pillaging_pirate_unicorn', 'yay']);
        expect(s.stableOf('1')).toEqual(['barbed_wire']);
    });

    it('moves a Downgrade card from your own stable to a chosen other stable', () => {
        const s = scenario(3).stable('0', 'pandamonium', 'yay').stable('1', 'slowdown').hand('0', 'pillaging_pirate_unicorn').start();
        s.play('0', 'pillaging_pirate_unicorn');
        expect(s.prompt('0').candidates).toEqual([
            { mode: 1, label: 'Move a Downgrade card in your Stable to another player\'s Stable' },
        ]);
        expect(s.prompt('0').disabled).toEqual([{ candidate: { mode: 0, label: 'STEAL an Upgrade card' }, reason: { rule: 'notPossible' } }]);
        s.mode('0', 'move');
        expect(s.prompt('0')).toMatchObject({ kind: 'chooseCards', verb: 'move', optional: false });
        // only Downgrades of its own stable
        expect(s.candidates('0')).toEqual(['pandamonium']);
        s.pick('0', 'pandamonium');
        const dest = s.prompt('0');
        expect(dest).toMatchObject({ kind: 'chooseStable', verb: 'move', optional: false });
        expect(engine.candidatePlayers(dest)).toEqual(['1', '2']);
        s.pickPlayer('0', '2');
        expect(s.stableOf('0')).toEqual(['yay', 'pillaging_pirate_unicorn']);
        expect(s.stableOf('2')).toEqual(['pandamonium']);
    });

    it('a Downgrade in another player\'s stable cannot be moved', () => {
        const s = scenario(3).stable('1', 'barbed_wire').hand('0', 'pillaging_pirate_unicorn').start();
        s.play('0', 'pillaging_pirate_unicorn');
        expect(s.prompts()).toEqual([]);
        expect(s.stableOf('1')).toEqual(['barbed_wire']);
    });

    it('can be declined', () => {
        const s = scenario(2).stable('0', 'barbed_wire').stable('1', 'yay').hand('0', 'pillaging_pirate_unicorn').start();
        s.play('0', 'pillaging_pirate_unicorn').skip('0');
        expect(s.stableOf('0')).toEqual(['barbed_wire', 'pillaging_pirate_unicorn']);
        expect(s.stableOf('1')).toEqual(['yay']);
    });
});

describe('Salty Seadogicorn — may make each other player DISCARD a card OR DRAW a card', () => {
    it('each other player discards, all at the same time', () => {
        const s = scenario(3).hand('0', 'salty_seadogicorn', 'neigh').hand('1', 'yay', 'slowdown').hand('2', 'rhinocorn').start();
        s.play('0', 'salty_seadogicorn');
        const prompt = s.prompt('0');
        expect(prompt).toMatchObject({ kind: 'chooseMode', optional: true });
        expect(prompt.candidates).toEqual([
            { mode: 0, label: 'Each other player must DISCARD a card' },
            { mode: 1, label: 'DRAW a card' },
        ]);
        s.mode('0', 'discard');
        expect(s.prompts().map(p => `${p.player}:${p.verb}:${p.optional}`)).toEqual(['1:discard:false', '2:discard:false']);
        s.pick('2', 'rhinocorn');
        s.pick('1', 'slowdown');
        expect(s.prompts()).toEqual([]);
        expect(s.handOf('0')).toEqual(['neigh']);
        expect(s.discardPile()).toEqual(['rhinocorn', 'slowdown']);
    });

    it('a player with an empty hand is not asked', () => {
        const s = scenario(3).hand('0', 'salty_seadogicorn').hand('2', 'rhinocorn').start();
        s.play('0', 'salty_seadogicorn').mode('0', 'discard');
        expect(s.prompts().map(p => `${p.player}:${p.verb}`)).toEqual(['2:discard']);
    });

    it('draws a card', () => {
        const s = scenario(2).deck('yay').hand('0', 'salty_seadogicorn').hand('1', 'neigh').start();
        s.play('0', 'salty_seadogicorn').mode('0', 'draw');
        expect(s.handOf('0')).toEqual(['yay']);
        expect(s.handOf('1')).toEqual(['neigh']);
    });

    it('when no other player has a card, only the draw is offered', () => {
        const s = scenario(2).hand('0', 'salty_seadogicorn').start();
        s.play('0', 'salty_seadogicorn');
        expect(engine.candidateModes(s.prompt('0'))).toEqual([1]);
    });

    it('can be declined', () => {
        const s = scenario(2).hand('0', 'salty_seadogicorn').hand('1', 'neigh').start();
        s.play('0', 'salty_seadogicorn').skip('0');
        expect(s.handOf('0')).toEqual([]);
        expect(s.handOf('1')).toEqual(['neigh']);
    });
});

describe('Stowaway Unicorn — may DRAW a card and reveal it; a Unicorn, Upgrade or Downgrade card is brought into your Stable', () => {
    it('asks first, because the draw is hidden information', () => {
        const s = scenario(2).deck('rhinocorn').hand('0', 'stowaway_unicorn').start();
        s.play('0', 'stowaway_unicorn');
        expect(s.prompt('0')).toMatchObject({ kind: 'confirm', verb: 'draw', optional: true });
    });

    it('a drawn Unicorn card enters the stable; the draw is public', () => {
        const s = scenario(2).deck('rhinocorn').hand('0', 'stowaway_unicorn').start();
        s.play('0', 'stowaway_unicorn').yes('0');
        expect(s.stableOf('0')).toEqual(['stowaway_unicorn', 'rhinocorn']);
        expect(s.handOf('0')).toEqual([]);
        const draw = s.G.log.find(e => e.verb === 'draw')!;
        expect(draw.visibility).toBe('public');
        expect(s.logVerbs('done')).toContain('bring');
    });

    it('a drawn Upgrade or Downgrade card enters the stable', () => {
        const s = scenario(2).deck('yay').hand('0', 'stowaway_unicorn').start();
        s.play('0', 'stowaway_unicorn').yes('0');
        expect(s.stableOf('0')).toEqual(['stowaway_unicorn', 'yay']);

        const t = scenario(2).deck('slowdown').hand('0', 'stowaway_unicorn').start();
        t.play('0', 'stowaway_unicorn').yes('0');
        expect(t.stableOf('0')).toEqual(['stowaway_unicorn', 'slowdown']);
    });

    it('any other card stays in the hand', () => {
        const s = scenario(2).deck('unicorn_poison').hand('0', 'stowaway_unicorn').start();
        s.play('0', 'stowaway_unicorn').yes('0');
        expect(s.stableOf('0')).toEqual(['stowaway_unicorn']);
        expect(s.handOf('0')).toEqual(['unicorn_poison']);

        const t = scenario(2).deck('neigh').hand('0', 'stowaway_unicorn').start();
        t.play('0', 'stowaway_unicorn').yes('0');
        expect(t.handOf('0')).toEqual(['neigh']);
    });

    it('the brought unicorn\'s enter ability triggers', () => {
        const s = scenario(2).deck('alluring_narwhal').stable('1', 'yay').hand('0', 'stowaway_unicorn').start();
        s.play('0', 'stowaway_unicorn').yes('0');
        expect(s.prompt('0')).toMatchObject({ verb: 'steal' });
    });

    it('a drawn Basic Unicorn stays in the hand if it cannot enter (Extreme Adventurer Unicorn)', () => {
        const s = scenario(2).stable('0', 'extreme_adventurer_unicorn').deck('basic_unicorn_0').hand('0', 'stowaway_unicorn').start();
        s.play('0', 'stowaway_unicorn').yes('0');
        expect(s.handOf('0')).toEqual(['basic_unicorn_0']);
        expect(s.stableOf('0')).toEqual(['extreme_adventurer_unicorn', 'stowaway_unicorn']);
    });

    it('can be declined', () => {
        const s = scenario(2).deck('rhinocorn').hand('0', 'stowaway_unicorn').start();
        s.play('0', 'stowaway_unicorn').skip('0');
        expect(s.handOf('0')).toEqual([]);
        expect(s.deckCards()[0]).toBe('rhinocorn');
    });
});
