import assert from 'node:assert/strict';
import test from 'node:test';

import { chooseBotMove } from './botEngine.js';
import openingBook from './openingBook.js';
import {
  applyMoveToGameState,
  createInitialGameState,
  generateLegalMoves,
  serializeGameState,
} from './gameRules.js';

function createEmptyState(turn = 'white') {
  return {
    board: Array(16).fill(null),
    hands: {
      white: [],
      black: [],
    },
    turn,
    winner: null,
    history: [],
  };
}

function countImmediateWins(gameState, player) {
  return generateLegalMoves(gameState, player).filter((move) => {
    const result = applyMoveToGameState(
      gameState.turn === player
        ? gameState
        : {
          ...gameState,
          turn: player,
        },
      move,
    );

    return result.ok && result.state.winner === player;
  }).length;
}

test('generateLegalMoves only returns moves accepted by applyMoveToGameState', () => {
  const gameState = createInitialGameState();
  const legalMoves = generateLegalMoves(gameState);

  assert.ok(legalMoves.length > 0);

  for (const move of legalMoves) {
    const result = applyMoveToGameState(gameState, move);
    assert.equal(result.ok, true, JSON.stringify(move));
  }
});

test('all bot difficulties produce a legal move from the initial position', () => {
  const gameState = createInitialGameState();

  for (const difficulty of ['easy', 'medium', 'hard']) {
    const move = chooseBotMove({
      gameState,
      player: 'white',
      difficulty,
      openingBook,
      rng: () => 0,
    });

    assert.ok(move, difficulty);
    assert.equal(applyMoveToGameState(gameState, move).ok, true, difficulty);
  }
});

test('all bot difficulties take an immediate winning move', () => {
  const gameState = createEmptyState('white');
  gameState.board[0] = { type: 'rook', player: 'white' };
  gameState.board[1] = { type: 'knight', player: 'white' };
  gameState.board[2] = { type: 'bishop', player: 'white' };
  gameState.hands.white = ['pawn'];

  for (const difficulty of ['easy', 'medium', 'hard']) {
    const move = chooseBotMove({
      gameState,
      player: 'white',
      difficulty,
      openingBook,
      rng: () => 0,
    });

    assert.deepEqual(move, {
      player: 'white',
      type: 'pawn',
      from: null,
      to: 3,
    });
  }
});

test('all bot difficulties block an opponent win-in-1', () => {
  const gameState = createEmptyState('white');
  gameState.board[0] = { type: 'rook', player: 'black' };
  gameState.board[1] = { type: 'knight', player: 'black' };
  gameState.board[2] = { type: 'bishop', player: 'black' };
  gameState.hands.black = ['pawn'];
  gameState.hands.white = ['pawn'];

  for (const difficulty of ['easy', 'medium', 'hard']) {
    const move = chooseBotMove({
      gameState,
      player: 'white',
      difficulty,
      openingBook,
      rng: () => 0,
    });

    assert.equal(move.to, 3, difficulty);
    assert.equal(applyMoveToGameState(gameState, move).ok, true, difficulty);
  }
});

test('medium bot prefers a move that creates immediate tactical pressure in a representative midgame', () => {
  const gameState = createEmptyState('white');
  gameState.board[0] = { type: 'bishop', player: 'white' };
  gameState.board[10] = { type: 'knight', player: 'white' };
  gameState.board[15] = { type: 'rook', player: 'white' };
  gameState.board[5] = { type: 'rook', player: 'black' };
  gameState.hands.white = ['pawn'];
  gameState.hands.black = ['knight'];

  const move = chooseBotMove({
    gameState,
    player: 'white',
    difficulty: 'medium',
    rng: () => 0,
  });

  const result = applyMoveToGameState(gameState, move);
  assert.equal(result.ok, true);
  assert.ok(countImmediateWins(result.state, 'white') > 0, JSON.stringify(move));
});

test('hard bot uses the opening book when the position is covered', () => {
  const gameState = createInitialGameState();
  const expectedMove = openingBook[serializeGameState(gameState)];

  const move = chooseBotMove({
    gameState,
    player: 'white',
    difficulty: 'hard',
    openingBook,
    rng: () => 0,
  });

  assert.deepEqual(move, expectedMove);
});

test('hard bot falls back to search when the position is not in the opening book', () => {
  const openingMove = {
    player: 'white',
    type: 'rook',
    from: null,
    to: 0,
  };
  const openingResult = applyMoveToGameState(createInitialGameState(), openingMove);
  assert.equal(openingResult.ok, true);

  const move = chooseBotMove({
    gameState: openingResult.state,
    player: 'black',
    difficulty: 'hard',
    openingBook,
    rng: () => 0,
  });

  assert.ok(move);
  assert.equal(applyMoveToGameState(openingResult.state, move).ok, true);
});
