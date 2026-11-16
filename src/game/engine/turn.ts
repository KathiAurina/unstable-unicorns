// The turn machine (expansion-plan.md 5.8) and the main loop that drives the effect chain.
//
// Phases: bot (beginning of turn) → draw → action → eot (end of turn).
// The loop `advance` runs after every move: it resolves the top link of the chain until a decision
// is needed, and when the chain is empty it lets the turn continue. It stops when a player has to
// answer a prompt or take one of the free actions:
//   bot:    use a begin-of-turn ability · draw for the turn (forfeits the unused abilities)
//   action: play a card · draw a card · end the turn

import type { CardID, GameState, Link, PlayerID, Rng } from './state';
import { pushLog } from './log';
import { effectOf, isOptionalEffect, pushLink, topLink } from './chain';
import { moveCard, runStateChecks } from './events';
import { abilityPossible, runLink } from './effects';
import type { Result } from './effects';
import type { Effect } from '../cards/types';
import {
    defOf, handLimit, isBlinded, isQuiet, locate, playersWhoWin, sandboxInfiniteActions, unicornCount,
} from './rules';

// ─── Winning ──────────────────────────────────────────────────────────────────

/** Ends the game if a player fulfils the win condition. */
export function checkWin(G: GameState): void {
    if (G.gameOver || G.turn.number === 0) return;
    const winners = playersWhoWin(G);
    if (winners.length === 0) return;
    const winner = winners[0];
    G.gameOver = { winners: [winner], winner, reason: 'unicorns' };
    pushLog(G, { kind: 'info', verb: 'win', actor: winner, count: unicornCount(G, winner), outcome: 'done' });
}

/** R20: deck and discard pile are both empty — the player with the most unicorns wins, ties share the win. */
function endByDeckOut(G: GameState): void {
    const counts = G.players.map(p => ({ id: p.id, n: unicornCount(G, p.id) }));
    const best = Math.max(...counts.map(c => c.n));
    const winners = counts.filter(c => c.n === best).map(c => c.id);
    G.gameOver = { winners, winner: winners.length === 1 ? winners[0] : undefined, reason: 'deckOut' };
    winners.forEach(w => pushLog(G, { kind: 'info', verb: 'win', actor: w, count: best, outcome: 'done', reason: { rule: 'deckOut' } }));
}

// ─── Turns ────────────────────────────────────────────────────────────────────

function botEffect(G: GameState, card: CardID, ability: number): Effect | undefined {
    const a = defOf(G, card).abilities[ability];
    return a && a.kind === 'triggered' && a.on.on === 'bot' ? a.effect : undefined;
}

export function startTurn(G: GameState, rng: Rng, player: PlayerID): void {
    const number = G.turn.number + 1;

    // K1: an empty deck is refilled from the discard pile. R20: if both are empty the game ends.
    if (G.zones.deck.length === 0) {
        if (G.zones.discard.length === 0) {
            G.turn = { ...G.turn, number, player, phase: 'bot', bot: [], botSnapshot: [], played: 0, drewForTurn: false, drewForAction: false, mustEnd: undefined };
            endByDeckOut(G);
            return;
        }
        const count = G.zones.discard.length;
        G.zones.deck = rng.shuffle([...G.zones.discard]);
        G.zones.discard = [];
        pushLog(G, { kind: 'event', verb: 'shuffle', actor: player, count, from: { zone: 'discard' }, to: { zone: 'deck' }, role: 'rule', outcome: 'done' });
    }

    // Begin-of-turn abilities only exist for cards that are in the stable now, and not for blinded unicorns.
    const snapshot = [...G.zones.stable[player]];
    const bot: GameState['turn']['bot'] = [];
    snapshot.forEach(card => {
        if (isBlinded(G, card)) return;
        defOf(G, card).abilities.forEach((a, ability) => {
            if (a.kind === 'triggered' && a.on.on === 'bot') bot.push({ card, ability, state: 'open' });
        });
    });

    G.turn = {
        number, player, phase: 'bot', botSnapshot: snapshot, bot,
        played: 0, drewForTurn: false, drewForAction: false,
    };
    pushLog(G, { kind: 'info', verb: 'turnStart', actor: player, outcome: 'done' });
}

function nextPlayer(G: GameState): PlayerID {
    const ids = G.players.map(p => p.id);
    return ids[(ids.indexOf(G.turn.player) + 1) % ids.length];
}

function finishTurn(G: GameState, rng: Rng): void {
    const extra = G.extraTurns.shift();
    startTurn(G, rng, extra ?? nextPlayer(G));
}

/** Lets the turn continue when nothing is resolving. Returns false when it has to wait for the player. */
function stepTurn(G: GameState, rng: Rng): boolean {
    const t = G.turn;
    if (t.number === 0) return false;

    switch (t.phase) {
        case 'bot': {
            // Mandatory begin-of-turn abilities resolve on their own; optional ones wait for the player.
            const index = t.bot.findIndex(b => {
                if (b.state !== 'open') return false;
                const effect = botEffect(G, b.card, b.ability);
                return effect !== undefined && !isOptionalEffect(effect);
            });
            if (index === -1) return false;
            const b = t.bot[index];
            b.state = 'running';
            pushLink(G, { kind: 'ability', source: { card: b.card, ability: b.ability }, controller: t.player, bot: index });
            return true;
        }
        case 'draw':
            if (!t.drewForTurn) {
                t.drewForTurn = true;
                pushLink(G, { kind: 'rule', rule: 'turnDraw', controller: t.player, effect: { op: 'draw', count: 1 } });
                return true;
            }
            t.phase = 'action';
            return true;
        case 'action':
            return false;
        case 'eot': {
            const excess = G.zones.hand[t.player].length - handLimit(G, t.player);
            if (excess > 0) {
                pushLink(G, { kind: 'rule', rule: 'handLimit', controller: t.player, effect: { op: 'discard', count: excess } });
                return true;
            }
            finishTurn(G, rng);
            return true;
        }
    }
}

// ─── The main loop ────────────────────────────────────────────────────────────

function popLink(G: GameState, link: Link, _result: Exclude<Result, 'suspend'>): void {
    G.chain = G.chain.filter(l => l.id !== link.id);

    // A Magic card goes to the discard pile once it has resolved (unless it moved itself elsewhere).
    if (link.spellCard !== undefined && locate(G, link.spellCard)?.zone === 'pile') {
        moveCard(G, { card: link.spellCard, to: { zone: 'discard' }, cause: 'resolve', actor: link.controller, silent: true });
    }
    // A begin-of-turn ability the player backed out of can still be used.
    if (link.bot !== undefined && G.turn.bot[link.bot]) {
        G.turn.bot[link.bot].state = link.mem.r?.refused ? 'open' : 'used';
    }
}

/** Runs the game forward until a player has to decide something. */
export function advance(G: GameState, rng: Rng): void {
    for (let guard = 0; guard < 100000; guard++) {
        if (G.gameOver) return;

        const link = topLink(G);
        if (link) {
            const result = runLink({ G, rng, L: link });
            if (result === 'suspend') {
                if (topLink(G)?.id !== link.id) continue;   // a triggered ability was pushed on top: resolve it first
                return;                              // waiting for an answer
            }
            popLink(G, link, result);
            continue;
        }

        // Nothing is resolving.
        if (G.prompts.length > 0 || G.round) return;
        runStateChecks(G);
        if (G.chain.length > 0) continue;
        checkWin(G);
        if (G.gameOver) return;
        if (!stepTurn(G, rng)) return;
    }
    throw new Error('advance: the game did not come to rest');
}

// ─── Free actions ─────────────────────────────────────────────────────────────

function turnPlayerMay(G: GameState, player: PlayerID): string | undefined {
    if (G.gameOver) return 'gameOver';
    if (G.turn.number === 0 || G.turn.player !== player) return 'notYourTurn';
    if (!isQuiet(G)) return 'busy';
    return undefined;
}

/** Indices into `turn.bot` of the begin-of-turn abilities the player could use now. */
export function usableBotAbilities(G: GameState, player: PlayerID): number[] {
    if (turnPlayerMay(G, player) || G.turn.phase !== 'bot') return [];
    const out: number[] = [];
    G.turn.bot.forEach((b, index) => {
        if (b.state !== 'open') return;
        const effect = botEffect(G, b.card, b.ability);
        if (effect && abilityPossible(G, b.card, effect, player)) out.push(index);
    });
    return out;
}

export function useBotAbility(G: GameState, player: PlayerID, index: number): string | undefined {
    const error = turnPlayerMay(G, player);
    if (error) return error;
    if (!usableBotAbilities(G, player).includes(index)) return 'notUsable';
    const b = G.turn.bot[index];
    b.state = 'running';
    const parentLog = pushLog(G, { kind: 'decision', verb: 'choose', actor: player, source: { card: b.card, ability: b.ability }, outcome: 'done' });
    pushLink(G, {
        kind: 'ability', source: { card: b.card, ability: b.ability }, controller: player,
        preAccepted: true, bot: index, parentLog,
    });
    return undefined;
}

export function canDrawForTurn(G: GameState, player: PlayerID): boolean {
    return !turnPlayerMay(G, player) && G.turn.phase === 'bot' && !G.turn.mustEnd;
}

/** Ends the Beginning of Turn phase: unused optional abilities are forfeited, the turn draw follows. */
export function drawForTurn(G: GameState, player: PlayerID): string | undefined {
    if (!canDrawForTurn(G, player)) return turnPlayerMay(G, player) ?? 'notAllowed';
    G.turn.bot.forEach(b => { if (b.state === 'open') b.state = 'used'; });
    G.turn.phase = 'draw';
    return undefined;
}

export function canDrawForAction(G: GameState, player: PlayerID): boolean {
    if (turnPlayerMay(G, player) || G.turn.phase !== 'action' || G.turn.mustEnd) return false;
    if (sandboxInfiniteActions(G)) return true;
    return G.turn.played === 0 && !G.turn.drewForAction;
}

/** The Action phase alternative to playing a card: draw one. */
export function drawForAction(G: GameState, player: PlayerID): string | undefined {
    if (!canDrawForAction(G, player)) return turnPlayerMay(G, player) ?? 'notAllowed';
    if (!sandboxInfiniteActions(G)) G.turn.drewForAction = true;
    pushLink(G, { kind: 'rule', rule: 'actionDraw', controller: player, effect: { op: 'draw', count: 1 } });
    return undefined;
}

export function canEndTurn(G: GameState, player: PlayerID): boolean {
    if (turnPlayerMay(G, player)) return false;
    const t = G.turn;
    if (t.phase !== 'bot' && t.phase !== 'action') return false;
    if (t.mustEnd || sandboxInfiniteActions(G)) return true;
    return t.phase === 'action' && (t.played > 0 || t.drewForAction);
}

export function endTurn(G: GameState, player: PlayerID): string | undefined {
    if (!canEndTurn(G, player)) return turnPlayerMay(G, player) ?? 'notAllowed';
    G.turn.phase = 'eot';
    return undefined;
}

/** For `effectOf` users outside this module (the UI lists what an open begin-of-turn ability does). */
export function botAbilityEffect(G: GameState, index: number): Effect | undefined {
    const b = G.turn.bot[index];
    return b ? botEffect(G, b.card, b.ability) : undefined;
}

export { effectOf };
