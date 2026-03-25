import { CardID, isUnicorn } from "../card";
import type { UnstableUnicornsGame, Ctx } from "../state";
import { _addSceneFromDo } from "../state";
import type { PlayerID } from "../player";
import { isCardBasicDueToEffect } from "../effect";
import _ from 'underscore';
import { leave } from "./enter";

import type { DoSacrificeInfo } from '../do-types';
export type { DoSacrifice, DoSacrificeInfo } from '../do-types';

export type ParamSacrifice = {
    protagonist: PlayerID;
    cardID: CardID;
}

export function sacrifice(G: UnstableUnicornsGame, ctx: Ctx, param: ParamSacrifice) {
    const card = G.deck[param.cardID];

    leave(G, ctx, { playerID: param.protagonist, cardID: param.cardID });

    if (card.type === "baby") {
        G.nursery.push(param.cardID);
    } else {
        G.discardPile.push(param.cardID);
    }

    const ons = card.on?.filter(on => on.trigger === "this_destroyed_or_sacrificed");
    ons?.forEach(on => {
        // all unicorns are basic — trigger no effect
        if (isCardBasicDueToEffect(G.playerEffects[param.protagonist], card)) return;

        if (on.do.type === "return_to_hand") {
            G.discardPile = _.without(G.discardPile, param.cardID);
            G.hand[param.protagonist] = [...G.hand[param.protagonist], param.cardID];
        } else if (on.do.type === "add_scene") {
            _addSceneFromDo(G, ctx, card.id, param.protagonist, "any");
        }
    });
}

export type SacrificeTarget = {
    cardID: CardID;
}

export function findSacrificeTargets(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, info: DoSacrificeInfo): SacrificeTarget[] {
    let targets: SacrificeTarget[] = [];

    if (info.type === "downgrade") {
        G.upgradeDowngradeStable[protagonist].forEach(c => {
            const card = G.deck[c];
            if (card.type === "downgrade") {
                targets.push({ cardID: c });
            }
        })
    }

    if (info.type === "unicorn") {
        G.stable[protagonist].forEach(c => {
            const card = G.deck[c];
            if (isUnicorn(card)) {
                if (G.playerEffects[protagonist].find(s => s.effect.key === "pandamonium") === undefined) {
                    targets.push({ cardID: c });
                }
            }
        })
    }

    if (info.type === "any") {
        targets = G.stable[protagonist].map(c => ({ cardID: c }));
    }

    return targets;
}
