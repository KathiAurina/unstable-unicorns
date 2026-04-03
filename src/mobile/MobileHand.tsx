import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Card, CardID } from '../game/card';
import ImageLoader from '../assets/card/imageLoader';
import { _typeToColor } from '../ui/util';
import { cardDescription } from '../BoardUtil';
import { LanguageContext } from '../LanguageContextProvider';
import { typeLabel } from './MobileCardDetail';

export type DragResult = {
    cardID: CardID;
    dropPlayerID: string | null;
    dropIsOwnStable: boolean;
};

type Props = {
    cards: Card[];
    glowingCards: CardID[];
    onDragEnd: (result: DragResult) => void;
    onCardLongPress: (card: Card) => void;
};

// Layout constants
const CARD_W_TUCKED = 52;
const CARD_H_TUCKED = Math.round(CARD_W_TUCKED * 1.4);
const TUCK_VISIBLE = 40;           // px of card top visible when tucked
const CARD_W_EXPANDED = 108;
const CARD_H_EXPANDED = Math.round(CARD_W_EXPANDED * 1.4);
const DRAG_THRESHOLD = 12;
const SWIPE_UP_THRESHOLD = 25;
const LONG_PRESS_MS = 500;
// How high the hand rises when expanded (from bottom of screen)
const EXPANDED_RISE = 340;

type HandState = 'tucked' | 'expanded' | 'dragging';

type GestureState = {
    cardID: CardID;
    card: Card;
    cardIdx: number;
    startX: number;
    startY: number;
    gestureDirection: 'undecided' | 'vertical' | 'horizontal';
    isDragging: boolean;
    longPressTimer: ReturnType<typeof setTimeout> | null;
    ghostEl: HTMLDivElement | null;
};

const vibrate = (ms: number) => {
    if ('vibrate' in navigator) navigator.vibrate(ms);
};

// Compute fan transform for a card at index `idx` out of `total`
function fanTransform(idx: number, total: number, expanded: boolean): { x: number; y: number; rotate: number } {
    if (total === 0) return { x: 0, y: 0, rotate: 0 };
    const mid = (total - 1) / 2;
    const degStep = expanded ? 5 : 4;
    const spread = expanded
        ? Math.min(63, Math.max(27, 390 / total))   // adapt spread to card count
        : Math.min(28, Math.max(12, 180 / total));
    const yStep = expanded ? 2.0 : 4;
    const rotate = (idx - mid) * degStep;
    const x = (idx - mid) * spread;
    const y = Math.abs(idx - mid) ** 2 * yStep;
    return { x, y, rotate };
}

const MobileHand = ({ cards, glowingCards, onDragEnd, onCardLongPress }: Props) => {
    const langCtx = useContext(LanguageContext);
    const lang = (langCtx?.language ?? 'en') as 'en' | 'de';
    const [handState, setHandState] = useState<HandState>('tucked');
    const handStateRef = useRef<HandState>('tucked');
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    // Tooltip shows rules text after brief hover
    const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);
    const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [detailCardIdx, setDetailCardIdx] = useState<number | null>(null);
    const gestureRef = useRef<GestureState | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const isExpanded = handState === 'expanded';

    const setHandStateSync = (s: HandState) => {
        handStateRef.current = s;
        setHandState(s);
    };

    const cardW = isExpanded ? CARD_W_EXPANDED : CARD_W_TUCKED;
    const cardH = isExpanded ? CARD_H_EXPANDED : CARD_H_TUCKED;

    // Clear tooltip timer on unmount
    useEffect(() => () => {
        if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    }, []);

    const createGhost = useCallback((card: Card, x: number, y: number): HTMLDivElement => {
        const ghost = document.createElement('div');
        ghost.style.cssText = `
            position: fixed;
            width: ${CARD_W_EXPANDED}px;
            height: ${CARD_H_EXPANDED}px;
            background-image: url(${ImageLoader.load(card.image)});
            background-size: cover;
            border-radius: 6px;
            border: 2px solid ${_typeToColor(card.type)};
            pointer-events: none;
            z-index: 99999;
            opacity: 0.88;
            box-shadow: 0 6px 24px rgba(0,0,0,0.7);
            transform: translate(-50%, -60%) scale(1.2);
            left: ${x}px;
            top: ${y}px;
        `;
        document.body.appendChild(ghost);
        return ghost;
    }, []);

    const removeGhost = useCallback(() => {
        if (gestureRef.current?.ghostEl) {
            gestureRef.current.ghostEl.remove();
            gestureRef.current.ghostEl = null;
        }
    }, []);

    const cancelGesture = useCallback(() => {
        if (gestureRef.current?.longPressTimer) {
            clearTimeout(gestureRef.current.longPressTimer);
        }
        removeGhost();
        gestureRef.current = null;
    }, [removeGhost]);

    const clearDropZoneHighlights = () => {
        document.querySelectorAll<HTMLElement>('[data-drop-stable]').forEach(el => {
            el.style.outline = '';
        });
    };

    const resolveDropTarget = (x: number, y: number) => {
        if (gestureRef.current?.ghostEl) gestureRef.current.ghostEl.style.display = 'none';
        const el = document.elementFromPoint(x, y);
        if (gestureRef.current?.ghostEl) gestureRef.current.ghostEl.style.display = '';

        let node: Element | null = el;
        while (node) {
            const dropStable = node.getAttribute('data-drop-stable');
            const dropPlayerID = node.getAttribute('data-player-id');
            if (dropStable !== null) {
                return { playerID: dropPlayerID, isOwnStable: dropStable === 'own' };
            }
            node = node.parentElement;
        }
        return { playerID: null, isOwnStable: false };
    };

    const setHover = (idx: number | null) => {
        setHoveredIdx(idx);
        if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
        if (idx === null) {
            setTooltipIdx(null);
        } else {
            tooltipTimerRef.current = setTimeout(() => setTooltipIdx(idx), 300);
        }
    };

    const handleTouchStart = useCallback((e: React.TouchEvent, card: Card, idx: number) => {
        e.stopPropagation();
        const t = e.touches[0];
        const timer = setTimeout(() => {
            if (gestureRef.current && !gestureRef.current.isDragging) {
                vibrate(40);
                onCardLongPress(card);
            }
        }, LONG_PRESS_MS);

        gestureRef.current = {
            cardID: card.id, card, cardIdx: idx,
            startX: t.clientX, startY: t.clientY,
            gestureDirection: 'undecided',
            isDragging: false,
            longPressTimer: timer,
            ghostEl: null,
        };
    }, [onCardLongPress]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const t = e.touches[0];

        // Hover tracking while finger sweeps across cards in expanded mode
        if (handStateRef.current === 'expanded' && !gestureRef.current?.isDragging) {
            const container = containerRef.current;
            if (container) {
                const cardEls = container.querySelectorAll<HTMLElement>('[data-hand-card]');
                let found: number | null = null;
                cardEls.forEach((el, i) => {
                    const rect = el.getBoundingClientRect();
                    if (t.clientX >= rect.left && t.clientX <= rect.right &&
                        t.clientY >= rect.top && t.clientY <= rect.bottom) {
                        found = i;
                    }
                });
                setHover(found);
            }
        }

        if (!gestureRef.current) return;

        const dx = t.clientX - gestureRef.current.startX;
        const dy = t.clientY - gestureRef.current.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!gestureRef.current.isDragging && gestureRef.current.gestureDirection !== 'horizontal') {
            const threshold = handStateRef.current === 'expanded' ? SWIPE_UP_THRESHOLD : DRAG_THRESHOLD;
            if (dist > threshold) {
                if (gestureRef.current.longPressTimer) {
                    clearTimeout(gestureRef.current.longPressTimer);
                    gestureRef.current.longPressTimer = null;
                }
                const upwardSwipe = dy < 0 && Math.abs(dy) > Math.abs(dx);
                if (handStateRef.current === 'expanded' && !upwardSwipe) {
                    // Horizontal/downward swipe in expanded hand → show detail, no drag
                    gestureRef.current.gestureDirection = 'horizontal';
                } else {
                    gestureRef.current.gestureDirection = 'vertical';
                    gestureRef.current.isDragging = true;
                    gestureRef.current.ghostEl = createGhost(gestureRef.current.card, t.clientX, t.clientY);
                    setHandStateSync('dragging');
                    setHover(null);
                    vibrate(20);
                }
            }
        }

        if (gestureRef.current.isDragging && gestureRef.current.ghostEl) {
            gestureRef.current.ghostEl.style.left = `${t.clientX}px`;
            gestureRef.current.ghostEl.style.top = `${t.clientY}px`;

            const cardType = gestureRef.current.card.type;
            const canTargetAny = cardType === 'upgrade' || cardType === 'downgrade';
            document.querySelectorAll<HTMLElement>('[data-drop-stable]').forEach(el => {
                const rect = el.getBoundingClientRect();
                const over = t.clientX >= rect.left && t.clientX <= rect.right &&
                             t.clientY >= rect.top && t.clientY <= rect.bottom;
                const isOwn = el.getAttribute('data-drop-stable') === 'own';
                const color = (canTargetAny || isOwn) ? '#4CAF50' : '#F44336';
                el.style.outline = over ? `2px solid ${color}` : '';
            });
        }
    }, [createGhost]);

    const handleTouchEnd = useCallback((e: React.TouchEvent, card: Card, idx: number) => {
        if (!gestureRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        clearDropZoneHighlights();

        if (gestureRef.current.isDragging) {
            const t = e.changedTouches[0];

            // Cancel: finger released in bottom 25% of screen → drag back to hand
            if (t.clientY > window.innerHeight * 0.75) {
                cancelGesture();
                clearDropZoneHighlights();
                setHandStateSync('tucked');
                setDetailCardIdx(null);
                return;
            }

            const { playerID, isOwnStable } = resolveDropTarget(t.clientX, t.clientY);
            const cardID = gestureRef.current.cardID;
            cancelGesture();
            setHandStateSync('tucked');
            setDetailCardIdx(null);
            vibrate(30);
            onDragEnd({ cardID, dropPlayerID: playerID, dropIsOwnStable: isOwnStable });
        } else {
            cancelGesture();
            if (handStateRef.current === 'expanded') {
                // Tap or horizontal swipe in expanded hand → show inline detail
                setHover(null);
                setDetailCardIdx(idx);
            } else {
                // Tap card when tucked = expand hand
                setHandStateSync('expanded');
            }
        }
    }, [onDragEnd, cancelGesture]);

    // Tap on the hand area (not on a specific card): expand when tucked, collapse when expanded
    const handleHandAreaTap = useCallback((e: React.TouchEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-hand-card]')) {
            if (handStateRef.current === 'tucked') {
                setHandStateSync('expanded');
            } else if (handStateRef.current === 'expanded') {
                setHandStateSync('tucked');
                setHover(null);
                setDetailCardIdx(null);
            }
        }
    }, []);

    // Backdrop tap collapses expanded hand (without propagating to game board)
    const handleBackdropTap = useCallback((e: React.TouchEvent) => {
        e.stopPropagation();
        setHandStateSync('tucked');
        setHover(null);
        setDetailCardIdx(null);
    }, []);

    return (
        <>
            {/* Backdrop to capture taps outside cards when expanded */}
            {isExpanded && (
                <ExpandBackdrop
                    onTouchEnd={handleBackdropTap}
                    onClick={e => { e.stopPropagation(); setHandStateSync('tucked'); setHover(null); setDetailCardIdx(null); }}
                />
            )}

            <HandArea
                ref={containerRef}
                isExpanded={isExpanded}
                onTouchEnd={handleHandAreaTap}
            >
                <FanContainer cardCount={cards.length} isExpanded={isExpanded}>
                    {cards.map((card, idx) => {
                        const { x, y, rotate } = fanTransform(idx, cards.length, isExpanded);
                        const isGlowing = glowingCards.includes(card.id);
                        const isHovered = hoveredIdx === idx;
                        const showTooltip = tooltipIdx === idx && isExpanded;

                        return (
                            <CardSlot
                                key={card.id}
                                data-hand-card="1"
                                style={{
                                    transform: `translateX(calc(-50% + ${x}px)) translateY(${isExpanded ? -y : 0}px) rotate(${rotate}deg)` +
                                               (isHovered ? ' scale(1.25)' : ''),
                                    zIndex: isHovered ? 600 : idx + 1,
                                    transition: 'transform 0.18s cubic-bezier(.25,.8,.25,1)',
                                }}
                                cardW={cardW}
                                cardH={cardH}
                                borderColor={_typeToColor(card.type)}
                                isGlowing={isGlowing}
                                onTouchStart={e => handleTouchStart(e, card, idx)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={e => handleTouchEnd(e, card, idx)}
                                onContextMenu={e => e.preventDefault()}
                            >
                                <CardFace
                                    src={ImageLoader.load(card.image)}
                                    alt={card.title}
                                    cardH={cardH}
                                />
                                {showTooltip && (
                                    <CardTooltip color={_typeToColor(card.type)} side={x < 0 ? 'right' : 'left'}>
                                        <TooltipTitle>{card.title}</TooltipTitle>
                                        <TooltipType>{card.type.replace('_', ' ')}</TooltipType>
                                        <TooltipDesc>{cardDescription(card, lang)}</TooltipDesc>
                                    </CardTooltip>
                                )}
                                {isGlowing && isExpanded && (
                                    <GlowLabel color={_typeToColor(card.type)}>
                                        {card.title}
                                    </GlowLabel>
                                )}
                            </CardSlot>
                        );
                    })}
                </FanContainer>

                {!isExpanded && cards.length > 0 && (
                    <TuckHint>tap to expand</TuckHint>
                )}

                {(detailCardIdx !== null || hoveredIdx !== null) && isExpanded && (() => {
                    const displayIdx = hoveredIdx ?? detailCardIdx ?? 0;
                    const displayCard = cards[Math.max(0, Math.min(displayIdx, cards.length - 1))];
                    if (!displayCard) return null;
                    return (
                        <InlineDetail key={displayCard.id} borderColor={_typeToColor(displayCard.type)}>
                            <InlineDetailImg src={ImageLoader.load(displayCard.image)} alt={displayCard.title} />
                            <InlineDetailInfo>
                                <InlineDetailBadge color={_typeToColor(displayCard.type)}>
                                    {typeLabel(displayCard.type)}
                                </InlineDetailBadge>
                                <InlineDetailTitle>{displayCard.title}</InlineDetailTitle>
                                <InlineDetailDesc>{cardDescription(displayCard, lang)}</InlineDetailDesc>
                            </InlineDetailInfo>
                        </InlineDetail>
                    );
                })()}
            </HandArea>
        </>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const ExpandBackdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 490;
    background: rgba(0,0,0,0.35);
`;

const HandArea = styled.div<{ isExpanded: boolean }>`
    width: 100%;
    height: ${p => p.isExpanded ? `${EXPANDED_RISE}px` : `${TUCK_VISIBLE}px`};
    flex-shrink: 0;
    position: relative;
    overflow: visible;
    z-index: 500;
    touch-action: none;
    transition: height 0.25s cubic-bezier(.25,.8,.25,1);
    pointer-events: all;
`;

const FanContainer = styled.div<{ cardCount: number; isExpanded: boolean }>`
    position: absolute;
    bottom: ${p => p.isExpanded ? '40px' : '0'};
    left: 50%;
    width: 0;
    height: 0;
    overflow: visible;
    transition: bottom 0.25s cubic-bezier(.25,.8,.25,1);
`;

const glow = keyframes`
    from { box-shadow: 0 0 10px #f0f, 0 0 4px red, 0 0 6px #0ff; }
    to   { box-shadow: 0 0 10px #0ff, 0 0 4px #f0f, 0 0 6px red; }
`;

const CardSlot = styled.div<{ cardW: number; cardH: number; borderColor: string; isGlowing: boolean }>`
    position: absolute;
    left: 0;
    bottom: 0;
    width: ${p => p.cardW}px;
    height: ${p => p.cardH}px;
    border-radius: 6px 6px 4px 4px;
    border: 2px solid ${p => p.borderColor};
    background: #111;
    overflow: hidden;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    transform-origin: bottom center;
    animation: ${p => p.isGlowing ? css`${glow} 0.8s infinite alternate` : 'none'};
    touch-action: none;
    will-change: transform;
`;

const CardFace = styled.img<{ cardH: number }>`
    width: 100%;
    height: ${p => p.cardH}px;
    object-fit: cover;
    object-position: top;
    display: block;
    pointer-events: none;
    -webkit-user-drag: none;
`;

const CardTooltip = styled.div<{ color: string; side: 'left' | 'right' }>`
    position: absolute;
    ${p => p.side === 'right' ? 'left: 105%;' : 'right: 105%;'}
    bottom: 10%;
    width: 130px;
    background: rgba(20,20,30,0.96);
    border: 1.5px solid ${p => p.color};
    border-radius: 8px;
    padding: 8px 9px;
    z-index: 700;
    pointer-events: none;
    box-shadow: 0 4px 16px rgba(0,0,0,0.7);
`;

const TooltipTitle = styled.div`
    font-size: 11px;
    font-weight: 800;
    color: white;
    font-family: 'Nunito', sans-serif;
    margin-bottom: 2px;
`;

const TooltipType = styled.div`
    font-size: 9px;
    color: rgba(255,255,255,0.5);
    font-family: 'Nunito', sans-serif;
    text-transform: capitalize;
    margin-bottom: 4px;
`;

const TooltipDesc = styled.div`
    font-size: 9px;
    color: rgba(255,255,255,0.82);
    font-family: 'Open Sans', sans-serif;
    line-height: 1.35;
    white-space: pre-wrap;
`;

const GlowLabel = styled.div<{ color: string }>`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0,0,0,0.8);
    color: white;
    font-size: 7px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    padding: 2px 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-top: 1px solid ${p => p.color};
`;

const TuckHint = styled.div`
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255,255,255,0.3);
    font-size: 8px;
    font-family: 'Nunito', sans-serif;
    pointer-events: none;
    white-space: nowrap;
`;

const InlineDetail = styled.div<{ borderColor: string }>`
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 24px);
    max-width: 400px;
    display: flex;
    flex-direction: row;
    gap: 10px;
    background: rgba(18, 14, 28, 0.97);
    border: 1.5px solid ${p => p.borderColor};
    border-radius: 10px;
    padding: 8px;
    z-index: 510;
    box-shadow: 0 4px 20px rgba(0,0,0,0.85);
    pointer-events: none;
`;

const InlineDetailImg = styled.img`
    width: 90px;
    height: 126px;
    object-fit: cover;
    object-position: top;
    border-radius: 6px;
    flex-shrink: 0;
`;

const InlineDetailInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
    flex: 1;
`;

const InlineDetailBadge = styled.div<{ color: string }>`
    font-size: 9px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    color: ${p => p.color};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const InlineDetailTitle = styled.div`
    font-size: 12px;
    font-weight: 800;
    font-family: 'Nunito', sans-serif;
    color: white;
    line-height: 1.2;
`;

const InlineDetailDesc = styled.div`
    font-size: 9px;
    color: rgba(255,255,255,0.82);
    font-family: 'Open Sans', sans-serif;
    line-height: 1.4;
    white-space: pre-wrap;
    overflow: hidden;
`;

export default MobileHand;
