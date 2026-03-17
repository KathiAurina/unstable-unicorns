// src/server.js
import * as path from 'path';
import UnstableUnicorns from './game/game';
const serve = require('koa-static');
const { Server } = require('boardgame.io/server');


const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'https://uu.clicque.de';
const origins = ['http://localhost:8000', CORS_ORIGIN];

const server = Server({
  games: [UnstableUnicorns],
  origins,
});
const PORT = process.env.PORT == null ? 8000 : parseInt(process.env.PORT);

const frontEndAppBuildPath = path.resolve(__dirname, '../build');
server.app.use(serve(frontEndAppBuildPath));

server.app.use(
  async (ctx: any, next: any) => await serve(frontEndAppBuildPath)(
    Object.assign(ctx, { path: 'index.html' }),
    next
  )
);

const API_PORT = process.env.API_PORT == null ? 8082 : parseInt(process.env.API_PORT);

const lobbyConfig = {
  apiPort: API_PORT,
  apiCallback: () => console.log(`Running Lobby API on port ${API_PORT}...`),
};

server.run({port: PORT, lobbyConfig}, () => {
  console.log(`Server running on port ${PORT}`);
});