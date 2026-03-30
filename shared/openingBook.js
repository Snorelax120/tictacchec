import {
  applyMoveToGameState,
  createInitialGameState,
  serializeGameState,
} from './gameRules.js';

function addEntry(entries, gameState, move) {
  entries[serializeGameState(gameState)] = move;
  const result = applyMoveToGameState(gameState, move);

  if (!result.ok) {
    throw new Error(`Invalid opening book move for ${serializeGameState(gameState)}`);
  }

  return result.state;
}

const openingBook = {};

const initialState = createInitialGameState();
const whiteCenterKnight = addEntry(openingBook, initialState, {
  player: 'white',
  type: 'knight',
  from: null,
  to: 5,
});

addEntry(openingBook, whiteCenterKnight, {
  player: 'black',
  type: 'knight',
  from: null,
  to: 10,
});

const whiteCenterBishop = addEntry(openingBook, createInitialGameState(), {
  player: 'white',
  type: 'bishop',
  from: null,
  to: 5,
});

addEntry(openingBook, whiteCenterBishop, {
  player: 'black',
  type: 'bishop',
  from: null,
  to: 10,
});

const blackStarts = addEntry(openingBook, createInitialGameState(), {
  player: 'white',
  type: 'pawn',
  from: null,
  to: 6,
});

addEntry(openingBook, blackStarts, {
  player: 'black',
  type: 'knight',
  from: null,
  to: 9,
});

export default openingBook;
