// src/server.js
import * as path from 'path';
import UnstableUnicorns from './game/game';
const serve = require('koa-static');
const { Server } = require('boardgame.io/server');


const server = Server({
  games: [UnstableUnicorns],
  origins: ['http://localhost:3000', 'http://localhost:8000'],
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

const lobbyConfig = {
  apiPort: 8080,
  apiCallback: () => console.log('Running Lobby API on port 8080...'),
};

server.run({port: PORT, lobbyConfig}, () => {
  console.log(`Server running on port ${PORT}`);
});