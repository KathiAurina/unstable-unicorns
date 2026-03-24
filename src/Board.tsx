import styled from 'styled-components';
import _ from 'underscore';
import HiddenHand from './ui/HiddenHand';
import Stable, { StableHandle } from './ui/Stable';
import PlayerField, { PlayerFieldHandle } from './ui/PlayerField';
import { motion, AnimateSharedLayout, AnimatePresence } from "framer-motion";
// game
import { UnstableUnicornsGame, Ctx, _findInProgressScenesWithProtagonist, _findOpenScenesWithProtagonist, Instruction, Scene } from './game/game';
// assets
import BG from './assets/ui/board-background.jpg';
import DrawPile from './ui/DrawPile';
import Nursery from './ui/Nursery';
import DiscardPile from './ui/DiscardPile';
import { CardID } from './game/card';
import { useContext, useEffect, useRef, useState } from 'react';
import { CardInteraction, HoverTarget } from './BoardUtil';
import EndTurnButton from './ui/button/EndTurnButton';
import { PlayerID } from './game/player';
import { BoardState, getBoardState } from './BoardStateManager';
import type { Moves } from './game/types';
import GameLabel from './ui/GameLabel';
import { SearchTarget } from './game/do';
import CharacterSelectionPage from './components/pregame/CharacterSelectionPage';
import React from 'react';
import { LanguageContext } from './LanguageContextProvider';
import { useSoundEffects } from './hooks/useSoundEffects';
import NeighPanel from './components/NeighPanel';
import InfoPanel from './components/InfoPanel';
import OverlayManager from './components/OverlayManager';
import StableSection from './components/StableSection';

type Props = {
    G: UnstableUnicornsGame;
    ctx: Ctx;
    playerID: string;
    moves: Moves;
    isActive: boolean;
}

const Board = (props: Props) => {
    const { G, ctx, playerID, moves } = props;

    const { playDrawCardSound, playEndTurnButtonSound, playHubMouseOverSound, playExecuteDoSound } = useSoundEffects(G, ctx, playerID);

    const [showDeckFinder, setShowDeckFinder] = useState<SearchTarget[] | undefined>(undefined);
    const [showPlayerHand, setShowPlayerHand] = useState<PlayerID | undefined>(undefined);
    const [showBlatantThievery, setShowBlatantThievery] = useState<PlayerID | undefined>(undefined);
    const [showDiscardFinder, setShowDiscardFinder] = useState<{ cardID: CardID }[] | undefined>(undefined);
    const [showNurseryFinder, setShowNurseryFinder] = useState(false);
    const [isHoveringOverHandCard, setHoveringOverHandCard] = useState(false);
    const stableRef = useRef<StableHandle>(null);
    const playerFieldRef = useRef<PlayerFieldHandle>(null);
    const [hoverTargets, setHoverTargets] = useState<{ sourceCardID: CardID, targets: HoverTarget[] }>();
    const [cardInteraction, setCardInteraction] = useState<CardInteraction | undefined>(undefined);
    const context = useContext(LanguageContext);

    let openScenes: Array<[Instruction, Scene]> = _findInProgressScenesWithProtagonist(G, playerID);
    if (openScenes.length === 0) {
        openScenes = _findOpenScenesWithProtagonist(G, playerID);
    }
    const glowingCardIDs = openScenes.map(([instr]) => instr.ui.info?.source).filter(c => c !== undefined) as number[];

    const wrapperOnMouseMove = (evt: React.MouseEvent<HTMLDivElement>) => {
        // track mouse movement for card to card interaction
        if (cardInteraction?.key === "card_to_card") {
            setCardInteraction({
                key: "card_to_card",
                info: {
                    ...cardInteraction.info,
                    currentMousePosition: { x: evt.clientX, y: evt.clientY }
                }
            });
        }

        if (cardInteraction?.key === "card_to_player") {
            setCardInteraction({
                key: "card_to_player",
                info: {
                    ...cardInteraction.info,
                    currentMousePosition: { x: evt.clientX, y: evt.clientY }
                }
            });
        }

        if (cardInteraction?.key === "play_upgradeDowngradeCardFromHand__choose_target") {
            setCardInteraction({
                key: "play_upgradeDowngradeCardFromHand__choose_target",
                info: {
                    ...cardInteraction.info,
                    currentMousePosition: { x: evt.clientX, y: evt.clientY }
                }
            });
        }
    };

    const stableHighlightMode = hoverTargets?.targets.filter(s => s.type === "stable_card").map(s => s.info.cardID).concat([hoverTargets.sourceCardID]);

    const boardStates = getBoardState(G, ctx, playerID);
    if (boardStates.find(s => s.type === "destroy__click_on_card_in_stable" || s.type === "sacrifice__clickOnCardInStable")) {
        const boardState = boardStates.find(s => s.type === "destroy__click_on_card_in_stable" || s.type === "sacrifice__clickOnCardInStable")!;
        // only update if the card interaction is different
        // prevents the client from rendering indefinitely
        if (cardInteraction?.info?.instructionID !== boardState.info!.instructionID) {
            setCardInteraction({
                key: "click_on_other_stable_card", info: {
                    targets: boardState.info!.targets!,
                    instructionID: boardState.info!.instructionID,
                }
            });
        }
    }

    const [C2CArrow, setC2CArrow] = useState<{ fromX: number, fromY: number, toX: number, toY: number } | undefined>(undefined);


    if (ctx.phase === "pregame") {
        return (
            <CharacterSelectionPage G={G} babyCards={_.first(G.deck, 13)} playerID={playerID} moves={moves} />
        );
    }

    return (
        <AnimateSharedLayout>
            <Wrapper layout onMouseMove={wrapperOnMouseMove}>
                <div style={{
                    position: "absolute", top: 0, left: 100
                }} onClick={() => {
                    context!.setLanguage("de")
                }}>
                    Deutsch
                </div>
                <div style={{
                    position: "absolute", top: 0, right: 100
                }} onClick={() => {
                    context!.setLanguage("en")
                }}>
                    Englisch
                </div>


                <OverlayManager
                    G={G}
                    boardStates={boardStates}
                    moves={moves}
                    playerID={playerID}
                    cardInteraction={cardInteraction}
                    setCardInteraction={setCardInteraction}
                    showDeckFinder={showDeckFinder}
                    setShowDeckFinder={setShowDeckFinder}
                    showDiscardFinder={showDiscardFinder}
                    setShowDiscardFinder={setShowDiscardFinder}
                    showNurseryFinder={showNurseryFinder}
                    setShowNurseryFinder={setShowNurseryFinder}
                    showPlayerHand={showPlayerHand}
                    setShowPlayerHand={setShowPlayerHand}
                    showBlatantThievery={showBlatantThievery}
                    setShowBlatantThievery={setShowBlatantThievery}
                    C2CArrow={C2CArrow}
                />

                <Top>
                    {renderTop(G, ctx, ctx.currentPlayer === playerID, boardStates)}
                </Top>
                <Main>
                    <PlayerField
                        ref={playerFieldRef}
                        players={G.players.filter(pl => pl.id !== playerID)}
                        currentPlayer={ctx.currentPlayer}
                        stable={_.mapObject(_.mapObject(G.stable, (val, key) => [...val, ...G.temporaryStable[key]]), c => c.map(d => G.deck[d]))}
                        handCount={G.players.map(pl => G.hand[pl.id].length)}
                        upgradeDowngradeStable={_.mapObject(G.upgradeDowngradeStable, c => c.map(d => G.deck[d]))}
                        highlightMode={stableHighlightMode}
                        onHandClick={playerID => setShowPlayerHand(playerID)}
                        onStableCardClick={cardID => {
                            if (cardInteraction?.key === "click_on_other_stable_card" || cardInteraction?.key === "card_to_card") {
                                console.log("Detected click for cardInteraction with key <click_on_other_stable_card | card_to_card>");
                                // is clicked card a valid target?
                                if (cardInteraction.info.targets.find(s => s.cardID === cardID)) {
                                    console.log(`Clicked card is a valid target. Execute instruction with id <${cardInteraction.info.instructionID}>`);
                                    const bsType = boardStates.find(s => s.info?.instructionID === cardInteraction.info.instructionID)?.type;
                                    playExecuteDoSound(bsType);
                                    moves.executeDo(cardInteraction.info.instructionID, {
                                        protagonist: playerID, cardID
                                    });
                                    setCardInteraction(undefined);
                                }
                            }
                        }}
                        onStableCardMouseEnter={cardID => { }}
                        onStableCardMouseLeave={cardID => { }}
                        onPlayerClick={plid => {
                            if (cardInteraction?.key === "card_to_player") {
                                console.log("Detected click for cardInteraction with key <card_to_player>");

                                if (G.deck[cardInteraction.info.sourceCardID].title === "Blatant Thievery") {
                                    setShowBlatantThievery(plid);
                                    return;
                                }

                                // is clicked card a valid target?
                                if (cardInteraction.info.targets.find(s => s.playerID === plid)) {
                                    console.log(`Clicked player is a valid target. Execute instruction with id <${cardInteraction.info.instructionID}>`);
                                    moves.executeDo(cardInteraction.info.instructionID, {
                                        protagonist: playerID, playerID: plid
                                    });
                                    setCardInteraction(undefined);
                                }
                            } else if (cardInteraction?.key === "play_upgradeDowngradeCardFromHand__choose_target") {
                                moves.playUpgradeDowngradeCard(playerID, plid, cardInteraction.info.cardID);
                                setCardInteraction(undefined);
                            }
                        }}
                    />
                </Main>
                <Middle>
                    <DrawPileWrapper zIndexFocus={isHoveringOverHandCard}>
                        {renderEndTurnButton(moves, playerID, () => playEndTurnButtonSound(), boardStates)}
                        <MiddleLabel>Deck</MiddleLabel>
                        <DrawPile onClick={() => {
                            if (boardStates.find(s => s.type === "drawCard")) {
                                if (ctx.activePlayers![playerID] === "beginning") {
                                    playDrawCardSound();
                                    moves.drawAndAdvance();
                                } else if (ctx.activePlayers![playerID] === "action_phase") {
                                    playDrawCardSound();
                                    moves.drawAndEnd(playerID);
                                }
                            } else if (boardStates.find(s => s.type === "draw__clickOnDrawPile")) {
                                playDrawCardSound();
                                const boardState = boardStates.find(s => s.type === "draw__clickOnDrawPile")!;
                                moves.executeDo(boardState.info!.instructionID, {
                                    protagonist: playerID, count: boardState.info!.count
                                });
                            }
                        }} isGlowing={boardStates.find(s => s.type === "drawCard" || s.type === "draw__clickOnDrawPile") !== undefined} count={G.drawPile.length} />
                    </DrawPileWrapper>
                    <AnimatePresence>
                        <NeighPanel G={G} ctx={ctx} moves={moves} playerID={playerID} />
                    </AnimatePresence>

                    <InfoPanel G={G} ctx={ctx} playerID={playerID} boardStates={boardStates} />
                    <MiddleLeftWrapper zIndexFocus={isHoveringOverHandCard}>
                        <div>
                            <MiddleLabel>Nursery</MiddleLabel>
                            <Nursery cards={G.nursery.map(c => G.deck[c])} onClick={() => {
                                setShowNurseryFinder(true);
                            }} />
                        </div>
                        <div style={{ marginTop: "1em" }}>
                            <MiddleLabel>Discard pile</MiddleLabel>
                            <DiscardPile cards={G.discardPile.map(c => G.deck[c])} onClick={() => {
                                setShowDiscardFinder(G.discardPile.map(c => ({ cardID: c })));
                            }} />
                        </div>
                    </MiddleLeftWrapper>
                </Middle>
                <Bottom>
                    <StableSection
                        G={G}
                        ctx={ctx}
                        playerID={playerID}
                        moves={moves}
                        boardStates={boardStates}
                        stableRef={stableRef}
                        cardInteraction={cardInteraction}
                        setCardInteraction={setCardInteraction}
                        hoverTargets={hoverTargets}
                        setHoverTargets={setHoverTargets}
                        openScenes={openScenes}
                        glowingCardIDs={glowingCardIDs}
                        stableHighlightMode={stableHighlightMode}
                        setShowDeckFinder={setShowDeckFinder}
                        setShowDiscardFinder={setShowDiscardFinder}
                        setShowNurseryFinder={setShowNurseryFinder}
                        isHoveringOverHandCard={isHoveringOverHandCard}
                        setHoveringOverHandCard={setHoveringOverHandCard}
                        playHubMouseOverSound={playHubMouseOverSound}
                        playExecuteDoSound={playExecuteDoSound}
                    />
                </Bottom>
            </Wrapper>
            </AnimateSharedLayout>
    );
}

////////////////////////////////

const renderTop = (G: UnstableUnicornsGame, ctx: Ctx, isCurrentPlayer: boolean, boardStates: BoardState[]) => {
    if (isCurrentPlayer) {
        let text: string = "It's your turn";
        if (boardStates.find(s => s.type === "neigh__wait")) {
            text = "It's neigh time! Other players may neigh your card. Waiting for others..."
        }
        return (
            <div style={{ display: "flex", alignItems: "center" }}>
                <GameLabel text={text} />
            </div>
        );
    } else {
        return (
            <HiddenHand
                count={G.hand[ctx.currentPlayer].length}
            />
        );
    }
};

const renderEndTurnButton = (moves: Moves, playerID: PlayerID, playEndTurnButtonSound: () => void, boardStates: BoardState[]) => {
    if (boardStates.find(s => s.type === "endTurn")) {
        return (
            <EndTurnButtonWrapper>
                <EndTurnButton onClick={() => { playEndTurnButtonSound(); moves.end(playerID); }}>End turn</EndTurnButton>
            </EndTurnButtonWrapper>
        );
    }

    return undefined;
}

////////////////////////////////

const Wrapper = styled(motion.div)`
    width: 100%;
    height: 100vh;
    background-image: url(${BG});
    background-size: cover;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const Top = styled.div`
    position: absolute;
    top: 0;
    z-index: 2;
    height: 50px;
`;

const Main = styled.div`
    display: flex;
    justify-content: center;
    width: 1000px;
    margin-top: 80px;
    z-index: 1;
`;

const Middle = styled.div`
    width: 1200px;
    position: relative;
`;

const MiddleLabel = styled.div`
    color: white;
    margin-bottom: 0.4em;
`;

const MiddleLeftWrapper = styled.div<{ zIndexFocus: boolean }>`
    position: absolute;
    left: 0;
    transform: translate(0, -80px);
    z-index: ${props => props.zIndexFocus ? 10 : 3000};
`;

const DrawPileWrapper = styled.div<{ zIndexFocus: boolean }>`
    position: absolute;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: ${props => props.zIndexFocus ? 10 : 3000};
`;



const Bottom = styled.div`
    position: absolute;
    bottom: 120px;
    width: 100%;
    height: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 2000;
`;

const EndTurnButtonWrapper = styled.div`
    position: absolute;
    top: 110%;
    z-index: 3000;
    width: 200px;
`;

export default Board;
