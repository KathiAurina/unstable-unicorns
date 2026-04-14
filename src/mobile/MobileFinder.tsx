import React, { useState } from 'react';
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
    browseOnly?: boolean;
    onBackClick: () => void;
    onCardClick: (cardID: CardID) => void;
};

const CardEntry = ({ card, hide, browseOnly, onTap, onLongPress }: {
    card: Card;
    hide: boolean;
    browseOnly: boolean;
    onTap: () => void;
    onLongPress: () => void;
}) => {
    // browseOnly: tap = show detail, long press = no-op
    // action mode: tap = game action, long press = show detail
    const lpCallback = browseOnly ? () => {} : onLongPress;
    const tapCallback = browseOnly ? onLongPress : onTap;
    const lp = useLongPress(lpCallback);
    return (
        <CardItem
            {...lp}
            onTouchStart={e => {
                e.preventDefault(); // prevent image save context menu
                lp.onTouchStart(e);
            }}
            onTouchEnd={e => {
                e.preventDefault();
                const fired = lp.onTouchEnd();
                if (!fired) tapCallback();
            }}
            onContextMenu={e => e.preventDefault()}
            onClick={tapCallback}
        >
            <CardImg
                src={hide ? ImageLoader.load('back') : ImageLoader.load(card.image)}
                color={hide ? '#555' : _typeToColor(card.type)}
                alt={card.title}
            />
        </CardItem>
    );
};

const MobileFinder = ({ cards, hide = false, title, showBackButton = true, browseOnly = false, onBackClick, onCardClick }: Props) => {
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
                        browseOnly={browseOnly}
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
    gap: 4px;
    padding: 6px;
    overflow-y: auto;
    align-content: flex-start;
`;

const CardItem = styled.div`
    width: calc(10% - 3.6px);
    display: flex;
    flex-direction: column;
    align-items: center;
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

export default MobileFinder;
