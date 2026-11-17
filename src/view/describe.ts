// The one text source for "what should the player do now" (expansion-plan.md section 6).
//
// Desktop and mobile both render the panels produced here; only the verb differs ("Click on" / "Tap").
// A new card needs no UI text: prompt titles come from the effect description of the engine.

import * as engine from '../game/engine';
import type { Answer, CardID, GameState, PlayerID, Prompt } from '../game/engine';
import { cardName, playerName } from './cards';
import type { BoardModel, Outcome, UiState } from './model';
import { EMPTY_UI, deckAction, finderFor, playTargetsOf } from './model';

export type Device = 'desktop' | 'mobile';

const tap = (device: Device): string => (device === 'mobile' ? 'Tap' : 'Click on');

function list(names: string[]): string {
    if (names.length <= 1) return names.join('');
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const REASONS: Record<string, string> = {
    notPossible: 'not possible right now',
    noTarget: 'there is no card to choose',
    protected: 'protected',
    cannotEnter: 'cannot enter that Stable',
    stableFull: 'that Stable is full',
    deckEmpty: 'the deck is empty',
};

export function describeReason(G: GameState, reason: engine.Reason): string {
    const text = REASONS[reason.rule] ?? reason.rule;
    return reason.card !== undefined ? `${text} (${cardName(G, reason.card)})` : text;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

/** Where the candidates of a card prompt are, in words. */
function whereText(G: GameState, prompt: Prompt, me: PlayerID): string {
    const cards = prompt.candidates.filter((c): c is Extract<engine.Candidate, { card: CardID }> => 'card' in c);
    const first = cards[0];
    if (!first) return '';
    switch (first.zone) {
        case 'hand': return first.owner === me ? 'in your hand' : `in ${playerName(G, first.owner ?? '')}'s hand`;
        case 'stable': {
            const owners = Array.from(new Set(cards.map(c => c.owner)));
            if (owners.length === 1) return owners[0] === me ? 'in your Stable' : `in ${playerName(G, owners[0] ?? '')}'s Stable`;
            return owners.includes(me) ? 'in any Stable' : "in another player's Stable";
        }
        case 'discard': return 'in the discard pile';
        case 'nursery': return 'in the Nursery';
        case 'deck': return 'in the deck';
        default: return '';
    }
}

/** The instruction line for a prompt: what to click. */
export function promptInstruction(G: GameState, prompt: Prompt, me: PlayerID, device: Device, selected = 0): string {
    switch (prompt.kind) {
        case 'chooseCards': {
            const n = prompt.max;
            const what = n === 1 ? 'a card' : `${n} cards`;
            const progress = n > 1 ? ` (${selected} of ${n} chosen)` : '';
            const first = prompt.candidates.find(c => 'card' in c);
            // On mobile, hand cards are dragged out of the hand; a tap only looks at them.
            if (device === 'mobile' && first && 'card' in first && first.zone === 'hand' && first.owner === me) {
                return `Drag ${what} out of your hand.${progress}`;
            }
            return `${tap(device)} ${what} ${whereText(G, prompt, me)}.${progress}`;
        }
        case 'choosePlayers': return `${tap(device)} a player.`;
        case 'chooseStable': return `${tap(device)} the Stable it should go to.`;
        case 'chooseMode': return 'Choose one.';
        case 'confirm': return '';
        case 'respond': return 'Play a Neigh card or pass.';
    }
}

/** "Discard", "Destroy" … for the heading of a prompt that an engine rule asks. */
function ruleHeading(prompt: Prompt): string | undefined {
    switch (prompt.rule) {
        case 'handLimit': return 'Hand limit';
        case 'turnDraw': return 'Draw phase';
        case 'actionDraw': return 'Action phase';
        default: return undefined;
    }
}

// ─── Panels ───────────────────────────────────────────────────────────────────

/** What a panel button does. `Outcome`s go to the game or the local state; the rest is board-local. */
export type PanelAction =
    | { outcome: Outcome }
    | { local: 'openFinder' | 'cancelPlay' | 'submitSelection' | 'clearSelection' };

export interface PanelButton {
    key: string;
    label: string;
    tone: 'primary' | 'skip' | 'cancel';
    disabled?: boolean;
    /** Why the button is disabled. */
    hint?: string;
    action: PanelAction;
}

/** One block of the action panel: who asks, what, and the buttons. */
export interface Panel {
    key: string;
    /** The card that asks; shown as the heading, with its text on hover. */
    source?: CardID;
    heading?: string;
    /** What is being decided: "DISCARD 2 cards". */
    title?: string;
    /** How to do it: "Click on a card in your hand." */
    text?: string;
    /** What happens next: "then STEAL a Unicorn card". */
    preview?: string[];
    buttons: PanelButton[];
    /** Nothing to do for this player. */
    waiting?: boolean;
}

const answer = (prompt: Prompt, a: Answer): PanelAction => ({ outcome: { move: 'respond', promptId: prompt.id, answer: a } });

function promptPanel(G: GameState, model: BoardModel, ui: UiState, device: Device): Panel {
    const prompt = model.prompt!;
    const buttons: PanelButton[] = [];

    switch (prompt.kind) {
        case 'confirm':
            buttons.push({ key: 'yes', label: 'Yes', tone: 'primary', action: answer(prompt, { confirm: true }) });
            break;
        case 'chooseMode':
            prompt.candidates.forEach(c => {
                if ('mode' in c) buttons.push({ key: `mode${c.mode}`, label: c.label, tone: 'primary', action: answer(prompt, { mode: c.mode }) });
            });
            (prompt.disabled ?? []).forEach(d => {
                if ('mode' in d.candidate) {
                    buttons.push({
                        key: `mode${d.candidate.mode}`, label: d.candidate.label, tone: 'primary', disabled: true,
                        hint: describeReason(G, d.reason), action: { outcome: undefined },
                    });
                }
            });
            buttons.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
            break;
        case 'choosePlayers':
        case 'chooseStable':
            engine.candidatePlayers(prompt).forEach(p => buttons.push({
                key: `player${p}`,
                label: p === model.me ? (prompt.kind === 'chooseStable' ? 'Your Stable' : 'You') : playerName(G, p),
                tone: 'primary',
                action: answer(prompt, { players: [p] }),
            }));
            break;
        case 'chooseCards': {
            const finder = finderFor(model);
            if (finder) {
                const label = finder.zone === 'discard' ? 'Open the discard pile'
                    : finder.zone === 'nursery' ? 'Open the Nursery'
                        : finder.zone === 'deck' ? 'Search the deck' : `Look at ${playerName(G, finder.owner ?? '')}'s hand`;
                buttons.push({ key: 'finder', label, tone: 'primary', action: { local: 'openFinder' } });
            }
            if (prompt.max > 1) {
                const enough = ui.selected.length >= prompt.min;
                buttons.push({
                    key: 'submit', label: `Confirm (${ui.selected.length}/${prompt.max})`, tone: 'primary', disabled: !enough,
                    hint: enough ? undefined : `choose ${prompt.min} cards`, action: { local: 'submitSelection' },
                });
            }
            break;
        }
        case 'respond':
            break;
    }
    if (prompt.optional) {
        buttons.push({ key: 'skip', label: prompt.kind === 'confirm' ? 'No' : 'Skip', tone: 'skip', action: answer(prompt, { skip: true }) });
    }

    return {
        key: prompt.id,
        source: prompt.source?.card,
        heading: prompt.source ? undefined : ruleHeading(prompt),
        title: prompt.role === 'cost' ? `Cost: ${prompt.title}` : prompt.title,
        text: promptInstruction(G, prompt, model.me, device, ui.selected.length),
        preview: prompt.preview,
        buttons,
    };
}

function pendingPlayPanel(G: GameState, model: BoardModel, ui: UiState, device: Device): Panel {
    const card = ui.pendingPlay!;
    const buttons: PanelButton[] = playTargetsOf(model, card).map(p => ({
        key: `target${p}`,
        label: p === model.me ? 'Your Stable' : `${playerName(G, p)}'s Stable`,
        tone: 'primary' as const,
        action: { outcome: { move: 'playCard' as const, card, target: p } },
    }));
    buttons.push({ key: 'cancel', label: 'Cancel', tone: 'cancel', action: { local: 'cancelPlay' } });
    return {
        key: `play${card}`,
        source: card,
        title: 'Choose a Stable',
        text: `${tap(device)} the Stable ${cardName(G, card)} should go to.`,
        buttons,
    };
}

/** "Waiting for Ana and Ben" — who the game is waiting for, and for what if it is a single thing. */
export function waitingText(G: GameState, model: BoardModel): string | undefined {
    if (model.over) return undefined;
    if (model.round && !model.respond) {
        const others = model.round.undecided.filter(p => p !== model.me);
        if (others.length > 0) return `Waiting for ${list(others.map(p => playerName(G, p)))} to respond…`;
    }
    const others = model.waitingFor.filter(p => p.kind !== 'respond');
    if (others.length > 0) {
        const names = Array.from(new Set(others.map(p => playerName(G, p.player))));
        const titles = Array.from(new Set(others.map(p => p.title)));
        const what = titles.length === 1 ? `: ${titles[0]}` : '';
        return `Waiting for ${list(names)}${what}…`;
    }
    if (model.started && !model.isMyTurn) return `${playerName(G, model.turnPlayer)}'s turn…`;
    return undefined;
}

/** What the active player may do on their own, in one sentence. */
export function freeText(model: BoardModel, device: Device): string | undefined {
    const f = model.free;
    const deck = `${tap(device).toLowerCase()} the deck`;
    if (f.drawForTurn) {
        return model.bot.length > 0
            ? `Beginning of your turn: use a card effect, or ${deck} to draw.`
            : `Beginning of your turn: ${deck} to draw a card.`;
    }
    const canPlay = f.play.length > 0;
    if (f.drawForAction && canPlay) {
        return device === 'mobile'
            ? `Drag a card from your hand to play it, or ${deck} to draw. You cannot do both.`
            : `Play a card from your hand or ${deck} to draw. You cannot do both.`;
    }
    if (f.drawForAction) return `You cannot play any card: ${deck} to draw.`;
    if (canPlay && f.endTurn) return 'You may play another card or end your turn.';
    if (canPlay) return 'Play a card from your hand.';
    if (model.bot.length > 0) return 'Use a card effect or end your turn.';
    if (f.endTurn) return 'End your turn.';
    return undefined;
}

/**
 * The blocks of the action panel for this player, most urgent first. Empty when the player has
 * nothing to decide and nothing to wait for (e.g. before the game starts).
 */
export function getPanels(G: GameState, model: BoardModel, ui: UiState = EMPTY_UI, device: Device = 'desktop'): Panel[] {
    const panels = decisionPanels(G, model, ui, device);
    // A notice, shown below whatever else there is to say.
    if (model.reshuffled && panels.length > 0 && !model.prompt && ui.pendingPlay === undefined) {
        panels.push({ key: 'reshuffle', text: 'The deck was empty — the discard pile was shuffled in!', buttons: [] });
    }
    return panels;
}

function decisionPanels(G: GameState, model: BoardModel, ui: UiState, device: Device): Panel[] {
    if (!model.started || model.over) return [];
    if (model.prompt) return [promptPanel(G, model, ui, device)];
    // The response round has its own panel (Neigh panel / modal).
    if (model.respond || model.round) return [];
    if (ui.pendingPlay !== undefined) return [pendingPlayPanel(G, model, ui, device)];

    const panels: Panel[] = model.bot.map(b => ({
        key: `bot${b.index}`,
        source: b.card,
        title: b.label,
        buttons: [{ key: 'use', label: 'Use', tone: 'primary' as const, action: { outcome: { move: 'useBotAbility' as const, index: b.index } } }],
    }));
    const free = freeText(model, device);
    if (free) {
        const buttons: PanelButton[] = [];
        if (model.bot.length > 0 && deckAction(model) === 'drawForTurn') {
            buttons.push({ key: 'draw', label: 'Skip and draw', tone: 'skip', action: { outcome: { move: 'drawForTurn' } } });
        }
        panels.push({ key: 'free', text: free, buttons });
        return panels;
    }
    const waiting = waitingText(G, model);
    if (waiting) panels.push({ key: 'waiting', text: waiting, buttons: [], waiting: true });
    return panels;
}

/** One line that says what is going on, for the mobile info bar and the label at the top of the desktop board. */
export function infoText(G: GameState, model: BoardModel, ui: UiState = EMPTY_UI, device: Device = 'desktop'): string | undefined {
    if (!model.started) return undefined;
    if (model.over) return 'The game is over.';
    if (model.prompt) {
        const p = model.prompt;
        const who = p.source ? `${cardName(G, p.source.card)}: ` : ruleHeading(p) ? `${ruleHeading(p)}: ` : '';
        const how = promptInstruction(G, p, model.me, device, ui.selected.length);
        return `${who}${p.title}${how ? ` — ${how}` : ''}`;
    }
    if (model.respond) {
        const round = model.round;
        const subject = round && round.responses.length > 0
            ? `${playerName(G, round.topBy)}'s ${cardName(G, round.responses[round.responses.length - 1].card)}`
            : round ? `${playerName(G, round.by)}'s ${cardName(G, round.card)}` : 'the card';
        return engine.candidateCards(model.respond).length > 0
            ? `Do you want to Neigh ${subject}?`
            : `You cannot Neigh ${subject}.`;
    }
    if (model.round) return waitingText(G, model) ?? 'Waiting for the other players…';
    if (ui.pendingPlay !== undefined) return `${tap(device)} the Stable ${cardName(G, ui.pendingPlay)} should go to.`;
    const text = freeText(model, device) ?? waitingText(G, model);
    return text && model.reshuffled ? `${text} (The deck was empty — the discard pile was shuffled in.)` : text;
}
