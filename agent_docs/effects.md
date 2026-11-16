# Effects & Mechanics

> **Status (2026-11-17).** Documents the internal mechanics **as implemented today** (checked against
> `src/game/` on branch `select_extensions`, `d571b99`): persistent effects, passives, Do operations,
> trigger types, and the Script/Scene/Action/Instruction resolution model.
>
> This model is planned to be replaced by the card registry + effect language + prompt engine described in
> `expansion-plan.md` section 5. Until that happens, this file is the reference for how the code works.

## Persistent Effects (playerEffects)

Effects are stored per-player in `G.playerEffects[playerID]`. Each entry has an `effect.key` and optionally a `cardID` linking it to the card that created it. When the source card leaves the stable, its effects are automatically removed.

| Effect Key | Meaning | Source Cards |
|-----------|---------|-------------|
| `double_dutch` | Can play 2 cards during action phase this turn | Double Dutch (upgrade) |
| `your_cards_cannot_be_neighed` | Cards you play skip Neigh voting entirely | Yay (upgrade, x2) |
| `you_cannot_play_neigh` | Cannot play Neigh or Super Neigh cards | Slowdown (downgrade), Ginormous Unicorn |
| `you_cannot_play_upgrades` | Cannot play Upgrade cards | Broken Stable (downgrade) |
| `your_unicorns_cannot_be_destroyed` | Your unicorns are immune to destroy effects | Rainbow Aura (upgrade) |
| `my_unicorns_are_basic` | All your unicorns lose special abilities, treated as basic | Blinding Light (downgrade) |
| `basic_unicorns_can_only_join_your_stable` | No other player can have Basic Unicorns enter their stable | Queen Bee Unicorn |
| `pandamonium` | All your unicorns are Pandas, immune to unicorn-targeting effects, cannot win | Pandamonium (downgrade) |
| `count_as_two` | This unicorn counts as 2 for the win condition | Ginormous Unicorn |
| `tiny_stable` | Must sacrifice a unicorn if you have more than 5 | Tiny Stable (downgrade) |
| `save_mate_by_sacrifice` | A destroy aimed at a card of this player does nothing (checked in `executeDo.ts`) | no card adds it (sandbox only) |
| `your_hand_is_visible` | The UI shows this player's hand to everyone (`OverlayManager`, `MobileBoard`) | no card adds it (sandbox only) |
| `change_of_luck` | Temporary: added when the 3rd card of Change of Luck is discarded, removed at end of turn, grants an extra turn | Change of Luck (magic) |
| `can_play_two_cards` | Unused key (Double Dutch uses `double_dutch`) | — |

Notes:

- `double_dutch` is added by a `begin_of_turn` trigger, not on enter — a Double Dutch that enters during your turn does nothing until your next turn.
- Effects are only **added** when their trigger fires and are removed when the source card leaves. They are not re-evaluated: a unicorn that entered under Blinding Light never gets its effect (see `rules.md` issue I3).

### Passives

A second, separate mechanism: `passive` on the card definition, read directly where it matters.

| Passive | Meaning | Card | Checked in |
|---|---|---|---|
| `cannot_be_destroyed_by_magic` | Not a legal target for a destroy whose source is a Magic card | Magical Kittencorn | `findDestroyTargets` |
| `basic_unicorns_cannot_enter` | Basic Unicorns cannot enter the stable this card is in | Extreme Adventurer Unicorn | `canEnter` |
| `count_as_two` | Declared in the type, not used (Ginormous uses the effect key) | — | — |

### Effect Interactions

- **`my_unicorns_are_basic` + `pandamonium`**: If both are active, Pandamonium wins — unicorns are Pandas and KEEP their special abilities. See `isCardBasicDueToEffect()`. (Decided to change: `rules.md` R1.)
- **`pandamonium` + destroy**: `destroy` with `type: "unicorn"` cannot target the player's unicorns; `type: "any"` can.
- **`pandamonium` + sacrifice**: the player's unicorns are not legal targets, neither for `type: "unicorn"` nor for `type: "any"`.
- **`pandamonium` + steal / returnToHand / backKick**: no check — the unicorns can be chosen.
- **`pandamonium` + unicornSwap1**: the player cannot give a unicorn away.
- **`tiny_stable` + `pandamonium`**: Tiny Stable is inert while Pandamonium is active.
- **`tiny_stable` + `count_as_two`**: The threshold drops from 5 to 4 unicorns when Ginormous is present.

The decided target behaviour for Pandamonium (effects that name a "Unicorn card" cannot affect them, effects on "a card" can) is `rules.md` R4.

---

## Do Operations

A `Do` is the atomic unit of game action. Each has a `key` that dispatches to a function in `operations/`. Card definitions embed Do objects in their triggers.

### Important: Cost-Then-Effect Pattern

When a card has two sequential Actions in a Scene, the first is a **cost** and the second is the **reward**. The player must complete the cost before the reward executes. This is NOT a choice — it's a sequence.

Example: Stable Artillery has actions `[{discard 2}, {destroy unicorn}]`. The player discards 2 cards FIRST, then gets to destroy a unicorn.

Contrast with a **choice**: when multiple Instructions are in the SAME Action for the same protagonist, the player picks exactly one.

### Operations by Category

**Drawing:**
| Key | Parameters | Description |
|-----|-----------|-------------|
| `draw` | `count: number` | Draw cards from the draw pile into hand |
| `search` | `type: "any" \| "unicorn" \| "upgrade" \| "downgrade" \| "narwhal"` | Search the deck for a card of the given type, add to hand, shuffle deck. `"narwhal"` matches cards whose type is exactly `narwhal` (not the basic Narwhal). The found card is not revealed to other players |
| `stowawaydraw` | — | Stowaway Unicorn only: draw the top card; a unicorn, Upgrade or Downgrade enters the stable directly, anything else goes to hand |

**Discarding:**
| Key | Parameters | Description |
|-----|-----------|-------------|
| `discard` | `count: number, type: "any" \| "unicorn", changeOfLuck?: boolean` | Discard cards from hand. Count decrements one at a time. If `changeOfLuck` is true, adds the `change_of_luck` effect after final discard |
| `makeSomeoneDiscard` | — | Choose another player; they must discard a card |

**Stealing / Pulling:**
| Key | Parameters | Description |
|-----|-----------|-------------|
| `steal` | `type: "unicorn" \| "upgrade" \| "baby", unicornSwap?: boolean` | Take a card from another player's stable into yours. Only cards that may enter your stable are legal targets |
| `pull` | — | Internal helper: move the card at a given hand index from one player to another |
| `pullRandom` | — | Take a random card from another player's hand |
| `blatantThievery1` | — | Look at another player's hand and take a card (Fisherman Unicorn) |

**Destroying:**
| Key | Parameters | Description |
|-----|-----------|-------------|
| `destroy` | `type: "unicorn" \| "upgrade" \| "any" \| "my_downgrade_other_upgrade", count?: number` | Move a card from a stable to the discard pile. The target finder does **not** exclude the acting player's own stable (`rules.md` issue I8). Respects `your_unicorns_cannot_be_destroyed` and `cannot_be_destroyed_by_magic` for unicorns; `pandamonium` only for `type: "unicorn"`. The special type `my_downgrade_other_upgrade` allows sacrificing your own downgrade OR destroying an upgrade (used by Chainsaw Unicorn / Targeted Destruction). With `count`, targets are chosen and destroyed one at a time |

**Sacrificing:**
| Key | Parameters | Description |
|-----|-----------|-------------|
| `sacrifice` | `type: "unicorn" \| "downgrade" \| "this" \| "any"` | Remove your own card from your stable to discard. Triggers `this_destroyed_or_sacrificed` on the sacrificed card |

**Reviving:**
| Key | Parameters | Description |
|-----|-----------|-------------|
| `revive` | `type: "unicorn" \| "basic_unicorn"` | Bring a unicorn from the discard pile into your stable |
| `reviveFromNursery` | — | Bring a Baby Unicorn from the nursery into your stable |
| `addFromDiscardPileToHand` | `type: "magic" \| "unicorn" \| "neigh"` | Take a card of the given type from discard pile into your hand. `"neigh"` matches type `neigh` only (not Super Neigh) |
| `returnSelf` | — | Bungee Jumping Unicorn only: move the source card from the discard pile back to its owner's hand |

**Moving / Returning:**
| Key | Parameters | Description |
|-----|-----------|-------------|
| `returnToHand` | `who: "another"` | Return a card in another player's stable to their hand |
| `bringToStable` | `type: "basic_unicorn"` | Play a Basic Unicorn from your hand into your stable |
| `move` | `type: "upgradeAndDowngrade"` | Step 1 of a move: take an Upgrade/Downgrade out of a stable and remember it in `G.clipboard.move` (Pillaging Pirate Unicorn) |
| `move2` | — | Step 2: choose the destination player (not the previous owner, not yourself); the remembered card enters that stable. Only satisfiable while `G.clipboard.move` is set |
| `backKick` | — | Return a card from another player's stable to their hand, then that player discards a card |

**Swapping / Shuffling:**
| Key | Parameters | Description |
|-----|-----------|-------------|
| `swapHands` | — | Swap your entire hand with another player |
| `shakeUp` | — | Shuffle your hand, this card, and discard pile into the deck, then draw 5 |
| `reset` | — | All players sacrifice all Upgrades and Downgrades. Shuffle discard into deck |
| `shuffleDiscardPileIntoDrawPile` | — | Shuffle the discard pile into the draw pile |
| `unicornSwap1` / `unicornSwap2` | — | Two-step unicorn swap between players |
| `blatantThievery1` | — | Steal operation variant |

---

## Trigger Types

Cards can have `on` triggers that fire at specific moments:

| Trigger | When It Fires | Typical Use |
|---------|--------------|-------------|
| `enter` | When the card enters a player's stable (after Neigh voting resolves) | Most unicorn abilities, upgrade/downgrade effects |
| `begin_of_turn` | At the start of the card owner's turn | Recurring upgrade abilities (Stable Artillery, Claw Machine, etc.) |
| `this_destroyed_or_sacrificed` | When this specific card is destroyed or sacrificed | "Flying Unicorn" return-to-hand effects, revenge triggers |
| `unicorn_enters_your_stable` | When any unicorn enters the card owner's stable | Barbed Wire (discard on enter) |
| `unicorn_leaves_your_stable` | When any unicorn leaves the card owner's stable | Barbed Wire (discard on leave) |

### Trigger Do Types

Each trigger's `do` field specifies what happens:

| Do Type | Description |
|---------|-------------|
| `add_scene` | Creates a new Scene in the script queue with actions/instructions |
| `add_effect` | Adds a persistent effect to the player |
| `remove_effect` | Removes a persistent effect from the player |
| `auto` | Executes immediately without player interaction (e.g., `sacrifice_all_downgrades`) |
| `return_to_hand` | Returns the card to the owner's hand instead of discarding it |
| `inject_action` | Injects an action into the current scene (used by reactive triggers like Barbed Wire) |

---

## Script / Scene / Action / Instruction Model

This is the queue-based effect resolution system. Understanding it is essential for working on game logic.

```
G.script: Script
  └── scenes: Scene[]          ← queue of scenes, processed in order
        └── Scene
              ├── id: string
              ├── mandatory: boolean       ← must resolve before turn advances
              ├── endTurnImmediately: boolean  ← skip remaining phases after this
              └── actions: Action[]        ← sequential steps within the scene
                    └── Action
                          └── instructions: Instruction[]  ← for one or more players
                                └── Instruction
                                      ├── id: string
                                      ├── protagonist: PlayerID
                                      ├── state: "open" | "in_progress" | "executed"
                                      ├── do: Do           ← the operation
                                      └── ui: CardUI       ← how the player interacts
```

### Resolution Rules

1. **Scenes** are processed in order. A scene's first action must be resolved before proceeding to the second action.
2. **Actions within a scene** are sequential — action 1 must complete before action 2 begins. This is how cost-then-effect works.
3. **Instructions within an action**: If multiple instructions in the same action have the same protagonist, the protagonist must choose **exactly one** to execute (this creates a choice, e.g., Chainsaw Unicorn: destroy upgrade OR sacrifice downgrade).
4. If `protagonist` is `"all"`, an instruction is created for every player.
5. **Mandatory scenes** (`mandatory: true`) block the turn from advancing. The player must resolve them.
6. **Optional scenes** (`mandatory: false`) can be skipped. The player declines via `skipExecuteDo`, which marks **all** remaining steps of that scene as executed for that player, or opts in via `commit`, which makes the scene mandatory.
7. **`endTurnImmediately: true`**: If the player commits to this scene, their turn ends after resolving it. They don't get to draw or play cards.
8. Instructions transition: `"open"` → `"in_progress"` (when `executeDo` is called) → `"executed"` (when the operation completes).
9. For multi-count operations like `discard {count: 2}`, the count decrements with each execution. The instruction stays `"in_progress"` until count reaches 1 on the final execution.

### Automatic fizzling

`autoFizzleUnsatisfiable` (`operations/canSatisfy.ts`) runs at the start of a turn, after every `enter`, after a unicorn leaves a stable, and after every `executeDo`. It marks instructions as executed when they cannot be carried out:

- **Mandatory scene**: per player, as soon as their instruction in the current action has no legal target.
- **Optional scene**: per player, only when *all* of their alternatives in the current action are impossible.

`canSatisfyDo` decides this per operation (at least one target for discard / destroy / sacrifice / steal / revive / search / …; `draw`, `swapHands`, `pullRandom` and similar always count as possible). If the last action of a Magic card's scene fizzles, the card is moved from the temporary stable to the discard pile.

### Action Injection

Reactive triggers (`unicorn_enters_your_stable`, `unicorn_leaves_your_stable`) use `inject_action` to insert new actions into the current scene. If an instruction is in progress, the new action is injected *before* it. If no instruction is in progress, a new mandatory scene is created.

### Magic Card Lifecycle

When a Magic card is played and enters the stable:
1. It goes into `temporaryStable[playerID]` (not the normal stable or upgrade/downgrade stable).
2. Its `enter` trigger fires, creating scenes.
3. After the last action of its scene resolves, the card moves from `temporaryStable` to the `discardPile`.
4. Exception: Shake Up — the card is NOT placed in the discard pile (it was shuffled into the deck).

### Finding Open Scenes

`_findOpenScenesWithProtagonist(G, playerID)` scans scenes to find the next unresolved instruction for a player. It walks each scene's actions in order and returns the first action that has open/in-progress instructions for that player.

`_findInProgressScenesWithProtagonist(G, playerID)` finds scenes where the player has already started (action 1 is complete, action 2 is open) — these are scenes where the cost has been paid and the effect is pending.
