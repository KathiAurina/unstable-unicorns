import * as path from 'path';
import UnstableUnicorns from './game/game';
const serve = require('koa-static');
const cors = require('@koa/cors');
const { Server } = require('boardgame.io/server');

// 1. CORS — allow the frontend origin and localhost for development
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://uu.clicque.de';
const LOCAL_ORIGIN = process.env.LOCAL_ORIGIN;

const allowed = [CORS_ORIGIN, 'http://localhost:3000', 'http://localhost:8000'];
if (LOCAL_ORIGIN) allowed.push(LOCAL_ORIGIN);

const server = Server({
  games: [UnstableUnicorns],
  origins: allowed,
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;

// 2. Attach explicit CORS middleware so /games/* responses always carry the header.
server.app.use(cors({
  origin: (ctx: { get: (key: string) => string }) => {
    const requestOrigin = ctx.get('Origin');
    return allowed.includes(requestOrigin) ? requestOrigin : allowed[0];
  },
  credentials: true,
}));

// 3. Serve Frontend Build
const frontEndAppBuildPath = path.resolve(__dirname, '../build');
server.app.use(serve(frontEndAppBuildPath));

// 4. Fallback for React Router (skip boardgame.io lobby API routes)
server.app.use(async (ctx: { path: string }, next: () => Promise<void>) => {
    if (ctx.path.startsWith('/games/')) {
        return await next();
    }
    return await serve(frontEndAppBuildPath)(
        Object.assign(ctx, { path: 'index.html' }),
        next
    );
});

// 5. Start Server — lobby API is mounted on the same port as the game server
server.run({ port: PORT }, () => {
  console.log(`Game Server running on port ${PORT}`);
});