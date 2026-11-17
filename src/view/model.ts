// What a player sees and may do, derived from the game state (expansion-plan.md section 6).
//
// Everything here is pure and device-independent: the desktop board and the mobile board render the
// same model. A player is either answering a prompt, voting in a response round, taking one of the
// free actions of their turn, or waiting.

import * as engine from '../game/engine';
import type { Answer, CardID, FreeActions, GameState, PlayerID, Prompt } from '../game/engine';
import { sentence } from '../game/engine/describe';
import { getDef } from '../game/cards/registry';

// ─── Model ────────────────────────────────────────────────────────────────────

export interface BotOption {
    /** Index into `G.turn.bot`. */
    index: number;
    card: CardID;
    /** What the ability does, e.g. "You may DISCARD a card, then …". */
    label: string;
}

/** A card that is being played and the Instants played in answer to it. */
export interface RoundModel {
    /** The card that was played first. */
    card: CardID;
    by: PlayerID;
    /** Destination stable, when it is not the player's own. */
    target?: PlayerID;
    /** Instant cards played so far, oldest first. */
    responses: { card: CardID; by: PlayerID }[];
    /** Who played the entry that is being answered now. */
    topBy: PlayerID;
    /** As things stand, the original card will be stopped. */
    stopped: boolean;
    /** Players who have not answered yet. */
    undecided: PlayerID[];
    iPassed: boolean;
}

export interface BoardModel {
    me: PlayerID;
    started: boolean;
    over: boolean;
    turnPlayer: PlayerID;
    isMyTurn: boolean;
    phase: engine.Phase;
    /** The decision I have to make now (not a response round). */
    prompt?: Prompt;
    /** My open vote in the response round. */
    respond?: Prompt;
    /** The response round that is going on, if any. */
    round?: RoundModel;
    free: FreeActions;
    /** Begin-of-turn abilities I may use now. */
    bot: BotOption[];
    /** Open decisions of the other players. */
    waitingFor: Prompt[];
    /** The deck ran out since this turn began and the discard pile was shuffled into it. */
    reshuffled: boolean;
}

const NO_FREE: FreeActions = { drawForTurn: false, drawForAction: false, endTurn: false, bot: [], play: [] };

function roundModel(G: GameState, me: PlayerID): RoundModel | undefined {
    const round = G.round;
    const pile = G.zones.pile;
    if (!round || pile.length === 0) return undefined;

    // The same walk the engine does when everybody has passed: each Neigh stops the entry below it.
    const cancelled = pile.map(e => e.cancelled === true);
    for (let i = pile.length - 1; i >= 1; i--) {
        if (cancelled[i]) continue;
        const instant = engine.defOf(G, pile[i].card).abilities.find(a => a.kind === 'instant');
        if (instant && instant.kind === 'instant' && instant.effect.op === 'neigh') cancelled[i - 1] = true;
    }

    const original = pile[0];
    return {
        card: original.card,
        by: original.player,
        target: original.target !== undefined && original.target !== original.player ? original.target : undefined,
        responses: pile.slice(1).map(e => ({ card: e.card, by: e.player })),
        topBy: pile[pile.length - 1].player,
        stopped: cancelled[0],
        undecided: Object.keys(round.votes).filter(p => round.votes[p] === 'undecided'),
        iPassed: round.votes[me] === 'pass',
    };
}

/** Did the rules reshuffle the discard pile into the deck at the start of this turn or during it? */
function reshuffledThisTurn(G: GameState): boolean {
    for (let i = G.log.length - 1; i >= 0; i--) {
        const entry = G.log[i];
        if (entry.verb === 'shuffle' && entry.role === 'rule') return true;
        // The reshuffle at the start of a turn is logged just before the turn header.
        if (entry.verb === 'turnStart') {
            const before = G.log[i - 1];
            return before !== undefined && before.verb === 'shuffle' && before.role === 'rule';
        }
    }
    return false;
}

export function getBoardModel(G: GameState, me: PlayerID): BoardModel {
    const seated = G.players.some(p => p.id === me);
    const mine = G.prompts.filter(p => p.player === me);
    const free = seated ? engine.freeActions(G, me) : NO_FREE;
    const bot: BotOption[] = free.bot.map(index => {
        const effect = engine.botAbilityEffect(G, index);
        return { index, card: G.turn.bot[index].card, label: effect ? sentence(engine.describeEffect(effect)) : 'Use this card' };
    });
    return {
        me,
        started: G.turn.number > 0,
        over: G.gameOver !== undefined,
        turnPlayer: G.turn.player,
        isMyTurn: G.turn.number > 0 && G.turn.player === me,
        phase: G.turn.phase,
        prompt: mine.find(p => p.kind !== 'respond'),
        respond: mine.find(p => p.kind === 'respond'),
        round: roundModel(G, me),
        free,
        bot,
        waitingFor: G.prompts.filter(p => p.player !== me),
        reshuffled: reshuffledThisTurn(G),
    };
}

// ─── Local interaction state ──────────────────────────────────────────────────

/** What the board remembers between clicks. Reset whenever the open prompt changes. */
export interface UiState {
    /** Cards picked so far for a prompt that asks for more than one. */
    selected: CardID[];
    /** A hand card that waits for its destination stable. */
    pendingPlay?: CardID;
}

export const EMPTY_UI: UiState = { selected: [] };

export type CardMark =
    /** Can be chosen for the open prompt. */
    | 'candidate'
    /** Chosen for the open prompt, or the hand card that waits for its destination. */
    | 'selected'
    /** Hand card that can be played now. */
    | 'playable'
    /** Stable card whose begin-of-turn ability can be used now. */
    | 'ability'
    /** Instant card that can answer the card being played. */
    | 'respond';

/** The cards a click does something on, and what kind of thing. */
export function cardMarks(model: BoardModel, ui: UiState = EMPTY_UI): Map<CardID, CardMark> {
    const marks = new Map<CardID, CardMark>();
    if (model.respond) {
        engine.candidateCards(model.respond).forEach(c => marks.set(c, 'respond'));
        return marks;
    }
    if (model.prompt) {
        if (model.prompt.kind === 'chooseCards') {
            engine.candidateCards(model.prompt).forEach(c => marks.set(c, ui.selected.includes(c) ? 'selected' : 'candidate'));
        }
        return marks;
    }
    if (ui.pendingPlay !== undefined) {
        marks.set(ui.pendingPlay, 'selected');
        return marks;
    }
    model.free.play.forEach(p => marks.set(p.card, 'playable'));
    model.bot.forEach(b => marks.set(b.card, 'ability'));
    return marks;
}

/** Stables the hand card may be played into. */
export function playTargetsOf(model: BoardModel, card: CardID): PlayerID[] {
    return model.free.play.find(p => p.card === card)?.targets ?? [];
}

/** Does playing this hand card need a destination first? Unicorns go into the own stable without asking. */
export function needsTarget(G: GameState, model: BoardModel, card: CardID): boolean {
    const type = getDef(G.cards[card].def).type;
    if (type === 'upgrade' || type === 'downgrade') return true;
    return playTargetsOf(model, card).some(p => p !== model.me);
}

/** The players (stables) a click does something on right now. */
export function playerTargets(model: BoardModel, ui: UiState = EMPTY_UI): PlayerID[] {
    if (model.prompt) {
        const kind = model.prompt.kind;
        return kind === 'choosePlayers' || kind === 'chooseStable' ? engine.candidatePlayers(model.prompt) : [];
    }
    if (model.respond) return [];
    return ui.pendingPlay !== undefined ? playTargetsOf(model, ui.pendingPlay) : [];
}

export type DeckAction = 'drawForTurn' | 'drawForAction';

/** What a click on the deck does, if anything. */
export function deckAction(model: BoardModel): DeckAction | undefined {
    if (model.prompt || model.respond) return undefined;
    if (model.free.drawForTurn) return 'drawForTurn';
    if (model.free.drawForAction) return 'drawForAction';
    return undefined;
}

/** Ending the turn is the only thing left to do (used by the auto-end-turn setting). */
export function onlyEndTurnLeft(model: BoardModel): boolean {
    const f = model.free;
    return !model.prompt && !model.respond && f.endTurn && !f.drawForTurn && !f.drawForAction
        && f.play.length === 0 && f.bot.length === 0;
}

// ─── Card pickers for zones that are not on the table ─────────────────────────

export interface FinderModel {
    promptId: string;
    title: string;
    zone: 'discard' | 'nursery' | 'deck' | 'hand';
    /** Whose hand is being looked at. */
    owner?: PlayerID;
    cards: CardID[];
    optional: boolean;
    max: number;
}

/**
 * A prompt whose candidates are not visible on the table (discard pile, Nursery, deck, another
 * player's hand) is answered in an overlay that lists them.
 */
export function finderFor(model: BoardModel): FinderModel | undefined {
    const prompt = model.prompt;
    if (!prompt || prompt.kind !== 'chooseCards') return undefined;
    const first = prompt.candidates.find(c => 'card' in c);
    if (!first || !('card' in first)) return undefined;
    const offTable = first.zone === 'discard' || first.zone === 'nursery' || first.zone === 'deck'
        || (first.zone === 'hand' && first.owner !== model.me);
    if (!offTable) return undefined;
    return {
        promptId: prompt.id,
        title: prompt.title,
        zone: first.zone as FinderModel['zone'],
        owner: first.zone === 'hand' ? first.owner : undefined,
        cards: engine.candidateCards(prompt),
        optional: prompt.optional,
        max: prompt.max,
    };
}

// ─── Clicks ───────────────────────────────────────────────────────────────────

/** What the board should do in answer to a click: send a move, change its local state, or nothing. */
export type Outcome =
    | { move: 'respond'; promptId: string; answer: Answer }
    | { move: 'playCard'; card: CardID; target?: PlayerID }
    | { move: 'useBotAbility'; index: number }
    | { move: DeckAction }
    | { move: 'endTurn' }
    | { ui: UiState }
    | undefined;

export function clickCard(G: GameState, model: BoardModel, ui: UiState, card: CardID): Outcome {
    if (model.respond) {
        return engine.candidateCards(model.respond).includes(card)
            ? { move: 'respond', promptId: model.respond.id, answer: { cards: [card] } }
            : undefined;
    }
    const prompt = model.prompt;
    if (prompt) {
        if (prompt.kind !== 'chooseCards' || !engine.candidateCards(prompt).includes(card)) return undefined;
        if (prompt.max <= 1) return { move: 'respond', promptId: prompt.id, answer: { cards: [card] } };
        if (ui.selected.includes(card)) return { ui: { ...ui, selected: ui.selected.filter(c => c !== card) } };
        if (ui.selected.length >= prompt.max) return undefined;
        return { ui: { ...ui, selected: [...ui.selected, card] } };
    }
    if (ui.pendingPlay === card) return { ui: { ...ui, pendingPlay: undefined } };
    if (model.free.play.some(p => p.card === card)) {
        return needsTarget(G, model, card) ? { ui: { ...ui, pendingPlay: card } } : { move: 'playCard', card };
    }
    const ability = model.bot.find(b => b.card === card);
    if (ability && ui.pendingPlay === undefined) return { move: 'useBotAbility', index: ability.index };
    return undefined;
}

export function clickPlayer(model: BoardModel, ui: UiState, player: PlayerID): Outcome {
    if (!playerTargets(model, ui).includes(player)) return undefined;
    if (model.prompt) return { move: 'respond', promptId: model.prompt.id, answer: { players: [player] } };
    if (ui.pendingPlay !== undefined) return { move: 'playCard', card: ui.pendingPlay, target: player };
    return undefined;
}

export function clickDeck(model: BoardModel): Outcome {
    const action = deckAction(model);
    return action ? { move: action } : undefined;
}

/** The answer for a multi-card prompt once enough cards are picked. */
export function submitSelection(model: BoardModel, ui: UiState): Outcome {
    const prompt = model.prompt;
    if (!prompt || prompt.kind !== 'chooseCards') return undefined;
    if (ui.selected.length < prompt.min || ui.selected.length > prompt.max) return undefined;
    return { move: 'respond', promptId: prompt.id, answer: { cards: ui.selected } };
}

/** Plays the first Instant that can answer; a plain Neigh is preferred over a Super Neigh. */
export function playInstant(G: GameState, model: BoardModel): Outcome {
    if (!model.respond) return undefined;
    const cards = engine.candidateCards(model.respond);
    if (cards.length === 0) return undefined;
    const plain = cards.find(c => G.cards[c].def === 'neigh');
    return { move: 'respond', promptId: model.respond.id, answer: { cards: [plain ?? cards[0]] } };
}

export function pass(model: BoardModel): Outcome {
    return model.respond ? { move: 'respond', promptId: model.respond.id, answer: { skip: true } } : undefined;
}
