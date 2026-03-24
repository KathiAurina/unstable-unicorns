import React from 'react';
import styled from 'styled-components';
import { Player, PlayerID } from '../../game/player';
import { CardID } from '../../game/card';

interface Props {
    players: Player[];
    ready: { [key: string]: boolean };
    babyStarter: { cardID: CardID; owner: PlayerID }[];
}

const PlayerReadyList = ({ players, ready, babyStarter }: Props) => {
    return (
        <List>
            {players.map((player) => {
                const isReady = ready[player.id] === true;
                const hasPicked = babyStarter.some((s) => s.owner === player.id);
                return (
                    <PlayerItem key={player.id}>
                        <StatusDot $ready={isReady} $picked={hasPicked} />
                        <PlayerName>{player.name || `Player ${player.id}`}</PlayerName>
                        <StatusLabel $ready={isReady}>
                            {isReady ? '✓ Ready' : hasPicked ? 'Chosen' : 'Picking...'}
                        </StatusLabel>
                    </PlayerItem>
                );
            })}
        </List>
    );
};

const List = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #eeeeee;
`;

const PlayerItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    background: #f8f9fa;
    border-radius: 20px;
    padding: 6px 14px 6px 10px;
`;

const StatusDot = styled.div<{ $ready: boolean; $picked: boolean }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $ready, $picked }) =>
        $ready ? '#6BCB77' : $picked ? '#FFD93D' : '#cccccc'};
    flex-shrink: 0;
`;

const PlayerName = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: #333333;
`;

const StatusLabel = styled.span<{ $ready: boolean }>`
    font-size: 12px;
    color: ${({ $ready }) => ($ready ? '#2d7d35' : '#888888')};
    font-weight: ${({ $ready }) => ($ready ? '700' : '400')};
`;

export default PlayerReadyList;
