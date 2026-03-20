import * as path from 'path';
import UnstableUnicorns from './game/game';
const serve = require('koa-static');
const cors = require('@koa/cors');
const { Server } = require('boardgame.io/server');

// 1. CORS — allow the frontend origin and localhost for development
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://uu.clicque.de';

const server = Server({
  games: [UnstableUnicorns],
  origins: [CORS_ORIGIN, 'http://localhost:3000', 'http://localhost:8000'],
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;

// 2. Attach explicit CORS middleware so /games/* responses always carry the header.
server.app.use(cors({
  origin: (ctx: any) => {
    const requestOrigin = ctx.get('Origin');
    const allowed = [CORS_ORIGIN, 'http://localhost:3000', 'http://localhost:8000'];
    return allowed.includes(requestOrigin) ? requestOrigin : allowed[0];
  },
  credentials: true,
}));

// 3. Serve Frontend Build
const frontEndAppBuildPath = path.resolve(__dirname, '../build');
server.app.use(serve(frontEndAppBuildPath));

// 4. Fallback for React Router (skip boardgame.io lobby API routes)
server.app.use(async (ctx: any, next: any) => {
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