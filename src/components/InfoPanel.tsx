import styled from 'styled-components';
import { UnstableUnicornsGame, Ctx, _findOpenScenesWithProtagonist, _findInProgressScenesWithProtagonist } from '../game/game';
import { BoardState } from '../BoardStateManager';
import InfoLabel from '../ui/InfoLabel';

type Props = {
    G: UnstableUnicornsGame;
    ctx: Ctx;
    playerID: string;
    boardStates: BoardState[];
}

const InfoLabelWrapper = styled.div`
    width: 100%;
    display: flex;
    justify-content: center;
    position: absolute;
    top: -16px;
`;

const InfoPanel = ({ G, ctx, playerID, boardStates }: Props) => {
    let text: string | undefined = undefined;
    const openScenes = _findOpenScenesWithProtagonist(G, playerID);
    const scenesInProgress = _findInProgressScenesWithProtagonist(G, playerID);

    if (ctx.currentPlayer === playerID && ctx.activePlayers![playerID] === "beginning" && openScenes.length > 0) {
        text = "One of your cards has an effect that can be activated. You can activate it and after that draw a card. You may also skip the effect and just draw a card."
    }

    if (ctx.currentPlayer === playerID && ctx.activePlayers![playerID] === "beginning" && scenesInProgress.length > 0) {
        text = "One of your cards has an effect that must be activated. You must first activate it before you can draw a card."
    }

    if (playerID === ctx.currentPlayer) {
        if (G.countPlayedCardsInActionPhase === 0 && G.neighDiscussion === undefined && ctx.activePlayers![playerID] === "action_phase") {
            // action phase and no card has been played or drawn
            // player may draw a card or play a card
            text = "You can play a card from your hand or you can draw a card. You cannot do both."
        }
    }

    if (boardStates.find(o => o.type === "discard" || o.type === "discard__popup__committed")) {
        text = "Click on a card in your hand to discard that card."
    }

    if (boardStates.find(o => o.type === "destroy__click_on_card_in_stable")) {
        text = "Click on a card in a player's stable to destroy that card."
    }

    if (boardStates.find(o => o.type === "sacrifice__clickOnCardInStable")) {
        text = "Click on a card in your stable to sacrifice that card."
    }

    if (boardStates.find(o => o.type === "steal__cardToCard")) {
        const boardState = boardStates.find(o => o.type === "steal__cardToCard")!;
        const card = G.deck[boardState.info!.sourceCardID!];
        text = `Click on ${card.title} and then click on another player's card which you'd like to steal.`
    }

    if (boardStates.find(o => o.type === "draw__clickOnDrawPile")) {
        const boardState = boardStates.find(o => o.type === "draw__clickOnDrawPile");
        text = `Click on the draw pile on the right to draw ${boardState?.info?.count} card.`
    }

    if (boardStates.find(o => o.type === "swapHands__cardToPlayer")) {
        const boardState = boardStates.find(o => o.type === "swapHands__cardToPlayer")!;
        const card = G.deck[boardState.info!.sourceCardID!];
        text = `Click on ${card.title} and then on a player's name to trade hands with them.`
    }

    if (boardStates.find(o => o.type === "move__cardToCard")) {
        const boardState = boardStates.find(o => o.type === "move__cardToCard")!;
        const card = G.deck[boardState.info!.sourceCardID!];
        text = `Click on ${card.title} and then on another card to move that card.`
    }

    if (boardStates.find(o => o.type === "move2__cardToPlayer")) {
        const boardState = boardStates.find(o => o.type === "move2__cardToPlayer")!;
        const card = G.deck[boardState.info!.sourceCardID!];
        text = `Click on ${card.title} and then on any player's name to move the previously selected card into that player's stable.`
    }

    if (boardStates.find(o => o.type === "wait_for_other_players")) {
        text = "Wait for other players...";
    }

    if (boardStates.find(o => o.type === "unicornswap1")) {
        const boardState = boardStates.find(o => o.type === "unicornswap1")!;
        const card = G.deck[boardState.info!.sourceCardID!];
        text = `Click on ${card.title} and then on one of your cards which should be moved.`
    }

    if (boardStates.find(o => o.type === "unicornswap2")) {
        const boardState = boardStates.find(o => o.type === "unicornswap2")!;
        const card = G.deck[boardState.info!.sourceCardID!];
        text = `Click on ${card.title} and then click on another player to which you would like to move the card.`
    }

    if (boardStates.find(o => o.type === "blatantThievery1")) {
        const boardState = boardStates.find(o => o.type === "blatantThievery1")!;
        const card = G.deck[boardState.info!.sourceCardID!];
        text = `Click on ${card.title} and then click on a player to take a look at the player's hand.`
    }

    if (boardStates.find(o => o.type === "pullRandom__cardToPlayer")) {
        const boardState = boardStates.find(o => o.type === "pullRandom__cardToPlayer")!;
        const card = G.deck[boardState.info!.sourceCardID!];
        text = `Click on ${card.title} and then click on a player to pull a random card from that player.`
    }

    if (!text) {
        return null;
    }

    return (
        <InfoLabelWrapper>
            <InfoLabel>
                {text}
            </InfoLabel>
        </InfoLabelWrapper>
    );
}

export default InfoPanel;
