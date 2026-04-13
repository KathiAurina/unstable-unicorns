import { CardInteraction } from '../BoardUtil';
import type { SearchTarget } from '../game/operations';
import type { UnstableUnicornsGame } from '../game/state';
import { _findInstruction } from '../game/state';
import { CardID } from '../game/card';
import type { Moves } from '../game/types';
import Finder from '../ui/Finder';
import RainbowArrow from '../ui/RainbowArrow';
import { BoardState } from '../BoardStateManager';

type Props = {
    G: UnstableUnicornsGame;
    boardStates: BoardState[];
    moves: Moves;
    playerID: string;
    cardInteraction: CardInteraction | undefined;
    setCardInteraction: (ci: CardInteraction | undefined) => void;
    showDeckFinder: SearchTarget[] | undefined;
    setShowDeckFinder: (x: SearchTarget[] | undefined) => void;
    showDiscardFinder: { cardID: CardID }[] | undefined;
    setShowDiscardFinder: (x: { cardID: CardID }[] | undefined) => void;
    showNurseryFinder: boolean;
    setShowNurseryFinder: (x: boolean) => void;
    showPlayerHand: string | undefined;
    setShowPlayerHand: (x: string | undefined) => void;
    showBlatantThievery: string | undefined;
    setShowBlatantThievery: (x: string | undefined) => void;
    C2CArrow: { fromX: number; fromY: number; toX: number; toY: number } | undefined;
}

const OverlayManager = ({
    G,
    boardStates,
    moves,
    playerID,
    cardInteraction,
    setCardInteraction,
    showDeckFinder,
    setShowDeckFinder,
    showDiscardFinder,
    setShowDiscardFinder,
    showNurseryFinder,
    setShowNurseryFinder,
    showPlayerHand,
    setShowPlayerHand,
    showBlatantThievery,
    setShowBlatantThievery,
    C2CArrow,
}: Props) => {
    return (
        <>
            {showDeckFinder &&
                <Finder
                    cards={showDeckFinder.map(s => G.deck[s.cardID])}
                    showBackButton={false}
                    onBackClick={() => 0}
                    onCardClick={cardID => {
                        const boardState = boardStates.find(o => o.type === "search__single_action_popup")!;
                        const { instruction } = _findInstruction(G, boardState.info!.instructionID)!;
                        moves.executeDo(instruction.id, {
                            protagonist: playerID,
                            cardID
                        });
                        setShowDeckFinder(undefined);
                        setCardInteraction(undefined);
                    }} />
            }
            {showDiscardFinder &&
                <Finder
                    cards={showDiscardFinder.map(c => G.deck[c.cardID])}
                    onBackClick={() => setShowDiscardFinder(undefined)}
                    onCardClick={cardID => {
                        let state = boardStates.find(s => s.type === "revive" || s.type === "addFromDiscardPileToHand__single_action_popup");
                        if (state) {
                            moves.executeDo(state.info?.instructionID, {
                                protagonist: playerID, cardID
                            });

                            setShowDiscardFinder(undefined);
                        }
                    }} />
            }
            {showNurseryFinder &&
                <Finder cards={G.nursery.map(c => G.deck[c])} onBackClick={() => setShowNurseryFinder(false)} onCardClick={cardID => {
                    let state = boardStates.find(s => s.type === "reviveFromNursery");
                    if (state) {
                        moves.executeDo(state.info?.instructionID, {
                            protagonist: playerID, cardID
                        });

                        setShowNurseryFinder(false);
                    }
                }} />
            }
            {showPlayerHand !== undefined &&
                <Finder cards={G.hand[showPlayerHand].map(c => G.deck[c])} onBackClick={() => setShowPlayerHand(undefined)} showBackButton={true} onCardClick={cardID => {

                }} hide={G.playerEffects[showPlayerHand].find(o => o.effect.key === "your_hand_is_visible") === undefined} />
            }
            {showBlatantThievery !== undefined &&
                <Finder cards={G.hand[showBlatantThievery].map(c => G.deck[c])} onBackClick={() => undefined} showBackButton={false} onCardClick={cardID => {
                    const handIndex = G.hand[showBlatantThievery].findIndex(s => s === cardID);
                    moves.executeDo(cardInteraction?.info.instructionID, { protagonist: playerID, handIndex, from: showBlatantThievery });
                    setShowBlatantThievery(undefined);
                    setCardInteraction(undefined);
                }}
                    title="Click on card to add it to your hand." />
            }
            {(cardInteraction?.key === "card_to_card" || cardInteraction?.key === "card_to_player" || cardInteraction?.key === "play_upgradeDowngradeCardFromHand__choose_target") &&
                <RainbowArrow from={{ x: cardInteraction.info.startingMousePosition.x, y: cardInteraction.info.startingMousePosition.y }} to={{ x: cardInteraction.info.currentMousePosition.x, y: cardInteraction.info.currentMousePosition.y }} />
            }
            {C2CArrow !== undefined &&
                <RainbowArrow from={{ x: C2CArrow!.fromX, y: C2CArrow!.fromY }} to={{ x: C2CArrow!.toX, y: C2CArrow!.toY }} />
            }
        </>
    );
}

export default OverlayManager;
