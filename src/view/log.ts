// Turns log entries into text (expansion-plan.md section 7). Texts are built from verb + outcome +
// role; no card has its own log text. Cards the viewer may not see are shown as a count.

import type { CardID, GameState, LogEntry, PlayerID, ZoneRef } from '../game/engine';
import { cardName, playerName } from './cards';
import { describeReason } from './describe';

/** A piece of a log line: plain text, or a card (rendered as a token with a tooltip). */
export type LogPart = string | { card: CardID };

export interface LogLine {
    id: number;
    /** Nesting below the entry that caused this one (0 = top level). */
    depth: number;
    parts: LogPart[];
    /** A turn header rather than something that happened. */
    header?: boolean;
    /** Nothing happened: declined, fizzled or prevented. */
    muted?: boolean;
}

function canSee(entry: LogEntry, viewer: PlayerID | undefined): boolean {
    return entry.visibility === 'public' || (viewer !== undefined && entry.visibility.includes(viewer));
}

function count(n: number): string {
    return n === 1 ? 'a card' : `${n} cards`;
}

function cardList(cards: CardID[]): LogPart[] {
    const out: LogPart[] = [];
    cards.forEach((card, i) => {
        if (i > 0) out.push(i === cards.length - 1 ? ' and ' : ', ');
        out.push({ card });
    });
    return out;
}

function zoneText(G: GameState, zone: ZoneRef | undefined, actor: PlayerID): string {
    if (!zone) return '';
    const whose = zone.player === undefined ? '' : zone.player === actor ? 'their' : `${playerName(G, zone.player)}'s`;
    switch (zone.zone) {
        case 'hand': return `${whose} hand`;
        case 'stable': return `${whose} Stable`;
        case 'deck': return 'the deck';
        case 'discard': return 'the discard pile';
        case 'nursery': return 'the Nursery';
        case 'removed': return 'out of the game';
        case 'pile': return 'play';
    }
}

const INFINITIVE: Record<string, string> = {
    play: 'play a card', neigh: 'Neigh', draw: 'draw', discard: 'discard', sacrifice: 'sacrifice', destroy: 'destroy',
    steal: 'steal', return: 'return a card to hand', move: 'move a card', bring: 'bring a card into the Stable',
    add: 'add a card to hand', search: 'search the deck', pull: 'pull a card', take: 'take a card', trade: 'trade hands',
    shuffle: 'shuffle', choose: 'choose', confirm: 'use the effect', respond: 'respond', enter: 'enter the Stable',
    endTurn: 'end the turn', extraTurn: 'take another turn',
};

/** The sentence for one entry, or undefined for entries that are not worth a line. */
function sentenceOf(G: GameState, entry: LogEntry, viewer: PlayerID | undefined): LogPart[] | undefined {
    const actor = playerName(G, entry.actor);
    const visible = canSee(entry, viewer);
    const cards = entry.cards ?? [];
    const n = entry.count ?? cards.length;
    const shown: LogPart[] = visible && cards.length > 0 ? cardList(cards) : [count(Math.max(1, n))];
    const other = entry.players && entry.players.length > 0 ? playerName(G, entry.players[0]) : undefined;
    const reason = entry.reason ? describeReason(G, entry.reason) : undefined;

    if (entry.outcome === 'declined') return [`${actor} chose not to ${INFINITIVE[entry.verb] ?? entry.verb}`];
    if (entry.outcome === 'fizzled') {
        return [`${actor} could not ${INFINITIVE[entry.verb] ?? entry.verb}`, reason ? ` — ${reason}` : ''];
    }
    if (entry.outcome === 'prevented') {
        return [`${actor} could not ${INFINITIVE[entry.verb] ?? entry.verb} `, ...shown, reason ? ` — ${reason}` : ''];
    }

    switch (entry.verb) {
        case 'turnStart': return [`Turn ${entry.turn} — ${actor}`];
        case 'play':
            if (entry.outcome === 'neighed') return [`${actor}'s `, ...shown, ' was stopped'];
            return [`${actor} played `, ...shown, other ? ` into ${other}'s Stable` : ''];
        case 'neigh':
            return [
                `${actor} played `, entry.source ? { card: entry.source.card } : 'a Neigh',
                ' against ', other ? `${other}'s ` : '', ...shown,
            ];
        case 'draw': return [`${actor} drew `, ...shown];
        case 'discard': return [`${actor} discarded `, ...shown];
        case 'sacrifice': return [`${actor} sacrificed `, ...shown];
        case 'destroy': return [`${actor} destroyed `, other ? `${other}'s ` : '', ...shown];
        case 'steal': return [`${actor} stole `, ...shown, other ? ` from ${other}` : ''];
        case 'return': return [`${actor} returned `, ...shown, ` to ${zoneText(G, entry.to, entry.actor) || 'hand'}`];
        case 'move': return [`${actor} moved `, ...shown, ` to ${zoneText(G, entry.to, entry.actor) || 'another Stable'}`];
        case 'bring':
            return [`${actor} brought `, ...shown, ` from ${zoneText(G, entry.from, entry.actor) || 'somewhere'} into ${zoneText(G, entry.to, entry.actor) || 'the Stable'}`];
        case 'enter': return [...shown, ` entered ${zoneText(G, entry.to, entry.actor) || 'the Stable'}`];
        case 'add': return [`${actor} added `, ...shown, ` from ${zoneText(G, entry.from, entry.actor) || 'the discard pile'} to their hand`];
        case 'search': return [`${actor} searched the deck and took `, ...shown];
        case 'pull': return [`${actor} pulled `, ...shown, other ? ` from ${other}'s hand` : ''];
        case 'take': return [`${actor} took `, ...shown, other ? ` from ${other}'s hand` : ''];
        case 'trade': return [`${actor} traded hands`, other ? ` with ${other}` : ''];
        case 'shuffle': {
            const what = entry.from?.zone === 'discard' ? 'the discard pile' : count(Math.max(1, n));
            return entry.role === 'rule'
                ? [`The deck ran out: the discard pile (${n} cards) was shuffled into it`]
                : [`${actor} shuffled ${what} into the deck`];
        }
        case 'choose':
            if (entry.text) return [`${actor} chose: ${entry.text}`];
            return entry.source ? [`${actor} used `, { card: entry.source.card }] : undefined;
        case 'extraTurn': return [`${actor} takes another turn`];
        case 'endTurn': return [`${actor}'s turn ends immediately`];
        case 'win': {
            const how = entry.reason?.rule === 'deckOut' ? ' — the deck and the discard pile are empty' : '';
            return [`${actor} wins with ${entry.count ?? '?'} unicorns${how}`];
        }
        default: return undefined;
    }
}

/** Adds which card made it happen, unless the sentence already names it. */
function withSource(entry: LogEntry, parts: LogPart[]): LogPart[] {
    const source = entry.source?.card;
    if (source === undefined || entry.verb === 'turnStart') return parts;
    if (parts.some(p => typeof p !== 'string' && p.card === source)) return parts;
    const role = entry.role === 'cost' ? 'cost of ' : '';
    return [...parts, ' (', role, { card: source }, ')'];
}

/** The log as lines for display. Entries the viewer may not know about at all do not exist: every entry has a public form. */
export function describeLog(G: GameState, viewer: PlayerID | undefined): LogLine[] {
    const depthOf = new Map<number, number>();
    const lines: LogLine[] = [];
    G.log.forEach(entry => {
        const parentDepth = entry.parent !== undefined ? depthOf.get(entry.parent) : undefined;
        const depth = parentDepth === undefined ? 0 : Math.min(parentDepth + 1, 3);
        depthOf.set(entry.id, depth);
        const parts = sentenceOf(G, entry, viewer);
        if (!parts) return;
        lines.push({
            id: entry.id,
            depth,
            parts: withSource(entry, parts).filter(p => p !== ''),
            header: entry.verb === 'turnStart' || undefined,
            muted: entry.outcome === 'declined' || entry.outcome === 'fizzled' || entry.outcome === 'prevented' || undefined,
        });
    });
    return lines;
}

/** A log line as plain text (tests, accessibility labels). */
export function lineText(G: GameState, line: LogLine): string {
    return line.parts.map(p => (typeof p === 'string' ? p : cardName(G, p.card))).join('');
}
