// Playing cards and response rounds (expansion-plan.md 5.7).
//
// A played card goes onto the pile. Every player who is allowed to answer it is asked in a round:
// play an Instant or pass. The first Instant closes the round, goes on top of the pile and gets a
// round of its own. When a round ends with everybody passing, the pile resolves from the top down:
// each Instant applies its effect to the entry below it, a cancelled entry is skipped. For plain
// Neighs that is the old parity rule (odd number of Neighs stops the card).
//
// Legacy rules in effect: a Super Neigh cannot be answered, so it ends the voting at once (R3);
// destinations are named when the card is played, targets after the voting (R18).

import { isStableType } from '../cards/registry';
import type { Answer, CardID, GameState, PlayerID, Prompt } from './state';
import { nextId } from './state';
import { pushLog } from './log';
import { addPrompt, cardCandidate, removePrompt } from './prompt';
import { pushLink } from './chain';
import { moveCard } from './events';
import { canPlay, defOf, eligibleResponders, playTargets, responseCards } from './rules';

/** Plays a card from hand. Returns an error text if the play is not legal. */
export function beginPlay(G: GameState, player: PlayerID, card: CardID, target?: PlayerID): string | undefined {
    const verdict = canPlay(G, player, card, target);
    if (!verdict.ok) return verdict.reason.rule;

    const def = defOf(G, card);
    let destination: PlayerID | undefined;
    if (isStableType(def.type)) {
        const targets = playTargets(G, player, card);
        destination = target ?? (targets.includes(player) ? player : undefined);
        if (destination === undefined) return 'targetRequired';
    }

    G.turn.played += 1;
    moveCard(G, { card, to: { zone: 'pile' }, cause: 'play', actor: player, silent: true });
    const entry = G.zones.pile[G.zones.pile.length - 1];
    entry.target = destination;
    entry.log = pushLog(G, {
        kind: 'event', verb: 'play', actor: player, cards: [card],
        from: { zone: 'hand', player }, to: destination !== undefined ? { zone: 'stable', player: destination } : { zone: 'pile' },
        players: destination !== undefined && destination !== player ? [destination] : undefined,
        outcome: 'done',
    });

    openRoundOrResolve(G);
    return undefined;
}

/** Opens a response round for the top pile entry, or resolves the pile if nobody may answer it. */
function openRoundOrResolve(G: GameState): void {
    const subject = G.zones.pile.length - 1;
    const top = G.zones.pile[subject];
    const eligible = eligibleResponders(G, top);
    if (eligible.length === 0) {
        resolvePile(G);
        return;
    }

    const round = { id: nextId(G), subject, votes: {} as Record<PlayerID, 'undecided' | 'pass'> };
    G.round = round;
    eligible.forEach(player => {
        round.votes[player] = 'undecided';
        addPrompt(G, {
            player, kind: 'respond', verb: 'respond',
            title: `Respond to ${defOf(G, top.card).name}`,
            source: { card: top.card, ability: 0, controller: top.player },
            optional: true, min: 1, max: 1,
            // The player's own hand; other players never see this prompt's candidates.
            candidates: responseCards(G, player, top).map(c => cardCandidate(c, 'hand', player)),
            cause: top.log,
            round: round.id,
        });
    });
}

/** Handles an answer to a `respond` prompt. Returns an error text if it is not legal. */
export function answerRound(G: GameState, prompt: Prompt, answer: Answer): string | undefined {
    const round = G.round;
    if (!round || prompt.round !== round.id) return 'roundClosed';
    const subject = G.zones.pile[round.subject];

    if ('skip' in answer) {
        round.votes[prompt.player] = 'pass';
        removePrompt(G, prompt.id);
        if (!G.prompts.some(p => p.round === round.id)) {
            G.round = undefined;
            resolvePile(G);
        }
        return undefined;
    }

    if (!('cards' in answer) || answer.cards.length !== 1) return 'malformedAnswer';
    const card = answer.cards[0];
    // Checked against the live state, not against the candidates stored when the round opened.
    if (!responseCards(G, prompt.player, subject).includes(card)) return 'cannotRespond';

    // The first response closes the round.
    G.prompts = G.prompts.filter(p => p.round !== round.id);
    G.round = undefined;

    moveCard(G, { card, to: { zone: 'pile' }, cause: 'play', actor: prompt.player, silent: true });
    const entry = G.zones.pile[G.zones.pile.length - 1];
    entry.log = pushLog(G, {
        kind: 'event', verb: 'neigh', actor: prompt.player, source: { card },
        cards: [subject.card], players: [subject.player], parent: subject.log, outcome: 'done',
    });

    openRoundOrResolve(G);
    return undefined;
}

/** Everybody passed (or nobody could answer): the pile resolves from the top down. */
export function resolvePile(G: GameState): void {
    const pile = G.zones.pile;
    if (pile.length === 0) return;

    for (let i = pile.length - 1; i >= 1; i--) {
        const entry = pile[i];
        if (entry.cancelled) continue;
        const instant = defOf(G, entry.card).abilities.find(a => a.kind === 'instant');
        if (instant && instant.kind === 'instant' && instant.effect.op === 'neigh') pile[i - 1].cancelled = true;
    }

    const original = { ...pile[0] };
    pile.slice(1).forEach(entry => {
        moveCard(G, { card: entry.card, to: { zone: 'discard' }, cause: 'resolve', actor: entry.player, silent: true });
    });

    const def = defOf(G, original.card);
    if (original.cancelled) {
        moveCard(G, { card: original.card, to: { zone: 'discard' }, cause: 'neighed', actor: original.player, silent: true });
        pushLog(G, {
            kind: 'event', verb: 'play', actor: original.player, cards: [original.card], parent: original.log, outcome: 'neighed',
        });
        G.lastPlay = { id: nextId(G), card: original.card, player: original.player, result: 'neighed' };
        return;
    }

    G.lastPlay = { id: nextId(G), card: original.card, player: original.player, result: 'played' };
    if (isStableType(def.type)) {
        const target = original.target ?? original.player;
        pushLink(G, {
            kind: 'rule', rule: 'resolvePlay', controller: original.player, parentLog: original.log,
            effect: { op: '$enterPlayed', card: original.card, target },
        });
        return;
    }

    const spell = def.abilities.findIndex(a => a.kind === 'spell');
    if (spell === -1) {
        moveCard(G, { card: original.card, to: { zone: 'discard' }, cause: 'resolve', actor: original.player, silent: true });
        return;
    }
    pushLink(G, {
        kind: 'spell', source: { card: original.card, ability: spell }, controller: original.player,
        spellCard: original.card, parentLog: original.log,
    });
}
