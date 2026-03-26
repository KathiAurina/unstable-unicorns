import React from 'react';
import styled from 'styled-components';

interface Match {
    gameID: string;
    matchID: string;
    players: { id: number; name?: string; }[];
    setupData?: { matchName?: string; ownerPlayerID?: string };
    gameover?: unknown;
}

interface Props {
    match: Match;
    onJoin: (match: Match, playerID: number) => void;
}

const GameListItem = ({ match, onJoin }: Props) => {
    const takenCount = match.players.filter(p => p.name).length;
    const totalCount = match.players.length;
    const isFull = takenCount === totalCount;
    const displayName = match.setupData?.matchName
        ? `${match.setupData.matchName}`
        : match.matchID;

    return (
        <Item>
            <AccentBar />
            <ItemContent>
                <ItemHeader>
                    <GameName>{displayName}</GameName>
                    <PlayerBadge $full={isFull}>
                        {isFull ? 'FULL' : `${takenCount}/${totalCount} Players`}
                    </PlayerBadge>
                </ItemHeader>
                <ButtonRow>
                    {match.players.map((player) => (
                        <JoinButton
                            key={player.id}
                            onClick={() => onJoin(match, player.id)}
                            disabled={!!player.name}
                        >
                            {player.name
                                ? `Player ${player.id}: ${player.name}`
                                : `Join as Player ${player.id}`}
                        </JoinButton>
                    ))}
                </ButtonRow>
            </ItemContent>
        </Item>
    );
};

const Item = styled.div`
    display: flex;
    border-bottom: 1px solid #eeeeee;
    &:last-child {
        border-bottom: none;
    }
`;

const AccentBar = styled.div`
    width: 4px;
    border-radius: 4px;
    background: linear-gradient(180deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, #9B59B6);
    margin: 12px 16px 12px 0;
    flex-shrink: 0;
`;

const ItemContent = styled.div`
    flex: 1;
    padding: 14px 0;
`;

const ItemHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
`;

const GameName = styled.span`
    font-weight: 700;
    font-size: 15px;
    color: #333333;
`;

const PlayerBadge = styled.span<{ $full: boolean }>`
    font-size: 12px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    background: ${({ $full }) => $full ? '#ffeded' : '#edf6ee'};
    color: ${({ $full }) => $full ? '#cc3333' : '#2d7d35'};
`;

const ButtonRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const JoinButton = styled.button`
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    font-family: 'Nunito', sans-serif;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    background: linear-gradient(90deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, #9B59B6);
    color: white;

    &:hover:not(:disabled) {
        transform: scale(1.03);
        box-shadow: 0 3px 8px rgba(0,0,0,0.12);
    }

    &:disabled {
        background: #e0e0e0;
        color: #888888;
        cursor: not-allowed;
    }
`;

export type { Match };
export default GameListItem;
