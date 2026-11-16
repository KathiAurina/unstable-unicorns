// Adventures Expansion (2nd Edition) — the designs that exist so far: babies, basics and the 12 Magical Unicorns.
// The Magic, Instant, Upgrade and Downgrade cards follow in a later stage (expansion-plan.md, Appendix A.2).

import type { CardDef } from '../types';
import {
    card, onEnter, onBeginOfTurn, onSacrificedOrDestroyed, rule,
    all, then, may, oneOf, forEach, when, EACH_OTHER, ref, cardMatches,
    draw, discard, sacrifice, steal, move, bring, addToHand, addSelfToHand, pull, lookAndTake, tradeHands,
    BASIC, BABY, UPGRADE, DOWNGRADE, INSTANT, STABLE_CARD,
} from '../dsl';

export const adventuresDefs: CardDef[] = [
    card('baby_unicorn_fisherman', 'Baby Unicorn', 'baby', 'baby_fisherman'),
    card('baby_unicorn_forest', 'Baby Unicorn', 'baby', 'baby_forest'),
    card('baby_unicorn_pirate', 'Baby Unicorn', 'baby', 'baby_pirate'),
    card('baby_unicorn_safari', 'Baby Unicorn', 'baby', 'baby_safari'),

    card('eager_adventurer_unicorn', 'Eager Adventurer Unicorn', 'basic', 'eager_adventurer_unicorn'),
    card('glamping_unicorn', 'Glamping Unicorn', 'basic', 'glamping_unicorn'),
    card('indoor_rockclimbing_unicorn', 'Indoor Rockclimbing Unicorn', 'basic', 'indoor_rockclimbing_unicorn'),
    card('landlubber_unicorn', 'Landlubber Unicorn', 'basic', 'landlubber_unicorn'),

    card('vagabond_unicorn', 'Vagabond Unicorn', 'magical', 'vagabond_unicorn',
        onBeginOfTurn(may(then(discard(1), pull())))),

    card('survivalist_unicorn', 'Survivalist Unicorn', 'magical', 'survivalist_unicorn',
        onBeginOfTurn(may(then(discard(1), sacrifice(1, DOWNGRADE))))),

    // The card is already in the discard pile when the choice is made.
    card('bungee_jumping_unicorn', 'Bungee Jumping Unicorn', 'magical', 'bungee_jumping_unicorn',
        onSacrificedOrDestroyed(may(oneOf(sacrifice(1, DOWNGRADE), addSelfToHand())))),

    card('cutthroat_captain_unicorn', 'Cutthroat Captain Unicorn', 'magical', 'cutthroat_captain_unicorn',
        onEnter(may(oneOf(steal(1, BABY), bring({ from: 'discard', filter: BASIC }))))),

    card('extreme_adventurer_unicorn', 'Extreme Adventurer Unicorn', 'magical', 'extreme_adventurer_unicorn',
        rule({ kind: 'cannotEnter', filter: BASIC, stables: 'yours' }),
        onBeginOfTurn(may(draw(1)))),

    card('fearless_unicorn', 'Fearless Unicorn', 'magical', 'fearless_unicorn',
        onSacrificedOrDestroyed(may(addToHand(INSTANT)))),

    card('first_mer_mate_unicorn', 'First Mer-Mate Unicorn', 'magical', 'first_mer_mate_unicorn',
        onSacrificedOrDestroyed(may(oneOf(draw(2), bring({ from: 'hand', filter: BASIC }))))),

    card('fisherman_unicorn', 'Fisherman Unicorn', 'magical', 'fisherman_unicorn',
        onEnter(may(lookAndTake()))),

    card('hornswoggler_unicorn', 'Hornswoggler Unicorn', 'magical', 'hornswoggler_unicorn',
        onEnter(may(oneOf(then(discard('all'), draw(3)), tradeHands())))),

    card('pillaging_pirate_unicorn', 'Pillaging Pirate Unicorn', 'magical', 'pillaging_pirate_unicorn',
        onEnter(may(oneOf(steal(1, UPGRADE), move({ from: 'yours', filter: DOWNGRADE }))))),

    card('salty_seadogicorn', 'Salty Seadogicorn', 'magical', 'salty_seadogicorn',
        onEnter(may(oneOf(forEach(EACH_OTHER, discard(1)), draw(1))))),

    card('stowaway_unicorn', 'Stowaway Unicorn', 'magical', 'stowaway_unicorn',
        onEnter(may(all(
            draw(1, { reveal: true, bind: 'drawn' }),
            when(cardMatches('drawn', STABLE_CARD), bring({ from: 'hand', cards: ref('drawn') })),
        )))),
];
