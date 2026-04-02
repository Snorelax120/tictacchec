import { useState } from 'react';
import { applyMoveToGameState, createInitialGameState } from '@shared/gameRules.js';
import { buildMoveFromSelection, getLocalPlayerLabel } from '../lib/gameUi.js';

export function useLocalGameController() {
  const [localGame, setLocalGame] = useState(createInitialGameState);
  const [selectedLocalPiece, setSelectedLocalPiece] = useState(null);

  const resetLocalGame = () => {
    setLocalGame(createInitialGameState());
    setSelectedLocalPiece(null);
  };

  const handleLocalSquareClick = (index) => {
    if (localGame.winner) {
      return;
    }

    const board = localGame.board;
    const clickedPiece = board[index];

    if (!selectedLocalPiece) {
      if (clickedPiece && clickedPiece.player === localGame.turn) {
        setSelectedLocalPiece({
          type: clickedPiece.type,
          player: clickedPiece.player,
          from: index,
        });
      }
      return;
    }

    const nextMove = buildMoveFromSelection(board, selectedLocalPiece, index);

    if (nextMove === 'clear') {
      setSelectedLocalPiece(null);
      return;
    }

    if (nextMove?.reselection) {
      setSelectedLocalPiece({
        type: nextMove.type,
        player: nextMove.player,
        from: nextMove.from,
      });
      return;
    }

    if (!nextMove) {
      setSelectedLocalPiece(null);
      return;
    }

    const result = applyMoveToGameState(localGame, nextMove);
    if (!result.ok) {
      setSelectedLocalPiece(null);
      return;
    }

    setLocalGame(result.state);
    setSelectedLocalPiece(null);
  };

  const handleLocalHandPieceClick = (type, player) => {
    if (localGame.winner || player !== localGame.turn) {
      return;
    }

    if (selectedLocalPiece?.type === type && selectedLocalPiece?.player === player && selectedLocalPiece?.from === null) {
      setSelectedLocalPiece(null);
      return;
    }

    setSelectedLocalPiece({ type, player, from: null });
  };

  const localStatusMessage = localGame.winner
    ? `${getLocalPlayerLabel(localGame.winner)} wins the game.`
    : `${getLocalPlayerLabel(localGame.turn)} to move.`;

  return {
    localGame,
    selectedLocalPiece,
    localStatusMessage,
    resetLocalGame,
    handleLocalSquareClick,
    handleLocalHandPieceClick,
  };
}
