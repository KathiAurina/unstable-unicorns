import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { LogEntry } from '../game/log';
import type { Player } from '../game/player';
import type { Card } from '../game/card';
import CardNameToken from './CardNameToken';

type Props = {
    gameLog: LogEntry[];
    players: Player[];
    deck: Card[];
};

function playerName(players: Player[], id: string): string {
    return players.find(p => p.id === id)?.name ?? `Player ${id}`;
}

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatLogEntry(entry: LogEntry, players: Player[], deck: Card[]): React.ReactNode {
    const actor = playerName(players, entry.actor);
    const sourceCard = entry.sourceCardID !== undefined ? deck[entry.sourceCardID] : undefined;
    const targetCard = entry.targetCardID !== undefined ? deck[entry.targetCardID] : undefined;
    const targetPlayerName = entry.targetPlayer !== undefined ? playerName(players, entry.targetPlayer) : undefined;

    const src = sourceCard ? <CardNameToken card={sourceCard} /> : null;
    const tgt = targetCard ? <CardNameToken card={targetCard} /> : null;
    const ts = entry.timestamp ? <TimeTag>{formatTime(entry.timestamp)}</TimeTag> : null;

    let content: React.ReactNode;
    switch (entry.kind) {
        case 'play':
            content = <>{actor} played {src}</>;
            break;
        case 'play_neigh':
            content = <>{actor} neighed {targetPlayerName ? `${targetPlayerName}'s ` : ''}{tgt}{src ? <> with {src}</> : null}</>;
            break;
        case 'play_super_neigh':
            content = <>{actor} super-neighed {targetPlayerName ? `${targetPlayerName}'s ` : ''}{tgt}{src ? <> with {src}</> : null}</>;
            break;
        case 'card_neighed':
            content = <>{actor}'s {src} was neighed</>;
            break;
        case 'destroy':
            content = <>{actor} destroyed {tgt}{targetPlayerName ? ` (${targetPlayerName})` : ''}{src ? <> with {src}</> : null}</>;
            break;
        case 'sacrifice':
            content = <>{actor} sacrificed {tgt}{src ? <> for {src}</> : null}</>;
            break;
        case 'steal':
            content = <>{actor} stole {tgt}{targetPlayerName ? ` from ${targetPlayerName}` : ''}{src ? <> with {src}</> : null}</>;
            break;
        case 'pull':
            content = <>{actor} pulled a card{targetPlayerName ? ` from ${targetPlayerName}` : ''}{src ? <> with {src}</> : null}</>;
            break;
        case 'discard':
            content = <>{actor} discarded {tgt ?? 'a card'}{src ? <> ({src})</> : null}</>;
            break;
        case 'draw': {
            const n = entry.count ?? 1;
            content = <>{actor} drew {n === 1 ? 'a card' : `${n} cards`}{src ? <> ({src})</> : null}</>;
            break;
        }
        case 'search':
            content = <>{actor} searched the deck{src ? <> ({src})</> : null}</>;
            break;
        case 'revive':
            content = <>{actor} revived {tgt ?? 'a card'}{src ? <> ({src})</> : null}</>;
            break;
        case 'return_to_hand':
            content = <>{actor} returned {tgt ?? 'a card'}{targetPlayerName && targetPlayerName !== actor ? ` (${targetPlayerName})` : ''} to hand{src ? <> ({src})</> : null}</>;
            break;
        case 'bring_to_stable':
            content = <>{actor} brought {tgt} to stable{src ? <> ({src})</> : null}</>;
            break;
        case 'move':
            content = <>{actor} moved {tgt ?? 'a card'}{targetPlayerName ? ` to ${targetPlayerName}` : ''}{src ? <> ({src})</> : null}</>;
            break;
        case 'swap':
            content = <>{actor} swapped hands{targetPlayerName ? ` with ${targetPlayerName}` : ''}{src ? <> ({src})</> : null}</>;
            break;
        case 'shuffle':
            content = <>{actor} shuffled{src ? <> ({src})</> : null}</>;
            break;
        default:
            return null;
    }

    return <>{ts}{content}</>;
}

const GameLogPanel = ({ gameLog, players, deck }: Props) => {
    const [collapsed, setCollapsed] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    // auto-scroll to bottom whenever a new entry arrives (and on mount)
    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [gameLog.length]);

    if (gameLog.length === 0) return null;

    return (
        <Panel>
            <Header onClick={() => setCollapsed(c => !c)}>
                <Title>Game Log</Title>
                <Chevron>{collapsed ? '▲' : '▼'}</Chevron>
            </Header>
            {!collapsed && (
                <List ref={listRef}>
                    {gameLog.map((entry, idx) => {
                        const content = formatLogEntry(entry, players, deck);
                        if (!content) return null;
                        const isLast = idx === gameLog.length - 1;
                        return (
                            <LogLine key={entry.id} isLast={isLast}>
                                {content}
                            </LogLine>
                        );
                    })}
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

const TimeTag = styled.span`
    font-family: 'Nunito', sans-serif;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.35);
    font-weight: 400;
    margin-right: 5px;
    letter-spacing: 0.02em;
    flex-shrink: 0;
`;

export default GameLogPanel;
