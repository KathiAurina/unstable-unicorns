// boardgame.io wiring for the rules engine (expansion-plan.md 5.8).
//
// The engine (engine/) knows nothing about boardgame.io. This file maps it onto a Game object:
//   - two phases: `pregame` (pick a Baby Unicorn, get ready) and `main`
//   - every player is active all the time; the engine decides who may do what (prompts, free actions)
//   - boardgame.io turns follow `G.turn`: when the engine starts a new turn, `endTurn` is called and
//     the turn order reads the next player from `G.turn.player` (extra turns included)
//   - the game ends when the engine sets `G.gameOver`
//   - randomness comes from boardgame.io's seeded `ctx.random`
//
// Moves take the acting player from `ctx.playerID` (verified by the server), never from an argument.

import type { Ctx, Game } from 'boardgame.io';
import { ActivePlayers, INVALID_MOVE } from 'boardgame.io/core';
import * as engine from './engine';
import type { Answer, CardID, GameState, PlayerID, Rng } from './engine';
import { getDef } from './cards/registry';
import { sandboxCheats } from './sandbox/cheats';
import type { SandboxSnapshot, SandboxSettingKey } from './sandbox/cheats';

export type { Ctx };
export type { GameState };

/** Passed to `setup` by the lobby (`setupData` of the match). */
export type SetupData = {
    matchName?: string;
    ownerPlayerID?: PlayerID;
    /** Set ids: one base set plus expansions. Ids from before the registry are accepted. */
    expansions?: string[];
    sandbox?: boolean;
} | undefined;

/** How long the owner may be silent in the pregame before anyone may cancel the match. */
export const OWNER_TIMEOUT_MS = 60000;
const MAX_NAME_LENGTH = 24;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rngOf(ctx: Ctx): Rng {
    return {
        shuffle: items => ctx.random!.Shuffle(items),
        int: n => (n <= 1 ? 0 : ctx.random!.Die(n) - 1),
    };
}

function actor(ctx: Ctx): PlayerID {
    return ctx.playerID ?? ctx.currentPlayer;
}

/** Lets boardgame.io's turn follow the engine's turn. */
function syncTurn(G: GameState, ctx: Ctx, turnBefore: number): void {
    if (ctx.phase === 'main' && G.turn.number !== turnBefore && !G.gameOver) ctx.events!.endTurn!();
}

type MoveFn = (G: GameState, ctx: Ctx, ...args: any[]) => unknown;

/** A move of the main phase: runs on the server only, since it may need hidden cards and randomness. */
function serverMove(run: (G: GameState, rng: Rng, player: PlayerID, ...args: any[]) => string | undefined | void) {
    const move: MoveFn = (G, ctx, ...args) => {
        const turnBefore = G.turn.number;
        const error = run(G, rngOf(ctx), actor(ctx), ...args);
        if (error) return INVALID_MOVE;
        syncTurn(G, ctx, turnBefore);
        return undefined;
    };
    return { move, client: false };
}

function seat(G: GameState, ctx: Ctx): number {
    return Math.max(0, ctx.playOrder.indexOf(G.turn.player));
}

function abort(G: GameState): void {
    G.gameOver = { winners: [], reason: 'aborted', aborted: true };
}

// ─── Pregame moves ────────────────────────────────────────────────────────────

const changeName: MoveFn = (G, ctx, name: string) => {
    const player = G.players.find(p => p.id === actor(ctx));
    if (!player || typeof name !== 'string') return INVALID_MOVE;
    player.name = name.slice(0, MAX_NAME_LENGTH);
    return undefined;
};

const selectBaby: MoveFn = (G, ctx, cardID: CardID) => {
    const me = actor(ctx);
    if (!G.zones.nursery.includes(cardID) || getDef(G.cards[cardID].def).type !== 'baby') return INVALID_MOVE;
    if (G.babyStarter.some(s => s.cardID === cardID && s.owner !== me)) return INVALID_MOVE;
    G.babyStarter = G.babyStarter.filter(s => s.owner !== me);
    G.babyStarter.push({ cardID, owner: me });
    G.ready[me] = false;
    return undefined;
};

const deselectBaby: MoveFn = (G, ctx) => {
    const me = actor(ctx);
    G.babyStarter = G.babyStarter.filter(s => s.owner !== me);
    G.ready[me] = false;
};

const ready = {
    client: false,
    move: ((G, ctx) => {
        const me = actor(ctx);
        const mine = G.babyStarter.find(s => s.owner === me);
        if (!mine) return INVALID_MOVE;
        if (G.babyStarter.some(s => s.cardID === mine.cardID && s.owner !== me)) return INVALID_MOVE;
        G.ready[me] = true;
        // The pregame phase ends (endIf) as soon as the engine has started the first turn.
        if (G.players.every(p => G.ready[p.id])) engine.startGame(G, rngOf(ctx));
        return undefined;
    }) as MoveFn,
};

const abolishGame: MoveFn = (G, ctx) => {
    if (actor(ctx) !== G.owner) return INVALID_MOVE;
    abort(G);
    return undefined;
};

const heartbeat: MoveFn = (G, ctx) => {
    G.lastHeartbeat[actor(ctx)] = Date.now();
};

const cancelAbandonedGame: MoveFn = (G) => {
    if (Date.now() - G.lastHeartbeat[G.owner] <= OWNER_TIMEOUT_MS) return INVALID_MOVE;
    abort(G);
    return undefined;
};

// ─── Main moves ───────────────────────────────────────────────────────────────

const mainMoves = {
    /** Answers a prompt: the single move for every decision. */
    respond: serverMove((G, rng, player, promptId: string, answer: Answer) => engine.respond(G, rng, player, promptId, answer)),
    /** Plays a card from hand; `target` is the destination stable of an Upgrade or Downgrade card. */
    playCard: serverMove((G, rng, player, card: CardID, target?: PlayerID) => engine.playCard(G, rng, player, card, target ?? undefined)),
    drawForTurn: serverMove((G, rng, player) => engine.drawForTurn(G, rng, player)),
    drawForAction: serverMove((G, rng, player) => engine.drawForAction(G, rng, player)),
    useBotAbility: serverMove((G, rng, player, index: number) => engine.useBotAbility(G, rng, player, index)),
    endTurn: serverMove((G, rng, player) => engine.endTurn(G, rng, player)),
    /** Owner override for players who are away: default answers for everything open, then the turn ends. */
    forceEndTurn: serverMove((G, rng, player) => {
        if (player !== G.owner) return 'notOwner';
        engine.forceEndTurn(G, rng);
        return undefined;
    }),
    abolishGame,
    heartbeat,
};

const sandboxMoves = Object.fromEntries(
    Object.entries(sandboxCheats).map(([name, cheat]) => [
        name,
        serverMove((G, rng, _player, ...args: any[]) => {
            if (!G.sandbox) return 'notASandbox';
            return (cheat as (G: GameState, rng: Rng, ...a: any[]) => string | undefined | void)(G, rng, ...args) ?? undefined;
        }),
    ]),
);

// ─── Game ─────────────────────────────────────────────────────────────────────

const UnstableUnicorns: Game<GameState, Ctx, SetupData> = {
    name: 'unstable_unicorns',

    setup: (ctx, setupData) => {
        const rng = rngOf(ctx);
        const G = engine.createGame(rng, ctx.numPlayers, {
            sets: setupData?.expansions,
            ownerPlayerID: setupData?.ownerPlayerID,
            sandbox: setupData?.sandbox === true,
        });
        const now = Date.now();
        G.players.forEach(p => { G.lastHeartbeat[p.id] = now; });
        // The sandbox has no pregame: Baby Unicorns are assigned and the first turn begins at once.
        if (G.sandbox) engine.startGame(G, rng);
        return G;
    },

    phases: {
        pregame: {
            start: true,
            next: 'main',
            endIf: G => G.turn.number > 0,
            turn: { activePlayers: ActivePlayers.ALL },
            moves: { ready, selectBaby, deselectBaby, changeName, abolishGame, heartbeat, cancelAbandonedGame },
        },
        main: {
            turn: {
                activePlayers: ActivePlayers.ALL,
                order: {
                    first: (G, ctx) => seat(G, ctx),
                    next: (G, ctx) => seat(G, ctx),
                },
            },
            moves: { ...mainMoves, ...sandboxMoves },
        },
    },

    endIf: G => G.gameOver,
};

export default UnstableUnicorns;

// ─── Types for the UI ─────────────────────────────────────────────────────────

/** The `moves` object boardgame.io hands to the board. */
export interface Moves {
    // pregame
    ready: () => void;
    selectBaby: (cardID: CardID) => void;
    deselectBaby: () => void;
    changeName: (name: string) => void;
    cancelAbandonedGame: () => void;
    // both phases
    abolishGame: () => void;
    heartbeat: () => void;
    // main
    respond: (promptId: string, answer: Answer) => void;
    playCard: (card: CardID, target?: PlayerID) => void;
    drawForTurn: () => void;
    drawForAction: () => void;
    useBotAbility: (index: number) => void;
    endTurn: () => void;
    forceEndTurn: () => void;
    // sandbox cheats (only when G.sandbox)
    sandboxAddToHand: (player: PlayerID, def: string) => void;
    sandboxAddToStable: (player: PlayerID, def: string, withEnter: boolean) => void;
    sandboxAddToDiscard: (def: string) => void;
    sandboxAddToDeckTop: (def: string) => void;
    sandboxAddToNursery: (def: string) => void;
    sandboxDraw: (player: PlayerID, count: number) => void;
    sandboxDiscardRandom: (player: PlayerID) => void;
    sandboxEmptyHand: (player: PlayerID) => void;
    sandboxForceEndTurn: () => void;
    sandboxReshuffleDiscard: () => void;
    sandboxClearPending: () => void;
    sandboxSetSetting: (key: SandboxSettingKey, value: boolean) => void;
    sandboxBounceCard: (card: CardID) => void;
    sandboxDestroyCard: (card: CardID) => void;
    sandboxStealCard: (card: CardID, to: PlayerID) => void;
    sandboxHandToStable: (card: CardID, to: PlayerID) => void;
    sandboxForceDiscardCard: (player: PlayerID, card: CardID) => void;
    sandboxLoadState: (snapshot: SandboxSnapshot) => void;
}
