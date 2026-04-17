import { useEffect, useRef } from 'react';
import { hasType } from '../game/card';
import type { UnstableUnicornsGame, Ctx } from '../game/state';
import type { PlayerID } from '../game/player';
import type { Moves } from '../game/types';
import type { BoardState } from '../BoardStateManager';
import type { GameSettings } from './useGameSettings';

export function useAutoActions(
    G: UnstableUnicornsGame,
    ctx: Ctx,
    playerID: PlayerID,
    moves: Moves,
    settings: Pick<GameSettings, 'autoEndTurn' | 'autoDontNeigh'>,
    boardStates: BoardState[],
) {
    const endTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dontNeighTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-end-turn: fires when the only available action is ending the turn
    useEffect(() => {
        if (endTurnTimerRef.current) {
            clearTimeout(endTurnTimerRef.current);
            endTurnTimerRef.current = null;
        }

        if (!settings.autoEndTurn) return;
        if (boardStates.length === 1 && boardStates[0].type === 'endTurn') {
            endTurnTimerRef.current = setTimeout(() => {
                moves.end(playerID);
            }, 400);
        }

        return () => {
            if (endTurnTimerRef.current) {
                clearTimeout(endTurnTimerRef.current);
                endTurnTimerRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boardStates, settings.autoEndTurn, playerID]);

    // Auto-don't-neigh: fires when player must vote but has no neigh cards
    useEffect(() => {
        if (dontNeighTimerRef.current) {
            clearTimeout(dontNeighTimerRef.current);
            dontNeighTimerRef.current = null;
        }

        if (!boardStates.find(s => s.type === 'neigh__playNeigh')) return;
        if (!G.neighDiscussion) return;

        const cannotPlayNeigh = G.playerEffects[playerID]?.some(e => e.effect.key === 'you_cannot_play_neigh');

        if (!cannotPlayNeigh) {
            if (!settings.autoDontNeigh) return;
            const hasNeighCard = G.hand[playerID].some(cid => {
                const card = G.deck[cid];
                return card && (hasType(card, 'neigh') || hasType(card, 'super_neigh'));
            });
            if (hasNeighCard) return;
        }

        const roundIndex = G.neighDiscussion.rounds.length - 1;
        dontNeighTimerRef.current = setTimeout(() => {
            moves.dontPlayNeigh(playerID, roundIndex);
        }, 400);

        return () => {
            if (dontNeighTimerRef.current) {
                clearTimeout(dontNeighTimerRef.current);
                dontNeighTimerRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [G.neighDiscussion, boardStates, settings.autoDontNeigh, playerID]);
}
