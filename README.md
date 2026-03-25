# Tic Tac Chec

Tic Tac Chec is a React app with:
- local over-the-board play
- online code-based lobbies
- a Cloudflare Workers backend with Durable Objects for live multiplayer

## Project Structure

```text
tictacchec/
├── client/          # Vite React frontend
├── shared/          # Shared game rules used by local + online play
├── worker/          # Cloudflare Worker + Durable Object backend
└── server/          # Legacy Node/Socket.io prototype backend
```

## Local Development

Install dependencies:

```bash
cd /Users/ritwik/Projects/tictacchec
npm install
cd client
npm install
```

Run the frontend:

```bash
cd /Users/ritwik/Projects/tictacchec/client
npm run dev
```

Run the Worker locally:

```bash
cd /Users/ritwik/Projects/tictacchec
npx wrangler dev
```

The frontend uses the Vite proxy to talk to the local Worker during development.

## Build

Build the frontend assets:

```bash
cd /Users/ritwik/Projects/tictacchec
npm run build
```

## Deploy To Cloudflare

This project is deployed with Wrangler, not with a connected Git repo in the Cloudflare dashboard.

Login once:

```bash
cd /Users/ritwik/Projects/tictacchec
npx wrangler login
```

Deploy the app:

```bash
cd /Users/ritwik/Projects/tictacchec
npx wrangler deploy
```

The live Worker URL is:

```text
https://tictacchec.roy-ritwik12.workers.dev
```

## Everyday Update Workflow

When you change the app:

1. Edit your code.
2. Build it locally:

```bash
cd /Users/ritwik/Projects/tictacchec
npm run build
```

3. Deploy the live app:

```bash
npx wrangler deploy
```

4. Commit and push your code:

```bash
git add .
git commit -m "Describe your change"
git push origin main
```

Important:
- `npx wrangler deploy` updates the live Cloudflare app.
- `git push origin main` updates GitHub only.
- Pushing to GitHub does not deploy this app by itself.

## Secrets And Environment Safety

Current status:
- no Cloudflare Worker secrets are configured
- no `.env` values are tracked in git
- `.env`, `.env.local`, `.dev.vars`, and similar local secret files are ignored

Useful commands:

List Cloudflare Worker secrets:

```bash
cd /Users/ritwik/Projects/tictacchec
npx wrangler secret list
```

Add a Cloudflare Worker secret:

```bash
cd /Users/ritwik/Projects/tictacchec
npx wrangler secret put SECRET_NAME
```

Check whether secret files are staged:

```bash
git status
```

## Notes

- The online mode stores a reconnect session token in browser `localStorage` so players can rejoin the same lobby after a refresh or short disconnect.
- The `server/` folder is still in the repo as an older backend approach, but the current hosted app uses the Cloudflare Worker in `worker/`.
