import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Card, CardID } from '../game/card';
import ImageLoader from '../assets/card/imageLoader';
import { _typeToColor } from '../ui/util';
import { useLongPress } from '../hooks/useLongPress';

type Props = {
    // Cards in the stable (unicorns + temporaryStable)
    cards: Card[];
    upgradeDowngradeCards: Card[];
    glowingCardIDs: CardID[];
    highlightMode?: CardID[];
    isOwnStable: boolean;
    playerID: string;         // the owner of this stable
    label: string;
    isCurrentPlayer: boolean;
    onCardTap: (cardID: CardID) => void;
    onCardLongPress: (card: Card) => void;
    // Drop target - data attributes placed on stable container
};

const CardItem = ({ card, isGlowing, isTranslucent, onTap, onLongPress }: {
    card: Card;
    isGlowing: boolean;
    isTranslucent: boolean;
    onTap: () => void;
    onLongPress: () => void;
}) => {
    const lp = useLongPress(onLongPress);
    return (
        <CardWrapper
            {...lp}
            onTouchEnd={e => {
                const fired = lp.onTouchEnd();
                if (!fired) onTap();
            }}
            onClick={onTap}
        >
            <CardImg
                layoutId={`${card.id}`}
                src={ImageLoader.load(card.image)}
                color={_typeToColor(card.type)}
                isGlowing={isGlowing}
                isTranslucent={isTranslucent}
                alt={card.title}
            />
        </CardWrapper>
    );
};

const MobileStable = ({
    cards, upgradeDowngradeCards, glowingCardIDs, highlightMode,
    isOwnStable, playerID, label, isCurrentPlayer,
    onCardTap, onCardLongPress,
}: Props) => {
    return (
        <Container
            isOwnStable={isOwnStable}
            isCurrentPlayer={isCurrentPlayer}
            data-drop-stable={isOwnStable ? 'own' : 'player'}
            data-player-id={playerID}
        >
            <Label isOwnStable={isOwnStable}>{label}</Label>
            {upgradeDowngradeCards.length > 0 && (
                <UpgradeRow>
                    {upgradeDowngradeCards.map(card => (
                        <CardItem
                            key={card.id}
                            card={card}
                            isGlowing={glowingCardIDs.includes(card.id)}
                            isTranslucent={highlightMode ? !highlightMode.includes(card.id) : false}
                            onTap={() => onCardTap(card.id)}
                            onLongPress={() => onCardLongPress(card)}
                        />
                    ))}
                </UpgradeRow>
            )}
            <StableGrid>
                {cards.map(card => (
                    <CardItem
                        key={card.id}
                        card={card}
                        isGlowing={glowingCardIDs.includes(card.id)}
                        isTranslucent={highlightMode ? !highlightMode.includes(card.id) : false}
                        onTap={() => onCardTap(card.id)}
                        onLongPress={() => onCardLongPress(card)}
                    />
                ))}
                {cards.length === 0 && (
                    <EmptyHint>Empty</EmptyHint>
                )}
            </StableGrid>
        </Container>
    );
};

const glow = keyframes`
    from { box-shadow: 0 0 10px #f0f, 0 0 4px red; }
    to   { box-shadow: 0 0 10px #0ff, 0 0 4px #f0f; }
`;

const Container = styled.div<{ isOwnStable: boolean; isCurrentPlayer: boolean }>`
    flex: 1;
    min-width: 0;
    background: ${p => p.isOwnStable ? '#4a3520' : '#3a2d1a'};
    border-radius: 8px;
    border: 2px solid ${p => p.isCurrentPlayer ? '#F8B500' : p.isOwnStable ? '#6D5031' : 'rgba(255,255,255,0.12)'};
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
`;

const Label = styled.div<{ isOwnStable: boolean }>`
    font-size: 9px;
    font-weight: 700;
    color: ${p => p.isOwnStable ? '#F8B500' : 'rgba(255,255,255,0.6)'};
    font-family: 'Nunito', sans-serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const UpgradeRow = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 2px;
`;

const StableGrid = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 2px;
    align-items: flex-start;
`;

const CardWrapper = styled.div`
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
`;

const CardImg = styled(motion.img)<{ color: string; isGlowing: boolean; isTranslucent: boolean }>`
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: 2px solid ${p => p.color};
    object-fit: cover;
    opacity: ${p => p.isTranslucent ? 0.45 : 1};
    animation: ${p => p.isGlowing ? css`${glow} 0.8s infinite alternate` : 'none'};
    display: block;
    transition: opacity 0.2s;
`;

const EmptyHint = styled.div`
    font-size: 8px;
    color: rgba(255,255,255,0.3);
    font-family: 'Open Sans', sans-serif;
    padding: 2px;
`;

export default MobileStable;
