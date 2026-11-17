import * as engine from '../engine';
import { scenario, invariantViolations } from '../testing/scenario';

// One scenario per ability of the Magical Unicorns of the base set (legacy preset unless stated).

describe('Alluring Narwhal — may STEAL an Upgrade card', () => {
    it('offers only Upgrade cards of other players, with a Skip', () => {
        const s = scenario(2).stable('0', 'rainbow_aura').stable('1', 'yay', 'barbed_wire', 'basic_unicorn_0').hand('0', 'alluring_narwhal').start();
        s.play('0', 'alluring_narwhal');
        expect(s.prompt('0')).toMatchObject({ kind: 'chooseCards', verb: 'steal', optional: true, min: 1, max: 1 });
        expect(s.candidates('0')).toEqual(['yay']);
        s.pick('0', 'yay');
        expect(s.stableOf('0')).toEqual(['rainbow_aura', 'alluring_narwhal', 'yay']);
        expect(s.prompts()).toEqual([]);
    });

    it('can be declined', () => {
        const s = scenario(2).stable('1', 'yay').hand('0', 'alluring_narwhal').start();
        s.play('0', 'alluring_narwhal').skip('0');
        expect(s.stableOf('1')).toEqual(['yay']);
        expect(s.logVerbs('declined')).toEqual(['steal']);
    });

    it('asks nothing when there is no Upgrade to steal', () => {
        const s = scenario(2).stable('1', 'barbed_wire').hand('0', 'alluring_narwhal').start();
        s.play('0', 'alluring_narwhal');
        expect(s.prompts()).toEqual([]);
        expect(s.logVerbs('fizzled')).toEqual(['steal']);
        expect(s.free('0').endTurn).toBe(true);
    });
});

describe('Americorn — may pull a card at random from another player\'s hand', () => {
    it('the player chooses whom to pull from; players with an empty hand are not offered', () => {
        const s = scenario(3).hand('0', 'americorn').hand('1', 'neigh', 'yay').start();
        s.play('0', 'americorn');
        const prompt = s.prompt('0');
        expect(prompt).toMatchObject({ kind: 'choosePlayers', verb: 'pull', optional: true });
        expect(engine.candidatePlayers(prompt)).toEqual(['1']);
        s.pickPlayer('0', '1');
        expect(s.handOf('0')).toEqual(['neigh']);
        expect(s.handOf('1')).toEqual(['yay']);
    });

    it('the pulled card is only visible to the two players involved', () => {
        const s = scenario(3).hand('0', 'americorn').hand('1', 'yay').start();
        s.play('0', 'americorn').pickPlayer('0', '1');
        const entry = s.G.log.find(e => e.verb === 'pull')!;
        expect(entry.visibility).toEqual(['0', '1']);
        expect(entry.publicText).toBe('count-only');
    });
});

describe('Annoying Flying Unicorn', () => {
    it('may force another player to DISCARD a card', () => {
        const s = scenario(3).hand('0', 'annoying_flying_unicorn').hand('1', 'neigh', 'yay').start();
        s.play('0', 'annoying_flying_unicorn');
        expect(engine.candidatePlayers(s.prompt('0'))).toEqual(['1']);
        s.pickPlayer('0', '1');
        expect(s.prompt('1')).toMatchObject({ kind: 'chooseCards', verb: 'discard', optional: false, min: 1, max: 1 });
        s.pick('1', 'yay');
        expect(s.handOf('1')).toEqual(['neigh']);
        expect(s.discardPile()).toEqual(['yay']);
    });

    it('returns to its owner\'s hand when it is destroyed', () => {
        const s = scenario(2).stable('0', 'annoying_flying_unicorn').hand('1', 'unicorn_poison').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'annoying_flying_unicorn');
        expect(s.zone('annoying_flying_unicorn')).toEqual({ zone: 'hand', player: '0' });
        expect(s.discardPile()).toEqual(['unicorn_poison']);
    });

    it('returns to its owner\'s hand when it is sacrificed', () => {
        const s = scenario(2).stable('0', 'annoying_flying_unicorn', 'basic_unicorn_0').stable('1', 'yay').hand('0', 'two_for_one').start();
        s.play('0', 'two_for_one').pick('0', 'annoying_flying_unicorn');
        expect(s.zone('annoying_flying_unicorn')).toEqual({ zone: 'hand', player: '0' });
    });
});

describe('Chainsaw Unicorn — may DESTROY an Upgrade card or SACRIFICE a Downgrade card', () => {
    it('offers both modes and a Skip', () => {
        const s = scenario(2).stable('0', 'slowdown').stable('1', 'yay').hand('0', 'chainsaw_unicorn').start();
        s.play('0', 'chainsaw_unicorn');
        const prompt = s.prompt('0');
        expect(prompt).toMatchObject({ kind: 'chooseMode', optional: true });
        expect(prompt.candidates).toEqual([
            { mode: 0, label: 'DESTROY an Upgrade card' },
            { mode: 1, label: 'SACRIFICE a Downgrade card' },
        ]);
        s.mode('0', 'destroy');
        expect(s.prompt('0')).toMatchObject({ kind: 'chooseCards', verb: 'destroy', optional: false });
        expect(s.candidates('0')).toEqual(['yay']);
        s.pick('0', 'yay');
        expect(s.discardPile()).toEqual(['yay']);
    });

    it('sacrifices a Downgrade card', () => {
        const s = scenario(2).stable('0', 'slowdown').stable('1', 'yay', 'barbed_wire').hand('0', 'chainsaw_unicorn').start();
        s.play('0', 'chainsaw_unicorn').mode('0', 'sacrifice');
        expect(s.candidates('0')).toEqual(['slowdown']);
        s.pick('0', 'slowdown');
        expect(s.discardPile()).toEqual(['slowdown']);
    });

    it('shows a mode that is impossible as disabled', () => {
        const s = scenario(2).stable('1', 'yay').hand('0', 'chainsaw_unicorn').start();
        s.play('0', 'chainsaw_unicorn');
        const prompt = s.prompt('0');
        expect(prompt.candidates).toHaveLength(1);
        expect(prompt.disabled).toEqual([{ candidate: { mode: 1, label: 'SACRIFICE a Downgrade card' }, reason: { rule: 'notPossible' } }]);
        expect(engine.respond(s.G, s.rng, '0', prompt.id, { mode: 1 })).toBe('mode is not available');
    });

    it('asks nothing when neither mode is possible', () => {
        const s = scenario(2).hand('0', 'chainsaw_unicorn').start();
        s.play('0', 'chainsaw_unicorn');
        expect(s.prompts()).toEqual([]);
    });
});

describe('Classy Narwhal / Shabby the Narwhal / The Great Narwhal — search the deck', () => {
    it('Classy Narwhal: asks first, then shows the Upgrade cards of the deck only to the searching player', () => {
        const s = scenario(2).deck('neigh', 'yay', 'slowdown', 'rainbow_aura').hand('0', 'classy_narwhal').start();
        s.play('0', 'classy_narwhal');
        expect(s.prompt('0')).toMatchObject({ kind: 'confirm', verb: 'search', optional: true });
        s.yes('0');
        const prompt = s.prompt('0');
        expect(prompt).toMatchObject({ kind: 'chooseCards', verb: 'search', optional: false });
        expect(s.candidates('0')).toEqual(['yay', 'rainbow_aura']);
        expect(prompt.privateCards).toEqual(engine.candidateCards(prompt));
        s.pick('0', 'rainbow_aura');
        expect(s.handOf('0')).toEqual(['rainbow_aura']);
        expect(s.deckCards()).not.toContain('rainbow_aura');
    });

    it('legacy R16: the found card is only visible to the searching player; standard: to everyone', () => {
        const legacy = scenario(2).deck('yay').hand('0', 'classy_narwhal').start();
        legacy.play('0', 'classy_narwhal').yes('0').pick('0', 'yay');
        expect(legacy.G.log.find(e => e.verb === 'search')!.visibility).toEqual(['0']);

        const standard = scenario(2, { revealSearch: true }).deck('yay').hand('0', 'classy_narwhal').start();
        standard.play('0', 'classy_narwhal').yes('0').pick('0', 'yay');
        expect(standard.G.log.find(e => e.verb === 'search')!.visibility).toBe('public');
    });

    it('can be declined', () => {
        const s = scenario(2).deck('yay').hand('0', 'classy_narwhal').start();
        s.play('0', 'classy_narwhal').skip('0');
        expect(s.handOf('0')).toEqual([]);
    });

    it('asks nothing when the deck holds no matching card', () => {
        const s = scenario(2).deck('neigh').hand('0', 'classy_narwhal').start();
        s.play('0', 'classy_narwhal');
        expect(s.prompts()).toEqual([]);
    });

    it('Shabby the Narwhal finds Downgrade cards', () => {
        const s = scenario(2).deck('yay', 'slowdown').hand('0', 'shabby_the_narwhal').start();
        s.play('0', 'shabby_the_narwhal').yes('0');
        expect(s.candidates('0')).toEqual(['slowdown']);
    });

    it('The Great Narwhal finds every card with Narwhal in its name (issue I7 fixed)', () => {
        const s = scenario(2).deck('narwhal', 'yay', 'classy_narwhal', 'narwhal_torpedo', 'basic_unicorn_0').hand('0', 'the_great_narwhal').start();
        s.play('0', 'the_great_narwhal').yes('0');
        expect(s.candidates('0')).toEqual(['narwhal', 'classy_narwhal', 'narwhal_torpedo']);
    });
});

describe('Dark Angel Unicorn — may SACRIFICE a Unicorn card, then bring a Unicorn card from the discard pile', () => {
    it('sacrifice, then revive', () => {
        const s = scenario(2).stable('0', 'basic_unicorn_0', 'yay').discard('basic_unicorn_1', 'neigh').hand('0', 'dark_angel_unicorn').start();
        s.play('0', 'dark_angel_unicorn');
        const cost = s.prompt('0');
        expect(cost).toMatchObject({ verb: 'sacrifice', optional: true, role: 'cost' });
        expect(cost.preview).toEqual(['then bring a Unicorn card from the discard pile into your Stable']);
        // The card that just entered is a legal sacrifice for its own ability.
        expect(s.candidates('0')).toEqual(['basic_unicorn_0', 'dark_angel_unicorn']);
        s.pick('0', 'basic_unicorn_0');
        const effect = s.prompt('0');
        expect(effect).toMatchObject({ verb: 'bring', optional: false, role: 'effect' });
        // It may revive the card it just sacrificed.
        expect(s.candidates('0')).toEqual(['basic_unicorn_1', 'basic_unicorn_0']);
        s.pick('0', 'basic_unicorn_1');
        expect(s.stableOf('0')).toEqual(['yay', 'dark_angel_unicorn', 'basic_unicorn_1']);
        expect(s.discardPile()).toEqual(['neigh', 'basic_unicorn_0']);
    });

    it('declining the sacrifice ends the ability', () => {
        const s = scenario(2).stable('0', 'basic_unicorn_0').discard('basic_unicorn_1').hand('0', 'dark_angel_unicorn').start();
        s.play('0', 'dark_angel_unicorn').skip('0');
        expect(s.prompts()).toEqual([]);
        expect(s.stableOf('0')).toEqual(['basic_unicorn_0', 'dark_angel_unicorn']);
    });
});

describe('Ginormous Unicorn — counts for 2 Unicorns; you cannot play Neigh cards', () => {
    it('its owner is not asked in a Neigh vote', () => {
        const s = scenario(2).stable('1', 'ginormous_unicorn').hand('0', 'basic_unicorn_0').hand('1', 'neigh').start();
        s.playOnly('0', 'basic_unicorn_0');
        expect(s.prompts()).toEqual([]);
    });

    it('counts as 2', () => {
        const s = scenario(2).stable('0', 'ginormous_unicorn', 'basic_unicorn_0').start();
        expect(engine.unicornCount(s.G, '0')).toBe(3);
    });
});

describe('Greedy Flying Unicorn — DRAW a card', () => {
    it('draws without asking', () => {
        const s = scenario(2).deck('neigh').hand('0', 'greedy_flying_unicorn').start();
        s.play('0', 'greedy_flying_unicorn');
        expect(s.prompts()).toEqual([]);
        expect(s.handOf('0')).toEqual(['neigh']);
        const entry = s.G.log.find(e => e.verb === 'draw')!;
        expect(entry).toMatchObject({ actor: '0', count: 1, visibility: ['0'], publicText: 'count-only' });
        expect(entry.source?.card).toBe(s.id('greedy_flying_unicorn'));
    });
});

describe('Llamacorn — each player (including you) must DISCARD a card', () => {
    it('all players are asked at the same time and may answer in any order', () => {
        const s = scenario(3).hand('0', 'llamacorn', 'neigh').hand('1', 'yay').hand('2', 'slowdown', 'neigh').start();
        s.play('0', 'llamacorn');
        expect(s.prompts().map(p => p.player)).toEqual(['0', '1', '2']);
        s.prompts().forEach(p => expect(p).toMatchObject({ verb: 'discard', optional: false, min: 1, max: 1 }));
        s.pick('2', 'slowdown');
        expect(s.prompts().map(p => p.player)).toEqual(['0', '1']);
        s.pick('0', 'neigh');
        s.pick('1', 'yay');
        expect(s.discardPile()).toEqual(['slowdown', 'neigh', 'yay']);
        expect(s.free('0').endTurn).toBe(true);
    });

    it('a player without cards is not asked', () => {
        const s = scenario(3).hand('0', 'llamacorn').hand('2', 'neigh').start();
        s.play('0', 'llamacorn');
        expect(s.prompts().map(p => p.player)).toEqual(['2']);
    });

    it('the turn cannot be ended while another player still has to discard', () => {
        const s = scenario(2).hand('0', 'llamacorn').hand('1', 'yay').start();
        s.play('0', 'llamacorn');
        expect(s.free('0').endTurn).toBe(false);
        expect(engine.endTurn(s.G, s.rng, '0')).toBe('busy');
    });
});

describe('Magical / Majestic / Swift Flying Unicorn — add a card from the discard pile to your hand', () => {
    it('Magical Flying Unicorn: a Magic card', () => {
        const s = scenario(2).discard('unicorn_poison', 'neigh', 'basic_unicorn_0').hand('0', 'magical_flying_unicorn').start();
        s.play('0', 'magical_flying_unicorn');
        expect(s.prompt('0')).toMatchObject({ kind: 'chooseCards', verb: 'add', optional: true });
        expect(s.candidates('0')).toEqual(['unicorn_poison']);
        s.pick('0', 'unicorn_poison');
        expect(s.handOf('0')).toEqual(['unicorn_poison']);
    });

    it('Majestic Flying Unicorn: a Unicorn card', () => {
        const s = scenario(2).discard('unicorn_poison', 'neigh', 'basic_unicorn_0', 'rhinocorn').hand('0', 'majestic_flying_unicorn').start();
        s.play('0', 'majestic_flying_unicorn');
        expect(s.candidates('0')).toEqual(['basic_unicorn_0', 'rhinocorn']);
    });

    it('Swift Flying Unicorn: a Neigh card (a card with Neigh in its name)', () => {
        const s = scenario(2).discard('unicorn_poison', 'neigh', 'super_neigh').hand('0', 'swift_flying_unicorn').start();
        s.play('0', 'swift_flying_unicorn');
        expect(s.candidates('0')).toEqual(['neigh', 'super_neigh']);
    });
});

describe('Magical Kittencorn — cannot be destroyed by Magic cards', () => {
    it('is not a legal target of Unicorn Poison and is shown as protected', () => {
        const s = scenario(2).stable('1', 'magical_kittencorn', 'basic_unicorn_0').hand('0', 'unicorn_poison').start();
        s.play('0', 'unicorn_poison');
        const prompt = s.prompt('0');
        expect(s.candidates('0')).toEqual(['basic_unicorn_0']);
        expect(prompt.disabled).toEqual([{
            candidate: { card: s.id('magical_kittencorn'), zone: 'stable', owner: '1' },
            reason: { rule: 'protected', card: s.id('magical_kittencorn') },
        }]);
    });

    it('Unicorn Poison does nothing when it is the only unicorn', () => {
        const s = scenario(2).stable('1', 'magical_kittencorn').hand('0', 'unicorn_poison').start();
        s.play('0', 'unicorn_poison');
        expect(s.prompts()).toEqual([]);
        expect(s.zone('unicorn_poison')).toEqual({ zone: 'discard' });
        expect(s.logVerbs('fizzled')).toEqual(['destroy']);
    });

    it('can be destroyed by a card that is not a Magic card', () => {
        const s = scenario(2).stable('0', 'rhinocorn').stable('1', 'magical_kittencorn').start('0', 'bot');
        s.useBot('0', 'rhinocorn');
        expect(s.candidates('0')).toContain('magical_kittencorn');
    });
});

describe('Mother Goose Unicorn — may bring a Baby Unicorn from the Nursery into your Stable', () => {
    it('brings a baby', () => {
        const s = scenario(2).nursery('baby_unicorn_0', 'baby_narwhal').hand('0', 'mother_goose_unicorn').start();
        s.play('0', 'mother_goose_unicorn');
        expect(s.prompt('0')).toMatchObject({ verb: 'bring', optional: true });
        expect(s.candidates('0')).toEqual(['baby_unicorn_0', 'baby_narwhal']);
        s.pick('0', 'baby_narwhal');
        expect(s.stableOf('0')).toEqual(['mother_goose_unicorn', 'baby_narwhal']);
        expect(s.defs(s.G.zones.nursery)).toEqual(['baby_unicorn_0']);
    });
});

describe('Mermaid Unicorn — return a card in another player\'s Stable to their hand', () => {
    it('legacy variant: optional; any card of another player', () => {
        const s = scenario(2).stable('0', 'yay').stable('1', 'basic_unicorn_0', 'slowdown').hand('0', 'mermaid_unicorn@legacy').start();
        s.play('0', 'mermaid_unicorn@legacy');
        expect(s.prompt('0')).toMatchObject({ verb: 'return', optional: true });
        expect(s.candidates('0')).toEqual(['basic_unicorn_0', 'slowdown']);
        s.pick('0', 'slowdown');
        expect(s.handOf('1')).toEqual(['slowdown']);
    });

    it('2nd Edition (R6): mandatory', () => {
        const s = scenario(2).stable('1', 'basic_unicorn_0').hand('0', 'mermaid_unicorn').start();
        s.play('0', 'mermaid_unicorn');
        expect(s.prompt('0')).toMatchObject({ verb: 'return', optional: false });
    });

    it('a Baby Unicorn goes to the Nursery instead', () => {
        const s = scenario(2).stable('1', 'baby_unicorn_0').hand('0', 'mermaid_unicorn').start();
        s.play('0', 'mermaid_unicorn').pick('0', 'baby_unicorn_0');
        expect(s.zone('baby_unicorn_0')).toEqual({ zone: 'nursery' });
        expect(s.handOf('1')).toEqual([]);
    });
});

describe('Narwhal Torpedo — SACRIFICE all Downgrade cards in your Stable', () => {
    it('sacrifices every Downgrade without asking and keeps everything else', () => {
        const s = scenario(2).stable('0', 'slowdown', 'yay', 'broken_stable', 'basic_unicorn_0').stable('1', 'tiny_stable').hand('0', 'narwhal_torpedo').start();
        s.play('0', 'narwhal_torpedo');
        expect(s.prompts()).toEqual([]);
        expect(s.stableOf('0')).toEqual(['yay', 'basic_unicorn_0', 'narwhal_torpedo']);
        expect(s.discardPile()).toEqual(['slowdown', 'broken_stable']);
        expect(s.stableOf('1')).toEqual(['tiny_stable']);
        expect(s.logVerbs().filter(v => v === 'sacrifice')).toHaveLength(2);
    });
});

describe('Necromancer Unicorn — may DISCARD 2 Unicorn cards, then bring a Unicorn card from the discard pile', () => {
    it('needs two Unicorn cards in hand', () => {
        const s = scenario(2).discard('rhinocorn').hand('0', 'necromancer_unicorn', 'basic_unicorn_0', 'neigh').start();
        s.play('0', 'necromancer_unicorn');
        expect(s.prompts()).toEqual([]);
    });

    it('discards two Unicorn cards, then revives one', () => {
        const s = scenario(2).discard('rhinocorn').hand('0', 'necromancer_unicorn', 'basic_unicorn_0', 'neigh', 'basic_unicorn_1').start();
        s.play('0', 'necromancer_unicorn');
        expect(s.prompt('0')).toMatchObject({ verb: 'discard', optional: true, min: 2, max: 2 });
        expect(s.candidates('0')).toEqual(['basic_unicorn_0', 'basic_unicorn_1']);
        s.pick('0', 'basic_unicorn_0', 'basic_unicorn_1');
        expect(s.candidates('0')).toEqual(['rhinocorn', 'basic_unicorn_0', 'basic_unicorn_1']);
        s.pick('0', 'rhinocorn');
        expect(s.stableOf('0')).toEqual(['necromancer_unicorn', 'rhinocorn']);
        expect(s.handOf('0')).toEqual(['neigh']);
    });
});

describe('Queen Bee Unicorn — Basic Unicorn cards cannot enter any player\'s Stable except yours', () => {
    it('other players cannot play Basic Unicorns; the owner can', () => {
        const s = scenario(2).stable('0', 'queen_bee_unicorn').hand('0', 'basic_unicorn_0').hand('1', 'basic_unicorn_1', 'rhinocorn').start('1');
        expect(s.tryPlay('1', 'basic_unicorn_1')).toBe('cannotEnter');
        expect(s.free('1').play.map(p => p.card)).toEqual([s.id('rhinocorn')]);
        s.drawForAction('1').endTurn('1').drawForTurn('0');
        s.play('0', 'basic_unicorn_0');
        expect(s.stableOf('0')).toEqual(['queen_bee_unicorn', 'basic_unicorn_0']);
    });

    it('a Basic Unicorn cannot be stolen or revived into another stable', () => {
        const s = scenario(2).stable('0', 'queen_bee_unicorn', 'basic_unicorn_0').discard('basic_unicorn_1').hand('1', 'kiss_of_life').start('1');
        expect(engine.canEnter(s.G, s.id('basic_unicorn_0'), '1')).toEqual({ ok: false, reason: { rule: 'cannotEnter', card: s.id('queen_bee_unicorn') } });
        s.play('1', 'kiss_of_life');
        expect(s.prompts()).toEqual([]);
        expect(s.zone('basic_unicorn_1')).toEqual({ zone: 'discard' });
    });

    it('the restriction ends when Queen Bee Unicorn leaves', () => {
        const s = scenario(2).stable('0', 'queen_bee_unicorn').hand('1', 'unicorn_poison', 'basic_unicorn_1').start('1');
        s.play('1', 'unicorn_poison').pick('1', 'queen_bee_unicorn');
        expect(engine.canEnter(s.G, s.id('basic_unicorn_1'), '1')).toEqual({ ok: true });
    });
});

describe('Rainbow Unicorn — may bring a Basic Unicorn card from your hand into your Stable', () => {
    it('brings a Basic Unicorn; this is not playing, so nobody can Neigh it', () => {
        const s = scenario(2).hand('0', 'rainbow_unicorn', 'basic_unicorn_0', 'rhinocorn').hand('1', 'neigh').start();
        s.play('0', 'rainbow_unicorn');
        expect(s.candidates('0')).toEqual(['basic_unicorn_0']);
        s.pick('0', 'basic_unicorn_0');
        expect(s.prompts()).toEqual([]);
        expect(s.stableOf('0')).toEqual(['rainbow_unicorn', 'basic_unicorn_0']);
    });
});

describe('Rhinocorn — begin of turn: may DESTROY a Unicorn card; if you do, immediately end your turn', () => {
    it('destroys and then only allows ending the turn', () => {
        const s = scenario(2).stable('0', 'rhinocorn').stable('1', 'basic_unicorn_0').hand('0', 'basic_unicorn_1').start('0', 'bot');
        expect(s.free('0')).toMatchObject({ bot: [0], drawForTurn: true });
        s.useBot('0', 'rhinocorn');
        expect(s.prompt('0')).toMatchObject({ verb: 'destroy', optional: true });
        s.pick('0', 'basic_unicorn_0');
        expect(s.discardPile()).toEqual(['basic_unicorn_0']);
        expect(s.G.turn.mustEnd).toBe(true);
        expect(s.free('0')).toMatchObject({ bot: [], drawForTurn: false, drawForAction: false, endTurn: true, play: [] });
        s.endTurn('0');
        expect(s.G.turn.player).toBe('1');
    });

    it('backing out leaves the ability available and the turn goes on normally', () => {
        const s = scenario(2).stable('0', 'rhinocorn').stable('1', 'basic_unicorn_0').start('0', 'bot');
        s.useBot('0', 'rhinocorn').skip('0');
        expect(s.G.turn.mustEnd).toBeUndefined();
        expect(s.free('0')).toMatchObject({ bot: [0], drawForTurn: true });
    });

    it('drawing for the turn forfeits the ability', () => {
        const s = scenario(2).stable('0', 'rhinocorn').stable('1', 'basic_unicorn_0').start('0', 'bot');
        s.drawForTurn('0');
        expect(s.free('0').bot).toEqual([]);
        expect(engine.useBotAbility(s.G, s.rng, '0', 0)).toBe('notUsable');
    });

    it('is not offered without a legal target', () => {
        const s = scenario(2).stable('0', 'rhinocorn').stable('1', 'yay').start('0', 'bot', 10);
        // legacy R11: its own stable is a legal target, so Rhinocorn itself can be picked
        expect(s.free('0').bot).toEqual([0]);
        const t = scenario(2, { destroyOwnStable: false }).stable('0', 'rhinocorn').stable('1', 'yay').start('0', 'bot');
        expect(t.free('0').bot).toEqual([]);
    });

    it('a card that arrives during the turn has no begin-of-turn ability this turn', () => {
        const s = scenario(2).hand('0', 'rhinocorn').stable('1', 'basic_unicorn_0').start();
        s.play('0', 'rhinocorn');
        expect(s.G.turn.bot).toEqual([]);
    });
});

describe('Seductive Unicorn — may DISCARD a card, then STEAL a Unicorn card', () => {
    it('discard, then steal', () => {
        const s = scenario(2).stable('1', 'basic_unicorn_0', 'yay').hand('0', 'seductive_unicorn', 'neigh').start();
        s.play('0', 'seductive_unicorn');
        expect(s.prompt('0')).toMatchObject({ verb: 'discard', optional: true });
        s.pick('0', 'neigh');
        expect(s.prompt('0')).toMatchObject({ verb: 'steal', optional: false });
        expect(s.candidates('0')).toEqual(['basic_unicorn_0']);
        s.pick('0', 'basic_unicorn_0');
        expect(s.stableOf('0')).toEqual(['seductive_unicorn', 'basic_unicorn_0']);
    });

    it('is not offered with an empty hand', () => {
        const s = scenario(2).stable('1', 'basic_unicorn_0').hand('0', 'seductive_unicorn').start();
        s.play('0', 'seductive_unicorn');
        expect(s.prompts()).toEqual([]);
    });

    it('the discard is lost if nothing can be stolen afterwards', () => {
        const s = scenario(2).hand('0', 'seductive_unicorn', 'neigh').start();
        s.play('0', 'seductive_unicorn').pick('0', 'neigh');
        expect(s.prompts()).toEqual([]);
        expect(s.logVerbs('fizzled')).toEqual(['steal']);
    });
});

describe('Unicorn on the Cob — DRAW 2 cards and DISCARD a card', () => {
    it('draws two, then asks for a discard', () => {
        const s = scenario(2).deck('neigh', 'yay').hand('0', 'unicorn_on_the_cob').start();
        s.play('0', 'unicorn_on_the_cob');
        expect(s.handOf('0')).toEqual(['neigh', 'yay']);
        expect(s.prompt('0')).toMatchObject({ verb: 'discard', optional: false, min: 1 });
        s.pick('0', 'neigh');
        expect(s.handOf('0')).toEqual(['yay']);
    });
});

describe('Zombie Unicorn — begin of turn: may DISCARD a card; if you do, bring a Unicorn card from the discard pile and end your turn', () => {
    it('legacy variant: any card may be discarded', () => {
        const s = scenario(2).stable('0', 'zombie_unicorn@legacy').discard('rhinocorn').hand('0', 'neigh', 'basic_unicorn_0').start('0', 'bot');
        s.useBot('0', 'zombie_unicorn@legacy');
        expect(s.candidates('0')).toEqual(['neigh', 'basic_unicorn_0']);
        s.pick('0', 'neigh');
        expect(s.candidates('0')).toEqual(['rhinocorn']);
        s.pick('0', 'rhinocorn');
        expect(s.stableOf('0')).toEqual(['zombie_unicorn@legacy', 'rhinocorn']);
        expect(s.free('0')).toMatchObject({ drawForTurn: false, endTurn: true });
    });

    it('2nd Edition (R17): only a Unicorn card may be discarded', () => {
        const s = scenario(2).stable('0', 'zombie_unicorn').discard('rhinocorn').hand('0', 'neigh', 'basic_unicorn_0').start('0', 'bot');
        s.useBot('0', 'zombie_unicorn');
        expect(s.candidates('0')).toEqual(['basic_unicorn_0']);
    });
});

describe('Baby Unicorns', () => {
    it('go to the Nursery when destroyed, sacrificed or returned', () => {
        const s = scenario(2).stable('0', 'baby_unicorn_0', 'baby_unicorn_1').stable('1', 'baby_unicorn_2').hand('0', 'two_for_one').start();
        s.play('0', 'two_for_one').pick('0', 'baby_unicorn_0');
        s.pick('0', 'baby_unicorn_2');
        s.pick('0', 'baby_unicorn_1');
        expect(s.defs(s.G.zones.nursery)).toEqual(['baby_unicorn_0', 'baby_unicorn_2', 'baby_unicorn_1']);
        expect(s.discardPile()).toEqual(['two_for_one']);
        expect(invariantViolations(s.G)).toEqual([]);
    });
});
