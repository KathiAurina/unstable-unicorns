/**
 * MobileBoard — self-contained mobile game board.
 * Receives the same props as Board.tsx (G, ctx, playerID, moves).
 * Manages all interaction state independently from the desktop Board.
 */
import React, { useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence, AnimateSharedLayout } from 'framer-motion';
import _ from 'underscore';

import type { UnstableUnicornsGame, Ctx, Instruction, Scene } from '../game/state';
import { _findInProgressScenesWithProtagonist, _findOpenScenesWithProtagonist, _findInstruction } from '../game/state';
import type { Moves } from '../game/types';
import type { CardID, Card } from '../game/card';
import type { SearchTarget } from '../game/operations';
import type { AddFromDiscardPileToHandTarget, BringToStableTarget, DiscardTarget, ReviveTarget } from '../game/operations';
import { CardInteraction } from '../BoardUtil';
import { getBoardState, BoardState } from '../BoardStateManager';
import { canPlayCard } from '../game/game';

import BG from '../assets/ui/board-background.jpg';
import EscapeMenu from '../components/EscapeMenu';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { LanguageContext } from '../LanguageContextProvider';

import CharacterSelectionPage from '../components/pregame/CharacterSelectionPage';
import LandscapeGuard from './LandscapeGuard';
import MobileInfoBar from './MobileInfoBar';
import MobilePlayerField from './MobilePlayerField';
import MobileHand, { DragResult } from './MobileHand';
import MobileCardDetail from './MobileCardDetail';
import MobileFinder from './MobileFinder';
import MobileNeighModal from './MobileNeighModal';


type Props = {
    G: UnstableUnicornsGame;
    ctx: Ctx;
    playerID: string;
    moves: Moves;
    isActive: boolean;
};

type FinderType = 'deck' | 'discard' | 'nursery' | 'playerHand' | 'blatantThievery';

const MobileBoard = ({ G, ctx, playerID, moves }: Props) => {
    const { playDrawCardSound, playEndTurnButtonSound, playHubMouseOverSound, playExecuteDoSound } = useSoundEffects(G, ctx, playerID);

    // ── Finder state ─────────────────────────────────────────────────────────
    const [showDeckFinder, setShowDeckFinder] = useState<SearchTarget[] | undefined>(undefined);
    const [showDiscardFinder, setShowDiscardFinder] = useState<{ cardID: CardID }[] | undefined>(undefined);
    const [showNurseryFinder, setShowNurseryFinder] = useState(false);
    const [showPlayerHand, setShowPlayerHand] = useState<string | undefined>(undefined);
    const [showBlatantThievery, setShowBlatantThievery] = useState<string | undefined>(undefined);

    // ── Interaction state ─────────────────────────────────────────────────────
    const [cardInteraction, setCardInteraction] = useState<CardInteraction | undefined>(undefined);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [detailCard, setDetailCard] = useState<Card | undefined>(undefined);
    const [escapeMenuOpen, setEscapeMenuOpen] = useState(false);
    const [gameoverDismissed, setGameoverDismissed] = useState(false);

    // ── Computed ──────────────────────────────────────────────────────────────
    const boardStates = getBoardState(G, ctx, playerID);

    let openScenes: Array<[Instruction, Scene]> = _findInProgressScenesWithProtagonist(G, playerID);
    if (openScenes.length === 0) {
        openScenes = _findOpenScenesWithProtagonist(G, playerID);
    }

    const glowingCardIDs: CardID[] = openScenes
        .map(([instr]) => instr.ui.info?.source)
        .filter((c): c is number => c !== undefined);

    // Auto-set cardInteraction for click_on_other_stable_card (same logic as desktop Board.tsx)
    const destroySacrificeState = boardStates.find(
        s => s.type === 'destroy__click_on_card_in_stable' || s.type === 'sacrifice__clickOnCardInStable'
    );
    if (destroySacrificeState && cardInteraction?.info?.instructionID !== destroySacrificeState.info!.instructionID) {
        setCardInteraction({
            key: 'click_on_other_stable_card',
            info: {
                targets: destroySacrificeState.info!.targets!,
                instructionID: destroySacrificeState.info!.instructionID,
            },
        });
    }
    if (!destroySacrificeState && cardInteraction?.key === 'click_on_other_stable_card') {
        setCardInteraction(undefined);
    }

    // Derived highlight set
    const highlightMode = cardInteraction?.key === 'click_on_other_stable_card' || cardInteraction?.key === 'card_to_card'
        ? cardInteraction.info.targets.map((t: any) => t.cardID)
        : undefined;

    // Target mode: stable card taps act as target selection
    const isTargetMode = cardInteraction?.key === 'click_on_other_stable_card' || cardInteraction?.key === 'card_to_card';

    // ── Glowing hand cards ────────────────────────────────────────────────────
    let glowingHandCards: CardID[] = [];
    if (boardStates.find(s => s.type === 'playCard') && cardInteraction?.key !== 'play_upgradeDowngradeCardFromHand__choose_target') {
        glowingHandCards = G.hand[playerID]
            .map(c => [canPlayCard(G, ctx, playerID, c), c])
            .filter(s => s[0])
            .map(s => s[1]) as CardID[];
    } else if (boardStates.find(s => s.type === 'neigh__playNeigh')) {
        if (!G.playerEffects[playerID].find(s => s.effect.key === 'you_cannot_play_neigh')) {
            glowingHandCards = G.hand[playerID]
                .map(c => G.deck[c])
                .filter(c => c.type === 'neigh' || c.type === 'super_neigh')
                .map(c => c.id);
        }
    } else if (boardStates.find(s => s.type === 'discard' || s.type === 'discard__popup__committed')) {
        const ds = boardStates.find(s => s.type === 'discard' || s.type === 'discard__popup__committed')!;
        glowingHandCards = ds.info!.targets!
            .map((c: DiscardTarget) => c.handIndex)
            .map((i: number) => G.hand[playerID][i]);
    } else if (boardStates.find(s => s.type === 'bring__popup__committed')) {
        const ds = boardStates.find(s => s.type === 'bring__popup__committed')!;
        glowingHandCards = ds.info!.targets!.map((c: BringToStableTarget) => c.cardID);
    }

    // ── Neigh panel setup ─────────────────────────────────────────────────────
    const buildNeighProps = () => {
        if (!G.neighDiscussion) return null;
        const currentRound = _.last(G.neighDiscussion.rounds)!;
        let role: any = 'original_initiator';
        let newInitiatorName: string | undefined;
        const originalInitiatorName = G.players[parseInt(G.neighDiscussion.protagonist)].name;

        if (G.neighDiscussion.rounds.length > 1) {
            const beforeRound = _.last(G.neighDiscussion.rounds, 2)[0];
            newInitiatorName = G.players[parseInt(_.findKey(beforeRound.playerState, val => val.vote === 'neigh')!)].name;
        }

        if (G.neighDiscussion.protagonist === playerID) {
            role = G.neighDiscussion.rounds.length > 1
                ? (_.last(G.neighDiscussion.rounds, 2)[0].playerState[playerID].vote === 'neigh'
                    ? 'original_initiator'
                    : 'original_initiator_can_counterneigh')
                : 'original_initiator';
        } else if (currentRound.playerState[playerID].vote === 'undecided') {
            role = 'open';
        } else if (currentRound.playerState[playerID].vote === 'neigh') {
            role = 'did_neigh';
        } else if (currentRound.playerState[playerID].vote === 'no_neigh') {
            if (G.neighDiscussion.rounds.length > 1) {
                const beforeRound = _.last(G.neighDiscussion.rounds, 2)[0];
                role = beforeRound.playerState[playerID].vote === 'neigh' ? 'new_initiator' : 'did_not_neigh';
            } else {
                role = 'did_not_neigh';
            }
        }

        const didVote = currentRound.playerState[playerID].vote !== 'undecided';
        const hasNeigh = G.hand[playerID].map(c => G.deck[c]).some(c => c.type === 'neigh' || c.type === 'super_neigh');
        const canPlayNeigh = hasNeigh && !G.playerEffects[playerID].find(s => s.effect.key === 'you_cannot_play_neigh');

        const onPlayNeigh = () => {
            const nc = G.hand[playerID].map(c => G.deck[c]).find(c => c.type === 'neigh');
            if (nc) {
                moves.playNeigh(nc.id, playerID, G.neighDiscussion!.rounds.length - 1);
            } else {
                const sn = G.hand[playerID].map(c => G.deck[c]).find(c => c.type === 'super_neigh');
                moves.playSuperNeigh(sn!.id, playerID, G.neighDiscussion!.rounds.length - 1);
            }
        };
        const onDontPlayNeigh = () => moves.dontPlayNeigh(playerID, G.neighDiscussion!.rounds.length - 1);

        return {
            card: G.deck[G.neighDiscussion.cardID],
            role,
            originalInitiatorName,
            newInitiatorName,
            numberOfNeighedCards: G.neighDiscussion.rounds.filter(r => r.state === 'neigh').length,
            didVote,
            showPlayNeighButton: canPlayNeigh,
            onPlayNeighClick: onPlayNeigh,
            onDontPlayNeighClick: onDontPlayNeigh,
        };
    };
    const neighProps = buildNeighProps();

    // ── Card tap handlers ─────────────────────────────────────────────────────

    /** Tap on any stable card (own or opponent) */
    const handleStableCardTap = (cardID: CardID) => {
        // If in click_on_other_stable_card mode and card is a valid target → execute
        if (
            (cardInteraction?.key === 'click_on_other_stable_card' || cardInteraction?.key === 'card_to_card') &&
            cardInteraction.info.targets.find((t: any) => t.cardID === cardID)
        ) {
            playExecuteDoSound(boardStates.find(s => s.info?.instructionID === cardInteraction.info.instructionID)?.type);
            moves.executeDo(cardInteraction.info.instructionID, { protagonist: playerID, cardID });
            setCardInteraction(undefined);
            return;
        }

        // If card is a card_to_card source → initiate interaction
        const c2cState = _.first(boardStates.filter(s =>
            s.info?.sourceCardID === cardID &&
            (s.type === 'destroy__cardToCard' || s.type === 'steal__cardToCard' ||
                s.type === 'sacrifice__cardToCard' || s.type === 'move__cardToCard' ||
                s.type === 'returnToHand__cardToCard' || s.type === 'backKick__card_to_card' ||
                s.type === 'unicornswap1')
        ));
        if (c2cState) {
            setCardInteraction({
                key: 'card_to_card',
                info: {
                    sourceCardID: cardID,
                    instructionID: c2cState.info!.instructionID,
                    targets: c2cState.info!.targets!,
                    currentMousePosition: { x: 0, y: 0 },
                    startingMousePosition: { x: 0, y: 0 },
                },
            });
            return;
        }

        // card_to_player source
        const c2pState = _.first(boardStates.filter(s =>
            s.info?.sourceCardID === cardID &&
            (s.type === 'swapHands__cardToPlayer' || s.type === 'pullRandom__cardToPlayer' ||
                s.type === 'move2__cardToPlayer' || s.type === 'makeSomeoneDiscard__cardToPlayer' ||
                s.type === 'unicornswap2' || s.type === 'blatantThievery1')
        ));
        if (c2pState) {
            setCardInteraction({
                key: 'card_to_player',
                info: {
                    sourceCardID: cardID,
                    instructionID: c2pState.info!.instructionID,
                    targets: c2pState.info!.targets!,
                    currentMousePosition: { x: 0, y: 0 },
                    startingMousePosition: { x: 0, y: 0 },
                },
            });
            return;
        }

        // Cancel if tapping already-selected source
        if ((cardInteraction?.key === 'card_to_card' || cardInteraction?.key === 'card_to_player') &&
            cardInteraction.info.sourceCardID === cardID) {
            setCardInteraction(undefined);
            return;
        }

        // Single-action popup states for own stable
        handleSingleActionTap(cardID);
    };

    const handleSingleActionTap = (cardID: CardID) => {
        // discard__popup__ask
        let bs = boardStates.find(s => s.type === 'discard__popup__ask' && s.info?.sourceCardID === cardID);
        if (bs) {
            const { scene } = _findInstruction(G, bs.info!.instructionID)!;
            moves.commit(scene!.id);
            return;
        }
        // bring__popup__ask
        bs = boardStates.find(s => s.type === 'bring__popup__ask' && s.info?.sourceCardID === cardID);
        if (bs) {
            const { scene } = _findInstruction(G, bs.info!.instructionID)!;
            moves.commit(scene!.id);
            return;
        }
        // shakeUp / reset / shuffleDiscardPileIntoDrawPile
        bs = boardStates.find(s => (s.type === 'shakeUp' || s.type === 'reset' || s.type === 'shuffleDiscardPileIntoDrawPile') && s.info?.sourceCardID === cardID);
        if (bs) {
            moves.executeDo(bs.info!.instructionID, { protagonist: playerID, sourceCardID: cardID });
            return;
        }
        // revive
        bs = boardStates.find(s => s.type === 'revive' && s.info?.sourceCardID === cardID);
        if (bs) {
            setShowDiscardFinder(bs.info?.targets?.map((t: ReviveTarget) => ({ cardID: t.cardID })));
            return;
        }
        // reviveFromNursery
        bs = boardStates.find(s => s.type === 'reviveFromNursery' && s.info?.sourceCardID === cardID);
        if (bs) {
            setShowNurseryFinder(true);
            return;
        }
        // addFromDiscardPileToHand
        bs = boardStates.find(s => s.type === 'addFromDiscardPileToHand__single_action_popup' && s.info?.sourceCardID === cardID);
        if (bs) {
            setShowDiscardFinder(bs.info?.targets?.map((t: AddFromDiscardPileToHandTarget) => ({ cardID: t.cardID })));
            return;
        }
        // search
        bs = boardStates.find(s => s.type === 'search__single_action_popup' && s.info?.sourceCardID === cardID);
        if (bs) {
            setShowDeckFinder(bs.info?.targets);
            return;
        }
    };

    /** Tap on a player cell (not a specific card) */
    const handlePlayerTap = (targetPlayerID: string) => {
        if (cardInteraction?.key === 'card_to_player') {
            if (G.deck[cardInteraction.info.sourceCardID]?.title === 'Blatant Thievery') {
                setShowBlatantThievery(targetPlayerID);
                return;
            }
            if (cardInteraction.info.targets.find(t => t.playerID === targetPlayerID)) {
                moves.executeDo(cardInteraction.info.instructionID, { protagonist: playerID, playerID: targetPlayerID });
                setCardInteraction(undefined);
            }
        } else if (cardInteraction?.key === 'play_upgradeDowngradeCardFromHand__choose_target') {
            moves.playUpgradeDowngradeCard(playerID, targetPlayerID, cardInteraction.info.cardID);
            setCardInteraction(undefined);
        }
    };

    /** Drag-end from hand → decide what to play */
    const handleDragEnd = (result: DragResult) => {
        const { cardID, dropPlayerID, dropIsOwnStable } = result;
        const card = G.deck[cardID];

        // Neigh played from hand during neigh discussion
        if (boardStates.find(s => s.type === 'neigh__playNeigh')) {
            if (card.type === 'neigh' || card.type === 'super_neigh') {
                if (!G.playerEffects[playerID].find(e => e.effect.key === 'you_cannot_play_neigh')) {
                    if (card.type === 'super_neigh') {
                        moves.playSuperNeigh(cardID, playerID, G.neighDiscussion!.rounds.length - 1);
                    } else {
                        moves.playNeigh(cardID, playerID, G.neighDiscussion!.rounds.length - 1);
                    }
                }
                return;
            }
        }

        // Discard: drag card from hand
        if (boardStates.find(s => s.type === 'discard' || s.type === 'discard__popup__committed')) {
            const ds = boardStates.find(s => s.type === 'discard' || s.type === 'discard__popup__committed')!;
            if (ds.info!.targets!.find((t: DiscardTarget) => G.deck[G.hand[playerID][t.handIndex]]?.id === cardID)) {
                playExecuteDoSound(ds.type);
                moves.executeDo(ds.info!.instructionID, { protagonist: playerID, cardID });
                return;
            }
        }

        // Bring to stable: drag from hand
        if (boardStates.find(s => s.type === 'bring__popup__committed')) {
            const ds = boardStates.find(s => s.type === 'bring__popup__committed')!;
            if (ds.info!.targets!.find((t: BringToStableTarget) => t.cardID === cardID)) {
                moves.executeDo(ds.info!.instructionID, { protagonist: playerID, cardID });
                return;
            }
        }

        // Normal play
        if (!boardStates.find(s => s.type === 'playCard')) return;
        if (!canPlayCard(G, ctx, playerID, cardID)) return;

        if (card.type === 'upgrade' || card.type === 'downgrade') {
            // Upgrade/downgrade: need a target player
            if (dropPlayerID !== null) {
                moves.playUpgradeDowngradeCard(playerID, dropPlayerID, cardID);
            } else {
                // No specific target from drop — play to own stable by default
                moves.playUpgradeDowngradeCard(playerID, playerID, cardID);
            }
        } else {
            moves.playCard(playerID, cardID);
        }
    };

    /** Tap on a hand card (non-drag, second tap on peeked = play) */
    const handleHandCardTap = (cardID: CardID) => {
        const card = G.deck[cardID];

        // Neigh discussion
        if (boardStates.find(s => s.type === 'neigh__playNeigh')) {
            if ((card.type === 'neigh' || card.type === 'super_neigh') &&
                !G.playerEffects[playerID].find(e => e.effect.key === 'you_cannot_play_neigh')) {
                moves.playNeigh(cardID, playerID, G.neighDiscussion!.rounds.length - 1);
            }
            return;
        }

        // Discard
        const ds = boardStates.find(s => s.type === 'discard' || s.type === 'discard__popup__committed');
        if (ds) {
            if (ds.info!.targets!.find((t: DiscardTarget) => G.deck[G.hand[playerID][t.handIndex]]?.id === cardID)) {
                playExecuteDoSound(ds.type);
                moves.executeDo(ds.info!.instructionID, { protagonist: playerID, cardID });
            }
            return;
        }

        // Bring to stable
        const bs2 = boardStates.find(s => s.type === 'bring__popup__committed');
        if (bs2) {
            if (bs2.info!.targets!.find((t: BringToStableTarget) => t.cardID === cardID)) {
                moves.executeDo(bs2.info!.instructionID, { protagonist: playerID, cardID });
            }
            return;
        }

        // Play card
        if (boardStates.find(s => s.type === 'playCard')) {
            if (!canPlayCard(G, ctx, playerID, cardID)) return;
            if (card.type === 'upgrade' || card.type === 'downgrade') {
                // Upgrade/downgrade needs target selection — enter choose-target mode
                setCardInteraction({
                    key: 'play_upgradeDowngradeCardFromHand__choose_target',
                    info: {
                        instructionID: '____________',
                        currentMousePosition: { x: 0, y: 0 },
                        startingMousePosition: { x: 0, y: 0 },
                        cardID,
                    },
                });
            } else {
                moves.playCard(playerID, cardID);
            }
        }
    };

    // ── Game over overlay ─────────────────────────────────────────────────────
    const gameoverOverlay = ctx.gameover && !gameoverDismissed ? (() => {
        const isAborted = (ctx.gameover as any).aborted;
        const msg = isAborted
            ? 'Game was ended by host'
            : `"${G.players[parseInt((ctx.gameover as any).winner)]?.name ?? (ctx.gameover as any).winner}" wins!`;
        return (
            <GameOverOverlay>
                <GameOverCard>
                    <GameOverMessage>{msg}</GameOverMessage>
                    <ReturnBtn onTouchEnd={() => { window.location.href = '/lobby'; }} onClick={() => { window.location.href = '/lobby'; }}>Return to Lobby</ReturnBtn>
                    {!isAborted && <DismissBtn onTouchEnd={() => setGameoverDismissed(true)} onClick={() => setGameoverDismissed(true)}>View Board</DismissBtn>}
                </GameOverCard>
            </GameOverOverlay>
        );
    })() : null;

    // ── Pregame phase ─────────────────────────────────────────────────────────
    if (ctx.phase === 'pregame') {
        return <CharacterSelectionPage G={G} babyCards={_.first(G.deck, 13)} playerID={playerID} moves={moves} />;
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <AnimateSharedLayout>
            <Wrapper>
                <LandscapeGuard />

                {/* Modals / overlays (highest priority) */}
                <EscapeMenu
                    isOpen={escapeMenuOpen}
                    onClose={() => setEscapeMenuOpen(false)}
                    isOwner={G.owner === playerID}
                    isCurrentPlayer={ctx.currentPlayer === playerID}
                    playerID={playerID}
                    G={G}
                    ctx={ctx}
                    moves={moves}
                />
                {gameoverOverlay}

                {/* Card detail overlay (long-press) */}
                <MobileCardDetail card={detailCard} onClose={() => setDetailCard(undefined)} />

                {/* Finder overlays */}
                {showDeckFinder && (
                    <MobileFinder
                        cards={showDeckFinder.map(s => G.deck[s.cardID])}
                        showBackButton={false}
                        onBackClick={() => setShowDeckFinder(undefined)}
                        onCardClick={cardID => {
                            const bs = boardStates.find(o => o.type === 'search__single_action_popup')!;
                            const { instruction } = _findInstruction(G, bs.info!.instructionID)!;
                            moves.executeDo(instruction.id, { protagonist: playerID, cardID });
                            setShowDeckFinder(undefined);
                            setCardInteraction(undefined);
                        }}
                    />
                )}
                {showDiscardFinder && (
                    <MobileFinder
                        cards={showDiscardFinder.map(c => G.deck[c.cardID])}
                        onBackClick={() => setShowDiscardFinder(undefined)}
                        onCardClick={cardID => {
                            const state = boardStates.find(s => s.type === 'revive' || s.type === 'addFromDiscardPileToHand__single_action_popup');
                            if (state) {
                                moves.executeDo(state.info?.instructionID, { protagonist: playerID, cardID });
                                setShowDiscardFinder(undefined);
                            }
                        }}
                    />
                )}
                {showNurseryFinder && (
                    <MobileFinder
                        cards={G.nursery.map(c => G.deck[c])}
                        onBackClick={() => setShowNurseryFinder(false)}
                        onCardClick={cardID => {
                            const state = boardStates.find(s => s.type === 'reviveFromNursery');
                            if (state) {
                                moves.executeDo(state.info?.instructionID, { protagonist: playerID, cardID });
                                setShowNurseryFinder(false);
                            }
                        }}
                    />
                )}
                {showPlayerHand !== undefined && (
                    <MobileFinder
                        cards={G.hand[showPlayerHand].map(c => G.deck[c])}
                        showBackButton={true}
                        onBackClick={() => setShowPlayerHand(undefined)}
                        onCardClick={() => { }}
                        hide={G.playerEffects[showPlayerHand].find(o => o.effect.key === 'your_hand_is_visible') === undefined}
                    />
                )}
                {showBlatantThievery !== undefined && (
                    <MobileFinder
                        cards={G.hand[showBlatantThievery].map(c => G.deck[c])}
                        showBackButton={false}
                        onBackClick={() => undefined}
                        title="Tap a card to take it."
                        onCardClick={cardID => {
                            const handIndex = G.hand[showBlatantThievery].findIndex(c => c === cardID);
                            moves.executeDo(cardInteraction?.info.instructionID, { protagonist: playerID, handIndex, from: showBlatantThievery });
                            setShowBlatantThievery(undefined);
                            setCardInteraction(undefined);
                        }}
                    />
                )}

                {/* Neigh modal */}
                <AnimatePresence>
                    {neighProps && (
                        <MobileNeighModal key="neigh-modal" {...neighProps} />
                    )}
                </AnimatePresence>

                {/* Main board */}
                <MobileInfoBar
                    G={G}
                    ctx={ctx}
                    playerID={playerID}
                    moves={moves}
                    boardStates={boardStates}
                    onShowNursery={() => setShowNurseryFinder(true)}
                    onShowDiscard={() => setShowDiscardFinder(G.discardPile.map(c => ({ cardID: c })))}
                    onEscapeMenu={() => setEscapeMenuOpen(prev => !prev)}
                    playDrawCardSound={playDrawCardSound}
                    playEndTurnSound={playEndTurnButtonSound}
                />

                <MobilePlayerField
                    G={G}
                    ctx={ctx}
                    playerID={playerID}
                    boardStates={boardStates}
                    cardInteraction={cardInteraction}
                    glowingCardIDs={glowingCardIDs}
                    highlightMode={highlightMode}
                    isTargetMode={isTargetMode}
                    onCardTap={handleStableCardTap}
                    onPlayerTap={handlePlayerTap}
                    onCardLongPress={card => setDetailCard(card)}
                />

                <MobileHand
                    cards={G.hand[playerID].map(c => G.deck[c]).filter(Boolean)}
                    glowingCards={glowingHandCards}
                    onDragEnd={handleDragEnd}
                    onCardLongPress={card => setDetailCard(card)}
                />
            </Wrapper>
        </AnimateSharedLayout>
    );
};

// ── Styled components ─────────────────────────────────────────────────────────

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
