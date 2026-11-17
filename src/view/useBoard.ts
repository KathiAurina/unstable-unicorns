// The interaction logic of a board as one hook, shared by the desktop and the mobile board.
// Components render what it returns and forward clicks; they never look at prompts themselves.

import { useMemo, useState } from 'react';
import type { CardID, GameState, PlayerID, Prompt } from '../game/engine';
import { candidateCards } from '../game/engine';
import type { Moves } from '../game/game';
import type { BoardModel, CardMark, DeckAction, FinderModel, Outcome, UiState } from './model';
import {
    cardMarks, clickCard, clickDeck, clickPlayer, deckAction, finderFor, getBoardModel, pass, playInstant,
    playerTargets, submitSelection,
} from './model';
import type { Device, Panel, PanelButton } from './describe';
import { getPanels, infoText } from './describe';

export interface BoardController {
    model: BoardModel;
    ui: UiState;
    /** Cards a click does something on. */
    marks: Map<CardID, CardMark>;
    /** Players (stables) a click does something on. */
    targets: PlayerID[];
    panels: Panel[];
    /** One line about what is going on. */
    info?: string;
    /** The card picker that is open, for prompts about cards that are not on the table. */
    finder?: FinderModel;
    /** What a click on the deck does. */
    deck?: DeckAction;
    canEndTurn: boolean;

    /** Each returns whether the click did something. */
    clickCard: (card: CardID) => boolean;
    clickPlayer: (player: PlayerID) => boolean;
    clickDeck: () => boolean;
    endTurn: () => boolean;
    press: (button: PanelButton) => void;
    /** Response round: play an Instant / pass. */
    playInstant: () => boolean;
    pass: () => boolean;
    closeFinder: () => void;
    cancelPlay: () => void;
}

interface Local {
    selected: CardID[];
    /** The prompt `selected` belongs to. */
    promptId?: string;
    pendingPlay?: CardID;
    /** The prompt whose card picker the player has closed. */
    finderClosedFor?: string;
}

/**
 * @param onMove called with every move that is sent, and the prompt it answers (for sounds).
 */
export function useBoard(
    G: GameState, playerID: PlayerID, moves: Moves, device: Device,
    onMove?: (outcome: Exclude<Outcome, undefined | { ui: UiState }>, prompt: Prompt | undefined) => void,
): BoardController {
    const [local, setLocal] = useState<Local>({ selected: [] });
    const model = useMemo(() => getBoardModel(G, playerID), [G, playerID]);

    // Local state only counts while the situation it was made for still exists.
    const prompt = model.prompt;
    const ui: UiState = useMemo(() => {
        const allowed = prompt && prompt.kind === 'chooseCards' ? candidateCards(prompt) : [];
        const pending = local.pendingPlay;
        return {
            selected: local.promptId === prompt?.id ? local.selected.filter(c => allowed.includes(c)) : [],
            pendingPlay: pending !== undefined && !prompt && !model.respond && model.free.play.some(p => p.card === pending)
                ? pending : undefined,
        };
    }, [local, prompt, model]);

    const send = (outcome: Outcome): boolean => {
        if (!outcome) return false;
        if ('ui' in outcome) {
            setLocal(l => ({ ...l, selected: outcome.ui.selected, pendingPlay: outcome.ui.pendingPlay, promptId: prompt?.id }));
            return true;
        }
        const answered = outcome.move === 'respond' ? G.prompts.find(p => p.id === outcome.promptId) : undefined;
        switch (outcome.move) {
            case 'respond': moves.respond(outcome.promptId, outcome.answer); break;
            case 'playCard': moves.playCard(outcome.card, outcome.target); break;
            case 'useBotAbility': moves.useBotAbility(outcome.index); break;
            case 'drawForTurn': moves.drawForTurn(); break;
            case 'drawForAction': moves.drawForAction(); break;
            case 'endTurn': moves.endTurn(); break;
        }
        onMove?.(outcome, answered);
        setLocal({ selected: [] });
        return true;
    };

    const allFinder = finderFor(model);
    const finder = allFinder && local.finderClosedFor !== allFinder.promptId ? allFinder : undefined;

    return {
        model,
        ui,
        marks: cardMarks(model, ui),
        targets: playerTargets(model, ui),
        panels: getPanels(G, model, ui, device),
        info: infoText(G, model, ui, device),
        finder,
        deck: deckAction(model),
        canEndTurn: model.free.endTurn && !model.prompt && !model.respond,

        clickCard: card => send(clickCard(G, model, ui, card)),
        clickPlayer: player => send(clickPlayer(model, ui, player)),
        clickDeck: () => send(clickDeck(model)),
        endTurn: () => (model.free.endTurn ? send({ move: 'endTurn' }) : false),
        press: button => {
            if (button.disabled) return;
            const action = button.action;
            if ('outcome' in action) { send(action.outcome); return; }
            switch (action.local) {
                case 'openFinder': setLocal(l => ({ ...l, finderClosedFor: undefined })); break;
                case 'cancelPlay': setLocal(l => ({ ...l, pendingPlay: undefined })); break;
                case 'clearSelection': setLocal(l => ({ ...l, selected: [] })); break;
                case 'submitSelection': send(submitSelection(model, ui)); break;
            }
        },
        playInstant: () => send(playInstant(G, model)),
        pass: () => send(pass(model)),
        closeFinder: () => setLocal(l => ({ ...l, finderClosedFor: allFinder?.promptId })),
        cancelPlay: () => setLocal(l => ({ ...l, pendingPlay: undefined })),
    };
}
