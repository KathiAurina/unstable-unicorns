import styled from 'styled-components';
import _ from 'underscore';
import HiddenHand from './ui/HiddenHand';
import { StableHandle } from './ui/Stable';
import PlayerField, { PlayerFieldHandle } from './ui/PlayerField';
import { motion, AnimateSharedLayout, AnimatePresence } from "framer-motion";
// game
import type { UnstableUnicornsGame, Ctx, Instruction, Scene } from './game/state';
import { _findInProgressScenesWithProtagonist, _findOpenScenesWithProtagonist } from './game/state';
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
import type { SearchTarget } from './game/operations';
import CharacterSelectionPage from './components/pregame/CharacterSelectionPage';
import EscapeMenu from './components/EscapeMenu';
import React from 'react';
import { LanguageContext } from './LanguageContextProvider';
import { useSoundEffects } from './hooks/useSoundEffects';
import NeighPanel from './components/NeighPanel';
import InfoPanel from './components/InfoPanel';
import OverlayManager from './components/OverlayManager';
import StableSection from './components/StableSection';
import { useMobile } from './hooks/useMobile';
import MobileBoard from './mobile/MobileBoard';
import { useGameSettings } from './hooks/useGameSettings';
import { useAutoActions } from './hooks/useAutoActions';

type Props = {
    G: UnstableUnicornsGame;
    ctx: Ctx;
    playerID: string;
    moves: Moves;
    isActive: boolean;
}

// Top-level Board: routes between mobile and desktop based on device detection.
const Board = (props: Props) => {
    const isMobile = useMobile();
    if (isMobile) return <MobileBoard {...props} />;
    return <DesktopBoard {...props} />;
};

const DesktopBoard = (props: Props) => {
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
    useContext(LanguageContext);
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

    const [C2CArrow] = useState<{ fromX: number, fromY: number, toX: number, toY: number } | undefined>(undefined);
    const [escapeMenuOpen, setEscapeMenuOpen] = useState(false);
    const [gameoverDismissed, setGameoverDismissed] = useState(false);
    const { autoEndTurn, setAutoEndTurn, autoDontNeigh, setAutoDontNeigh } = useGameSettings();
    useAutoActions(G, ctx, playerID, moves, { autoEndTurn, autoDontNeigh }, boardStates);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setEscapeMenuOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const escapeMenu = (
        <EscapeMenu
            isOpen={escapeMenuOpen}
            onClose={() => setEscapeMenuOpen(false)}
            isOwner={G.owner === playerID}
            isCurrentPlayer={ctx.currentPlayer === playerID}
            playerID={playerID}
            G={G}
            ctx={ctx}
            moves={moves}
            autoEndTurn={autoEndTurn}
            setAutoEndTurn={setAutoEndTurn}
            autoDontNeigh={autoDontNeigh}
            setAutoDontNeigh={setAutoDontNeigh}
        />
    );

    const gameoverOverlay = ctx.gameover && !gameoverDismissed ? (() => {
        const isAborted = (ctx.gameover as any).aborted;
        const message = isAborted
            ? 'Game was ended by host'
            : `Player "${G.players[parseInt((ctx.gameover as any).winner)]?.name ?? (ctx.gameover as any).winner}" wins!`;
        return (
            <GameOverOverlay>
                <GameOverCard>
                    <GameOverMessage>{message}</GameOverMessage>
                    <ReturnButton onClick={() => { window.location.href = '/lobby'; }}>
                        Return to Lobby
                    </ReturnButton>
                    {!isAborted && (
                        <DismissButton onClick={() => setGameoverDismissed(true)}>
                            View Board
                        </DismissButton>
                    )}
                </GameOverCard>
            </GameOverOverlay>
        );
    })() : null;

    if (ctx.phase === "pregame") {
        return (
            <>
                {escapeMenu}
                {gameoverOverlay}
                <CharacterSelectionPage G={G} babyCards={G.deck.filter(c => c.type === "baby")} playerID={playerID} moves={moves} />
            </>
        );
    }

    return (
        <>
        {escapeMenu}
        {gameoverOverlay}
        <MenuToggleButton onClick={() => setEscapeMenuOpen(prev => !prev)} title="Menu (Esc)">
            ☰
        </MenuToggleButton>
        <AnimateSharedLayout>
            <Wrapper layout onMouseMove={wrapperOnMouseMove}>
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

                                const bsType = boardStates.find(s => s.info?.instructionID === cardInteraction.info.instructionID)?.type;
                                if (bsType === "blatantThievery1") {
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
        </>
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

const MenuToggleButton = styled.button`
    position: fixed;
    top: 10px;
    right: 12px;
    z-index: 9999;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.45);
    color: white;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease;

    &:hover {
        background: rgba(0, 0, 0, 0.65);
    }
`;

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

const GameOverOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9000;
`;

const GameOverCard = styled.div`
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
    padding: 48px 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
`;

const GameOverMessage = styled.h2`
    font-size: 26px;
    font-weight: 800;
    color: #333;
    margin: 0;
    text-align: center;
`;

const ReturnButton = styled.button`
    padding: 14px 32px;
    font-size: 15px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    background: linear-gradient(90deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, #9B59B6);
    color: white;
    transition: transform 0.15s ease, box-shadow 0.15s ease;

    &:hover {
        transform: scale(1.03);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
`;

const DismissButton = styled.button`
    padding: 10px 28px;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Nunito', sans-serif;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    cursor: pointer;
    background: transparent;
    color: #555;
    transition: transform 0.15s ease, border-color 0.15s ease;

    &:hover {
        transform: scale(1.03);
        border-color: #aaa;
        color: #333;
    }
`;

export default Board;
