import * as engine from '../engine';
import { scenario, fixedRng, invariantViolations } from '../testing/scenario';

// Turn structure, playing cards, Neigh voting and the end of the game (legacy preset).

describe('setup', () => {
    it('deals 5 cards to every player, puts all babies in the Nursery and none in the deck', () => {
        const G = engine.createGame(fixedRng, 3);
        expect(G.players.map(p => p.id)).toEqual(['0', '1', '2']);
        G.players.forEach(p => expect(G.zones.hand[p.id]).toHaveLength(5));
        expect(G.zones.nursery).toHaveLength(13);
        expect(G.zones.nursery.every(c => engine.defOf(G, c).type === 'baby')).toBe(true);
        expect([...G.zones.deck, ...G.zones.hand['0']].some(c => engine.defOf(G, c).type === 'baby')).toBe(false);
        expect(G.cards).toHaveLength(117);
        expect(G.owner).toBe('0');
        expect(invariantViolations(G)).toEqual([]);
    });

    it('honours a custom owner and adds the Adventures cards (old set ids are accepted)', () => {
        const G = engine.createGame(fixedRng, 2, { ownerPlayerID: '1', sets: ['base_game', 'adventures_2nd_edition'] });
        expect(G.owner).toBe('1');
        expect(G.options.sets).toEqual(['base_2e', 'adventures_2e']);
        expect(G.zones.nursery).toHaveLength(17);
        expect(G.cards).toHaveLength(117 + 20);
    });

    it('always includes a base set', () => {
        const G = engine.createGame(fixedRng, 2, { sets: ['adventures_2e'] });
        expect(G.options.sets).toEqual(['base_2e', 'adventures_2e']);
    });

    it('uses the legacy variants of Mermaid Unicorn and Zombie Unicorn under the legacy preset', () => {
        const G = engine.createGame(fixedRng, 2);
        const defs = G.cards.map(c => c.def);
        expect(defs).toContain('mermaid_unicorn@legacy');
        expect(defs).toContain('zombie_unicorn@legacy');
        expect(defs).not.toContain('mermaid_unicorn');
    });

    it('startGame moves the chosen babies into the stables and starts the first turn', () => {
        const G = engine.createGame(fixedRng, 2);
        const [a, b] = G.zones.nursery;
        G.babyStarter = [{ cardID: a, owner: '0' }, { cardID: b, owner: '1' }];
        engine.startGame(G, fixedRng);
        expect(G.zones.stable['0']).toEqual([a]);
        expect(G.zones.stable['1']).toEqual([b]);
        expect(G.zones.nursery).toHaveLength(11);
        expect(G.turn).toMatchObject({ number: 1, player: '0', phase: 'bot' });
        expect(invariantViolations(G)).toEqual([]);
    });

    it('sandbox mode assigns babies and marks everybody ready', () => {
        const G = engine.createGame(fixedRng, 3, { sandbox: true });
        expect(G.babyStarter).toHaveLength(3);
        expect(Object.values(G.ready).every(Boolean)).toBe(true);
        expect(G.sandboxSettings).toEqual({ infiniteActions: true, skipNeigh: true });
    });
});

describe('turn structure', () => {
    it('begin of turn: the player draws for the turn and enters the Action phase', () => {
        const s = scenario(2).start('0', 'bot');
        expect(s.free('0')).toMatchObject({ drawForTurn: true, drawForAction: false, endTurn: false, play: [] });
        expect(s.free('1').drawForTurn).toBe(false);
        s.drawForTurn('0');
        expect(s.G.turn.phase).toBe('action');
        expect(s.handOf('0')).toHaveLength(1);
        expect(s.free('0')).toMatchObject({ drawForTurn: false, drawForAction: true, endTurn: false });
    });

    it('action phase: drawing a card uses up the action; the turn can then be ended', () => {
        const s = scenario(2).hand('0', 'basic_unicorn_0').start();
        s.drawForAction('0');
        expect(s.handOf('0')).toHaveLength(2);
        expect(s.free('0')).toMatchObject({ drawForAction: false, endTurn: true, play: [] });
        expect(s.tryPlay('0', 'basic_unicorn_0')).toBe('noPlaysLeft');
        s.endTurn('0');
        expect(s.G.turn).toMatchObject({ number: 2, player: '1', phase: 'bot' });
    });

    it('action phase: a played card uses up the action', () => {
        const s = scenario(2).hand('0', 'basic_unicorn_0', 'basic_unicorn_1').start();
        expect(s.free('0').endTurn).toBe(false);
        s.play('0', 'basic_unicorn_0');
        expect(s.stableOf('0')).toEqual(['basic_unicorn_0']);
        expect(s.free('0')).toMatchObject({ drawForAction: false, endTurn: true, play: [] });
    });

    it('only the active player may act, and only in the right phase', () => {
        const s = scenario(2).hand('0', 'basic_unicorn_0').hand('1', 'basic_unicorn_1').start('0', 'bot');
        expect(s.tryPlay('1', 'basic_unicorn_1')).toBe('notYourTurn');
        expect(s.tryPlay('0', 'basic_unicorn_0')).toBe('wrongPhase');
        expect(engine.drawForAction(s.G, s.rng, '0')).toBe('notAllowed');
        expect(engine.endTurn(s.G, s.rng, '0')).toBe('notAllowed');
        expect(engine.drawForTurn(s.G, s.rng, '1')).toBe('notYourTurn');
    });

    it('end of turn: a hand above 7 cards must be discarded down to 7 before the next turn starts', () => {
        const s = scenario(2).hand('0', ...Array(9).fill('basic_unicorn_0')).start();
        s.drawForAction('0');
        s.endTurn('0');
        expect(s.G.turn.phase).toBe('eot');
        const prompt = s.prompt('0');
        expect(prompt).toMatchObject({ kind: 'chooseCards', verb: 'discard', min: 3, max: 3, optional: false, rule: 'handLimit' });
        s.pick('0', 'basic_unicorn_0', 'basic_unicorn_0', 'basic_unicorn_0');
        expect(s.G.zones.hand['0']).toHaveLength(7);
        expect(s.G.turn).toMatchObject({ number: 2, player: '1' });
    });

    it('turn order wraps around', () => {
        const s = scenario(3).start('2');
        s.drawForAction('2').endTurn('2');
        expect(s.G.turn.player).toBe('0');
    });

    it('an empty deck is refilled from the discard pile at the start of a turn', () => {
        const s = scenario(2).discard('neigh', 'neigh').start('0', 'bot', 0);
        expect(s.G.zones.deck).toHaveLength(2);
        expect(s.G.zones.discard).toHaveLength(0);
        expect(s.logVerbs()).toContain('shuffle');
    });

    it('drawing for the turn reshuffles the discard pile when the deck runs out (issue I4 fixed)', () => {
        const s = scenario(2).deck('neigh').discard('yay').start('0', 'bot', 0);
        s.drawForTurn('0');
        expect(s.handOf('0')).toEqual(['neigh']);
        s.drawForAction('0');
        expect(s.handOf('0')).toEqual(['neigh', 'yay']);
    });

    it('R20: with deck and discard pile both empty the game ends; most unicorns wins, ties share', () => {
        const s = scenario(3).stable('0', 'basic_unicorn_0').stable('1', 'basic_unicorn_1').start('0', 'bot', 0);
        expect(s.G.gameOver).toMatchObject({ reason: 'deckOut', winners: ['0', '1'] });
    });
});

describe('winning', () => {
    it('a player with 7 unicorns wins', () => {
        const s = scenario(2).stable('0', ...Array(6).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        expect(s.G.gameOver).toBeUndefined();
        s.play('0', 'basic_unicorn_1');
        expect(s.G.gameOver).toMatchObject({ winner: '0', reason: 'unicorns' });
        expect(engine.endTurn(s.G, s.rng, '0')).toBe('gameOver');
    });

    it('Ginormous Unicorn counts as 2', () => {
        const s = scenario(2).stable('0', ...Array(5).fill('basic_unicorn_0')).hand('0', 'ginormous_unicorn').start();
        s.play('0', 'ginormous_unicorn');
        expect(engine.unicornCount(s.G, '0')).toBe(7);
        expect(s.G.gameOver).toMatchObject({ winner: '0' });
    });

    it('a player with Pandamonium cannot win', () => {
        const s = scenario(2).stable('0', 'pandamonium', ...Array(6).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        s.play('0', 'basic_unicorn_1');
        expect(s.G.gameOver).toBeUndefined();
        expect(engine.unicornCount(s.G, '0')).toBe(0);
    });

    it('legacy R7: the win is detected while an effect is still pending', () => {
        // 6 unicorns + Tiny Stable: the 7th unicorn wins although Tiny Stable asks for a sacrifice.
        const s = scenario(2).stable('0', 'tiny_stable', ...Array(6).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        s.play('0', 'basic_unicorn_1');
        expect(s.G.gameOver).toMatchObject({ winner: '0' });
    });

    it('standard R7: the win only counts once everything has resolved', () => {
        const s = scenario(2, { winCheck: 'whenResolved' })
            .stable('0', 'tiny_stable', ...Array(6).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        s.play('0', 'basic_unicorn_1');
        expect(s.G.gameOver).toBeUndefined();
        s.pick('0', 'basic_unicorn_1');
        expect(s.G.gameOver).toBeUndefined();
        expect(engine.unicornCount(s.G, '0')).toBe(6);
    });

    it('standard R2: 6 unicorns are enough with 6 or more players', () => {
        const s = scenario(6, { winThreshold: 'byPlayerCount' }).stable('0', ...Array(5).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        expect(engine.winThreshold(s.G)).toBe(6);
        s.play('0', 'basic_unicorn_1');
        expect(s.G.gameOver).toMatchObject({ winner: '0' });
    });
});

describe('playing cards', () => {
    it('an Upgrade can be played into any stable; a Unicorn only into your own (legacy R9)', () => {
        const s = scenario(2).hand('0', 'yay', 'basic_unicorn_0').start();
        const free = s.free('0');
        expect(free.play.find(p => p.card === s.id('yay'))!.targets).toEqual(['0', '1']);
        expect(free.play.find(p => p.card === s.id('basic_unicorn_0'))!.targets).toEqual(['0']);
        expect(s.tryPlay('0', 'basic_unicorn_0', '1')).toBe('notYourStable');
        s.play('0', 'yay', '1');
        expect(s.stableOf('1')).toEqual(['yay']);
    });

    it('standard R9: a Unicorn can be played into another stable', () => {
        const s = scenario(2, { playUnicornIntoAnyStable: true }).hand('0', 'basic_unicorn_0').start();
        s.play('0', 'basic_unicorn_0', '1');
        expect(s.stableOf('1')).toEqual(['basic_unicorn_0']);
    });

    it('Instant cards cannot be played as an action', () => {
        const s = scenario(2).hand('0', 'neigh').start();
        expect(s.tryPlay('0', 'neigh')).toBe('instant');
        expect(s.free('0').play).toEqual([]);
    });

    it('a Magic card resolves and goes to the discard pile', () => {
        const s = scenario(2).hand('0', 'good_deal').start();
        s.play('0', 'good_deal');
        expect(s.zone('good_deal')).toEqual({ zone: 'pile' });
        expect(s.handOf('0')).toHaveLength(3);
        s.pick('0', 'basic_unicorn_6');
        expect(s.zone('good_deal')).toEqual({ zone: 'discard' });
        expect(s.G.zones.pile).toEqual([]);
        expect(invariantViolations(s.G)).toEqual([]);
    });

    it('legacy R8: a stable with 7 unicorn cards accepts no further card', () => {
        const s = scenario(2).stable('0', 'pandamonium', ...Array(7).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1', 'yay').start();
        expect(s.tryPlay('0', 'basic_unicorn_1')).toBe('stableFull');
        expect(s.free('0').play.find(p => p.card === s.id('yay'))!.targets).toEqual(['1']);
    });

    it('standard R8: no stable limit', () => {
        const s = scenario(2, { stableLimit: null }).stable('0', 'pandamonium', ...Array(7).fill('basic_unicorn_0')).hand('0', 'basic_unicorn_1').start();
        expect(s.tryPlay('0', 'basic_unicorn_1')).toBeUndefined();
    });
});

describe('Neigh voting', () => {
    it('every other player is asked; when all pass the card resolves', () => {
        const s = scenario(3).hand('0', 'basic_unicorn_0').hand('1', 'neigh').start();
        s.playOnly('0', 'basic_unicorn_0');
        expect(s.zone('basic_unicorn_0')).toEqual({ zone: 'pile' });
        expect(s.prompts().map(p => p.player).sort()).toEqual(['1', '2']);
        expect(s.prompt('1')).toMatchObject({ kind: 'respond', optional: true });
        expect(s.candidates('1')).toEqual(['neigh']);
        expect(s.candidates('2')).toEqual([]);
        s.skip('1');
        expect(s.zone('basic_unicorn_0')).toEqual({ zone: 'pile' });
        s.skip('2');
        expect(s.zone('basic_unicorn_0')).toEqual({ zone: 'stable', player: '0' });
        expect(s.G.lastPlay).toMatchObject({ result: 'played' });
    });

    it('a Neigh stops the card; the action is still used up', () => {
        const s = scenario(2).hand('0', 'basic_unicorn_0', 'basic_unicorn_1').hand('1', 'neigh').start();
        s.playOnly('0', 'basic_unicorn_0');
        s.neigh('1');
        // The Neigh can be answered by everybody but the player who played it.
        expect(s.prompts().map(p => p.player)).toEqual(['0']);
        s.skip('0');
        expect(s.zone('basic_unicorn_0')).toEqual({ zone: 'discard' });
        expect(s.zone('neigh')).toEqual({ zone: 'discard' });
        expect(s.G.lastPlay).toMatchObject({ result: 'neighed' });
        expect(s.free('0')).toMatchObject({ endTurn: true, play: [] });
        expect(s.logVerbs('neighed')).toEqual(['play']);
    });

    it('a Neigh on a Neigh lets the card through; a third Neigh stops it again', () => {
        const s = scenario(2).hand('0', 'basic_unicorn_0', 'neigh').hand('1', 'neigh', 'neigh').start();
        s.playOnly('0', 'basic_unicorn_0');
        s.neigh('1');
        s.neigh('0');
        expect(s.prompts().map(p => p.player)).toEqual(['1']);
        s.skip('1');
        expect(s.zone('basic_unicorn_0')).toEqual({ zone: 'stable', player: '0' });

        const t = scenario(2).hand('0', 'basic_unicorn_0', 'neigh').hand('1', 'neigh', 'neigh').start();
        t.playOnly('0', 'basic_unicorn_0');
        t.neigh('1').neigh('0').neigh('1');
        t.skip('0');
        expect(t.zone('basic_unicorn_0')).toEqual({ zone: 'discard' });
        expect(t.discardPile().filter(d => d === 'neigh')).toHaveLength(3);
        expect(invariantViolations(t.G)).toEqual([]);
    });

    it('the first Neigh closes the round for everybody else', () => {
        const s = scenario(3).hand('0', 'basic_unicorn_0').hand('1', 'neigh').hand('2', 'neigh').start();
        s.playOnly('0', 'basic_unicorn_0');
        const stale = s.prompt('2').id;
        s.neigh('1');
        expect(engine.respond(s.G, s.rng, '2', stale, { cards: [s.G.zones.hand['2'][0]] })).toBe('unknownPrompt');
        expect(s.handOf('2')).toEqual(['neigh']);
    });

    it('legacy R3: a Super Neigh cannot be answered and ends the voting at once', () => {
        const s = scenario(2).hand('0', 'basic_unicorn_0', 'neigh').hand('1', 'super_neigh').start();
        s.playOnly('0', 'basic_unicorn_0');
        s.neigh('1', 'super_neigh');
        expect(s.prompts()).toEqual([]);
        expect(s.zone('basic_unicorn_0')).toEqual({ zone: 'discard' });
        expect(s.zone('super_neigh')).toEqual({ zone: 'discard' });
        expect(s.handOf('0')).toEqual(['neigh']);
    });

    it('a Super Neigh on a Neigh lets the original card through', () => {
        const s = scenario(2).hand('0', 'basic_unicorn_0', 'super_neigh').hand('1', 'neigh').start();
        s.playOnly('0', 'basic_unicorn_0');
        s.neigh('1');
        s.neigh('0', 'super_neigh');
        expect(s.zone('basic_unicorn_0')).toEqual({ zone: 'stable', player: '0' });
    });

    it('Yay: the owner\'s cards skip the voting; their Neighs can still be Neigh\'d (legacy R12)', () => {
        const s = scenario(2).stable('0', 'yay').hand('0', 'basic_unicorn_0', 'neigh').hand('1', 'neigh', 'basic_unicorn_1').start();
        s.playOnly('0', 'basic_unicorn_0');
        expect(s.prompts()).toEqual([]);
        expect(s.zone('basic_unicorn_0')).toEqual({ zone: 'stable', player: '0' });
        s.endTurn('0').drawForTurn('1');
        s.playOnly('1', 'basic_unicorn_1');
        s.neigh('0');
        expect(s.prompts().map(p => p.player)).toEqual(['1']);
        s.neigh('1');
        s.passAll();
        expect(s.zone('basic_unicorn_1')).toEqual({ zone: 'stable', player: '1' });
    });

    it('standard R12: Yay also protects the owner\'s Neigh', () => {
        const s = scenario(2, { yayCoversInstants: true }).stable('1', 'yay').hand('0', 'basic_unicorn_0', 'neigh').hand('1', 'neigh').start();
        s.playOnly('0', 'basic_unicorn_0');
        s.neigh('1');
        expect(s.prompts()).toEqual([]);
        expect(s.zone('basic_unicorn_0')).toEqual({ zone: 'discard' });
    });

    it('Slowdown and Ginormous Unicorn: the player is not asked', () => {
        const s = scenario(3).stable('1', 'slowdown').stable('2', 'ginormous_unicorn').hand('0', 'basic_unicorn_0').hand('1', 'neigh').start();
        s.playOnly('0', 'basic_unicorn_0');
        expect(s.prompts()).toEqual([]);
        expect(s.zone('basic_unicorn_0')).toEqual({ zone: 'stable', player: '0' });
    });

    it('sandbox skipNeigh: no voting', () => {
        const s = scenario(2).sandbox({ infiniteActions: true, skipNeigh: true }).hand('0', 'basic_unicorn_0', 'basic_unicorn_1').hand('1', 'neigh').start();
        s.playOnly('0', 'basic_unicorn_0');
        expect(s.stableOf('0')).toEqual(['basic_unicorn_0']);
        // infinite actions: play again, draw, end turn are all available
        expect(s.free('0')).toMatchObject({ drawForAction: true, endTurn: true });
        s.playOnly('0', 'basic_unicorn_1');
        expect(s.stableOf('0')).toEqual(['basic_unicorn_0', 'basic_unicorn_1']);
    });

    it('answers are validated', () => {
        const s = scenario(2).hand('0', 'basic_unicorn_0').hand('1', 'neigh', 'basic_unicorn_1').start();
        s.playOnly('0', 'basic_unicorn_0');
        const prompt = s.prompt('1');
        expect(engine.respond(s.G, s.rng, '0', prompt.id, { skip: true })).toBe('notYourPrompt');
        expect(engine.respond(s.G, s.rng, '1', prompt.id, { cards: [s.id('basic_unicorn_1')] })).toBe('card is not a legal choice');
        expect(engine.respond(s.G, s.rng, '1', 'nope', { skip: true })).toBe('unknownPrompt');
        expect(engine.respond(s.G, s.rng, '1', prompt.id, { mode: 0 })).toBe('a mode was not asked for');
    });
});
