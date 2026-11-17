import React, { useEffect, useMemo, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import type { GameState, PlayerID } from '../game/engine';
import { describeLog } from '../view/log';
import { logLineStyle, renderLogLine } from '../components/GameLogPanel';

type Props = {
    G: GameState;
    /** Whose view this is: private cards are only named for this player. */
    playerID: PlayerID;
    onClose: () => void;
};

const MobileGameLogDrawer = ({ G, playerID, onClose }: Props) => {
    const listRef = useRef<HTMLDivElement>(null);
    const lines = useMemo(() => describeLog(G, playerID), [G, playerID]);

    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [lines.length]);

    return (
        <Overlay onClick={onClose}>
            <Drawer onClick={e => e.stopPropagation()}>
                <DrawerHeader>
                    <DrawerTitle>Game Log</DrawerTitle>
                    <CloseBtn onClick={onClose}>✕</CloseBtn>
                </DrawerHeader>
                <EntryList ref={listRef}>
                    {lines.length === 0 && <EmptyText>No actions yet.</EmptyText>}
                    {lines.map((line, idx) => (
                        <LogLine key={line.id} isLast={idx === lines.length - 1} style={logLineStyle(line)}>
                            {renderLogLine(G, line)}
                        </LogLine>
                    ))}
                </EntryList>
            </Drawer>
        </Overlay>
    );
};

const slideUp = keyframes`
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 600;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: flex-end;
`;

const Drawer = styled.div`
    width: 100%;
    background: rgba(12, 12, 24, 0.97);
    border-radius: 16px 16px 0 0;
    padding: 12px 16px 20px;
    animation: ${slideUp} 0.22s ease;
    max-height: 60vh;
    display: flex;
    flex-direction: column;
`;

const DrawerHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
`;

const DrawerTitle = styled.div`
    font-family: 'Nunito', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.08em;
`;

const CloseBtn = styled.button`
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 16px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
`;

const EntryList = styled.div`
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-right: 4px;

    &::-webkit-scrollbar {
        width: 6px;
    }
    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
    }
`;

const LogLine = styled.div<{ isLast: boolean }>`
    font-family: 'Nunito', sans-serif;
    font-size: 12px;
    color: ${p => p.isLast ? '#ffffff' : 'rgba(255,255,255,0.7)'};
    font-weight: ${p => p.isLast ? 600 : 400};
    line-height: 1.4;
`;

const EmptyText = styled.div`
    font-family: 'Nunito', sans-serif;
    font-size: 12px;
    color: rgba(255,255,255,0.4);
`;

export default MobileGameLogDrawer;
