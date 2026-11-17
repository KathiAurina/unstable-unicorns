import { useEffect } from 'react';
import { candidateCards } from '../game/engine';
import { onlyEndTurnLeft } from '../view/model';
import type { BoardController } from '../view/useBoard';
import type { GameSettings } from './useGameSettings';

const DELAY_MS = 400;

/**
 * The two client-side conveniences of the settings menu:
 *  - end the turn automatically when that is the only thing left to do
 *  - pass automatically in a response round when holding no card that could answer
 */
export function useAutoActions(
    board: BoardController,
    settings: Pick<GameSettings, 'autoEndTurn' | 'autoDontNeigh'>,
) {
    const { model } = board;

    const shouldEndTurn = settings.autoEndTurn && board.ui.pendingPlay === undefined && onlyEndTurnLeft(model);
    const turnKey = `${model.turnPlayer}:${model.phase}`;
    useEffect(() => {
        if (!shouldEndTurn) return undefined;
        const timer = setTimeout(() => board.endTurn(), DELAY_MS);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldEndTurn, turnKey]);

    const respondId = model.respond?.id;
    const shouldPass = settings.autoDontNeigh && model.respond !== undefined && candidateCards(model.respond).length === 0;
    useEffect(() => {
        if (!shouldPass) return undefined;
        const timer = setTimeout(() => board.pass(), DELAY_MS);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldPass, respondId]);
}
