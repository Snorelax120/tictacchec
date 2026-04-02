import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createInitialGameState } from './gameLogic.js';
import { isValidMove, checkWinner } from './gameUtils.js';

const app = express();
const httpServer = createServer(app);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST']
  }
});

const games = new Map();

app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ['GET', 'POST'],
}));
app.use(express.json());

const GAME_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinGame', (gameId) => {
    if (typeof gameId !== 'string' || !GAME_ID_PATTERN.test(gameId)) {
      socket.emit('error', { message: 'Invalid game id.' });
      return;
    }

    socket.join(gameId);
    
    if (!games.has(gameId)) {
      games.set(gameId, {
        state: createInitialGameState(),
        players: { white: null, black: null }
      });
    }

    const game = games.get(gameId);
    let role = null;

    if (!game.players.white) {
      game.players.white = socket.id;
      role = 'white';
    } else if (!game.players.black) {
      game.players.black = socket.id;
      role = 'black';
    } else {
      role = 'spectator';
    }

    socket.emit('init', { state: game.state, role });
    io.to(gameId).emit('playerJoined', { role, count: Object.values(game.players).filter(Boolean).length });
  });

  socket.on('makeMove', ({ gameId, move }) => {
    const game = games.get(gameId);
    if (!game) return;

    const { player, type, from, to } = move;
    const authorizedPlayer = game.players.white === socket.id
      ? 'white'
      : game.players.black === socket.id
        ? 'black'
        : null;

    if (!authorizedPlayer || player !== authorizedPlayer) {
      socket.emit('error', { message: 'You are not authorized to move for that side.' });
      return;
    }
    
    // Validate the move using gameUtils.js
    const piece = from !== null ? game.state.board[from] : { type, player };
    const isValid = from === null 
      ? (to >= 0 && to < 16 && game.state.board[to] === null && game.state.hands[player].includes(type))
      : isValidMove(piece, from, to, game.state.board);

    if (isValid && game.state.turn === player) {
      // Apply move
      if (from === null) {
        // Remove from hand
        const handIndex = game.state.hands[player].indexOf(type);
        game.state.hands[player].splice(handIndex, 1);
      } else {
        // Remove from current board position
        game.state.board[from] = null;
      }

      // Handle capture - return piece to opponent's hand
      const targetPiece = game.state.board[to];
      if (targetPiece) {
        game.state.hands[targetPiece.player].push(targetPiece.type);
      }

      game.state.board[to] = { type, player };
      game.state.turn = player === 'white' ? 'black' : 'white';
      game.state.winner = checkWinner(game.state.board);

      io.to(gameId).emit('gameStateUpdate', game.state);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Cleanup games if necessary
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
