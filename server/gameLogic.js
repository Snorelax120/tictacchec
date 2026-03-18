
export const INITIAL_PIECES = ['rook', 'knight', 'bishop', 'pawn'];

/**
 * Create the initial game state for a new game
 * @returns {Object} - Initial game state with empty board and full hands
 */
export const createInitialGameState = () => ({
  board: Array(16).fill(null), // 4x4 board = 16 squares
  hands: {
    white: [...INITIAL_PIECES],
    black: [...INITIAL_PIECES],
  },
  turn: 'white',
  winner: null,
  history: [],
});
