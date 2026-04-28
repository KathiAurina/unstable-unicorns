import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import CreateGameCard from './CreateGameCard';
import GameList from './GameList';
import { Match } from './GameListItem';

const API_URL = process.env.REACT_APP_LOBBY_URL || window.location.origin;

const LobbyPage = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [numPlayers, setNumPlayers] = useState(2);
    const [matchName, setMatchName] = useState('');

    const fetchMatches = async () => {
        try {
            const response = await fetch(`${API_URL}/games/unstable_unicorns`);
            if (response.ok) {
                const data = await response.json();
                setMatches(data.matches);
            }
        } catch (error) {
            console.error('Failed to fetch matches', error);
        }
    };

    useEffect(() => {
        fetchMatches();
        const interval = setInterval(fetchMatches, 2000);
        return () => clearInterval(interval);
    }, []);

    const createMatch = async () => {
        try {
            const response = await fetch(`${API_URL}/games/unstable_unicorns/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numPlayers,
                    setupData: { matchName: matchName || undefined, ownerPlayerID: "0" },
                }),
            });
            if (response.ok) {
                const { matchID } = await response.json();
                const joinResponse = await fetch(`${API_URL}/games/unstable_unicorns/${matchID}/join`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ playerID: "0", playerName: "Player 0" }),
                });
                if (joinResponse.ok) {
                    const joinData = await joinResponse.json();
                    const queryParams = new URLSearchParams();
                    queryParams.append('credentials', joinData.playerCredentials);
                    const url = `/${matchID}/${numPlayers}/0?${queryParams.toString()}`;
                    const newWindow = window.open(url, '_blank');
                    if (newWindow) newWindow.opener = null;
                }
                fetchMatches();
            } else {
                console.error('Failed to create match', await response.text());
            }
        } catch (error) {
            console.error('Failed to create match', error);
        }
    };

    const joinSpecificMatch = async (match: Match, playerID: number) => {
        try {
            const response = await fetch(`${API_URL}/games/unstable_unicorns/${match.matchID}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerID: String(playerID),
                    playerName: `Player ${playerID}`,
                }),
            });
            if (response.ok) {
                const data = await response.json();
                const queryParams = new URLSearchParams();
                queryParams.append('credentials', data.playerCredentials);
                const url = `/${match.matchID}/${match.players.length}/${playerID}?${queryParams.toString()}`;
                const newWindow = window.open(url, '_blank');
                if (newWindow) {
                    newWindow.opener = null;
                }
            } else {
                const errorText = await response.text();
                alert(`Failed to join: ${errorText}`);
                console.error('Join error:', errorText);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const openSandbox = () => {
        const w = window.open('/sandbox', '_blank');
        if (w) w.opener = null;
    };

    return (
        <PageWrapper>
            <ContentColumn>
                <LogoWrapper>
                    <Logo>Unstable Unicorns</Logo>
                </LogoWrapper>
                <SandboxRow>
                    <SandboxButton onClick={openSandbox}>Open Sandbox</SandboxButton>
                </SandboxRow>
                <CreateGameCard
                    matchName={matchName}
                    setMatchName={setMatchName}
                    numPlayers={numPlayers}
                    setNumPlayers={setNumPlayers}
                    onSubmit={createMatch}
                />
                <GameList
                    matches={matches.filter(m => !m.gameover && !m.players.every(p => !p.name))}
                    onJoin={joinSpecificMatch}
                />
            </ContentColumn>
        </PageWrapper>
    );
};

const PageWrapper = styled.div`
    min-height: 100vh;
    background-image: url(${require('../../assets/lobby-background.png')});
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: fixed;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 40px 20px 60px;
    box-sizing: border-box;
`;

const ContentColumn = styled.div`
    width: 100%;
    max-width: 960px;
`;

const LogoWrapper = styled.div`
    text-align: center;
    margin-bottom: 32px;
`;

const SandboxRow = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
`;

const SandboxButton = styled.button`
    background: transparent;
    color: #9d7fe0;
    border: 1px solid #9d7fe0;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 13px;
    font-family: 'Nunito', sans-serif;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    &:hover {
        background: #9d7fe0;
        color: #fff;
    }
`;

const Logo = styled.h1`
    display: inline-block;
    font-size: 42px;
    font-weight: 800;
    font-family: 'Nunito', sans-serif;
    background: linear-gradient(90deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, #9B59B6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;

    @media (max-width: 768px) {
        font-size: 28px;
    }
`;

export default LobbyPage;
