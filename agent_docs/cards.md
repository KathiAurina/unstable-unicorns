# Card Reference

> **Status (2026-11-17).** Generated from `src/game/card.ts` on branch `select_extensions` (`d571b99`): every card that exists in the code, with the count and the behaviour the code gives it. `master` (`800c931`) has the same base-game cards with the same behaviour; it has no set selection, and of the Adventures cards only Vagabond and Survivalist Unicorn exist there (as part of the single deck).
>
> The full list of cards of all products, including the ones not implemented yet, is in `expansion-plan.md` Appendix A. English card text (`description.en`) is the reference; the German text is a translation.

## Card types in the code

| `type` | Played from | Goes to | Can be Neigh'd | Notes |
|---|---|---|---|---|
| `baby` | never played | stable (starts in the nursery) | — | returns to the nursery instead of hand / discard pile |
| `basic` | hand | stable | yes | no abilities |
| `unicorn` | hand | stable | yes | Magical Unicorn |
| `narwhal` | hand | stable | yes | Magical Unicorn with "Narwhal" in its name; behaves like `unicorn` |
| `upgrade` | hand | any player's upgrade/downgrade row | yes | |
| `downgrade` | hand | any player's upgrade/downgrade row | yes | |
| `magic` | hand | temporary stable, then discard pile | yes | one-time effect |
| `neigh` | hand, during Neigh voting | discard pile | yes | |
| `super_neigh` | hand, during Neigh voting | discard pile | no | ends the discussion |

`isUnicorn()` is true for `baby`, `basic`, `unicorn` and `narwhal`. The basic Narwhal has the type list `["basic", "narwhal"]`.

Notation in the tables: **may** = optional scene; `A → B` = B only after A was done (cost then effect); `A / B` = the player picks one.

---

## Set `base_game` (117 cards: 13 babies + 104 in the deck)

### Baby Unicorns (13)

Baby Unicorn ×12 (images `baby0`–`baby11`), Baby Narwhal ×1 (`baby12`).

### Basic Unicorns (24)

Basic Unicorn: 7 designs ×3 (`basic0`–`basic6`). Narwhal ×3 (`basic7`).

### Magical Unicorns (25)

| Card | # | Trigger | Behaviour in code |
|---|---|---|---|
| Alluring Narwhal | 1 | enter | may steal an Upgrade |
| Americorn | 1 | enter | may pull a random card from another player's hand |
| Annoying Flying Unicorn | 1 | enter | may make another player discard a card · returns to hand when destroyed/sacrificed |
| Chainsaw Unicorn | 1 | enter | may destroy another player's Upgrade / sacrifice one of your Downgrades |
| Classy Narwhal | 1 | enter | may search the deck for an Upgrade |
| Dark Angel Unicorn | 1 | enter | may sacrifice a unicorn → revive a unicorn from the discard pile |
| Ginormous Unicorn | 1 | enter | effects `count_as_two` and `you_cannot_play_neigh` |
| Greedy Flying Unicorn | 1 | enter | draw 1 (mandatory) · returns to hand |
| Llamacorn | 1 | enter | every player discards 1 (mandatory) |
| Magical Flying Unicorn | 1 | enter | may take a Magic card from the discard pile · returns to hand |
| Magical Kittencorn | 1 | passive | cannot be destroyed by Magic cards |
| Majestic Flying Unicorn | 1 | enter | may take a unicorn from the discard pile · returns to hand |
| Mermaid Unicorn | 1 | enter | **may** return a card in another player's stable to their hand |
| Mother Goose Unicorn | 1 | enter | may bring a Baby Unicorn from the nursery |
| Narwhal Torpedo | 1 | enter | all your Downgrades are sacrificed automatically |
| Necromancer Unicorn | 1 | enter | may discard 2 unicorn cards → revive a unicorn |
| Queen Bee Unicorn | 1 | enter | effect `basic_unicorns_can_only_join_your_stable` |
| Rainbow Unicorn | 1 | enter | may bring a Basic Unicorn from hand into the stable |
| Rhinocorn | 1 | begin of turn | may destroy a unicorn; ends the turn |
| Seductive Unicorn | 1 | enter | may discard 1 → steal a unicorn |
| Shabby the Narwhal | 1 | enter | may search the deck for a Downgrade |
| Swift Flying Unicorn | 1 | enter | may take a Neigh from the discard pile · returns to hand |
| The Great Narwhal | 1 | enter | may search the deck for a card of type `narwhal` |
| Unicorn on the Cob | 1 | enter | draw 2 → discard 1 (mandatory) |
| Zombie Unicorn | 1 | begin of turn | may discard **any** card → revive a unicorn; ends the turn |

### Upgrades (14)

| Card | # | Trigger | Behaviour in code |
|---|---|---|---|
| Caffeine Overload | 1 | begin of turn | may sacrifice a card → draw 2 |
| Claw Machine | 3 | begin of turn | may discard 1 → draw 1 |
| Double Dutch | 1 | begin of turn | effect `double_dutch` (play 2 cards this turn) |
| Glitter Bomb | 2 | begin of turn | may sacrifice a card → destroy a card |
| Rainbow Aura | 1 | enter | effect `your_unicorns_cannot_be_destroyed` |
| Rainbow Lasso | 1 | begin of turn | may discard 3 → steal a unicorn |
| Stable Artillery | 3 | begin of turn | may discard 2 → destroy a unicorn |
| Yay | 2 | enter | effect `your_cards_cannot_be_neighed` |

### Downgrades (6)

| Card | # | Trigger | Behaviour in code |
|---|---|---|---|
| Barbed Wire | 1 | a unicorn enters / leaves your stable | discard 1 (injected into the running scene) |
| Blinding Light | 1 | enter | effect `my_unicorns_are_basic` |
| Broken Stable | 1 | enter | effect `you_cannot_play_upgrades` |
| Pandamonium | 1 | enter | effect `pandamonium` |
| Slowdown | 1 | enter | effect `you_cannot_play_neigh` |
| Tiny Stable | 1 | enter | effect `tiny_stable` |

### Magic (20) — all mandatory

| Card | # | Behaviour in code |
|---|---|---|
| Alignment Change | 2 | discard 2 → steal a unicorn |
| Back Kick | 3 | return a card in another player's stable to their hand; that player discards 1 |
| Change of Luck | 2 | draw 2 → discard 3; take another turn |
| Good Deal | 1 | draw 3 → discard 1 |
| Kiss of Life | 1 | revive a unicorn from the discard pile |
| Mystical Vortex | 1 | every player discards 1 → shuffle the discard pile into the deck |
| Reset Button | 1 | every player sacrifices all Upgrades and Downgrades; shuffle the discard pile into the deck |
| Shake Up | 1 | shuffle this card, your hand and the discard pile into the deck; draw 5 |
| Targeted Destruction | 1 | destroy another player's Upgrade / sacrifice one of your Downgrades |
| Two-For-One | 2 | sacrifice a card → destroy 2 cards |
| Unfair Bargain | 2 | trade hands with another player |
| Unicorn Poison | 3 | destroy a unicorn |

### Instants (15)

Neigh ×14, Super Neigh ×1.

---

## Set `adventures_2nd_edition` (20 cards so far)

Baby Unicorn ×4 (`baby_fisherman`, `baby_forest`, `baby_pirate`, `baby_safari`). Basic Unicorns ×1 each: Eager Adventurer Unicorn, Glamping Unicorn, Indoor Rockclimbing Unicorn, Landlubber Unicorn.

| Card | # | Trigger | Behaviour in code |
|---|---|---|---|
| Bungee Jumping Unicorn | 1 | destroyed / sacrificed | may sacrifice a Downgrade / return this card to hand |
| Cutthroat Captain Unicorn | 1 | enter | may steal a Baby Unicorn / revive a Basic Unicorn |
| Extreme Adventurer Unicorn | 1 | passive + begin of turn | Basic Unicorns cannot enter this stable · may draw 1 |
| Fearless Unicorn | 1 | destroyed / sacrificed | may take a **Neigh** from the discard pile |
| First Mer-Mate Unicorn | 1 | destroyed / sacrificed | may draw 2 / bring a Basic Unicorn from hand into the stable |
| Fisherman Unicorn | 1 | enter | may look at another player's hand and take a card |
| Hornswoggler Unicorn | 1 | enter | may **draw 3** / trade hands with another player |
| Pillaging Pirate Unicorn | 1 | enter | may steal an Upgrade / move a Downgrade from your stable to another player |
| Salty Seadogicorn | 1 | enter | may make **one** other player discard / draw 1 |
| Stowaway Unicorn | 1 | enter | may draw 1; a Unicorn, Upgrade or Downgrade goes straight into the stable |
| Survivalist Unicorn | 1 | begin of turn | may discard 1 → sacrifice a Downgrade |
| Vagabond Unicorn | 1 | begin of turn | may discard 1 → pull a random card from another player |

---

## Begin-of-turn cards

| Card | Cost | Effect | Ends turn |
|---|---|---|---|
| Stable Artillery | discard 2 | destroy a unicorn | no |
| Rainbow Lasso | discard 3 | steal a unicorn | no |
| Glitter Bomb | sacrifice a card | destroy a card | no |
| Claw Machine | discard 1 | draw 1 | no |
| Caffeine Overload | sacrifice a card | draw 2 | no |
| Double Dutch | — | play 2 cards this turn | no |
| Rhinocorn | — | destroy a unicorn | **yes** |
| Zombie Unicorn | discard 1 | revive a unicorn | **yes** |
| Vagabond Unicorn | discard 1 | pull a random card | no |
| Survivalist Unicorn | discard 1 | sacrifice a Downgrade | no |
| Extreme Adventurer Unicorn | — | draw 1 | no |

---

## Deviations from the printed 2nd Edition cards

Decisions are recorded in `rules.md` section 7.

**Behaviour** (to be fixed)

| Card | Printed | Code |
|---|---|---|
| Mermaid Unicorn | mandatory | optional |
| Zombie Unicorn | discard a *Unicorn* card | discard any card; text is the older wording |
| Hornswoggler Unicorn | discard your hand, then draw 3 — or trade hands | draws 3 without discarding |
| Salty Seadogicorn | each other player discards — or draw | one chosen player discards |
| Fearless Unicorn | take any Instant from the discard pile | Neigh only |
| The Great Narwhal | any card with "Narwhal" in its name | only cards of type `narwhal`; misses the basic Narwhal and Baby Narwhal |

**Deck composition** (to be fixed when the card sets are rebuilt for the expansions)

| Item | 2nd Edition base deck | Code |
|---|---|---|
| Narwhal (basic) | ×1 | ×3 |
| Zombie Unicorn | not in the base deck (Rainbow Apocalypse) | in `base_game` |
| Alignment Change | not in the base deck (Unicorns of Legend) | in `base_game` |
| Missing | Black Knight Unicorn, Extremely Destructive Unicorn, Shark With a Horn, Stabby the Unicorn, Unicorn Oracle, Unicorn Phoenix, Blatant Thievery, Glitter Tornado ×2, Re-Target ×2, Unicorn Swap ×2, Nanny Cam, Sadistic Ritual | — |
| Adventures basics | ×3 each | ×1 each |
| Adventures Magic, Instant, Upgrade, Downgrade cards | 18 designs | none yet |

Source: the wiki's inventory lists for the [base deck](https://www.unstablegameswiki.com/index.php?title=Unstable_Unicorns_-_Base_Deck_-_2nd_Edition_-_Inventory_List) and [Adventures](https://www.unstablegameswiki.com/index.php?title=Unstable_Unicorns_Expansion_-_Adventures_-_2nd_Edition_-_Inventory_List).
