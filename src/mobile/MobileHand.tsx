import React, { useCallback, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Card, CardID } from '../game/card';
import ImageLoader from '../assets/card/imageLoader';
import { _typeToColor } from '../ui/util';

export type DragResult = {
    cardID: CardID;
    dropPlayerID: string | null;
    dropIsOwnStable: boolean;
};

type Props = {
    cards: Card[];
    glowingCards: CardID[];
    onDragEnd: (result: DragResult) => void;
    onCardTap: (cardID: CardID) => void;
    onCardLongPress: (card: Card) => void;
};

const CARDS_PER_PAGE = 6;
const TUCK_HEIGHT = 44;
const PEEK_LIFT = 130;
const DRAG_THRESHOLD = 12;
const LONG_PRESS_MS = 500;
const CARD_WIDTH = 56;

type GestureState = {
    cardID: CardID;
    card: Card;
    cardIdx: number;
    startX: number;
    startY: number;
    isDragging: boolean;
    longPressTimer: ReturnType<typeof setTimeout> | null;
    longPressDidFire: boolean;
    ghostEl: HTMLDivElement | null;
};

const vibrate = (ms: number) => {
    if ('vibrate' in navigator) navigator.vibrate(ms);
};

const MobileHand = ({ cards, glowingCards, onDragEnd, onCardTap, onCardLongPress }: Props) => {
    const [page, setPage] = useState(0);
    const [peekedIdx, setPeekedIdx] = useState<number | null>(null);
    const gestureRef = useRef<GestureState | null>(null);

    const totalPages = Math.ceil(cards.length / CARDS_PER_PAGE);
    const startIdx = page * CARDS_PER_PAGE;
    const pageCards = cards.slice(startIdx, startIdx + CARDS_PER_PAGE);

    const createGhost = useCallback((card: Card, x: number, y: number): HTMLDivElement => {
        const ghost = document.createElement('div');
        ghost.style.cssText = `
            position: fixed;
            width: ${CARD_WIDTH}px;
            height: ${Math.round(CARD_WIDTH * 1.4)}px;
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
            transition: transform 0.05s;
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

    const handleTouchStart = useCallback((e: React.TouchEvent, card: Card, idx: number) => {
        const t = e.touches[0];
        const timer = setTimeout(() => {
            // Long press fired
            if (gestureRef.current && !gestureRef.current.isDragging) {
                gestureRef.current.longPressDidFire = true;
                vibrate(40);
                onCardLongPress(card);
            }
        }, LONG_PRESS_MS);

        gestureRef.current = {
            cardID: card.id, card,
            cardIdx: idx,
            startX: t.clientX, startY: t.clientY,
            isDragging: false,
            longPressTimer: timer,
            longPressDidFire: false,
            ghostEl: null,
        };
    }, [onCardLongPress]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!gestureRef.current) return;
        const t = e.touches[0];
        const dx = t.clientX - gestureRef.current.startX;
        const dy = t.clientY - gestureRef.current.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!gestureRef.current.isDragging && dist > DRAG_THRESHOLD) {
            // Cancel long-press timer when drag starts
            if (gestureRef.current.longPressTimer) {
                clearTimeout(gestureRef.current.longPressTimer);
                gestureRef.current.longPressTimer = null;
            }
            gestureRef.current.isDragging = true;
            gestureRef.current.ghostEl = createGhost(gestureRef.current.card, t.clientX, t.clientY);
            setPeekedIdx(null);
            vibrate(20);
        }

        if (gestureRef.current.isDragging && gestureRef.current.ghostEl) {
            gestureRef.current.ghostEl.style.left = `${t.clientX}px`;
            gestureRef.current.ghostEl.style.top = `${t.clientY}px`;

            // Highlight drop zones
            document.querySelectorAll<HTMLElement>('[data-drop-stable]').forEach(el => {
                const rect = el.getBoundingClientRect();
                const over = t.clientX >= rect.left && t.clientX <= rect.right &&
                             t.clientY >= rect.top && t.clientY <= rect.bottom;
                el.style.outline = over ? '2px solid #4CAF50' : '';
            });
        }
    }, [createGhost]);

    const handleTouchEnd = useCallback((e: React.TouchEvent, card: Card, idx: number) => {
        if (!gestureRef.current) return;
        clearDropZoneHighlights();

        if (gestureRef.current.isDragging) {
            const t = e.changedTouches[0];
            const { playerID, isOwnStable } = resolveDropTarget(t.clientX, t.clientY);
            const cardID = gestureRef.current.cardID;
            cancelGesture();
            vibrate(30);
            onDragEnd({ cardID, dropPlayerID: playerID, dropIsOwnStable: isOwnStable });
        } else if (gestureRef.current.longPressDidFire) {
            // Long press was handled, don't also do tap
            cancelGesture();
        } else {
            // Regular tap
            const wasPeeked = peekedIdx === idx;
            cancelGesture();
            if (wasPeeked) {
                // Second tap on peeked card = play
                onCardTap(card.id);
                setPeekedIdx(null);
            } else {
                setPeekedIdx(idx);
            }
        }
    }, [peekedIdx, onDragEnd, onCardTap, cancelGesture]);

    return (
        <HandArea onTouchEnd={e => {
            // Tap on hand area outside cards dismisses peek
            const target = e.target as HTMLElement;
            if (!target.closest('[data-hand-card]')) {
                setPeekedIdx(null);
            }
        }}>
            {totalPages > 1 && (
                <PageArrow disabled={page === 0}
                    onTouchEnd={e => {
                        e.preventDefault();
                        if (page > 0) { setPage(p => p - 1); setPeekedIdx(null); }
                    }}
                    onClick={() => { setPage(p => Math.max(0, p - 1)); setPeekedIdx(null); }}
                >
                    &lt;
                </PageArrow>
            )}

            <CardsRow>
                {pageCards.map((card, idx) => {
                    const isPeeked = peekedIdx === idx;
                    const isGlowing = glowingCards.includes(card.id);
                    return (
                        <CardSlot
                            key={card.id}
                            data-hand-card="1"
                            isPeeked={isPeeked}
                            borderColor={_typeToColor(card.type)}
                            isGlowing={isGlowing}
                            onTouchStart={e => handleTouchStart(e, card, idx)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={e => {
                                e.preventDefault();
                                handleTouchEnd(e, card, idx);
                            }}
                        >
                            <CardFace src={ImageLoader.load(card.image)} alt={card.title} />
                            {isPeeked && (
                                <CardLabel color={_typeToColor(card.type)}>
                                    <CardTitle_>{card.title}</CardTitle_>
                                    <TypeTag>{card.type.replace('_', ' ')}</TypeTag>
                                    <PlayHint>Tap again to play · Drag to target</PlayHint>
                                </CardLabel>
                            )}
                        </CardSlot>
                    );
                })}
            </CardsRow>

            {totalPages > 1 && (
                <PageArrow disabled={page >= totalPages - 1}
                    onTouchEnd={e => {
                        e.preventDefault();
                        if (page < totalPages - 1) { setPage(p => p + 1); setPeekedIdx(null); }
                    }}
                    onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); setPeekedIdx(null); }}
                >
                    &gt;
                </PageArrow>
            )}
        </HandArea>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const HandArea = styled.div`
    height: ${TUCK_HEIGHT}px;
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    background: rgba(0,0,0,0.6);
    border-top: 1px solid rgba(255,255,255,0.15);
    flex-shrink: 0;
    position: relative;
    overflow: visible;
    z-index: 500;
    box-sizing: border-box;
    touch-action: none;
`;

const CardsRow = styled.div`
    flex: 1;
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    padding: 0 4px;
    gap: 3px;
    overflow: visible;
    height: 100%;
`;

const glow = keyframes`
    from { box-shadow: 0 0 10px #f0f, 0 0 4px red, 0 0 6px #0ff; }
    to   { box-shadow: 0 0 10px #0ff, 0 0 4px #f0f, 0 0 6px red; }
`;

const CardSlot = styled.div<{ isPeeked: boolean; borderColor: string; isGlowing: boolean }>`
    width: ${CARD_WIDTH}px;
    height: ${TUCK_HEIGHT - 4}px;
    border-radius: 6px 6px 0 0;
    border: 2px solid ${p => p.borderColor};
    border-bottom: none;
    background: #111;
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    animation: ${p => p.isGlowing ? css`${glow} 0.8s infinite alternate` : 'none'};
    transition: transform 0.22s cubic-bezier(.25,.8,.25,1), box-shadow 0.22s;
    transform: ${p => p.isPeeked ? `translateY(-${PEEK_LIFT}px)` : 'translateY(0)'};
    z-index: ${p => p.isPeeked ? 600 : 'auto'};
    touch-action: none;
    box-shadow: ${p => p.isPeeked ? '0 8px 24px rgba(0,0,0,0.6)' : 'none'};
`;

const CardFace = styled.img`
    width: 100%;
    height: ${TUCK_HEIGHT + PEEK_LIFT - 4}px;
    object-fit: cover;
    object-position: top;
    display: block;
    pointer-events: none;
`;

const CardLabel = styled.div<{ color: string }>`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0,0,0,0.85);
    color: white;
    font-size: 8px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    padding: 3px 4px 2px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    border-top: 1px solid ${p => p.color};
`;

const CardTitle_ = styled.div`
    font-size: 9px;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const TypeTag = styled.div`
    font-size: 7px;
    color: rgba(255,255,255,0.55);
    font-weight: 400;
    text-transform: capitalize;
`;

const PlayHint = styled.div`
    font-size: 7px;
    color: rgba(255,255,255,0.4);
    font-weight: 400;
`;

const PageArrow = styled.div<{ disabled: boolean }>`
    width: 28px;
    height: ${TUCK_HEIGHT}px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${p => p.disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)'};
    font-size: 16px;
    font-weight: 700;
    cursor: ${p => p.disabled ? 'default' : 'pointer'};
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    touch-action: manipulation;
`;

export default MobileHand;
