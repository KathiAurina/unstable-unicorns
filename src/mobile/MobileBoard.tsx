/**
 * MobileBoard — self-contained mobile game board.
 * Receives the same props as Board.tsx (G, ctx, playerID, moves).
 * What a tap means comes from the shared board controller (view/useBoard.ts); this file only maps
 * touch gestures onto it and keeps the mobile-only UI state (overlays, drawers).
 */
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence, AnimateSharedLayout } from 'framer-motion';

import type { CardID, GameOver } from '../game/engine';
import { candidateCards, locate } from '../game/engine';
import type { BoardProps } from '../Board';
import { gameOverMessage } from '../Board';
import type { CardView } from '../view/cards';
import { cardView, cardViews, playerName } from '../view/cards';
import { needsTarget, playTargetsOf } from '../view/model';
import { describeLog } from '../view/log';
import { useBoard } from '../view/useBoard';
import { neighRole } from '../components/NeighPanel';

import BG from '../assets/ui/board-background.jpg';
import EscapeMenu from '../components/EscapeMenu';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { useGameSettings } from '../hooks/useGameSettings';
import { useAutoActions } from '../hooks/useAutoActions';
import { useSandboxControl } from '../sandbox/sandboxContext';
import SandboxPanel from '../sandbox/SandboxPanel';
import SandboxActionBanner from '../sandbox/SandboxActionBanner';

import CharacterSelectionPage from '../components/pregame/CharacterSelectionPage';
import LandscapeGuard from './LandscapeGuard';
import MobileInfoBar from './MobileInfoBar';
import MobileGameLogDrawer from './MobileGameLogDrawer';
import MobilePlayerField from './MobilePlayerField';
import MobileHand, { DragResult } from './MobileHand';
import MobileCardDetail from './MobileCardDetail';
import MobileFinder from './MobileFinder';
import MobileNeighModal from './MobileNeighModal';
import MobileActionBar, { MobilePanelButtons } from './MobileActionBar';

/** A pile the player opened just to look at it. */
type Browse = 'discard' | 'nursery' | undefined;

const MobileBoard = ({ G, ctx, playerID, moves }: BoardProps) => {
    const { playDrawCardSound, playEndTurnButtonSound, playVerbSound } = useSoundEffects(G, playerID);
    const board = useBoard(G, playerID, moves, 'mobile', (outcome, prompt) => {
        if (outcome.move === 'respond') playVerbSound(prompt?.verb);
    });
    const { model } = board;

    // ── UI state ──────────────────────────────────────────────────────────────
    const [browse, setBrowse] = useState<Browse>(undefined);
    const [detailCard, setDetailCard] = useState<CardView | undefined>(undefined);
    const [escapeMenuOpen, setEscapeMenuOpen] = useState(false);
    const [gameoverDismissed, setGameoverDismissed] = useState(false);
    const [neighHidden, setNeighHidden] = useState(false);

    // ── Game log state ────────────────────────────────────────────────────────
    const [showLog, setShowLog] = useState(false);
    const [seenLogCount, setSeenLogCount] = useState(0);
    const logLength = useMemo(() => describeLog(G, playerID).length, [G, playerID]);
    const logBadgeCount = Math.max(0, logLength - seenLogCount);

    // ── Settings & automation ─────────────────────────────────────────────────
    const { autoEndTurn, setAutoEndTurn, autoDontNeigh, setAutoDontNeigh } = useGameSettings();
    const { sandboxAction, setSandboxAction } = useSandboxControl();
    const isSandboxDummy = G.sandbox === true && playerID !== G.owner;
    useAutoActions(board, {
        autoEndTurn: isSandboxDummy ? false : autoEndTurn,
        autoDontNeigh: isSandboxDummy ? false : autoDontNeigh,
    });

    // ── Highlights ────────────────────────────────────────────────────────────
    const markedCards = Array.from(board.marks.keys());

    // While a prompt asks for a card in a stable, everything that cannot be chosen is dimmed.
    const stableCandidates = model.prompt && model.prompt.kind === 'chooseCards'
        ? candidateCards(model.prompt).filter(c => locate(G, c)?.zone === 'stable')
        : [];
    const highlightMode: CardID[] | undefined = stableCandidates.length > 0
        ? [...stableCandidates, ...(model.prompt?.source ? [model.prompt.source.card] : [])]
        : undefined;

    // Sandbox actions that pick any stable card: every tap on a stable card is an action.
    const sandboxPicksStableCard = sandboxAction !== null && (
        sandboxAction.type === 'bounce' || sandboxAction.type === 'destroy'
        || (sandboxAction.type === 'steal' && sandboxAction.step === 'pick_card'));

    // ── Response round (Neigh) ────────────────────────────────────────────────
    const round = model.round;
    // Show the modal again when a new round starts or someone answers.
    const roundKey = round ? `${G.round?.id}:${round.responses.length}` : undefined;
    useEffect(() => { setNeighHidden(false); }, [roundKey]);

    const neighModal = round ? (() => {
        const lastResponse = round.responses[round.responses.length - 1];
        return (
            <MobileNeighModal
                key="neigh-modal"
                card={cardView(G, round.card)}
                role={neighRole(model)}
                originalInitiatorName={playerName(G, round.by)}
                newInitiatorName={lastResponse ? playerName(G, lastResponse.by) : undefined}
                numberOfNeighedCards={round.stopped ? 1 : 0}
                didVote={model.respond === undefined}
                showPlayNeighButton={model.respond !== undefined && candidateCards(model.respond).length > 0}
                onPlayNeighClick={() => { board.playInstant(); }}
                onDontPlayNeighClick={() => { board.pass(); }}
                onHide={() => setNeighHidden(true)}
            />
        );
    })() : null;

    // ── Card tap handlers ─────────────────────────────────────────────────────

    /** Tap on any stable card (own or opponent). */
    const handleStableCardTap = (cardID: CardID) => {
        // Sandbox interactive actions take priority
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

    /** Tap on a player cell (not a specific card). */
    const handlePlayerTap = (targetPlayerID: string) => {
        board.clickPlayer(targetPlayerID);
    };

    /** A hand card was dragged out of the hand and released. */
    const handleDragEnd = ({ cardID, dropPlayerID }: DragResult) => {
        // Sandbox interactive actions
        if (sandboxAction) {
            if (sandboxAction.type === 'move_to_stable' && sandboxAction.step === 'pick_card') {
                setSandboxAction({ type: 'move_to_stable', step: 'pick_stable', cardID });
            } else if (sandboxAction.type === 'force_discard') {
                moves.sandboxForceDiscardCard(sandboxAction.playerID, cardID);
                setSandboxAction(null);
            }
            return;
        }

        const mark = board.marks.get(cardID);
        if (mark === undefined) return;
        // A prompt candidate (discard, choose a card …) or an Instant in the response round.
        if (mark !== 'playable') {
            board.clickCard(cardID);
            return;
        }
        // Playing the card. Upgrades/Downgrades dropped on an allowed stable go straight there;
        // otherwise the controller asks for the destination (stable buttons / tap a player).
        if (needsTarget(G, model, cardID) && dropPlayerID !== null && playTargetsOf(model, cardID).includes(dropPlayerID)) {
            moves.playCard(cardID, dropPlayerID);
            return;
        }
        board.clickCard(cardID);
    };

    // ── Escape menu & game over ───────────────────────────────────────────────
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
                <ReturnBtn onTouchEnd={() => { window.location.href = '/lobby'; }} onClick={() => { window.location.href = '/lobby'; }}>Return to Lobby</ReturnBtn>
                {!gameover.aborted && <DismissBtn onTouchEnd={() => setGameoverDismissed(true)} onClick={() => setGameoverDismissed(true)}>View Board</DismissBtn>}
            </GameOverCard>
        </GameOverOverlay>
    ) : null;

    // ── Pregame phase ─────────────────────────────────────────────────────────
    if (ctx.phase === 'pregame') {
        return (
            <>
                {escapeMenu}
                {gameoverOverlay}
                <CharacterSelectionPage G={G} babyCards={cardViews(G, G.zones.nursery)} playerID={playerID} moves={moves} />
            </>
        );
    }

    // ── Card picker of the open prompt ────────────────────────────────────────
    const finder = board.finder;
    const promptButtons = board.panels[0]?.buttons ?? [];
    const finderSkip = promptButtons.find(b => b.tone === 'skip');
    // Everything else of the prompt (e.g. Confirm for several cards) goes into the finder's top bar.
    const finderExtra = promptButtons.filter(b => b.key !== 'finder' && b !== finderSkip);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <AnimateSharedLayout>
            <Wrapper>
                <LandscapeGuard />

                {/* Modals / overlays (highest priority) */}
                {escapeMenu}
                {gameoverOverlay}

                {/* Card detail overlay (long-press) */}
                <MobileCardDetail card={detailCard} onClose={() => setDetailCard(undefined)} />

                {/* Finder overlays */}
                {finder && (
                    <MobileFinder
                        cards={cardViews(G, finder.cards)}
                        title={`${finder.title} — tap a card.`}
                        showBackButton={true}
                        onBackClick={() => board.closeFinder()}
                        onFailToFindClick={finder.optional && finderSkip ? () => board.press(finderSkip) : undefined}
                        failLabel={finder.zone === 'deck' ? 'Fail to Find' : 'Skip'}
                        selected={board.ui.selected}
                        extra={finderExtra.length > 0 ? <MobilePanelButtons buttons={finderExtra} onPress={board.press} /> : undefined}
                        onCardClick={cardID => { board.clickCard(cardID); }}
                    />
                )}
                {!finder && browse === 'discard' && (
                    <MobileFinder
                        cards={cardViews(G, G.zones.discard)}
                        browseOnly={true}
                        onBackClick={() => setBrowse(undefined)}
                        onCardClick={() => undefined}
                    />
                )}
                {!finder && browse === 'nursery' && (
                    <MobileFinder
                        cards={cardViews(G, G.zones.nursery)}
                        browseOnly={true}
                        onBackClick={() => setBrowse(undefined)}
                        onCardClick={() => undefined}
                    />
                )}

                {/* Neigh modal */}
                <AnimatePresence>
                    {neighModal && !neighHidden && neighModal}
                </AnimatePresence>
                {neighModal && neighHidden && (
                    <ShowNeighBtn
                        onTouchEnd={e => { e.preventDefault(); setNeighHidden(false); }}
                        onClick={() => setNeighHidden(false)}
                    >
                        Show Neigh
                    </ShowNeighBtn>
                )}

                {/* Game log drawer */}
                {showLog && (
                    <MobileGameLogDrawer
                        G={G}
                        playerID={playerID}
                        onClose={() => setShowLog(false)}
                    />
                )}

                {/* Main board */}
                <MobileInfoBar
                    G={G}
                    board={board}
                    onShowNursery={() => setBrowse('nursery')}
                    onShowDiscard={() => setBrowse('discard')}
                    onEscapeMenu={() => setEscapeMenuOpen(prev => !prev)}
                    onShowLog={() => { setShowLog(true); setSeenLogCount(logLength); }}
                    logBadgeCount={logBadgeCount}
                    playDrawCardSound={playDrawCardSound}
                    playEndTurnSound={playEndTurnButtonSound}
                />

                {/* Buttons of the open decision: modes, Yes/No, Skip, Confirm, stables, abilities … */}
                {!finder && <MobileActionBar G={G} panels={board.panels} onPress={board.press} />}

                <MobilePlayerField
                    G={G}
                    playerID={playerID}
                    turnPlayer={model.turnPlayer}
                    glowingCardIDs={markedCards}
                    highlightMode={highlightMode}
                    targetPlayers={board.targets}
                    isTargetMode={sandboxPicksStableCard}
                    onCardTap={handleStableCardTap}
                    onPlayerTap={handlePlayerTap}
                    onCardLongPress={card => setDetailCard(card)}
                />

                <MobileHand
                    cards={cardViews(G, G.zones.hand[playerID] ?? [])}
                    glowingCards={markedCards}
                    onDragEnd={handleDragEnd}
                    onCardLongPress={card => setDetailCard(card)}
                />
            </Wrapper>
            {G.sandbox && (
                <>
                    <SandboxActionBanner />
                    <SandboxPanel G={G} ctx={ctx} moves={moves} playerID={playerID} />
                </>
            )}
        </AnimateSharedLayout>
    );
};

// ── Styled components ─────────────────────────────────────────────────────────

const ShowNeighBtn = styled.div`
    position: fixed;
    bottom: 200px;
    right: 16px;
    z-index: 79000;
    background: #1e1e30;
    border: 2px solid rgba(255,255,255,0.25);
    border-radius: 12px;
    padding: 10px 14px;
    color: white;
    font-size: 13px;
    font-weight: 800;
    font-family: 'Nunito', sans-serif;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
`;

const Wrapper = styled.div`
    width: 100%;
    height: 100dvh;
    background-image: url(${BG});
    background-size: cover;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    touch-action: none;
`;

const GameOverOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 85000;
    padding: 16px;
`;

const GameOverCard = styled.div`
    background: white;
    border-radius: 14px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    max-width: 320px;
    width: 100%;
`;

const GameOverMessage = styled.h2`
    font-size: 18px;
    font-weight: 800;
    color: #333;
    margin: 0;
    text-align: center;
    font-family: 'Nunito', sans-serif;
`;

const ReturnBtn = styled.div`
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    border-radius: 10px;
    cursor: pointer;
    background: linear-gradient(90deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF);
    color: white;
    width: 100%;
    text-align: center;
    -webkit-tap-highlight-color: transparent;
`;

const DismissBtn = styled.div`
    padding: 10px 24px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'Nunito', sans-serif;
    border-radius: 10px;
    cursor: pointer;
    border: 2px solid #ddd;
    color: #555;
    width: 100%;
    text-align: center;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
`;

export default MobileBoard;
