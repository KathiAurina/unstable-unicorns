import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import type { GameState, PlayerID } from '../game/engine';
import { cardView } from '../view/cards';
import { describeLog } from '../view/log';
import type { LogLine as LogLineModel } from '../view/log';
import CardNameToken from './CardNameToken';

type Props = {
    G: GameState;
    /** Whose view this is: cards only this player may know are named for them only. */
    playerID: PlayerID;
};

/** The content of one log line: text with card names as tokens that show the card on hover. */
export function renderLogLine(G: GameState, line: LogLineModel): React.ReactNode {
    return line.parts.map((part, i) =>
        typeof part === 'string'
            ? <React.Fragment key={i}>{part}</React.Fragment>
            : <CardNameToken key={i} card={cardView(G, part.card)} />);
}

/** Inline style of a log line: nested entries are indented, turn headers and non-events set apart. */
export function logLineStyle(line: LogLineModel): React.CSSProperties {
    return {
        paddingLeft: 12 + line.depth * 12,
        opacity: line.muted ? 0.6 : undefined,
        fontStyle: line.muted ? 'italic' : undefined,
        fontWeight: line.header ? 700 : undefined,
        borderTop: line.header ? '1px solid rgba(255, 255, 255, 0.15)' : undefined,
        marginTop: line.header ? 4 : undefined,
    };
}

const GameLogPanel = ({ G, playerID }: Props) => {
    const [collapsed, setCollapsed] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const lines = useMemo(() => describeLog(G, playerID), [G, playerID]);

    // auto-scroll to bottom whenever a new entry arrives (and on mount)
    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [lines.length]);

    if (lines.length === 0) return null;

    return (
        <Panel>
            <Header onClick={() => setCollapsed(c => !c)}>
                <Title>Game Log</Title>
                <Chevron>{collapsed ? '▲' : '▼'}</Chevron>
            </Header>
            {!collapsed && (
                <List ref={listRef}>
                    {lines.map((line, idx) => (
                        <LogLine key={line.id} isLast={idx === lines.length - 1} style={logLineStyle(line)}>
                            {renderLogLine(G, line)}
                        </LogLine>
                    ))}
                </List>
            )}
        </Panel>
    );
};

const Panel = styled.div`
    position: fixed;
    bottom: 16px;
    right: 16px;
    width: 320px;
    background: rgba(10, 10, 20, 0.85);
    backdrop-filter: blur(4px);
    border-radius: 10px;
    z-index: 3500;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4);
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 12px;
    cursor: pointer;
    user-select: none;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const Title = styled.div`
    font-family: 'Nunito', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.85);
    text-transform: uppercase;
    letter-spacing: 0.08em;
`;

const Chevron = styled.div`
    color: rgba(255, 255, 255, 0.6);
    font-size: 9px;
`;

const List = styled.div`
    max-height: 220px;
    overflow-y: auto;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;

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
    font-size: 11px;
    color: ${p => p.isLast ? '#ffffff' : 'rgba(255, 255, 255, 0.7)'};
    font-weight: ${p => p.isLast ? 600 : 400};
    line-height: 1.4;
`;

export default GameLogPanel;
