export const BOARD_SIZE = 4;
export const BOARD_SQUARES = BOARD_SIZE * BOARD_SIZE;
export const INITIAL_PIECES = ['rook', 'knight', 'bishop', 'pawn'];

export const WINNING_LINES = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10, 11],
  [12, 13, 14, 15],
  [0, 4, 8, 12],
  [1, 5, 9, 13],
  [2, 6, 10, 14],
  [3, 7, 11, 15],
  [0, 5, 10, 15],
  [3, 6, 9, 12],
];

export function createEmptyBoard() {
  return Array(BOARD_SQUARES).fill(null);
}

export function createInitialGameState() {
  return {
    board: createEmptyBoard(),
    hands: {
      white: [...INITIAL_PIECES],
      black: [...INITIAL_PIECES],
    },
    turn: 'white',
    winner: null,
    history: [],
  };
}

export function cloneGameState(gameState) {
  return {
    board: gameState.board.map((piece) => (piece ? { ...piece } : null)),
    hands: {
      white: [...gameState.hands.white],
      black: [...gameState.hands.black],
    },
    turn: gameState.turn,
    winner: gameState.winner,
    history: [...(gameState.history || [])],
  };
}

export function positionToCoords(position) {
  return {
    row: Math.floor(position / BOARD_SIZE),
    col: position % BOARD_SIZE,
  };
}

export function coordsToPosition(row, col) {
  return row * BOARD_SIZE + col;
}

export function getEffectivePawnDirection(piece, from) {
  if (!piece || piece.type !== 'pawn') {
    return undefined;
  }

  const { row } = positionToCoords(from);
  let direction = piece.direction;

  if (direction === undefined) {
    direction = piece.player === 'white' ? -1 : 1;
  }

  if ((row === 0 && direction === -1) || (row === BOARD_SIZE - 1 && direction === 1)) {
    direction *= -1;
  }

  return direction;
}

export function getPawnDisplayDirection(piece, index) {
  return getEffectivePawnDirection(piece, index);
}

export function isValidMove(piece, from, to, board) {
  if (!piece) return false;
  if (from < 0 || from >= BOARD_SQUARES || to < 0 || to >= BOARD_SQUARES) return false;
  if (from === to) return false;

  const { row: fromRow, col: fromCol } = positionToCoords(from);
  const { row: toRow, col: toCol } = positionToCoords(to);
  const targetPiece = board[to];

  if (targetPiece && targetPiece.player === piece.player) {
    return false;
  }

  switch (piece.type) {
    case 'rook':
      return isValidRookMove(fromRow, fromCol, toRow, toCol, board);
    case 'bishop':
      return isValidBishopMove(fromRow, fromCol, toRow, toCol, board);
    case 'knight':
      return isValidKnightMove(fromRow, fromCol, toRow, toCol);
    case 'pawn':
      return isValidPawnMove(fromRow, fromCol, toRow, toCol, piece, board, from);
    default:
      return false;
  }
}

function isValidRookMove(fromRow, fromCol, toRow, toCol, board) {
  if (fromRow !== toRow && fromCol !== toCol) {
    return false;
  }

  return isPathClear(fromRow, fromCol, toRow, toCol, board);
}

function isValidBishopMove(fromRow, fromCol, toRow, toCol, board) {
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  if (rowDiff !== colDiff) {
    return false;
  }

  return isPathClear(fromRow, fromCol, toRow, toCol, board);
}

function isValidKnightMove(fromRow, fromCol, toRow, toCol) {
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}

function isValidPawnMove(fromRow, fromCol, toRow, toCol, piece, board, from) {
  const direction = getEffectivePawnDirection(piece, from);
  const rowDiff = toRow - fromRow;
  const colDiffAbs = Math.abs(toCol - fromCol);
  const targetPiece = board[coordsToPosition(toRow, toCol)];

  if (rowDiff === direction && colDiffAbs === 0) {
    return !targetPiece;
  }

  if (rowDiff === direction && colDiffAbs === 1) {
    return !!targetPiece;
  }

  return false;
}

function isPathClear(fromRow, fromCol, toRow, toCol, board) {
  const rowStep = Math.sign(toRow - fromRow);
  const colStep = Math.sign(toCol - fromCol);

  let currentRow = fromRow + rowStep;
  let currentCol = fromCol + colStep;

  while (currentRow !== toRow || currentCol !== toCol) {
    const index = coordsToPosition(currentRow, currentCol);

    if (board[index]) {
      return false;
    }

    currentRow += rowStep;
    currentCol += colStep;
  }

  return true;
}

export function checkWinner(board) {
  for (const line of WINNING_LINES) {
    const [a, b, c, d] = line;

    if (board[a] && board[b] && board[c] && board[d]) {
      if (
        board[a].player === board[b].player &&
        board[a].player === board[c].player &&
        board[a].player === board[d].player
      ) {
        return board[a].player;
      }
    }
  }

  return null;
}

export function applyMoveToGameState(currentState, move) {
  if (!move || !move.player || move.to === undefined || move.to === null) {
    return { ok: false, error: 'Invalid move payload.' };
  }

  if (currentState.winner) {
    return { ok: false, error: 'This game has already finished.' };
  }

  if (currentState.turn !== move.player) {
    return { ok: false, error: 'It is not your turn.' };
  }

  const nextState = cloneGameState(currentState);
  const { player, type, from, to } = move;

  if (from === null) {
    if (nextState.board[to] !== null) {
      return { ok: false, error: 'That square is already occupied.' };
    }

    const handIndex = nextState.hands[player].indexOf(type);
    if (handIndex === -1) {
      return { ok: false, error: 'That piece is no longer in hand.' };
    }

    nextState.hands[player].splice(handIndex, 1);
    nextState.board[to] = { type, player };
  } else {
    const movingPiece = nextState.board[from];

    if (!movingPiece || movingPiece.player !== player || movingPiece.type !== type) {
      return { ok: false, error: 'That piece cannot move from the selected square.' };
    }

    if (!isValidMove(movingPiece, from, to, nextState.board)) {
      return { ok: false, error: 'That move is not valid.' };
    }

    const targetPiece = nextState.board[to];
    if (targetPiece) {
      nextState.hands[targetPiece.player].push(targetPiece.type);
    }

    const updatedPiece = { ...movingPiece };
    if (movingPiece.type === 'pawn') {
      updatedPiece.direction = getEffectivePawnDirection(movingPiece, from);
    }

    nextState.board[from] = null;
    nextState.board[to] = updatedPiece;
  }

  nextState.turn = player === 'white' ? 'black' : 'white';
  nextState.winner = checkWinner(nextState.board);
  nextState.history.push({
    player,
    type,
    from,
    to,
    createdAt: Date.now(),
  });

  return { ok: true, state: nextState };
}
