import React from 'react';
import styled from 'styled-components';
import ImageLoader from '../../assets/card/imageLoader';
import { Card } from '../../game/card';

interface Props {
    card: Card;
    isSelected: boolean;
    isTaken: boolean;
    onClick: () => void;
}

const UnicornAvatar = ({ card, isSelected, isTaken, onClick }: Props) => {
    return (
        <AvatarWrapper
            $isSelected={isSelected}
            $isTaken={isTaken}
            onClick={onClick}
            title={isTaken ? 'Already taken' : card.title}
        >
            <AvatarImage
                src={ImageLoader.load(card.image)}
                alt={card.title}
                $isTaken={isTaken}
            />
        </AvatarWrapper>
    );
};

const AvatarWrapper = styled.div<{ $isSelected: boolean; $isTaken: boolean }>`
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    cursor: ${({ $isTaken }) => ($isTaken ? 'not-allowed' : 'pointer')};
    border: ${({ $isSelected }) => ($isSelected ? '3px solid #4D96FF' : '3px solid transparent')};
    box-shadow: ${({ $isSelected }) =>
        $isSelected ? '0 0 12px rgba(77, 150, 255, 0.5)' : 'none'};
    transition: border 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease;
    flex-shrink: 0;

    &:hover {
        transform: ${({ $isTaken }) => ($isTaken ? 'none' : 'scale(1.08)')};
    }
`;

const AvatarImage = styled.img<{ $isTaken: boolean }>`
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: ${({ $isTaken }) => ($isTaken ? 0.35 : 1)};
    filter: ${({ $isTaken }) => ($isTaken ? 'grayscale(0.5)' : 'none')};
    transition: opacity 0.3s ease, filter 0.3s ease;
    display: block;
`;

export default UnicornAvatar;
