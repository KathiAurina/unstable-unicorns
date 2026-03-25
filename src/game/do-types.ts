// All Do* discriminated-union types live here so that card.ts (Layer 2) can
// reference `Do` without depending on any runtime operation code.
// This file must NOT import from operations/, game.ts, state.ts, or card.ts.

// ─── steal / pull ─────────────────────────────────────────────────────────────

export interface DoSteal {
    key: "steal";
    info: DoStealInfo;
}

export type DoStealInfo = { type: "unicorn" | "upgrade"; unicornSwap?: boolean }

export interface DoPull {
    key: "pull";
}

export interface DoPullRandom {
    key: "pullRandom"
}

// ─── discard ──────────────────────────────────────────────────────────────────

export interface DoDiscard {
    key: "discard";
    info: DoDiscardInfo;
}

export type DoDiscardInfo = {
    count: number;
    type: "any" | "unicorn";
    changeOfLuck?: boolean;
}

// ─── destroy ──────────────────────────────────────────────────────────────────

export interface DoDestroy {
    key: "destroy";
    info: DoDestroyInfo;
}

export type DoDestroyInfo = {
    type: "unicorn" | "upgrade" | "any" | "my_downgrade_other_upgrade";
    count?: number;
}

// ─── sacrifice ────────────────────────────────────────────────────────────────

export interface DoSacrifice {
    key: "sacrifice";
    info: DoSacrificeInfo;
}

export type DoSacrificeInfo = {
    type: "unicorn" | "downgrade" | "this" | "any";
}

// ─── draw ─────────────────────────────────────────────────────────────────────

export interface DoDraw {
    key: "draw";
    info: {
        count: number;
    }
}

// ─── search ───────────────────────────────────────────────────────────────────

export interface DoSearch {
    key: "search";
    info: {
        type: "any" | "unicorn" | "upgrade" | "downgrade" | "narwhal";
    }
}

export type DoSearchInfo = {
    type: "any" | "unicorn" | "upgrade" | "downgrade" | "narwhal";
}

// ─── revive ───────────────────────────────────────────────────────────────────

export interface DoRevive {
    key: "revive";
    info: DoReviveInfo;
}

export type DoReviveInfo = {
    type: "unicorn" | "basic_unicorn";
}

export interface DoAddFromDiscardPileToHand {
    key: "addFromDiscardPileToHand";
    info: DoAddFromDiscardPileToHandInfo;
}

export type DoAddFromDiscardPileToHandInfo = {
    type: "magic" | "unicorn" | "neigh";
}

export interface DoReviveFromNursery {
    key: "reviveFromNursery";
}

// ─── move ─────────────────────────────────────────────────────────────────────

export interface DoReturnToHand {
    key: "returnToHand";
    info: ReturnToHandInfo;
}

export type ReturnToHandInfo = {
    who: "another"
}

export interface DoBringToStable {
    key: "bringToStable";
    info: BringToStableInfo;
}

export type BringToStableInfo = {
    type: "basic_unicorn"
}

export type DoMove = {
    key: "move";
    info: DoMoveInfo;
}

export type DoMoveInfo = {
    type: "upgradeAndDowngrade";
}

export type DoMove2 = {
    key: "move2";
}

export type DoBackKick = {
    key: "backKick"
}

// ─── swap ─────────────────────────────────────────────────────────────────────

export type DoSwapHands = {
    key: "swapHands"
};

export type DoShakeUp = {
    key: "shakeUp";
}

export type DoReset = {
    key: "reset";
}

export type DoShuffleDiscardPileIntoDrawPile = {
    key: "shuffleDiscardPileIntoDrawPile"
}

export type DoUnicornSwap1 = {
    key: "unicornSwap1"
}

export type DoUnicornSwap2 = {
    key: "unicornSwap2"
}

// ─── misc ─────────────────────────────────────────────────────────────────────

export interface DoMakeSomeoneDiscard {
    key: "makeSomeoneDiscard";
}

export type DoBlatantThievery1 = {
    key: "blatantThievery1"
}

// ─── Do union ─────────────────────────────────────────────────────────────────

export type Do = DoSteal | DoPull | DoPullRandom | DoDiscard | DoDestroy | DoSacrifice | DoSearch | DoRevive | DoDraw | DoAddFromDiscardPileToHand | DoReviveFromNursery | DoReturnToHand | DoBringToStable | DoMakeSomeoneDiscard | DoSwapHands | DoShakeUp | DoReset | DoMove | DoMove2 | DoBackKick | DoShuffleDiscardPileIntoDrawPile | DoUnicornSwap1 | DoUnicornSwap2 | DoBlatantThievery1;
