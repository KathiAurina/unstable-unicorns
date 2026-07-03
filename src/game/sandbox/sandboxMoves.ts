import { INVALID_MOVE } from 'boardgame.io/core';
import type { UnstableUnicornsGame, Ctx } from '../state';
import type { CardID } from '../card';
import { Cards, hasType } from '../card';
import { draw, enter } from '../operations';
import type { Effect } from '../effect';
import type { PlayerID } from '../player';
import _ from 'underscore';

function guard(G: UnstableUnicornsGame) {
    if (!G.sandbox) return INVALID_MOVE as any;
    return null;
}

function spawnCard(G: UnstableUnicornsGame, defIndex: number): CardID {
    const def = Cards[defIndex];
    const newID = G.deck.length;
    G.deck = [...G.deck, { ...def, id: newID }];
    return newID;
}

export function sandboxAddToHand(G: UnstableUnicornsGame, ctx: Ctx, playerID: PlayerID, defIndex: number) {
    const err = guard(G); if (err) return err;
    const cardID = spawnCard(G, defIndex);
    G.hand[playerID] = [...G.hand[playerID], cardID];
}

export function sandboxAddToStable(G: UnstableUnicornsGame, ctx: Ctx, playerID: PlayerID, defIndex: number, withEnter: boolean) {
    const err = guard(G); if (err) return err;
    const cardID = spawnCard(G, defIndex);
    if (withEnter) {
        enter(G, ctx, { playerID, cardID });
    } else {
        const card = G.deck[cardID];
        if (hasType(card, 'upgrade') || hasType(card, 'downgrade')) {
            G.upgradeDowngradeStable[playerID] = [...G.upgradeDowngradeStable[playerID], cardID];
        } else if (hasType(card, 'magic')) {
            G.temporaryStable[playerID] = [...G.temporaryStable[playerID], cardID];
        } else {
            G.stable[playerID] = [...G.stable[playerID], cardID];
        }
    }
}

export function sandboxAddToDiscard(G: UnstableUnicornsGame, ctx: Ctx, defIndex: number) {
    const err = guard(G); if (err) return err;
    const cardID = spawnCard(G, defIndex);
    G.discardPile = [...G.discardPile, cardID];
}

export function sandboxAddToDeckTop(G: UnstableUnicornsGame, ctx: Ctx, defIndex: number) {
    const err = guard(G); if (err) return err;
    const cardID = spawnCard(G, defIndex);
    G.drawPile = [cardID, ...G.drawPile];
}

export function sandboxAddToNursery(G: UnstableUnicornsGame, ctx: Ctx, defIndex: number) {
    const err = guard(G); if (err) return err;
    const cardID = spawnCard(G, defIndex);
    G.nursery = [...G.nursery, cardID];
}

export function sandboxDraw(G: UnstableUnicornsGame, ctx: Ctx, playerID: PlayerID, count: number) {
    const err = guard(G); if (err) return err;
    draw(G, ctx, { protagonist: playerID, count });
}

export function sandboxDiscardRandom(G: UnstableUnicornsGame, ctx: Ctx, playerID: PlayerID) {
    const err = guard(G); if (err) return err;
    if (G.hand[playerID].length === 0) return;
    const idx = Math.floor(Math.random() * G.hand[playerID].length);
    const cardID = G.hand[playerID][idx];
    G.hand[playerID] = G.hand[playerID].filter((_, i) => i !== idx);
    G.discardPile = [...G.discardPile, cardID];
}

export function sandboxEmptyHand(G: UnstableUnicornsGame, ctx: Ctx, playerID: PlayerID) {
    const err = guard(G); if (err) return err;
    G.discardPile = [...G.discardPile, ...G.hand[playerID]];
    G.hand[playerID] = [];
}

export function sandboxForceEndTurn(G: UnstableUnicornsGame, ctx: Ctx) {
    const err = guard(G); if (err) return err;
    ctx.events?.endTurn!();
}

export function sandboxReshuffleDiscard(G: UnstableUnicornsGame, ctx: Ctx) {
    const err = guard(G); if (err) return err;
    G.drawPile = [...G.drawPile, ..._.shuffle(G.discardPile)];
    G.discardPile = [];
}

// ─── Effects ──────────────────────────────────────────────────────────────────

export function sandboxAddEffect(G: UnstableUnicornsGame, ctx: Ctx, playerID: PlayerID, effectKey: Effect["key"]) {
    const err = guard(G); if (err) return err;
    G.playerEffects[playerID] = [...G.playerEffects[playerID], { effect: { key: effectKey } }];
}

export function sandboxRemoveEffect(G: UnstableUnicornsGame, ctx: Ctx, playerID: PlayerID, index: number) {
    const err = guard(G); if (err) return err;
    G.playerEffects[playerID] = G.playerEffects[playerID].filter((_, i) => i !== index);
}

export function sandboxClearAllEffects(G: UnstableUnicornsGame, ctx: Ctx) {
    const err = guard(G); if (err) return err;
    Object.keys(G.playerEffects).forEach(pid => { G.playerEffects[pid] = []; });
}

// ─── Flow ─────────────────────────────────────────────────────────────────────

export function sandboxClearSceneQueue(G: UnstableUnicornsGame, ctx: Ctx) {
    const err = guard(G); if (err) return err;
    G.script = { scenes: [] };
}

export function sandboxCancelNeigh(G: UnstableUnicornsGame, ctx: Ctx) {
    const err = guard(G); if (err) return err;
    G.neighDiscussion = undefined;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export type SandboxSettingKey = keyof NonNullable<UnstableUnicornsGame["sandboxSettings"]>;

export function sandboxSetSetting(G: UnstableUnicornsGame, ctx: Ctx, key: SandboxSettingKey, value: boolean) {
    const err = guard(G); if (err) return err;
    if (!G.sandboxSettings) return INVALID_MOVE as any;
    G.sandboxSettings[key] = value;
}

// ─── Resolve Neigh as played (fallback for skipNeigh watcher) ─────────────────

export function sandboxResolveNeighAsPlayed(G: UnstableUnicornsGame, ctx: Ctx) {
    const err = guard(G); if (err) return err;
    if (!G.neighDiscussion) return;
    const { target, cardID } = G.neighDiscussion;
    G.neighDiscussion = undefined;
    enter(G, ctx, { playerID: target, cardID });
}

// ─── Interactive quick actions ────────────────────────────────────────────────

export function sandboxBounceCard(G: UnstableUnicornsGame, ctx: Ctx, cardID: CardID) {
    const err = guard(G); if (err) return err;
    const owner = findOwnerOfCard(G, cardID);
    if (!owner) return;
    const card = G.deck[cardID];
    G.stable[owner] = _.without(G.stable[owner], cardID);
    G.upgradeDowngradeStable[owner] = _.without(G.upgradeDowngradeStable[owner], cardID);
    G.temporaryStable[owner] = _.without(G.temporaryStable[owner], cardID);
    if (hasType(card, "baby")) {
        G.nursery = [...G.nursery, cardID];
    } else {
        G.hand[owner] = [...G.hand[owner], cardID];
    }
}

export function sandboxDestroyCard(G: UnstableUnicornsGame, ctx: Ctx, cardID: CardID) {
    const err = guard(G); if (err) return err;
    const owner = findOwnerOfCard(G, cardID);
    if (!owner) return;
    const card = G.deck[cardID];
    G.stable[owner] = _.without(G.stable[owner], cardID);
    G.upgradeDowngradeStable[owner] = _.without(G.upgradeDowngradeStable[owner], cardID);
    G.temporaryStable[owner] = _.without(G.temporaryStable[owner], cardID);
    if (hasType(card, "baby")) {
        G.nursery = [...G.nursery, cardID];
    } else {
        G.discardPile = [...G.discardPile, cardID];
    }
}

export function sandboxStealCard(G: UnstableUnicornsGame, ctx: Ctx, cardID: CardID, toPlayerID: PlayerID) {
    const err = guard(G); if (err) return err;
    const owner = findOwnerOfCard(G, cardID);
    if (!owner) return;
    const card = G.deck[cardID];
    G.stable[owner] = _.without(G.stable[owner], cardID);
    G.upgradeDowngradeStable[owner] = _.without(G.upgradeDowngradeStable[owner], cardID);
    G.temporaryStable[owner] = _.without(G.temporaryStable[owner], cardID);
    if (hasType(card, 'upgrade') || hasType(card, 'downgrade')) {
        G.upgradeDowngradeStable[toPlayerID] = [...G.upgradeDowngradeStable[toPlayerID], cardID];
    } else {
        G.stable[toPlayerID] = [...G.stable[toPlayerID], cardID];
    }
}

export function sandboxHandToStable(G: UnstableUnicornsGame, ctx: Ctx, cardID: CardID, toPlayerID: PlayerID) {
    const err = guard(G); if (err) return err;
    let fromPlayer: PlayerID | null = null;
    G.players.forEach(pl => {
        if (G.hand[pl.id].includes(cardID)) fromPlayer = pl.id;
    });
    if (!fromPlayer) return;
    G.hand[fromPlayer] = _.without(G.hand[fromPlayer], cardID);
    const card = G.deck[cardID];
    if (hasType(card, 'upgrade') || hasType(card, 'downgrade')) {
        G.upgradeDowngradeStable[toPlayerID] = [...G.upgradeDowngradeStable[toPlayerID], cardID];
    } else if (hasType(card, 'magic')) {
        G.temporaryStable[toPlayerID] = [...G.temporaryStable[toPlayerID], cardID];
    } else {
        G.stable[toPlayerID] = [...G.stable[toPlayerID], cardID];
    }
}

export function sandboxForceDiscardCard(G: UnstableUnicornsGame, ctx: Ctx, playerID: PlayerID, cardID: CardID) {
    const err = guard(G); if (err) return err;
    if (!G.hand[playerID].includes(cardID)) return;
    G.hand[playerID] = _.without(G.hand[playerID], cardID);
    G.discardPile = [...G.discardPile, cardID];
}

function findOwnerOfCard(G: UnstableUnicornsGame, cardID: CardID): PlayerID | null {
    for (const pl of G.players) {
        if (G.stable[pl.id].includes(cardID) ||
            G.upgradeDowngradeStable[pl.id].includes(cardID) ||
            G.temporaryStable[pl.id].includes(cardID)) {
            return pl.id;
        }
    }
    return null;
}

// ─── State Save/Load ──────────────────────────────────────────────────────────

type SandboxSnapshot = Pick<UnstableUnicornsGame,
    "hand" | "stable" | "temporaryStable" | "upgradeDowngradeStable" |
    "drawPile" | "discardPile" | "nursery" | "playerEffects" | "deck"
>;

export function sandboxLoadState(G: UnstableUnicornsGame, ctx: Ctx, snapshot: SandboxSnapshot) {
    const err = guard(G); if (err) return err;
    G.hand = snapshot.hand;
    G.stable = snapshot.stable;
    G.temporaryStable = snapshot.temporaryStable;
    G.upgradeDowngradeStable = snapshot.upgradeDowngradeStable;
    G.drawPile = snapshot.drawPile;
    G.discardPile = snapshot.discardPile;
    G.nursery = snapshot.nursery;
    G.playerEffects = snapshot.playerEffects;
    G.deck = snapshot.deck;
}

export function serializeSandboxSnapshot(G: UnstableUnicornsGame): SandboxSnapshot {
    return {
        hand: G.hand,
        stable: G.stable,
        temporaryStable: G.temporaryStable,
        upgradeDowngradeStable: G.upgradeDowngradeStable,
        drawPile: G.drawPile,
        discardPile: G.discardPile,
        nursery: G.nursery,
        playerEffects: G.playerEffects,
        deck: G.deck,
    };
}
