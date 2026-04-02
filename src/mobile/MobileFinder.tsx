import React, { useContext, useState } from 'react';
import styled from 'styled-components';
import { Card, CardID } from '../game/card';
import ImageLoader from '../assets/card/imageLoader';
import { _typeToColor } from '../ui/util';
import MobileCardDetail from './MobileCardDetail';
import { useLongPress } from '../hooks/useLongPress';
import BG from '../assets/ui/board-background.jpg';

type Props = {
    cards: Card[];
    hide?: boolean;
    title?: string;
    showBackButton?: boolean;
    onBackClick: () => void;
    onCardClick: (cardID: CardID) => void;
};

const CardEntry = ({ card, hide, onTap, onLongPress }: {
    card: Card;
    hide: boolean;
    onTap: () => void;
    onLongPress: () => void;
}) => {
    const lp = useLongPress(onLongPress);
    return (
        <CardItem
            {...lp}
            onTouchEnd={e => {
                e.preventDefault();
                const fired = lp.onTouchEnd();
                if (!fired) onTap();
            }}
            onClick={onTap}
        >
            <CardImg
                src={hide ? ImageLoader.load('back') : ImageLoader.load(card.image)}
                color={hide ? '#555' : _typeToColor(card.type)}
                alt={card.title}
            />
            {!hide && <CardName>{card.title}</CardName>}
        </CardItem>
    );
};

const MobileFinder = ({ cards, hide = false, title, showBackButton = true, onBackClick, onCardClick }: Props) => {
    const [detailCard, setDetailCard] = useState<Card | undefined>(undefined);

    return (
        <Wrapper>
            <TopBar>
                {showBackButton && (
                    <BackBtn
                        onTouchEnd={e => { e.preventDefault(); onBackClick(); }}
                        onClick={onBackClick}
                    >
                        Back
                    </BackBtn>
                )}
                {title && <Title>{title}</Title>}
            </TopBar>

            <Grid>
                {cards.map(card => (
                    <CardEntry
                        key={card.id}
                        card={card}
                        hide={hide}
                        onTap={() => onCardClick(card.id)}
                        onLongPress={() => !hide && setDetailCard(card)}
                    />
                ))}
            </Grid>

            <MobileCardDetail card={detailCard} onClose={() => setDetailCard(undefined)} />
        </Wrapper>
    );
};

const Wrapper = styled.div`
    position: fixed;
    inset: 0;
    background-image: url(${BG});
    background-size: cover;
    z-index: 100000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const TopBar = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 10px 12px;
    background: rgba(0,0,0,0.7);
    gap: 12px;
    flex-shrink: 0;
`;

const BackBtn = styled.div`
    background: rgba(255,255,255,0.15);
    color: white;
    font-size: 13px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    flex-shrink: 0;
`;

const Title = styled.div`
    color: #F8B500;
    font-size: 13px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    flex: 1;
`;

const Grid = styled.div`
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px;
    overflow-y: auto;
    align-content: flex-start;
`;

const CardItem = styled.div`
    width: calc(33.333% - 6px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
`;

const CardImg = styled.img<{ color: string }>`
    width: 100%;
    aspect-ratio: 4/5;
    border-radius: 8px;
    border: 2px solid ${p => p.color};
    object-fit: cover;
    display: block;
`;

const CardName = styled.div`
    font-size: 9px;
    color: white;
    font-family: 'Nunito', sans-serif;
    font-weight: 700;
    text-align: center;
    line-height: 1.2;
`;

export default MobileFinder;
