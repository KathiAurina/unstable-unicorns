import { useState } from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import Board from '../Board';
import UnstableUnicorns from '../game/game';
import { SandboxControlContext } from './sandboxContext';
import type { SandboxAction } from './sandboxContext';

// The sandbox is the normal game, set up without a pregame and with the cheat moves switched on.
const SandboxGame = {
    ...UnstableUnicorns,
    setup: (ctx: Parameters<NonNullable<typeof UnstableUnicorns.setup>>[0]) =>
        UnstableUnicorns.setup!(ctx, { sandbox: true, ownerPlayerID: "0" }),
};

const SandboxBoardgameClient = Client({
    game: SandboxGame,
    board: Board as any,
    numPlayers: 3,
    debug: false,
    multiplayer: Local(),
});

const SandboxClient = () => {
    const [viewedPlayerID, setViewedPlayerID] = useState("0");
    const [sandboxAction, setSandboxAction] = useState<SandboxAction>(null);

    return (
        <SandboxControlContext.Provider value={{ viewedPlayerID, setViewedPlayerID, sandboxAction, setSandboxAction }}>
            {["0", "1", "2"].map(pid => (
                <div key={pid} style={{ display: viewedPlayerID === pid ? 'contents' : 'none' }}>
                    <SandboxBoardgameClient matchID="sandbox" playerID={pid} />
                </div>
            ))}
        </SandboxControlContext.Provider>
    );
};

export default SandboxClient;
