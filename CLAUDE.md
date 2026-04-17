# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent model overrides

Always pass `model: "haiku"` when spawning Explore subagents (subagent_type: "Explore"). This prevents expensive model inheritance when the parent is Opus.

## Commands

```bash
# Install dependencies
npm install

# Frontend (React dev server, hot-reloading on :3000)
npm start

# Backend (must build first, then serve on :8000)
npm run build:server
npm run serve

# Production build (frontend → build/, then serve via backend)
npm run build
npm run build:server
npm run serve

# Tests
npm test
npm test -- --testPathPattern=<filename>   # run a single test file
```

> In development, run both `npm start` (frontend) and `npm run serve` (backend) simultaneously. The React dev server proxies game/lobby API requests to `:8000`.

> **Never edit files in `server_build/` directly.** They are compiled artifacts — any changes will be overwritten the next time `npm run build:server` runs. Always edit the source `.ts` files in `src/game/` (or `src/server.ts`), then run `npm run build:server` to regenerate them.

## Architecture

This is a multiplayer online board game built with **boardgame.io**, **React**, and **TypeScript**.

### Split: Client vs Server

`tsconfig.server.json` compiles only `src/server.ts` + `src/game/` into `server_build/`. Everything in `src/` that is not `server.ts` or `game/` is frontend-only. The server serves the React production build as static files (no SSR).

```
src/
  server.ts          — Koa + boardgame.io Server; CORS, static file serving, lobby API
  App.tsx            — React Router: / → /lobby, /:matchID/:numPlayers/:playerID → game
  Client.tsx         — boardgame.io React Client; wires game logic to Board via SocketIO
  Lobby.tsx          — Lobby UI (create/join games)
  Board.tsx          — Main game board component
  BoardStateManager.tsx — Derives what actions a player can take from raw G+ctx state
  BoardUtil.tsx      — Board-level helpers
  game/
    game.ts          — boardgame.io Game definition (phases, turns, moves, endIf)
    card.ts          — Card type definitions and deck initialization
    do.ts            — `Do` type + execution logic for card instructions (enter, executeDo, target finders)
    effect.ts        — Persistent effects that modify game rules (e.g. "double_dutch", "pandamonium")
    neigh.ts         — Neigh/counter-neigh voting types
    player.ts        — Player type
    constants.ts     — Shared constants (stableSeats, hand size, etc.)
  ui/                — Presentational components (Hand, Stable, DrawPile, DiscardPile, etc.)
  assets/card/       — Card image loader
```

### Game Rules Reference

See `agent_docs/` for human-verified game rules and card mechanics:
- `agent_docs/rules.md` — Game overview, turn structure, Neigh voting, win condition, gotchas
- `agent_docs/cards.md` — Complete card list with types, counts, and effect summaries
- `agent_docs/effects.md` — Persistent effects, Do operations, triggers, Script/Scene model

**Trust these docs over your own inferences from code** — subtle distinctions (cost-then-effect vs. choice, which card types can be Neighed, etc.) are easy to misread from code alone.

### Core game concepts

**Script / Scene / Action / Instruction** — When a card is played or a turn begins, the game builds a `Script` (a queue of `Scene`s). Each `Scene` contains sequential `Action`s, each with one or more `Instruction`s for specific players. `BoardStateManager.getBoardState()` reads this queue to determine what UI/move each player should be offered.

**Do** — A union type in `do.ts` describing an atomic game operation (draw, discard, destroy, steal, sacrifice, etc.). Card definitions embed `Do` objects in their `on` triggers; `executeDo` dispatches them at runtime.

**Effect** — Persistent per-player modifiers (e.g. `count_as_two`, `pandamonium`, `your_cards_cannot_be_neighed`) stored in `G.playerEffects`. Many move functions check these before executing.

**Neigh discussion** — When a card is played, `G.neighDiscussion` is set. All players vote neigh/no-neigh in rounds; odd rounds = card played, even rounds = card neighed. `playSuperNeigh` resolves immediately; `dontPlayNeigh` resolves when all players vote.

**Phases**: `pregame` (baby unicorn selection) → `main` (normal turns).
**Turn stages**: `beginning` (draw phase, begin-of-turn effects) → `action_phase` (play cards, end turn).

**UI info messages** — The "what should the player do now" text lives in **two files that must always be updated together**:
- `src/components/InfoPanel.tsx` (desktop)
- `src/mobile/MobileInfoBar.tsx` (mobile)

When you add or change a `BoardStateKey` or alter a card's resolution flow, update both files. Desktop uses "Click on …" phrasing; mobile uses "Tap …". Mobile currently covers more states than desktop — bring desktop up to parity when you touch the affected key.

### Deployment

The production deployment runs at `uu.clicque.de`. The lobby API is served on the same port as the game server (no separate subdomain). `PORT` defaults to 8000, `CORS_ORIGIN` defaults to `https://uu.clicque.de`.

#### Home Server Deployment (Docker)

The app is deployed on a home server via Docker Compose (`docker-compose.prod.yml`). The setup includes:

**Services:**
- `app` — The main application container running `ghcr.io/kathiaurina/unstable-unicorns:latest`
- `watchtower` — Auto-update service that checks for new images every 5 minutes and automatically pulls/redeploys when available

**Port Mappings:**
- `127.0.0.1:8001:8000` — Frontend + game server + lobby API (proxied through reverse proxy)

**Environment (set in docker-compose.prod.yml):**
- `NODE_ENV=production`
- `PORT=8000`
- `CORS_ORIGIN=https://uu.clicque.de`

**Running on the Server:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

This starts both the app and watchtower services. Watchtower polls the GitHub Container Registry (GHCR) every 5 minutes — when a new image is pushed (via CI/CD on main), it automatically pulls and redeploys the container. Old images are cleaned up after each update. GHCR credentials must be configured in `/root/.docker/config.json` on the server.
