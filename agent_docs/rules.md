# Game Rules

> This file is the authoritative, human-verified reference for the game rules.
> Agents should trust it over their own inferences from code.

## Overview

Unstable Unicorns is a competitive card game for 2-8 players. Each player starts with a Baby Unicorn in their Stable and a hand of 5 cards. The goal is to be the first player to collect **7 Unicorns** in your Stable.

The core tension: every turn you can play one card (a unicorn into your stable, a magic spell, an upgrade for yourself, or a downgrade on an opponent) — but any other player may **Neigh** your card to block it.

## Turn Structure

### Pregame Phase

All players simultaneously pick a Baby Unicorn from the nursery and ready up. Once everyone is ready, the game begins.

### Main Phase (turn-based)

Each turn has two stages:

#### 1. Beginning Stage

1. **Begin-of-turn effects fire** — Upgrades and unicorns in your stable with `begin_of_turn` triggers create Scenes (see `effects.md`). Some are optional, some mandatory.
2. **Draw a card** — You draw 1 card from the draw pile, then advance to the Action Phase. You cannot draw while mandatory scenes or in-progress scenes remain unresolved.

#### 2. Action Phase

You may do **one** of:
- **Play a card** from your hand (triggers Neigh voting — see below)
- **Draw a card and end your turn** (this counts as your action — you cannot play a card afterward)
- **End your turn** without doing anything

If you have the **Double Dutch** effect, you may play **2 cards** instead of 1.

Scenes from card effects may also need resolving during this stage.

#### End of Turn

- If your hand exceeds **7 cards**, you must discard down to 7 (mandatory).
- If **Change of Luck** is active on you, it is removed and you get another turn.
- Otherwise, play passes to the next player.

## Neigh Voting

When any player plays a card (unicorn, magic, upgrade, or downgrade), a **Neigh Discussion** opens:

1. All other players may play a **Neigh** card to block it, or pass ("no neigh").
2. If someone plays a Neigh, a new round opens where players may Neigh *that* Neigh (counter-neigh).
3. This continues in rounds. At each round, all undecided players must eventually vote.
4. **Odd-numbered total rounds** = the original card resolves (enters play). **Even-numbered total rounds** = the original card is blocked (goes to discard).
5. A **Super Neigh** ends the discussion immediately — it cannot itself be Neighed.

**Key rules:**
- **All playable card types can be Neighed** — unicorns, narwhals, basics, magic, upgrades, AND downgrades.
- If the player has the `your_cards_cannot_be_neighed` effect (from "Yay"), their cards skip Neigh voting entirely.
- If a player has the `you_cannot_play_neigh` effect (from "Slowdown" or "Ginormous Unicorn"), they cannot play Neigh cards.
- Baby Unicorns are never played from hand, so they are never subject to Neigh voting.

## Win Condition

A player wins when they have **7 or more Unicorns** in their Stable.

Counting rules:
- Baby Unicorns, Basic Unicorns, special Unicorns, and Narwhals all count as Unicorns for this purpose (the `isUnicorn` function includes all four types).
- **Ginormous Unicorn** counts as **2** Unicorns (via the `count_as_two` effect).
- If **Pandamonium** is active on your stable, your unicorns are considered Pandas — they do NOT count as Unicorns and you **cannot win**.

The game also ends if the draw pile runs out.

## Special Rules & Gotchas

### Baby Unicorns
- Live in the **Nursery**, not in the draw pile. They are never in a player's hand.
- Selected during pregame; start in your stable.
- When a Baby Unicorn would be sacrificed, destroyed, or returned to hand, it goes back to the **Nursery** instead.
- Can only enter a stable via specific card effects (e.g., Mother Goose Unicorn).

### Tiny Stable
- If you have the `tiny_stable` effect and more than 5 unicorns (or more than 4 if Ginormous Unicorn is among them), you must **sacrifice** a unicorn.
- This check fires when a card enters your stable.
- If Pandamonium is also active, Tiny Stable is effectively inert (unicorns are pandas, not unicorns, so the count doesn't trigger).

### Cost-Then-Effect vs. Choice

This is a common source of confusion. When a card has **two sequential actions** in a scene:

- **Cost-then-effect**: The first action is a *cost* you pay, and the second is the *reward*. Example: **Stable Artillery** — "DISCARD 2 cards, then DESTROY a Unicorn." You must discard 2 cards *first*, and only then do you get to destroy. You cannot destroy without paying the cost.
- **Choice (same action, multiple instructions)**: When multiple instructions are in the *same* action for the same protagonist, the player picks exactly one. Example: **Chainsaw Unicorn** — "DESTROY an Upgrade card or SACRIFICE a Downgrade card." These are alternatives.

### Mandatory vs. Optional Scenes

- `mandatory: true` — The scene **must** be resolved before the turn can advance. Example: Unicorn Poison's destroy effect.
- `mandatory: false` — The player may skip the scene. Example: Americorn's pull effect ("you may...").

When a scene is optional, the player can decline by skipping it. When mandatory, they must execute all actions in sequence.

### Blinding Light + Pandamonium Interaction

- **Blinding Light** (`my_unicorns_are_basic`): Makes all your unicorns count as Basic — they lose special abilities.
- **Pandamonium** (`pandamonium`): Makes all your unicorns count as Pandas.
- If **both** are active: Pandamonium takes priority. Your unicorns are Pandas (not basic), so they **retain** their special abilities but are immune to unicorn-targeting effects. (See `isCardBasicDueToEffect` in `effect.ts`.)

### Cards That Return to Hand

Several "Flying Unicorn" cards have a `this_destroyed_or_sacrificed` trigger with `return_to_hand`. When destroyed or sacrificed, instead of going to the discard pile, they return to the owner's hand. This makes them resilient.

### endTurnImmediately

Some begin-of-turn scenes (e.g., Rhinocorn, Zombie Unicorn) have `endTurnImmediately: true`. If the player commits to such a scene, their turn ends immediately after resolving it — they skip the draw and action phase entirely.

### Queen Bee Unicorn

Adds the `basic_unicorns_can_only_join_your_stable` effect. While active, **no other player** can have Basic Unicorns enter their stable. This is checked globally — any player's Queen Bee blocks basics for everyone else.

### Pandamonium and Destruction Immunity

When Pandamonium is active, your unicorns are Pandas. Since destroy targets "unicorn" type cards, and Pandas are not unicorns, **your stable cards cannot be targeted by destroy effects** that specify unicorn type.

### Magical Kittencorn

Has the `cannot_be_destroyed_by_magic` passive. It is immune to destroy effects originating from Magic cards (e.g., Unicorn Poison), but CAN be destroyed by non-magic sources.
