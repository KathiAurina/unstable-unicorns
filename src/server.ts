import * as path from 'path';
import UnstableUnicorns from './game/game';
const serve = require('koa-static');
const { Server } = require('boardgame.io/server');

// 1. CORS — allow the frontend and the dedicated lobby subdomain
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://uu.clicque.de';
const LOBBY_ORIGIN = process.env.LOBBY_ORIGIN || 'https://uu-lobby.clicque.de';

const server = Server({
  games: [UnstableUnicorns],
  origins: [CORS_ORIGIN, LOBBY_ORIGIN, 'http://localhost:3000', 'http://localhost:8000'],
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;
const API_PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 8082;
const LOBBY_HOST = process.env.LOBBY_HOST || '0.0.0.0';

// 2. Serve Frontend Build
const frontEndAppBuildPath = path.resolve(__dirname, '../build');
server.app.use(serve(frontEndAppBuildPath));

// 3. Fallback for React Router
server.app.use(
    async (ctx: any, next: any) => await serve(frontEndAppBuildPath)(
        Object.assign(ctx, { path: 'index.html' }),
        next
    )
);

// 4. Start Server and Lobby
const lobbyConfig = {
  apiPort: API_PORT,
  apiHost: LOBBY_HOST,
  apiCallback: () => console.log(`Running Lobby API on ${LOBBY_HOST}:${API_PORT}...`),
};

server.run({ port: PORT, lobbyConfig }, () => {
  console.log(`Game Server running on port ${PORT}`);
});