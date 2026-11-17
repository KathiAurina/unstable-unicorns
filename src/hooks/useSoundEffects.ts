import { useEffect } from 'react';
import useSound from 'use-sound';
import type { GameState } from '../game/engine';
import type { Verb } from '../game/cards/types';

const YourTurnSound = require('../assets/sound/ALERT_YourTurn_0v2.ogg');
const DrawCardSound = require('../assets/sound/draw_card_and_add_to_hand_1.ogg');
const NeighSuccessSound = require('../assets/sound/tavern_crowd_play_reaction_very_positive_5.ogg');
const NeighFailureSound = require('../assets/sound/tavern_crowd_play_reaction_quite_positive_2.ogg');
const EndTurnButtonSound = require('../assets/sound/bar_button_A_press.ogg');
const HubMouseOverSound = require('../assets/sound/Hub_Mouseover.ogg');
const FriendlyChallengeSound = require('../assets/sound/friendly_challenge.ogg');
const DestroyedSound = require('../assets/sound/Arrow_Targeted_Explode_01.ogg');
const DiscardSound = require('../assets/sound/play_card_from_hand_1.ogg');
const SacrificeSound = require('../assets/sound/FeignDeath_trigger_1.ogg');
const StealSound = require('../assets/sound/stealth_on.ogg');

export function useSoundEffects(G: GameState, playerID: string): {
    playDrawCardSound: () => void;
    playEndTurnButtonSound: () => void;
    playHubMouseOverSound: () => void;
    /** The sound for answering a prompt with this verb (steal, destroy, sacrifice, discard). */
    playVerbSound: (verb: Verb | undefined) => void;
} {
    const [playYourTurnAlert] = useSound(YourTurnSound, {
        volume: 0.3,
    });

    const [playDrawCardSound] = useSound(DrawCardSound, {
        volume: 0.3,
    });

    const [playNeighSuccessSound] = useSound(NeighSuccessSound, {
        volume: 0.2,
    });

    const [playNeighFailureSound] = useSound(NeighFailureSound, {
        volume: 0.2,
    });

    const [playEndTurnButtonSound] = useSound(EndTurnButtonSound, {
        volume: 0.2,
    });

    const [playHubMouseOverSound] = useSound(HubMouseOverSound, {
        volume: 0.2,
    });

    const [playFriendlyChallengeSound] = useSound(FriendlyChallengeSound, {
        volume: 0.2,
    });

    const [playDestroyedSound] = useSound(DestroyedSound, {
        volume: 0.2,
    });

    const [playDiscardSound] = useSound(DiscardSound, {
        volume: 0.2,
    });

    const [playSacrificeSound] = useSound(SacrificeSound, {
        volume: 0.2,
    });

    const [playStealSound] = useSound(StealSound, {
        volume: 0.2,
    });

    // A new turn of this player (an extra turn counts).
    const turnNumber = G.turn.number;
    const myTurn = turnNumber > 0 && G.turn.player === playerID;
    useEffect(() => {
        if (myTurn) playYourTurnAlert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myTurn, turnNumber]);

    // A played card resolved or was stopped.
    const lastPlay = G.lastPlay;
    useEffect(() => {
        if (!lastPlay) return;
        if (lastPlay.result === 'played') playNeighSuccessSound();
        else playNeighFailureSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastPlay?.id]);

    // A response round opened (a card was played, or answered with an Instant).
    const roundId = G.round?.id;
    useEffect(() => {
        if (roundId !== undefined) playFriendlyChallengeSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roundId]);

    const playVerbSound = (verb: Verb | undefined) => {
        if (verb === 'steal') playStealSound();
        else if (verb === 'destroy') playDestroyedSound();
        else if (verb === 'sacrifice') playSacrificeSound();
        else if (verb === 'discard') playDiscardSound();
    };

    return {
        playDrawCardSound,
        playEndTurnButtonSound,
        playHubMouseOverSound,
        playVerbSound,
    };
}
