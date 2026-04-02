# Tic Tac Chec Project Reference

## Overview
Tic Tac Chec is a 4x4 strategy game that combines chess-style movement with a four-in-a-row win condition.

The current production system has three active runtime layers:
- `client/`: React + Vite frontend
- `shared/`: shared game rules and bot logic used by both browser gameplay and backend validation
- `worker/`: Cloudflare Worker + Durable Object backend for online lobbies

The `server/` directory remains in the repo as a legacy Node/Socket.io prototype. It is not part of the current deployed architecture.

## Current Architecture

### Client
The frontend is a single-page React app rendered from `client/src/main.jsx`.

Current client responsibilities:
- menu, rules, local play, bot setup, online flows, and live match screens
- browser-side bot execution through `client/src/botWorker.js`
- reconnect token storage in `localStorage`
- responsive gameplay layouts for compact and short-height screens

Current client structure:
- `client/src/App.jsx`: app shell, top-level screen routing, and controller composition
- `client/src/hooks/useLocalGameController.js`: local gameplay state and move selection
- `client/src/hooks/useBotMatchController.js`: bot setup, worker lifecycle, delayed bot move application
- `client/src/hooks/useOnlineLobbyController.js`: create/join/reconnect websocket lifecycle and online actions
- `client/src/components/screens/`: top-level screens
- `client/src/components/gameplay/`: board, hand, header, and status UI
- `client/src/components/ui/`: reusable buttons, cards, inputs, notices
- `client/src/lib/onlineSession.js`: online API calls and session persistence
- `client/src/lib/appContent.js`: static screen/picker content and defaults
- `client/src/lib/gameUi.js`: UI-facing game/session helper functions

### Shared
Shared code is the single source of truth for game legality and browser bot decisions.

Key modules:
- `shared/gameRules.js`: initial state, move validation, legal move generation, winner detection, state serialization, and move application
- `shared/botEngine.js`: search-based bot engine with difficulty modes
- `shared/openingBook.js`: small lazy-loaded opening book used by hard mode
- `shared/botEngine.test.js`: rule/bot regression tests

### Worker
The Worker is the current online backend and is deployed with Wrangler.

Current worker structure:
- `worker/index.js`: HTTP/websocket entry routing and Durable Object export
- `worker/lobbyRoom.js`: Durable Object coordination layer
- `worker/lib/http.js`: JSON response/request parsing helpers
- `worker/lib/session.js`: lobby code/session token helpers
- `worker/lib/roomState.js`: pure room state creation, snapshots, reconnect, move, and rematch transitions
- `worker/roomState.test.js`: smoke coverage for online room flows

### Legacy Node Backend
`server/` is a legacy prototype and should be treated as historical reference only.

It is not used by:
- `wrangler deploy`
- the current frontend proxy target in production
- the current live site at `tictacchec.roy-ritwik12.workers.dev`

## Runtime Flows

### Local Play
1. `App.jsx` routes to `game-local`.
2. `useLocalGameController` owns local board state and selected piece state.
3. Moves are built with `buildMoveFromSelection(...)`.
4. The shared `applyMoveToGameState(...)` function validates and applies every move.

### Bot Play
1. `BotSetupScreen` collects difficulty and seat.
2. `useBotMatchController` starts a fresh local game and assigns human/bot seats.
3. When it is the bot’s turn, the hook posts the current state to `client/src/botWorker.js`.
4. The worker calls `chooseBotMove(...)` from `shared/botEngine.js`.
5. The chosen move is delayed by 1 second before being applied for more natural pacing.

### Online Create / Join / Resume
1. `useOnlineLobbyController` calls `/api/lobbies` or `/api/lobbies/:code/join`.
2. The Worker creates or joins a Durable Object lobby room.
3. The controller stores the returned session token in `localStorage`.
4. The client opens `/ws/:code?session=...`.
5. The Durable Object returns snapshots and accepts move/rematch messages.
6. On refresh or reconnect, the saved session is used to resume the same lobby.

### Rematch / Disconnect Timeout
- Rematch readiness is stored in room state per color.
- When both players request a rematch, the Durable Object swaps colors and resets the game.
- Disconnects open a 60 second reconnect window.
- If the reconnect window expires with only one player remaining, the room is closed with `disconnect_timeout`.

## State Models

### Game State
Defined in `shared/gameRules.js`.

Main fields:
- `board`: 16-square board array
- `hands.white` / `hands.black`: remaining pieces in hand
- `turn`: active color
- `winner`: winning color or `null`
- `history`: move history

### Bot Match State
Managed in `useBotMatchController`.

Main fields:
- `botForms`: selected difficulty and seat preference
- `botMatch`: resolved human seat, bot seat, difficulty
- `botGame`: current local game state for bot mode
- `selectedBotPiece`, `botFlashMessage`, `isBotThinking`

### Online Session State
Managed in `useOnlineLobbyController`.

Main fields:
- `onlineForms`: create/join form values
- `onlineSession`: `{ code, sessionToken, playerName, wsUrl }`
- `onlineSnapshot`: latest server snapshot
- `socketStatus`, `selectedOnlinePiece`, `onlineFlashMessage`, `copyNotice`

### Lobby Snapshot
Shaped by `buildSnapshot(...)` in `worker/lib/roomState.js`.

Main fields:
- `phase`
- `lobbyCode`
- `yourRole`, `yourSeat`
- `players.host`, `players.guest`, `players.white`, `players.black`
- `game`
- `rematch`
- `reconnect`
- `statusMessage`, `closedReason`

## Directory Map

### Current
- `client/`: current frontend
- `shared/`: current rules/bot logic
- `worker/`: current Cloudflare deployment target
- `README.md`: short project entry document
- `project.md`: primary technical reference

### Legacy / Historical
- `server/`: old Node/Socket.io backend prototype
- `HOW_TO_RUN.md`: legacy note pointing to modern docs
- `GAME_COMPLETE.md`: legacy note from earlier milestone state

## Cleanup Notes
- `client/src/App.css` was a Vite template leftover and is intentionally removed.
- `client/README.md` was the stock Vite template and is intentionally removed.
- `client/src/components/GameBoard.jsx` was no longer used by the current gameplay UI and is intentionally removed.
- The current repo keeps `server/` conservatively for reference, but all current documentation should describe it as legacy.

## Development Workflow

Install dependencies:

```bash
npm install
cd client && npm install
```

Run the frontend:

```bash
npm run dev:client
```

Run the Worker locally:

```bash
npm run dev:worker
```

Run tests:

```bash
npm test
```

Build the app:

```bash
npm run build
```

Deploy to Cloudflare:

```bash
npm run deploy
```

## Maintenance Guidance
- Keep gameplay legality in `shared/` so local, bot, and online play stay consistent.
- Prefer adding new UI under `components/screens`, `components/gameplay`, or `components/ui` instead of growing `App.jsx`.
- Prefer adding new online room behavior as pure helpers in `worker/lib/roomState.js` before wiring it into `LobbyRoom`.
- Keep `README.md` short and user-facing. Put deeper implementation detail in `project.md`.
- If the legacy Node backend is ever removed, update `project.md`, `README.md`, and any local run instructions in the same change.
