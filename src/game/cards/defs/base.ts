// Card definitions that are currently part of the base set.
// One definition per card design; counts live in sets/.
// Newest English wording is the reference (see agent_docs/expansion-plan.md, Appendix A.1).

import type { CardDef } from '../types';
import {
    card, spell, onEnter, onBeginOfTurn, wheneverUnicornEnters, wheneverUnicornLeaves, stateCheck, rule, flyer, neigh,
    all, then, ifYouDo, may, oneOf, forEach, EACH, CHOSEN_OTHER, ref,
    draw, discard, sacrifice, destroy, steal, returnToHand, bring, addToHand, search, pull, tradeHands,
    shuffleIntoDeck, extraTurn, endTurn,
    UNICORN, BASIC, BABY, UPGRADE, DOWNGRADE, UPGRADE_OR_DOWNGRADE, MAGIC, NEIGH_CARD, nameIncludes,
} from '../dsl';

const babies: CardDef[] = [
    ...Array.from({ length: 12 }, (_, i) => card(`baby_unicorn_${i}`, 'Baby Unicorn', 'baby', `baby${i}`)),
    card('baby_narwhal', 'Baby Narwhal', 'baby', 'baby12'),
];

const basics: CardDef[] = [
    ...Array.from({ length: 7 }, (_, i) => card(`basic_unicorn_${i}`, 'Basic Unicorn', 'basic', `basic${i}`)),
    card('narwhal', 'Narwhal', 'basic', 'basic7'),
];

const magicalUnicorns: CardDef[] = [
    card('alluring_narwhal', 'Alluring Narwhal', 'magical', 'alluring_narwhal',
        onEnter(may(steal(1, UPGRADE)))),

    card('americorn', 'Americorn', 'magical', 'americorn',
        onEnter(may(pull()))),

    card('annoying_flying_unicorn', 'Annoying Flying Unicorn', 'magical', 'annoying_flying_unicorn',
        onEnter(may(forEach(CHOSEN_OTHER, discard(1)))),
        flyer()),

    card('chainsaw_unicorn', 'Chainsaw Unicorn', 'magical', 'chainsaw_unicorn',
        onEnter(may(oneOf(destroy(1, UPGRADE), sacrifice(1, DOWNGRADE))))),

    card('classy_narwhal', 'Classy Narwhal', 'magical', 'classy_narwhal',
        onEnter(may(search(UPGRADE)))),

    card('dark_angel_unicorn', 'Dark Angel Unicorn', 'magical', 'dark_angel_unicorn',
        onEnter(may(then(sacrifice(1, UNICORN), bring({ from: 'discard', filter: UNICORN }))))),

    card('ginormous_unicorn', 'Ginormous Unicorn', 'magical', 'ginormous_unicorn',
        rule({ kind: 'countsAs', n: 2 }),
        rule({ kind: 'cannotPlay', filter: NEIGH_CARD })),

    card('greedy_flying_unicorn', 'Greedy Flying Unicorn', 'magical', 'greedy_flying_unicorn',
        onEnter(draw(1)),
        flyer()),

    card('llamacorn', 'Llamacorn', 'magical', 'llamacorn',
        onEnter(forEach(EACH, discard(1)))),

    card('magical_flying_unicorn', 'Magical Flying Unicorn', 'magical', 'magical_flying_unicorn',
        onEnter(may(addToHand(MAGIC))),
        flyer()),

    card('magical_kittencorn', 'Magical Kittencorn', 'magical', 'magical_kittencorn',
        rule({ kind: 'protect', cards: 'self', verbs: ['destroy'], bySourceType: ['magic'] })),

    card('majestic_flying_unicorn', 'Majestic Flying Unicorn', 'magical', 'majestic_flying_unicorn',
        onEnter(may(addToHand(UNICORN))),
        flyer()),

    card('mother_goose_unicorn', 'Mother Goose Unicorn', 'magical', 'mother_goose_unicorn',
        onEnter(may(bring({ from: 'nursery', filter: BABY })))),

    // 2nd Edition: mandatory (rules.md R6).
    card('mermaid_unicorn', 'Mermaid Unicorn', 'magical', 'mermaid_unicorn',
        onEnter(returnToHand(1))),
    // Legacy variant: optional.
    card('mermaid_unicorn@legacy', 'Mermaid Unicorn', 'magical', 'mermaid_unicorn',
        onEnter(may(returnToHand(1)))),

    card('narwhal_torpedo', 'Narwhal Torpedo', 'magical', 'narwhal_torpedo',
        onEnter(sacrifice('all', DOWNGRADE))),

    card('necromancer_unicorn', 'Necromancer Unicorn', 'magical', 'necromancer_unicorn',
        onEnter(may(then(discard(2, UNICORN), bring({ from: 'discard', filter: UNICORN }))))),

    card('queen_bee_unicorn', 'Queen Bee Unicorn', 'magical', 'queen_bee_unicorn',
        rule({ kind: 'cannotEnter', filter: BASIC, stables: 'othersThanYours' })),

    card('rainbow_unicorn', 'Rainbow Unicorn', 'magical', 'rainbow_unicorn',
        onEnter(may(bring({ from: 'hand', filter: BASIC })))),

    card('rhinocorn', 'Rhinocorn', 'magical', 'rhinocorn',
        onBeginOfTurn(ifYouDo(destroy(1, UNICORN), endTurn()))),

    card('seductive_unicorn', 'Seductive Unicorn', 'magical', 'seductive_unicorn',
        onEnter(may(then(discard(1), steal(1, UNICORN))))),

    card('shabby_the_narwhal', 'Shabby the Narwhal', 'magical', 'shabby_the_narwhal',
        onEnter(may(search(DOWNGRADE)))),

    card('swift_flying_unicorn', 'Swift Flying Unicorn', 'magical', 'swift_flying_unicorn',
        onEnter(may(addToHand(NEIGH_CARD))),
        flyer()),

    card('the_great_narwhal', 'The Great Narwhal', 'magical', 'the_great_narwhal',
        onEnter(may(search(nameIncludes('Narwhal'))))),

    card('unicorn_on_the_cob', 'Unicorn on the Cob', 'magical', 'unicorn_on_the_cob',
        onEnter(all(draw(2), discard(1)))),

    // 2nd Edition: discard a Unicorn card (rules.md R17). Belongs to Rainbow Apocalypse; still listed in the base set today.
    card('zombie_unicorn', 'Zombie Unicorn', 'magical', 'zombie',
        onBeginOfTurn(ifYouDo(discard(1, UNICORN), all(bring({ from: 'discard', filter: UNICORN }), endTurn())))),
    // Legacy variant: discard any card.
    card('zombie_unicorn@legacy', 'Zombie Unicorn', 'magical', 'zombie',
        onBeginOfTurn(ifYouDo(discard(1), all(bring({ from: 'discard', filter: UNICORN }), endTurn())))),
];

const instants: CardDef[] = [
    card('neigh', 'Neigh', 'instant', 'neigh',
        neigh()),

    card('super_neigh', 'Super Neigh', 'instant', 'super_neigh',
        neigh(),
        rule({ kind: 'cannotBeNeighed' })),
];

const upgrades: CardDef[] = [
    card('yay', 'Yay', 'upgrade', 'yay',
        rule({ kind: 'yourPlaysCannotBeNeighed' })),

    card('stable_artillery', 'Stable Artillery', 'upgrade', 'stable_artillery',
        onBeginOfTurn(may(then(discard(2), destroy(1, UNICORN))))),

    card('rainbow_lasso', 'Rainbow Lasso', 'upgrade', 'rainbow_lasso',
        onBeginOfTurn(may(then(discard(3), steal(1, UNICORN))))),

    card('rainbow_aura', 'Rainbow Aura', 'upgrade', 'rainbow_aura',
        rule({ kind: 'protect', cards: 'yourUnicorns', verbs: ['destroy'] })),

    card('glitter_bomb', 'Glitter Bomb', 'upgrade', 'glitter_bomb',
        onBeginOfTurn(may(then(sacrifice(1), destroy(1))))),

    card('double_dutch', 'Double Dutch', 'upgrade', 'double_dutch',
        rule({ kind: 'extraPlays', n: 1, ifInStableAtTurnStart: true })),

    card('claw_machine', 'Claw Machine', 'upgrade', 'claw_machine',
        onBeginOfTurn(may(then(discard(1), draw(1))))),

    card('caffeine_overload', 'Caffeine Overload', 'upgrade', 'caffeine_overload',
        onBeginOfTurn(may(then(sacrifice(1), draw(2))))),
];

const downgrades: CardDef[] = [
    card('barbed_wire', 'Barbed Wire', 'downgrade', 'barbed_wire',
        wheneverUnicornEnters(discard(1)),
        wheneverUnicornLeaves(discard(1))),

    card('blinding_light', 'Blinding Light', 'downgrade', 'blinding_light',
        rule({ kind: 'blind' })),

    card('broken_stable', 'Broken Stable', 'downgrade', 'broken_stable',
        rule({ kind: 'cannotPlay', filter: UPGRADE })),

    card('pandamonium', 'Pandamonium', 'downgrade', 'pandamonium',
        rule({ kind: 'masquerade' })),

    card('slowdown', 'Slowdown', 'downgrade', 'slowdown',
        rule({ kind: 'cannotPlay', filter: NEIGH_CARD })),

    card('tiny_stable', 'Tiny Stable', 'downgrade', 'tiny_stable',
        stateCheck({ kind: 'unicornCountAbove', n: 5 }, sacrifice(1, UNICORN))),
];

const magic: CardDef[] = [
    card('unicorn_poison', 'Unicorn Poison', 'magic', 'unicorn_poison',
        spell(destroy(1, UNICORN))),

    // Belongs to Unicorns of Legend; still listed in the base set today.
    card('alignment_change', 'Alignment Change', 'magic', 'alignment_change',
        spell(then(discard(2), steal(1, UNICORN)))),

    card('unfair_bargain', 'Unfair Bargain', 'magic', 'unfair_bargain',
        spell(tradeHands())),

    card('two_for_one', 'Two-For-One', 'magic', 'two-for-one',
        spell(then(sacrifice(1), destroy(2)))),

    card('targeted_destruction', 'Targeted Destruction', 'magic', 'targeted_destruction',
        spell(oneOf(destroy(1, UPGRADE), sacrifice(1, DOWNGRADE)))),

    card('shake_up', 'Shake Up', 'magic', 'shake_up',
        spell(all(shuffleIntoDeck('self', 'hand', 'discard'), draw(5)))),

    card('reset_button', 'Reset Button', 'magic', 'reset_button',
        spell(all(forEach(EACH, sacrifice('all', UPGRADE_OR_DOWNGRADE)), shuffleIntoDeck('discard')))),

    card('mystical_vortex', 'Mystical Vortex', 'magic', 'mystical_vortex',
        spell(all(forEach(EACH, discard(1)), shuffleIntoDeck('discard')))),

    card('kiss_of_life', 'Kiss of Life', 'magic', 'kiss_of_life',
        spell(bring({ from: 'discard', filter: UNICORN }))),

    card('good_deal', 'Good Deal', 'magic', 'good_deal',
        spell(all(draw(3), discard(1)))),

    card('change_of_luck', 'Change of Luck', 'magic', 'change_of_luck',
        spell(then(all(draw(2), discard(3)), extraTurn()))),

    card('back_kick', 'Back Kick', 'magic', 'back_kick',
        spell(all(returnToHand(1, { bind: 'returned' }), forEach(ref('returned'), discard(1))))),
];

export const baseDefs: CardDef[] = [
    ...babies, ...basics, ...magicalUnicorns, ...instants, ...upgrades, ...downgrades, ...magic,
];
