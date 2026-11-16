// Card registry types: card definitions, sets, and the effect language.
//
// Everything in here is plain data. Definitions live in the registry and are looked up by id on
// both server and client; they are never copied into the game state.
//
// Layering: cards/ must not import from engine/ or game.ts.

// ─── Cards ────────────────────────────────────────────────────────────────────

export type CardType =
    | 'baby' | 'basic' | 'magical' | 'ultimate' | 'diamond'
    | 'upgrade' | 'downgrade' | 'magic' | 'instant';

export const UNICORN_TYPES: readonly CardType[] = ['baby', 'basic', 'magical', 'ultimate', 'diamond'];

export interface CardDef {
    /** Stable identifier, used in the game state, saves, tests, sandbox and logs. */
    id: string;
    /** Printed English name. Name-based rules ("Narwhal in its name") match against this. */
    name: string;
    type: CardType;
    /** File name (without extension) in src/assets/card/square. */
    image: string;
    /** Empty for Baby and Basic Unicorns. */
    abilities: Ability[];
}

export interface CardSet {
    id: string;
    label: string;
    kind: 'base' | 'expansion' | 'promo';
    /** Deck inventory: definition id and number of copies. */
    cards: { def: string; count: number }[];
    /** Baby Unicorn definitions this set adds to the Nursery (one copy each). */
    nursery: string[];
    twoPlayerRemove?: string[];
    combinableWith?: string[];
}

export type CardTexts = Record<string, { text?: string; flavor?: string }>;

// ─── Abilities ────────────────────────────────────────────────────────────────

export type Ability =
    /** Magic card: resolves when the card is played, then the card is discarded. */
    | { kind: 'spell'; effect: Effect }
    /** "When / if / each time …" */
    | { kind: 'triggered'; on: Trigger; effect: Effect }
    /** Continuous rule while the card is in a stable (or, for `cannotBeNeighed`, while it is being played). */
    | { kind: 'static'; rule: StaticRule }
    /** Instant card: may be played in a response round whose subject matches `window`. */
    | { kind: 'instant'; window: InstantWindow; effect: InstantEffect };

export type Trigger =
    /** When this card enters a stable. */
    | { on: 'enter' }
    /** If this card is in your stable at the beginning of your turn. */
    | { on: 'bot' }
    /** If this card is sacrificed or destroyed. */
    | { on: 'sd' }
    /** Each time a Unicorn card enters the stable this card is in. */
    | { on: 'unicornEnters' }
    /** Each time a Unicorn card leaves the stable this card is in. */
    | { on: 'unicornLeaves' }
    /** "If at any time …" */
    | { on: 'state'; check: StateCheck };

export type StateCheck =
    /** The controller has more than `n` unicorns in their stable. */
    | { kind: 'unicornCountAbove'; n: number };

export type StaticRule =
    /** You cannot play cards matching the filter. */
    | { kind: 'cannotPlay'; filter: CardFilter }
    /** Cards matching the filter cannot enter: `yours` = the stable this card is in, `othersThanYours` = every other stable. */
    | { kind: 'cannotEnter'; filter: CardFilter; stables: 'yours' | 'othersThanYours' }
    /** The given cards cannot be affected by the given verbs, optionally only when the source is of a given type. */
    | { kind: 'protect'; cards: 'self' | 'yourUnicorns'; verbs: Verb[]; bySourceType?: CardType[] }
    /** Blinding: the Unicorn cards in this stable have no effects. */
    | { kind: 'blind' }
    /** Masquerade: the Unicorn cards in this stable are not Unicorns (Pandas); the owner cannot win. */
    | { kind: 'masquerade' }
    /** This card counts as `n` unicorns. */
    | { kind: 'countsAs'; n: number }
    /** Cards you play cannot be Neigh'd. */
    | { kind: 'yourPlaysCannotBeNeighed' }
    /** This card cannot be Neigh'd while it is being played. */
    | { kind: 'cannotBeNeighed' }
    /** You may play `n` more cards in your Action phase. `ifInStableAtTurnStart`: only if this card was in the stable when the turn began. */
    | { kind: 'extraPlays'; n: number; ifInStableAtTurnStart?: boolean };

export type InstantWindow =
    /** A card is being played (by another player than the one holding the Instant). */
    | { event: 'cardPlayed'; by: 'another' };

export type InstantEffect =
    /** Stop the card below and send it to the discard pile. */
    | { op: 'neigh' };

/** What is being done to a card or by a player. Used by prompts, protection rules and the log. */
export type Verb =
    | 'play' | 'neigh' | 'draw' | 'discard' | 'sacrifice' | 'destroy' | 'steal' | 'return'
    | 'move' | 'bring' | 'add' | 'search' | 'pull' | 'take' | 'trade' | 'shuffle'
    | 'choose' | 'confirm' | 'respond'
    | 'turnStart' | 'endTurn' | 'extraTurn' | 'win' | 'enter';

// ─── Effect language ──────────────────────────────────────────────────────────

/** Which cards a step may pick. All given conditions must hold. */
export interface CardFilter {
    /** Card type is one of these. */
    types?: CardType[];
    /** "a Unicorn card": any unicorn type. */
    unicorn?: true;
    /** The printed name contains this text (case-insensitive). */
    nameIncludes?: string;
}

export type Count = number | 'all';

/** A value bound by an earlier step of the same ability (cards, and the players that owned them). */
export interface Ref { ref: string }

export type PlayerSel =
    /** Every player, including the controller. */
    | 'each'
    /** Every player except the controller. */
    | 'eachOther'
    /** One other player, chosen by the controller ("another player"). */
    | 'chosenOther'
    /** The player(s) bound by an earlier step ("that player"). */
    | Ref;

export type Condition =
    /** At least one card bound to `ref` matches the filter. */
    | { cond: 'cardMatches'; ref: string; filter: CardFilter };

export type Effect =
    // ── Combinators ──
    /** "A and B": do every part that is possible. */
    | { op: 'all'; parts: Effect[] }
    /** "A, then B": B only if A was performed completely. */
    | { op: 'then'; first: Effect; next: Effect }
    /** "You may A. If you do, B." */
    | { op: 'ifYouDo'; first: Effect; next: Effect }
    /** "You may A." */
    | { op: 'may'; effect: Effect }
    /** "A OR B": the player picks exactly one mode that is possible. */
    | { op: 'oneOf'; modes: Effect[] }
    /** "Each player …": one instance per player; their decisions are open at the same time. */
    | { op: 'forEach'; players: PlayerSel; effect: Effect }
    /** "If …, …" */
    | { op: 'when'; cond: Condition; effect: Effect }
    // ── Steps ──
    | Step;

export type Step =
    /** DRAW cards. `reveal`: shown to everyone. `bind`: the drawn cards. */
    | { op: 'draw'; count: number; reveal?: boolean; bind?: string }
    /** DISCARD cards from your hand (the discarding player chooses). */
    | { op: 'discard'; count: Count; filter?: CardFilter }
    /** SACRIFICE cards in your own stable (the sacrificing player chooses). */
    | { op: 'sacrifice'; count: Count; filter?: CardFilter }
    /** DESTROY cards in a stable (the acting player chooses). */
    | { op: 'destroy'; count: number; filter?: CardFilter }
    /** STEAL cards from another player's stable into yours. */
    | { op: 'steal'; count: number; filter?: CardFilter }
    /** Return cards in a stable to their owner's hand. `bind`: the cards and their former owners. */
    | { op: 'returnToHand'; count: number; filter?: CardFilter; from: 'others' | 'any'; bind?: string }
    /** Move a card from one stable to another player's stable (never into the acting player's own). */
    | { op: 'move'; filter?: CardFilter; from: 'yours' | 'any' }
    /** Bring a card into your stable without playing it. Either chosen from a zone, or the cards bound to `cards`. */
    | { op: 'bring'; from: 'hand' | 'discard' | 'nursery'; filter?: CardFilter; cards?: Ref }
    /** Add a card from the discard pile to your hand: a chosen one, or this card itself. */
    | { op: 'addToHand'; from: 'discard'; filter?: CardFilter; self?: boolean }
    /** Search the deck for a card, add it to your hand, shuffle the deck. */
    | { op: 'search'; filter?: CardFilter }
    /** Take a card from another player's hand: at random (pull), or look at the hand and choose. */
    | { op: 'takeFromHand'; how: 'random' | 'look' }
    /** Trade hands with another player. */
    | { op: 'tradeHands' }
    /** Shuffle the named things into the deck. */
    | { op: 'shuffleIntoDeck'; what: ('self' | 'hand' | 'discard')[] }
    /** Turn manipulation. */
    | { op: 'turn'; action: 'extraTurn' | 'endTurn' };

export type StepOp = Step['op'];
