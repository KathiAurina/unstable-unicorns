# Welcome to Unstable Unicorns

This is an online game variant of Unstable Unicorns. All you need is a browser and some friends to play with you.

**Demo:** [unstable-unicorns-online.herokuapp.com/:matchID/:numOfPlayers/:playerID](https://unstable-unicorns-online.herokuapp.com/hello-world/6/0)

![Screenshot of Unstable Unicorns](https://i.imgur.com/jfeCMAw.png)

To create a game type the following url into your browser

 `unstable-unicorns-online.herokuapp.com/hello-world/6/0`

This will create a game with match id `hello-world` for `6` players. You will enter the game as a player with id `0`.

To play with your friends, share the link
 `unstable-unicorns-online.herokuapp.com/hello-world/6/PLAYER_ID`
 with your friends where you replace `PLAYER_ID` with a number from 0 to 5. Each of your friends including you should receive a unique player id. 

## Game Rules

[Unstable Unicorns Game Rules (PDF File)](https://12ax7web.s3.amazonaws.com/accounts/2/homepage/UU_New-Rules_v1.pdf)

## Current State

It is *playable*! However, sometimes you can get stuck in the game, e.g. when a player needs to discard a card but that player has no cards on their hand. For that, there are invisible buttons in the left top corner and right top corner. Clicking the invisible button in the right top corner will end the turn of the current player; the other button in the left top corner will end the current action scene of the player. The section *Implementation Details* will contain more information what an action scene is but for now it is incomplete. I will update it later if I have time.

*Some special features*

 - hover effects
 - sound effects

## Implementation Details

This game was developed using [boardgame.io](boardgame.io), React and Typescript.

*To-Do: describe architecture, etc...*

## Getting Started

To run this project locally on your machine, follow these steps:

### Prerequisites

- [Node.js](https://nodejs.org/) installed on your machine.
- Git to clone the repository.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/unstable-unicorns.git
    cd unstable-unicorns
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running in Development Mode

For the best development experience (with hot-reloading), you need two terminal windows.

**Terminal 1: The Game Server (Backend)**

This runs the game logic and API.

1.  Build the server code:
    ```bash
    npm run build:server
    ```
2.  Start the server:
    ```bash
    npm run serve
    ```
    You should see output indicating the API is running on port 8080 and the App on port 8000.

**Terminal 2: The Client (Frontend)**

This runs the React frontend.

1.  Start the development server:
    ```bash
    npm start
    ```
2.  This will automatically open your browser at [http://localhost:3000](http://localhost:3000). You should see the Lobby.

### How to Play

1.  Go to the **Lobby** running at `http://localhost:3000`.
2.  Under **Create New Game**, verify the number of players (default is 2) and optionally give your game a name.
3.  Click **Create Game**.
4.  The game will appear in the **Existing Games** list below.
5.  Click **Join as Player 0** to join the game. This will open the game board in a new tab.
6.  To play with yourself for testing (or friends locally), open another tab/window for `http://localhost:3000` and join the same game as **Player 1**.

### Building for Production

If you want to run the optimized production build locally:

1.  Build the frontend: `npm run build`
2.  Build the backend: `npm run build:server`
3.  Start the server: `npm run serve`
4.  Access the game at [http://localhost:8000](http://localhost:8000).

## Implementation Details

This game was developed using [boardgame.io](boardgame.io), React and Typescript.

## To-Do

 - not all cards have been implemented yet (~90% finished) 
 - drag and drop 
 - make the game more interactive
 - UI...
 - etc...

