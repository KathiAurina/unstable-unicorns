import styled from 'styled-components';
import HiddenHand from './ui/HiddenHand';
import { StableHandle } from './ui/Stable';
import PlayerField, { PlayerFieldHandle } from './ui/PlayerField';
import { motion, AnimateSharedLayout, AnimatePresence } from "framer-motion";
// game
import type { Ctx, Moves } from './game/game';
import type { CardID, GameOver, GameState } from './game/engine';
import { candidateCards, locate } from './game/engine';
// view
import { cardViews, playerName, stableUnicorns, stableUpgrades } from './view/cards';
import type { CardView } from './view/cards';
import { useBoard } from './view/useBoard';
// assets
import BG from './assets/ui/board-background.jpg';
import DrawPile from './ui/DrawPile';
import Nursery from './ui/Nursery';
import DiscardPile from './ui/DiscardPile';
import { useContext, useEffect, useRef, useState } from 'react';
import EndTurnButton from './ui/button/EndTurnButton';
import GameLabel from './ui/GameLabel';
import CharacterSelectionPage from './components/pregame/CharacterSelectionPage';
import EscapeMenu from './components/EscapeMenu';
import React from 'react';
import { LanguageContext } from './LanguageContextProvider';
import { useSoundEffects } from './hooks/useSoundEffects';
import NeighPanel from './components/NeighPanel';
import ActionPanel from './components/ActionPanel';
import OverlayManager from './components/OverlayManager';
import type { Browse } from './components/OverlayManager';
import StableSection from './components/StableSection';
import GameLogPanel from './components/GameLogPanel';
import { useMobile } from './hooks/useMobile';
import MobileBoard from './mobile/MobileBoard';
import { useGameSettings } from './hooks/useGameSettings';
import { useAutoActions } from './hooks/useAutoActions';
import SandboxPanel from './sandbox/SandboxPanel';
import SandboxActionBanner from './sandbox/SandboxActionBanner';
import { useSandboxControl } from './sandbox/sandboxContext';

export type BoardProps = {
    G: GameState;
    ctx: Ctx;
    playerID: string;
    moves: Moves;
    isActive: boolean;
}

// Top-level Board: routes between mobile and desktop based on device detection.
const Board = (props: BoardProps) => {
    const isMobile = useMobile();
    if (isMobile) return <MobileBoard {...props} />;
    return <DesktopBoard {...props} />;
};

/** The headline of the game-over overlay. */
export function gameOverMessage(G: GameState, gameover: GameOver): string {
    if (gameover.aborted) return 'Game was ended by host';
    const names = gameover.winners.map(p => `"${playerName(G, p)}"`);
    const why = gameover.reason === 'deckOut' ? ' The deck and the discard pile ran out.' : '';
    if (names.length === 0) return `The game is over.${why}`;
    if (names.length === 1) return `Player ${names[0]} wins!${why}`;
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} share the win!${why}`;
}

const DesktopBoard = (props: BoardProps) => {
    const { G, ctx, playerID, moves } = props;

    const { playDrawCardSound, playEndTurnButtonSound, playHubMouseOverSound, playVerbSound } = useSoundEffects(G, playerID);
    const { sandboxAction, setSandboxAction } = useSandboxControl();
    const board = useBoard(G, playerID, moves, 'desktop', (outcome, prompt) => {
        if (outcome.move === 'respond') playVerbSound(prompt?.verb);
    });
    const { model } = board;

    const [browse, setBrowse] = useState<Browse>(undefined);
    const [isHoveringOverHandCard, setHoveringOverHandCard] = useState(false);
    const stableRef = useRef<StableHandle>(null);
    const playerFieldRef = useRef<PlayerFieldHandle>(null);
    useContext(LanguageContext);

    // An arrow follows the mouse while a hand card waits for its destination stable.
    const mouseRef = useRef({ x: 0, y: 0 });
    const [arrow, setArrow] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | undefined>(undefined);
    const pendingPlay = board.ui.pendingPlay;
    useEffect(() => {
        setArrow(pendingPlay !== undefined ? { from: { ...mouseRef.current }, to: { ...mouseRef.current } } : undefined);
    }, [pendingPlay]);
    const wrapperOnMouseMove = (evt: React.MouseEvent<HTMLDivElement>) => {
        const at = { x: evt.clientX, y: evt.clientY };
        mouseRef.current = at;
        if (pendingPlay !== undefined) setArrow(a => (a ? { from: a.from, to: at } : a));
    };

    // While a prompt asks for a card in a stable, everything that cannot be chosen is dimmed.
    const stableCandidates = model.prompt && model.prompt.kind === 'chooseCards'
        ? candidateCards(model.prompt).filter(c => locate(G, c)?.zone === 'stable')
        : [];
    const stableHighlightMode: CardID[] | undefined = stableCandidates.length > 0
        ? [...stableCandidates, ...(model.prompt?.source ? [model.prompt.source.card] : [])]
        : undefined;

    const [escapeMenuOpen, setEscapeMenuOpen] = useState(false);
    const [gameoverDismissed, setGameoverDismissed] = useState(false);
    const { autoEndTurn, setAutoEndTurn, autoDontNeigh, setAutoDontNeigh } = useGameSettings();
    const isSandboxDummy = G.sandbox === true && playerID !== G.owner;
    useAutoActions(board, {
        autoEndTurn: isSandboxDummy ? false : autoEndTurn,
        autoDontNeigh: isSandboxDummy ? false : autoDontNeigh,
    });

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
            playerID={playerID}
            G={G}
            moves={moves}
            autoEndTurn={autoEndTurn}
            setAutoEndTurn={setAutoEndTurn}
            autoDontNeigh={autoDontNeigh}
            setAutoDontNeigh={setAutoDontNeigh}
        />
    );

    const gameover = ctx.gameover as GameOver | undefined;
    const gameoverOverlay = gameover && !gameoverDismissed ? (
        <GameOverOverlay>
            <GameOverCard>
                <GameOverMessage>{gameOverMessage(G, gameover)}</GameOverMessage>
                <ReturnButton onClick={() => { window.location.href = '/lobby'; }}>
                    Return to Lobby
                </ReturnButton>
                {!gameover.aborted && (
                    <DismissButton onClick={() => setGameoverDismissed(true)}>
                        View Board
                    </DismissButton>
                )}
            </GameOverCard>
        </GameOverOverlay>
    ) : null;

    if (ctx.phase === "pregame") {
        return (
            <>
                {escapeMenu}
                {gameoverOverlay}
                <CharacterSelectionPage G={G} babyCards={cardViews(G, G.zones.nursery)} playerID={playerID} moves={moves} />
            </>
        );
    }

    const others = G.players.filter(pl => pl.id !== playerID);
    const byPlayer = (pick: (player: string) => CardID[]): { [key: string]: CardView[] } =>
        Object.fromEntries(G.players.map(pl => [pl.id, cardViews(G, pick(pl.id))]));

    const onOtherStableCardClick = (cardID: CardID) => {
        if (sandboxAction) {
            if (sandboxAction.type === 'bounce') {
                moves.sandboxBounceCard(cardID);
                setSandboxAction(null);
            } else if (sandboxAction.type === 'destroy') {
                moves.sandboxDestroyCard(cardID);
                setSandboxAction(null);
            } else if (sandboxAction.type === 'steal' && sandboxAction.step === 'pick_card') {
                setSandboxAction({ type: 'steal', step: 'pick_target', cardID });
            }
            return;
        }
        board.clickCard(cardID);
    };

    const topText = model.round
        ? "It's neigh time! Other players may neigh your card. Waiting for others..."
        : "It's your turn";

    return (
        <>
        {escapeMenu}
        {gameoverOverlay}
        <MenuToggleButton onClick={() => setEscapeMenuOpen(prev => !prev)} title="Menu (Esc)">
            ☰
        </MenuToggleButton>
        <AnimateSharedLayout>
            <Wrapper layout onMouseMove={wrapperOnMouseMove}>
                <OverlayManager G={G} board={board} browse={browse} setBrowse={setBrowse} arrow={arrow} />

                <Top>
                    {model.isMyTurn
                        ? <div style={{ display: "flex", alignItems: "center" }}><GameLabel text={topText} /></div>
                        : <HiddenHand count={(G.zones.hand[model.turnPlayer] ?? []).length} />}
                </Top>
                <Main>
                    <PlayerField
                        ref={playerFieldRef}
                        players={others}
                        currentPlayer={model.turnPlayer}
                        stable={byPlayer(p => stableUnicorns(G, p))}
                        handCount={G.players.map(pl => G.zones.hand[pl.id].length)}
                        upgradeDowngradeStable={byPlayer(p => stableUpgrades(G, p))}
                        highlightMode={stableHighlightMode}
                        targets={board.targets}
                        onHandClick={player => setBrowse({ zone: 'hand', player })}
                        onStableCardClick={onOtherStableCardClick}
                        onStableCardMouseEnter={() => undefined}
                        onStableCardMouseLeave={() => undefined}
                        onPlayerClick={player => { board.clickPlayer(player); }}
                    />
                </Main>
                <Middle>
                    <DrawPileWrapper zIndexFocus={isHoveringOverHandCard}>
                        {board.canEndTurn && (
                            <EndTurnButtonWrapper>
                                <EndTurnButton onClick={() => { playEndTurnButtonSound(); board.endTurn(); }}>End turn</EndTurnButton>
                            </EndTurnButtonWrapper>
                        )}
                        <MiddleLabel>Deck</MiddleLabel>
                        <DrawPile
                            onClick={() => { if (board.clickDeck()) playDrawCardSound(); }}
                            isGlowing={board.deck !== undefined}
                            count={G.zones.deck.length}
                        />
                    </DrawPileWrapper>
                    <AnimatePresence>
                        <NeighPanel G={G} model={model} onPlayNeigh={() => { board.playInstant(); }} onPass={() => { board.pass(); }} />
                    </AnimatePresence>

                    <ActionPanel G={G} panels={board.finder ? [] : board.panels} onPress={board.press} />
                    <MiddleLeftWrapper zIndexFocus={isHoveringOverHandCard}>
                        <div>
                            <MiddleLabel>Nursery</MiddleLabel>
                            <Nursery cards={cardViews(G, G.zones.nursery)} onClick={() => setBrowse({ zone: 'nursery' })} />
                        </div>
                        <div style={{ marginTop: "1em" }}>
                            <MiddleLabel>Discard pile</MiddleLabel>
                            <DiscardPile cards={cardViews(G, G.zones.discard)} onClick={() => setBrowse({ zone: 'discard' })} />
                        </div>
                    </MiddleLeftWrapper>
                </Middle>
                <Bottom>
                    <StableSection
                        G={G}
                        playerID={playerID}
                        moves={moves}
                        board={board}
                        stableRef={stableRef}
                        stableHighlightMode={stableHighlightMode}
                        setHoveringOverHandCard={setHoveringOverHandCard}
                        playHubMouseOverSound={playHubMouseOverSound}
                    />
                </Bottom>
            </Wrapper>
            </AnimateSharedLayout>
            <GameLogPanel G={G} playerID={playerID} />
            {G.sandbox && (
                <>
                    <SandboxActionBanner />
                    <SandboxPanel G={G} ctx={ctx} moves={moves} playerID={playerID} />
                </>
            )}
        </>
    );
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
