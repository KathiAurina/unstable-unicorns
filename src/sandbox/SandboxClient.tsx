import { useState } from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import type { Ctx } from 'boardgame.io';
import Board from '../Board';
import UnstableUnicorns from '../game/game';
import { SandboxControlContext } from './sandboxContext';
import type { SandboxAction } from './sandboxContext';

const SandboxGame = {
    ...UnstableUnicorns,
    setup: (ctx: Ctx) =>
        (UnstableUnicorns as any).setup(ctx, { sandbox: true, ownerPlayerID: "0" }),
    turn: {
        ...(UnstableUnicorns as any).turn,
        order: {
            playOrder: () => ["0", "1", "2"],
            first: () => 0,
            next: (_G: any, ctx: any) => (ctx.playOrderPos + 1) % ctx.numPlayers,
        },
    },
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
