import * as path from 'path';
import UnstableUnicorns from './game/game';
const serve = require('koa-static');
const cors = require('@koa/cors');
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

// 2. Attach explicit CORS middleware so /games/* responses always carry the header,
//    regardless of which origin the request comes from (covers the lobby subdomain).
server.app.use(cors({
  origin: (ctx: any) => {
    const requestOrigin = ctx.get('Origin');
    const allowed = [CORS_ORIGIN, LOBBY_ORIGIN, 'http://localhost:3000', 'http://localhost:8000'];
    return allowed.includes(requestOrigin) ? requestOrigin : allowed[0];
  },
  credentials: true,
}));

// 3. Serve Frontend Build
const frontEndAppBuildPath = path.resolve(__dirname, '../build');
server.app.use(serve(frontEndAppBuildPath));

// 4. Fallback for React Router
server.app.use(
    async (ctx: any, next: any) => await serve(frontEndAppBuildPath)(
        Object.assign(ctx, { path: 'index.html' }),
        next
    )
);

// 5. Start Server — lobby API runs on a separate internal port but is proxied
//    through the main port via Cloudflare tunnel on uu-lobby.clicque.de → localhost:8082
const lobbyConfig = {
  apiPort: API_PORT,
  apiCallback: () => console.log(`Running Lobby API on port ${API_PORT}...`),
};

server.run({ port: PORT, lobbyConfig }, () => {
  console.log(`Game Server running on port ${PORT}`);
});