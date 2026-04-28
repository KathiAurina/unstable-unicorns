/**
 * Shared types that were previously typed as `any`.
 * Centralised here to make the type surface explicit and searchable.
 */

import type { CardID } from './card';
import type { PlayerID } from './player';
import type { Effect } from './effect';

// ─── Clipboard ────────────────────────────────────────────────────────────────
// Temporary multi-step operation state stored on G.clipboard.

export type Clipboard = {
    /** Intermediate state for the unicornSwap two-step move. */
    unicornSwap?: {
        /** Set in step 1: which card is being moved. */
        cardIDToMove?: CardID;
        /** Set in step 2: which player the card is being moved to (used to filter steal targets). */
        targetPlayer?: PlayerID;
    };
    /** Intermediate state for the move two-step move. */
    move?: {
        cardID: CardID;
        from: PlayerID;
    };
};

// ─── SetupData ────────────────────────────────────────────────────────────────
// Passed as second argument to Game.setup(). Currently unused.

export type SetupData = {
    matchName?: string;
    ownerPlayerID?: PlayerID;
    sandbox?: boolean;
} | undefined;

// ─── BoardStateInfo ───────────────────────────────────────────────────────────
// The typed replacement for `info?: { [key: string]: any }` on BoardState.

export type BoardStateInfo = {
    /** Always present on execution states. Optional only because some BoardState types carry no info. */
    instructionID: string;
    sourceCardID?: CardID;
    /**
     * Target list — shape varies per BoardStateKey.
     * Typed as any[] for now; Phase 7 (BoardStateManager discriminated union) will make this fully typed.
     * eslint-disable-next-line @typescript-eslint/no-explicit-any
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    targets?: any[];
    count?: number;
    singleActionText?: string;
};

// ─── Moves ────────────────────────────────────────────────────────────────────
// Typed move interface matching game.ts stage definitions, used in Board.tsx Props.

export type Moves = {
    // beginning + action_phase
    drawAndAdvance: () => void;
    /**
     * instructionID is string | undefined to match Board.tsx optional-chain calls.
     * param uses an index signature to allow operation-specific fields (cardID, handIndex, etc.)
     * that are dispatched via KeyToFunc at runtime.
     */
    executeDo: (instructionID: string | undefined, param: { protagonist: PlayerID; [key: string]: unknown }) => void;
    end: (protagonist: PlayerID) => void;
    commit: (sceneID: string) => void;
    skipExecuteDo: (protagonist: PlayerID, instructionID: string) => void;
    // action_phase only
    /** Board.tsx passes playerID as arg (ignored by game.ts), so typed as optional. */
    drawAndEnd: (_protagonist?: PlayerID) => void;
    playCard: (protagonist: PlayerID, cardID: CardID) => void;
    playUpgradeDowngradeCard: (protagonist: PlayerID, targetPlayer: PlayerID, cardID: CardID) => void;
    playNeigh: (cardID: CardID, protagonist: PlayerID, roundIndex: number) => void;
    playSuperNeigh: (cardID: CardID, protagonist: PlayerID, roundIndex: number) => void;
    dontPlayNeigh: (protagonist: PlayerID, roundIndex: number) => void;
    // pregame
    ready: (protagonist: PlayerID) => void;
    selectBaby: (protagonist: PlayerID, cardID: CardID) => void;
    deselectBaby: (protagonist: PlayerID) => void;
    changeName: (protagonist: PlayerID, name: string) => void;
    abolishGame: (protagonist: PlayerID) => void;
    heartbeat: (protagonist: PlayerID) => void;
    cancelAbandonedGame: () => void;
    // sandbox cheat moves (only active when G.sandbox === true)
    sandboxAddToHand: (playerID: PlayerID, defIndex: number) => void;
    sandboxAddToStable: (playerID: PlayerID, defIndex: number, withEnter: boolean) => void;
    sandboxAddToDiscard: (defIndex: number) => void;
    sandboxAddToDeckTop: (defIndex: number) => void;
    sandboxAddToNursery: (defIndex: number) => void;
    sandboxDraw: (playerID: PlayerID, count: number) => void;
    sandboxDiscardRandom: (playerID: PlayerID) => void;
    sandboxEmptyHand: (playerID: PlayerID) => void;
    sandboxForceEndTurn: () => void;
    sandboxReshuffleDiscard: () => void;
    sandboxAddEffect: (playerID: PlayerID, effectKey: Effect["key"]) => void;
    sandboxRemoveEffect: (playerID: PlayerID, index: number) => void;
    sandboxClearAllEffects: () => void;
    sandboxClearSceneQueue: () => void;
    sandboxCancelNeigh: () => void;
    sandboxLoadState: (snapshot: any) => void;
    sandboxSetSetting: (key: "infiniteActions" | "skipNeigh", value: boolean) => void;
    sandboxResolveNeighAsPlayed: () => void;
    sandboxBounceCard: (cardID: CardID) => void;
    sandboxDestroyCard: (cardID: CardID) => void;
    sandboxStealCard: (cardID: CardID, toPlayerID: PlayerID) => void;
    sandboxHandToStable: (cardID: CardID, toPlayerID: PlayerID) => void;
    sandboxForceDiscardCard: (playerID: PlayerID, cardID: CardID) => void;
};
