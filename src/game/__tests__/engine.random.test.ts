import * as engine from '../engine';
import type { Answer, GameState, Prompt, Rng } from '../engine';
import { seededRng, invariantViolations } from '../testing/scenario';

// Random play (expansion-plan.md 10.2): bots answer every prompt with a random legal answer and, when
// nobody has to decide anything, the turn player takes a random free action. After every move the
// invariants are checked. A failure message names seed, player count, sets and move number; replay
// it with `playGame(seed, players, sets)`.

const MAX_MOVES = 3000;

interface GameResult {
    finished: boolean;
    reason?: string;
    moves: number;
    failures: string[];
}

/** What the bots did across all games, to make sure random play reaches the interesting paths. */
const seen = new Set<string>();

const pickOne = <T>(rng: Rng, items: T[]): T => items[rng.int(items.length)];
const chance = (rng: Rng, p: number): boolean => rng.int(1000) < p * 1000;

/** A random answer that is legal by construction. */
function randomAnswer(prompt: Prompt, rng: Rng): Answer {
    if (prompt.optional && chance(rng, prompt.kind === 'respond' ? 0.75 : 0.25)) return { skip: true };
    switch (prompt.kind) {
        case 'confirm':
            return { confirm: true };
        case 'respond': {
            const cards = engine.candidateCards(prompt);
            if (cards.length === 0 || prompt.max < 1) return { skip: true };
            return { cards: rng.shuffle(cards).slice(0, Math.max(1, prompt.min)) };
        }
        case 'chooseMode':
            return { mode: pickOne(rng, engine.candidateModes(prompt)) };
        case 'chooseCards': {
            const cards = engine.candidateCards(prompt);
            const max = Math.min(prompt.max, cards.length);
            const n = prompt.min + rng.int(Math.max(0, max - prompt.min) + 1);
            return { cards: rng.shuffle(cards).slice(0, n) };
        }
        case 'choosePlayers':
        case 'chooseStable': {
            const players = engine.candidatePlayers(prompt);
            const max = Math.min(prompt.max, players.length);
            const n = prompt.min + rng.int(Math.max(0, max - prompt.min) + 1);
            return { players: rng.shuffle(players).slice(0, n) };
        }
    }
}

type Move = { what: string; run: () => string | undefined };

/** The turn player's free actions, weighted so that games make progress. */
function freeMoves(G: GameState, rng: Rng): Move[] {
    const player = G.turn.player;
    const free = engine.freeActions(G, player);
    const moves: Move[] = [];
    free.bot.forEach(index => {
        const def = engine.defOf(G, G.turn.bot[index].card).id;
        moves.push({ what: `useBot ${def}`, run: () => engine.useBotAbility(G, rng, player, index) });
    });
    if (free.drawForTurn) moves.push({ what: 'drawForTurn', run: () => engine.drawForTurn(G, rng, player) });
    free.play.forEach(({ card, targets }) => {
        const target = targets.length > 0 ? pickOne(rng, targets) : undefined;
        const what = `play ${engine.defOf(G, card).id}${target !== undefined ? ` → ${target}` : ''}`;
        // Playing is the way to win: give it more weight than drawing.
        for (let i = 0; i < 3; i++) moves.push({ what, run: () => engine.playCard(G, rng, player, card, target) });
    });
    if (free.drawForAction) moves.push({ what: 'drawForAction', run: () => engine.drawForAction(G, rng, player) });
    if (free.endTurn) moves.push({ what: 'endTurn', run: () => engine.endTurn(G, rng, player) });
    return moves;
}

function stuck(G: GameState): boolean {
    if (G.gameOver || G.prompts.length > 0) return false;
    const free = engine.freeActions(G, G.turn.player);
    return !(free.drawForTurn || free.drawForAction || free.endTurn || free.bot.length > 0 || free.play.length > 0);
}

export function playGame(seed: number, players: number, sets: string[]): GameResult {
    const rng = seededRng(seed);
    const tag = `seed=${seed} players=${players} sets=${sets.join('+')}`;
    const failures: string[] = [];
    let moves = 0;
    let G: GameState;

    try {
        G = engine.createGame(rng, players, { sets });
        // Pregame: every player picks a Baby Unicorn from the Nursery.
        const babies = rng.shuffle([...G.zones.nursery]);
        G.babyStarter = G.players.map((p, i) => ({ cardID: babies[i], owner: p.id }));
        G.players.forEach(p => { G.ready[p.id] = true; });
        engine.startGame(G, rng);
    } catch (e) {
        return { finished: false, moves, failures: [`${tag} setup threw: ${(e as Error).stack}`] };
    }

    const check = (what: string): boolean => {
        const where = `${tag} move=${moves} (${what})`;
        const problems = invariantViolations(G);
        if (problems.length > 0) failures.push(`${where}: invariants: ${problems.join('; ')}`);
        const ids = G.prompts.map(p => p.id);
        if (new Set(ids).size !== ids.length) failures.push(`${where}: duplicate prompt ids ${ids.join(',')}`);
        if (stuck(G)) failures.push(`${where}: stuck in turn ${G.turn.number} phase ${G.turn.phase} (chain ${G.chain.length})`);
        return failures.length === 0;
    };
    if (!check('start')) return { finished: false, moves, failures };

    while (!G.gameOver && moves < MAX_MOVES) {
        moves += 1;
        let what = '?';
        try {
            let error: string | undefined;
            if (G.prompts.length > 0) {
                const prompt = pickOne(rng, G.prompts);
                const answer = randomAnswer(prompt, rng);
                what = `${prompt.player} answers ${prompt.kind}/${prompt.verb} "${prompt.title}" with ${JSON.stringify(answer)}`;
                seen.add(`${prompt.kind}:${Object.keys(answer)[0]}`);
                error = engine.respond(G, rng, prompt.player, prompt.id, answer);
            } else {
                const options = freeMoves(G, rng);
                if (options.length === 0) break; // reported by check()
                const move = pickOne(rng, options);
                what = `${G.turn.player} ${move.what}`;
                seen.add(move.what.split(' ')[0]);
                error = move.run();
            }
            if (error) failures.push(`${tag} move=${moves} (${what}): rejected with "${error}"`);
        } catch (e) {
            failures.push(`${tag} move=${moves} (${what}) threw: ${(e as Error).stack}`);
        }
        if (failures.length > 0 || !check(what)) break;
    }
    return { finished: !!G.gameOver, reason: G.gameOver?.reason, moves, failures };
}

const CONFIGS: string[][] = [['base_2e'], ['base_2e', 'adventures_2e']];
const PLAYER_COUNTS = [2, 3, 4, 5, 6];
const SEEDS_PER_CONFIG = 100;

describe('random play', () => {
    CONFIGS.forEach(sets => {
        PLAYER_COUNTS.forEach(players => {
            it(`${players} players, ${sets.join(' + ')}: no invariant violation, rejected move or deadlock`, () => {
                const results: GameResult[] = [];
                for (let i = 0; i < SEEDS_PER_CONFIG; i++) {
                    const seed = 1000 * players + i + (sets.length > 1 ? 500 : 0);
                    results.push(playGame(seed, players, sets));
                }
                expect(results.flatMap(r => r.failures)).toEqual([]);
                const finished = results.filter(r => r.finished).length;
                const avgMoves = Math.round(results.reduce((n, r) => n + r.moves, 0) / results.length);
                // eslint-disable-next-line no-console
                if (process.env.RANDOM_PLAY_STATS) console.log(`${players}p ${sets.join('+')}: ${finished}/${results.length} finished (deck-out ${results.filter(r => r.reason === 'deckOut').length}), avg ${avgMoves} moves, max ${Math.max(...results.map(r => r.moves))}`);
                // Observed (100 seeds per config, cap 3000 moves): every game ended with a winner, none by
                // deck-out; averages 130–720 moves, the longest about 2600. The 90% threshold leaves room
                // for unlucky seeds after card or rule changes without hiding a systematic stall.
                expect(finished / results.length).toBeGreaterThanOrEqual(0.9);
            });
        });
    });

    it('the bots reached every kind of decision and free action', () => {
        const expected = [
            'confirm:confirm', 'confirm:skip', 'chooseMode:mode', 'chooseCards:cards', 'chooseCards:skip',
            'choosePlayers:players', 'chooseStable:players', 'respond:cards', 'respond:skip',
            'useBot', 'drawForTurn', 'play', 'drawForAction', 'endTurn',
        ];
        expect(expected.filter(k => !seen.has(k))).toEqual([]);
    });
});
