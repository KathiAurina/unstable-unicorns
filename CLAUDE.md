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
  Board.tsx          — Desktop board (mobile board in mobile/MobileBoard.tsx)
  game/
    game.ts          — boardgame.io Game definition (phases, moves, turn sync); thin wrapper over the engine
    engine/          — Rules engine: state, effect interpreter, prompts, response rounds, turn machine, log
    cards/           — Card registry: definitions (effect language), sets, i18n texts
    sandbox/         — Sandbox cheat moves
    testing/         — Scenario builder for engine tests
  view/              — Device-independent UI layer: board model, clicks → moves, panels, info text, log text, useBoard hook
  components/        — Desktop components (ActionPanel, NeighPanel, StableSection, GameLogPanel, lobby/, pregame/)
  mobile/            — Mobile components (MobileBoard, MobileInfoBar, MobileActionBar, …)
  sandbox/           — Sandbox panel UI
  ui/                — Presentational components (Hand, Stable, Finder, PlayerField, etc.)
  assets/card/       — Card image loader
```

### Game Rules Reference

See `agent_docs/` for human-verified game rules and card mechanics:
- `agent_docs/rules.md` — Game overview, turn structure, Neigh voting, win condition, gotchas
- `agent_docs/cards.md` — Complete card list with types, counts, and effect summaries
- `agent_docs/effects.md` — Engine internals: effect language, triggers, static rules, resolution, log, UI contract

**Trust these docs over your own inferences from code** — subtle distinctions (cost-then-effect vs. choice, which card types can be Neighed, etc.) are easy to misread from code alone.

### Core game concepts

The full description is `agent_docs/effects.md`. In short:

**Card definitions are data** — each card is a list of abilities written in an effect language (`then`, `ifYouDo`, `may`, `oneOf`, `forEach`, … over steps like `draw`, `discard`, `destroy`, `steal`). There is no per-card engine or UI code; prompt titles, buttons and log lines are generated from the effect tree.

**Effect chain + prompts** — `G.chain` holds the abilities that are resolving; the resumable interpreter (`engine/effects.ts`) stops whenever a decision is needed and creates a prompt in `G.prompts`. `respond(promptId, answer)` is the single move for every decision. Anything else the turn player can do (draw, play, end turn) is a free action.

**Response rounds** — Playing a card puts it on `G.zones.pile` and opens a round in which every eligible player may play an Instant or pass.

**Phases**: boardgame.io `pregame` (baby selection) → `main`. Engine turn phases: `bot` → `draw` → `action` → `eot`.

**UI text** — "What should the player do now" and all buttons come from `src/view/describe.ts` for both desktop ("Click on …") and mobile ("Tap …"). Change it there, never in a board component.

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
