import type { Client as ClientFactory } from 'boardgame.io/client';
import type { SetupData } from '../game';
import type { CardID, GameState, PlayerID } from '../engine';
import * as engine from '../engine';
import { invariantViolations } from '../testing/scenario';

// The boardgame.io wiring (game.ts): phases, moves, turn sync, game end, sandbox.
// A client without a transport runs the whole game locally, including server-only moves.

// Rejected moves are part of these tests. boardgame.io reports each one through console.error, which it
// captures when it is loaded — so it is silenced first and the modules that pull it in are loaded after.
jest.spyOn(console, 'error').mockImplementation(() => undefined);
const { Client } = require('boardgame.io/client') as { Client: typeof ClientFactory };
const UnstableUnicorns = require('../game').default as typeof import('../game').default;

type TestClient = ReturnType<typeof Client>;


/** Arranges the freshly set-up state before the match starts. */
type Arrange = (G: GameState) => void;

function spawn(G: GameState, def: string): CardID {
    G.cards.push({ def });
    return G.cards.length - 1;
}

function giveHand(G: GameState, player: PlayerID, ...defs: string[]): void {
    G.zones.deck.push(...G.zones.hand[player]);
    G.zones.hand[player] = defs.map(d => spawn(G, d));
}

function giveStable(G: GameState, player: PlayerID, ...defs: string[]): void {
    defs.forEach(d => G.zones.stable[player].push(spawn(G, d)));
}

function makeClient(numPlayers: number, setupData?: SetupData, arrange?: Arrange): TestClient {
    const game = {
        ...UnstableUnicorns,
        setup: (ctx: any, data: any) => {
            const G = UnstableUnicorns.setup!(ctx, data ?? setupData);
            arrange?.(G);
            return G;
        },
    };
    const client = Client({ game: game as any, numPlayers, debug: false });
    client.start();
    return client;
}

const state = (client: TestClient) => client.getState()!;
const G = (client: TestClient) => state(client).G as GameState;

function as(client: TestClient, player: PlayerID): Record<string, (...args: any[]) => void> {
    client.updatePlayerID(player);
    return client.moves;
}

/** Runs the pregame: everybody picks the n-th Baby Unicorn and gets ready. */
function startMatch(client: TestClient): void {
    const players = G(client).players.map(p => p.id);
    players.forEach((p, i) => as(client, p).selectBaby(G(client).zones.nursery[i]));
    players.forEach(p => as(client, p).ready());
}

function handCard(client: TestClient, player: PlayerID, def: string): CardID {
    const found = G(client).zones.hand[player].find(c => G(client).cards[c].def === def);
    if (found === undefined) throw new Error(`no ${def} in hand of ${player}`);
    return found;
}

function promptOf(client: TestClient, player: PlayerID) {
    const prompt = G(client).prompts.find(p => p.player === player);
    if (!prompt) throw new Error(`no prompt for ${player}`);
    return prompt;
}

describe('setup and pregame', () => {
    it('starts in the pregame with dealt hands, Baby Unicorns in the Nursery and everybody active', () => {
        const client = makeClient(3);
        const { ctx } = state(client);
        expect(ctx.phase).toBe('pregame');
        expect(Object.keys(ctx.activePlayers!).sort()).toEqual(['0', '1', '2']);
        expect(G(client).turn.number).toBe(0);
        G(client).players.forEach(p => expect(G(client).zones.hand[p.id]).toHaveLength(engine.HAND_SIZE_AT_START));
        expect(G(client).zones.nursery.length).toBeGreaterThanOrEqual(3);
        expect(invariantViolations(G(client))).toEqual([]);
    });

    it('takes the sets and the owner from the setup data (old set ids still work)', () => {
        const base = makeClient(2);
        const both = makeClient(2, { expansions: ['base_game', 'adventures_2nd_edition'], ownerPlayerID: '1' });
        expect(G(both).options.sets).toEqual(['base_2e', 'adventures_2e']);
        expect(G(both).cards.length).toBeGreaterThan(G(base).cards.length);
        expect(G(both).owner).toBe('1');
        expect(G(base).owner).toBe('0');
    });

    it('a Baby Unicorn can be picked by one player only, and readiness needs a pick', () => {
        const client = makeClient(2);
        const [first, second] = G(client).zones.nursery;
        as(client, '0').ready();
        expect(G(client).ready['0']).toBe(false);

        as(client, '0').selectBaby(first);
        as(client, '1').selectBaby(first);
        expect(G(client).babyStarter).toEqual([{ cardID: first, owner: '0' }]);

        as(client, '1').selectBaby(second);
        as(client, '1').ready();
        as(client, '1').selectBaby(second);
        expect(G(client).ready['1']).toBe(false);          // picking again takes the readiness back

        as(client, '1').deselectBaby();
        expect(G(client).babyStarter).toEqual([{ cardID: first, owner: '0' }]);
        expect(state(client).ctx.phase).toBe('pregame');
    });

    it('a card that is not a Baby Unicorn in the Nursery cannot be picked', () => {
        const client = makeClient(2);
        as(client, '0').selectBaby(G(client).zones.deck[0]);
        expect(G(client).babyStarter).toEqual([]);
    });

    it('names can be changed and are cut to a sane length', () => {
        const client = makeClient(2);
        as(client, '1').changeName('Ben');
        as(client, '0').changeName('x'.repeat(100));
        expect(G(client).players[1].name).toBe('Ben');
        expect(G(client).players[0].name).toHaveLength(24);
    });

    it('when everybody is ready the main phase begins with player 0 and the babies are in the stables', () => {
        const client = makeClient(3);
        const babies = G(client).zones.nursery.slice(0, 3);
        startMatch(client);
        const { ctx } = state(client);
        expect(ctx.phase).toBe('main');
        expect(ctx.currentPlayer).toBe('0');
        expect(Object.keys(ctx.activePlayers!).sort()).toEqual(['0', '1', '2']);
        expect(G(client).turn).toMatchObject({ number: 1, player: '0', phase: 'bot' });
        expect(G(client).players.map(p => G(client).zones.stable[p.id])).toEqual(babies.map(b => [b]));
        expect(invariantViolations(G(client))).toEqual([]);
    });

    it('only the owner can abolish the game', () => {
        const client = makeClient(2);
        as(client, '1').abolishGame();
        expect(state(client).ctx.gameover).toBeUndefined();
        as(client, '0').abolishGame();
        expect(state(client).ctx.gameover).toMatchObject({ aborted: true, reason: 'aborted' });
    });

    it('an abandoned pregame can be cancelled by anyone once the owner has been silent long enough', () => {
        const client = makeClient(2);
        as(client, '1').cancelAbandonedGame();
        expect(state(client).ctx.gameover).toBeUndefined();

        const stale = makeClient(2, undefined, g => { g.lastHeartbeat['0'] = Date.now() - 120000; });
        as(stale, '1').cancelAbandonedGame();
        expect(state(stale).ctx.gameover).toMatchObject({ aborted: true });
    });
});

describe('turns', () => {
    it('draw for the turn, draw for the action, end the turn: boardgame.io follows the engine', () => {
        const client = makeClient(2);
        startMatch(client);
        const turnBefore = state(client).ctx.turn;

        as(client, '0').drawForTurn();
        expect(G(client).turn.phase).toBe('action');
        expect(G(client).zones.hand['0']).toHaveLength(6);

        as(client, '0').drawForAction();
        expect(G(client).zones.hand['0']).toHaveLength(7);

        as(client, '0').endTurn();
        expect(G(client).turn).toMatchObject({ number: 2, player: '1', phase: 'bot' });
        expect(state(client).ctx.currentPlayer).toBe('1');
        expect(state(client).ctx.turn).toBe(turnBefore + 1);
        expect(Object.keys(state(client).ctx.activePlayers!).sort()).toEqual(['0', '1']);
    });

    it('the turn order wraps around', () => {
        const client = makeClient(3);
        startMatch(client);
        ['0', '1', '2'].forEach(p => {
            expect(state(client).ctx.currentPlayer).toBe(p);
            as(client, p).drawForTurn();
            as(client, p).drawForAction();
            as(client, p).endTurn();
        });
        expect(state(client).ctx.currentPlayer).toBe('0');
        expect(G(client).turn.number).toBe(4);
    });

    it('moves of a player who may not act are rejected and change nothing', () => {
        const client = makeClient(2);
        startMatch(client);
        const before = JSON.stringify(G(client));
        as(client, '1').drawForTurn();
        as(client, '1').endTurn();
        as(client, '0').endTurn();                          // not before the action
        as(client, '0').respond('p999', { skip: true });
        as(client, '1').forceEndTurn();                     // not the owner
        expect(JSON.stringify(G(client))).toBe(before);
    });

    it('a turn that ends with more than seven cards asks for a discard first', () => {
        const client = makeClient(2, undefined, g => giveHand(g, '0', ...Array(8).fill('basic_unicorn_0')));
        startMatch(client);
        as(client, '0').drawForTurn();
        as(client, '0').drawForAction();
        as(client, '0').endTurn();
        expect(state(client).ctx.currentPlayer).toBe('0');
        const prompt = promptOf(client, '0');
        expect(prompt).toMatchObject({ kind: 'chooseCards', verb: 'discard', rule: 'handLimit' });
        // Sequential multi-target (legacy): one card per prompt until the hand is down to seven.
        for (let i = 0; i < 10 && G(client).prompts.length > 0; i++) {
            const p = promptOf(client, '0');
            as(client, '0').respond(p.id, { cards: engine.candidateCards(p).slice(0, p.min) });
        }
        expect(G(client).zones.hand['0']).toHaveLength(7);
        expect(state(client).ctx.currentPlayer).toBe('1');
    });

    it('an extra turn keeps the same player and still counts as a new boardgame.io turn', () => {
        const client = makeClient(2, undefined, g => giveHand(g, '0', 'change_of_luck', 'neigh', 'neigh', 'neigh'));
        startMatch(client);
        as(client, '0').drawForTurn();
        as(client, '0').playCard(handCard(client, '0', 'change_of_luck'));
        const round = promptOf(client, '1');
        as(client, '1').respond(round.id, { skip: true });
        // Change of Luck: DRAW 2, DISCARD 3, then take another turn.
        for (let i = 0; i < 10 && G(client).prompts.length > 0; i++) {
            const p = promptOf(client, '0');
            as(client, '0').respond(p.id, { cards: engine.candidateCards(p).slice(0, p.min) });
        }
        const turnBefore = state(client).ctx.turn;
        as(client, '0').endTurn();
        expect(G(client).turn).toMatchObject({ number: 2, player: '0', phase: 'bot' });
        expect(state(client).ctx.currentPlayer).toBe('0');
        expect(state(client).ctx.turn).toBe(turnBefore + 1);
    });

    it('the owner can force the end of another player\'s turn', () => {
        const client = makeClient(2);
        startMatch(client);
        as(client, '0').drawForTurn();
        as(client, '0').drawForAction();
        as(client, '0').endTurn();
        expect(state(client).ctx.currentPlayer).toBe('1');
        as(client, '0').forceEndTurn();
        expect(state(client).ctx.currentPlayer).toBe('0');
        expect(G(client).turn.number).toBe(3);
    });
});

describe('playing cards', () => {
    it('a played card opens a response round; a Neigh stops it', () => {
        const client = makeClient(2, undefined, g => {
            giveHand(g, '0', 'basic_unicorn_0');
            giveHand(g, '1', 'neigh');
        });
        startMatch(client);
        as(client, '0').drawForTurn();
        const unicorn = handCard(client, '0', 'basic_unicorn_0');
        as(client, '0').playCard(unicorn);
        expect(G(client).zones.pile.map(e => e.card)).toEqual([unicorn]);

        const round = promptOf(client, '1');
        expect(round.kind).toBe('respond');
        as(client, '1').respond(round.id, { cards: [handCard(client, '1', 'neigh')] });
        // Player 0 may answer the Neigh, and passes.
        as(client, '0').respond(promptOf(client, '0').id, { skip: true });

        expect(G(client).zones.discard).toContain(unicorn);
        expect(G(client).lastPlay).toMatchObject({ card: unicorn, result: 'neighed' });
        expect(G(client).zones.pile).toEqual([]);
        expect(invariantViolations(G(client))).toEqual([]);
    });

    it('an Upgrade card can be played into another stable', () => {
        const client = makeClient(2, undefined, g => giveHand(g, '0', 'yay'));
        startMatch(client);
        as(client, '0').drawForTurn();
        const yay = handCard(client, '0', 'yay');
        as(client, '0').playCard(yay, '1');
        as(client, '1').respond(promptOf(client, '1').id, { skip: true });
        expect(G(client).zones.stable['1']).toContain(yay);
    });

    it('the seventh unicorn ends the game', () => {
        const client = makeClient(2, undefined, g => {
            giveHand(g, '0', 'basic_unicorn_0');
            giveStable(g, '0', ...Array(5).fill('basic_unicorn_1'));     // + the Baby Unicorn = 6
        });
        startMatch(client);
        as(client, '0').drawForTurn();
        as(client, '0').playCard(handCard(client, '0', 'basic_unicorn_0'));
        as(client, '1').respond(promptOf(client, '1').id, { skip: true });
        expect(G(client).gameOver).toMatchObject({ winner: '0', reason: 'unicorns' });
        expect(state(client).ctx.gameover).toMatchObject({ winner: '0', winners: ['0'] });

        const before = JSON.stringify(G(client));
        as(client, '0').endTurn();
        expect(JSON.stringify(G(client))).toBe(before);
    });
});

describe('state', () => {
    it('stays plain JSON through a few turns', () => {
        const client = makeClient(3, { expansions: ['base_2e', 'adventures_2e'] });
        startMatch(client);
        for (let i = 0; i < 6; i++) {
            const p = G(client).turn.player;
            as(client, p).drawForTurn();
            as(client, p).drawForAction();
            as(client, p).endTurn();
            G(client).prompts.forEach(pr => as(client, pr.player).respond(pr.id, { cards: engine.candidateCards(pr).slice(0, pr.min) }));
        }
        const g = G(client);
        expect(JSON.parse(JSON.stringify(g))).toEqual(g);
        expect(invariantViolations(g)).toEqual([]);
    });
});

describe('sandbox', () => {
    const sandbox = (arrange?: Arrange) => makeClient(3, { sandbox: true, ownerPlayerID: '0' }, arrange);

    it('skips the pregame: every player has a Baby Unicorn and player 0 begins', () => {
        const client = sandbox();
        expect(state(client).ctx.phase).toBe('main');
        expect(state(client).ctx.currentPlayer).toBe('0');
        expect(G(client).turn).toMatchObject({ number: 1, player: '0' });
        G(client).players.forEach(p => expect(G(client).zones.stable[p.id]).toHaveLength(1));
        expect(G(client).players.map(p => p.name)).toEqual(['player', 'dummy_1', 'dummy_2']);
    });

    it('cheats are refused outside the sandbox', () => {
        const client = makeClient(2);
        startMatch(client);
        const before = G(client).cards.length;
        as(client, '0').sandboxAddToHand('0', 'neigh');
        expect(G(client).cards.length).toBe(before);
    });

    it('adds cards to every zone', () => {
        const client = sandbox();
        const m = as(client, '0');
        m.sandboxAddToHand('1', 'neigh');
        m.sandboxAddToStable('2', 'yay', false);
        m.sandboxAddToDiscard('unicorn_poison');
        m.sandboxAddToDeckTop('super_neigh');
        m.sandboxAddToNursery('baby_narwhal');
        m.sandboxAddToHand('1', 'no_such_card');
        const g = G(client);
        const def = (c: CardID) => g.cards[c].def;
        expect(def(g.zones.hand['1'][g.zones.hand['1'].length - 1])).toBe('neigh');
        expect(g.zones.stable['2'].map(def)).toContain('yay');
        expect(def(g.zones.discard[g.zones.discard.length - 1])).toBe('unicorn_poison');
        expect(def(g.zones.deck[0])).toBe('super_neigh');
        expect(def(g.zones.nursery[g.zones.nursery.length - 1])).toBe('baby_narwhal');
        expect(invariantViolations(g)).toEqual([]);
    });

    it('"with enter" runs the card\'s enter ability', () => {
        const client = sandbox(g => giveStable(g, '1', 'yay'));
        as(client, '0').sandboxAddToStable('0', 'alluring_narwhal', true);
        expect(promptOf(client, '0')).toMatchObject({ kind: 'chooseCards', verb: 'steal', optional: true });
    });

    it('moves cards around without asking the rules', () => {
        const client = sandbox(g => giveStable(g, '1', 'rainbow_aura', 'basic_unicorn_0'));
        const g0 = G(client);
        const unicorn = g0.zones.stable['1'].find(c => g0.cards[c].def === 'basic_unicorn_0')!;
        const aura = g0.zones.stable['1'].find(c => g0.cards[c].def === 'rainbow_aura')!;
        const baby = g0.zones.stable['1'][0];
        const m = as(client, '0');

        m.sandboxStealCard(unicorn, '0');
        expect(G(client).zones.stable['0']).toContain(unicorn);
        m.sandboxBounceCard(unicorn);
        expect(G(client).zones.hand['0']).toContain(unicorn);
        m.sandboxHandToStable(unicorn, '2');
        expect(G(client).zones.stable['2']).toContain(unicorn);
        m.sandboxDestroyCard(aura);
        expect(G(client).zones.discard).toContain(aura);
        m.sandboxDestroyCard(baby);
        expect(G(client).zones.nursery).toContain(baby);        // a Baby Unicorn goes back to the Nursery
        m.sandboxForceDiscardCard('1', G(client).zones.hand['1'][0]);
        expect(G(client).zones.hand['1']).toHaveLength(engine.HAND_SIZE_AT_START - 1);
        m.sandboxEmptyHand('1');
        expect(G(client).zones.hand['1']).toEqual([]);
        m.sandboxDraw('1', 3);
        expect(G(client).zones.hand['1']).toHaveLength(3);
        m.sandboxDiscardRandom('1');
        expect(G(client).zones.hand['1']).toHaveLength(2);
        m.sandboxReshuffleDiscard();
        expect(G(client).zones.discard).toEqual([]);
        expect(invariantViolations(G(client))).toEqual([]);
    });

    it('settings: with "skip neigh" off a played card opens a response round', () => {
        const client = sandbox(g => giveHand(g, '0', 'basic_unicorn_0', 'basic_unicorn_1'));
        as(client, '0').drawForTurn();
        as(client, '0').playCard(handCard(client, '0', 'basic_unicorn_0'));
        expect(G(client).round).toBeUndefined();
        as(client, '0').sandboxSetSetting('skipNeigh', false);
        as(client, '0').playCard(handCard(client, '0', 'basic_unicorn_1'));     // infinite actions
        expect(G(client).round).toBeDefined();

        as(client, '0').sandboxClearPending();
        expect(G(client).round).toBeUndefined();
        expect(G(client).prompts).toEqual([]);
        expect(G(client).zones.pile).toEqual([]);
        expect(invariantViolations(G(client))).toEqual([]);
    });

    it('force end turn moves on to the next player', () => {
        const client = sandbox();
        as(client, '0').sandboxForceEndTurn();
        expect(state(client).ctx.currentPlayer).toBe('1');
        expect(G(client).turn.player).toBe('1');
    });

    it('a saved state can be loaded again', () => {
        const { serializeSandboxSnapshot } = require('../sandbox/cheats');
        const client = sandbox();
        const m = as(client, '0');
        m.sandboxAddToStable('1', 'yay', false);
        const snapshot = serializeSandboxSnapshot(G(client));
        m.sandboxEmptyHand('0');
        m.sandboxAddToHand('2', 'neigh');
        m.sandboxLoadState(snapshot);
        expect(G(client).zones).toEqual({ ...snapshot.zones, pile: [] });
        expect(G(client).cards).toEqual(snapshot.cards);
        expect(invariantViolations(G(client))).toEqual([]);
    });
});
