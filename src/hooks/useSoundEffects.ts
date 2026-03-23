import { useEffect } from 'react';
import useSound from 'use-sound';
import { UnstableUnicornsGame, Ctx } from '../game/game';

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

export function useSoundEffects(G: UnstableUnicornsGame, ctx: Ctx, playerID: string): {
    playDrawCardSound: () => void;
    playEndTurnButtonSound: () => void;
    playHubMouseOverSound: () => void;
    playExecuteDoSound: (boardStateType: string | undefined) => void;
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

    useEffect(() => {
        if (ctx.currentPlayer === playerID) {
            playYourTurnAlert();
        }
    }, [ctx.currentPlayer]);

    useEffect(() => {
        if (G.lastNeighResult) {
            if (G.lastNeighResult.result === "cardWasPlayed") {
                playNeighSuccessSound();
            } else {
                playNeighFailureSound();
            }
        }
    }, [G.lastNeighResult?.id]);

    useEffect(() => {
        if (G.neighDiscussion?.rounds.length !== undefined && G.neighDiscussion?.rounds.length > 0) {
            playFriendlyChallengeSound();
        }
    }, [G.neighDiscussion?.rounds.length])

    const playExecuteDoSound = (boardStateType: string | undefined) => {
        if (!boardStateType) return;
        if (boardStateType.startsWith("steal")) playStealSound();
        else if (boardStateType.startsWith("destroy")) playDestroyedSound();
        else if (boardStateType.startsWith("sacrifice")) playSacrificeSound();
        else if (boardStateType.startsWith("discard")) playDiscardSound();
    };

    return {
        playDrawCardSound,
        playEndTurnButtonSound,
        playHubMouseOverSound,
        playExecuteDoSound,
    };
}
