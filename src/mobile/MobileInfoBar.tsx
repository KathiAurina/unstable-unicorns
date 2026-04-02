import React, { useContext } from 'react';
import styled, { css, keyframes } from 'styled-components';
import type { UnstableUnicornsGame, Ctx } from '../game/state';
import { _findOpenScenesWithProtagonist, _findInProgressScenesWithProtagonist } from '../game/state';
import type { Moves } from '../game/types';
import { BoardState } from '../BoardStateManager';
import ImageLoader from '../assets/card/imageLoader';

type Props = {
    G: UnstableUnicornsGame;
    ctx: Ctx;
    playerID: string;
    moves: Moves;
    boardStates: BoardState[];
    onShowNursery: () => void;
    onShowDiscard: () => void;
    onEscapeMenu: () => void;
    playDrawCardSound: () => void;
    playEndTurnSound: () => void;
};

function getInfoText(G: UnstableUnicornsGame, ctx: Ctx, playerID: string, boardStates: BoardState[]): string | undefined {
    const openScenes = _findOpenScenesWithProtagonist(G, playerID);
    const scenesInProgress = _findInProgressScenesWithProtagonist(G, playerID);

    if (ctx.currentPlayer === playerID && ctx.activePlayers![playerID] === 'beginning' && openScenes.length > 0) {
        return 'Activate your card effect or skip and draw a card.';
    }
    if (ctx.currentPlayer === playerID && ctx.activePlayers![playerID] === 'beginning' && scenesInProgress.length > 0) {
        return 'Activate your mandatory card effect before drawing.';
    }
    if (playerID === ctx.currentPlayer && G.countPlayedCardsInActionPhase === 0 && !G.neighDiscussion && ctx.activePlayers![playerID] === 'action_phase') {
        return 'Drag a card from hand to play it, or tap the deck to draw.';
    }
    if (boardStates.find(o => o.type === 'discard' || o.type === 'discard__popup__committed')) return 'Tap a card in your hand to discard it.';
    if (boardStates.find(o => o.type === 'destroy__click_on_card_in_stable')) return 'Tap a card in a stable to destroy it.';
    if (boardStates.find(o => o.type === 'sacrifice__clickOnCardInStable')) return 'Tap a card in your stable to sacrifice it.';
    if (boardStates.find(o => o.type === 'steal__cardToCard')) {
        const bs = boardStates.find(o => o.type === 'steal__cardToCard')!;
        return `Tap ${G.deck[bs.info!.sourceCardID!].title} then tap the card to steal.`;
    }
    if (boardStates.find(o => o.type === 'draw__clickOnDrawPile')) {
        const bs = boardStates.find(o => o.type === 'draw__clickOnDrawPile');
        return `Tap the deck to draw ${bs?.info?.count} card(s).`;
    }
    if (boardStates.find(o => o.type === 'swapHands__cardToPlayer')) {
        const bs = boardStates.find(o => o.type === 'swapHands__cardToPlayer')!;
        return `Tap ${G.deck[bs.info!.sourceCardID!].title} then tap a player to swap hands.`;
    }
    if (boardStates.find(o => o.type === 'move__cardToCard')) {
        const bs = boardStates.find(o => o.type === 'move__cardToCard')!;
        return `Tap ${G.deck[bs.info!.sourceCardID!].title} then tap the target card.`;
    }
    if (boardStates.find(o => o.type === 'move2__cardToPlayer')) {
        const bs = boardStates.find(o => o.type === 'move2__cardToPlayer')!;
        return `Tap ${G.deck[bs.info!.sourceCardID!].title} then tap a player.`;
    }
    if (boardStates.find(o => o.type === 'wait_for_other_players')) return 'Waiting for other players...';
    if (boardStates.find(o => o.type === 'unicornswap1')) {
        const bs = boardStates.find(o => o.type === 'unicornswap1')!;
        return `Tap ${G.deck[bs.info!.sourceCardID!].title} then tap the card to move.`;
    }
    if (boardStates.find(o => o.type === 'unicornswap2')) {
        const bs = boardStates.find(o => o.type === 'unicornswap2')!;
        return `Tap ${G.deck[bs.info!.sourceCardID!].title} then tap a player.`;
    }
    if (boardStates.find(o => o.type === 'blatantThievery1')) {
        const bs = boardStates.find(o => o.type === 'blatantThievery1')!;
        return `Tap ${G.deck[bs.info!.sourceCardID!].title} then tap a player.`;
    }
    if (boardStates.find(o => o.type === 'pullRandom__cardToPlayer')) {
        const bs = boardStates.find(o => o.type === 'pullRandom__cardToPlayer')!;
        return `Tap ${G.deck[bs.info!.sourceCardID!].title} then tap a player.`;
    }
    if (boardStates.find(o => o.type === 'makeSomeoneDiscard__cardToPlayer')) {
        const bs = boardStates.find(o => o.type === 'makeSomeoneDiscard__cardToPlayer')!;
        return `Tap ${G.deck[bs.info!.sourceCardID!].title} then tap a player to force discard.`;
    }
    return undefined;
}

const MobileInfoBar = ({ G, ctx, playerID, moves, boardStates, onShowNursery, onShowDiscard, onEscapeMenu, playDrawCardSound, playEndTurnSound }: Props) => {
    const canDraw = !!(boardStates.find(s => s.type === 'drawCard' || s.type === 'draw__clickOnDrawPile'));
    const canEndTurn = !!(boardStates.find(s => s.type === 'endTurn'));
    const infoText = getInfoText(G, ctx, playerID, boardStates);

    const handleDrawTap = () => {
        if (boardStates.find(s => s.type === 'drawCard')) {
            playDrawCardSound();
            if (ctx.activePlayers![playerID] === 'beginning') {
                moves.drawAndAdvance();
            } else {
                moves.drawAndEnd(playerID);
            }
        } else if (boardStates.find(s => s.type === 'draw__clickOnDrawPile')) {
            playDrawCardSound();
            const bs = boardStates.find(s => s.type === 'draw__clickOnDrawPile')!;
            moves.executeDo(bs.info!.instructionID, { protagonist: playerID, count: bs.info!.count });
        }
    };

    return (
        <Bar>
            <PileRow>
                <PileBtn isGlowing={canDraw} onTouchEnd={e => { e.preventDefault(); handleDrawTap(); }} onClick={handleDrawTap} title="Draw pile">
                    <PileImg src={ImageLoader.load('back')} alt="Deck" />
                    <PileCount>{G.drawPile.length}</PileCount>
                </PileBtn>
                <PileBtn isGlowing={false} onTouchEnd={e => { e.preventDefault(); onShowNursery(); }} onClick={onShowNursery} title="Nursery">
                    {G.nursery.length > 0
                        ? <PileImg src={ImageLoader.load(G.deck[G.nursery[G.nursery.length - 1]].image)} alt="Nursery" />
                        : <PileImg src={ImageLoader.load('back')} alt="Nursery" style={{ opacity: 0.4 }} />
                    }
                    <PileCount>{G.nursery.length}</PileCount>
                </PileBtn>
                <PileBtn isGlowing={false} onTouchEnd={e => { e.preventDefault(); onShowDiscard(); }} onClick={onShowDiscard} title="Discard pile">
                    {G.discardPile.length > 0
                        ? <PileImg src={ImageLoader.load(G.deck[G.discardPile[G.discardPile.length - 1]].image)} alt="Discard" />
                        : <PileImg src={ImageLoader.load('back')} alt="Discard" style={{ opacity: 0.4 }} />
                    }
                    <PileCount>{G.discardPile.length}</PileCount>
                </PileBtn>
            </PileRow>

            <InfoText>{infoText ?? (ctx.currentPlayer === playerID ? "Your turn" : `${G.players[parseInt(ctx.currentPlayer)]?.name ?? '?'}'s turn`)}</InfoText>

            <RightRow>
                {canEndTurn && (
                    <EndTurnBtn
                        onTouchEnd={e => { e.preventDefault(); playEndTurnSound(); moves.end(playerID); }}
                        onClick={() => { playEndTurnSound(); moves.end(playerID); }}
                    >
                        End Turn
                    </EndTurnBtn>
                )}
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
    height: 40px;
    background: rgba(0,0,0,0.75);
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 0 4px;
    gap: 4px;
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
    width: 30px;
    height: 34px;
    position: relative;
    cursor: pointer;
    border-radius: 4px;
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
    font-size: 8px;
    font-weight: 700;
    padding: 1px 2px;
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

export default MobileInfoBar;
