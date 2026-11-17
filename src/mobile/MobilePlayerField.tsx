import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import type { CardID, GameState, PlayerID } from '../game/engine';
import type { CardView } from '../view/cards';
import { cardViews, stableUnicorns, stableUpgrades } from '../view/cards';
import MobileStable from './MobileStable';

type Props = {
    G: GameState;
    playerID: string;               // local player
    /** Whose turn it is. */
    turnPlayer: PlayerID;
    /** Cards a tap does something on (board.marks). */
    glowingCardIDs: CardID[];
    highlightMode: CardID[] | undefined;
    /** Players a tap does something on (board.targets). */
    targetPlayers: PlayerID[];
    isTargetMode: boolean;
    onCardTap: (cardID: CardID) => void;
    onPlayerTap: (targetPlayerID: string) => void;
    onCardLongPress: (card: CardView) => void;
};

const PLAYERS_PER_PAGE = 4;

const MobilePlayerField = ({
    G, playerID, turnPlayer, glowingCardIDs, highlightMode, targetPlayers, isTargetMode,
    onCardTap, onPlayerTap, onCardLongPress,
}: Props) => {
    const [page, setPage] = useState(0);
    const swipeStartX = useRef<number | null>(null);

    const allPlayers = G.players; // includes own player
    const totalPages = Math.ceil(allPlayers.length / PLAYERS_PER_PAGE);

    // Current page of 4 players
    const startIdx = page * PLAYERS_PER_PAGE;
    const pagePlayers = allPlayers.slice(startIdx, startIdx + PLAYERS_PER_PAGE);

    return (
        <Container>
            {totalPages > 1 && (
                <NavArrow
                    disabled={page === 0}
                    onTouchEnd={e => { e.preventDefault(); if (page > 0) setPage(p => p - 1); }}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                >
                    &lt;
                </NavArrow>
            )}

            <Grid
                cols={Math.min(pagePlayers.length, 2)}
                onTouchStart={e => { swipeStartX.current = e.touches[0].clientX; }}
                onTouchEnd={e => {
                    if (swipeStartX.current === null) return;
                    const dx = e.changedTouches[0].clientX - swipeStartX.current;
                    swipeStartX.current = null;
                    if (dx < -50 && page < totalPages - 1) setPage(p => p + 1);
                    else if (dx > 50 && page > 0) setPage(p => p - 1);
                }}
            >
                {pagePlayers.map(pl => {
                    const stableCards = cardViews(G, stableUnicorns(G, pl.id));
                    const upgradeDowngradeCards = cardViews(G, stableUpgrades(G, pl.id));

                    const isOwn = pl.id === playerID;
                    const isValidTarget = targetPlayers.includes(pl.id);

                    return (
                        <PlayerCell
                            key={pl.id}
                            isValidTarget={isValidTarget}
                            onTouchEnd={e => {
                                // Only fire player-level tap if we didn't tap a card
                                const target = e.target as HTMLElement;
                                if (!target.closest('[data-card-id]')) {
                                    e.preventDefault();
                                    onPlayerTap(pl.id);
                                }
                            }}
                            onClick={e => {
                                const target = e.target as HTMLElement;
                                if (!target.closest('[data-card-id]')) {
                                    onPlayerTap(pl.id);
                                }
                            }}
                        >
                            <PlayerHeader>
                                <PlayerName isCurrent={pl.id === turnPlayer}>{isOwn ? 'You' : pl.name}</PlayerName>
                                <HandCount>{G.zones.hand[pl.id]?.length ?? 0} cards</HandCount>
                            </PlayerHeader>
                            <MobileStable
                                cards={stableCards}
                                upgradeDowngradeCards={upgradeDowngradeCards}
                                glowingCardIDs={glowingCardIDs}
                                highlightMode={highlightMode}
                                isOwnStable={isOwn}
                                playerID={pl.id}
                                label={isOwn ? 'Your Stable' : `${pl.name}'s Stable`}
                                isCurrentPlayer={pl.id === turnPlayer}
                                isTargetMode={isTargetMode}
                                onCardTap={onCardTap}
                                onCardLongPress={onCardLongPress}
                            />
                        </PlayerCell>
                    );
                })}
            </Grid>

            {totalPages > 1 && (
                <NavArrow
                    disabled={page >= totalPages - 1}
                    onTouchEnd={e => { e.preventDefault(); if (page < totalPages - 1) setPage(p => p + 1); }}
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                >
                    &gt;
                </NavArrow>
            )}
        </Container>
    );
};

const Container = styled.div`
    flex: 1;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    min-height: 0;
    padding: 4px 0;
    gap: 0;
`;

const NavArrow = styled.div<{ disabled: boolean }>`
    width: 36px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${p => p.disabled ? 'rgba(255,255,255,0.2)' : 'white'};
    font-size: 24px;
    font-weight: 700;
    cursor: ${p => p.disabled ? 'default' : 'pointer'};
    -webkit-tap-highlight-color: transparent;
    user-select: none;
`;

const Grid = styled.div<{ cols: number }>`
    flex: 1;
    display: grid;
    grid-template-columns: repeat(${p => p.cols}, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 4px;
    min-height: 0;
    padding: 0 4px;
`;

const PlayerCell = styled.div<{ isValidTarget: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-radius: 8px;
    padding: 4px;
    background: rgba(0,0,0,0.3);
    border: 2px solid ${p => p.isValidTarget ? '#4CAF50' : 'rgba(255,255,255,0.08)'};
    box-shadow: ${p => p.isValidTarget ? '0 0 8px rgba(76,175,80,0.6)' : 'none'};
    overflow: hidden;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: border-color 0.15s;
`;

const PlayerHeader = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
`;

const PlayerName = styled.div<{ isCurrent: boolean }>`
    font-size: 10px;
    font-weight: 800;
    color: ${p => p.isCurrent ? '#F8B500' : 'white'};
    font-family: 'Nunito', sans-serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const HandCount = styled.div`
    font-size: 9px;
    color: rgba(255,255,255,0.6);
    font-family: 'Nunito', sans-serif;
    flex-shrink: 0;
`;

export default MobilePlayerField;
