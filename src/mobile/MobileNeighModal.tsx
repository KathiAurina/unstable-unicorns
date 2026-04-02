import React, { useContext } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../game/card';
import ImageLoader from '../assets/card/imageLoader';
import { _typeToColor } from '../ui/util';
import { NeighLabelRole } from '../ui/NeighLabel';
import { cardDescription } from '../BoardUtil';
import { LanguageContext } from '../LanguageContextProvider';

type Props = {
    card: Card;
    role: NeighLabelRole;
    originalInitiatorName: string;
    newInitiatorName?: string;
    numberOfNeighedCards: number;
    didVote: boolean;
    showPlayNeighButton: boolean;
    onPlayNeighClick: () => void;
    onDontPlayNeighClick: () => void;
};

const MobileNeighModal = ({
    card, role, originalInitiatorName, newInitiatorName,
    numberOfNeighedCards, didVote, showPlayNeighButton,
    onPlayNeighClick, onDontPlayNeighClick,
}: Props) => {
    const context = useContext(LanguageContext);

    let statusText = '';
    if (role === 'original_initiator') {
        statusText = 'Other players may neigh your card. Waiting...';
    } else if (role === 'did_neigh') {
        statusText = 'You played a Neigh card.';
    } else if (role === 'did_not_neigh') {
        statusText = 'You passed. Waiting for other players...';
    } else if (role === 'open') {
        statusText = newInitiatorName
            ? `${newInitiatorName} played a Neigh card. Neigh back?`
            : `${originalInitiatorName} played ${card.title}. Neigh it?`;
    } else if (role === 'new_initiator') {
        statusText = 'You neighed. Others may counter-neigh. Waiting...';
    } else if (role === 'original_initiator_can_counterneigh') {
        statusText = `${newInitiatorName} neighed your card. Counter-neigh?`;
    }

    const resultColor = numberOfNeighedCards % 2 === 1 ? '#FF4450' : '#4CAF50';
    const resultText = numberOfNeighedCards % 2 === 1
        ? `${originalInitiatorName} is stopped from playing ${card.title}.`
        : `${originalInitiatorName} can play ${card.title}.`;

    return (
        <Backdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <Modal
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ duration: 0.22 }}
            >
                <CardRow>
                    <CardImg src={ImageLoader.load(card.image)} alt={card.title} borderColor={_typeToColor(card.type)} />
                    <CardInfo>
                        <CardTitle>{card.title}</CardTitle>
                        <CardDesc>{cardDescription(card, context?.language ?? 'en')}</CardDesc>
                    </CardInfo>
                </CardRow>

                <StatusText>{statusText}</StatusText>

                <ResultBar color={resultColor}>{resultText}</ResultBar>

                {!didVote && (
                    <ButtonRow>
                        <DontNeighBtn
                            onTouchEnd={e => { e.preventDefault(); onDontPlayNeighClick(); }}
                            onClick={onDontPlayNeighClick}
                        >
                            Don't Neigh
                        </DontNeighBtn>
                        {showPlayNeighButton && (
                            <NeighBtn
                                onTouchEnd={e => { e.preventDefault(); onPlayNeighClick(); }}
                                onClick={onPlayNeighClick}
                            >
                                Neigh!
                            </NeighBtn>
                        )}
                    </ButtonRow>
                )}
            </Modal>
        </Backdrop>
    );
};

const Backdrop = styled(motion.div)`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.88);
    z-index: 80000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: env(safe-area-inset-bottom, 0px);
`;

const Modal = styled(motion.div)`
    background: #1e1e30;
    border-radius: 16px 16px 0 0;
    width: 100%;
    max-width: 480px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 -4px 32px rgba(0,0,0,0.5);
`;

const glow = keyframes`
    from { box-shadow: 0 0 12px #f0f, 0 0 6px red; }
    to   { box-shadow: 0 0 12px #0ff, 0 0 6px #f0f; }
`;

const CardImg = styled.img<{ borderColor: string }>`
    width: 80px;
    height: 100px;
    border-radius: 8px;
    border: 3px solid ${p => p.borderColor};
    object-fit: cover;
    flex-shrink: 0;
    animation: ${glow} 1s infinite alternate;
`;

const CardRow = styled.div`
    display: flex;
    flex-direction: row;
    gap: 12px;
    align-items: flex-start;
`;

const CardInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
`;

const CardTitle = styled.div`
    font-size: 14px;
    font-weight: 800;
    color: white;
    font-family: 'Nunito', sans-serif;
`;

const CardDesc = styled.div`
    font-size: 10px;
    color: rgba(255,255,255,0.7);
    font-family: 'Open Sans', sans-serif;
    line-height: 1.4;
    overflow-y: auto;
    max-height: 70px;
`;

const StatusText = styled.div`
    font-size: 13px;
    color: white;
    font-family: 'Nunito', sans-serif;
    font-weight: 600;
    text-align: center;
`;

const ResultBar = styled.div<{ color: string }>`
    font-size: 11px;
    color: ${p => p.color};
    font-family: 'Open Sans', sans-serif;
    font-weight: 700;
    text-align: center;
    padding: 6px;
    background: rgba(255,255,255,0.06);
    border-radius: 8px;
`;

const ButtonRow = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
`;

const DontNeighBtn = styled.div`
    flex: 1;
    background: #BC4747;
    color: white;
    font-size: 15px;
    font-weight: 800;
    font-family: 'Nunito', sans-serif;
    border-radius: 10px;
    padding: 14px 0;
    text-align: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
`;

const NeighBtn = styled.div`
    flex: 1;
    background: #2e7d32;
    color: white;
    font-size: 15px;
    font-weight: 800;
    font-family: 'Nunito', sans-serif;
    border-radius: 10px;
    padding: 14px 0;
    text-align: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
`;

export default MobileNeighModal;
