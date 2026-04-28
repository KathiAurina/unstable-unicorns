import {
    sandboxAddToHand, sandboxAddToStable, sandboxAddToDiscard, sandboxAddToDeckTop,
    sandboxAddToNursery, sandboxDraw, sandboxDiscardRandom, sandboxEmptyHand,
    sandboxForceEndTurn, sandboxReshuffleDiscard, sandboxAddEffect, sandboxRemoveEffect,
    sandboxClearAllEffects, sandboxClearSceneQueue, sandboxCancelNeigh, sandboxLoadState,
    sandboxSetSetting, sandboxResolveNeighAsPlayed,
    sandboxBounceCard, sandboxDestroyCard, sandboxStealCard, sandboxHandToStable,
    sandboxForceDiscardCard,
} from './sandboxMoves';

export const sandboxStageMoves = {
    sandboxAddToHand, sandboxAddToStable, sandboxAddToDiscard, sandboxAddToDeckTop,
    sandboxAddToNursery, sandboxDraw, sandboxDiscardRandom, sandboxEmptyHand,
    sandboxForceEndTurn, sandboxReshuffleDiscard, sandboxAddEffect, sandboxRemoveEffect,
    sandboxClearAllEffects, sandboxClearSceneQueue, sandboxCancelNeigh, sandboxLoadState,
    sandboxSetSetting, sandboxResolveNeighAsPlayed,
    sandboxBounceCard, sandboxDestroyCard, sandboxStealCard, sandboxHandToStable,
    sandboxForceDiscardCard,
};
