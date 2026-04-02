import React, { useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../game/card';
import ImageLoader from '../assets/card/imageLoader';
import { _typeToColor } from '../ui/util';
import { cardDescription } from '../BoardUtil';
import { LanguageContext } from '../LanguageContextProvider';

type Props = {
    card: Card | undefined;
    onClose: () => void;
};

function typeLabel(type: Card['type']): string {
    const map: Record<string, string> = {
        baby: 'Baby Unicorn', basic: 'Basic Unicorn', unicorn: 'Magical Unicorn',
        narwhal: 'Narwhal Unicorn', magic: 'Magic', upgrade: 'Upgrade',
        downgrade: 'Downgrade', neigh: 'Neigh', super_neigh: 'Super Neigh',
    };
    return map[type] ?? type;
}

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
                    <Card_
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
                            <Title_>{card.title}</Title_>
                            <Desc>{cardDescription(card, context?.language ?? 'en')}</Desc>
                        </Info>
                    </Card_>
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

const Card_ = styled(motion.div)<{ borderColor: string }>`
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

const Title_ = styled.div`
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
