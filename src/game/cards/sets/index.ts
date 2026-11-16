// Set inventories: which definitions a product contains, and how many copies.
//
// Deck composition is unchanged from before the registry existed (expansion-plan.md, stage 2):
// the base set still has 3 Narwhals and still contains Zombie Unicorn and Alignment Change, and the
// Adventures basics are still x1. The inventories are corrected in stage 4.

import type { CardSet } from '../types';

export const base2e: CardSet = {
    id: 'base_2e',
    label: 'Base Game',
    kind: 'base',
    nursery: [
        'baby_unicorn_0', 'baby_unicorn_1', 'baby_unicorn_2', 'baby_unicorn_3', 'baby_unicorn_4', 'baby_unicorn_5',
        'baby_unicorn_6', 'baby_unicorn_7', 'baby_unicorn_8', 'baby_unicorn_9', 'baby_unicorn_10', 'baby_unicorn_11',
        'baby_narwhal',
    ],
    cards: [
        // Magical Unicorns
        { def: 'alluring_narwhal', count: 1 },
        { def: 'americorn', count: 1 },
        { def: 'annoying_flying_unicorn', count: 1 },
        { def: 'chainsaw_unicorn', count: 1 },
        { def: 'classy_narwhal', count: 1 },
        { def: 'dark_angel_unicorn', count: 1 },
        { def: 'ginormous_unicorn', count: 1 },
        { def: 'greedy_flying_unicorn', count: 1 },
        { def: 'llamacorn', count: 1 },
        { def: 'magical_flying_unicorn', count: 1 },
        { def: 'magical_kittencorn', count: 1 },
        { def: 'majestic_flying_unicorn', count: 1 },
        { def: 'mother_goose_unicorn', count: 1 },
        { def: 'mermaid_unicorn', count: 1 },
        { def: 'narwhal_torpedo', count: 1 },
        { def: 'necromancer_unicorn', count: 1 },
        { def: 'queen_bee_unicorn', count: 1 },
        { def: 'rainbow_unicorn', count: 1 },
        { def: 'rhinocorn', count: 1 },
        { def: 'seductive_unicorn', count: 1 },
        { def: 'shabby_the_narwhal', count: 1 },
        { def: 'zombie_unicorn', count: 1 },
        { def: 'swift_flying_unicorn', count: 1 },
        { def: 'the_great_narwhal', count: 1 },
        { def: 'unicorn_on_the_cob', count: 1 },
        // Instants
        { def: 'neigh', count: 14 },
        { def: 'super_neigh', count: 1 },
        // Upgrades
        { def: 'yay', count: 2 },
        { def: 'stable_artillery', count: 3 },
        { def: 'rainbow_lasso', count: 1 },
        { def: 'rainbow_aura', count: 1 },
        { def: 'glitter_bomb', count: 2 },
        { def: 'double_dutch', count: 1 },
        { def: 'claw_machine', count: 3 },
        { def: 'caffeine_overload', count: 1 },
        // Downgrades
        { def: 'barbed_wire', count: 1 },
        { def: 'blinding_light', count: 1 },
        { def: 'broken_stable', count: 1 },
        { def: 'pandamonium', count: 1 },
        { def: 'slowdown', count: 1 },
        { def: 'tiny_stable', count: 1 },
        // Magic
        { def: 'unicorn_poison', count: 3 },
        { def: 'alignment_change', count: 2 },
        { def: 'unfair_bargain', count: 2 },
        { def: 'two_for_one', count: 2 },
        { def: 'targeted_destruction', count: 1 },
        { def: 'shake_up', count: 1 },
        { def: 'reset_button', count: 1 },
        { def: 'mystical_vortex', count: 1 },
        { def: 'kiss_of_life', count: 1 },
        { def: 'good_deal', count: 1 },
        { def: 'change_of_luck', count: 2 },
        { def: 'back_kick', count: 3 },
        // Basic Unicorns
        { def: 'basic_unicorn_0', count: 3 },
        { def: 'basic_unicorn_1', count: 3 },
        { def: 'basic_unicorn_2', count: 3 },
        { def: 'basic_unicorn_3', count: 3 },
        { def: 'basic_unicorn_4', count: 3 },
        { def: 'basic_unicorn_5', count: 3 },
        { def: 'basic_unicorn_6', count: 3 },
        { def: 'narwhal', count: 3 },
    ],
};

export const adventures2e: CardSet = {
    id: 'adventures_2e',
    label: 'Adventures (2nd Edition)',
    kind: 'expansion',
    nursery: ['baby_unicorn_fisherman', 'baby_unicorn_forest', 'baby_unicorn_pirate', 'baby_unicorn_safari'],
    cards: [
        { def: 'eager_adventurer_unicorn', count: 1 },
        { def: 'glamping_unicorn', count: 1 },
        { def: 'indoor_rockclimbing_unicorn', count: 1 },
        { def: 'landlubber_unicorn', count: 1 },
        { def: 'vagabond_unicorn', count: 1 },
        { def: 'survivalist_unicorn', count: 1 },
        { def: 'bungee_jumping_unicorn', count: 1 },
        { def: 'cutthroat_captain_unicorn', count: 1 },
        { def: 'extreme_adventurer_unicorn', count: 1 },
        { def: 'fearless_unicorn', count: 1 },
        { def: 'first_mer_mate_unicorn', count: 1 },
        { def: 'fisherman_unicorn', count: 1 },
        { def: 'hornswoggler_unicorn', count: 1 },
        { def: 'pillaging_pirate_unicorn', count: 1 },
        { def: 'salty_seadogicorn', count: 1 },
        { def: 'stowaway_unicorn', count: 1 },
    ],
};

export const ALL_SETS: CardSet[] = [base2e, adventures2e];
