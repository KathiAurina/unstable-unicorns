import React, { useRef, useState } from 'react';
import type { CardView, CardID } from '../view/cards';
import styled from 'styled-components';
import ImageLoader from '../assets/card/imageLoader';
import { _typeToColor } from '../ui/util';
import MobileCardDetail from './MobileCardDetail';
import { useLongPress } from '../hooks/useLongPress';
import BG from '../assets/ui/board-background.jpg';

type Props = {
    cards: CardView[];
    hide?: boolean;
    title?: string;
    showBackButton?: boolean;
    browseOnly?: boolean;
    onBackClick: () => void;
    onFailToFindClick?: () => void;
    /** Label of the fail/skip button (default "Fail to Find"). */
    failLabel?: string;
    onCardClick: (cardID: CardID) => void;
    /** Cards picked so far for a prompt that asks for several. */
    selected?: CardID[];
    /** More controls in the top bar, e.g. the Confirm button of a multi-card prompt. */
    extra?: React.ReactNode;
};

const CardEntry = ({ card, hide, isSelected, browseOnly, onTap, onLongPress }: {
    card: CardView;
    hide: boolean;
    isSelected: boolean;
    browseOnly: boolean;
    onTap: () => void;
    onLongPress: () => void;
}) => {
    // browseOnly: tap = show detail, long press = no-op
    // action mode: tap = game action, long press = show detail
    const lpCallback = browseOnly ? () => {} : onLongPress;
    const tapCallback = browseOnly ? onLongPress : onTap;
    const lp = useLongPress(lpCallback);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    return (
        <CardItem
            onTouchStart={e => {
                touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                lp.onTouchStart(e);
                // no preventDefault here — allows native scroll on the grid
            }}
            onTouchMove={lp.onTouchMove}
            onTouchEnd={e => {
                e.preventDefault(); // prevent synthesized click after touch
                const fired = lp.onTouchEnd();
                if (!fired && touchStartRef.current) {
                    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
                    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
                    if (Math.sqrt(dx * dx + dy * dy) < 10) tapCallback();
                }
            }}
            onContextMenu={e => e.preventDefault()}
            onClick={tapCallback}
        >
            <CardImg
                src={hide ? ImageLoader.load('back') : ImageLoader.load(card.image)}
                color={hide ? '#555' : _typeToColor(card.type)}
                isSelected={isSelected}
                alt={card.title}
            />
        </CardItem>
    );
};

const MobileFinder = ({
    cards, hide = false, title, showBackButton = true, browseOnly = false,
    onBackClick, onFailToFindClick, failLabel = 'Fail to Find', onCardClick, selected = [], extra,
}: Props) => {
    const [detailCard, setDetailCard] = useState<CardView | undefined>(undefined);

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
                {onFailToFindClick && (
                    <FailBtn
                        onTouchEnd={e => { e.preventDefault(); onFailToFindClick(); }}
                        onClick={onFailToFindClick}
                    >
                        {failLabel}
                    </FailBtn>
                )}
                {title && <Title>{title}</Title>}
                {extra}
            </TopBar>

            <Grid>
                {cards.map(card => (
                    <CardEntry
                        key={card.id}
                        card={card}
                        hide={hide}
                        isSelected={selected.includes(card.id)}
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

const FailBtn = styled.div`
    background: rgba(192,57,43,0.85);
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

const CardImg = styled.img<{ color: string; isSelected: boolean }>`
    width: 100%;
    aspect-ratio: 4/5;
    border-radius: 8px;
    border: 2px solid ${p => p.isSelected ? '#4CAF50' : p.color};
    box-shadow: ${p => p.isSelected ? '0 0 8px 2px rgba(76,175,80,0.9)' : 'none'};
    object-fit: cover;
    display: block;
`;

export default MobileFinder;
