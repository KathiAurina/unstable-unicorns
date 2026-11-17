import styled from 'styled-components';
import type { GameState } from '../game/engine';
import { candidateCards } from '../game/engine';
import { cardView, playerName } from '../view/cards';
import type { BoardModel } from '../view/model';
import NeighLabel, { NeighLabelRole } from '../ui/NeighLabel';

type Props = {
    G: GameState;
    model: BoardModel;
    onPlayNeigh: () => void;
    onPass: () => void;
}

const NeighLabelWrapper = styled.div`
    width: 100%;
    display: flex;
    justify-content: center;
    position: absolute;
    top: -16px;
`;

/** Which text the label shows for this player, from what they did in the response round. */
export function neighRole(model: BoardModel): NeighLabelRole {
    const round = model.round!;
    const me = model.me;
    const asked = model.respond !== undefined;
    const lastResponse = round.responses[round.responses.length - 1];
    if (round.by === me) {
        return asked ? 'original_initiator_can_counterneigh' : 'original_initiator';
    }
    if (asked) return 'open';
    if (lastResponse?.by === me) return 'new_initiator';
    if (round.responses.some(r => r.by === me)) return 'did_neigh';
    return 'did_not_neigh';
}

// The response round on the desktop board: the card being played, how the voting stands, and the
// buttons to play a Neigh or pass.
const NeighPanel = ({ G, model, onPlayNeigh, onPass }: Props) => {
    const round = model.round;
    if (!round) return null;

    const lastResponse = round.responses[round.responses.length - 1];
    const canRespond = model.respond !== undefined && candidateCards(model.respond).length > 0;

    return (
        <NeighLabelWrapper>
            <NeighLabel
                card={cardView(G, round.card)}
                originalInitiatorName={playerName(G, round.by)}
                newInitiatorName={lastResponse ? playerName(G, lastResponse.by) : undefined}
                role={neighRole(model)}
                didVote={model.respond === undefined}
                numberOfNeighedCards={round.stopped ? 1 : 0}
                showPlayNeighButton={canRespond}
                onPlayNeighClick={onPlayNeigh}
                onDontPlayNeighClick={onPass}
            />
        </NeighLabelWrapper>
    );
}

export default NeighPanel;
