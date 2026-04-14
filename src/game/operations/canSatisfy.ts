import type { UnstableUnicornsGame, Ctx } from "../state";
import type { PlayerID } from "../player";
import type { Do } from "../do-types";
import type { CardID } from "../card";
import { canDiscard, findDiscardTargets } from "./discard";
import { findDestroyTargets } from "./destroy";
import { findSacrificeTargets } from "./sacrifice";
import { findStealTargets } from "./steal";
import { findReviveTarget, findAddFromDiscardPileToHand } from "./revive";
import { findBringToStableTargets, findReturnToHandTargets, findBackKickTargets } from "./move";
import { findSearchTargets } from "./search";
import { findUnicornSwap1Targets } from "./swap";

/**
 * Returns true if the given Do operation can be executed by protagonist
 * (i.e. has at least one valid target, or needs no target).
 * Used to detect unsatisfiable instructions that should be auto-fizzled.
 * sourceCardID should be passed for source-sensitive ops (e.g. destroy checks
 * cannot_be_destroyed_by_magic when the source is a magic card).
 */
export function canSatisfyDo(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, doOp: Do, sourceCardID?: CardID): boolean {
    switch (doOp.key) {
        case "discard":
            return findDiscardTargets(G, ctx, protagonist, doOp.info).length > 0;
        case "destroy":
            return findDestroyTargets(G, ctx, protagonist, doOp.info, sourceCardID).length > 0;
        case "sacrifice":
            return findSacrificeTargets(G, ctx, protagonist, doOp.info).length > 0;
        case "steal":
            return findStealTargets(G, ctx, protagonist, doOp.info).length > 0;
        case "revive":
            return findReviveTarget(G, ctx, protagonist, doOp.info).length > 0;
        case "addFromDiscardPileToHand":
            return findAddFromDiscardPileToHand(G, ctx, protagonist, doOp.info).length > 0;
        case "bringToStable":
            return findBringToStableTargets(G, ctx, protagonist, doOp.info).length > 0;
        case "returnToHand":
            return findReturnToHandTargets(G, ctx, protagonist, doOp.info).length > 0;
        case "search":
            return findSearchTargets(G, ctx, protagonist, doOp.info).length > 0;
        case "backKick":
            return findBackKickTargets(G, ctx, protagonist).length > 0;
        case "reviveFromNursery":
            return G.nursery.length > 0;
        case "unicornSwap1":
            return findUnicornSwap1Targets(G, ctx, protagonist).length > 0;
        // draw, shakeUp, reset, swapHands, unicornSwap2, pullRandom, etc. are always satisfiable
        default:
            return true;
    }
}

/**
 * Returns true if a discard cost can be fully paid (enough cards in hand).
 * Use this to block the opt-in popup when the cost is unpayable.
 */
export { canDiscard as canPayDiscardCost };
