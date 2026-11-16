import { CardID, isUnicorn, hasType } from "../card";
import type { UnstableUnicornsGame, Ctx } from "../state";
import { _addSceneFromDo } from "../state";
import type { PlayerID } from "../player";
import { isCardBasicDueToEffect } from "../effect";
import _ from 'underscore';
import { leave } from "./enter";
import { pushLog } from "../log";

import type { DoDestroyInfo } from '../do-types';
export type { DoDestroy } from '../do-types';

export function findOwnerOfCard(G: UnstableUnicornsGame, cardID: CardID): PlayerID | null {
    let playerID: PlayerID | null = null;

    G.players.forEach(pl => {
        if ([...G.stable[pl.id],...G.upgradeDowngradeStable[pl.id]].findIndex(c => c === cardID) > -1) {
            playerID = pl.id;
        }
    });

    return playerID;
}

type ParamDestroy = {
    protagonist: PlayerID;
    cardID: CardID;
}

export function destroy(G: UnstableUnicornsGame, ctx: Ctx, param: ParamDestroy) {
    const card = G.deck[param.cardID];

    const targetPlayer = findOwnerOfCard(G, param.cardID)!;
    leave(G, ctx, { playerID: targetPlayer, cardID: param.cardID });

    if (hasType(card, "baby")) {
        G.nursery.push(param.cardID);
    } else {
        G.discardPile.push(param.cardID);
    }

    const ons = card.on?.filter(on => on.trigger === "this_destroyed_or_sacrificed");
    ons?.forEach(on => {
        // all unicorns are basic — trigger no effect
        if (isCardBasicDueToEffect(G.playerEffects[targetPlayer], card)) return;

        if (on.do.type === "return_to_hand") {
            G.discardPile = _.without(G.discardPile, param.cardID);
            G.hand[targetPlayer] = [...G.hand[targetPlayer], param.cardID];
            pushLog(G, ctx, { actor: targetPlayer, kind: 'return_to_hand', targetCardID: param.cardID, targetPlayer });
        } else if (on.do.type === "add_scene") {
            _addSceneFromDo(G, ctx, card.id, targetPlayer, "any");
        }
    });
}

type DestroyTarget = {
    playerID: PlayerID;
    cardID: CardID;
}

export function findDestroyTargets(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, info: DoDestroyInfo, sourceCard: CardID | undefined): DestroyTarget[] {
    let targets: DestroyTarget[] = [];

    G.players.forEach(pl => {
        // special case
        // this is actually a combination of sacrifice and destroy
        if (info.type === "my_downgrade_other_upgrade") {
            G.upgradeDowngradeStable[pl.id].forEach(cid => {
                const card = G.deck[cid];
                if (pl.id === protagonist && hasType(card, "downgrade")) {
                    targets.push({ playerID: pl.id, cardID: cid });
                } else if (hasType(card, "upgrade")) {
                    targets.push({ playerID: pl.id, cardID: cid });
                }
            });
        }

        if (info.type === "unicorn") {
            G.stable[pl.id].forEach(cid => {
                const card = G.deck[cid];
                if (isUnicorn(card)) {
                    if (sourceCard && hasType(G.deck[sourceCard], "magic") && card.passive?.includes("cannot_be_destroyed_by_magic")) {
                        return;
                    }
                    if (G.playerEffects[pl.id].find(s => s.effect.key === "your_unicorns_cannot_be_destroyed")) {
                        return;
                    }
                    if (G.playerEffects[pl.id].find(s => s.effect.key === "pandamonium")) {
                        return;
                    }
                    targets.push({ playerID: pl.id, cardID: cid });
                }
            });
        } else if (info.type === "upgrade") {
            G.upgradeDowngradeStable[pl.id].forEach(cid => {
                const card = G.deck[cid];
                if (hasType(card, "upgrade")) {
                    targets.push({ playerID: pl.id, cardID: cid });
                }
            });
        } else if (info.type === "any") {
            G.stable[pl.id].forEach(cid => {
                const card = G.deck[cid];
                if (isUnicorn(card)) {
                    if (sourceCard && hasType(G.deck[sourceCard], "magic") && card.passive?.includes("cannot_be_destroyed_by_magic")) {
                        return;
                    }
                    if (G.playerEffects[pl.id].find(s => s.effect.key === "your_unicorns_cannot_be_destroyed")) {
                        return;
                    }
                    targets.push({ playerID: pl.id, cardID: cid });
                }
            });
            G.upgradeDowngradeStable[pl.id].forEach(cid => {
                targets.push({ playerID: pl.id, cardID: cid });
            });
        }
    })

    return targets;
}
