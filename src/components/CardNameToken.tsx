import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import type { Card } from '../game/card';

type Props = {
    card: Card;
};

const TOOLTIP_W = 240;

const Token = styled.span`
    font-weight: 700;
    cursor: pointer;
    text-decoration: underline dotted rgba(255, 255, 255, 0.35);
    text-underline-offset: 2px;
    -webkit-tap-highlight-color: transparent;
`;

const Tooltip = styled.div<{ top: number; left: number }>`
    position: fixed;
    top: ${p => p.top}px;
    left: ${p => p.left}px;
    z-index: 10000;
    pointer-events: none;
    width: ${TOOLTIP_W}px;
    background: rgba(14, 14, 28, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 10px 12px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.7);
`;

const TooltipTitle = styled.div`
    font-family: 'Nunito', sans-serif;
    font-size: 13px;
    font-weight: 800;
    color: #ffffff;
    margin-bottom: 6px;
    line-height: 1.2;
`;

const TooltipType = styled.div`
    font-family: 'Nunito', sans-serif;
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.45);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 6px;
`;

const TooltipText = styled.div`
    font-family: 'Nunito', sans-serif;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.5;
    white-space: pre-wrap;
`;

function clampPosition(x: number, y: number, estimatedH: number): { top: number; left: number } {
    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = y - estimatedH - margin;
    if (top < margin) top = Math.min(y + margin, vh - estimatedH - margin);
    let left = x - TOOLTIP_W / 2;
    left = Math.max(margin, Math.min(left, vw - TOOLTIP_W - margin));
    return { top, left };
}

function cardTypeLabel(card: Card): string {
    const t = Array.isArray(card.type) ? card.type : [card.type];
    return t.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' / ');
}

const CardNameToken = ({ card }: Props) => {
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const [pinned, setPinned] = useState(false);
    const tokenRef = useRef<HTMLSpanElement>(null);

    const description = card.description?.en || card.description?.de || '';
    const estimatedH = 80 + Math.ceil(description.length / 32) * 17;

    const showAt = (clientX: number, clientY: number) => {
        setPos(clampPosition(clientX, clientY, estimatedH));
    };

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (pinned) return;
        showAt(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (pinned) return;
        showAt(e.clientX, e.clientY);
    };

    const handleMouseLeave = () => {
        if (pinned) return;
        setPos(null);
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (pinned) {
            setPinned(false);
            setPos(null);
        } else {
            setPinned(true);
            showAt(e.clientX, e.clientY);
        }
    };

    useEffect(() => {
        if (!pinned) return;
        const handler = (e: PointerEvent) => {
            if (!tokenRef.current?.contains(e.target as Node)) {
                setPinned(false);
                setPos(null);
            }
        };
        document.addEventListener('pointerdown', handler);
        return () => document.removeEventListener('pointerdown', handler);
    }, [pinned]);

    const tooltip = pos ? ReactDOM.createPortal(
        <Tooltip top={pos.top} left={pos.left}>
            <TooltipTitle>{card.title}</TooltipTitle>
            <TooltipType>{cardTypeLabel(card)}</TooltipType>
            {description ? <TooltipText>{description}</TooltipText> : null}
        </Tooltip>,
        document.body
    ) : null;

    return (
        <>
            <Token
                ref={tokenRef}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
            >
                {card.title}
            </Token>
            {tooltip}
        </>
    );
};

export default CardNameToken;
