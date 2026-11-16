// Prompts: creating them, validating answers and default answers (expansion-plan.md section 6).

import type { Answer, Candidate, CardID, GameState, PlayerID, Prompt, Rng } from './state';
import { nextId } from './state';

export function candidateCards(prompt: Prompt): CardID[] {
    const out: CardID[] = [];
    prompt.candidates.forEach(c => { if ('card' in c) out.push(c.card); });
    return out;
}

export function candidatePlayers(prompt: Prompt): PlayerID[] {
    const out: PlayerID[] = [];
    prompt.candidates.forEach(c => { if ('player' in c) out.push(c.player); });
    return out;
}

export function candidateModes(prompt: Prompt): number[] {
    const out: number[] = [];
    prompt.candidates.forEach(c => { if ('mode' in c) out.push(c.mode); });
    return out;
}

export function addPrompt(G: GameState, init: Omit<Prompt, 'id'>): Prompt {
    const prompt: Prompt = { ...init, id: `p${nextId(G)}` };
    G.prompts.push(prompt);
    return prompt;
}

export function removePrompt(G: GameState, id: string): void {
    G.prompts = G.prompts.filter(p => p.id !== id);
}

function distinct<T>(items: T[]): boolean {
    return new Set(items).size === items.length;
}

/** Returns an error text, or undefined if the answer is legal for the prompt. */
export function validateAnswer(prompt: Prompt, answer: Answer): string | undefined {
    if (!answer || typeof answer !== 'object') return 'malformed answer';

    if ('skip' in answer) {
        return prompt.optional ? undefined : 'this decision cannot be declined';
    }
    if ('confirm' in answer) {
        return prompt.kind === 'confirm' ? undefined : 'not a yes/no question';
    }
    if ('cards' in answer) {
        if (prompt.kind !== 'chooseCards' && prompt.kind !== 'respond') return 'cards were not asked for';
        if (!Array.isArray(answer.cards) || !distinct(answer.cards)) return 'malformed card list';
        const allowed = candidateCards(prompt);
        if (!answer.cards.every(c => allowed.includes(c))) return 'card is not a legal choice';
        if (answer.cards.length < prompt.min || answer.cards.length > prompt.max) return 'wrong number of cards';
        return undefined;
    }
    if ('players' in answer) {
        if (prompt.kind !== 'choosePlayers' && prompt.kind !== 'chooseStable') return 'players were not asked for';
        if (!Array.isArray(answer.players) || !distinct(answer.players)) return 'malformed player list';
        const allowed = candidatePlayers(prompt);
        if (!answer.players.every(p => allowed.includes(p))) return 'player is not a legal choice';
        if (answer.players.length < prompt.min || answer.players.length > prompt.max) return 'wrong number of players';
        return undefined;
    }
    if ('mode' in answer) {
        if (prompt.kind !== 'chooseMode') return 'a mode was not asked for';
        return candidateModes(prompt).includes(answer.mode) ? undefined : 'mode is not available';
    }
    return 'malformed answer';
}

/**
 * The answer used when a decision is forced (owner override, later: timers and auto-pass):
 * decline what can be declined, otherwise a random legal choice.
 */
export function defaultAnswer(prompt: Prompt, rng: Rng): Answer {
    if (prompt.optional) return { skip: true };
    const pick = <T>(items: T[], n: number): T[] => rng.shuffle([...items]).slice(0, n);
    switch (prompt.kind) {
        case 'confirm':
        case 'respond':
            return { skip: true };
        case 'chooseMode':
            return { mode: candidateModes(prompt)[0] };
        case 'chooseCards':
            return { cards: pick(candidateCards(prompt), prompt.min) };
        case 'choosePlayers':
        case 'chooseStable':
            return { players: pick(candidatePlayers(prompt), prompt.min) };
    }
}

export const cardCandidate = (card: CardID, zone: Extract<Candidate, { card: CardID }>['zone'], owner?: PlayerID): Candidate =>
    (owner === undefined ? { card, zone } : { card, zone, owner });
