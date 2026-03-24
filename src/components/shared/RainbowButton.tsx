import React from 'react';
import styled, { css } from 'styled-components';

type Variant = 'rainbow' | 'blue';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    children: React.ReactNode;
}

const RainbowButton = ({ variant = 'rainbow', type = 'button', children, ...rest }: Props) => {
    return <StyledButton $variant={variant} type={type} {...rest}>{children}</StyledButton>;
};

const StyledButton = styled.button<{ $variant: Variant }>`
    padding: 10px 20px;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
    font-size: 14px;
    font-family: 'Nunito', sans-serif;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    ${({ $variant }) =>
        $variant === 'rainbow'
            ? css`
                background: linear-gradient(90deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, #9B59B6);
            `
            : css`
                background: #4D96FF;
            `}

    &:hover:not(:disabled) {
        transform: scale(1.02);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export default RainbowButton;
