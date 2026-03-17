import * as path from 'path';
import UnstableUnicorns from './game/game';
const serve = require('koa-static');
const { Server } = require('boardgame.io/server');

// 1. Strict CORS - Only allow your specific frontend
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://uu.clicque.de';

const server = Server({
  games: [UnstableUnicorns],
  origins: [CORS_ORIGIN, 'http://localhost:3000', 'http://localhost:8000'],
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;
const API_PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 8082;

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
  apiCallback: () => console.log(`Running Lobby API on port ${API_PORT}...`),
};

server.run({ port: PORT, lobbyConfig }, () => {
  console.log(`Game Server running on port ${PORT}`);
});