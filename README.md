# Tic Tac Chec

Tic Tac Chec is a browser game with:
- local over-the-board play
- play-vs-bot mode that runs entirely in the browser
- online code-based lobbies powered by Cloudflare Workers and Durable Objects

## Current Architecture

```text
tictacchec/
├── client/   # Vite + React frontend
├── shared/   # Shared game rules and bot logic
├── worker/   # Cloudflare Worker + Durable Object backend
└── server/   # Legacy Node/Socket.io prototype (not used by production)
```

`project.md` is the primary technical reference for the repo:

- architecture and runtime flows
- state models
- module ownership
- cleanup notes
- build, test, and deploy workflow

## Development

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

Build:

```bash
npm run build
```

Deploy:

```bash
npm run deploy
```

## Production

Live app:

```text
https://tictacchec.roy-ritwik12.workers.dev
```

## Notes

- The online mode stores a reconnect session token in browser `localStorage`.
- The current deployed app uses the Cloudflare Worker in `worker/`.
- The `server/` folder is retained only as a legacy reference and should not be treated as the active backend.
