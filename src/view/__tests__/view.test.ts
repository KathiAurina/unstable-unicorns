import { scenario } from '../../game/testing/scenario';
import type { Scenario } from '../../game/testing/scenario';
import * as engine from '../../game/engine';
import type { PlayerID } from '../../game/engine';
import {
    EMPTY_UI, cardMarks, clickCard, clickDeck, clickPlayer, deckAction, finderFor, getBoardModel, needsTarget,
    onlyEndTurnLeft, pass, playInstant, playerTargets, submitSelection,
} from '../model';
import type { Outcome, UiState } from '../model';
import { freeText, getPanels, infoText, waitingText } from '../describe';
import { describeLog, lineText } from '../log';
import { cardView, stableUnicorns, stableUpgrades } from '../cards';

// The device-independent view layer: what a player sees and what a click means. Both boards render
// from this, so these tests cover the interaction logic of desktop and mobile at once.

const model = (s: Scenario, player: PlayerID) => getBoardModel(s.G, player);
const marks = (s: Scenario, player: PlayerID, ui: UiState = EMPTY_UI) =>
    Object.fromEntries(Array.from(cardMarks(model(s, player), ui)).map(([card, mark]) => [s.G.cards[card].def, mark]));
const labels = (s: Scenario, player: PlayerID, ui: UiState = EMPTY_UI) =>
    getPanels(s.G, model(s, player), ui).map(p => p.buttons.map(b => b.label));

/** Sends an outcome to the engine the way the board does. */
function apply(s: Scenario, player: PlayerID, outcome: Outcome): void {
    if (!outcome || 'ui' in outcome) throw new Error(`not a move: ${JSON.stringify(outcome)}`);
    let error: string | undefined;
    switch (outcome.move) {
        case 'respond': error = engine.respond(s.G, s.rng, player, outcome.promptId, outcome.answer); break;
        case 'playCard': error = engine.playCard(s.G, s.rng, player, outcome.card, outcome.target); break;
        case 'useBotAbility': error = engine.useBotAbility(s.G, s.rng, player, outcome.index); break;
        case 'drawForTurn': error = engine.drawForTurn(s.G, s.rng, player); break;
        case 'drawForAction': error = engine.drawForAction(s.G, s.rng, player); break;
        case 'endTurn': error = engine.endTurn(s.G, s.rng, player); break;
    }
    if (error) throw new Error(`move rejected: ${error}`);
}

describe('cards', () => {
    it('a card view carries what the components show', () => {
        const s = scenario(2).stable('0', 'yay').start();
        expect(cardView(s.G, s.id('yay'))).toMatchObject({ id: s.id('yay'), def: 'yay', title: 'Yay', type: 'upgrade', image: 'yay' });
        expect(cardView(s.G, s.id('yay')).description.en.length).toBeGreaterThan(0);
    });

    it('a stable is split into Unicorn cards and Upgrade / Downgrade cards', () => {
        const s = scenario(2).stable('0', 'yay', 'basic_unicorn_0', 'barbed_wire', 'rhinocorn').start();
        expect(s.defs(stableUnicorns(s.G, '0'))).toEqual(['basic_unicorn_0', 'rhinocorn']);
        expect(s.defs(stableUpgrades(s.G, '0'))).toEqual(['yay', 'barbed_wire']);
    });
});

describe('beginning of the turn', () => {
    it('a usable begin-of-turn ability is offered next to drawing', () => {
        const s = scenario(2).stable('0', 'extreme_adventurer_unicorn').start('0', 'bot');
        const m = model(s, '0');
        expect(m.isMyTurn).toBe(true);
        expect(m.bot).toHaveLength(1);
        expect(marks(s, '0')).toEqual({ extreme_adventurer_unicorn: 'ability' });
        expect(deckAction(m)).toBe('drawForTurn');
        expect(labels(s, '0')).toEqual([['Use'], ['Skip and draw']]);
        expect(freeText(m, 'desktop')).toContain('click on the deck');
        expect(freeText(m, 'mobile')).toContain('tap the deck');

        apply(s, '0', clickCard(s.G, m, EMPTY_UI, s.id('extreme_adventurer_unicorn')));
        expect(s.handOf('0')).toHaveLength(1);
    });

    it('a click on the deck draws for the turn', () => {
        const s = scenario(2).start('0', 'bot');
        apply(s, '0', clickDeck(model(s, '0')));
        expect(s.G.turn.phase).toBe('action');
        expect(deckAction(model(s, '0'))).toBe('drawForAction');
    });

    it('the other players have nothing to click and see whose turn it is', () => {
        const s = scenario(2).stable('1', 'basic_unicorn_0').hand('1', 'basic_unicorn_1').start('0', 'bot');
        const m = model(s, '1');
        expect(marks(s, '1')).toEqual({});
        expect(deckAction(m)).toBeUndefined();
        expect(clickDeck(m)).toBeUndefined();
        expect(infoText(s.G, m)).toBe("Player 0's turn…");
        expect(getPanels(s.G, m)).toEqual([expect.objectContaining({ waiting: true })]);
    });

    it('a player who is not seated gets an empty model instead of an error', () => {
        const s = scenario(2).start();
        const m = getBoardModel(s.G, 'spectator');
        expect(m.free.play).toEqual([]);
        expect(cardMarks(m).size).toBe(0);
    });
});

describe('action phase', () => {
    it('playable hand cards are marked; an Instant is not', () => {
        const s = scenario(2).hand('0', 'basic_unicorn_0', 'yay', 'neigh', 'unicorn_poison').start();
        expect(marks(s, '0')).toEqual({ basic_unicorn_0: 'playable', yay: 'playable', unicorn_poison: 'playable' });
    });

    it('a Unicorn card is played with one click', () => {
        const s = scenario(2).hand('0', 'basic_unicorn_0').start();
        const m = model(s, '0');
        expect(needsTarget(s.G, m, s.id('basic_unicorn_0'))).toBe(false);
        apply(s, '0', clickCard(s.G, m, EMPTY_UI, s.id('basic_unicorn_0')));
        // nobody holds a card that could answer, so it resolves at once
        expect(s.stableOf('0')).toEqual(['basic_unicorn_0']);
    });

    it('an Upgrade card waits for its destination: stable buttons, player targets, cancel', () => {
        const s = scenario(3).hand('0', 'yay', 'basic_unicorn_0').start();
        const m = model(s, '0');
        const yay = s.id('yay');
        const first = clickCard(s.G, m, EMPTY_UI, yay);
        expect(first).toEqual({ ui: { selected: [], pendingPlay: yay } });
        const ui = (first as { ui: UiState }).ui;

        expect(marks(s, '0', ui)).toEqual({ yay: 'selected' });
        expect(playerTargets(m, ui)).toEqual(['0', '1', '2']);
        expect(labels(s, '0', ui)).toEqual([['Your Stable', "Player 1's Stable", "Player 2's Stable", 'Cancel']]);
        expect(infoText(s.G, m, ui, 'mobile')).toBe('Tap the Stable Yay should go to.');
        // a second click on the card takes it back
        expect(clickCard(s.G, m, ui, yay)).toEqual({ ui: { selected: [], pendingPlay: undefined } });
        // other cards do nothing while one is waiting
        expect(clickPlayer(m, EMPTY_UI, '1')).toBeUndefined();

        apply(s, '0', clickPlayer(m, ui, '2'));
        expect(s.stableOf('2')).toEqual(['yay']);
    });

    it('the text says what is left: play or draw, play again, or end the turn', () => {
        const s = scenario(2).stable('0', 'double_dutch').hand('0', 'basic_unicorn_0', 'basic_unicorn_1').start('0', 'bot');
        s.drawForTurn('0');
        expect(freeText(model(s, '0'), 'desktop')).toBe('Play a card from your hand or click on the deck to draw. You cannot do both.');
        s.play('0', 'basic_unicorn_0');
        expect(freeText(model(s, '0'), 'desktop')).toBe('You may play another card or end your turn.');
        expect(onlyEndTurnLeft(model(s, '0'))).toBe(false);
        s.play('0', 'basic_unicorn_1');
        expect(freeText(model(s, '0'), 'desktop')).toBe('End your turn.');
        expect(onlyEndTurnLeft(model(s, '0'))).toBe(true);
    });
});

describe('prompts', () => {
    it('candidates in a stable are marked and one click answers', () => {
        const s = scenario(2).stable('1', 'basic_unicorn_0', 'yay').hand('0', 'unicorn_poison').start();
        s.play('0', 'unicorn_poison');
        const m = model(s, '0');
        expect(m.prompt).toMatchObject({ kind: 'chooseCards', verb: 'destroy' });
        expect(marks(s, '0')).toEqual({ basic_unicorn_0: 'candidate' });
        expect(deckAction(m)).toBeUndefined();
        expect(infoText(s.G, m, EMPTY_UI, 'desktop')).toBe("Unicorn Poison: DESTROY a Unicorn card — Click on a card in Player 1's Stable.");
        expect(infoText(s.G, m, EMPTY_UI, 'mobile')).toContain('Tap a card');
        expect(clickCard(s.G, m, EMPTY_UI, s.id('yay'))).toBeUndefined();

        apply(s, '0', clickCard(s.G, m, EMPTY_UI, s.id('basic_unicorn_0')));
        expect(s.zone('basic_unicorn_0')).toEqual({ zone: 'discard' });
    });

    it('the others see whom the game is waiting for, and for what', () => {
        const s = scenario(3).stable('1', 'basic_unicorn_0').hand('0', 'unicorn_poison').start();
        s.play('0', 'unicorn_poison');
        expect(waitingText(s.G, model(s, '2'))).toBe('Waiting for Player 0: DESTROY a Unicorn card…');
        expect(getPanels(s.G, model(s, '2'))).toEqual([expect.objectContaining({ waiting: true, buttons: [] })]);
    });

    it('an optional prompt has a Skip button', () => {
        const s = scenario(2).stable('1', 'yay').hand('0', 'alluring_narwhal').start();
        s.play('0', 'alluring_narwhal');
        const [panel] = getPanels(s.G, model(s, '0'));
        expect(panel.source).toBe(s.id('alluring_narwhal'));
        expect(panel.buttons.map(b => [b.label, b.tone])).toEqual([['Skip', 'skip']]);
        apply(s, '0', (panel.buttons[0].action as { outcome: Outcome }).outcome);
        expect(s.prompts()).toEqual([]);
    });

    it('"A OR B": one button per mode, impossible modes greyed out with the reason', () => {
        const s = scenario(2).hand('0', 'cutthroat_captain_unicorn').discard('basic_unicorn_0').start();
        s.play('0', 'cutthroat_captain_unicorn');
        const [panel] = getPanels(s.G, model(s, '0'));
        expect(panel.buttons.map(b => [b.label, b.disabled === true])).toEqual([
            ['STEAL a Baby Unicorn card', true],
            ['Bring a Basic Unicorn card from the discard pile into your Stable', false],
            ['Skip', false],
        ]);
        expect(panel.buttons[0].hint).toBe('not possible right now');
    });

    it('a prompt about cards that are not on the table is answered in a card picker', () => {
        const s = scenario(2).hand('0', 'kiss_of_life').discard('basic_unicorn_0', 'neigh', 'rhinocorn').start();
        s.play('0', 'kiss_of_life');
        const m = model(s, '0');
        const finder = finderFor(m)!;
        expect(finder).toMatchObject({ zone: 'discard', optional: false, max: 1 });
        expect(s.defs(finder.cards)).toEqual(['basic_unicorn_0', 'rhinocorn']);
        expect(labels(s, '0')).toEqual([['Open the discard pile']]);
        apply(s, '0', clickCard(s.G, m, EMPTY_UI, s.id('rhinocorn')));
        expect(s.stableOf('0')).toEqual(['rhinocorn']);
    });

    it('a prompt about the own hand or a stable needs no card picker', () => {
        const s = scenario(2).hand('0', 'good_deal', 'neigh').start();
        s.play('0', 'good_deal');
        expect(finderFor(model(s, '0'))).toBeUndefined();
        expect(model(s, '0').prompt).toMatchObject({ verb: 'discard' });
        expect(infoText(s.G, model(s, '0'))).toContain('in your hand');
    });

    it('choosing a player: targets and one button per player', () => {
        const s = scenario(3).hand('0', 'americorn').hand('1', 'neigh').hand('2', 'yay').start();
        s.play('0', 'americorn');
        const m = model(s, '0');
        expect(playerTargets(m)).toEqual(['1', '2']);
        expect(labels(s, '0')).toEqual([['Player 1', 'Player 2', 'Skip']]);
        apply(s, '0', clickPlayer(m, EMPTY_UI, '2'));
        expect(s.handOf('0')).toEqual(['yay']);
    });

    it('several cards at once: clicks toggle the selection, Confirm sends it', () => {
        const s = scenario(2, { multiTarget: 'atOnce' }).stable('0', 'basic_unicorn_1')
            .stable('1', 'basic_unicorn_0', 'yay', 'rhinocorn').hand('0', 'two_for_one').start();
        s.play('0', 'two_for_one').pick('0', 'basic_unicorn_1');
        const m = model(s, '0');
        expect(m.prompt).toMatchObject({ min: 2, max: 2 });
        const [a, b, c] = [s.id('basic_unicorn_0'), s.id('yay'), s.id('rhinocorn')];

        let ui = EMPTY_UI;
        expect(submitSelection(m, ui)).toBeUndefined();
        ui = (clickCard(s.G, m, ui, a) as { ui: UiState }).ui;
        expect(marks(s, '0', ui)).toEqual({ basic_unicorn_0: 'selected', yay: 'candidate', rhinocorn: 'candidate' });
        const confirm = () => getPanels(s.G, m, ui)[0].buttons.find(btn => btn.key === 'submit')!;
        expect(confirm()).toMatchObject({ label: 'Confirm (1/2)', disabled: true });
        ui = (clickCard(s.G, m, ui, b) as { ui: UiState }).ui;
        expect(clickCard(s.G, m, ui, c)).toBeUndefined();              // already two
        ui = (clickCard(s.G, m, ui, b) as { ui: UiState }).ui;         // take one back
        ui = (clickCard(s.G, m, ui, c) as { ui: UiState }).ui;
        expect(confirm()).toMatchObject({ label: 'Confirm (2/2)', disabled: false });
        expect(infoText(s.G, m, ui)).toContain('(2 of 2 chosen)');

        apply(s, '0', submitSelection(m, ui));
        expect(s.stableOf('1')).toEqual(['yay']);
    });

    it('the hand limit is asked for by the game, not by a card', () => {
        const s = scenario(2).hand('0', ...Array(9).fill('basic_unicorn_0')).start();
        s.drawForAction('0').endTurn('0');
        const [panel] = getPanels(s.G, model(s, '0'));
        expect(panel.source).toBeUndefined();
        expect(panel.heading).toBe('Hand limit');
        expect(infoText(s.G, model(s, '0'))).toMatch(/^Hand limit: DISCARD/);
    });
});

describe('response round', () => {
    const round = () => scenario(3).hand('0', 'basic_unicorn_0', 'neigh').hand('1', 'super_neigh', 'neigh').start();

    it('players who may answer see their Instant cards marked; the action panel stays empty', () => {
        const s = round();
        s.playOnly('0', 'basic_unicorn_0');
        expect(marks(s, '1')).toEqual({ super_neigh: 'respond', neigh: 'respond' });
        expect(marks(s, '2')).toEqual({});
        expect(getPanels(s.G, model(s, '1'))).toEqual([]);
        expect(model(s, '1').round).toMatchObject({ card: s.id('basic_unicorn_0'), by: '0', responses: [], stopped: false, undecided: ['1', '2'] });
        expect(infoText(s.G, model(s, '1'))).toBe("Do you want to Neigh Player 0's Basic Unicorn?");
        expect(infoText(s.G, model(s, '2'))).toBe("You cannot Neigh Player 0's Basic Unicorn.");
        expect(infoText(s.G, model(s, '0'))).toBe('Waiting for Player 1 and Player 2 to respond…');
    });

    it('"play Neigh" prefers a plain Neigh; the round then shows the card as stopped', () => {
        const s = round();
        s.playOnly('0', 'basic_unicorn_0');
        const outcome = playInstant(s.G, model(s, '1'));
        expect(outcome).toMatchObject({ move: 'respond', answer: { cards: [s.id('neigh', 1)] } });
        apply(s, '1', outcome);

        const m0 = model(s, '0');
        expect(m0.round).toMatchObject({ stopped: true, topBy: '1', responses: [{ card: s.id('neigh', 1), by: '1' }] });
        expect(m0.respond).toBeDefined();                       // player 0 may answer the Neigh
        expect(infoText(s.G, m0)).toBe("Do you want to Neigh Player 1's Neigh?");
        expect(playInstant(s.G, model(s, '2'))).toBeUndefined();

        apply(s, '0', pass(m0));
        expect(model(s, '0').round?.iPassed).toBe(true);
        apply(s, '2', pass(model(s, '2')));
        expect(model(s, '0').round).toBeUndefined();
        expect(s.zone('basic_unicorn_0')).toEqual({ zone: 'discard' });
    });

    it('a click on a marked Instant plays it', () => {
        const s = round();
        s.playOnly('0', 'basic_unicorn_0');
        apply(s, '1', clickCard(s.G, model(s, '1'), EMPTY_UI, s.id('super_neigh')));
        expect(s.G.round).toBeUndefined();                      // legacy rule: a Super Neigh ends the voting
        expect(s.zone('basic_unicorn_0')).toEqual({ zone: 'discard' });
    });
});

describe('log', () => {
    const texts = (s: Scenario, viewer: PlayerID | undefined) => describeLog(s.G, viewer).map(l => lineText(s.G, l));

    it('turn headers, plays and what followed, indented below their cause', () => {
        const s = scenario(2).stable('1', 'basic_unicorn_0').hand('0', 'unicorn_poison').start();
        s.play('0', 'unicorn_poison').pick('0', 'basic_unicorn_0');
        const lines = describeLog(s.G, '0');
        expect(lines.map(l => lineText(s.G, l))).toEqual([
            'Turn 1 — Player 0',
            'Player 0 played Unicorn Poison',
            "Player 0 destroyed Player 1's Basic Unicorn (Unicorn Poison)",
        ]);
        expect(lines[0].header).toBe(true);
        expect(lines.map(l => l.depth)).toEqual([0, 0, 1]);
        expect(lines[2].parts).toContainEqual({ card: s.id('basic_unicorn_0') });
    });

    it('a drawn card is named for its owner only', () => {
        const s = scenario(2).deck('rhinocorn').start();
        s.drawForAction('0');
        expect(texts(s, '0')).toContain('Player 0 drew Rhinocorn');
        expect(texts(s, '1')).toContain('Player 0 drew a card');
        expect(texts(s, undefined)).toContain('Player 0 drew a card');
    });

    it('a stopped card and the Neigh that stopped it', () => {
        const s = scenario(2).hand('0', 'basic_unicorn_0').hand('1', 'neigh').start();
        s.playOnly('0', 'basic_unicorn_0').neigh('1').passAll();
        expect(texts(s, '0').slice(1)).toEqual([
            'Player 0 played Basic Unicorn',
            "Player 1 played Neigh against Player 0's Basic Unicorn",
            "Player 0's Basic Unicorn was stopped",
        ]);
    });

    it('things that did not happen are muted: declined and impossible effects', () => {
        const s = scenario(2).stable('1', 'yay').hand('0', 'alluring_narwhal', 'unicorn_poison').stable('0', 'double_dutch').start('0', 'bot');
        s.drawForTurn('0');
        s.play('0', 'alluring_narwhal').skip('0');
        const declined = describeLog(s.G, '0').find(l => l.muted)!;
        expect(lineText(s.G, declined)).toBe('Player 0 chose not to steal (Alluring Narwhal)');
    });
});

describe('reshuffle notice', () => {
    it('is shown for the turn in which the deck ran out', () => {
        // The turn begins with an empty deck: the discard pile is shuffled in (K1).
        const s = scenario(2).discard('rhinocorn', 'yay').start('0', 'action', 0);
        expect(model(s, '0').reshuffled).toBe(true);
        expect(getPanels(s.G, model(s, '0')).map(p => p.key)).toEqual(['free', 'reshuffle']);
        s.drawForAction('0').endTurn('0');
        expect(model(s, '1').reshuffled).toBe(false);
    });

    it('also when it happens in the middle of a turn', () => {
        const s = scenario(2).deck('neigh').discard('rhinocorn', 'yay', 'basic_unicorn_0').hand('0', 'good_deal').start('0', 'action', 0);
        expect(model(s, '0').reshuffled).toBe(false);
        s.play('0', 'good_deal');                               // DRAW 3 with one card left in the deck
        expect(model(s, '0').reshuffled).toBe(true);
    });
});
