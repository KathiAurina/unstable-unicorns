import React from 'react';
import styled from 'styled-components';
import GameListItem, { Match } from './GameListItem';

interface Props {
    matches: Match[];
    onJoin: (match: Match, playerID: number) => void;
}

const GameList = ({ matches, onJoin }: Props) => {
    return (
        <Card>
            <CardTitle>Existing Games</CardTitle>
            {matches.length === 0 ? (
                <EmptyState>No games yet — create one above!</EmptyState>
            ) : (
                <List>
                    {matches.map((match) => (
                        <GameListItem key={match.matchID} match={match} onJoin={onJoin} />
                    ))}
                </List>
            )}
        </Card>
    );
};

const Card = styled.div`
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    padding: 24px 28px;
`;

const CardTitle = styled.h2`
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 700;
    color: #333333;
`;

const List = styled.div``;

const EmptyState = styled.p`
    color: #888888;
    font-size: 14px;
    margin: 0;
    padding: 16px 0;
    text-align: center;
`;

export default GameList;
