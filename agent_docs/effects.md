# Effects & Mechanics

> **Status (2026-11-17).** Documents the internal mechanics of the **rules engine** in `src/game/engine/`
> and the **card registry** in `src/game/cards/` (stage 3 of `expansion-plan.md`). The Script / Scene /
> Instruction model, `G.playerEffects`, the `Do` operations and `BoardStateManager` no longer exist.
>
> The game runs with the **legacy** rule preset: the rules of `rules.md` sections 1–5. The rule changes
> of `rules.md` section 7 exist as options (`engine/options.ts`) and are switched on in stage 4.

## 1. Where things live

| Path | Content |
|---|---|
| `cards/types.ts` | Card definitions, sets, and the **effect language** (plain data, no functions) |
| `cards/dsl.ts` | Helpers that keep a definition close to the printed text (`onEnter(may(steal(1, UPGRADE)))`) |
| `cards/defs/*.ts` | One definition per card design |
| `cards/sets/index.ts` | Set inventories: which definitions, how many copies, which babies |
| `cards/i18n/en.ts`, `de.ts` | Card texts by definition id (English required, German optional) |
| `cards/registry.ts` | Lookups: `getDef`, `getSet`, `buildDeck`, `getCardDescription` |
| `engine/state.ts` | `GameState`: zones, turn, effect chain, prompts, response round, log |
| `engine/rules.ts` | Pure questions about a state: `canPlay`, `canEnter`, `canBeAffected`, `unicornCount`, … |
| `engine/events.ts` | `moveCard`: the only code that moves a card between zones |
| `engine/effects.ts` | The interpreter of the effect language; creates prompts |
| `engine/play.ts` | Playing cards and response rounds (Neigh voting) |
| `engine/turn.ts` | Phases, the main loop `advance`, win check |
| `engine/index.ts` | Public API: `createGame`, `startGame`, `respond`, `playCard`, `drawForTurn`, `drawForAction`, `useBotAbility`, `endTurn`, `forceEndTurn`, `freeActions` |
| `game.ts` | boardgame.io wiring: phases, moves, turn sync |
| `src/view/` | What a player sees and may click, derived from the state (frontend only) |

The state stores **no derived facts**. `G.cards[id].def` is a definition id; whether a player may play
Upgrades, whether a card is protected or how many unicorns count is computed from the cards that are
in the stables at that moment. There is nothing to add or remove when a card enters or leaves.

## 2. Abilities

A card definition has a list of abilities. Baby and Basic Unicorns have none.

| Kind | Meaning | DSL |
|---|---|---|
| `spell` | Magic card: resolves when the card is played, then the card is discarded | `spell(effect)` |
| `triggered` | "When / if / each time …", see triggers below | `onEnter`, `onBeginOfTurn`, … |
| `static` | A continuous rule while the card is in a stable | `rule({ kind: … })` |
| `instant` | Instant card: may be played in a response round | `neigh()` |

### Triggers

| Trigger | DSL | Fires when |
|---|---|---|
| `enter` | `onEnter` | this card enters a stable (played, brought, stolen or moved) |
| `bot` | `onBeginOfTurn` | the card was in the stable when its owner's turn began |
| `sd` | `onSacrificedOrDestroyed` | this card is sacrificed or destroyed (`flyer()` = return it to hand) |
| `unicornEnters` | `wheneverUnicornEnters` | another Unicorn card enters the stable this card is in (Barbed Wire) |
| `unicornLeaves` | `wheneverUnicornLeaves` | a Unicorn card leaves that stable (Barbed Wire) |
| `state` | `stateCheck(check, effect)` | "if at any time …" (Tiny Stable: more than 5 unicorns) |

A blinded unicorn has no triggered abilities. Abilities that trigger on the same event are put on the
chain as one group: mandatory ones resolve first.

### Static rules

| Rule | Meaning | Cards |
|---|---|---|
| `cannotPlay { filter }` | The owner cannot play matching cards | Broken Stable (Upgrades); Slowdown, Ginormous Unicorn (Neigh cards) |
| `cannotEnter { filter, stables }` | Matching cards cannot enter this stable (`yours`) or every other stable (`othersThanYours`) | Extreme Adventurer Unicorn (Basic, yours); Queen Bee Unicorn (Basic, others) |
| `protect { cards, verbs, bySourceType? }` | The card itself or the owner's unicorns cannot be affected by these verbs | Rainbow Aura (your unicorns, destroy); Magical Kittencorn (self, destroy by Magic cards) |
| `blind` | The Unicorn cards in this stable have no effects | Blinding Light |
| `masquerade` | The Unicorn cards in this stable are Pandas; the owner cannot win | Pandamonium |
| `countsAs { n }` | This card counts as `n` unicorns | Ginormous Unicorn |
| `yourPlaysCannotBeNeighed` | Cards the owner plays cannot be Neigh'd | Yay |
| `cannotBeNeighed` | This card cannot be Neigh'd while it is being played | Super Neigh |
| `extraPlays { n, ifInStableAtTurnStart }` | The owner may play `n` more cards in the Action phase | Double Dutch |

Static rules of a blinded unicorn are off; `blind` and `masquerade` themselves are never switched off.
Which of the two wins when both are in a stable is rule option R1 (legacy: masquerade wins).

## 3. The effect language

An effect is a tree of **combinators** over **steps**.

### Combinators — this is where "cost, then effect" and "choice" are decided

| Combinator | Card wording | Behaviour |
|---|---|---|
| `then(a, b)` | "A, then B" | B only happens if A was performed completely. A is the **cost**. |
| `ifYouDo(a, b)` | "You may A. If you do, B." | Optional; A is the cost. |
| `may(e)` | "You may …" | Optional. |
| `oneOf(a, b, …)` | "A **or** B" | The player picks exactly one mode that is possible; impossible modes are shown greyed out. |
| `all(a, b, …)` | "A and B" | Every part that is possible is done. |
| `forEach(players, e)` | "Each player …", "another player …" | One instance per player; their decisions are open at the same time. |
| `when(cond, e)` | "If it is a …, …" | Looks at cards bound by an earlier step (`bind` / `ref`). |

Do not confuse `then` with `oneOf`: Unfair Bargain-style "discard, then steal" is a cost followed by an
effect, never a choice between the two.

### Steps

`draw`, `discard`, `sacrifice`, `destroy`, `steal`, `returnToHand`, `move`, `bring` (into the stable
from hand / discard pile / Nursery, not a play — cannot be Neigh'd), `addToHand` (from the discard
pile, or the card itself), `search`, `takeFromHand` (`random` = pull, `look` = look at the hand and
choose), `tradeHands`, `shuffleIntoDeck`, `turn` (`extraTurn`, `endTurn`).

Steps take a `CardFilter` (`types`, `unicorn`, `nameIncludes`). "A Unicorn card" is `{ unicorn: true }`;
"a Neigh card" matches by name, so Super Neigh counts.

### Adding a card

Add the definition in `cards/defs/`, the English text in `cards/i18n/en.ts`, the inventory line in
`cards/sets/index.ts`, the image in `src/assets/card/square/`, and a scenario test. **No UI or log code
is needed**: prompt titles, button labels and log lines are generated from the effect tree
(`engine/describe.ts`, `src/view/`). If a primitive is missing, add it to the effect language with its
own tests — never special-case a card in the engine.

## 4. Resolution

### Effect chain

`G.chain` is a stack of **links**; a link is one ability instance (or an engine rule such as the turn
draw or the hand limit). `advance` (in `turn.ts`) runs after every move: it resolves the top link until
a decision is needed, and when the chain is empty it lets the turn continue. The interpreter is
**resumable**: its memory per effect node is stored in the link (`link.mem`), so a link can wait for an
answer and continue later. An ability that triggers while another one resolves goes on top and resolves
first.

### Prompts

Every decision is a **prompt** in `G.prompts` (`engine/state.ts`, `Prompt`):

| Kind | Asked for |
|---|---|
| `chooseCards` | cards in a hand, a stable, the discard pile, the Nursery or the deck (`min` / `max`) |
| `choosePlayers`, `chooseStable` | a player / the destination stable of a moved card |
| `chooseMode` | "A or B" |
| `confirm` | "you may …" for effects that have no other choice to decline |
| `respond` | a response round: play an Instant or pass |

A prompt names its `source` card, the `verb`, a generated `title` ("DISCARD 2 cards"), whether it is
`optional` (then `{ skip: true }` is a legal answer), its `role` (`cost` / `effect`), a `preview` of
what follows, and `disabled` options with the reason. `respond(G, rng, player, promptId, answer)` is
the single move for every decision. Several players can have prompts at the same time.

Anything that is not a prompt is a **free action** of the turn player (`freeActions`): use a
begin-of-turn ability, draw for the turn, play a card, draw for the action, end the turn. They are only
available while nothing is resolving.

### Impossible effects

Before an optional ability is offered and before a mode is listed, the interpreter checks whether it is
possible (`possible` in `effects.ts`). An impossible mandatory step **fizzles**: nothing happens, a log
entry with `outcome: 'fizzled'` and the reason is written, and for `then` / `ifYouDo` the rest does not
happen. The game never waits for a decision nobody can make; the random-play test
(`engine.random.test.ts`) guards this.

### The event pipeline

Every zone change goes through `moveCard` (`events.ts`), in this order: restrictions (protection and
entry rules — an illegal move does nothing and is logged as `prevented`) → apply (a Baby Unicorn that
would go to a hand, the deck or the discard pile goes to the Nursery) → log → triggers
(`unicornLeaves`, `sd`, `unicornEnters`, `state`, `enter`) → state checks.

### Playing a card and response rounds

`playCard` puts the card on `G.zones.pile` and opens a **response round**: every player who is allowed
to play a card that could answer gets a `respond` prompt — whether or not they hold one. The first
Instant closes the round, goes on the pile and gets a round of its own. When everybody has passed, the
pile resolves from the top down: each Neigh stops the entry below it. If the original card survives, a
Unicorn / Upgrade / Downgrade enters the declared stable (its `enter` abilities trigger) and a Magic
card resolves its `spell` and is discarded afterwards. A Neigh'd card counts as played for the turn.

### Turn machine

`G.turn.phase`: `bot` (beginning of turn) → `draw` → `action` → `eot`. Mandatory begin-of-turn abilities
resolve on their own; optional ones wait until the player uses them (`useBotAbility`) or draws for the
turn, which forfeits them. `eot` enforces the hand limit, then the next turn starts (an extra turn
first). A win is checked after every move (legacy, R7).

## 5. Log

`G.log` holds one entry per event, decision or turn marker (`LogEntry` in `state.ts`): verb, actor,
source card, affected cards and zones, `role`, `outcome` (`done`, `prevented`, `fizzled`, `declined`,
`neighed`), a `parent` entry (the log is a tree) and a `visibility` (a drawn card is visible to its
owner only). Entries are written by the event pipeline, the interpreter and the turn machine — never by
a card definition. `src/view/log.ts` turns them into text.

## 6. Rule options

`engine/options.ts` lists every decided rule change of `rules.md` section 7 as a named option, read
only inside the engine. `LEGACY_RULES` is the behaviour before the rewrite and the only preset today.
Card-level changes (R6 Mermaid Unicorn, R17 Zombie Unicorn) are alternative definitions
(`mermaid_unicorn@legacy`); the preset decides which one a set resolves to.

## 7. The UI contract (`src/view/`)

Both boards render the same derived model; there is no per-card UI code.

| File | Content |
|---|---|
| `cards.ts` | `CardView` (name, type, image, text) from the registry |
| `model.ts` | `getBoardModel`: my prompt, my vote, the response round, my free actions; `cardMarks` (which cards a click does something on); click functions that return the move to send |
| `describe.ts` | `getPanels` (who asks, what, buttons) and `infoText` — the **one** source of "what should the player do now", with "Click on …" for desktop and "Tap …" for mobile |
| `log.ts` | Log entries as text |
| `useBoard.ts` | The hook both boards use: model + local selection state + handlers |

Tests: `src/game/__tests__/engine.*.test.ts` (scenario builder in `src/game/testing/scenario.ts`) and
`src/view/__tests__/view.test.ts`.
