import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { useParams, useHistory } from 'react-router-dom';
import Board from './Board';
import UnstableUnicorns from './game/game';

type RouteParam = {
    numPlayers?: string;
    playerID?: string;
    matchID?: string;
}

type Props = {
    debug?: string;
}

interface LocationState {
    credentials?: string;
}

const UnstableUnicornsClient = ({ debug }: Props) => {
    const { numPlayers, playerID, matchID } = useParams<RouteParam>();
    const history = useHistory();
    const locationState = history.location.state as LocationState;
    const searchParams = new URLSearchParams(history.location.search);
    const credParam = searchParams.get("credentials");
    const credentials = (locationState?.credentials !== undefined ? locationState.credentials : (credParam !== null ? credParam : undefined)) as string | undefined;

    if (debug === "test") {
        const UnstableUnicornsClient = Client({
            game: UnstableUnicorns,
            board: Board,
            numPlayers: 3,
            //multiplayer: SocketIO({ server: `localhost:8000` }),
        });

        return <UnstableUnicornsClient matchID={"test"} playerID={"0"} />
    }

    let UnstableUnicornsClient = null;
    const serverUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
    if (numPlayers) {
        UnstableUnicornsClient = Client({
            game: UnstableUnicorns,
            board: Board,
            debug: false,
            numPlayers: parseInt(numPlayers),
            multiplayer: SocketIO({ server: serverUrl }),
        });
    } else {
        return (<h1>Num players argument is missing</h1>);
    }
    
    return <UnstableUnicornsClient matchID={matchID} playerID={playerID} credentials={credentials} />
}

export default UnstableUnicornsClient;