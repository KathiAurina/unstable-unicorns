"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.draw = draw;
exports.canDraw = canDraw;
const underscore_1 = __importDefault(require("underscore"));
function draw(G, ctx, param) {
    const toDraw = underscore_1.default.first(G.drawPile, param.count);
    G.drawPile = underscore_1.default.rest(G.drawPile, param.count);
    G.hand[param.protagonist] = [...G.hand[param.protagonist], ...toDraw];
}
function canDraw(G, ctx, param) {
    return G.drawPile.length >= param.count;
}
