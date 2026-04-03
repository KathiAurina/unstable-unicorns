# Card Reference

> This file lists every card implemented in the game, grouped by type.
> "Count" is how many copies exist in the deck.

## Card Types Overview

| Type | Played From | Goes To | Can Be Neighed | Notes |
|------|------------|---------|----------------|-------|
| Baby Unicorn | Never played from hand | Stable (starts in nursery) | N/A | Selected in pregame; returns to nursery if removed |
| Basic Unicorn | Hand | Stable | Yes | No special abilities |
| Unicorn | Hand | Stable | Yes | Has enter/passive/reactive triggers |
| Narwhal | Hand | Stable | Yes | Functions identically to Unicorn type for gameplay |
| Upgrade | Hand | Your upgrade/downgrade stable | Yes | Persistent beneficial effects |
| Downgrade | Hand | Target player's upgrade/downgrade stable | **Yes** | Persistent harmful effects on target |
| Magic | Hand | Temporary stable (discarded after resolving) | Yes | One-time effects |
| Neigh | Hand (during Neigh voting) | Discard pile | Yes (counter-neigh) | Blocks a card being played |
| Super Neigh | Hand (during Neigh voting) | Discard pile | **No** | Ends Neigh discussion immediately |

All four "unicorn-family" types (Baby, Basic, Unicorn, Narwhal) count as Unicorns for the win condition and for effects that target "unicorn" cards.

---

## Baby Unicorns (13 total, 1 each)

| Title | Image | Notes |
|-------|-------|-------|
| Baby Unicorn | baby0 through baby11 | 12 copies with different art |
| Baby Narwhal | baby12 | 1 copy |

All share the same rule: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead."

---

## Basic Unicorns (24 total)

| Title | Count | Notes |
|-------|-------|-------|
| Basic Unicorn | 7 variants x 3 each = 21 | No special abilities; 7 different art styles (basic0-basic6) |
| Narwhal (basic) | 3 | Type is "basic", image "basic7". No special abilities |

---

## Special Unicorns (20 unique cards)

| Title | Count | Trigger | Effect Summary |
|-------|-------|---------|----------------|
| Americorn | 1 | Enter | May pull a random card from another player's hand |
| Annoying Flying Unicorn | 1 | Enter + Return | May force another player to discard a card. Returns to hand if destroyed/sacrificed |
| Chainsaw Unicorn | 2 | Enter | May DESTROY an opponent's Upgrade card OR SACRIFICE one of your own Downgrade cards (choice) |
| Dark Angel Unicorn | 1 | Enter | May SACRIFICE a Unicorn, then revive a Unicorn from discard pile (cost-then-effect) |
| Ginormous Unicorn | 1 | Enter | Adds effects: counts as 2 Unicorns AND you cannot play Neigh cards |
| Greedy Flying Unicorn | 1 | Enter + Return | DRAW a card (mandatory). Returns to hand if destroyed/sacrificed |
| Llamacorn | 1 | Enter | Each player (including you) must DISCARD a card (mandatory) |
| Magical Flying Unicorn | 1 | Enter | May add a Magic card from the discard pile to your hand |
| Magical Kittencorn | 1 | Passive | Cannot be destroyed by Magic cards |
| Majestic Flying Unicorn | 1 | Enter + Return | May add a Unicorn card from discard pile to hand. Returns to hand if destroyed/sacrificed |
| Mother Goose Unicorn | 1 | Enter | May bring a Baby Unicorn from the Nursery into your Stable |
| Mermaid Unicorn | 1 | Enter | May return a card in another player's Stable to their hand |
| Narwhal Torpedo | 2 | Enter (auto) | Automatically SACRIFICE all Downgrade cards in your Stable |
| Necromancer Unicorn | 1 | Enter | May DISCARD 2 Unicorn cards from hand, then revive a Unicorn from discard pile (cost-then-effect) |
| Queen Bee Unicorn | 1 | Enter | Basic Unicorns cannot enter any player's Stable except yours (persistent effect) |
| Rainbow Unicorn | 1 | Enter | May bring a Basic Unicorn from your hand into your Stable |
| Rhinocorn | 1 | Begin of turn | May DESTROY a Unicorn card. If you do, immediately end your turn |
| Seductive Unicorn | 1 | Enter | May DISCARD a card, then STEAL a Unicorn (cost-then-effect) |
| Swift Flying Unicorn | 1 | Enter + Return | May add a Neigh card from discard pile to hand. Returns to hand if destroyed/sacrificed |
| Unicorn on the Cob | 1 | Enter | DRAW 2 cards, then DISCARD 1 card (mandatory) |
| Zombie Unicorn | 1 | Begin of turn | May DISCARD a card, then revive a Unicorn from discard pile. Ends turn immediately |

---

## Special Narwhals (4 unique cards)

| Title | Count | Trigger | Effect Summary |
|-------|-------|---------|----------------|
| Alluring Narwhal | 1 | Enter | May STEAL an Upgrade card |
| Classy Narwhal | 1 | Enter | May search the deck for an Upgrade card and add it to hand |
| Shabby the Narwhal | 1 | Enter | May search the deck for a Downgrade card and add it to hand |
| The Great Narwhal | 1 | Enter | May search the deck for a Narwhal card and add it to hand |

---

## Upgrades (14 cards total)

| Title | Count | Trigger | Effect Summary |
|-------|-------|---------|----------------|
| Yay | 2 | Enter | Cards you play cannot be Neighed (persistent effect) |
| Stable Artillery | 3 | Begin of turn | May DISCARD 2 cards, then DESTROY a Unicorn (cost-then-effect) |
| Rainbow Lasso | 1 | Begin of turn | May DISCARD 3 cards, then STEAL a Unicorn (cost-then-effect) |
| Rainbow Aura | 1 | Enter | Your Unicorn cards cannot be destroyed (persistent effect) |
| Glitter Bomb | 2 | Begin of turn | May SACRIFICE a card, then DESTROY a card (cost-then-effect) |
| Double Dutch | 1 | Begin of turn | May play 2 cards during your Action Phase (persistent effect, refreshed each turn) |
| Claw Machine | 3 | Begin of turn | May DISCARD a card, then DRAW a card (cost-then-effect) |
| Caffeine Overload | 1 | Begin of turn | May SACRIFICE a card, then DRAW 2 cards (cost-then-effect) |

---

## Downgrades (6 unique cards)

| Title | Count | Trigger | Effect Summary |
|-------|-------|---------|----------------|
| Barbed Wire | 1 | Reactive | Each time a Unicorn enters or leaves your Stable, DISCARD a card |
| Blinding Light | 1 | Enter | All your Unicorns are treated as Basic Unicorns (no special abilities) |
| Broken Stable | 1 | Enter | You cannot play Upgrade cards |
| Pandamonium | 1 | Enter | All your Unicorns are Pandas. Unicorn-targeting effects don't affect them. You cannot win |
| Slowdown | 1 | Enter | You cannot play Neigh cards |
| Tiny Stable | 1 | Enter | If you have more than 5 Unicorns, you must sacrifice one |

---

## Magic Cards (20 cards total)

| Title | Count | Effect Summary |
|-------|-------|----------------|
| Unicorn Poison | 3 | DESTROY a Unicorn card (mandatory) |
| Alignment Change | 2 | DISCARD 2 cards, then STEAL a Unicorn (mandatory, cost-then-effect) |
| Unfair Bargain | 2 | Trade hands with another player (mandatory) |
| Two-For-One | 2 | SACRIFICE a card, then DESTROY 2 cards (mandatory, cost-then-effect) |
| Targeted Destruction | 1 | DESTROY an Upgrade card OR SACRIFICE a Downgrade card (choice) |
| Shake Up | 1 | Shuffle your hand, this card, and discard pile into deck. DRAW 5 cards (mandatory) |
| Reset Button | 1 | All players SACRIFICE all Upgrades and Downgrades. Shuffle discard into deck (mandatory) |
| Mystical Vortex | 1 | All players DISCARD a card. Shuffle discard pile into deck (mandatory) |
| Kiss of Life | 1 | Bring a Unicorn from discard pile into your Stable (mandatory) |
| Good Deal | 1 | DRAW 3 cards, then DISCARD 1 card (mandatory) |
| Change of Luck | 2 | DRAW 2 cards, then DISCARD 3 cards. Take another turn (mandatory) |
| Back Kick | 3 | Return a card in another player's Stable to their hand. That player must DISCARD a card (mandatory) |

---

## Neigh Cards (15 total)

| Title | Count | Notes |
|-------|-------|-------|
| Neigh | 14 | Blocks a card from being played. Can itself be Neighed |
| Super Neigh | 1 | Blocks a card from being played. Cannot be Neighed. Ends discussion immediately |

---

## Begin-of-Turn Cards Reference

These cards have optional effects that fire at the start of your turn (beginning stage). Many use the cost-then-effect pattern:

| Card | Cost | Effect | Ends Turn? |
|------|------|--------|------------|
| Stable Artillery | Discard 2 cards | Destroy a Unicorn | No |
| Rainbow Lasso | Discard 3 cards | Steal a Unicorn | No |
| Glitter Bomb | Sacrifice a card | Destroy a card | No |
| Claw Machine | Discard a card | Draw a card | No |
| Caffeine Overload | Sacrifice a card | Draw 2 cards | No |
| Rhinocorn | None | Destroy a Unicorn | **Yes** |
| Vagabond Unicorn | Discard a card | Pull random card from another player | No |
| Survivalist Unicorn | Discard a card | Sacrifice a Downgrade | No |
| Zombie Unicorn | Discard a card | Revive a Unicorn from discard | **Yes** |
| Double Dutch | None | Allows playing 2 cards this turn | No |

---

## Total Deck Size

Counting all copies:
- 13 Baby Unicorns (in nursery, not draw pile)
- 24 Basic Unicorns/Narwhals
- 22 Special Unicorns (including 2x Chainsaw, 2x Narwhal Torpedo)
- 4 Special Narwhals
- 14 Upgrades
- 6 Downgrades
- 20 Magic cards
- 15 Neigh cards

**Draw pile at start**: ~105 cards minus baby unicorns minus starting hands = varies by player count.
