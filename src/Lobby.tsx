import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import BG from './assets/ui/board-background.jpg';

const API_PORT = 8080;
const API_URL = `http://localhost:${API_PORT}`;

interface Match {
    gameID: string;
    matchID: string;
    players: {
        id: number;
        name?: string;
    }[];
    setupData?: {
        matchName?: string;
    };
}

const Lobby = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [numPlayers, setNumPlayers] = useState(2);
    const [matchName, setMatchName] = useState("");

    const fetchMatches = async () => {
        try {
            const response = await fetch(`${API_URL}/games/unstable_unicorns`);
            if (response.ok) {
                const data = await response.json();
                setMatches(data.matches);
            }
        } catch (error) {
            console.error("Failed to fetch matches", error);
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    numPlayers: numPlayers,
                    setupData: { matchName: matchName || undefined },
                })
            });
            if (response.ok) {
                const data = await response.json();
                console.log("Created match", data);
                fetchMatches();
                // Auto-join removed as per request
            } else {
                console.error("Failed to create match", await response.text());
            }
        } catch (error) {
            console.error("Failed to create match", error);
        }
    };


    // Improved joinMatch to use match info
    const joinSpecificMatch = async (match: Match, playerID: number) => {
        try {
            const response = await fetch(`${API_URL}/games/unstable_unicorns/${match.matchID}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerID: String(playerID),
                    playerName: `Player ${playerID}`
                })
            });
            if (response.ok) {
                const data = await response.json();

                const queryParams = new URLSearchParams();
                queryParams.append('credentials', data.playerCredentials);

                const url = `/${match.matchID}/${match.players.length}/${playerID}?${queryParams.toString()}`;

                // Open in new tab
                window.open(url, '_blank');
            } else {
                 const errorText = await response.text();
                 alert(`Failed to join: ${errorText}`);
                 console.error("Join error:", errorText);
            }
        } catch(e) {
            console.error(e);
        }
    }

    return (
        <Wrapper>
            <Content>
                <Title>Unstable Unicorns</Title>
                <Section>
                    <h2>Create A New Game!</h2>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <Label>
                            Game Name:
                            <Input
                                type="text"
                                value={matchName}
                                onChange={(e) => setMatchName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && createMatch()}
                                placeholder="Optional"
                            />
                        </Label>
                        <Label>
                            Number of Players:
                            <Input
                                type="number"
                                min="2"
                                max="8"
                                value={numPlayers}
                                onChange={(e) => setNumPlayers(parseInt(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && createMatch()}
                            />
                        </Label>
                        <Button onClick={createMatch}>Create Game</Button>
                    </div>
                </Section>

                <Section>
                    <h2>Existing Games</h2>
                    {matches.length === 0 ? (
                        <p>No games found.</p>
                    ) : (
                        <MatchList>
                            {matches.map((match) => (
                                <MatchItem key={match.matchID}>
                                    <MatchInfo>
                                        <strong>{match.setupData?.matchName ? `${match.setupData.matchName} (${match.matchID})` : match.matchID}</strong>
                                        <span>{match.players.length} players</span>
                                    </MatchInfo>
                                    <PlayerButtons>
                                        {match.players.map((player) => (
                                            <SmallButton
                                                key={player.id}
                                                onClick={() => joinSpecificMatch(match, player.id)}
                                                disabled={!!player.name}
                                            >
                                                Join as Player {player.id} {player.name ? `(${player.name})` : ''}
                                            </SmallButton>
                                        ))}
                                    </PlayerButtons>
                                </MatchItem>
                            ))}
                        </MatchList>
                    )}
                </Section>
            </Content>
        </Wrapper>
    );
};

const Wrapper = styled.div`
    width: 100%;
    min-height: 100vh;
    background-image: url(${BG});
    background-size: cover;
    background-position: center;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 50px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const Content = styled.div`
    width: 800px;
    background-color: #BC4747;
    padding: 30px;
    border-radius: 16px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    color: white;
`;

const Title = styled.h1`
    text-align: center;
    color: white;
    margin-bottom: 30px;
`;

const Section = styled.div`
    background: rgba(0, 0, 0, 0.1);
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    box-shadow: none;

    h2 {
        margin-top: 0;
        color: white;
        border-bottom: 2px solid rgba(255, 255, 255, 0.3);
        padding-bottom: 10px;
        margin-bottom: 15px;
    }
`;

const Label = styled.label`
    display: flex;
    flex-direction: column;
    font-weight: bold;
    color: white;
    margin-right: 15px;
`;

const Input = styled.input`
    padding: 1em;
    background-color: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 4px;
    margin-top: 5px;
    font-size: 14px;
    color: white;
    
    &:focus {
        outline: none;
        background-color: rgba(255, 255, 255, 0.3);
    }

    &::placeholder {
        color: rgba(255, 255, 255, 0.7);
    }
`;


const Button = styled.button`
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
    transition: background-color 0.2s;
    align-self: flex-end;

    &:hover {
        background-color: #0056b3;
    }
`;

const SmallButton = styled(Button)`
    padding: 5px 10px;
    font-size: 12px;
    margin-right: 5px;
    margin-bottom: 5px;
    background-color: #28a745;

    &:hover {
        background-color: #218838;
    }

    &:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }
`;

const MatchList = styled.ul`
    list-style: none;
    padding: 0;
    margin: 0;
`;

const MatchItem = styled.li`
    border-bottom: 1px solid #eee;
    padding: 15px 0;
    &:last-child {
        border-bottom: none;
    }
`;

const MatchInfo = styled.div`
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    
    strong {
        font-size: 1.1em;
        color: white;
    }
    
    span {
        color: rgba(255,255,255,0.8);
    }
`;

const PlayerButtons = styled.div`
    display: flex;
    flex-wrap: wrap;
`;

export default Lobby;
