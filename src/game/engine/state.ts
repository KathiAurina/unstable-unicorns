// Game state shape (expansion-plan.md 5.2).
//
// Nothing derived is stored here: whether a player may play Upgrades, what their hand limit is or
// whether a card can be destroyed is computed from the cards in the stables (rules.ts).
// The state must stay plain JSON — no functions, no class instances, no references into the registry.

import type { Effect, Verb } from '../cards/types';
import type { GameOptions } from './options';

export type CardID = number;
export type PlayerID = string;

export interface Player {
    id: PlayerID;
    name: string;
}

export interface CardInstance {
    /** Definition id in the registry. */
    def: string;
}

/** Per-instance memory, reset whenever the card changes zone. */
export interface CardState {
    /** Increases on every zone change — "treat it as a new card". */
    enteredSeq: number;
    /**
     * Legacy rule (R13, `blindingRestoresEffects: false`): a unicorn that entered a stable while it
     * was blinded never gets its continuous effects.
     */
    staticsOff?: boolean;
}

export type ZoneName = 'deck' | 'discard' | 'nursery' | 'removed' | 'hand' | 'stable' | 'pile';

export interface ZoneRef {
    zone: ZoneName;
    /** Owner, for `hand` and `stable`. */
    player?: PlayerID;
}

/** A card that is being played and has not resolved yet. */
export interface PileEntry {
    card: CardID;
    /** Who played it. */
    player: PlayerID;
    /** Declared destination stable (Unicorn, Upgrade and Downgrade cards). */
    target?: PlayerID;
    /** Log entry of the play; what the card does is logged underneath it. */
    log?: number;
    /** Stopped by the entry above it. */
    cancelled?: boolean;
}

export interface Zones {
    /** Index 0 is the top of the deck. */
    deck: CardID[];
    discard: CardID[];
    nursery: CardID[];
    removed: CardID[];
    hand: Record<PlayerID, CardID[]>;
    /** Unicorns, Upgrades and Downgrades together; the UI groups them by type. */
    stable: Record<PlayerID, CardID[]>;
    /** Cards currently being played; the last entry is the top. */
    pile: PileEntry[];
}

// ─── Turn ─────────────────────────────────────────────────────────────────────

export type Phase = 'bot' | 'draw' | 'action' | 'eot';

/** A begin-of-turn ability of a card that was in the stable when the turn began. */
export interface BotAbility {
    card: CardID;
    ability: number;
    /** open = not used yet · running = being resolved · used = done (or tried) */
    state: 'open' | 'running' | 'used';
}

export interface TurnState {
    /** Counts turns from 1. 0 = the game has not started. */
    number: number;
    player: PlayerID;
    phase: Phase;
    /** Cards in the stable when the turn began. */
    botSnapshot: CardID[];
    bot: BotAbility[];
    /** Cards played from hand in the Action phase (a Neigh'd card counts). */
    played: number;
    drewForTurn: boolean;
    drewForAction: boolean;
    /** "Immediately end your turn": no draw and no play any more, only ending the turn. */
    mustEnd?: boolean;
}

// ─── Effect chain ─────────────────────────────────────────────────────────────

/** Steps the engine uses itself; never part of a card definition. */
export type InternalStep =
    /** A played Unicorn / Upgrade / Downgrade card enters the declared stable. */
    | { op: '$enterPlayed'; card: CardID; target: PlayerID };

export type EngineEffect = Effect | InternalStep;

/** Interpreter memory of one node of the effect tree, keyed by its path. */
export interface NodeMem {
    /** Final result of the node. */
    r?: { performed: boolean; declined?: boolean };
    /** Open prompt of this node. */
    prompt?: string;
    /** Answer to that prompt, waiting to be consumed. */
    answer?: Answer;
    [key: string]: unknown;
}

export interface Binding {
    cards: CardID[];
    players: PlayerID[];
}

/** One ability instance that is waiting to resolve or resolving. */
export interface Link {
    id: number;
    kind: 'ability' | 'spell' | 'rule';
    /** The card and ability this link resolves. The effect tree is looked up in the registry. */
    source?: { card: CardID; ability: number };
    /** For `rule` links: which engine rule created it, and its effect. */
    rule?: 'turnDraw' | 'actionDraw' | 'handLimit' | 'resolvePlay';
    effect?: EngineEffect;
    controller: PlayerID;
    mem: Record<string, NodeMem>;
    vars: Record<string, Binding>;
    /** Started by the player through a free action: the outer "you may" is not asked again. */
    preAccepted?: boolean;
    /** Index into `turn.bot` for begin-of-turn abilities. */
    bot?: number;
    /** A Magic card that goes to the discard pile when this link is done. */
    spellCard?: CardID;
    /** Log entry that caused this link; its events are logged as children. */
    parentLog?: number;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

export type PromptKind =
    | 'confirm' | 'chooseMode' | 'chooseCards' | 'choosePlayers' | 'chooseStable' | 'respond';

export type Candidate =
    | { card: CardID; zone: ZoneName; owner?: PlayerID }
    | { player: PlayerID }
    | { mode: number; label: string };

export interface Reason {
    /** Machine-readable rule code, e.g. `protected`, `noTarget`, `cannotEnter`. */
    rule: string;
    /** The card responsible, if any. */
    card?: CardID;
}

/** A decision one player has to make. The only contract between engine and UI (expansion-plan.md 6). */
export interface Prompt {
    id: string;
    player: PlayerID;
    kind: PromptKind;
    verb: Verb;
    /** English description of what is being decided, e.g. "DISCARD 2 cards". */
    title: string;
    /** The card that asks. Absent for engine rules (hand limit). */
    source?: { card: CardID; ability: number; controller: PlayerID };
    rule?: Link['rule'];
    /** May the player decline? */
    optional: boolean;
    min: number;
    max: number;
    candidates: Candidate[];
    /** Options that are shown but cannot be picked, with the explanation. */
    disabled?: { candidate: Candidate; reason: Reason }[];
    role?: 'cost' | 'effect';
    /** What happens next, e.g. ["then STEAL a Unicorn card"]. */
    preview?: string[];
    /** Cards only this player may see (search results, a looked-at hand). */
    privateCards?: CardID[];
    /** Log entry that led here. */
    cause?: number;
    /** Routing: the link and node that wait for the answer, or the response round. */
    link?: number;
    path?: string;
    round?: number;
}

export type Answer =
    /** Decline an optional prompt / pass in a response round / "no" to a confirm. */
    | { skip: true }
    | { confirm: true }
    | { cards: CardID[] }
    | { players: PlayerID[] }
    | { mode: number };

/** A response round: every eligible player may answer the top pile entry with an Instant, or pass. */
export interface ResponseRound {
    id: number;
    /** Index of the pile entry being answered. */
    subject: number;
    /** Players who were asked, and whether they have passed. */
    votes: Record<PlayerID, 'undecided' | 'pass'>;
}

// ─── Log ──────────────────────────────────────────────────────────────────────

export interface LogEntry {
    id: number;
    turn: number;
    phase: Phase;
    /** The entry that caused this one — the log is a tree. */
    parent?: number;
    kind: 'event' | 'decision' | 'info';
    verb: Verb;
    actor: PlayerID;
    source?: { card: CardID; ability?: number };
    role?: 'cost' | 'effect' | 'trigger' | 'rule';
    cards?: CardID[];
    from?: ZoneRef;
    to?: ZoneRef;
    players?: PlayerID[];
    count?: number;
    /** Chosen mode (text) for decisions. */
    text?: string;
    outcome?: 'done' | 'prevented' | 'fizzled' | 'declined' | 'neighed';
    reason?: Reason;
    /** Who may see the cards of this entry. */
    visibility: 'public' | PlayerID[];
    /** What everyone else sees when the entry is not public. */
    publicText?: 'count-only';
}

// ─── Game ─────────────────────────────────────────────────────────────────────

export interface GameOver {
    winners: PlayerID[];
    /** First winner, for code that expects a single one. */
    winner?: PlayerID;
    reason: 'unicorns' | 'deckOut' | 'aborted';
    aborted?: boolean;
}

export interface GameState {
    players: Player[];
    /** Every card instance of the game; the index is the card id. */
    cards: CardInstance[];
    zones: Zones;
    cardState: Record<CardID, CardState>;
    turn: TurnState;
    /** Players who take an extra turn after the current one, in order. */
    extraTurns: PlayerID[];
    /** Effects waiting to resolve or resolving; the last link is the top. */
    chain: Link[];
    /** Open decisions, possibly for several players at once. */
    prompts: Prompt[];
    round?: ResponseRound;
    /** Outcome of the last play, for sounds and banners. */
    lastPlay?: { id: number; card: CardID; player: PlayerID; result: 'played' | 'neighed' };
    log: LogEntry[];
    /** Deterministic id counter. */
    seq: number;
    options: GameOptions;
    gameOver?: GameOver;

    // ── pregame / lobby ──
    babyStarter: { cardID: CardID; owner: PlayerID }[];
    ready: Record<PlayerID, boolean>;
    owner: PlayerID;
    lastHeartbeat: Record<PlayerID, number>;

    // ── sandbox ──
    sandbox?: boolean;
    sandboxSettings?: { infiniteActions: boolean; skipNeigh: boolean };
}

/** Source of randomness. In the game this is boardgame.io's seeded `ctx.random`. */
export interface Rng {
    shuffle<T>(items: T[]): T[];
    /** Integer in [0, n). */
    int(n: number): number;
}

export function nextId(G: GameState): number {
    G.seq += 1;
    return G.seq;
}

/** Players in seat order, starting with `first`. */
export function playersFrom(G: GameState, first: PlayerID): PlayerID[] {
    const ids = G.players.map(p => p.id);
    const start = Math.max(0, ids.indexOf(first));
    return [...ids.slice(start), ...ids.slice(0, start)];
}
