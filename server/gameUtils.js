/**
 * Check if a move is valid for a given piece on a 4x4 board
 * @param {Object} piece - The piece object with { type, player, direction? }
 * @param {number} from - Starting position (0-15)
 * @param {number} to - Target position (0-15)
 * @param {Array} board - The 4x4 board array (16 elements)
 * @returns {boolean} - Whether the move is valid
 */
export const isValidMove = (piece, from, to, board) => {
  // Basic validation
  if (from < 0 || from >= 16 || to < 0 || to >= 16) return false;
  if (from === to) return false;

  const fromRow = Math.floor(from / 4);
  const fromCol = from % 4;
  const toRow = Math.floor(to / 4);
  const toCol = to % 4;

  const targetPiece = board[to];
  
  // Can't capture your own piece
  if (targetPiece && targetPiece.player === piece.player) return false;

  switch (piece.type) {
    case 'rook':
      return isValidRookMove(fromRow, fromCol, toRow, toCol, board);
    case 'bishop':
      return isValidBishopMove(fromRow, fromCol, toRow, toCol, board);
    case 'knight':
      return isValidKnightMove(fromRow, fromCol, toRow, toCol);
    case 'pawn':
      return isValidPawnMove(fromRow, fromCol, toRow, toCol, piece, board);
    case 'king':
      return isValidKingMove(fromRow, fromCol, toRow, toCol);
    default:
      return false;
  }
};

/**
 * Validate Rook movement (horizontal or vertical)
 */
const isValidRookMove = (fromRow, fromCol, toRow, toCol, board) => {
  if (fromRow !== toRow && fromCol !== toCol) return false;
  return isPathClear(fromRow, fromCol, toRow, toCol, board);
};

/**
 * Validate Bishop movement (diagonal only)
 */
const isValidBishopMove = (fromRow, fromCol, toRow, toCol, board) => {
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);
  if (rowDiff !== colDiff) return false;
  
  return isPathClear(fromRow, fromCol, toRow, toCol, board);
};

/**
 * Validate Knight movement (L-shape: 2+1 or 1+2)
 */
const isValidKnightMove = (fromRow, fromCol, toRow, toCol) => {
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);
  return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
};

/**
 * Validate Pawn movement with flip mechanic at edges
 * Pawn moves 1 step forward (row-wise), captures 1 step diagonally forward
 * When it reaches the edge rows (0 or 3), it flips direction
 */
const isValidPawnMove = (fromRow, fromCol, toRow, toCol, piece, board) => {
  let direction = piece.direction;
  if (direction === undefined) {
    // White moves bottom to top (-1 row), Black moves top to bottom (+1 row)
    direction = piece.player === 'white' ? -1 : 1;
  }
  
  // Actually we need to flip BEFORE calculating the move if pawn is stuck at edge
  if ((fromRow === 0 && direction === -1) || (fromRow === 3 && direction === 1)) {
    direction *= -1;
  }
  
  const rowDiff = toRow - fromRow;
  const colDiffAbs = Math.abs(toCol - fromCol);
  
  const targetIndex = toRow * 4 + toCol;
  const targetPiece = board[targetIndex];
  
  // Forward move (1 step in current direction vertically)
  if (rowDiff === direction && colDiffAbs === 0) {
    return !targetPiece; // Must move into empty square
  }
  
  // Diagonal capture (1 step forward vertically, 1 step horizontally)
  if (rowDiff === direction && colDiffAbs === 1) {
    return !!targetPiece; // Must be capturing an enemy piece
  }
  
  return false;
};

/**
 * Validate King movement (1 square in any direction)
 */
const isValidKingMove = (fromRow, fromCol, toRow, toCol) => {
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);
  
  // King moves exactly 1 square in any direction
  return rowDiff <= 1 && colDiff <= 1;
};

/**
 * Check if the path between two positions is clear (no pieces blocking)
 * Works for straight lines (rook) and diagonals (bishop)
 */
const isPathClear = (fromRow, fromCol, toRow, toCol, board) => {
  const MathSign = (n) => (n > 0 ? 1 : n < 0 ? -1 : 0);
  const rowStep = MathSign(toRow - fromRow);
  const colStep = MathSign(toCol - fromCol);
  
  let currentRow = fromRow + rowStep;
  let currentCol = fromCol + colStep;
  
  // Check each square along the path (excluding start and end)
  while (currentRow !== toRow || currentCol !== toCol) {
    const index = currentRow * 4 + currentCol;
    if (board[index]) {
      return false; // Path is blocked
    }
    currentRow += rowStep;
    currentCol += colStep;
  }
  
  return true; // Path is clear
};

/**
 * Helper function to convert position to coordinates
 */
export const positionToCoords = (position) => ({
  row: Math.floor(position / 4),
  col: position % 4
});

/**
 * Helper function to convert coordinates to position
 */
export const coordsToPosition = (row, col) => row * 4 + col;

/**
 * Check for a winner on the 4x4 board
 * Returns 'white', 'black', or null
 * @param {Array} board - The 4x4 board array (16 elements)
 * @returns {string|null} - The winning player ('white' or 'black') or null
 */
export const checkWinner = (board) => {
  // Horizontal lines (4 rows, each with 1 possible 4-in-a-row)
  const horizontalLines = [
    [0, 1, 2, 3],    // Row 0
    [4, 5, 6, 7],    // Row 1
    [8, 9, 10, 11],  // Row 2
    [12, 13, 14, 15] // Row 3
  ];

  // Vertical lines (4 columns, each with 1 possible 4-in-a-row)
  const verticalLines = [
    [0, 4, 8, 12],   // Col 0
    [1, 5, 9, 13],   // Col 1
    [2, 6, 10, 14],  // Col 2
    [3, 7, 11, 15]   // Col 3
  ];

  // Diagonal lines (2 main diagonals)
  const diagonalLines = [
    [0, 5, 10, 15],  // Top-left to bottom-right
    [3, 6, 9, 12]    // Top-right to bottom-left
  ];

  // Combine all possible winning lines
  const allLines = [...horizontalLines, ...verticalLines, ...diagonalLines];

  // Check each line for a winner
  for (const line of allLines) {
    const [a, b, c, d] = line;
    
    // Check if all four positions have pieces
    if (board[a] && board[b] && board[c] && board[d]) {
      // Check if all four pieces belong to the same player
      if (
        board[a].player === board[b].player &&
        board[a].player === board[c].player &&
        board[a].player === board[d].player
      ) {
        return board[a].player; // Return the winning player
      }
    }
  }

  return null; // No winner found
};
