import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import type { GameState } from '../game/engine';
import { cardView, playerName } from '../view/cards';
import type { BoardController } from '../view/useBoard';
import ImageLoader from '../assets/card/imageLoader';

type Props = {
    G: GameState;
    board: BoardController;
    onShowNursery: () => void;
    onShowDiscard: () => void;
    onEscapeMenu: () => void;
    onShowLog: () => void;
    logBadgeCount: number;
    playDrawCardSound: () => void;
    playEndTurnSound: () => void;
};

// The top bar of the mobile board: the piles, one line about what to do (from the shared view layer),
// End Turn, the game log and the menu.
const MobileInfoBar = ({ G, board, onShowNursery, onShowDiscard, onEscapeMenu, onShowLog, logBadgeCount, playDrawCardSound, playEndTurnSound }: Props) => {
    const { model } = board;
    const nursery = G.zones.nursery;
    const discard = G.zones.discard;
    const fallbackText = !model.started
        ? undefined
        : model.isMyTurn ? 'Your turn' : `${playerName(G, model.turnPlayer)}'s turn`;

    const handleDrawTap = () => {
        if (board.clickDeck()) playDrawCardSound();
    };
    const handleEndTurn = () => {
        playEndTurnSound();
        board.endTurn();
    };

    return (
        <Bar>
            <PileRow>
                <PileBtn isGlowing={board.deck !== undefined} onTouchEnd={e => { e.preventDefault(); handleDrawTap(); }} onClick={handleDrawTap} title="Draw pile">
                    <PileImg src={ImageLoader.load('back')} alt="Deck" />
                    <PileCount>{G.zones.deck.length}</PileCount>
                </PileBtn>
                <PileBtn isGlowing={false} onTouchEnd={e => { e.preventDefault(); onShowNursery(); }} onClick={onShowNursery} title="Nursery">
                    {nursery.length > 0
                        ? <PileImg src={ImageLoader.load(cardView(G, nursery[nursery.length - 1]).image)} alt="Nursery" />
                        : <PileImg src={ImageLoader.load('back')} alt="Nursery" style={{ opacity: 0.4 }} />
                    }
                    <PileCount>{nursery.length}</PileCount>
                </PileBtn>
                <PileBtn isGlowing={false} onTouchEnd={e => { e.preventDefault(); onShowDiscard(); }} onClick={onShowDiscard} title="Discard pile">
                    {discard.length > 0
                        ? <PileImg src={ImageLoader.load(cardView(G, discard[discard.length - 1]).image)} alt="Discard" />
                        : <PileImg src={ImageLoader.load('back')} alt="Discard" style={{ opacity: 0.4 }} />
                    }
                    <PileCount>{discard.length}</PileCount>
                </PileBtn>
            </PileRow>

            <InfoText>
                {board.info ?? fallbackText}
            </InfoText>

            <RightRow>
                {board.canEndTurn && (
                    <EndTurnBtn
                        onTouchEnd={e => { e.preventDefault(); handleEndTurn(); }}
                        onClick={handleEndTurn}
                    >
                        End Turn
                    </EndTurnBtn>
                )}
                <LogBtnWrapper
                    onTouchEnd={e => { e.preventDefault(); onShowLog(); }}
                    onClick={onShowLog}
                    title="Game log"
                >
                    <LogBtnIcon>📋</LogBtnIcon>
                    {logBadgeCount > 0 && <LogBadge>{logBadgeCount > 9 ? '9+' : logBadgeCount}</LogBadge>}
                </LogBtnWrapper>
                <MenuBtn
                    onTouchEnd={e => { e.preventDefault(); onEscapeMenu(); }}
                    onClick={onEscapeMenu}
                >
                    &#9776;
                </MenuBtn>
            </RightRow>
        </Bar>
    );
};

const Bar = styled.div`
    width: 100%;
    height: 52px;
    background: rgba(0,0,0,0.75);
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 0 6px;
    gap: 5px;
    flex-shrink: 0;
    z-index: 200;
    box-sizing: border-box;
`;

const PileRow = styled.div`
    display: flex;
    flex-direction: row;
    gap: 3px;
    flex-shrink: 0;
`;

const glow = keyframes`
    from { box-shadow: 0 0 8px #f0f, 0 0 4px red; }
    to   { box-shadow: 0 0 8px #0ff, 0 0 4px #f0f; }
`;

const PileBtn = styled.div<{ isGlowing: boolean }>`
    width: 39px;
    height: 44px;
    position: relative;
    cursor: pointer;
    border-radius: 5px;
    overflow: hidden;
    border: 2px solid ${p => p.isGlowing ? '#f0f' : 'rgba(255,255,255,0.2)'};
    animation: ${p => p.isGlowing ? css`${glow} 0.8s infinite alternate` : 'none'};
    flex-shrink: 0;
`;

const PileImg = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const PileCount = styled.div`
    position: absolute;
    bottom: 0;
    right: 0;
    background: rgba(0,0,0,0.7);
    color: white;
    font-size: 9px;
    font-weight: 700;
    padding: 1px 3px;
    border-radius: 2px 0 0 0;
    font-family: 'Nunito', sans-serif;
`;

const InfoText = styled.div`
    flex: 1;
    color: rgba(255,255,255,0.9);
    font-size: 10px;
    font-family: 'Nunito', sans-serif;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 4px;
    min-width: 0;
`;

const RightRow = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
`;

const EndTurnBtn = styled.div`
    background: linear-gradient(135deg, #FF4450, #C80000);
    color: white;
    font-size: 10px;
    font-weight: 800;
    font-family: 'Nunito', sans-serif;
    padding: 4px 8px;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
`;

const MenuBtn = styled.div`
    color: white;
    font-size: 16px;
    cursor: pointer;
    padding: 4px 6px;
    -webkit-tap-highlight-color: transparent;
`;

const LogBtnWrapper = styled.div`
    position: relative;
    cursor: pointer;
    padding: 4px 6px;
    -webkit-tap-highlight-color: transparent;
    display: flex;
    align-items: center;
`;

const LogBtnIcon = styled.span`
    font-size: 16px;
    line-height: 1;
`;

const LogBadge = styled.span`
    position: absolute;
    top: 0;
    right: 0;
    background: #FF4450;
    color: white;
    font-family: 'Nunito', sans-serif;
    font-size: 8px;
    font-weight: 800;
    border-radius: 6px;
    padding: 1px 3px;
    line-height: 1;
    min-width: 12px;
    text-align: center;
`;

export default MobileInfoBar;
