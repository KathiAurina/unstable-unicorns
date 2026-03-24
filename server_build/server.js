"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const game_1 = __importDefault(require("./game/game"));
const serve = require('koa-static');
const cors = require('@koa/cors');
const { Server } = require('boardgame.io/server');
// 1. CORS — allow the frontend origin and localhost for development
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://uu.clicque.de';
const server = Server({
    games: [game_1.default],
    origins: [CORS_ORIGIN, 'http://localhost:3000', 'http://localhost:8000'],
});
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;
// 2. Attach explicit CORS middleware so /games/* responses always carry the header.
server.app.use(cors({
    origin: (ctx) => {
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
server.app.use(async (ctx, next) => {
    if (ctx.path.startsWith('/games/')) {
        return await next();
    }
    return await serve(frontEndAppBuildPath)(Object.assign(ctx, { path: 'index.html' }), next);
});
// 5. Start Server — lobby API is mounted on the same port as the game server
server.run({ port: PORT }, () => {
    console.log(`Game Server running on port ${PORT}`);
});
