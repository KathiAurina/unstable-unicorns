import _ from 'underscore';
import styled from 'styled-components';
import type { UnstableUnicornsGame, Ctx } from '../game/state';
import type { Moves } from '../game/types';
import NeighLabel, { NeighLabelRole } from '../ui/NeighLabel';

type Props = {
    G: UnstableUnicornsGame;
    ctx: Ctx;
    playerID: string;
    moves: Moves;
}

const NeighLabelWrapper = styled.div`
    width: 100%;
    display: flex;
    justify-content: center;
    position: absolute;
    top: -16px;
`;

const NeighPanel = ({ G, ctx, playerID, moves }: Props) => {
    if (!G.neighDiscussion) {
        return null;
    }

    const currentRound = _.last(G.neighDiscussion.rounds)!;
    let role: NeighLabelRole = "original_initiator";
    let newInitiatorName: string | undefined = undefined;
    const originalInitiatorName = G.players[parseInt(G.neighDiscussion.protagonist)].name;

    if (G.neighDiscussion.rounds.length > 1) {
        const beforeRound = _.last(G.neighDiscussion.rounds, 2)[0];
        newInitiatorName = G.players[parseInt(_.findKey(beforeRound.playerState, val => val.vote === "neigh")!)].name;
    }

    if (G.neighDiscussion.protagonist === playerID) {
        if (G.neighDiscussion.rounds.length > 1) {
            const beforeRound = _.last(G.neighDiscussion.rounds, 2)[0];
            if (beforeRound.playerState[playerID].vote === "neigh") {
                role = "original_initiator";
            } else {
                role = "original_initiator_can_counterneigh";
            }
        } else {
            role = "original_initiator";
        }
    } else if (currentRound.playerState[playerID].vote === "undecided") {
        role = "open";
    } else if (currentRound.playerState[playerID].vote === "neigh") {
        role = "did_neigh";
    } else if (currentRound.playerState[playerID].vote === "no_neigh") {
        if (G.neighDiscussion.rounds.length > 1) {
            const beforeRound = _.last(G.neighDiscussion.rounds, 2)[0];
            if (beforeRound.playerState[playerID].vote === "neigh") {
                role = "new_initiator";
            } else {
                role = "did_not_neigh";
            }
        } else {
            role = "did_not_neigh";
        }
    }

    const onPlayNeighClick = () => {
        const neighCardOnHand = G.hand[playerID].map(c => G.deck[c]).find(c => c.type === "neigh");
        if (neighCardOnHand) {
            moves.playNeigh(neighCardOnHand.id, playerID, G.neighDiscussion!.rounds.length - 1)
        } else {
            const superNeigh = G.hand[playerID].map(c => G.deck[c]).find(c => c.type === "super_neigh");
            moves.playSuperNeigh(superNeigh!.id, playerID, G.neighDiscussion!.rounds.length - 1)
        }
    }

    const onDontPlayNeighClick = () => {
        moves.dontPlayNeigh(playerID, G.neighDiscussion!.rounds.length - 1);
    }

    const didVote = currentRound.playerState[playerID].vote !== "undecided";

    return (
        <NeighLabelWrapper>
            <NeighLabel card={G.deck[G.neighDiscussion.cardID]} originalInitiatorName={originalInitiatorName} newInitiatorName={newInitiatorName} role={role} didVote={didVote} numberOfNeighedCards={G.neighDiscussion.rounds.filter(s => s.state === "neigh").length} showPlayNeighButton={G.hand[playerID].map(c => G.deck[c]).filter(c => c.type === "neigh" || c.type === "super_neigh").length > 0 && G.playerEffects[playerID].find(s => s.effect.key === "you_cannot_play_neigh") === undefined} onPlayNeighClick={onPlayNeighClick} onDontPlayNeighClick={onDontPlayNeighClick} />
        </NeighLabelWrapper>
    );
}

export default NeighPanel;
