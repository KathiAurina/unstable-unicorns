import React from 'react';
import styled from 'styled-components';
import RainbowButton from '../shared/RainbowButton';
import StyledInput from '../shared/StyledInput';

interface Props {
    matchName: string;
    setMatchName: (name: string) => void;
    numPlayers: number;
    setNumPlayers: (n: number) => void;
    onSubmit: () => void;
}

const CreateGameCard = ({ matchName, setMatchName, numPlayers, setNumPlayers, onSubmit }: Props) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onSubmit();
    };

    return (
        <Card>
            <CardTitle>Create A New Game</CardTitle>
            <FormRow>
                <FormGroup>
                    <Label>Game Name</Label>
                    <StyledInput
                        type="text"
                        value={matchName}
                        onChange={(e) => setMatchName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter magical title..."
                    />
                </FormGroup>
                <FormGroup>
                    <Label>Number of Players</Label>
                    <Select
                        value={numPlayers}
                        onChange={(e) => setNumPlayers(parseInt(e.target.value))}
                    >
                        <option value={1}>1 Player (Sandbox)</option>
                        {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                            <option key={n} value={n}>{n} Players</option>
                        ))}
                    </Select>
                </FormGroup>
                <ButtonWrapper>
                    <RainbowButton onClick={onSubmit}>Create Game</RainbowButton>
                </ButtonWrapper>
            </FormRow>
        </Card>
    );
};

const Card = styled.div`
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    padding: 24px 28px;
    margin-bottom: 20px;
`;

const CardTitle = styled.h2`
    margin: 0 0 18px 0;
    font-size: 18px;
    font-weight: 700;
    color: #333333;
`;

const FormRow = styled.div`
    display: flex;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
`;

const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-width: 140px;
`;

const Label = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: #555555;
`;

const Select = styled.select`
    padding: 10px 14px;
    background: #ffffff;
    border: 1px solid #dddddd;
    border-radius: 8px;
    font-size: 14px;
    font-family: 'Nunito', sans-serif;
    color: #333333;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &:focus {
        border-color: #4D96FF;
        box-shadow: 0 0 0 3px rgba(77, 150, 255, 0.2);
    }
`;

const ButtonWrapper = styled.div`
    padding-bottom: 1px;
`;

export default CreateGameCard;
