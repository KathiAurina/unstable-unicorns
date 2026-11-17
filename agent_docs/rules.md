# Game Rules

> **Status (2026-11-17).** Sections 1–5 describe the game **as it is implemented today** (the new engine with the legacy rule preset). They were checked against the source on branch `select_extensions` (`d571b99`); the base-game rules are identical on `master` (`800c931`). They were read from the code, not play-tested.
>
> Section 7 lists rule changes that are **decided but not implemented yet**. Until a change is implemented, sections 1–6 are what the game does. Section 7 is also the list of behaviours a future *legacy mode* has to preserve.
>
> Reference for all rules and card texts: the **English** 2nd Edition wording (cards: `src/game/cards/i18n/en.ts`; rules: the Unstable Games Wiki, see `expansion-plan.md` Appendix B).

## 1. Overview

Unstable Unicorns is a competitive card game for 2–8 players. Each player starts with a Baby Unicorn in their Stable and a hand of 5 cards. The first player with **7 Unicorns** in their Stable wins.

On your turn you play one card (a unicorn into your stable, a magic spell, an upgrade or a downgrade into any player's stable) or draw a card — and any other player may **Neigh** a played card to stop it.

The lobby lets the game creator choose which card sets are shuffled into the deck (`setupData.expansions`; currently `base_game` and `adventures_2nd_edition`).

## 2. Turn Structure

### Pregame phase

All players simultaneously pick a Baby Unicorn from the nursery and ready up. Once everyone is ready, the game begins. (Sandbox mode skips this and assigns random babies.)

### Main phase

Each turn has two stages. All players are in the same stage so that everyone can react.

#### Beginning stage

1. **Begin-of-turn effects.** When the turn starts, every card in the current player's stable (unicorns, upgrades, downgrades) with a `begin_of_turn` trigger creates a Scene. Only cards that are in the stable at that moment get one. Scenes whose first step is impossible (nothing to discard, no legal target) are removed automatically.
2. The player resolves these scenes **one at a time, in any order**, against the live game state. A card that arrived through one effect can be used by the next one.
3. **Draw a card.** Drawing moves the turn to the Action stage and discards every scene that is still open — unused optional effects are forfeited. The player cannot draw while a mandatory scene is open or a scene is half-resolved.

#### Action stage

The player does **one** of:

- **Play a card** from hand (opens Neigh voting, section 3). A card that gets Neigh'd still uses up the action.
- **Draw a card.** This counts as the action; no card can be played afterwards.

With **Double Dutch** the player may play **2 cards** instead of 1 (not draw and play).

After that the player resolves any scenes created by the played card and ends the turn. The UI only offers "End turn" once a card was played or drawn. The game owner can end any player's turn (for players who are away).

#### End of turn

- If the hand has more than **7 cards**, the player must discard down to 7.
- If **Change of Luck** was played this turn, the same player takes another turn.
- Otherwise play passes to the next player.

## 3. Neigh Voting

When a player plays a card from hand, a **Neigh discussion** opens:

1. Round 1: every other player votes — play a **Neigh** or pass. The first Neigh closes the round.
2. A Neigh opens a new round in which every player except the one who just played the Neigh may Neigh *that* Neigh (the original player may counter).
3. A round ends when everybody has passed. Then the result is decided by the number of rounds: **odd** = the original card resolves, **even** = it goes to the discard pile.
4. A **Super Neigh** ends the whole discussion immediately with the result its position implies.

Details:

- Every card played from hand can be Neigh'd: unicorns, magic, upgrades and downgrades.
- **Yay** (`your_cards_cannot_be_neighed`): the owner's cards skip the voting entirely. Neigh cards the owner plays can still be Neigh'd.
- **Slowdown / Ginormous Unicorn** (`you_cannot_play_neigh`): the player is skipped in every vote.
- Cards that are *brought* into a stable by an effect are not played and cannot be Neigh'd. Baby Unicorns are never played from hand.
- A client setting passes automatically for players without a Neigh card in hand.

## 4. Winning and running out of cards

A player wins as soon as their stable holds **7 or more** unicorn cards. This is checked after every move.

- Baby, Basic and Magical Unicorns (including Narwhals) each count 1.
- **Ginormous Unicorn** counts 2. (Implemented as +1 for the player, not per card.)
- A player with **Pandamonium** cannot win.

**Empty deck.** If the draw pile is empty at the start of a turn, or too small for a draw effect, the discard pile is shuffled into it. The game only stops when both piles are empty at the start of a turn.

## 5. Special Rules

### Baby Unicorns

- Live in the **Nursery**; never in a hand, the deck or the discard pile.
- When a Baby Unicorn would be sacrificed, destroyed or returned to hand, it goes to the Nursery instead.
- Enter a stable only through card effects (Mother Goose Unicorn, Cutthroat Captain Unicorn steals one).

### Cost-then-effect vs. choice

- **Cost then effect** — two consecutive Actions in a Scene. The first must be completed before the second happens. Stable Artillery: discard 2 cards, *then* destroy a Unicorn.
- **Choice** — several Instructions for the same player inside one Action. The player performs exactly one. First Mer-Mate Unicorn: draw 2 cards *or* bring a Basic Unicorn into the stable.

### Mandatory vs. optional

- `mandatory: true` — must be resolved before the turn can continue (Unicorn Poison).
- `mandatory: false` — "you may". The player can skip; skipping an optional scene skips all of its remaining steps.

### Impossible actions

After every step the engine removes instructions that cannot be carried out (no legal target, nothing to discard). For an optional scene this happens only when *all* alternatives of the current step are impossible. Cards are **not** prevented from being played when their effect is impossible — the card is spent and the effect does nothing.

### Flying unicorns

Cards with a `this_destroyed_or_sacrificed` → `return_to_hand` trigger return to their owner's hand instead of the discard pile.

### Immediately end your turn

Rhinocorn and Zombie Unicorn have `endTurnImmediately`. Once the player starts such a scene, they can no longer draw or play this turn. Other begin-of-turn effects can still be used.

### Queen Bee Unicorn

While it is in a stable, Basic Unicorns cannot enter any *other* player's stable (played, brought, revived or stolen).

### Extreme Adventurer Unicorn

Basic Unicorns cannot enter the stable this card is in.

### Blinding Light

All unicorns of the affected player (types `unicorn` and `narwhal`; not babies, not basics) are treated as having no effects: no enter, begin-of-turn or destroyed/sacrificed triggers.

### Pandamonium

- The player cannot win.
- Their unicorns cannot be chosen by **destroy a Unicorn** effects, cannot be sacrificed (neither by "sacrifice a Unicorn" nor by "sacrifice a card"), and cannot be given away with a unicorn swap.
- Their unicorns **can** be chosen by "destroy a card", by steal effects and by return-to-hand effects.
- Tiny Stable does nothing while Pandamonium is active.

### Blinding Light + Pandamonium together

Pandamonium takes priority: the unicorns are Pandas, not Basic Unicorns, and **keep** their abilities (rule option R1, `blindingBeatsMasquerade`).

### Tiny Stable

When a card enters the stable of a player with Tiny Stable and that player then has more than 5 unicorns (more than 4 if they have Ginormous Unicorn), they must sacrifice a unicorn. The check runs only when a card enters.

### Other protections

- **Rainbow Aura**: the owner's unicorns cannot be destroyed.
- **Magical Kittencorn**: cannot be destroyed by Magic cards.
- **Broken Stable**: the player cannot play Upgrade cards (they can still receive them).

## 6. Known issues of the old implementation

Found while reading the old code on 2026-11-17. The new engine (`src/game/engine/`, stage 3) fixes the
unintended ones; those that are rule decisions are kept in the **legacy** preset as rule options so the
game behaves as before until stage 4 switches them.

| # | Issue | Status in the new engine |
|---|---|---|
| I1 | A stable that holds 7 cards accepts no further card. Normally unreachable because 7 unicorns win, but it blocks a player with Pandamonium. | Kept in legacy as option R8 (`stableLimit: 7`, counts Unicorn cards). |
| I2 | A unicorn entering under Blinding Light skipped Barbed Wire and the Tiny Stable check for that entry. | Fixed (test in `engine.cards.other.test.ts`). |
| I3 | Continuous effects of a unicorn that entered while blinded never became active, even after Blinding Light was gone. | Kept in legacy as option R13 (`blindingRestoresEffects: false`). |
| I4 | Drawing for the turn did not reshuffle and did not check for an empty draw pile. | Fixed (`engine.turn.test.ts`). |
| I5 | With both piles empty at turn start the code switched to an undefined phase. | Fixed: the game ends (R20, most unicorns win). |
| I6 | Drawing for the turn cleared the open steps of **all** players. | Fixed: every decision is a prompt of its own player. |
| I7 | The Great Narwhal's search did not find the basic Narwhal or Baby Narwhal. | Fixed (`engine.cards.unicorns.test.ts`). |
| I8 | Destroy effects do not exclude the acting player's own stable. | Kept in legacy as option R11 (`destroyOwnStable: true`). |
| I9 | Hornswoggler Unicorn, Salty Seadogicorn, Fearless Unicorn and Zombie Unicorn did not do what their English text says. | Hornswoggler, Salty Seadogicorn and Fearless fixed; Zombie Unicorn kept in legacy as `zombie_unicorn@legacy` (R17). |
| I10 | The full game state, including all hands and the deck order, is sent to every client (no `playerView`). | **Still open** (stage 1). |

## 7. Decided rule changes (not implemented yet)

Decided on 2026-11-17. "Current" is what sections 1–6 describe and what a later **legacy mode** must be able to reproduce. Links go to the wiki page and section the new rule comes from.

### Rules that change

| ID | Topic | Current (legacy) | Decided |
|---|---|---|---|
| R1 | Blinding Light + Pandamonium | Pandamonium wins; unicorns keep all abilities. | Blinding has priority: enter abilities are suppressed. Pandamonium then only protects the cards, so abilities that trigger when a card leaves still work. ([Blinding Effect → Interactions](https://www.unstablegameswiki.com/index.php?title=UU_Game_Terminology_-_Blinding_Effect#Interactions)) |
| R2 | Unicorns needed to win | 7, always. | 7 with 2–5 players, 6 with 6–8 players. ([Winning → The End of the Game](https://www.unstablegameswiki.com/index.php?title=UU_Game_Terminology_-_Winning#The_End_of_the_Game)) |
| R3 | Super Neigh | Ends the whole discussion immediately. | Cannot be Neigh'd and cancels the card it answers; voting then re-opens on the card below it, which can be Neigh'd again. ([Neigh page → Super Neigh](https://www.unstablegameswiki.com/index.php?title=UU_-_Neigh,_Neigh%27d,_Neighable,_Neighing#Super_Neigh)) |
| R4 | Pandamonium scope (**house rule**, differs from the wiki) | Mixed, see section 5. | One principle: an effect that says "**Unicorn** card" cannot affect that player's unicorns; an effect that says "a **card**" can. Changes: "steal a Unicorn" no longer works on them; "sacrifice a card" now may pick them. Same for return, move and every future effect. |
| R5 | Tiny Stable | Checked only when a card enters; Ginormous +1 per player. | Checked at any time (for example when Pandamonium leaves); every double-count unicorn counts 2. ([Tiny Stable → Specific Card Rules](https://www.unstablegameswiki.com/index.php?title=UU_-_Tiny_Stable#Specific_Card_Rules_and_Information)) |
| R6 | Mermaid Unicorn | Optional. | Mandatory, as printed. ([Mermaid Unicorn → Card Texts](https://www.unstablegameswiki.com/index.php?title=UU_-_Mermaid_Unicorn#Card_Texts)) |
| R7 | Moment of winning | Checked after every move. | Only when all pending effects have resolved. ([Winning → Winning Condition](https://www.unstablegameswiki.com/index.php?title=UU_Game_Terminology_-_Winning#Winning_Condition)) |
| R8 | Stable size | A stable with 7 cards accepts no more. | No limit. ([FAQ → stable limit](https://www.unstablegameswiki.com/index.php?title=Unstable_Unicorns_-_FAQ#Is_there_a_limit_to_how_many_cards_you_can_have_in_your_Stable%3F)) |
| R9 | Playing unicorns | Only into your own stable. | Into any player's stable; your own is the default. ([Cards → Cards](https://www.unstablegameswiki.com/index.php?title=UU_Game_Terminology_-_Cards#Cards)) |
| R10 | Unplayable cards | Any card can be played; an impossible effect fizzles. | A card can only be played if its **first required action** can be performed (Unicorn Poison needs a legal target; Two-For-One needs something to sacrifice). Later steps and optional abilities are not checked. ([Requirement](https://www.unstablegameswiki.com/index.php?title=UU_Game_Terminology_-_Requirement)) |
| R11 | Destroy | May target the acting player's own stable. | Other players' stables only. ([Destroy](https://www.unstablegameswiki.com/index.php?title=UU_Game_Terminology_-_Destroy)) |
| R12 | Yay | Protects the owner's cards except their Neighs. | Nothing the owner plays can be Neigh'd, including Neighs. ([Neigh page → Yay](https://www.unstablegameswiki.com/index.php?title=UU_-_Neigh,_Neigh%27d,_Neighable,_Neighing#Yay)) |
| R13 | Blinding Light leaves | Suppressed continuous effects never come back. | Continuous effects are active again; enter abilities are not re-triggered. ([Blinding Effect → Interactions](https://www.unstablegameswiki.com/index.php?title=UU_Game_Terminology_-_Blinding_Effect#Interactions)) |
| R14 | Barbed Wire + Pandamonium | Discard on enter and on leave. | Discard when a unicorn enters; none when one leaves. ([Simultaneously](https://www.unstablegameswiki.com/index.php?title=UU_Game_Terminology_-_Simultaneously), "Continuous (Mandatory) Effect") |
| R15 | Effects with several targets | Chosen and applied one after another (destroying an Upgrade can unlock the next target). | All targets of one effect are chosen first, then applied together. ([Effects](https://www.unstablegameswiki.com/index.php?title=UU_Game_Terminology_-_Effects)) |
| R16 | Searching the deck | The found card is not shown to the other players. | The found card is revealed to everyone and logged. ([Search](https://www.unstablegameswiki.com/index.php?title=UU_Game_Terminology_-_Search)) |
| R17 | Zombie Unicorn | Discard any card, then revive; ends the turn. | Discard a **Unicorn** card, then revive; ends the turn. Text updated to the 2nd Edition wording. ([Zombie Unicorn → Card Texts](https://www.unstablegameswiki.com/index.php?title=UU_-_Zombie_Unicorn#Card_Texts)) |
| R18 | When targets are named | Destination of an Upgrade/Downgrade before the voting; all other targets after it. | Default: the destination and the targets of the first required action are named **before** the voting. Game option: name them after. ([Effects](https://www.unstablegameswiki.com/index.php?title=UU_Game_Terminology_-_Effects), "Choosing Targets for Effects") |
| R19 | Two-player games | Same rules as any game. | The removal list of each set is applied and each player starts with one Neigh. ([Two Player Rules](https://www.unstablegameswiki.com/index.php?title=Unstable_Unicorns_-_Two_Player_Rules)) |
| R20 | Deck and discard pile both empty | The code switches to an undefined phase (issue I5). | The game ends; the player with the most unicorns wins, ties share the win. |

### Card fixes (no legacy variant — the current behaviour is a bug)

| Card | Current | Decided |
|---|---|---|
| Hornswoggler Unicorn | Mode 1 draws 3 cards without discarding the hand. | Discard your hand, then draw 3. |
| Salty Seadogicorn | Mode 1 makes one chosen player discard. | Each other player discards. |
| Fearless Unicorn | May take a Neigh from the discard pile. | May take any Instant card. |

### Wiki rules that are deliberately **not** adopted

| ID | Topic | We keep | Wiki says |
|---|---|---|---|
| K1 | Empty deck | Shuffle the discard pile into the deck. | The game ends; most unicorns wins. |
| K2 | Responding to a played card | Voting rounds (section 3), extended by R3 and R12. | An "instant pile" where the fastest response wins and the pile re-opens after every resolution. |
| K3 | Begin-of-turn effects | Resolved one at a time; a card that just arrived can be used by the next effect. | All simultaneous; a card that arrived cannot be used by another effect of the same phase. |

### Deferred

Card counts and missing base-deck cards (`cards.md`, "Deviations") are corrected when the card sets are rebuilt for the expansions.
