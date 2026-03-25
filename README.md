# Unstable Unicorns Online

An online multiplayer implementation of the Unstable Unicorns card game, playable in any browser. Host it yourself and play with friends over the internet or on a local network.

![Screenshot of Unstable Unicorns](https://i.imgur.com/jfeCMAw.png)

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- Git

---

## Setup

```bash
git clone https://github.com/KathiAurina/unstable-unicorns.git
cd unstable-unicorns
npm install
```

---

## Running Locally

You need two terminal windows running simultaneously:

**Terminal 1 — Game server** (port 8000)
```bash
npm run build:server
npm run serve
```

**Terminal 2 — Frontend** (port 3000, with hot-reload)
```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

> The frontend dev server automatically proxies all game API requests to the backend on port 8000 — no extra configuration needed.

---

## Playing a Game

1. Open the **Lobby** at [http://localhost:3000](http://localhost:3000).
2. Enter a name and the number of players, then click **Create Game**.
3. The game appears in the list below — click **Join** to enter.
4. Share the lobby URL with your friends so they can join the same game.
5. Once everyone has joined, each player picks a baby unicorn and the game starts.
6. On your turn: draw a card, then optionally play one from your hand.
7. First player to collect 7 unicorns in their stable wins.

> **Playing over the internet?** Your friends need to be able to reach your machine. The easiest options are running on a VPS, using a tunneling tool like [ngrok](https://ngrok.com/), or making sure your router forwards port 8000 to your machine.

---

## Production Build

If you want a single optimized server (no hot-reload):

```bash
npm run build         # builds the frontend
npm run build:server  # builds the backend
npm run serve         # serves everything on port 8000
```

Open [http://localhost:8000](http://localhost:8000).

---

## Tests

```bash
npm test
npm test -- --testPathPattern=<filename>   # run a single test file
```

---

## Known Limitations

- **~90% of cards implemented.** A handful of edge-case card interactions are still missing.
- **Emergency escape hatches:** If the game gets stuck (e.g. a player must discard but has no cards in hand), there are invisible buttons in the top-left and top-right corners of the board. Clicking the top-right button force-ends the current turn; the top-left button skips the current action.

---

## Technical Overview

Built with **React**, **TypeScript**, and **[boardgame.io](https://boardgame.io)**. The backend is a Node.js/Koa server that runs the game logic and syncs state to all clients in real-time via WebSockets. Game rules and card definitions are shared between client and server.

### Stack

| Layer | Technology |
|---|---|
| Frontend | React 17, React Router 5, styled-components, Framer Motion |
| Game engine | boardgame.io v0.43 |
| Backend | Node.js, Koa, TypeScript |
| Multiplayer sync | SocketIO (via boardgame.io) |

### How it works

All game state lives on the server. When a player takes an action (plays a card, steals a unicorn, etc.), the client sends a **move** to the server. The server validates and applies it, then broadcasts the updated state to every connected client.

Card effects are modelled as a queue of **scenes** (`G.script`). Each scene contains instructions for specific players (e.g. "player 2 must now choose a card to discard"). `BoardStateManager.getBoardState()` reads this queue and translates it into the concrete UI actions shown to each player.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | Server port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
