# Tic Tac Chec Project

A full-stack application with Vite React frontend and Node.js Express backend with Socket.io for real-time communication.

## Project Structure

```
tictacchec/
├── client/          # Vite React application with Tailwind CSS
│   ├── src/
│   ├── public/
│   └── package.json
└── server/          # Node.js Express server with Socket.io
    ├── index.js
    └── package.json
```

## Client (Frontend)

**Technologies:**
- Vite
- React
- Tailwind CSS
- Socket.io-client
- Lucide React (icons)

**Getting Started:**
```bash
cd client
npm install
npm run dev
```

The client will run on `http://localhost:5173`

## Server (Backend)

**Technologies:**
- Node.js
- Express
- Socket.io
- CORS

**Getting Started:**
```bash
cd server
npm install
npm start
```

The server will run on `http://localhost:3000`

## Development

1. Start the server:
   ```bash
   cd server
   npm run dev
   ```

2. In a new terminal, start the client:
   ```bash
   cd client
   npm run dev
   ```

## Socket.io Connection

The client and server are configured to communicate via Socket.io:
- Server listens on port 3000
- Client connects to `http://localhost:3000`
- CORS is configured to allow connections from `http://localhost:5173`

## Notes

- Make sure both server and client are running for full functionality
- The Tailwind directives are configured in `client/src/index.css`
- Socket.io events can be added in `server/index.js` and handled in your React components
