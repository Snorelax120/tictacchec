import {
  WINNING_LINES,
  applyMoveToGameState,
  generateLegalMoves,
  getOpponentColor,
  serializeGameState,
} from './gameRules.js';

export const BOT_DIFFICULTIES = ['easy', 'medium', 'hard'];

const WIN_SCORE = 1_000_000;
const SEARCH_TIMEOUT = Symbol('search-timeout');
const LINE_WEIGHTS = [0, 6, 32, 180, 12_000];
const PIECE_VALUES = {
  pawn: 16,
  knight: 26,
  bishop: 24,
  rook: 28,
};

const DIFFICULTY_CONFIG = {
  easy: {
    minDepth: 1,
    maxDepth: 2,
    timeLimitMs: 18,
    tieTolerance: 110,
    randomPoolSize: 6,
    allowBlunderChance: 0.3,
  },
  medium: {
    minDepth: 2,
    maxDepth: 5,
    timeLimitMs: 80,
    tieTolerance: 18,
    randomPoolSize: 3,
    allowBlunderChance: 0,
  },
  hard: {
    minDepth: 3,
    maxDepth: 8,
    timeLimitMs: 260,
    tieTolerance: 0,
    randomPoolSize: 1,
    allowBlunderChance: 0,
  },
};

const SQUARE_WEIGHTS = Array.from({ length: 16 }, (_, index) => {
  let count = 0;

  for (const line of WINNING_LINES) {
    if (line.includes(index)) {
      count += 1;
    }
  }

  return count;
});

function scoreHand(hand) {
  return hand.reduce((total, pieceType) => total + (PIECE_VALUES[pieceType] || 0), 0);
}

function countLinePieces(board, line, player) {
  let playerCount = 0;
  let opponentCount = 0;
  let emptyCount = 0;

  for (const index of line) {
    const piece = board[index];

    if (!piece) {
      emptyCount += 1;
      continue;
    }

    if (piece.player === player) {
      playerCount += 1;
    } else {
      opponentCount += 1;
    }
  }

  return { playerCount, opponentCount, emptyCount };
}

function getStateForPlayerTurn(gameState, player) {
  return gameState.turn === player
    ? gameState
    : {
      ...gameState,
      turn: player,
    };
}

function getImmediateWinningMoves(gameState, player) {
  const legalMoves = generateLegalMoves(gameState, player);

  return legalMoves.filter((move) => {
    const result = applyMoveToGameState(getStateForPlayerTurn(gameState, player), move);
    return result.ok && result.state.winner === player;
  });
}

function buildMoveAnalysis(gameState, move, player) {
  const currentBoard = gameState.board;
  const captureTarget = move.from !== null ? currentBoard[move.to] : null;
  const result = applyMoveToGameState(gameState, move);

  if (!result.ok) {
    return null;
  }

  const nextState = result.state;
  const opponent = getOpponentColor(player);
  const opponentWinningMoves = getImmediateWinningMoves(nextState, opponent);
  let lineDelta = 0;

  for (const line of WINNING_LINES) {
    if (!line.includes(move.to)) {
      continue;
    }

    const before = countLinePieces(currentBoard, line, player);
    const after = countLinePieces(nextState.board, line, player);
    lineDelta += (after.playerCount - after.opponentCount) - (before.playerCount - before.opponentCount);
  }

  const priorityScore = (
    (nextState.winner === player ? 100_000 : 0)
    + (opponentWinningMoves.length === 0 ? 4_000 : -opponentWinningMoves.length * 900)
    + (captureTarget ? 500 + (PIECE_VALUES[captureTarget.type] || 0) : 0)
    + (move.from === null ? 60 : 0)
    + (SQUARE_WEIGHTS[move.to] || 0) * 14
    + lineDelta * 80
  );

  return {
    move,
    nextState,
    captureTarget,
    opponentWinningMoves,
    priorityScore,
  };
}

function sortAnalyses(analyses) {
  return analyses.sort((left, right) => right.priorityScore - left.priorityScore);
}

function evaluatePosition(gameState, player) {
  const opponent = getOpponentColor(player);

  if (gameState.winner === player) {
    return WIN_SCORE;
  }

  if (gameState.winner === opponent) {
    return -WIN_SCORE;
  }

  let score = 0;

  for (const line of WINNING_LINES) {
    const { playerCount, opponentCount } = countLinePieces(gameState.board, line, player);

    if (playerCount && opponentCount) {
      score += (playerCount - opponentCount) * 3;
      continue;
    }

    if (playerCount) {
      score += LINE_WEIGHTS[playerCount];
      continue;
    }

    if (opponentCount) {
      score -= LINE_WEIGHTS[opponentCount];
    }
  }

  for (let index = 0; index < gameState.board.length; index += 1) {
    const piece = gameState.board[index];

    if (!piece) {
      continue;
    }

    const directionBonus = piece.type === 'pawn' && piece.direction !== undefined ? 1 : 0;
    const pieceBonus = (PIECE_VALUES[piece.type] || 0) + SQUARE_WEIGHTS[index] * 3 + directionBonus;
    score += piece.player === player ? pieceBonus : -pieceBonus;
  }

  score += scoreHand(gameState.hands[player]) * 2;
  score -= scoreHand(gameState.hands[opponent]) * 2;

  const playerWinsNext = getImmediateWinningMoves(gameState, player).length;
  const opponentWinsNext = getImmediateWinningMoves(gameState, opponent).length;
  score += playerWinsNext * 5_500;
  score -= opponentWinsNext * 6_000;

  const playerMobility = generateLegalMoves(gameState, player).length;
  const opponentMobility = generateLegalMoves(gameState, opponent).length;
  score += (playerMobility - opponentMobility) * 3;

  return score;
}

function negamax({
  gameState,
  depth,
  alpha,
  beta,
  rootPlayer,
  deadline,
  transpositionTable,
  pathKeys,
}) {
  if (Date.now() >= deadline) {
    throw SEARCH_TIMEOUT;
  }

  const positionKey = serializeGameState(gameState);
  if (pathKeys.has(positionKey)) {
    return 0;
  }

  const cachedEntry = transpositionTable.get(`${depth}:${positionKey}`);
  if (cachedEntry !== undefined) {
    return cachedEntry;
  }

  if (depth === 0 || gameState.winner) {
    const terminalScore = gameState.turn === rootPlayer
      ? evaluatePosition(gameState, rootPlayer)
      : -evaluatePosition(gameState, rootPlayer);
    transpositionTable.set(`${depth}:${positionKey}`, terminalScore);
    return terminalScore;
  }

  const analyses = sortAnalyses(
    generateLegalMoves(gameState, gameState.turn)
      .map((move) => buildMoveAnalysis(gameState, move, gameState.turn))
      .filter(Boolean),
  );

  if (!analyses.length) {
    const noMoveScore = gameState.turn === rootPlayer
      ? evaluatePosition(gameState, rootPlayer)
      : -evaluatePosition(gameState, rootPlayer);
    transpositionTable.set(`${depth}:${positionKey}`, noMoveScore);
    return noMoveScore;
  }

  pathKeys.add(positionKey);

  let bestScore = -Infinity;

  for (const analysis of analyses) {
    const score = -negamax({
      gameState: analysis.nextState,
      depth: depth - 1,
      alpha: -beta,
      beta: -alpha,
      rootPlayer,
      deadline,
      transpositionTable,
      pathKeys,
    });

    if (score > bestScore) {
      bestScore = score;
    }

    if (score > alpha) {
      alpha = score;
    }

    if (alpha >= beta) {
      break;
    }
  }

  pathKeys.delete(positionKey);
  transpositionTable.set(`${depth}:${positionKey}`, bestScore);
  return bestScore;
}

function searchRankedMoves(gameState, player, config) {
  const transpositionTable = new Map();
  const deadline = Date.now() + config.timeLimitMs;
  let analyses = sortAnalyses(
    generateLegalMoves(gameState, player)
      .map((move) => buildMoveAnalysis(gameState, move, player))
      .filter(Boolean),
  );
  let bestCompletedAnalyses = analyses.map((analysis) => ({
    ...analysis,
    score: analysis.priorityScore,
  }));

  for (let depth = config.minDepth; depth <= config.maxDepth; depth += 1) {
    try {
      const scoredAnalyses = analyses.map((analysis) => ({
        ...analysis,
        score: -negamax({
          gameState: analysis.nextState,
          depth: depth - 1,
          alpha: -Infinity,
          beta: Infinity,
          rootPlayer: player,
          deadline,
          transpositionTable,
          pathKeys: new Set([serializeGameState(gameState)]),
        }),
      }));

      analyses = scoredAnalyses.sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return right.priorityScore - left.priorityScore;
      });
      bestCompletedAnalyses = analyses;
    } catch (error) {
      if (error !== SEARCH_TIMEOUT) {
        throw error;
      }

      break;
    }
  }

  return bestCompletedAnalyses;
}

function chooseFromRankedMoves(analyses, config, rng) {
  if (!analyses.length) {
    return null;
  }

  const bestScore = analyses[0].score;
  const closeMoves = analyses.filter((analysis) => bestScore - analysis.score <= config.tieTolerance);
  const poolSize = Math.max(1, Math.min(config.randomPoolSize, closeMoves.length));
  let pool = closeMoves.slice(0, poolSize);

  if (config.allowBlunderChance > 0 && closeMoves.length > poolSize && rng() < config.allowBlunderChance) {
    pool = closeMoves.slice(0, Math.min(closeMoves.length, poolSize + 2));
  }

  return pool[Math.floor(rng() * pool.length)]?.move || analyses[0].move;
}

function chooseForcedMove(gameState, player, legalMoves, rng) {
  const winningAnalyses = legalMoves
    .map((move) => buildMoveAnalysis(gameState, move, player))
    .filter((analysis) => analysis?.nextState.winner === player);

  if (winningAnalyses.length) {
    return winningAnalyses[Math.floor(rng() * winningAnalyses.length)].move;
  }

  const opponent = getOpponentColor(player);
  const opponentWinningMoves = getImmediateWinningMoves(gameState, opponent);

  if (!opponentWinningMoves.length) {
    return null;
  }

  const blockingAnalyses = legalMoves
    .map((move) => buildMoveAnalysis(gameState, move, player))
    .filter(Boolean)
    .filter((analysis) => analysis.opponentWinningMoves.length === 0);

  if (!blockingAnalyses.length) {
    return null;
  }

  blockingAnalyses.sort((left, right) => right.priorityScore - left.priorityScore);
  return blockingAnalyses[Math.floor(rng() * Math.min(2, blockingAnalyses.length))].move;
}

function getOpeningBookMove(gameState, player, openingBook) {
  if (!openingBook) {
    return null;
  }

  const move = openingBook[serializeGameState(gameState)];

  if (!move || move.player !== player) {
    return null;
  }

  const result = applyMoveToGameState(gameState, move);
  return result.ok ? move : null;
}

export function chooseBotMove({
  gameState,
  player = gameState?.turn,
  difficulty = 'medium',
  openingBook = null,
  rng = Math.random,
}) {
  if (!gameState || !player) {
    return null;
  }

  if (!BOT_DIFFICULTIES.includes(difficulty)) {
    throw new Error(`Unsupported bot difficulty: ${difficulty}`);
  }

  const legalMoves = generateLegalMoves(gameState, player);

  if (!legalMoves.length) {
    return null;
  }

  if (difficulty === 'hard') {
    const openingMove = getOpeningBookMove(gameState, player, openingBook);

    if (openingMove) {
      return openingMove;
    }
  }

  const forcedMove = chooseForcedMove(gameState, player, legalMoves, rng);
  if (forcedMove) {
    return forcedMove;
  }

  const config = DIFFICULTY_CONFIG[difficulty];
  const rankedMoves = searchRankedMoves(gameState, player, config);

  if (difficulty === 'hard') {
    return rankedMoves[0]?.move || legalMoves[0];
  }

  return chooseFromRankedMoves(rankedMoves, config, rng) || legalMoves[0];
}
