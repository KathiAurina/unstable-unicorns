import { useState } from 'react';
import styled from 'styled-components';
import ImageLoader from './assets/card/imageLoader';
import BG from './assets/ui/board-background.jpg';
import { Card } from './game/card';
import { UnstableUnicornsGame } from './game/game';
import { PlayerID } from './game/player';

type Props = {
    G: UnstableUnicornsGame,
    babyCards: Card[],
    playerID: PlayerID,
    moves: any,
};

const BoardGameBegin = (props: Props) => {

    const [playerName, setPlayerName] = useState<string>("Player");

    return (
        <Wrapper>
            <div style={{
                display: "flex",
                width: "100%",
                justifyContent: "center",
                alignItems: "flex-start",
                borderRadius: "16pt",
                minHeight: "500px",
                padding: "2em 0",
                color: "white"
            }}>
                <div style={{
                    backgroundColor: `#BC4747`,
                    width: "70%",
                    padding: "2em",
                    borderRadius: "16px"
                }}>
                    <h1>My name:</h1>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "2em" }}>
                        <input type="text" name="name" value={playerName} onChange={(evt) => {
                            setPlayerName(evt.target.value)
                        }} onKeyDown={(evt) => {
                            if (evt.key === 'Enter') {
                                props.moves.changeName(props.playerID, playerName);
                            }
                        }} style={{
                            padding: "1em",
                            backgroundColor: "rgba(255,255,255,0.2)",
                            border: "none",
                            fontSize: "16pt",
                            color: "white",
                            marginRight: "1em"
                        }} />
                        <StyledButton onClick={() => {
                            props.moves.changeName(props.playerID, playerName);
                        }} style={{ marginBottom: 0 }}>Change name</StyledButton>
                    </div>
                    <h1>Choose your baby unicorn</h1>
                    <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        marginTop: "1em",
                        overflow: "auto"
                    }}>
                        {props.babyCards.map(card => {
                            let style = {}
                            const t = props.G.babyStarter.find(f => f.cardID === card.id);

                            if (t) {
                                if (t.owner === props.playerID) {
                                    style = {
                                        border: "4px solid white",
                                    }
                                } else {
                                    style = {
                                        border: "4px solid white",
                                        opacity: 0.3,
                                        cursor: "not-allowed"
                                    }
                                }  
                            } 

                            return (<div style={{ margin: "0.5em", width: "80px", flexShrink: 0 }} key={card.id}>
                                <img alt={`Baby Unicorn ${card.id}`} style={{ cursor: "pointer", ...style, borderRadius: "16px" }} src={ImageLoader.load(card.image)} width="100%" onClick={() => {
                                    if (props.G.babyStarter.find(s => s.owner === props.playerID)) {
                                        return;
                                    }
                                    props.moves.selectBaby(props.playerID, card.id);
                                }} />
                            </div>)
                        })}
                    </div>
                    {props.G.babyStarter.find(s => s.owner === props.playerID) && (
                    <div style={{
                        cursor: "pointer",
                        padding: "1em",
                        border: "1px solid white",
                        width: "280px",
                        textAlign: "center",
                        borderRadius: "16px",
                        fontWeight: 600,
                        fontSize: "16pt"
                    }}
                        onClick={() => props.moves.ready(props.playerID)}>
                        {props.G.ready[props.playerID] === true ? "Waiting for others..." : "Click here if you are ready"}
                    </div>)
                    }
                </div>
            </div>
        </Wrapper>
    );
}

const Wrapper = styled.div`
    width: 100%;
    height: 100vh;
    background-image: url(${BG});
    background-size: cover;
    position: relative;
    overflow: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const StyledButton = styled.button`
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
    transition: background-color 0.2s;
    margin-bottom: 2em;
    display: block;

    &:hover {
        background-color: #0056b3;
    }
`;

export default BoardGameBegin;