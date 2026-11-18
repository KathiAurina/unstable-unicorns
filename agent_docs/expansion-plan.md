# Expansion Implementation Plan

> **Status:** plan, written 2026-11-16 on branch `select_extensions`; decisions of 2026-11-17 are worked in (section 11). **Stages 2 and 3 are implemented** (card registry, rules engine with the legacy preset, `src/view` UI layer, old engine removed). **Where we left off and what comes next: section 9.1.**
> `rules.md`, `cards.md` and `effects.md` describe the game as it is today. This file describes where it is going. Rule statements in section 3 come from the Unstable Games Wiki (Appendix B); which of them are adopted is decided in `rules.md` section 7 (IDs R1–R19, K1–K3), and this plan refers to those IDs.
> Reference language is English: English card text and English rules.

## How to read this document

| If you want to know… | Read |
|---|---|
| what is recommended, in one page | 1 |
| which products/cards exist and in which order to build them | 2, Appendix A |
| which rules the engine has to model (and where the current game deviates) | 3 |
| whether the code on this branch should be kept | 4 |
| the proposed structure for cards, effects, prompts and logs | 5, 6, 7 |
| which engine feature each expansion needs | 8 |
| the step-by-step roadmap | 9, 10 |
| **where the work stands and how to continue** | **9.1** |
| what was decided, and the few points still open | 11 (rule IDs: `rules.md` section 7) |

---

## 1. Summary

1. **Scope is about 430 distinct card designs** in 12 products (about 1,000 physical cards). The six 2nd Edition expansions add roughly 150 designs on top of the base deck; Control & Chaos adds about 100 more and is the hardest set by a wide margin.
2. **The base deck itself is not finished.** The 2nd Edition base deck has 127 cards; the code has 117, misses 12 designs (among them Unicorn Phoenix, Black Knight Unicorn, Unicorn Swap, Glitter Tornado, Nanny Cam) and contains 2 cards that belong to expansions. Finishing the base deck needs two of the engine features the expansions need anyway (replacement effects, "look at the top cards"), so it is the right first milestone.
3. **Keep the product shell, rebuild the rules core.** Lobby, expansion selection, sandbox, board components, the log panel, the test suite and all card knowledge are worth keeping. The `Do` / Scene / Instruction core and `G.playerEffects` should be replaced, because:
   - every new kind of effect currently needs changes in about nine files (a new `Do` type, an operation, the dispatch table, the log switch, `canSatisfy`, a `BoardStateKey`, `ActionPanel`, `InfoPanel`, `MobileInfoBar`);
   - the 12 Adventures unicorns on this branch already needed two card-specific operations (`returnSelf`, `stowawaydraw`), a third parallel mechanism (`passive`), and 3 of the 12 do not do what the card says;
   - the remaining 22 Adventures cards cannot be expressed at all: there is no place for replacement effects ("would be destroyed … instead"), Instants other than Neigh, modal Magic cards with multi-step branches, or skipped phases.
4. **Proposed core, in four parts:**
   - a **card registry** — one definition per card design, sets list designs with counts, the game state stores only `cardId → definition id`;
   - a small declarative **effect language** (about 25 primitives plus combinators such as *then*, *or*, *each player*) interpreted by one resumable engine;
   - one **prompt** type as the only contract between engine and UI — every decision any player has to make is a prompt with source card, verb, candidates and limits, answered through a single move;
   - one **event pipeline** every state change goes through, which is where restrictions, replacement effects, triggers and the log are applied.
5. **User-friendliness falls out of that structure.** Prompts carry the card that caused them, the reason, the step number and the legal options, so the "what do I do now" text is generated once for desktop and mobile. The log is produced by the event pipeline, so every effect is logged with its cause without per-card work, including the cases players find most confusing today (an effect that did nothing, a protected card, a declined option).
6. **Hidden information has to be fixed first.** The server currently sends the complete state to every client: all hands and the deck order. Cards such as "look at another player's hand" or "look at the top 3 cards" only make sense once a `playerView` hides that.
7. **Order (decided):** registry → engine with the base deck ported → complete base deck → Adventures as the pilot expansion (it touches almost every capability class) → Dragons → Unicorns of Legend → Christmas → Rainbow Apocalypse → Nightmares → Travel and promo cards → Control & Chaos → NSFW → Diamond. All products are in scope.
8. **Rules (decided):** 19 rule changes are adopted (`rules.md` R1–R19), three wiki rules are deliberately not (reshuffling an empty deck, Neigh voting rounds, sequential begin-of-turn effects). Every change is a named rule option so that a **legacy mode** with today's behaviour can be offered later (5.10).

---

## 2. Scope

### 2.1 Products

Deck construction per the rules: exactly **one base deck** plus any number of **expansions**. Control and Chaos may be combined into one base. **All 12 products are in scope** (decision Q1), built in the order of section 9.

| # | Product | Kind | Cards | Distinct designs¹ | Status in code | Notes |
|---|---|---|---|---|---|---|
| 1 | Base Deck 2nd Edition | base | 127 | 63 | 51 done, 12 missing | A.1 |
| 2 | Adventures | expansion | 54 | 30 | 12 done (3 wrong), 18 missing | A.2 — first non-Neigh Instants |
| 3 | Dragons | expansion | 54 | 21 | — | A.4 — "Dragon" name matters |
| 4 | Unicorns of Legend | expansion | 54 | 26 | 1 (Alignment Change) | A.7 |
| 5 | Christmas Special | expansion | 36 | 21 | — | A.3 |
| 6 | Rainbow Apocalypse | expansion | 55 | 33 (≈25 new) | 3 (shared with base) | A.6 — reuses base cards with other counts |
| 7 | Nightmares | expansion | 53 | 27 | — | A.5 — "remove from the game" zone |
| 8 | Travel Deck | base (small) | 56 | 8 exclusive | — | A.8 — subset of the base deck |
| 9 | Control / Chaos | base ×2 | 150 each | ≈100 | — | A.9 — Ultimate Unicorns, 8 Instant designs that respond to new kinds of events, global replacement effects |
| 10 | Diamond Edition | base + module | 131 | 4 | — | A.10 — needs a dice phase and a "Vault" zone |
| 11 | Vinyl / convention / Kickstarter / retired cards | promo | ≈45 | ≈40 | 1 (Zombie Unicorn) | A.10 |
| 12 | NSFW Base Deck (+ NSFW Expansion) | base | 127 | ≈70 (≈25 new effects) | — | A.11 |

¹ Excluding Baby and Basic Unicorns, which have no effects.

Out of scope: *Unstable Unicorns for Kids* (a different, simplified game) and localisation-only products.

### 2.2 Editions

The wiki lists up to three wordings per card (Original, Second Print, 2nd Edition). Several cards changed behaviour between them (Slowdown, Chainsaw Unicorn, Seductive Unicorn, Magical Kittencorn, Queen Bee Unicorn, Llamacorn, the hand-limit cards). **This plan uses the newest wording of every card** — 2nd Edition, or "C&C Print Second Edition" for Control & Chaos. Retired cards are listed with their last wording.

---

## 3. Rules the engine has to model

Digest of the wiki's terminology pages and rule sheets, limited to what affects the engine. The right-hand column says what the game does today.

This section reports what the wiki says. It is **not** the list of adopted rules: that is `rules.md` section 7. Three wiki rules below are deliberately not adopted — the instant pile (K2: voting rounds stay), simultaneous begin-of-turn effects (K3: they stay sequential) and the 2nd Edition deck-out ending (K1: reshuffling stays) — and Pandamonium follows a house rule (R4) that is narrower than the wiki's masquerade.

### 3.1 Turn structure

| Rule | Today |
|---|---|
| Four phases: Beginning of Turn (BOT) → Draw → Action → End of Turn (EOT). | Two stages (`beginning`, `action_phase`); the draw is the transition between them; EOT is only the hand-limit check inside `end`. |
| Before BOT there is a moment outside any phase (Flare Gun is played there; the retired Puppicorn moves there). | Does not exist. |
| BOT abilities only trigger for cards that were physically in the stable when the turn began. A card that arrives during BOT waits a turn; a card removed during BOT still gets its trigger. | ✅ Scenes are created once in `turn.onBegin`. |
| All BOT abilities are **simultaneous** — one link of the effect chain. Targets are chosen before anything resolves, the same card cannot be chosen twice, and a card that arrived through one BOT ability cannot be used by another (stolen with a lasso → cannot be sacrificed to Glitter Bomb). | Abilities resolve one after another against the live state, so such combinations are possible. |
| Moving on to the Draw phase forfeits unused optional BOT abilities. | ✅ `drawAndAdvance` clears the script. ⚠️ It clears it for *all* players, which would also drop other players' pending mandatory steps. |
| "Immediately end your turn" does not cancel other BOT abilities and never skips EOT. | `mustEndTurnImmediately` flag; other optional scenes stay available. Roughly equivalent. |
| Phases can be skipped by effects (BOT, Draw, Action); multiple skips of the same phase count once. EOT can never be skipped. A skipped BOT means no BOT ability triggers at all. | Not supported. |
| "Draw an *extra* card" is added to the Draw phase and lost if that phase is skipped; a plain "you may DRAW a card" BOT ability draws during BOT. | Not distinguished (no card needs it yet). |
| Action phase: play **one** card *or* draw one card. A Neigh'd card still used up the action. With a play-two effect: play one or two cards, or draw one — never draw plus play. | ✅ (`countPlayedCardsInActionPhase`). |
| EOT: end-of-turn abilities trigger simultaneously, then discard down to the hand limit, re-checking after each discard. | Hand limit only. |
| Hand limit = 7 + all modifiers of cards in play, minimum 0; only checked in your own EOT. | Hard-coded 7 in two places. |
| Extra turns are complete turns taken after the current one. Skipped turns are cumulative. | Extra turn through the `change_of_luck` pseudo-effect; no skipping. |

### 3.2 Playing cards, Instants and Neigh

| Rule | Today |
|---|---|
| "Play" = from hand in your Action phase, or an Instant at any allowed moment. "Bring into a stable" is not playing and cannot be Neigh'd, but the card must still be allowed to enter. | ✅ in spirit (`bringToStable` bypasses the Neigh discussion). |
| Unicorn, Upgrade and Downgrade cards may be played into **any** player's stable. | Unicorns can only be played into your own stable. |
| A card whose first required action is impossible cannot be played (Unicorn Poison without a legal target, Two-For-One without anything to sacrifice, Change of Luck with fewer than 3 cards in hand afterwards). For "each player must …" cards the *caster* must be able to do it. | Not checked; the effect fizzles after the card is spent. |
| Cards in a stable can add requirements to playing (Barbed Wire: if you cannot discard, you cannot play a unicorn into that stable yourself; if an opponent causes it, the discard is simply skipped). | Not checked. |
| Two targeting variants, chosen per game group: (1) declare targets/destination before the Neigh window, (2) Neigh window first, targets afterwards. | Destination of Upgrades/Downgrades is chosen before; everything else after. |
| Instants form a **pile**: only the top card can be responded to; the fastest responder wins and other responses return to hand; the pile resolves from the top; after each resolution the new top card can be responded to again. | Rounds with votes and a parity rule — equivalent for plain Neigh chains, but cannot host other Instants. |
| Super Neigh cannot be Neigh'd but does **not** end the pile. | Ends the discussion immediately. |
| Neigh only stops cards being *played*, never an ability of a card in a stable. You cannot Neigh your own card (2nd Edition wording: "another player"). | ✅ |
| A player with Yay: nothing they play can be Neigh'd, including their own Neigh cards. | Only their non-Instant cards are covered. |
| Other Instants respond to other things: a steal, a sacrifice or destroy, a draw, the start of a turn, a Unicorn / Upgrade / Downgrade / Magic card being played. | Not supported. |

### 3.3 Effects

| Rule | Today |
|---|---|
| Triggered abilities start with "if/when/each time"; everything else on a stable card is continuous. Mandatory unless the text says "may". | ✅ `mandatory` flag per scene. |
| "A **and** B": do both (in any order). "A, **then** B": B only if A was actually performed. "**If you do**": B only if you chose to do A. | "then" is modelled as consecutive actions; "and" is modelled the same way. |
| A cost that was *replaced* (sacrifice turned into a discard by Magic Elixir) still counts as paid for "then", but not for "if you do". | No replacement effects. |
| Sacrifice = own stable, and the sacrificing player picks the card. Destroy = other players' stables only, and the destroying player picks. Discard = own hand. | `findDestroyTargets` does not exclude the protagonist's own stable (please verify — if intended, it is a house rule). |
| One effect picks all its targets at once ("two missiles launched at the same time"): destroying an Upgrade first does not unlock a protected unicorn as the second target of the same effect. | Targets are picked and applied one at a time. |
| A legal target must be chosen if one exists; mandatory effects without a legal target are disregarded ("impossible action"). | ✅ `autoFizzleUnsatisfiable`. |
| A card that just entered is a legal sacrifice for its own enter ability, and is forced if nothing else is available. | ✅ |
| Enter = played, stolen, brought or moved into a stable. Leave = sacrificed, destroyed, stolen, returned to hand, moved, removed from the game. Enter abilities trigger every time. | ✅ via `enter` / `leave`. |
| Searching the deck: the found card is revealed to everyone; you may not "fail to find" a legal card. The discard pile and every player's hand *size* are open information. | Search result is not shown to other players. |
| Pull = random. Choose = look and pick. If the victim's hand is visible, a pull becomes a choice. | `your_hand_is_visible` exists as an effect key but nothing uses it. |

### 3.4 Continuous effects that change what cards are

| Rule | Today |
|---|---|
| **Masquerade** (Pandamonium, Oh Deer, Catastrophe, Otter Devastation, Horse Shit): the unicorn cards in that stable cannot be affected by anything — not sacrificed, destroyed, stolen, moved, returned or removed, not even by their own abilities. Their abilities still work. The owner cannot win. | Only "destroy a unicorn" and "sacrifice" check Pandamonium; "destroy a card", steal, return-to-hand and swap do not. |
| **Blinding** (Blinding Light, Medieval Sanitation, Slothicorn, …): unicorn cards in that stable have no effect text; applied before enter abilities. It does not change the card *type* (a blinded Magical Unicorn is not a "Basic Unicorn card" for Queen Bee). When the blinding card leaves, continuous abilities work again. | Effects are *added once* on enter. A unicorn that entered while blinded never gets its continuous effect back. Also, `enter()` returns early for a blinded unicorn, which appears to skip Barbed Wire and the Tiny Stable check for that entry. |
| Blinding and masquerade together: blinding has priority — enter abilities are suppressed, masquerade then only protects the cards, so leave abilities still work. (Adopted: R1.) | Pandamonium wins; unicorns keep their abilities. |
| Stables have no size limit. | `canEnter` refuses a card when the stable holds 7. |
| Tiny Stable is a state check ("if at any time"), and both double-count unicorns count 2. | Checked only when a card enters; `count_as_two` adds 1 once per player, not per card. |

### 3.5 Winning and the end of the game

| Rule | Today |
|---|---|
| 7 unicorns with 2–5 players, **6 unicorns with 6–8 players**. | Always 7. |
| A player only wins once the whole effect chain has resolved ("you win at the end of a phase"), not the instant the count is reached. | `endIf` runs after every move. |
| Deck runs out (2nd Edition): most unicorns wins; tie → most letters in the names of the unicorn cards; still tied → everybody loses. Reshuffling the discard pile is a house rule from the first edition. | Reshuffles the discard pile into the deck when the deck is empty; ends only if both are empty. |
| Two-player games: a per-set list of cards is removed and each player starts with one Neigh. | Not supported. |

### 3.6 New rule concepts introduced by expansions

- **Replacement effects** — "if X *would* happen, Y *instead*". Only one replacement applies to an event; a replacement never triggers itself; some apply to every player (Dread Pirate Unicorn, Patient Zero Unicorn).
- **Removed from the game** (Nightmares) — a zone with no way back. Counts as leaving the stable, but is neither a sacrifice nor a destroy.
- **Deck positions** — bottom of the deck, top of the deck, look at / reorder / discard the top N cards.
- **Reveal** — a drawn card or a whole hand is shown to all or to one player.
- **Card names matter** — "Dragon", "Narwhal", "Nightmare", "Kittencorn" in the name; "Neigh card" is defined as *a card with Neigh in its name*; exact names for the Seven Sacker searches.
- **Bound cards** — "return *that* unicorn at the end of your turn / when this card leaves". The binding dies when either card leaves its stable, even if it comes back.
- **New card types** — Ultimate Unicorn (not a Magical Unicorn), Diamond Unicorn; "choose a card type" (Nightmare Pact) must pick a concrete sub-type.
- **Chosen values that persist** — a chosen type (Nightmare Pact), a chosen number that later steps refer to ("discard any number, then draw the same number").

---

## 4. Review of the current code

### 4.1 What works well and should be kept

| Area | Why keep it |
|---|---|
| boardgame.io, lobby, `setupData.expansions`, expansion tags in the lobby | The selection flow this branch was created for works; it only needs to become "one base + expansions". |
| Zone layout (`hand`, `stable`, `upgradeDowngradeStable`, `temporaryStable`, `drawPile`, `discardPile`, `nursery`) | Matches the game; add `removed`, and generalise `temporaryStable` to the pile of cards being played (5.7). |
| A server-side queue of pending work that the UI derives its state from (`G.script`) | Right idea; the proposal keeps it and changes what the queue contains. |
| Target finders (`find*Targets`) | They hold real rules knowledge (Pandamonium, Queen Bee, Rainbow Aura, Kittencorn). The logic moves into the central rule queries of 5.5. |
| `autoFizzleUnsatisfiable` | Correct reading of the "impossible action" rule; becomes a property of the interpreter. |
| `ActionPanel` (step counter, Skip button, action label) | Already the beginning of a generic prompt view. |
| `log.ts`, `GameLogPanel`, `MobileGameLogDrawer`, `CardNameToken` | Keep the UI, extend the entry format (section 7). |
| Sandbox mode | Indispensable for testing hundreds of cards; extend it (spawn by definition id, force prompts, set phase). |
| The 19 test files under `src/game/__tests__` | They pin down base-deck behaviour and become the regression suite for the port. |
| Card texts in English and German | Move as they are into the i18n files of the registry. English is the reference; German is optional per card. |

### 4.2 What does not scale

**1. One `Do` type per card instead of per mechanic.** Of the 26 `Do` keys, 11 serve at most one card (`backKick`, `blatantThievery1`, `unicornSwap1`, `unicornSwap2`, `move`, `move2`, `shakeUp`, `reset`, `stowawaydraw`, `returnSelf`, `shuffleDiscardPileIntoDrawPile`). With about 430 designs this approach ends in hundreds of operations.

**2. The UI is wired to operations, not to decisions.** A card definition names a widget (`ui.type: "card_to_card"`), `BoardStateManager` turns operation + widget into one of 36 `BoardStateKey`s, and `ActionPanel`, `InfoPanel`, `MobileInfoBar`, `Board` and `MobileBoard` each switch over those keys. `CLAUDE.md` already has to warn that two files must always be edited together. A new mechanic therefore costs UI work in five places even though the player is only ever asked a handful of question types (pick cards, pick a player, pick an option, yes/no).

**3. Multi-step effects use global scratch space.** `G.clipboard` carries the half-finished state of `move` → `move2` and `unicornSwap1` → `unicornSwap2`; counts are tracked by decrementing `instruction.do.info.count` inside the stored instruction. "Discard any number, then draw the same number" or "choose players, then destroy one unicorn in each" has nowhere to keep its values.

**4. Choices are encoded structurally.** "A or B" is "two instructions for the same player in one action". That cannot express a branch with more than one step (Glowing Horn: *sacrifice then destroy* **or** *bring from discard*; Mysterious Compass), which is why Pillaging Pirate needed the `move2`-after-`steal` special case in `canSatisfyDo`.

**5. Continuous effects are copied into state.** `G.playerEffects` is filled when a card enters and cleaned when it leaves, and a second mechanism (`passive`) is read directly from the card. Stored copies drift: Blinding Light suppresses the *adding*, so the effect is missing forever; double-count is per player instead of per card; every new restriction ("cannot play Magic", "cannot steal", "Magical Unicorns cannot enter") needs a new key plus checks scattered over moves and finders.

**6. There is no single place where a card changes zone.** `destroy.ts` and `sacrifice.ts` duplicate the "this card was sacrificed or destroyed" handling; Narwhal Torpedo's automatic sacrifice bypasses it; `returnToHand`, `steal`, `move`, `swap` each call `leave`/`enter` themselves. Replacement effects, protection, Instants that react to a destroy, and consistent logging all need exactly one such place.

**7. Neigh is a special subsystem.** `neighDiscussion` only understands "stop the card and discard it", is entered from two near-identical moves, and has no notion of other things an Instant could respond to.

**8. Turn flow is spread over flags.** `mustEndTurnImmediately`, `countPlayedCardsInActionPhase`, the `change_of_luck` pseudo-effect and the hard-coded hand limit each solve one card. Skip-phase, skip-turn, extra plays and extra turns from other cards need a turn-state object.

**9. Card data.** `card.ts` is one 2,500-line array mixing rules, images and two languages; a card's `count` is global although Llamacorn is ×1 in the base deck and ×2 in Rainbow Apocalypse; "narwhal" is used as a card *type* although it is only part of some names; `G.deck` copies every definition (including both description texts) into the game state that is synchronised to all clients after every move.

**10. Technical debts that expansions make urgent.**
- No `playerView`: every client receives all hands and the deck order.
- Moves use `_.shuffle`, `_.random`, `_.uniqueId` and `Date.now()` instead of boardgame.io's seeded `ctx.random`. Moves run optimistically on the client first, so the client briefly shows a different random result than the server; ids from a process-wide counter can repeat after a server restart.
- `endIf` is evaluated after every move, i.e. in the middle of an effect chain.

### 4.3 Verdict on the Adventures work on this branch

The data is useful (card list, images, both languages, the intended behaviour). The implementation pattern should not be continued: 12 cards needed 2 new one-off operations and a `passive`, and three of them deviate from the printed card:

| Card | Card says | Code does |
|---|---|---|
| Hornswoggler Unicorn | discard your hand, then draw 3 — or trade hands | draws without discarding |
| Salty Seadogicorn | *each other player* discards — or draw | one chosen player discards |
| Fearless Unicorn | add an *Instant* from the discard pile | filter is "neigh" only |

Further data deviations: the four Adventures basics are ×1 instead of ×3; Zombie Unicorn and Alignment Change sit in `base_game`; the basic Narwhal is ×3 instead of ×1.

**Recommendation:** freeze feature work on the old core, migrate in the stages of section 9, and re-enter the Adventures cards in the new format (Appendix A.2 has the full list).

### 4.4 Check against `master` and the reference docs (2026-11-17)

- `master` (`800c931`, fetched 2026-11-17) is fully contained in `select_extensions`; it has nothing this branch lacks. Its base-game rules and cards are identical. It has no set selection and none of the 12 new Adventures unicorns, so every finding of this section applies to `master` as well.
- `origin/tests-sandbox` has one commit that is not on this branch: two test files (`card-interactions.test.ts`, `sandbox.test.ts`) and test helpers. Worth merging before stage 3, because those tests add to the regression suite.
- `rules.md`, `cards.md` and `effects.md` dated from April 2026 and had drifted from the code (for example: "the game ends when the draw pile runs out" while the code reshuffles; Chainsaw Unicorn ×2; no mention of the Adventures cards, passives or automatic fizzling). They were rewritten on 2026-11-17 to describe the code as it is, with the decided changes kept separately in `rules.md` section 7.

---

## 5. Target architecture

Layering (each layer only imports from the ones above it; all of it stays inside `src/game/` so the server build is unaffected):

```
cards/        definitions, sets, texts            (data, no logic)
engine/
  state.ts    game state shape
  rules.ts    pure questions about a state        ("may this card be destroyed by that one?")
  events.ts   the only code that mutates zones    (restrictions → replacement → apply → log → triggers)
  effects/    the effect language + interpreter   (creates prompts, emits events)
  play.ts     playing cards, response rounds      (Neigh voting, generalised)
  turn.ts     phases, extra/skipped turns, win check
  prompt.ts   prompt types + answer validation
  log.ts      log entry types
game.ts       boardgame.io wiring: setup, moves, playerView
```

### 5.1 Card registry and sets

One **definition** per card design, one **set** per product, and card **instances** in the game state that only point to a definition.

```ts
// cards/types.ts
type CardType = 'baby' | 'basic' | 'magical' | 'ultimate' | 'diamond'
              | 'upgrade' | 'downgrade' | 'magic' | 'instant';

interface CardDef {
  id: string;                 // 'unicorn_phoenix' — stable, used in saves, tests, sandbox, logs
  name: string;               // printed English name; name-based rules match against this
  type: CardType;
  image: string;
  abilities: Ability[];       // section 5.3; empty for Baby/Basic
}

interface CardSet {
  id: string;                               // 'base_2e', 'adventures_2e', …
  kind: 'base' | 'expansion' | 'promo';
  cards: { def: string; count: number }[];  // the inventory list of Appendix A
  nursery: string[];                        // baby definitions
  twoPlayerRemove?: string[];
  combinableWith?: string[];                // control ↔ chaos
}
```

- `narwhal`, `neigh` and `super_neigh` stop being card types. "Narwhal", "Dragon", "Nightmare" are **name matches** (`nameIncludes`), exactly as the cards word it. "Neigh card" = an Instant with "Neigh" in its name. "Cannot be Neigh'd" is an ability of the card.
- "Is a unicorn" = type is one of `baby | basic | magical | ultimate | diamond`.
- Texts live in `cards/i18n/en.ts` and `de.ts`, keyed by definition id (`text`, optional `flavor`). English is required and is the reference; German is optional and falls back to English (5.11). Definitions stay readable and a missing English text is detectable by a test.
- Files: `cards/defs/<set>.ts` for definitions, `cards/sets/<set>.ts` for inventories. A design that appears in several products (Llamacorn, Unicorn Phoenix, Magical Kittencorn, Zombie Unicorn) is defined once and listed in several sets.
- `buildDeck(setIds, options)` validates the combination (exactly one base, or Control + Chaos), applies the two-player removal list, and returns instances. If two selected sets both contain a design (base + Rainbow Apocalypse both list Llamacorn), the copies add up — that is what shuffling the physical decks together does.
- The game state keeps `cards: Record<CardID, { def: string }>`. Definitions are looked up in the registry on both server and client and are **never copied into `G`**, which shrinks the synchronised state considerably.

### 5.2 Game state

```ts
interface GameState {
  cards: Record<CardID, { def: string }>;
  zones: {
    deck: CardID[]; discard: CardID[]; nursery: CardID[]; removed: CardID[];
    hand: Record<PlayerID, CardID[]>;
    stable: Record<PlayerID, CardID[]>;      // unicorns, upgrades and downgrades together; the UI groups by type
    pile: PileEntry[];                        // cards currently being played (replaces temporaryStable + neighDiscussion)
  };
  cardState: Record<CardID, {                 // per-instance memory, cleared whenever the card changes zone
    enteredSeq: number;                       // increases on every zone change → "treat it as a new card"
    bound?: { card: CardID; seq: number }[];  // "return that unicorn …"
    chosen?: string;                          // Nightmare Pact's chosen type
  }>;
  turn: TurnState;                            // 5.8
  chain: Link[];                              // effects waiting to resolve / in progress (5.4)
  prompts: Prompt[];                          // open decisions, possibly for several players at once (6)
  log: LogEntry[];                            // 7
  seq: number;                                // deterministic id counter (replaces _.uniqueId)
  options: GameOptions;                       // sets, rule options (5.10), timers …
  // pregame, lobby owner, heartbeat, sandbox: unchanged
}
```

Nothing derived is stored: no `playerEffects`, no flags such as `mustEndTurnImmediately`. Whether a player may play Upgrades, what their hand limit is, or whether a card can be destroyed is *computed* from the cards in the stables (5.5).

### 5.3 Abilities and the effect language

A card definition is a list of abilities of five kinds:

```ts
type Ability =
  | { kind: 'spell';       effect: Effect }                                    // Magic: resolves when played
  | { kind: 'triggered';   on: Trigger; effect: Effect }                       // ENTER, BOT, SD, LEAVE, EOT, WHEN …
  | { kind: 'static';      rule: StaticRule }                                  // CONT: restrictions, protection, modifiers
  | { kind: 'replacement'; replaces: EventPattern; optional: boolean; effect: Effect }   // INSTEAD(…)
  | { kind: 'instant';     window: WindowPattern; effect: Effect };            // INSTANT[…]
```

`Effect` is a small tree of plain data (so a half-resolved effect can sit in the game state between two moves).

**Steps** (leaves — each maps to one or more events of 5.6):

| Step | Parameters | Covers |
|---|---|---|
| `draw` | count, who | DRAW |
| `discard` | count, who, filter | DISCARD, "discard your hand" (`count: 'all'`) |
| `sacrifice` | count, who, filter | SACRIFICE (the affected player chooses) |
| `destroy` | count, filter | DESTROY (the acting player chooses, other stables only) |
| `steal` | count, filter | STEAL |
| `returnToHand` | filter | "return a card in a stable to its owner's hand" |
| `move` | filter, to | stable → another stable; also "move this card" |
| `bring` | from (hand / discard / nursery / deck / revealed), filter, toStable | "bring … into a stable" |
| `addToHand` | from (discard / revealed / another hand), filter | "add … to your hand", "choose a card from their hand" |
| `search` | filter, then (`addToHand` or `bring`) | search the deck, reveal, shuffle |
| `pull` | from, count | random card from a hand (becomes a choice if that hand is visible) |
| `give` | count, to | hand → another player's hand |
| `tradeHands` / `passHands` | with / direction | Unfair Bargain, Merry-Go-Round |
| `lookAtTop` | count, then (keep / give / discard / reorder) | Unicorn Oracle and relatives |
| `reveal` | what, to | revealed draws, shown hands |
| `putInDeck` | filter, position (top / bottom / shuffle) | Dragon Skies, Unicorn Abduction, Foxicorn |
| `removeFromGame` | filter | Nightmares |
| `shuffleDiscardIntoDeck` | | Mystical Vortex, Reset Button |
| `turn` | extraTurn / skipTurn(who) / skipPhase(phase) / endTurn / extraPlay | all turn manipulation |
| `playNow` | card | "immediately play it" (a real play: can be Neigh'd, requirements apply) |
| `remember` | key, value | chosen type, bound card |
| `custom` | handler id, args | escape hatch for one-of-a-kind cards (Cosplay Unicorn, Sharing Is Caring, the Diamond dice) |

**Combinators:**

| Combinator | Card wording | Semantics |
|---|---|---|
| `all(a, b, …)` | "A and B" | do every part that is possible |
| `then(a, b)` | "A, then B" | b only if a was performed (a replaced a still counts) |
| `ifYouDo(a, b)` | "you may A. If you do, B" | b only if the player chose a and a itself happened |
| `may(a)` | "you may A" | the player is asked first; declining ends the branch |
| `oneOf(a, b, …)` | "A OR B" | the player picks one mode; modes that are impossible are shown disabled with the reason |
| `forEach(players, a)` | "each player …", "each other player …" | one sub-effect per player; their prompts are open at the same time |
| `counted(n => a)` | "any number … the same number", "for each …" | binds a number chosen or computed in an earlier step |
| `when(condition, a)` | "if you have …", "if it is a Neigh card" | condition over the current state or a remembered value |

**Selectors** used inside steps: players (`you`, `each`, `eachOther`, `chosen(1)`, `chosen(upTo(n))`, `chosen(anyNumber)`, `ownerOf(x)`, `thatPlayer`), cards (`{ zone, owner, type, nameIncludes, not: 'self' }`, `self`, `that`), counts (`n`, `all`, `upTo(n)`, `anyNumber`, `same`, `countOf(filter)`).

**Examples** (helper functions keep definitions close to the card text):

```ts
card('seductive_unicorn', 'Seductive Unicorn', 'magical',
  onEnter(may(then(discard(1), steal(1, UNICORN)))));

card('glowing_horn', 'Glowing Horn', 'magic',
  spell(oneOf(
    then(sacrifice(1), destroy(1)),
    bring({ from: 'discard', filter: STABLE_CARD }))));

card('unicorn_phoenix', 'Unicorn Phoenix', 'magical',
  instead(wouldBe(['sacrificed', 'destroyed'], SELF), { optional: true }, discard(1)));

card('queen_bee_unicorn', 'Queen Bee Unicorn', 'magical',
  rule(cannotEnter({ type: 'basic' }, { stables: 'othersThanYours' })));

card('nog_wild', 'Nog Wild', 'magic',
  spell(all(counted(discard(anyNumber()), n => draw(n)), turn('extraTurn'))));

card('extremely_small_backpack', 'Extremely Small Backpack', 'downgrade',
  whenever(youDraw(), discard(1)),
  stateCheck(handIsEmpty(), move(SELF, { to: chosenPlayer({ other: true }) })));

card('unicorn_net', 'Unicorn Net', 'instant',
  instant(onAttempt(['sacrifice', 'destroy'], { by: 'anyone' }), replaceWith(addToHand(THAT_CARD))));

card('unicorn_oracle', 'Unicorn Oracle', 'magical',
  onEnter(lookAtTop(3, { keep: 1, rest: 'topAnyOrder' })));
```

**Why data instead of a function per card?**

- The interpreter must stop at every player decision and continue in a later move, possibly for several players at once. With data that is a stack of positions in the tree; with functions it means hand-written state machines — which is what `move`/`move2` and `unicornSwap1`/`unicornSwap2` are today.
- Play requirements can be **derived**: "can the first mandatory step be performed?" is answered by walking the tree. No per-card `canPlay`.
- Prompt texts, log entries and the "what will this do" summary are generated from the same tree.
- A startup test can validate all 430 definitions (unknown filters, unbound counts, unreachable branches).
- Cards that truly do not fit use `custom` with a registered handler, so the language does not have to grow for single cards.

### 5.4 Resolution: effect chain, interpreter, prompts

- `chain` is a stack of **links**. A link is one ability instance: source card, controller, the effect tree and the interpreter's position in it, plus values bound so far (chosen cards, numbers, players).
- The engine runs `advance(G)` after every move: it steps the top link until it needs a decision (→ creates a **prompt** and stops), finishes (→ pops the link), or an event triggers new abilities (→ pushes links on top). When the chain is empty the turn machine continues.
- A step that cannot be performed is skipped and reported to the log as "no legal target" / "nothing to discard" (the impossible-action rule). `then` and `ifYouDo` see that their first part did not happen.
- Decisions are answered with **one move**: `respond(promptId, answer)`. The server re-computes the legal candidates and rejects anything else. This replaces `executeDo`, `commit`, `skipExecuteDo`, `playNeigh`, `playSuperNeigh` and `dontPlayNeigh`.
- Triggered abilities that fire from the same event form one **group**; the controller is asked in which order to resolve them only if there is more than one and it matters. Mandatory ones first.

**Simultaneity (decided).**

1. *Groups stay sequential (K3).* Begin-of-turn abilities, and any other abilities that trigger together, are resolved one at a time in the order the player picks, against the live state. A card that arrived through one ability can be used by the next — a lassoed unicorn may be sacrificed to Glitter Bomb. The wiki's stricter reading is not adopted.
2. *All targets first for one step (R15).* A step with several targets (`destroy(2)`, "destroy a unicorn in each other stable") collects all choices against the state before the step, then applies them together. Destroying an Upgrade does not unlock a protected unicorn as the second target of the same step.

### 5.5 Rule queries (continuous effects)

`engine/rules.ts` answers questions about a state; nothing else decides them. Every query scans the static abilities of cards in stables, skipping abilities that are switched off (blinded unicorns, Downgrades under Dragon's Blessing).

| Query | Replaces / enables |
|---|---|
| `canPlay(G, player, card)` → ok or reason | type restrictions (no Upgrades / Neigh / Instants / Magic / Magical Unicorns / Basic Unicorns), derived play requirement, added requirements (Barbed Wire, Tollbooth, Unicorn Caroler), plays left this turn |
| `canEnter(G, card, stable)` → ok or reason | Queen Bee, Tourist Trap, Extreme Adventurer, Humbug, Saved by the Sigil, Eunuchorn, "needs a Basic Unicorn in that stable" |
| `canBeAffected(G, card, verb, source)` → ok or reason | masquerade, Rainbow Aura, Magical Kittencorn, Dragon Slayer, The Tiniest Unicorn, Phantom, Nutcrackercorn, Ugly Holiday Sweater, Paranormal Affection, Diamond Unicorns, Baby-to-Nursery rule |
| `mayPerform(G, player, verb)` | "you cannot DESTROY cards", "you cannot STEAL cards" |
| `isBlinded(G, card)`, `isMasked(G, card)` | Blinding Light family, masquerade family |
| `unicornCount(G, player)`, `winThreshold(G, player)`, `canWin(G, player)` | double-count cards (per card), 6 vs 7, Imaginary Friendicorn, "you cannot win" cards, masquerade |
| `handLimit(G, player)` | all hand-limit cards |
| `handVisibleTo(G, owner, viewer)` | Nanny Cam, Clairvoyant Unicorn, temporary reveals |
| `playsAllowed(G, player)` | Double Dutch and relatives |
| `canBeNeighed(G, pileEntry)` | Yay, Wrecking Ball Unicorn, Super Neigh, Elusive Oceloticorn |

**Pandamonium and the other masquerade cards (R4, house rule).** Not blanket immunity as on the wiki. The rule is applied where card filters are evaluated: a filter that asks for a *Unicorn card* ("destroy a Unicorn card", "steal a Unicorn card", "sacrifice a Unicorn card", "each time a Unicorn card leaves") does not match unicorns in a masked stable; a filter that asks for *a card* does. `isMasked` is therefore consulted by the filter matcher, not by each step. Entering is evaluated before the mask applies, so Barbed Wire still fires when a unicorn enters (R14).

Every "no" comes with a **reason** (source card + rule). The UI shows it on disabled cards and options ("cannot be destroyed — Rainbow Aura"), and the log uses it when an effect does nothing.

Effects with a duration ("cannot play a Neigh this turn", "play 2 cards this turn", "skip your Action phase") are entries in `turn.modifiers` with an explicit expiry, read by the same queries.

### 5.6 The event pipeline

Every change to a zone, hand or turn goes through `emit(G, event)`. Events are a closed list: `cardPlayed`, `cardMoved` (with `from`, `to` and a **cause**: play, bring, steal, move, sacrifice, destroy, return, discard, draw, pull, give, search, remove, shuffleIn), `cardsDrawn` (one event per draw action, so "each time you draw any number of cards" fires once), `handRevealed`, `deckShuffled`, `phaseStarted`, `turnStarted`, `turnEnded`.

For each event, in this order:

1. **Restrictions** — `rules.canBeAffected` / `mayPerform`. Illegal → nothing happens, logged with the reason.
2. **Response round** — if an Instant in the card pool can respond to this kind of event (steal, sacrifice/destroy, draw), a response round opens (5.7).
3. **Replacement** — abilities whose pattern matches. If several match, the affected player picks one; optional ones are offered as a yes/no prompt. The event is marked as replaced so that no second replacement applies and the replacing ability cannot trigger itself.
4. **Apply** — move the card. Built-in rules live here: a Baby that would go anywhere but a stable goes to the Nursery; a Magic or Instant card leaving the pile goes to the discard pile; `cardState` of a moved card is reset.
5. **Log** — one entry (section 7).
6. **Triggers** — collect triggered abilities that listen (the card's own ENTER / LEAVE / SD abilities, and "each time …" abilities of other cards), push them as a group.
7. **State checks** — "if at any time …" abilities (Tiny Stable, Hex, Extremely Small Backpack, Unicorn Abduction) and the win check flag.

This is the single place that the current `leave`/`enter` pairs, the duplicated SD handling and the scattered `pushLog` calls collapse into.

### 5.7 Playing cards and response rounds

Decision K2: the **voting rounds** of today's Neigh discussion stay; the wiki's instant pile (fastest response wins, pile re-opens after every resolution) is not adopted. The rounds are generalised so that Instants other than Neigh fit in, and adjusted by R3 (Super Neigh), R12 (Yay) and R18 (targets first).

1. `playCard(cardId, declared)` — legal if `rules.canPlay` says so, which includes R10: the card's first required action must be possible. The card moves from hand to `zones.pile`. By default (R18) the player names the destination stable of a Unicorn / Upgrade / Downgrade and the targets of the first required action **now**, before anyone votes; with the game option "targets after voting" they are named in step 6 instead.
2. `cardPlayed` is emitted (Critical Hit, Trojan Unicorn, Tollbooth, Sentinel Unicorn listen here).
3. **Round.** Every player who is able to respond to the top pile entry gets a `respond` prompt: play an Instant whose window matches that entry, or pass. Players who cannot play Instants (Slowdown, Ginormous Unicorn, Brain Freeze) are skipped. If the entry cannot be Neigh'd (the player has Yay — R12 makes this cover their Instants too —, or the card says so) only non-Neigh Instants are offered; if nobody can respond, there is no round.
4. The first valid response closes the round, goes on top of the pile and opens a new round for itself (its player does not vote in it).
5. **Super Neigh (R3)** cannot be responded to. It takes effect at once: it cancels the entry below it and both leave the pile. Voting then re-opens on the entry that is now on top, which can be answered again. If the cancelled entry was the original card, the discussion is over.
6. When a round ends with everybody passing, the pile **resolves from the top down without further rounds**: each Instant applies its effect to the entry below it (stop and discard, remove from the game, put on top of the deck, take and replay, …); an entry that was cancelled is skipped. For plain Neighs this is today's rule: an odd number of entries above the card stops it, an even number lets it through.
7. If the original card is still on the pile it resolves: a stable card enters the declared stable (an `enter` event), a Magic card resolves its `spell` and is discarded.

Other Instants respond to events instead of played cards — `stealAttempt` (Fishing Rod), `sacrificeOrDestroyAttempt` (Unicorn Net, Intervention, Redirect, Bulletproof Vest), `drawAttempt` (Trapped Chest), `turnStart` (Flare Gun). They use the same rounds with the pending event as the bottom entry. Such a round only opens if a card that can respond to that kind of event is part of the selected sets, so games without those cards are not slowed down.

**Not leaking information.** If only players who hold a matching Instant were asked, everyone would learn who holds one. Therefore the round is opened for all eligible players, and the per-player setting "pass automatically when I cannot respond" answers after a short randomised delay on the server. The current client-side `autoDontNeigh` timer moves there.


### 5.8 Turn machine

```ts
interface TurnState {
  player: PlayerID;
  phase: 'pre' | 'bot' | 'draw' | 'action' | 'eot';
  botSnapshot: CardID[];                    // cards in the stable when the turn began
  played: number; drewForAction: boolean;
  skip: { bot?: boolean; draw?: boolean; action?: boolean };
  endAfterBot?: boolean;                    // "immediately end your turn"
  drawReplacement?: CardID;                 // Royal Hooves
  extraDraws: number;                       // "draw an extra card"
  modifiers: TurnModifier[];                // expiring effects
}
// global: extraTurns: PlayerID[]  ·  skipTurns: Record<PlayerID, number>
```

Phases are advanced by the engine whenever the chain and the prompt list are empty; the only "free" choices of the active player are: use or decline optional BOT abilities, play a card, draw for the action, end the turn. The win / deck-out check runs at exactly those quiet points.

In boardgame.io terms: all players stay in one stage for the whole game (prompts decide who may act), `events.endTurn({ next })` handles extra and skipped turns, and the game-end check moves from `endIf` to the quiet-point check calling `events.endGame`.

### 5.9 Hidden information and determinism

- Add `playerView`: other players' hands become counts (unless `rules.handVisibleTo` allows it), the deck becomes a count, the private parts of other players' prompts are removed, and private log entries are redacted (section 7).
- Gameplay moves become server-only (`client: false`) so the client never needs hidden state to run them.
- All randomness through `ctx.random`; ids from `G.seq`; no `Date.now()` inside moves (timestamps for the log can be added by the server outside the reducer or dropped in favour of the sequence number).
- This step is independent of the rest and can be done first.

### 5.10 Rule options and legacy mode

Every decided rule change (`rules.md` section 7) becomes a named option instead of a hard-coded behaviour. Two presets exist: **standard** (the decided rules) and **legacy** (today's behaviour). The options are only read in `rules.ts`, `play.ts` and `turn.ts`; card definitions never look at them.

```ts
interface RuleOptions {
  blindingBeatsMasquerade: boolean;                     // R1   legacy: false
  winThreshold: 'byPlayerCount' | 7;                    // R2   legacy: 7
  superNeigh: 'cancelsTarget' | 'endsDiscussion';       // R3   legacy: 'endsDiscussion'
  masqueradeScope: 'unicornFilters' | 'legacy';         // R4   legacy: see rules.md section 5
  tinyStable: 'continuous' | 'onEnter';                 // R5   legacy: 'onEnter', one +1 per player
  winCheck: 'whenResolved' | 'everyMove';               // R7   legacy: 'everyMove'
  stableLimit: number | null;                           // R8   legacy: 7
  playUnicornIntoAnyStable: boolean;                    // R9   legacy: false
  playRequirement: boolean;                             // R10  legacy: false
  destroyOwnStable: boolean;                            // R11  legacy: true
  yayCoversInstants: boolean;                           // R12  legacy: false
  blindingRestoresEffects: boolean;                     // R13  legacy: false
  barbedWireOnMaskedLeave: boolean;                     // R14  legacy: true
  multiTarget: 'atOnce' | 'sequential';                 // R15  legacy: 'sequential'
  revealSearch: boolean;                                // R16  legacy: false
  targetsBeforeVoting: boolean;                         // R18  legacy: false (also a normal game option)
  twoPlayerRules: boolean;                              // R19  legacy: false
                                                        // R20 (both piles empty → game ends) applies in both presets
  cardVariants: Record<string, 'legacy'>;               // R6, R17: Mermaid Unicorn optional, Zombie Unicorn discards any card
}
```

- Card-level changes (R6, R17) are alternative definitions in the registry (`mermaid_unicorn` and `mermaid_unicorn@legacy`); the preset decides which one a set resolves to.
- K1–K3 need no option: they are the same in both presets.
- The three card fixes (Hornswoggler Unicorn, Salty Seadogicorn, Fearless Unicorn) and the issues I1–I10 of `rules.md` are bugs, not rules. Legacy mode does not reproduce them unless explicitly wanted (open point O5).
- The legacy preset is useful before it is ever offered to players: in stage 3 the old test suite runs against the new engine *with the legacy preset*, which is what proves the port is faithful. Stage 4 then switches the default to standard.
- Ruling tests (10.2) state which preset they assume; rules that differ get one test per preset.

### 5.11 Card texts and images

**Texts (decision Q11).** English text is required for every card and is the reference. German is optional per card and falls back to English. No translations are written as part of this plan. What the wiki offers (checked 2026-11-17 in the "Localizations of this Card" section of all card pages):

| Set | German text on the wiki |
|---|---|
| Base Deck 2nd Edition | yes — 73 of 79 card pages, plus a [German inventory list](https://www.unstablegameswiki.com/index.php?title=Unstable_Unicorns_-_Base_Deck_-_2nd_Edition_-_German_-_Inventory_List) with the German card names |
| Rainbow Apocalypse | only for the cards it shares with the base deck |
| Adventures, Dragons, Unicorns of Legend | no (Spanish only) |
| Christmas, Nightmares, Travel exclusives | no localisation listed |
| Control & Chaos, vinyl, convention and Kickstarter cards | marked as not localised |
| NSFW | Polish only |

**Decided:** where a card has no German text, the English text is shown, also when the language is set to German. Expansion cards therefore ship with English text only for now. The existing German texts of the base cards in `card.ts` are kept; where an official German text exists on the wiki it can replace them later.

**Images (decision Q12).** Source: `https://www.unicornsdatabase.com/cards/`. Seen there on 2026-11-17: full-card portrait scans (listing thumbnails 400 × 554/566 px JPG) with file names that carry the same set codes as the wiki (`UU-Rain-011`, `UU-Chao-003`, `UU-ChCo-073`). The game currently uses square art crops (`src/assets/card/square/<image>.png`, about 273 × 277 px). Pipeline:

1. A mapping file `definition id → source image` (the set code + number is the natural key).
2. A script that downloads the listed files once, crops the art box (its position is constant per card frame) and writes `<definition id>.png` in the current format.
3. The registry validation test fails for any definition without an image.

**Decided:** images are cropped so that they look like the current ones (square art crop, same size and format). The full scans are only the source of the crop; the card detail view keeps using the crop. Card art and texts belong to the publisher; that the public server may show them is assumed, as it does today.


---

## 6. Prompts — one contract between engine and UI

Everything a player is ever asked is one of these:

```ts
interface Prompt {
  id: string;
  player: PlayerID;
  kind: 'confirm' | 'chooseMode' | 'chooseCards' | 'choosePlayers' | 'chooseNumber'
      | 'arrange' | 'chooseStable' | 'chooseType' | 'respond';
  verb: Verb;                         // 'discard', 'destroy', 'steal', 'sacrifice', 'bring', 'search', …
  source: { card: CardID; ability: number; controller: PlayerID };
  cause?: LogEntryId;                 // the event that led here ("because Bob played Llamacorn")
  optional: boolean;                  // may the player decline?
  min: number; max: number;
  candidates: Candidate[];            // cards (with zone + owner), players, modes, numbers
  disabled?: { candidate: Candidate; reason: Reason }[];   // shown greyed out with the explanation
  step?: { index: number; of: number; role: 'cost' | 'effect' };
  preview?: string[];                 // what happens next ("then: STEAL a Unicorn card")
  privateCards?: CardID[];            // cards only this player may see (top 3 of the deck, a looked-at hand)
  default?: Answer;                   // used by auto-pass and timeouts
}
```

| Kind | Used for | Widget (reusing what exists) |
|---|---|---|
| `confirm` | "you may …", optional replacement ("Unicorn Phoenix would be destroyed — discard a card instead?") | `ActionPanel` buttons |
| `chooseMode` | "A OR B", "skip Draw or Action phase" | `ActionPanel` buttons, disabled modes with reason |
| `chooseCards` | discard / sacrifice / destroy / steal / return / move / bring / add / search / pick from revealed cards | click in hand or stable (existing highlight + arrow), or the `Finder` overlay for discard pile, nursery, deck and revealed sets; multi-select with min/max |
| `choosePlayers` | "another player", "any number of players", destination of a move | click on a player field |
| `chooseNumber` | "any number" when it is not implied by a card selection | stepper |
| `arrange` | "return them to the top in any order", distribute looked-at cards (keep / give / discard) | new small drag-or-tap list |
| `chooseStable` | destination for a played or moved Unicorn / Upgrade / Downgrade | click on a player field |
| `chooseType` | Nightmare Pact | buttons |
| `respond` | Response round: play a matching Instant or pass | existing Neigh panel / modal, generalised |

Consequences:

- **One renderer.** A `PromptView` picks the widget from `kind` and the zones of the candidates. `BoardStateManager` shrinks to the free actions (play / draw / end turn / wait).
- **One text source.** `describePrompt(prompt, lang, device)` produces the instruction line for both `InfoPanel` and `MobileInfoBar` ("Click …" vs "Tap …"). The rule that those two files must be edited together disappears; a new card needs no UI text at all.
- **Always answerable questions for the player:** *Who asks?* (source card, shown next to the prompt, with its text on hover/long-press) · *Why?* (cause: "Bob played Llamacorn") · *What exactly?* (verb + count: "Discard 2 cards — 1 of 2 chosen") · *What then?* (preview) · *Can I say no?* (Skip only when `optional`) · *Why can't I pick that?* (disabled reason).
- **Waiting is visible.** Because open prompts of all players are in the public state (without their private parts), the UI can show "Waiting for Ana and Ben to discard" instead of a generic wait message.
- **No stalls.** Every prompt has a default answer (pass, decline, or a random legal pick for mandatory choices). The game owner can force it — today's owner-`end` generalised — and an optional per-game timer can do so automatically.

Game options that belong to user-friendliness and need a home in `GameOptions` / the settings menu: when targets are named (R18: before the voting by default, option "after"), auto-pass when unable to respond (on), response timer (off by default), confirm-before-irreversible (sacrificing a unicorn, playing a Downgrade into your own stable), two-player rules (R19: on automatically with 2 players), rule preset (standard / legacy, 5.10).

---

## 7. Log — what has to be stored

The current `LogEntry` (`actor`, `kind`, `sourceCardID`, `targetCardID`, `targetPlayer`, `count`) records single operations. To explain a game it also needs causality, visibility and non-events.

```ts
interface LogEntry {
  id: number;                    // G.seq
  turn: number; phase: Phase;
  parent?: number;               // the entry that caused this one → the log is a tree
  kind: 'event' | 'decision' | 'info';
  verb: Verb;                    // play, neigh, draw, discard, sacrifice, destroy, steal, move, bring, return,
                                 // search, pull, give, reveal, look, shuffle, remove, skip, extraTurn, win, …
  actor: PlayerID;               // who did it
  source?: { card: CardID; ability?: number };   // which card made it happen
  role?: 'cost' | 'effect' | 'replacement' | 'trigger' | 'rule';
  cards?: CardID[];              // affected cards
  from?: ZoneRef; to?: ZoneRef;
  players?: PlayerID[];          // affected / chosen players
  count?: number;
  outcome?: 'done' | 'prevented' | 'replaced' | 'fizzled' | 'declined' | 'neighed';
  reason?: Reason;               // for prevented / fizzled: the card or rule responsible
  visibility: 'public' | PlayerID[];             // redacted in playerView
  publicText?: 'count-only';     // e.g. others see "drew 2 cards", the owner sees which
}
```

What this makes possible, with **no per-card work**, because entries are written by the event pipeline (5.6), the interpreter (decisions) and the turn machine:

| Need | Stored as |
|---|---|
| Grouped history: "Ana played Glowing Horn → chose *sacrifice, then destroy* → sacrificed Rhinocorn → destroyed Ben's Yay" | `parent` chain; the panel indents or collapses children |
| "Why did nothing happen?" | `outcome: 'fizzled'` + reason ("no Unicorn card could be destroyed"), `outcome: 'prevented'` + reason ("Rainbow Aura") |
| Replacements | the original event with `outcome: 'replaced'`, the substitute as its child with `role: 'replacement'` |
| Decisions | chosen mode, declined optional ability, passes in a response round (summarised: "nobody responded") |
| Costs vs effects | `role` — rendered as "discarded 2 cards **to** steal …" |
| Secret information | `visibility`: a pulled card is visible to both players involved, a drawn card only to its owner, a search result to everyone (the rules require revealing it), a looked-at hand only to the looker |
| Turn structure | `info` entries for turn start, skipped phases ("Draw phase skipped — Hex"), extra and skipped turns |
| Triggers | `role: 'trigger'` with the source card: "Barbed Wire: Ben must discard a card" |
| End of game | winner, count, and the deciding rule for deck-out ties |

UI additions that this data enables: a "last action" banner for the other players' turns, per-turn collapsing, filter by player or card, hover on a log line to highlight the cards involved, and a replay of the last effect chain.

Texts are generated from `verb` + `role` + `outcome` templates in English (German templates optional); no card needs its own log text.

---

## 8. Engine capabilities and which set needs them

The tags used in the "Needs" columns of Appendix A.

### 8.1 Definitions

| Tag | Capability | Where in section 5 |
|---|---|---|
| `T.sd` / `T.destroyed` / `T.leave` | triggers when this card is sacrificed-or-destroyed / destroyed only / leaves in any way | 5.6 step 6 |
| `T.eot` | end-of-turn triggers | 5.8 |
| `T.event` | "each time …" triggers on other cards' events (enter, leave, draw, discard, steal, destroy, play, Neigh played) | 5.6 step 6 |
| `T.state` | "if at any time …" checks | 5.6 step 7 |
| `S.restrict` | "you cannot play/do X" | 5.5 `canPlay`, `mayPerform` |
| `S.entry` | which cards may enter which stable | 5.5 `canEnter` |
| `S.protect` | cannot be destroyed / sacrificed / stolen / Neigh'd, with source conditions | 5.5 `canBeAffected`, `canBeNeighed` |
| `S.masq` / `S.blind` | masquerade / blinding | 5.5 `isMasked`, `isBlinded` |
| `S.count` / `S.win` | counts as 2; cannot win; win threshold changes | 5.5 |
| `S.handlimit` / `S.handvisible` / `S.playcount` | hand limit modifiers / visible hands / extra plays | 5.5 |
| `S.nullify` | switches other cards' abilities off | 5.5 |
| `R` | replacement effects | 5.6 step 3 |
| `I.play` | Instants responding to a played card, with riders (draw, discard, remove, top of deck, take-and-replay) | 5.7 |
| `I.steal` / `I.sacdestroy` / `I.draw` / `I.turnstart` | response rounds for non-play events | 5.7 |
| `choice` | `oneOf` with multi-step modes | 5.3 |
| `each` | `forEach(players, …)` with simultaneous prompts | 5.3 |
| `choosePlayers` / `varCount` / `cond` | player selection, bound numbers, conditions | 5.3 |
| `look` / `reveal` / `lookHand` / `give` | hidden-information steps | 5.3, 5.9 |
| `move` / `bring` / `search` / `nameFilter` | generalised movement between zones and stables | 5.3 |
| `deckPos` / `rfg` | deck positions / removed-from-game zone | 5.3 |
| `playNow` | nested play from inside an effect | 5.3, 5.7 |
| `extraTurn` / `skipTurn` / `skipPhase` / `endTurn` | turn manipulation | 5.8 |
| `mass` | "all cards of a kind" as one simultaneous step; optional "without triggering effects" | 5.4 |
| `linked` | bound cards and remembered values | 5.2 `cardState` |
| `discardHand` | "discard your hand" as one step | 5.3 |

### 8.2 Matrix

● = at least one card of the set needs it. Base = 2nd Edition base deck (incl. the 12 missing cards).

| Capability | Base | Adventures | Dragons | Legend | Christmas | Rainbow Apoc. | Nightmares | Control/Chaos |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `choice` | ● | ● | ● | ● | | | | ● |
| `each` | ● | ● | ● | ● | | ● | ● | ● |
| `T.sd` | ● | ● | ● | | ● | ● | ● | ● |
| `T.destroyed` / `T.leave` | | | ● | ● | | | ● | ● |
| `T.event` | ● | ● | | ● | ● | | | ● |
| `T.state` | ● | ● | | ● | | | | ● |
| `S.restrict` | ● | | | ● | ● | | | ● |
| `S.entry` | ● | ● | | | ● | | ● | |
| `S.protect` | ● | | ● | | ● | ● | ● | ● |
| `S.masq` | ● | | | | ● | | | ● |
| `S.blind` | ● | | | ● | | | | ● |
| `S.count` / `S.win` | ● | ● | | | ● | | ● | ● |
| `S.handlimit` | | | | ● | | ● | ● | ● |
| `S.handvisible` | ● | | | | | | ● | |
| `S.nullify` | | | ● | | | | | |
| `S.playcount` | ● | | | | | | | ● |
| `R` replacement | ● | ● | ● | | | ● | ● | ● |
| `I.play` with riders | | | | ● | ● | ● | ● | ● |
| `I.steal` / `I.turnstart` | | ● | | | | | | |
| `I.sacdestroy` | | ● | | | | | | ● |
| `I.draw` | | | | | | | | ● |
| `look` | ● | | | ● | ● | | | ● |
| `reveal` | | ● | | | | | ● | ● |
| `lookHand` | ● | ● | | | | | ● | ● |
| `give` | | ● | | | ● | | | ● |
| `move` (generalised) | ● | ● | ● | ● | ● | | ● | ● |
| `bring` (generalised) | | ● | | ● | ● | ● | ● | ● |
| `search` to stable / by name | ● | | ● | ● | | ● | ● | ● |
| `deckPos` | | | ● | | | | | ● |
| `rfg` | | | | | | | ● | |
| `playNow` | | | ● | ● | | | | ● |
| `extraTurn` | ● | ● | ● | | ● | | | |
| `skipTurn` | | | | | | ● | | ● |
| `skipPhase` | | ● | | ● | | ● | ● | ● |
| `varCount` / `choosePlayers` | | | | ● | ● | ● | ● | ● |
| `mass` | ● | | ● | | | ● | ● | ● |
| `linked` | | | | | | ● | | ● |

Reading the matrix: the base deck and Adventures together cover 26 of the 37 rows. What remains afterwards is mostly small (`S.handlimit`, `S.nullify`, `deckPos`, `rfg`, `skipTurn`, `T.leave`, `linked`, Neigh riders) plus three larger items (`playNow`, `varCount`/`choosePlayers`, `I.draw`). That is why Adventures is a good pilot even though it is not the easiest set.

---

## 9. Roadmap

Each stage ends in a playable, deployable game. Sizes are relative (S / M / L / XL), not time estimates. Matches in progress may be lost at a deploy that changes the state format (decision Q13).

| Stage | Content | Size | Done when |
|---|---|:-:|---|
| **0 — Decisions** | Done 2026-11-17: `rules.md` section 7, section 11 of this plan. | — | ✅ |
| **1 — Safety** | `playerView`; server-only moves; `ctx.random`; ids from `G.seq`. Merge `origin/tests-sandbox`. No rule changes. | M | a client can no longer read other hands / the deck from the network tab; all existing tests pass |
| **2 — Registry** | `cards/` with definitions, sets, i18n (English required, German optional); `G.cards` holds only definition ids; lobby picks one base + expansions; image pipeline (5.11). Old engine still runs, reading abilities through an adapter. Deck composition stays as it is today. | M | registry validation test passes; state size per update drops |
| **3 — Engine core** | `engine/` (state, events, rules, effect interpreter, prompts, turn machine, log) with `RuleOptions` and the **legacy** preset. Port the existing 51 base designs and 12 Adventures unicorns into the effect language, including the three card fixes. Generic `PromptView` + `describePrompt`; log panel reads the new entries. Old `operations/`, `do-types.ts`, `effect.ts`, `BoardStateKey`s removed at the end of the stage. | XL | every scenario of the old test suite passes against the new engine with the legacy preset; a full base game is playable on desktop and mobile |
| **4 — Standard rules + complete base deck** | Implement the standard preset (R1–R19 except the response-round items) and make it the default. Fix the base deck to the 127-card inventory: add the 12 missing cards (needs `R`, `look`, generalised `move`, `S.handvisible`), Narwhal ×1, move Zombie Unicorn and Alignment Change to their expansions. Two-player rules. | L | base set equals the inventory; one test per rule ID and preset; each new card has a scenario test |
| **5 — Response rounds** | Generalise the Neigh voting to the rounds of 5.7 (R3, R12, R18); auto-pass on the server. | M | Neigh / Super Neigh / Yay behave per `rules.md` R3 and R12; the pile is visible in the UI |
| **6 — Adventures (pilot)** | a) the remaining Magic, Upgrades, Downgrades and basics ×3 (`choice` with multi-step modes, `skipPhase`, `T.state`, `give`); b) the four Instants (`I.steal`, `I.sacdestroy`, `I.turnstart`). | L | 54-card inventory complete; wiki rulings of A.2 covered by tests |
| **7 — Dragons** | name filters, `deckPos`, `S.nullify`, `playNow`, `T.leave` | M | |
| **8 — Unicorns of Legend** | Neigh riders, `S.handlimit`, `varCount`, `choosePlayers`, Critical Hit | M | |
| **9 — Christmas** | mostly data; Unicorn Caroler is the one tricky card | S | |
| **10 — Rainbow Apocalypse** | Seven Sackers, `skipTurn`, hand limit for all players | M | |
| **11 — Nightmares** | `rfg` zone + UI for it, visible hands | M | |
| **12 — Travel deck, promo and retired cards** | data entry; Cosplay Unicorn and Cupcakes For Everyone need `custom` handlers | M | |
| **13 — Control & Chaos** | Ultimate type, replacement effects that apply to every player, `I.draw`, effect-level interrupts (Hypnocorn), a unicorn played in a response round (Chronocorn) | XL | |
| **14 — NSFW** | third base deck; almost entirely re-skins of existing effects | M | |
| **15 — Diamond** | Diamond Unicorn type, Vault zone, dice phase | M | |
| **16 — Legacy mode in the lobby** | expose the rule preset as a game option; decide which legacy items are offered individually | S | can be pulled forward to any point after stage 4 |

Stage 3 is the only large jump. Three things keep it safe: the old tests describe the expected behaviour of the cards being ported, the legacy preset lets them run unchanged, and the registry of stage 2 means card *data* is already in its final place.

Stages 7–11 are independent of each other once stage 6 is done; reorder them by which physical expansions you play with.

### 9.1 Progress and handover (updated 2026-11-18)

**Branch:** `select_extensions`. All work is committed **locally only**. As of 2026-11-18 the branch is 12 commits ahead of `origin/select_extensions` (`aacec03` onwards); none of the stage 2–3 work has been pushed yet. Pushing is the user's decision.

| Stage | Status |
|---|---|
| 0 — Decisions | ✅ done |
| 1 — Safety | ◐ partly. Done as part of stage 3: server-only moves (`client: false` in `game.ts`), `ctx.random` passed to the engine as `Rng`, ids from `G.seq`. **Open:** `playerView` (issue I10, every client still receives all hands and the deck order); check whether `origin/tests-sandbox` is still worth merging (the sandbox was rewritten, so probably only ideas from its tests). |
| 2 — Registry | ✅ done, except the **image pipeline** (5.11): new cards still need square art in `src/assets/card/square/`. |
| 3 — Engine core | ✅ done (commits `7b44710` → `506225a`). Engine in `src/game/engine/`, cards in `src/game/cards/`, UI layer in `src/view/`, desktop + mobile boards, log panel, sandbox (`/sandbox`) on the new engine; old engine and old tests deleted. 351 tests green (1 todo: standard-preset R3). Played in the browser: sandbox flows on desktop, mobile layout via emulation, a real 2-player lobby match. |
| 4 and later | ❌ not started. **Next step: stage 4** (or stage 1's `playerView` first, if the game is played online with people who might look at the network tab). |

**How the code is laid out now:** see `effects.md` (engine, effect language, UI contract in section 7) and `CLAUDE.md`. Adding a card: section 10.1.

**Rule options:** `src/game/engine/options.ts` lists which options already implement both the legacy and the standard value and which still only have the legacy value (`superNeigh`, `playRequirement`, `targetsBeforeVoting`, `twoPlayerRules`). Stage 4 = implement the remaining standard values, add a `STANDARD_RULES` preset, make it the default.

**Deliberate behaviour changes of the rewrite, reported to the user and not yet confirmed:**
- Pillaging Pirate only moves a Downgrade from the player's own stable.
- "Steal an Upgrade" no longer takes Downgrades.
- "Neigh card" matches by name, so Super Neigh counts.
- Optional "you may" abilities are prompts with a Skip button that must be answered.
- Double Dutch: drawing a card and then still playing one is no longer possible.
- Targets are clicked directly (highlighted); the old "click source card, then target" arrow is gone (the arrow remains only while choosing the destination stable of a played Upgrade/Downgrade).
- "Force End Turn" and "answer the open decision for a player" in the menu are owner-only.
- The sandbox cannot add loose effects any more (effects come from cards).
- The decline button is labelled "Skip", except for deck searches ("Fail to Find").

**Housekeeping still open:**
- ~~Stale tracked `server_build/` files~~ — done: untracked in `b45d315` (the folder is in `.gitignore`; Docker builds it).
- The view layer has no German UI texts yet (card texts are bilingual through the registry; prompts, buttons and log lines are English only).

**Useful commands:** `CI=true npx react-scripts test --watchAll=false --testPathPattern="engine\.|view"` (all engine + view tests; `engine.random` takes ~20 s), `npx tsc -p tsconfig.server.json --noEmit`, `npm run build:server` then `CORS_ORIGIN=http://localhost:8000 node server_build/server.js` to play at `http://localhost:8000` after `npm run build`.

---


## 10. Working method for cards and tests

### 10.1 Adding a card (after stage 3)

1. Look the card up in Appendix A and on its wiki page (`UU - <name>`); read the "Specific Card Rules" there.
2. Add the definition in `cards/defs/<set>.ts` using the newest English wording; add the English text in `cards/i18n` (German only if an official text exists).
3. Add it to the set inventory with its count; add the image.
4. Write one scenario test per ability, plus one per ruling listed on the wiki page.
5. If a primitive is missing: add it to the effect language with its own tests first — never special-case the card in the engine. If it really is one of a kind, use `custom`.
6. Try it in the sandbox on desktop and mobile. No UI or log code should have been touched; if it had to be, that is a gap in the prompt or log model and should be fixed there.

### 10.2 Tests

| Layer | What | Notes |
|---|---|---|
| Registry validation | unique ids, image exists, English text present, set totals equal the inventory tables of Appendix A, every effect tree is well-formed | runs over all definitions; catches most data-entry mistakes |
| Primitive tests | each step and combinator in isolation, including "impossible" cases | replaces today's `operations.*.test.ts` |
| Card scenarios | given stables/hands → play → answer prompts → expect zones + log | a small builder (`scenario().stable('p1', 'glitter_bomb').hand('p0', 'unicorn_poison')…`) keeps them short; the existing `testHelpers.ts` is the starting point |
| Rulings | the interactions the wiki spells out | see list below |
| Random play | bots answer every prompt with a random legal option for thousands of games per set combination; assert invariants: each card in exactly one zone, no state without either a prompt or a free action, the game ends | the most effective guard against deadlocks with hundreds of cards |
| View tests | `playerView` never contains another player's hand, the deck order or private prompts | |

Rulings worth pinning down as tests (from the wiki unless marked): a card that arrived through one begin-of-turn effect can be used by the next one (K3, our rule) · Pandamonium: "steal a Unicorn card" cannot take a Panda, "destroy a card" can (R4, our rule) · Super Neigh cancels its target and voting re-opens on the card below (R3) · Barbed Wire with Pandamonium (discard on enter, none on leave) · Two-For-One cannot destroy an Upgrade to unlock a protected unicorn as its second target · Queen Bee: another player's Basic Unicorn must be played into the Queen Bee stable · a card that just entered must be sacrificed to its own enter cost if nothing else is available (Scaled Flying Unicorn, Archangel Unicorn) · Dark Angel Unicorn may revive the card it just sacrificed · Dread Pirate Unicorn + Parallel Universicorn · Dragon's Fortune + Magic Elixir (extra-turn loop is legal) · Change of Luck needs 3 cards to discard · Unicorn Net on a Flyer (no return-to-hand trigger) and on a Baby (goes to the Nursery) · Hex / Extremely Small Backpack move the moment the hand is empty, even mid-effect · Dragon Skies with a Baby (returns to the Nursery, no draw) · Seven Sackers are unplayable under a masquerade Downgrade.

---

## 11. Decisions and open points

### 11.1 Decisions (2026-11-17)

| # | Question | Decision |
|---|---|---|
| Q1 | Scope and order | Everything, including NSFW and Diamond, in the order of section 9. |
| Q2 | Wording | Always the newest English wording (2nd Edition). English card text and English rules are the reference. |
| Q3 | Blinding Light + Pandamonium | Wiki rule (R1). |
| Q4 | Unicorns into other stables | Yes, own stable is the default (R9). |
| Q5 | When targets are named | Before the voting by default; game option for "after" (R18). |
| Q6 | Instant pile | No. Voting rounds stay (K2), with the Super Neigh and Yay rules of the wiki (R3, R12). |
| Q7 | Simultaneous begin-of-turn effects | No. Sequential as today; a card that arrives can be used directly (K3). Several targets of one effect are chosen at once (R15). |
| Q8 | Rule fixes | Adopted: 6 unicorns at 6–8 players (R2), no stable limit (R8), win only when everything has resolved (R7), first required action must be possible to play a card (R10), destroy never in your own stable (R11), Tiny Stable at any time (R5), effects return when Blinding Light leaves (R13), search results revealed (R16), Mermaid Unicorn mandatory (R6), Zombie Unicorn as printed (R17), the three Adventures fixes. Pandamonium: house rule R4. |
| Q9 | Empty deck | Reshuffle, as today (K1). |
| Q10 | Two-player rules | Yes (R19). |
| Q11 | German texts | No translations from this work. Use official German texts where they exist; the wiki only has them for the base deck (5.11). |
| Q12 | Images | From `unicornsdatabase.com/cards`, through a small crop pipeline (5.11). |
| Q13 | Matches lost at the engine switch | Accepted. |
| Q14 | Waiting on other players | Auto-pass when unable to respond, owner can force a pass; timer optional and off by default. |
| — | Card counts and missing base cards | Fixed when the sets are rebuilt (stage 4), not before. |
| — | Legacy mode | Every rule change is recorded (`rules.md` section 7) and implemented as an option (5.10). |

### 11.2 Former open points (all decided)

O1–O5 were confirmed on 2026-11-17 (O3 is rule R20 in `rules.md`); O6 and O7 were decided the same day. Nothing is open at the moment.

| # | Point | Outcome |
|---|---|---|
| O1 | **Super Neigh inside voting rounds.** R3 (wiki) says a Super Neigh does not end the exchange; K2 keeps rounds. Combined in 5.7 as: the Super Neigh cancels the card it answers, then voting re-opens on the card below. | as described — **confirmed 2026-11-17** |
| O2 | **Pandamonium and "sacrifice a card".** R4 as stated ("a card" effects work on Pandas) means a player with Pandamonium may now sacrifice their own Pandas to Glitter Bomb or Two-For-One, which the game forbids today. | yes, follows from the principle — **confirmed 2026-11-17** |
| O3 | **Both piles empty.** With reshuffling kept, the deck can still be empty when the discard pile is too. Today the code switches to an undefined phase. | the game ends; most unicorns wins, ties share the win — **confirmed 2026-11-17** |
| O4 | **How far the play requirement goes (R10).** Only the card's own first required action — not requirements added by other cards (Barbed Wire with an empty hand), and not "each player must …" for the other players. | as described — **confirmed 2026-11-17** |
| O5 | **Scope of legacy mode.** Rule-level items R1–R19 only, or also the old bugs (issues I1–I10, the three wrong Adventures cards)? | rule-level items only — **confirmed 2026-11-17** |
| O6 | **Card images.** Square crop as today, or the full card image now that full scans are the source? | **Decided:** crop so that new images match the current look; no full-card view. |
| O7 | **German texts for expansions.** | **Decided:** no German text → show the English text, also when the language is set to German. |

---


## Appendix A — Card catalog

Every card page of the wiki was read (543 card pages plus deck inventory lists). The effects below are written in a compact mechanic shorthand, **not** the printed card text — use the wiki page of the card (`UU - <Card Name>`) for exact wording and for the "Specific Card Rules" section when implementing.

### A.0 Legend

**Shorthand**

| Notation | Meaning |
|---|---|
| `ENTER:` | when this card enters your Stable |
| `BOT:` | if this card is in your Stable at the beginning of your turn |
| `SD:` | if this card is sacrificed or destroyed |
| `LEAVE:` | when this card leaves your Stable (any reason) |
| `EOT:` | at the end of your turn |
| `CONT:` | continuous effect while in a Stable |
| `WHEN <event>:` | event trigger ("each time …") |
| `INSTEAD(<event>):` | replacement effect ("if … would …, … instead") |
| `INSTANT[<window>]:` | Instant card, playable in a response round for the given event |
| `may` | optional; without it the effect is mandatory |
| `A → B` | "A, then B" — B only happens if A happened (cost-then-effect) |
| `A + B` | "A and B" — both happen, B does not depend on A |
| `A OR B` | the player picks exactly one mode |
| `U` / `BU` / `MU` / `Baby` | Unicorn card (any) / Basic Unicorn / Magical Unicorn / Baby Unicorn |
| `UP` / `DG` / `M` / `I` | Upgrade / Downgrade / Magic / Instant |
| `H` / `S` / `DP` / `D` / `N` / `RFG` | hand / stable / discard pile / deck / nursery / removed from game |
| `each` / `each other` | every player incl. you / every player except you |
| `Flyer` | `SD: return this to your hand` (the "Flying" unicorn clause) |

**"Needs" tags** — capability IDs defined in section 5 (engine capabilities). `—` means the card is expressible with what the engine can already do today.

| Group | Tags |
|---|---|
| Triggers | `T.sd` `T.destroyed` `T.leave` `T.eot` `T.event` `T.state` |
| Static rules | `S.restrict` `S.entry` `S.protect` `S.masq` `S.blind` `S.count` `S.handlimit` `S.handvisible` `S.nullify` `S.playcount` `S.win` |
| Replacement | `R` (with the replaced event) |
| Instants | `I.play` `I.steal` `I.sacdestroy` `I.draw` `I.turnstart` |
| Operations | `choice` `each` `choosePlayers` `varCount` `look` `reveal` `lookHand` `give` `deckPos` `rfg` `move` `bring` `search` `nameFilter` `playNow` `extraTurn` `skipTurn` `skipPhase` `endTurn` `mass` `linked` `cond` `discardHand` |

**Status** (only for decks that are partly implemented): ✅ implemented · ⚠️ implemented but deviates from the 2nd Edition card · ❌ not implemented.

---

### A.1 Base Deck — 2nd Edition (127 cards, including the 13 babies of the Nursery)

Inventory per wiki: 13 Baby, 22 Basic (7 colours ×3 + Narwhal ×1), 30 Magical Unicorns (×1 each), 25 Magic, 14 Upgrade, 8 Downgrade, 14 Neigh, 1 Super Neigh.

**Deviations of the current `base_game` definition from the 2nd Edition inventory**

- Missing cards (12): Black Knight Unicorn, Extremely Destructive Unicorn, Shark With a Horn, Stabby the Unicorn, Unicorn Oracle, Unicorn Phoenix, Blatant Thievery, Glitter Tornado, Re-Target, Unicorn Swap, Nanny Cam, Sadistic Ritual. (Operations for Blatant Thievery, Re-Target and Unicorn Swap already exist in `operations/` but no card uses them.)
- Cards in `base_game` that are not in the 2nd Edition base deck: Zombie Unicorn (belongs to Rainbow Apocalypse), Alignment Change (belongs to Unicorns of Legend).
- Narwhal (basic) is defined ×3; the deck has ×1.
- `agent_docs/cards.md` says Chainsaw Unicorn ×2 / Narwhal Torpedo ×2; the code and the wiki both say ×1 — the doc is stale.

| Card | Type | # | Mechanics | Needs | Status |
|---|---|---|---|---|---|
| Baby Unicorn ×12, Baby Narwhal | Baby | 13 | Would go to H/DP/D → goes to N instead | — | ✅ |
| Basic Unicorn (7 colours) | BU | 21 | — | — | ✅ |
| Narwhal | BU | 1 | — (name contains "Narwhal") | — | ⚠️ count 3 |
| Alluring Narwhal | MU | 1 | ENTER: may steal UP | — | ✅ |
| Americorn | MU | 1 | ENTER: may pull random card from another player | — | ✅ |
| Annoying Flying Unicorn | MU | 1 | ENTER: may force another player to discard 1 · Flyer | — | ✅ |
| Black Knight Unicorn | MU | 1 | INSTEAD(a U in your S would be destroyed): may sacrifice this | `R` | ❌ |
| Chainsaw Unicorn | MU | 1 | ENTER: may (destroy UP OR sacrifice DG) | `choice` | ✅ (special-cased target type) |
| Classy Narwhal | MU | 1 | ENTER: may search D for UP → H, shuffle | — | ✅ |
| Dark Angel Unicorn | MU | 1 | ENTER: may sacrifice U → bring U from DP into S | — | ✅ |
| Extremely Destructive Unicorn | MU | 1 | ENTER: each must sacrifice U | `each` | ❌ |
| Ginormous Unicorn | MU | 1 | CONT: counts as 2 U; you cannot play Neigh cards | `S.count` `S.restrict` | ✅ |
| Greedy Flying Unicorn | MU | 1 | ENTER: draw 1 · Flyer | — | ✅ |
| Llamacorn | MU | 1 | ENTER: each must discard 1 | `each` | ✅ |
| Magical Flying Unicorn | MU | 1 | ENTER: may add M from DP to H · Flyer | — | ✅ |
| Magical Kittencorn | MU | 1 | CONT: cannot be destroyed by Magic cards | `S.protect` | ✅ |
| Majestic Flying Unicorn | MU | 1 | ENTER: may add U from DP to H · Flyer | — | ✅ |
| Mermaid Unicorn | MU | 1 | ENTER: return a card in another player's S to their H (mandatory on the 2E card) | — | ⚠️ coded as optional |
| Mother Goose Unicorn | MU | 1 | ENTER: may bring Baby from N into S | — | ✅ |
| Narwhal Torpedo | MU | 1 | ENTER: sacrifice all DG in your S | `mass` | ✅ |
| Necromancer Unicorn | MU | 1 | ENTER: may discard 2 U → bring U from DP into S | — | ✅ |
| Queen Bee Unicorn | MU | 1 | CONT: BU cannot enter any S except yours | `S.entry` | ✅ |
| Rainbow Unicorn | MU | 1 | ENTER: may bring BU from H into S | — | ✅ |
| Rhinocorn | MU | 1 | BOT: may destroy U → end turn immediately | `endTurn` | ✅ |
| Seductive Unicorn | MU | 1 | ENTER: may discard 1 → steal U | — | ✅ |
| Shabby the Narwhal | MU | 1 | ENTER: may search D for DG → H, shuffle | — | ✅ |
| Shark With a Horn | MU | 1 | ENTER: may sacrifice this → destroy U | — | ❌ |
| Stabby the Unicorn | MU | 1 | SD: may destroy U | `T.sd` | ❌ |
| Swift Flying Unicorn | MU | 1 | ENTER: may add Neigh from DP to H · Flyer | — | ✅ |
| The Great Narwhal | MU | 1 | ENTER: may search D for a card with "Narwhal" in its name → H, shuffle | `nameFilter` | ✅ |
| Unicorn on the Cob | MU | 1 | ENTER: draw 2 + discard 1 | — | ✅ |
| Unicorn Oracle | MU | 1 | ENTER: look at top 3 of D, take 1 into H, return 2 on top in any order | `look` | ❌ |
| Unicorn Phoenix | MU | 1 | INSTEAD(this would be sacrificed or destroyed): may discard 1 | `R` | ❌ |
| Back Kick | M | 3 | Return a card in another player's S to their H; that player must discard 1 | — | ✅ |
| Blatant Thievery | M | 1 | Look at another player's H, take 1 card | `lookHand` | ❌ (op exists) |
| Change of Luck | M | 2 | Draw 2 + discard 3 → take another turn | `extraTurn` | ✅ |
| Glitter Tornado | M | 2 | Return 1 card in each player's S (incl. yours) to their H — the caster picks every card | `each` | ❌ |
| Good Deal | M | 1 | Draw 3 + discard 1 | — | ✅ |
| Kiss of Life | M | 1 | Bring U from DP into S | — | ✅ |
| Mystical Vortex | M | 1 | Each must discard 1; shuffle DP into D | `each` | ✅ |
| Re-Target | M | 2 | Move UP or DG from any S to any other S (not into your own) | `move` | ❌ (op exists) |
| Reset Button | M | 1 | Each sacrifices all UP+DG; shuffle DP into D | `mass` | ✅ |
| Shake Up | M | 1 | Shuffle this, your H and DP into D; draw 5 | — | ✅ |
| Targeted Destruction | M | 1 | Destroy UP OR sacrifice DG | `choice` | ✅ |
| Two-For-One | M | 2 | Sacrifice 1 → destroy 2 (as many as possible) | — | ✅ |
| Unfair Bargain | M | 2 | Trade hands with another player | — | ✅ |
| Unicorn Poison | M | 3 | Destroy U | — | ✅ |
| Unicorn Swap | M | 2 | Move a U from your S to another S → steal a U from that S (may be the same card) | `move` | ❌ (op exists) |
| Caffeine Overload | UP | 1 | BOT: may sacrifice 1 → draw 2 | — | ✅ |
| Claw Machine | UP | 3 | BOT: may discard 1 → draw 1 | — | ✅ |
| Double Dutch | UP | 1 | CONT (wiki: not a BOT decision): may play 2 cards in Action phase | `S.playcount` | ✅ |
| Glitter Bomb | UP | 2 | BOT: may sacrifice 1 → destroy 1 | — | ✅ |
| Rainbow Aura | UP | 1 | CONT: your U cannot be destroyed | `S.protect` | ✅ |
| Rainbow Lasso | UP | 1 | BOT: may discard 3 → steal U | — | ✅ |
| Stable Artillery | UP | 3 | BOT: may discard 2 → destroy U | — | ✅ |
| Yay | UP | 2 | CONT: cards you play cannot be Neigh'd | `S.protect` | ✅ |
| Barbed Wire | DG | 1 | WHEN a U enters or leaves your S: discard 1 | `T.event` | ✅ |
| Blinding Light | DG | 1 | CONT: your U are Basic Unicorns with no effects (babies unaffected) | `S.blind` | ✅ |
| Broken Stable | DG | 1 | CONT: you cannot play UP (stealing/moving UP in still allowed) | `S.restrict` | ✅ |
| Nanny Cam | DG | 1 | CONT: your hand is visible to all; pulls from you become choices | `S.handvisible` | ❌ |
| Pandamonium | DG | 1 | CONT: your U are Pandas (masquerade); you cannot win | `S.masq` `S.win` | ✅ |
| Sadistic Ritual | DG | 1 | BOT: sacrifice U → draw 1 (mandatory) | — | ❌ |
| Slowdown | DG | 1 | CONT: you cannot play Neigh cards | `S.restrict` | ✅ |
| Tiny Stable | DG | 1 | STATE: if you ever have more than 5 U, sacrifice a U (double-count cards count 2) | `T.state` | ⚠️ only checked on enter |
| Neigh | I | 14 | INSTANT[another player plays a card]: stop it, send it to DP | `I.play` | ✅ |
| Super Neigh | I | 1 | Same + cannot be Neigh'd | `I.play` | ✅ |

---

### A.2 Adventures Expansion — 2nd Edition (54 cards)

Currently on the branch: 4 babies, 4 basics (×1 each — the deck has ×3 each), 12 Magical Unicorns. No Magic, Instant, Upgrade or Downgrade card of this expansion exists yet.

| Card | Type | # | Mechanics | Needs | Status |
|---|---|---|---|---|---|
| Baby Unicorn (Fisherman, Forest, Pirate, Safari) | Baby | 4 | — | — | ✅ |
| Eager Adventurer / Glamping / Indoor Rockclimber / Land Lubber Unicorn | BU | 12 | — | — | ⚠️ count 1 each instead of 3 |
| Bungee Jumping Unicorn | MU | 1 | SD: may (sacrifice DG OR return this to H). Card is already in DP when the choice is made | `T.sd` `choice` | ✅ (via `returnSelf` special op) |
| Cutthroat Captain Unicorn | MU | 1 | ENTER: may (steal Baby OR bring BU from DP into S) | `choice` | ✅ |
| Extreme Adventurer Unicorn | MU | 1 | CONT: BU cannot enter your S · BOT: may draw 1 (drawn in BOT phase) | `S.entry` | ✅ |
| Fearless Unicorn | MU | 1 | SD: may add an Instant from DP to H | `T.sd` | ⚠️ filter is "neigh", must be "any Instant" |
| First Mer-mate Unicorn | MU | 1 | SD: may (draw 2 OR bring BU from H into S) | `T.sd` `choice` | ✅ |
| Fisherman Unicorn | MU | 1 | ENTER: may look at another player's H and take 1 | `lookHand` | ✅ |
| Hornswoggler Unicorn | MU | 1 | ENTER: may (discard your whole H → draw 3 OR trade hands with another player) | `choice` `discardHand` | ⚠️ mode 1 draws without discarding the hand |
| Pillaging Pirate Unicorn | MU | 1 | ENTER: may (steal UP OR move a DG from your S to another S) | `choice` `move` | ✅ (two-step `move`/`move2`) |
| Salty Seadogicorn | MU | 1 | ENTER: may (each other player discards 1 OR draw 1) | `choice` `each` | ⚠️ mode 1 targets a single player |
| Stowaway Unicorn | MU | 1 | ENTER: may draw 1 and reveal it; if U/UP/DG bring it into your S, else keep | `reveal` `bring` | ✅ (via `stowawaydraw` special op; reveal is not shown/logged) |
| Survivalist Unicorn | MU | 1 | BOT: may discard 1 → sacrifice DG | — | ✅ |
| Vagabond Unicorn | MU | 1 | BOT: may discard 1 → pull random card from another player | — | ✅ |
| Glowing Horn | M | 1 | (Sacrifice 1 → destroy 1) OR bring any card from DP into your S | `choice` `bring` | ❌ |
| Metal Detector | M | 2 | (Draw 3 + discard 1) OR add any card from DP to H | `choice` | ❌ |
| Mysterious Compass | M | 1 | (Discard 3 → take another turn) OR (move your U to another S → steal U from that S) | `choice` `extraTurn` `move` | ❌ |
| Silver Tongue | M | 1 | Each other player reveals H to you OR each other player gives you 1 card of their choice | `choice` `each` `lookHand` `give` | ❌ |
| The Great Baby Heist | M | 2 | Discard 2 → bring 2 Babies from N into your S | `bring` | ❌ |
| Unicorn Shovel | M | 1 | Bring U from DP into S OR add 2 U from DP to H | `choice` | ❌ |
| Fishing Rod | I | 2 | INSTANT[another player tries to steal a card]: the card goes to your S instead (own card: it just stays) | `I.steal` | ❌ |
| Flare Gun | I | 2 | INSTANT[beginning of another player's turn, before their BOT effects]: they skip BOT phase and Draw phase | `I.turnstart` `skipPhase` | ❌ |
| Neigh, Mate! | I | 3 | = Neigh | `I.play` | ❌ |
| Unicorn Net | I | 2 | INSTANT[any player tries to sacrifice or destroy a card]: add that card to your H instead (Baby → N; only leave-effects trigger, not SD) | `I.sacdestroy` | ❌ |
| Ancient Ritual | UP | 1 | BOT: may sacrifice U → draw 3 | — | ❌ |
| Pit Covered in Leaves | UP | 2 | BOT: may sacrifice this → steal U | — | ❌ |
| Royal Hooves | UP | 1 | BOT: may decide to replace your Draw-phase draw with a random pull from another player (resolves in Draw phase; nothing if Draw phase is skipped) | `R` | ❌ |
| Unicorn Survival Kit | UP | 1 | INSTEAD(one of your U would be sacrificed or destroyed): may discard 2 | `R` | ❌ |
| Broken Sundial | DG | 1 | CONT: skip your BOT phase (no BOT effect of any card triggers) | `skipPhase` | ❌ |
| Extremely Small Backpack | DG | 1 | WHEN you draw any number of cards: discard 1 (once per draw event) · STATE: if your H is empty, move this to another player's S | `T.event` `T.state` `move` | ❌ |
| The Black Spot | DG | 1 | CONT: you cannot win while a BU is in your S | `S.win` | ❌ |
| Unicorn Overboard | DG | 1 | WHEN one of your U is sacrificed or destroyed: discard 1 | `T.event` | ❌ |

---

### A.3 Christmas Special Expansion — 2nd Edition (36 cards)

| Card | Type | # | Mechanics | Needs |
|---|---|---|---|---|
| Baby Unicorn (Elf, Gingerbread, Present) | Baby | 3 | — | — |
| Fa La Llamacorn, Mariah Karaokecorn, Silly Chilly Unicorn, Sugar Crash Unicorn | BU | 4 | — (×1 each) | — |
| Festive Flying Unicorn | MU | 1 | ENTER: may pull random card from another player · Flyer | — |
| Flying Krampuscorn | MU | 1 | ENTER: may steal Baby · Flyer | — |
| Friendly Snowmancorn | MU | 1 | BOT: may draw 1 · WHEN you steal or destroy another card: sacrifice this | `T.event` |
| Helper Elficorn | MU | 1 | BOT: if you have ≤4 U in S, may draw 1 | `cond` |
| Not-So-Secret Santacorn | MU | 1 | ENTER: may look at top 2 of D; 1 to your H, the other to another player's H | `look` `give` |
| Nutcrackercorn | MU | 1 | CONT: Babies in your S cannot be sacrificed, destroyed or stolen | `S.protect` |
| Procrastinating Shoppercorn | MU | 1 | ENTER: may discard 1 + look at top 3 of D; 1 to H, other 2 to DP (not a "discard" event) | `look` |
| Unicorn Caroler | MU | 1 | WHEN another player plays a Neigh against a card you play: they must give you 1 card from their H (before the Neigh resolves; they cannot Neigh you with an otherwise empty hand) | `T.event` `give` `S.restrict` |
| White Elephantcorn | MU | 1 | ENTER: may move a DG from your S to another S | `move` |
| Winter Wondercorn | MU | 1 | WHEN an UP enters your S: draw 1 | `T.event` |
| Gift Receipt | M | 2 | Move a card from your S to another S → pull a card from that player's H | `move` |
| Nog Wild | M | 2 | Discard any number → draw the same number; take another turn (even with 0) | `varCount` `extraTurn` |
| Silver Lining | M | 2 | Sacrifice 1 → bring UP from DP into your S | `bring` |
| Jingle All The Neigh | I | 4 | Neigh + you may draw 1 | `I.play` |
| Gift Inspector | UP | 2 | BOT: may look at top 2 of D and return them in any order (resolves after other deck manipulation) | `look` |
| Gingerbread Stable | UP | 1 | WHEN a U enters your S: may draw 1 | `T.event` |
| Ugly Holiday Sweater | UP | 1 | CONT: your U cannot be stolen | `S.protect` |
| Humbug | DG | 1 | CONT: MU cannot enter your S | `S.entry` |
| Naughty List | DG | 1 | WHEN you steal or destroy a card: discard 1 | `T.event` |
| Oh, Deer | DG | 1 | CONT: your U are Reindeer (masquerade); cannot win | `S.masq` `S.win` |
| Uneaten Fruitcake | DG | 2 | CONT: you cannot win | `S.win` |

---

### A.4 Dragons Expansion — 2nd Edition (54 cards)

"Dragon" in the card name matters for three cards (Dragon Slayer, Dragon Summoner, Dragon Tamer) → card names must be matchable (`nameFilter`). Baby Dragoncorns and "Dragon Cosplay Unicorn" / "Unicorn With a Dragon Tattoo" also contain "Dragon".

| Card | Type | # | Mechanics | Needs |
|---|---|---|---|---|
| Baby Dragoncorn (6 colours) | Baby | 6 | — | — |
| Apprentice / Dragon Cosplay / High Roller Unicorn, Unicorn With a Dragon Tattoo | BU | 12 | — (×3 each) | — |
| Angry Dragoncorn | MU | 1 | ENTER: each must discard 1 | `each` |
| Dragon Rider Unicorn | MU | 1 | ENTER: may move UP or DG from any S to any other S (not into your own) | `move` |
| Dragon Slayer Unicorn | MU | 1 | CONT: your U cannot be destroyed by the effect of a card with "Dragon" in its name | `S.protect` `nameFilter` |
| Dragon Summoner Unicorn | MU | 1 | ENTER: may add a "Dragon"-named card from DP to H | `nameFilter` |
| Dragon Tamer Unicorn | MU | 1 | ENTER: may search D for a "Dragon"-named card → H, shuffle | `search` `nameFilter` |
| Dragon Turtle Unicorn | MU | 1 | ENTER: may draw 1 | — |
| Dragon Unicorn | MU | 1 | LEAVE: may destroy U | `T.leave` |
| Friendly Dragoncorn | MU | 1 | ENTER: each may draw 1 | `each` |
| Mage Unicorn | MU | 1 | ENTER: may search D for M → H, shuffle | `search` |
| Scaled Flying Unicorn | MU | 1 | ENTER: each must sacrifice 1 card (this card is itself a legal — and if nothing else, forced — choice) · Flyer | `each` |
| Dragon's Breath | M | 3 | Destroy U | — |
| Dragon's Fire | M | 3 | Destroy UP OR sacrifice DG | `choice` |
| Dragon Kiss | M | 2 | Search D for a M → H, immediately play it (can be Neigh'd, separate event), then shuffle | `search` `playNow` |
| Dragon-Scorched Stables | M | 1 | Each sacrifices all UP+DG | `mass` `each` |
| Neigh, Foul Beast | I | 6 | = Neigh | `I.play` |
| Dragon's Blessing | UP | 2 | CONT: DG in your S have no effect (also lifts "cannot win" of masquerade DGs) | `S.nullify` |
| Dragon's Fortune | UP | 2 | BOT: may sacrifice this → take another turn | `extraTurn` |
| Dragon Protection | UP | 2 | INSTEAD(a card in your S would be destroyed): may discard 1 | `R` |
| Dragon's Curse | DG | 2 | BOT: discard 1 (mandatory) | — |
| Dragon's Misfortune | DG | 2 | BOT: move a card from your H to the bottom of D | `deckPos` |
| Dragon Skies | DG | 1 | BOT: move a U from your S to the bottom of D → draw 1 (a Baby goes to N and then no draw) | `deckPos` |

---

### A.5 Nightmares Expansion — 2nd Edition (53 cards)

Introduces the **removed-from-game** zone. "Nightmare" Downgrades are searchable by name/subtype (The Cornjuring).

| Card | Type | # | Mechanics | Needs |
|---|---|---|---|---|
| Baby Unicorn (Ghost, Horror, Look Back) | Baby | 3 | — | — |
| Basic Unicorn (Raincoat, Scared, Security Guard, School Girl) | BU | 12 | — (×3 each) | — |
| Chainsaw Massicorn | MU | 1 | ENTER: may draw 1 per BU in your S | `varCount` |
| Clairvoyant Unicorn | MU | 1 | CONT: your H is visible to all · BOT: may draw 1 | `S.handvisible` |
| Dancing Clownicorn | MU | 1 | ENTER: may discard 2 → return 1 card in each other player's S to their H | `each` |
| Demonicorn | MU | 1 | WHEN this is destroyed (not sacrificed): may remove a card in any S from the game | `T.destroyed` `rfg` |
| Jack the Reapercorn | MU | 1 | ENTER: may draw 1; if it is a Neigh you may reveal it and draw a 2nd | `reveal` `cond` |
| Phantom Unicorn | MU | 1 | CONT: cannot be sacrificed or destroyed | `S.protect` |
| Playful Puppet Unicorn | MU | 1 | ENTER: may move a DG from your S to another S | `move` |
| Sweet Old Ladycorn | MU | 1 | CONT: counts as 2 U · SD: sacrifice 1 card (mandatory) | `S.count` `T.sd` |
| Unicorn Slasher | MU | 1 | ENTER: may discard 1 → remove a card in any S from the game | `rfg` |
| Vengeful Unicorn | MU | 1 | ENTER: may sacrifice BU → draw 3 | — |
| Winged Horrorcorn | MU | 1 | SD: may look at another player's H and take 1 | `T.sd` `lookHand` |
| HEEEEERE'S STABBY | M | 3 | Remove a card in any S from the game | `rfg` |
| Possession | M | 1 | Discard 1 → steal any card | — |
| Reanimation | M | 2 | Bring BU from DP into your S → draw 1 | — |
| Supernatural Selection | M | 2 | Choose a player; destroy all BU in their S | `choosePlayers` `mass` |
| The Cornjuring | M | 2 | Search D for a "Nightmare" DG and bring it into any player's S, shuffle | `search` `nameFilter` `bring` |
| Hex Neigh | I | 4 | Neigh, but the stopped card is removed from the game | `I.play` `rfg` |
| Ghost Guide | UP | 1 | BOT: may draw 1 and reveal it; if UP/DG bring it into your S | `reveal` `bring` |
| Magic Elixir | UP | 2 | INSTEAD(a card in your S would be sacrificed or destroyed): may discard 1 | `R` |
| Paranormal Affection | UP | 2 | ENTER: may draw 2 · CONT: UP in your S cannot be destroyed | `S.protect` |
| Poltergeist Swipe | UP | 1 | BOT: may skip your Draw phase → pull random card from another player | `skipPhase` |
| Saved by the Sigil | UP | 2 | CONT: DG cannot enter your S; this cannot be sacrificed or destroyed | `S.entry` `S.protect` |
| Strange Craft Project | UP | 1 | BOT: may discard 3 → remove a card in any S from the game | `rfg` |
| Nightmare: Buried Alive | DG | 1 | BOT: sacrifice U (mandatory); if you have no U, return this to your H | `cond` |
| Nightmare: Currently Indisposed | DG | 1 | ENTER: sacrifice U · CONT: you cannot win | `S.win` |
| Nightmare: Existential Dread | DG | 1 | BOT: steal a DG (mandatory) | — |
| Nightmare: Exorcise Regimen | DG | 1 | ENTER: discard your H → draw 1 · CONT: hand limit −3 | `discardHand` `S.handlimit` |

---

### A.6 Rainbow Apocalypse Expansion — 2nd Edition (55 cards)

Re-uses five base/retired unicorns as search targets of the "Seven Sacker" magic cards. Several cards from here already exist in the code under `base_game` (Llamacorn, Magical Kittencorn, Zombie Unicorn) — with the registry from section 4 a card definition is written once and listed in several expansions with different counts.

| Card | Type | # | Mechanics | Needs |
|---|---|---|---|---|
| Baby Unicorn (Flowers, Sparkles) | Baby | 2 | — | — |
| Horse With An Ice Cream Cone, Innocent Bunnicorn | BU | 6 | — (×3 each) | — |
| Adorable Flying Unicorn | MU | 1 | ENTER: each must sacrifice 1 card · Flyer | `each` |
| Angel Unicorn | MU | 2 | BOT: may sacrifice this → bring U from DP into S | — |
| Cotton Candy Llamacorn | MU | 1 | ENTER: each must sacrifice U → that player draws 1 (no draw without a sacrifice) | `each` |
| Extremely Destructive Unicorn | MU | 2 | see A.1 | `each` |
| Extremely Fertile Unicorn | MU | 2 | BOT: may discard 1 → bring Baby from N into S | — |
| Frenchiecorn | MU | 1 | ENTER: each other player must discard 1; you take one of those discarded cards into your H | `each` `linked` |
| Glitter Unicorn | MU | 1 | ENTER: may bring UP from H into S | `bring` |
| Llamacorn | MU | 2 | see A.1 | `each` |
| Magical Kittencorn | MU | 2 | see A.1 | `S.protect` |
| The Tiniest Unicorn | MU | 1 | CONT: cannot be destroyed by effects of U or UP cards | `S.protect` |
| Unicorn of Death | MU | 1 | BOT: may sacrifice U → destroy U | — |
| Unicorn of Famine | MU | 1 | CONT: every player's hand limit −5 | `S.handlimit` |
| Unicorn of Pestilence | MU | 1 | ENTER: discard any number (0 allowed); each other player must discard the same number | `varCount` `each` |
| Unicorn of War | MU | 1 | ENTER: each may destroy a U · CONT: this cannot be destroyed | `each` `S.protect` |
| Unicorn Phoenix | MU | 2 | see A.1 | `R` |
| Unicorn Rainbow Princess | MU | 1 | ENTER: choose any number of players; you draw that many; each chosen player may draw 1 | `choosePlayers` `varCount` |
| Zombie Unicorn | MU | 2 | BOT: may discard a U card → bring U from DP into S → end turn immediately | `endTurn` |
| A Cute Attack | M | 2 | Choose another player; destroy up to 3 U in their S, then bring that many Babies from N into their S | `choosePlayers` `varCount` `bring` |
| Fire and Brimstone / Heavenly Smite / Llamapocalypse / Overpopulation / Storm of Cuteness / Ultimate Destruction / Zombie Apocalypse | M | 7 | "Seven Sackers": sacrifice all your U → destroy 1 U in each other player's S; search D for the named unicorn (Unicorn Phoenix / Angel Unicorn / Llamacorn / Extremely Fertile Unicorn / "Kittencorn" / Extremely Destructive Unicorn / Zombie Unicorn) and bring it into your S, shuffle | `mass` `each` `search` `nameFilter` `bring` |
| Plague of Death | M | 1 | Sacrifice any number (0 allowed) → destroy the same number | `varCount` |
| Spray Bottle of Youth | M | 1 | Destroy 1 U in each other player's S; each other player may bring a Baby from N into their S | `each` `bring` |
| Unicorn Nap | M | 2 | Another player skips their next turn (cumulative) | `skipTurn` |
| Unicorns of the Apocalypse | M | 1 | Sacrifice 4 U → search D for 4 U and bring them into your S, shuffle | `search` `bring` |
| Neigh, Thank You | I | 3 | Neigh (any player's card except your own) + you and that player may each draw 1 | `I.play` |
| Rainbow Sprinkles | UP | 2 | BOT: may draw 3 → end turn immediately | `endTurn` |
| Special Delivery | UP | 2 | BOT: may bring Baby from N into S → skip your Action phase | `skipPhase` |
| Tiny Hooves | DG | 1 | CONT: your hand limit −4 | `S.handlimit` |

---

### A.7 Unicorns of Legend Expansion — 2nd Edition (54 cards)

| Card | Type | # | Mechanics | Needs |
|---|---|---|---|---|
| Baby Dwarficorn / Elficorn / Gnomicorn / Orcicorn | Baby | 4 | — | — |
| Blacksmith / Guardsman / Innkeeper / Noble Unicorn | BU | 12 | — (×3 each) | — |
| Beast Master Unicorn | MU | 1 | BOT: may bring Baby from N into S → skip your Draw phase | `skipPhase` |
| Berserkercorn | MU | 1 | ENTER: may destroy U · WHEN this is destroyed: sacrifice U (mandatory) | `T.destroyed` |
| Charming Bardicorn | MU | 1 | BOT: may move this to another S → steal a U from that S + draw 1 (draw happens even if the steal fails) | `move` |
| Divine Unicorn | MU | 1 | ENTER: may look at top 3 of D; 1 to H, other 2 to DP (no discard event) | `look` |
| Dwarficorn Artificer | MU | 1 | ENTER: may discard 1 → search D for UP and bring it into your S, shuffle | `search` `bring` |
| Elficorn Scout | MU | 1 | ENTER: look at top 3 of D and return them in any order | `look` |
| Orcicorn Raider | MU | 1 | ENTER: may move a DG from your S to another S → steal an UP from that S | `move` |
| Paladin Unicorn | MU | 1 | ENTER: may destroy any card · CONT: you cannot steal cards | `S.restrict` |
| Rogue Unicorn | MU | 1 | ENTER: may discard 2 → steal any card | — |
| Warlock Unicorn | MU | 1 | ENTER: may sacrifice any number → destroy the same number | `varCount` |
| Wizard Unicorn | MU | 1 | ENTER: may discard 1 → search D for M → H, immediately play it (stays in H if unplayable), shuffle | `search` `playNow` |
| Alignment Change | M | 2 | Discard 2 → steal U | — (exists in code under `base_game`) |
| Chain Lightning | M | 2 | Destroy a card in another player's S; that player may then destroy a card | `choosePlayers` |
| Fireball | M | 1 | Each must sacrifice U | `each` |
| Necromancy | M | 1 | Sacrifice U → bring U from DP into S (may be the same card) | — |
| Prismatic Bray | M | 2 | Discard up to 2 → force up to that many players to sacrifice a U | `varCount` `choosePlayers` |
| Raze the Stables | M | 3 | Destroy UP OR sacrifice DG | `choice` |
| Neigh, M'Lord | I | 2 | Neigh + the stopped player may draw 1 | `I.play` |
| Neigh, Peasant | I | 2 | Neigh + the stopped player must discard 1 | `I.play` |
| Neigh, Scoundrel | I | 2 | = Neigh | `I.play` |
| Critical Hit | UP | 2 | WHEN you play a M (decide at announcement, before Neighs): may sacrifice this; after the M resolved it returns to your H and is immediately played again | `T.event` `playNow` |
| Extradimensional Saddlebag | UP | 1 | CONT: your hand limit +3 | `S.handlimit` |
| Wall of Horns | UP | 1 | WHEN another player destroys a U in your S: may pull random card from that player | `T.event` |
| Divine Peace | DG | 2 | CONT: you cannot destroy cards | `S.restrict` |
| Hex | DG | 2 | BOT: skip your Draw phase · STATE: if your H is empty, move this to another player's S (must have cards in hand) | `skipPhase` `T.state` `move` |
| Medieval Sanitation | DG | 2 | CONT: U in your S are Basic Unicorns with no effects | `S.blind` |

---

### A.8 Travel Deck v2 (56 cards — a smaller base deck)

A reduced 2nd Edition base deck (7 basics ×1, 7 Neigh, 1 Super Neigh, subset of base cards) plus 8 exclusive cards. Has no Baby Unicorns of its own in the inventory list. All exclusives are re-skins of existing effects, so this deck is nearly free once the registry exists.

| Exclusive card | Type | # | Mechanics | Needs |
|---|---|---|---|---|
| Annoying Traveling Unicorn | MU | 1 | ENTER: may bring a DG from your H into another player's S | `bring` |
| Frequent Flyer Unicorn | MU | 1 | ENTER: may bring UP from H into your S | `bring` |
| Friendly Local Unicorn | MU | 1 | ENTER: may steal UP (= Alluring Narwhal) | — |
| Road Trip Unicorn | MU | 1 | ENTER: may add UP or DG from DP to H | — |
| Traveling Doctor Unicorn | MU | 1 | ENTER: sacrifice all DG in your S (= Narwhal Torpedo) | `mass` |
| Up For Anything Unicorn | MU | 1 | ENTER: may pull random card (= Americorn) | — |
| Souvenir Shop | UP | 1 | WHEN a BU enters your S: may draw 1 | `T.event` |
| Tourist Trap | DG | 1 | CONT: BU cannot enter your S | `S.entry` |

---

### A.9 Control & Chaos (two alternative 150-card base decks, out of print)

Control and Chaos are **stand-alone base decks** (not add-ons): they share a common core of 116 cards and differ in 34 deck-exclusive cards each (10 Ultimate Unicorns, some Magical Unicorns, Magic, 12 Instants, Upgrades/Downgrades). They introduce the **Ultimate Unicorn** type (an entry cost plus a strong ability) and the first **non-Neigh Instants**. By far the most demanding set for the engine: replacement effects that apply to *every* player, reactive unicorn abilities, and Instants with their own response windows.

Shared core: 10 babies, 7 basics ×3, Neigh ×10 (two arts ×5), Super Neigh ×1.

**Shared cards (in both decks)**

| Card | Type | # | Mechanics | Needs |
|---|---|---|---|---|
| Academicorn | MU | 1 | ENTER: may move an UP from your S to another S → steal an UP from that S | `move` |
| Alchemist Unicorn | MU | 1 | ENTER: may destroy a U in another S → search D for a U and bring it into that S, shuffle | `search` `bring` |
| Dingocorn | MU | 1 | ENTER: may return all Babies in every S to N | `mass` |
| Dread Pirate Unicorn | MU | 1 | INSTEAD(any player would discard 1): they discard 2 (applies to everyone; never re-triggers itself; interacts with Parallel Universicorn) | `R` |
| Excited Sealicorn | MU | 1 | ENTER: may discard 1 → bring UP from H into S | `bring` |
| Fortune Teller Unicorn | MU | 1 | ENTER: may look at top 3 of D; any number to DP, rest back on top in any order | `look` |
| Foxicorn | MU | 1 | ENTER: may choose any player; they shuffle their H into D → draw 3 | `choosePlayers` `deckPos` |
| Golden Retrievercorn | MU | 1 | ENTER: may search D for UP and bring it into S, shuffle → each other player may draw 1 | `search` `bring` `each` |
| Lady Justice Unicorn | MU | 1 | ENTER: may move a U from the S with the most U to the S with the fewest U | `move` `cond` |
| Mama Unicorn | MU | 1 | ENTER: may discard 1 → bring Baby from N into S | — |
| Mutually Assured Destructicorn | MU | 1 | SD: each other player must sacrifice 1 card | `T.sd` `each` |
| Nannycorn | MU | 1 | BOT: may bring Baby from N into S → you cannot play cards in your Action phase | `S.restrict` |
| Nymphicorn | MU | 1 | BOT: each player without a MU in their S must discard 1 (masquerade does not help) | `each` `cond` |
| Parallel Universicorn | MU | 1 | INSTEAD(any player would discard 1): they may draw 1, if below their hand limit | `R` |
| Patient Zero Unicorn | MU | 1 | INSTEAD(any player would sacrifice 1): they sacrifice 2 (second one is any card type) | `R` |
| Pickpocket Unicorn | MU | 1 | LEAVE: may pull random card from another player | `T.leave` |
| Pied Pipercorn | MU | 1 | INSTEAD(another player would bring a Baby from N into their S): you may discard 1 and take that Baby into your S | `R` |
| Regifting Unicorn | MU | 1 | ENTER: may move a DG from your S to another S | `move` |
| Sacrificial Lambicorn | MU | 1 | BOT: may sacrifice this → discard your H → draw 5 | `discardHand` |
| Slothicorn | MU | 1 | CONT: all *other* U in your S are Basic Unicorns with no effects | `S.blind` |
| Spy Unicorn | MU | 1 | ENTER: may look at another player's H | `lookHand` |
| Traffic Director Unicorn | MU | 1 | BOT: may move UP/DG from any S to any other S → skip your Action phase | `move` `skipPhase` |
| Trojan Unicorn | MU | 1 | WHEN another player plays a U card: may sacrifice this → steal that U (it enters their S first, enter effects fire) | `T.event` |
| Twin Unicorns | MU | 1 | BOT: may discard 1 → play 2 cards this Action phase | `S.playcount` |
| Unicorn Prophet | MU | 1 | BOT: may look at top 2 of D (same order back) | `look` |
| Unicorn Trap Master | MU | 1 | ENTER: may discard 1 → bring a DG from H into any S | `bring` |
| Wrecking Ball Unicorn | MU | 1 | CONT: this card cannot be Neigh'd | `S.protect` |
| Controlled Destruction | M | 2 | Destroy a card; ignore that card's effects (no SD/leave triggers) | `mass` (suppress triggers flag) |
| Grow Up | M | 1 | Sacrifice a Baby; search D for a U and bring it into S, shuffle | `search` `bring` |
| Merry-Go-Round | M | 1 | Each passes their whole H to the player on their left | `each` `give` |
| Prospecting | M | 2 | Flip cards from top of D into DP until a U appears; bring it into S | `reveal` `bring` |
| Quid Pro Quo | M | 2 | Draw 4 → discard 4 | — |
| Rainbow Bazooka | M | 2 | Destroy a U in another S; you and that player may each draw 1 | — |
| Spring Cleaning | M | 1 | Choose any number of players; discard that many; destroy a U in each chosen S | `choosePlayers` `varCount` |
| Temporal Paradox | M | 2 | Return a card in any S to its owner's H + draw 1 | — |
| Time Rift | M | 1 | Return all cards in another S to that H, then bring the same cards straight back (leave effects, then all enter effects simultaneously) | `mass` `bring` `linked` |
| Totally Not Two Unicorns | M | 2 | Draw 1 → play 2 cards; skip your next turn | `S.playcount` `skipTurn` |
| Unicorn Black Market | M | 1 | Choose another player; pull 2 from them; they may pull 1 from you (not one of those two) | `choosePlayers` `linked` |
| Unicorn Trap | M | 2 | Steal U | — |
| Unicorns Forever | M | 2 | Search D for a U and bring it into S; shuffle DP into D; each other player may draw 1 | `search` `bring` `each` |
| Unicornucopia | M | 1 | Draw until you reach your hand limit; each other player may draw 2 | `varCount` `each` |
| Wishing Well | M | 2 | Discard 1 → draw 3 | — |
| Yoink! | M | 2 | Steal UP or DG | — |
| Controlled Chaos | UP | 1 | BOT: may discard 2 → (destroy U OR search D for U → H, shuffle) | `choice` `search` |
| Extra Life | UP | 1 | WHEN a U (of yours) is sacrificed or destroyed: bring it from DP into your S | `T.event` `bring` |
| Foresight | UP | 2 | BOT: may look at top 3; 1 to H, 2 to DP → skip Draw phase | `look` `skipPhase` |
| Glass Half Full | UP | 1 | WHEN a DG enters your S: may search D for UP and bring it into S, shuffle | `T.event` `search` `bring` |
| Imaginary Friendicorn | UP | 1 | CONT: with a Baby in your S you need 1 fewer U to win | `S.win` |
| Objection | UP | 2 | WHEN another player tries to play a Neigh: may discard 1 → the Neigh is stopped, returns to their H; they cannot play a Neigh this turn | `I.play` `T.event` `S.restrict` |
| Retribution | UP | 2 | WHEN another player destroys a U in your S: may destroy a U in their S | `T.event` |
| Unicorn Adoption Agency | UP | 2 | BOT (only with ≥2 BU in S): may discard 1 → bring Baby from N into S | `cond` |
| Unicorn Mafia | UP | 2 | BOT: may discard 2 → (sacrifice OR destroy) a card | `choice` |
| Anti-Magic Bubble | DG | 2 | ENTER: sacrifice all other DG · CONT: you cannot play M · WHEN a DG enters your S: sacrifice this | `mass` `S.restrict` `T.event` |
| Black Hole | DG | 2 | BOT: sacrifice a MU; (regardless) search D for a BU and bring it into S, shuffle | `search` `bring` |
| Brain Freeze | DG | 1 | CONT: you cannot play Instant cards | `S.restrict` |
| Catastrophe / Otter Devastation | DG | 1+1 | CONT: your U are Cats / Otters (masquerade); cannot win | `S.masq` `S.win` |
| Greener Pastures | DG | 1 | BOT: may discard 3 → sacrifice this; otherwise move a U from your S to another S | `choice` `move` |
| Restricted Area | DG | 2 | ENTER: sacrifice all other DG · CONT: you cannot play MU · WHEN a DG enters your S: sacrifice this | `mass` `S.restrict` `T.event` |
| Unicorn Abduction | DG | 1 | BOT: shuffle a U from your S into D → draw 1 · STATE: no U in your S → sacrifice this | `deckPos` `T.state` |

**Control-only cards**

| Card | Type | # | Mechanics | Needs |
|---|---|---|---|---|
| Hypnocorn | MU | 1 | WHEN another player announces a U card effect: may discard 1 → that effect is stopped | `T.event` (effect-level interrupt) |
| Unicorn of Charity | MU | 1 | BOT: may draw 1 → each other player may draw 1 | `each` |
| Ancestor Unicorn | Ultimate | 1 | ENTER: sacrifice U; search D for U and bring it into S, shuffle | `search` `bring` |
| Archangel Unicorn | Ultimate | 1 | ENTER: sacrifice 3 cards · INSTEAD(a card in your S would be sacrificed/destroyed): may discard 1 · BOT: may draw 1 (added to Draw phase) | `R` |
| Chronocorn | Ultimate | 1 | ENTER: discard 1 · may be *played* in a response round (when another player plays a card) | `I.play` (unicorn played at instant speed) |
| Elusive Oceloticorn | Ultimate | 1 | ENTER: sacrifice 2 U · CONT: other players cannot play Neigh; this cannot be Neigh'd | `S.restrict` `S.protect` |
| Game Master Unicorn | Ultimate | 1 | ENTER: discard your H · BOT: may draw 1 · CONT: hand limit +3 | `discardHand` `S.handlimit` |
| Nine-Tailed Foxicorn | Ultimate | 1 | ENTER: sacrifice 2 U; search D for U → S · SD: may search D for U → S | `search` `bring` `T.sd` |
| The Rad Scientist Unicorn | Ultimate | 1 | ENTER: sacrifice 1 · INSTEAD(a card in your S would be destroyed): may discard 2 | `R` |
| Time-Shifting Unicorn | Ultimate | 1 | ENTER: sacrifice 2 · BOT: may look at top 3 and reorder | `look` |
| Unicorn of Conniving Artistry | Ultimate | 1 | ENTER: sacrifice U · INSTEAD(a U in your S would be destroyed): may sacrifice an UP or DG | `R` |
| Unicorn of Glory | Ultimate | 1 | ENTER: discard 1 · WHEN another player plays a DG into your S: may search D for UP → S | `T.event` `search` `bring` |
| Archangel's Blessing | M | 2 | Sacrifice a U, an UP and a DG; search D for a U and an UP → S, shuffle | `search` `bring` |
| Rainbow Bridge | M | 2 | Draw 1 and reveal; if U/UP/DG bring it into S → draw a 2nd | `reveal` `bring` |
| Bulletproof Vest | I | 3 | INSTANT[another player tries to destroy a card in your S]: you draw 1 instead | `I.sacdestroy` |
| Destabilize | I | 3 | INSTANT[another player plays an UP or DG]: stop it, add it to your H, immediately play it | `I.play` `playNow` |
| Imitation | I | 3 | INSTANT[another player plays a U]: bring a BU from your H into your S | `I.play` `bring` |
| Unwind and Rewind | I | 3 | INSTANT[another player plays a card]: stop it, put it on top of D (works on un-neighable cards and on Super Neigh) | `I.play` `deckPos` |
| Unicorn Bribe | UP | 1 | INSTEAD(one of your U would be sacrificed/destroyed): may sacrifice an UP or DG | `R` |
| Unicorn Tax | DG | 1 | WHEN you draw any number of cards: discard 1 (once per draw event) | `T.event` |

**Chaos-only cards**

| Card | Type | # | Mechanics | Needs |
|---|---|---|---|---|
| Sniper Unicorn | MU | 1 | BOT: may destroy an UP → skip your Action phase | `skipPhase` |
| Unicorn of Betrayal | MU | 1 | ENTER: may destroy U · INSTEAD(this would be destroyed by another player): that player may steal it | `R` |
| Epic Level Unicorn | Ultimate | 1 | ENTER: sacrifice 2 U · INSTEAD(you destroy 1 card): may destroy 2 | `R` |
| Frankencorn | Ultimate | 1 | ENTER: discard 1 · WHEN another player plays a card: may sacrifice this → stop it, add it to your H, immediately play it | `I.play` `playNow` |
| Manticore Unicorn | Ultimate | 1 | ENTER: sacrifice 2 · BOT: may add any card from DP to H → skip Draw phase | `skipPhase` |
| Nightmare Unicorn | Ultimate | 1 | ENTER: sacrifice 3 · BOT: may bring a U from DP into S | — |
| Puppetmaster Unicorn | Ultimate | 1 | ENTER: discard 1 · WHEN you discard: may force up to 2 other players to discard 1 | `T.event` `choosePlayers` |
| Shadow Unicorn | Ultimate | 1 | ENTER: sacrifice U · INSTEAD(a U in another S would be sacrificed or returned to hand): may discard 1 → it goes to your H / discard 2 → it enters your S | `R` `varCount` |
| The Reaper Unicorn | Ultimate | 1 | ENTER: sacrifice U · BOT: may sacrifice an UP → destroy 2 U | — |
| Unicorn of Foreboding Doom | Ultimate | 1 | ENTER: sacrifice U · WHEN any player plays an UP into their S: may discard 1 → search D for a DG and bring it into that S | `T.event` `search` `bring` |
| Unicorn of Misfortune | Ultimate | 1 | ENTER: discard 2 · BOT: each other player must discard 1 | `each` |
| Valkyrie Unicorn | Ultimate | 1 | ENTER: sacrifice U · BOT: may sacrifice U → bring U from DP into S | — |
| Kittencorn Burglar | M | 2 | Discard 1 → add 2 cards from DP to H | — |
| Nightmare's Conjuring | M | 2 | Discard 1 → bring a card from DP into S (must be a stable card) | `bring` |
| Absorb and Reflect | I | 3 | INSTANT[another player plays a M]: add it to your H instead, immediately play it | `I.play` `playNow` |
| Intervention | I | 3 | INSTANT[another player tries to sacrifice a card]: destroy a card in their S instead | `I.sacdestroy` |
| Redirect | I | 3 | INSTANT[another player tries to destroy a U]: stop it, destroy another U instead | `I.sacdestroy` |
| Trapped Chest | I | 3 | INSTANT[another player tries to draw]: they must discard 1 instead | `I.draw` |
| Nightmare Pact | UP | 1 | ENTER: choose a card type (Basic / Magical / Ultimate Unicorn, UP, DG) · BOT: may bring a card of that type from DP into S → end turn immediately | `linked` `bring` `endTurn` |
| Tollbooth | DG | 1 | WHEN you play a U card: discard 1 | `T.event` |

---

### A.10 Small sets and one-off cards

**Diamond Edition** — the 2nd Edition base deck plus 4 Diamond Unicorns (own card type; per wiki they cannot be destroyed, sacrificed or returned to hand).

| Card | Type | # | Mechanics | Needs |
|---|---|---|---|---|
| Prismawing | Diamond | 1 | ENTER: may discard 1 → draw 3 | `S.protect` |
| Reaper | Diamond | 1 | ENTER: may force another player to discard 2 | `S.protect` |
| Shimmerblade | Diamond | 1 | ENTER: may look at another player's H, may take 1 | `S.protect` `lookHand` |
| Sparklestar | Diamond | 1 | ENTER: may add M from DP to H | `S.protect` |

**Vinyl blind-box cards** (20 cards; 10 Magical, 10 Ultimate — promo cards shipped with figures)

| Card | Type | Mechanics | Needs |
|---|---|---|---|
| Golden Glazed Unicorn | MU | ENTER: draw 2 · CONT: hand limit +2 | `S.handlimit` |
| Respawn Unicorn | MU | ENTER: may draw 1 · SD: may discard 2 → bring this from DP into S | `T.sd` `bring` |
| Soul Sucking Unicorn | MU | ENTER: may sacrifice U → steal up to 3 UP (from any stables) | `varCount` |
| Titanium Unicorn | MU | CONT: cannot be destroyed | `S.protect` |
| Chimeracorn | Ultimate | ENTER: sacrifice U · BOT: may play 2 cards this Action phase | `S.playcount` |
| Cursed Ritual Unicorn | Ultimate | ENTER: sacrifice U · BOT: may destroy a BU | — |
| Dark Matron Unicorn | Ultimate | ENTER: sacrifice an UP · WHEN a U in your S is sacrificed: may bring Baby from N into S | `T.event` |
| Draconic Unicorn | Ultimate | ENTER: may discard 2 BU cards → take another turn | `extraTurn` |
| Espresso Oracle Unicorn | Ultimate | ENTER: may (steal UP + draw 1 OR move a DG from your S to another S + draw 1) | `choice` `move` |
| Mystic Rainbow Unicorn | Ultimate | ENTER: discard your H · WHEN another player's played M goes to DP: may add it to your H | `discardHand` `T.event` |
| Portal Master Unicorn | Ultimate | ENTER: sacrifice 2 → steal any card · BOT: may pull random card | — |
| Sentinel Unicorn | Ultimate | ENTER: sacrifice U · WHEN another player plays an Instant: may draw 1 | `T.event` |
| Siren Unicorn | Ultimate | ENTER: sacrifice or destroy up to 3 DG → bring that many BU from H into S | `varCount` `bring` |
| Zombie Knight Unicorn | Ultimate | ENTER: discard 4 · WHEN a U in your S is sacrificed or destroyed: return it to your H | `T.event` |

(The other six vinyl cards are reprints: Annoying Flying Unicorn, Classy Narwhal, Ginormous Unicorn, Necromancer Unicorn, Queen Bee Unicorn, Stabby the Unicorn.)

**Convention / Kickstarter exclusives and retired cards** — low priority; several have unclear or never-officially-ruled behaviour.

| Card | Source | Mechanics | Needs |
|---|---|---|---|
| Sugar Raid Unicorn | Convention 2023 | BOT: may skip Draw phase → play 2 cards this Action phase | `skipPhase` `S.playcount` |
| Unicorn of Illusions | Convention 2024 | INSTEAD(this would be sacrificed/destroyed): may return another U in your S to your H | `R` |
| Steampunk Unicorn | Convention | ENTER: may bring UP from H into S | `bring` |
| Cosplay Unicorn | Convention (retired) | ENTER: choose a U in another S; this copies that card's effect until that card is sacrificed/destroyed/returned (no official ruling on details) | `linked` (copy effect) — defer |
| Creature Master Unicorn | KS exclusive | ENTER: may discard 2 → add 2 U from DP to H | — |
| Disaster Relief Unicorn | KS exclusive | ENTER: each sacrifices all DG; search D for UP → S | `mass` `search` `bring` |
| Eternal Youth Unicorn | KS exclusive | BOT: replace a U in any S with a Baby (the U goes to DP) | `bring` |
| Legendary Flying Unicorn | KS exclusive | ENTER: each must discard 1 · Flyer | `each` |
| The Proudest Unicorn | KS exclusive | ENTER: each (other) player gives you 1 card | `each` `give` |
| Unicorn of the Cosmos | KS exclusive | ENTER: shuffle every H and DP into D; each draws 5 | `mass` `each` |
| The Horniest Unicorn | KS exclusive | BOT: may move a U from any S into yours · EOT: move it back | `linked` `T.eot` |
| Unicorn Lasso | Base (retired) | BOT: may steal U · EOT: return it to the S it came from (if still in your S and this is still in play) | `linked` `T.eot` |
| Puppicorn | Base (retired) | Start of every player's turn: moves to that player's S · cannot be sacrificed/destroyed | `T.event` `S.protect` `move` |
| Unicorn Shrinkray | Base (retired) | Choose a player; all their U go to DP without triggering effects; same number of Babies enter their S | `mass` `bring` |
| Extra Tail | Base (retired) | Can only enter a S containing a BU · BOT: may draw an extra card (added to the Draw-phase draw) | `S.entry` |
| Rainbow Mane | Base (retired) | Can only enter a S containing a BU · BOT: may bring BU from H into S | `S.entry` |
| Summoning Ritual | Base (retired) | BOT: may discard 2 U → bring U from DP into S | — |
| Gamercorn | GameStop (retired) | ENTER: may bring UP from H into S | `bring` |
| Cupcakes For Everyone | Rainbow Apoc. (retired) | CONT: your UP affect every player's S | `S.nullify` — defer |
| Sharing Is Caring | Rainbow Sprinkles KS | Take one U from every S, shuffle, deal them back face-down | `mass` `each` |
| The Magical Pugicorn | Rainbow Apoc. (retired) | ENTER: each passes 1 card of their choice to the left | `each` `give` |

---

### A.11 NSFW Base Deck (127 cards) and NSFW Expansion

A third stand-alone base deck (+ an older add-on expansion with mostly the same cards). Mechanically it is almost entirely a re-skin of base-deck and Rainbow-Apocalypse effects, so it is cheap once those work. In scope (decision Q1), built after Control & Chaos. Card names are the publisher's.

13 babies, 7 basics ×3, Neigh variants ×15 (incl. 1 un-neighable "Neigh Means Neigh").

| Card | Type | # | Mechanics | Needs |
|---|---|---|---|---|
| Bear Daddy Unicorn / Twinkicorn | MU | 1+1 | ENTER: may search D for the other named card → H | `search` `nameFilter` |
| Black Market Baby Unicorn | MU | 1 | BOT: may discard 2 → bring Baby from N into S | — |
| Bukkakecorn | MU | 1 | BOT: may discard 3 → steal U | — |
| Cult Leader Unicorn | MU | 1 | ENTER: each must sacrifice U | `each` |
| Double Agent Unicorn | MU | 1 | BOT: may sacrifice BU → pull random card from each other player | `each` |
| Dumpster Diving Unicorn | MU | 1 | ENTER: may add any card from DP to H | — |
| Entitled Unicorn | MU | 1 | ENTER: may look at another H and take a U card | `lookHand` |
| Eunuchorn | MU | 1 | CONT: Babies cannot enter any S | `S.entry` |
| Flesh-Eating Unicorn | MU | 1 | ENTER: may force another player to discard 2 | — |
| Giant Horned Cock | MU | 1 | CONT: counts as 2 U; you cannot play M | `S.count` `S.restrict` |
| Hentaicorn | MU | 1 | = Black Knight Unicorn | `R` |
| Homicidal Psychocorn | MU | 1 | BOT: may discard your H (≥1 card) → destroy U | `discardHand` |
| Horny Flying Unicorn | MU | 1 | = Swift Flying Unicorn | — |
| Kittencorn in Heat | MU | 1 | = Mother Goose Unicorn | — |
| Manscaped Llamacorn | MU | 1 | ENTER: each other player must discard 1 | `each` |
| Moist Unicorn | MU | 1 | ENTER: may search D for U → H | `search` |
| Mother Fuckin' Flying Unicorn | MU | 1 | = Annoying Flying Unicorn | — |
| Officer Hornie | MU | 1 | ENTER: may look at another H and move a U card from it to DP | `lookHand` |
| Peeping Narwhal | MU | 1 | ENTER: each other player shows you their H | `lookHand` `each` |
| Polyamorous Unicorn | MU | 1 | BOT: may move this to another S → steal a U from that S | `move` |
| Sadomasocorn | MU | 1 | BOT: may sacrifice 1 → destroy U | — |
| Semenbiscuit | MU | 1 | = Narwhal Torpedo | `mass` |
| Sextra-Terrestrial Unicorn | MU | 1 | ENTER: may return a card in another S to H (= Mermaid, optional) | — |
| Straight But Curious Unicorn | MU | 1 | ENTER: may look at top 3 of D (same order back) | `look` |
| The Bitchiest Unicorn | MU | 1 | Can only be played/enter if a BU is in your S · BOT: may force another player to discard 1 | `S.entry` |
| Total Stud Unicorn | MU | 1 | CONT: counts as 2 U; you cannot play BU cards | `S.count` `S.restrict` |
| Uncut Unicorn | MU | 1 | CONT: hand limit +1 | `S.handlimit` |
| Unexpected Miracle Unicorn | MU | 1 | ENTER: may discard 1 → bring Baby from N into S | — |
| Unicorn Cuckold | MU | 1 | WHEN a U in your S is stolen: may add any card from DP to H | `T.event` |
| Unicorn Dancer | MU | 1 | BOT: may draw 1 + discard 1 | — |
| Free Candy Unicorn (retired) | MU | 1 | ENTER: steal a Baby · LEAVE: return that Baby to the S it came from | `linked` `T.leave` |
| Naked Narwhal (retired) | MU | 1 | ENTER: steal a BU · LEAVE: return it | `linked` `T.leave` |
| Baby Trap | M | 2 | Steal a Baby | — |
| Blaze and Graze | M | 1 | Reveal top of D: U → your S, anything else → your H | `reveal` `bring` |
| Breaking and Entering | M | 2 | Pull 2 random cards from another player | — |
| Buck Naked | M | 1 | Destroy all UP in another player's S | `mass` |
| Fuck. Marry. Kill | M | 2 | Force another player to discard 1; give another player a card from your H; destroy a U | `give` |
| Hoof Job | M | 2 | = Blatant Thievery | `lookHand` |
| Horrifying Impaling | M | 2 | Destroy U; each must discard 1 | `each` |
| Kink Shame | M | 3 | Destroy UP OR sacrifice DG | `choice` |
| Make it Rain | M | 1 | Discard 2 → draw 2 + take another turn | `extraTurn` |
| Make It Snow | M | 1 | Discard your H → draw 3 + take another turn | `discardHand` `extraTurn` |
| Rainbow Shitstorm | M | 1 | Each must sacrifice 1 card and discard their H; shuffle DP into D; deal 5 to each | `each` `mass` |
| Safe Sex | M | 1 | Each must return a Baby from their S to N | `each` |
| Sex, Drugs, and Unicorns | M | 1 | Choose a player; they must (discard 3 OR sacrifice a U) — their choice | `choosePlayers` `choice` |
| Unicorgy | M | 2 | Draw 1 per BU in your S | `varCount` |
| Unicorn Acid Trip | M | 1 | Each discards their H and draws the same number; you may draw 2 more | `each` `discardHand` `varCount` |
| Unicorn Enema | M | 1 | Sacrifice all DG in your S | `mass` |
| Unicorn Hangover | M | 1 | = Unicorn Nap | `skipTurn` |
| Dirty Mind (expansion only) | M | 2 | Search D for a card of the NSFW set → H | `search` |
| Hell Neigh! / Neigh, Bitch! / The Safeword is Neigh | I | 3+3+5 | = Neigh | `I.play` |
| Neigh, Motherfucker! | I | 3 | = Neigh, Peasant (stopped player discards 1) | `I.play` |
| Neigh Means Neigh | I | 1 | = Super Neigh | `I.play` |
| A Little Side Hustle | UP | 2 | BOT: may bring UP from H into S | `bring` |
| Blow Up Unicorn | UP | 2 | INSTEAD(a U in your S would be sacrificed/destroyed): may sacrifice this | `R` |
| Dominatrix Whip | UP | 1 | BOT: may move a U from any S to any other S (not yours) | `move` |
| Fuzzy Hoofcuffs | UP | 1 | BOT: may discard 2 → steal U | — |
| No Strings Attached (retired) | UP | 1 | = Unicorn Lasso | `linked` `T.eot` |
| Pony Play | UP | 2 | BOT: may pull random card → skip Draw phase | `skipPhase` |
| Putting on a Show | UP | 2 | = Glitter Bomb | — |
| Unicorn Chastity Belt | UP | 1 | = Rainbow Aura | `S.protect` |
| Unicorn Dungeon | UP | 1 | = Double Dutch | `S.playcount` |
| Unicorn Speed | UP | 2 | Can only be *played* if a BU is in the target S · BOT: may draw 1 | `S.entry` |
| Unicorn Vibrator (retired) | UP | 2 | BOT: decide → EOT: may draw 1 | `T.eot` |
| Unicorn with Benefits | UP | 1 | Can only be played if a BU is in the target S · BOT: may bring BU from H into S | `S.entry` |
| Autoerotic Asphyxiation | DG | 1 | = Dragon's Curse (BOT: discard 1) | — |
| Horse Shit | DG | 1 | Masquerade DG; cannot win | `S.masq` `S.win` |
| Limp Horn | DG | 1 | = Broken Stable | `S.restrict` |
| Mid-sex Charlie Horse | DG | 1 | = Blinding Light | `S.blind` |
| Sticky Situation | DG | 1 | BOT: skip either your Draw phase or your Action phase (your choice) | `choice` `skipPhase` |
| Unicorn Butt Plug | DG | 1 | = Tiny Hooves (hand limit −4) | `S.handlimit` |
| Unicorn Flatulence | DG | 1 | BOT: return a U from your S to your H · STATE: no U in your S → sacrifice this | `T.state` |

**Not planned:** Unstable Unicorns for Kids (60 pages on the wiki) is a different game with its own simplified rules, not an expansion.

---

## Appendix B — Sources and method

**Wiki.** Unstable Games Wiki, `https://www.unstablegameswiki.com/` (community-maintained; quotes official rule sheets and publisher statements). Read on 2026-11-16 through the MediaWiki API, 864 Unstable-Unicorns pages in total:

| Pages | Used for |
|---|---|
| `UU - <Card Name>` (543 card pages) | card type, newest wording, older wordings, quantities per product, "Specific Card Rules and Information" |
| `UU Game Terminology - <Term>` (46 pages) | section 3: phases, effects, requirement, replacement, simultaneously, target, masquerade, blinding effect, immunity, enter/leave, steal, sacrifice, destroy, search, pull, choose, remove, replace, return, winning, hand, deck |
| `UU - Gameplay Structure`, `UU - Neigh, Neigh'd, Neighable, Neighing`, `UU - Instant Card`, card-type pages | turn flow, Instant rules, card types |
| `Unstable Unicorns - Second Edition Rules`, `- 2nd Edition - General Player Rules`, `- Control & Chaos Rules`, `- Two Player Rules`, `- FAQ`, `- Top 10 Confusions`, `Unstable Unicorns Gameplay Updates` | rule sheets, win condition, deck-out rule, two-player variant |
| `… - Inventory List` pages of every deck | card counts in Appendix A |
| `UU - Infinite/Finite turn combo`, `UU - Dread Pirate Unicorn and Parallel Universicorn` | worked examples of chains and replacement effects |

Example URLs: `…/index.php?title=UU_-_Valkyrie_Unicorn`, `…/index.php?title=UU_Game_Terminology_-_Beginning_of_Turn_Phase`.

Caveats: the wiki is not an official source and contains a few inconsistencies (for example quantities on some card pages differ from the inventory lists — the inventory lists were used). Card effects in Appendix A are paraphrased; check the card page before implementing a card.

**Code.** Reviewed on branch `select_extensions` at commit `d571b99`: `src/game/` (`card.ts`, `do-types.ts`, `state.ts`, `game.ts`, `effect.ts`, `log.ts`, `neigh.ts`, `types.ts`, `operations/*`), `src/BoardStateManager.tsx`, `src/components/ActionPanel.tsx`, `InfoPanel.tsx`, `GameLogPanel.tsx`, `src/hooks/useAutoActions.ts`, and `agent_docs/*`.

**Checks added on 2026-11-17.**

- *`master`:* fetched and compared (`800c931`); see section 4.4. (The fetch only worked with git's Windows certificate store: `git -c http.sslBackend=schannel fetch origin`.)
- *German texts:* the "Localizations of this Card" section of all card pages was scanned; result in section 5.11.
- *German base deck:* the [German inventory list](https://www.unstablegameswiki.com/index.php?title=Unstable_Unicorns_-_Base_Deck_-_2nd_Edition_-_German_-_Inventory_List) has the same 127 cards as the English one.
- *Images:* `https://www.unicornsdatabase.com/cards/` was opened once to see what it offers (section 5.11); nothing was downloaded.
- *Reference docs:* `rules.md`, `cards.md` and `effects.md` were rewritten from the code; `cards.md` was generated by a script that reads every definition in `card.ts`.
