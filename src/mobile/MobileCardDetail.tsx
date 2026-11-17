import React, { useContext } from 'react';
import type { CardView } from '../view/cards';
import { cardDescription, typeLabel } from '../view/cards';

import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import ImageLoader from '../assets/card/imageLoader';
import { _typeToColor } from '../ui/util';
import { LanguageContext } from '../LanguageContextProvider';

type Props = {
    card: CardView | undefined;
    onClose: () => void;
};


const MobileCardDetail = ({ card, onClose }: Props) => {
    const context = useContext(LanguageContext);

    return (
        <AnimatePresence>
            {card && (
                <Backdrop
                    key="detail"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onTouchEnd={e => { e.stopPropagation(); onClose(); }}
                    onClick={onClose}
                >
                    <DetailCard
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        borderColor={_typeToColor(card.type)}
                        onTouchEnd={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                    >
                        <CardImg src={ImageLoader.load(card.image)} alt={card.title} />
                        <Info>
                            <TypeBadge color={_typeToColor(card.type)}>{typeLabel(card.type)}</TypeBadge>
                            <DetailTitle>{card.title}</DetailTitle>
                            <Desc>{cardDescription(card, context?.language ?? 'en')}</Desc>
                        </Info>
                    </DetailCard>
                    <CloseHint>Tap anywhere to close</CloseHint>
                </Backdrop>
            )}
        </AnimatePresence>
    );
};

const Backdrop = styled(motion.div)`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 90000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px;
`;

const DetailCard = styled(motion.div)<{ borderColor: string }>`
    display: flex;
    flex-direction: row;
    background: #1e1e2e;
    border-radius: 14px;
    border: 3px solid ${p => p.borderColor};
    overflow: hidden;
    max-width: 420px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
`;

const CardImg = styled.img`
    width: 120px;
    height: 150px;
    object-fit: cover;
    flex-shrink: 0;
`;

const Info = styled.div`
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: hidden;
`;

const TypeBadge = styled.div<{ color: string }>`
    font-size: 10px;
    font-weight: 800;
    color: ${p => p.color};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-family: 'Nunito', sans-serif;
`;

const DetailTitle = styled.div`
    font-size: 14px;
    font-weight: 800;
    color: white;
    font-family: 'Nunito', sans-serif;
`;

const Desc = styled.div`
    font-size: 11px;
    color: rgba(255,255,255,0.85);
    font-family: 'Open Sans', sans-serif;
    line-height: 1.4;
    overflow-y: auto;
    max-height: 90px;
`;

const CloseHint = styled.div`
    color: rgba(255,255,255,0.45);
    font-size: 12px;
    font-family: 'Nunito', sans-serif;
`;

export default MobileCardDetail;
