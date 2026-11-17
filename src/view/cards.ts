// Card data as the UI components need it. The game state only stores definition ids; everything a
// component shows about a card (name, type, image, text) comes from the registry through these views.

import type { CardType } from '../game/cards/types';
import { getCardDescription, getDef, hasDef, isUnicornType } from '../game/cards/registry';
import type { CardID, GameState, PlayerID } from '../game/engine';

export type { CardType };
export type Language = 'en' | 'de';

export interface CardView {
    id: CardID;
    /** Definition id in the registry. */
    def: string;
    title: string;
    type: CardType;
    /** File name (without extension) in src/assets/card/square. */
    image: string;
    description: { en: string; de: string };
}

/** View of a definition that is not (yet) a card of the game — card pickers, tooltips. */
export function defView(def: string, id: CardID = -1): CardView {
    const d = getDef(def);
    return {
        id,
        def,
        title: d.name,
        type: d.type,
        image: d.image,
        description: { en: getCardDescription(def, 'en'), de: getCardDescription(def, 'de') },
    };
}

export function cardView(G: GameState, id: CardID): CardView {
    return defView(G.cards[id].def, id);
}

/** Views of the given cards; ids the state does not know are left out. */
export function cardViews(G: GameState, ids: CardID[]): CardView[] {
    return ids.filter(id => G.cards[id] !== undefined && hasDef(G.cards[id].def)).map(id => cardView(G, id));
}

export function cardName(G: GameState, id: CardID): string {
    return G.cards[id] ? getDef(G.cards[id].def).name : 'a card';
}

export function cardDescription(card: CardView, language: Language): string {
    return card.description[language] || card.description.en;
}

export function playerName(G: GameState, id: PlayerID): string {
    return G.players.find(p => p.id === id)?.name ?? `Player ${id}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<CardType, string> = {
    baby: 'Baby Unicorn',
    basic: 'Basic Unicorn',
    magical: 'Magical Unicorn',
    ultimate: 'Ultimate Unicorn',
    diamond: 'Diamond Unicorn',
    upgrade: 'Upgrade',
    downgrade: 'Downgrade',
    magic: 'Magic',
    instant: 'Instant',
};

export function typeLabel(type: CardType): string {
    return TYPE_LABELS[type] ?? type;
}

export function isUnicornCard(card: CardView): boolean {
    return isUnicornType(card.type);
}

export function typeColor(type: CardType): string {
    switch (type) {
        case 'downgrade': return '#FCB820';
        case 'upgrade': return '#F57F22';
        case 'instant': return '#E94343';
        case 'magic': return '#88C652';
        default: return '#6C6D70';
    }
}

/** A short explanation of a card type, shown under the card text in the hand. */
export function typeHint(type: CardType): string | undefined {
    switch (type) {
        case 'upgrade': return 'An upgrade card can be placed in any stable and grants the stable owner a positive effect.';
        case 'downgrade': return 'A downgrade card can be placed in any stable and grants the stable owner a negative effect.';
        case 'instant': return 'This card can be played at any time any other players plays a card.';
        default: return undefined;
    }
}

// ─── Stables ──────────────────────────────────────────────────────────────────

/** The Unicorn cards of a stable, in the order they entered. */
export function stableUnicorns(G: GameState, player: PlayerID): CardID[] {
    return G.zones.stable[player].filter(c => isUnicornType(getDef(G.cards[c].def).type));
}

/** The Upgrade and Downgrade cards of a stable. */
export function stableUpgrades(G: GameState, player: PlayerID): CardID[] {
    return G.zones.stable[player].filter(c => !isUnicornType(getDef(G.cards[c].def).type));
}

export type { CardID, PlayerID, Player } from '../game/engine';
