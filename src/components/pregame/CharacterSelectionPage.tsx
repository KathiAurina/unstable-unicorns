import React, { useState } from 'react';
import styled from 'styled-components';
import type { UnstableUnicornsGame } from '../../game/state';
import type { Card } from '../../game/card';
import { PlayerID } from '../../game/player';
import RainbowButton from '../shared/RainbowButton';
import StyledInput from '../shared/StyledInput';
import UnicornAvatar from './UnicornAvatar';
import PlayerReadyList from './PlayerReadyList';

type Props = {
    G: UnstableUnicornsGame;
    babyCards: Card[];
    playerID: PlayerID;
    moves: any;
};

const CharacterSelectionPage = ({ G, babyCards, playerID, moves }: Props) => {
    const [playerName, setPlayerName] = useState<string>('Player');

    const mySelection = G.babyStarter.find((s) => s.owner === playerID);
    const isReady = G.ready[playerID] === true;

    const handleChangeName = () => {
        moves.changeName(playerID, playerName);
    };

    const handleSelectBaby = (cardID: number) => {
        if (mySelection) return;
        moves.selectBaby(playerID, cardID);
    };

    const handleReady = () => {
        if (!isReady) {
            moves.ready(playerID);
        }
    };

    return (
        <PageWrapper>
            <Card>
                <Title>Character Selection</Title>

                <Section>
                    <SectionLabel>My Name</SectionLabel>
                    <NameRow>
                        <StyledInput
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChangeName()}
                            placeholder="Enter your name"
                        />
                        <RainbowButton variant="blue" onClick={handleChangeName}>
                            Change name
                        </RainbowButton>
                    </NameRow>
                </Section>

                <Section>
                    <SectionLabel>Choose your baby unicorn</SectionLabel>
                    <AvatarGrid>
                        {babyCards.map((card) => {
                            const taken = G.babyStarter.find((s) => s.cardID === card.id);
                            const isSelected = taken?.owner === playerID;
                            const isTaken = !!taken && !isSelected;

                            return (
                                <UnicornAvatar
                                    key={card.id}
                                    card={card}
                                    isSelected={isSelected}
                                    isTaken={isTaken}
                                    onClick={() => handleSelectBaby(card.id)}
                                />
                            );
                        })}
                    </AvatarGrid>
                </Section>

                {mySelection && (
                    <ReadySection>
                        <RainbowButton onClick={handleReady} disabled={isReady}>
                            {isReady ? 'Waiting for others...' : 'Ready!'}
                        </RainbowButton>
                    </ReadySection>
                )}

                <PlayerReadyList
                    players={G.players}
                    ready={G.ready}
                    babyStarter={G.babyStarter}
                />
            </Card>
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

const Card = styled.div`
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    padding: 32px 36px;
    width: 100%;
    max-width: 800px;

    @media (max-width: 768px) {
        padding: 24px 20px;
    }
`;

const Title = styled.h1`
    font-size: 26px;
    font-weight: 800;
    color: #333333;
    margin: 0 0 28px 0;
    text-align: center;
`;

const Section = styled.div`
    margin-bottom: 24px;
`;

const SectionLabel = styled.h3`
    font-size: 14px;
    font-weight: 700;
    color: #555555;
    margin: 0 0 10px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const NameRow = styled.div`
    display: flex;
    gap: 10px;
    align-items: center;

    input {
        flex: 1;
    }

    @media (max-width: 480px) {
        flex-direction: column;
        align-items: stretch;
    }
`;

const AvatarGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
`;

const ReadySection = styled.div`
    margin-top: 8px;
    margin-bottom: 4px;
`;

export default CharacterSelectionPage;
