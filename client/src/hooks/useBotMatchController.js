import { useEffect, useRef, useState } from 'react';
import { applyMoveToGameState, createInitialGameState } from '@shared/gameRules.js';
import { BOT_DEFAULTS } from '../lib/appContent.js';
import { buildMoveFromSelection, getBotPlayerLabel, getBotStatusMessage, getResolvedBotSeats } from '../lib/gameUi.js';

export function useBotMatchController(activeScreen) {
  const [botForms, setBotForms] = useState(BOT_DEFAULTS);
  const [botGame, setBotGame] = useState(createInitialGameState);
  const [selectedBotPiece, setSelectedBotPiece] = useState(null);
  const [botMatch, setBotMatch] = useState(null);
  const [botFlashMessage, setBotFlashMessage] = useState('');
  const [isBotThinking, setIsBotThinking] = useState(false);

  const botWorkerRef = useRef(null);
  const activeBotRequestIdRef = useRef(0);
  const botRequestSequenceRef = useRef(0);
  const botMoveDelayTimerRef = useRef(null);
  const latestBotGameRef = useRef(botGame);
  const latestBotMatchRef = useRef(botMatch);

  useEffect(() => {
    latestBotGameRef.current = botGame;
  }, [botGame]);

  useEffect(() => {
    latestBotMatchRef.current = botMatch;
  }, [botMatch]);

  useEffect(() => {
    const worker = new Worker(new URL('../botWorker.js', import.meta.url), { type: 'module' });
    botWorkerRef.current = worker;

    const handleMessage = (event) => {
      const { requestId, move, error } = event.data || {};

      if (requestId !== activeBotRequestIdRef.current) {
        return;
      }

      if (error) {
        activeBotRequestIdRef.current = 0;
        setIsBotThinking(false);
        setBotFlashMessage(error);
        return;
      }

      if (botMoveDelayTimerRef.current) {
        window.clearTimeout(botMoveDelayTimerRef.current);
      }

      botMoveDelayTimerRef.current = window.setTimeout(() => {
        botMoveDelayTimerRef.current = null;

        if (requestId !== activeBotRequestIdRef.current) {
          return;
        }

        const currentMatch = latestBotMatchRef.current;
        const currentGame = latestBotGameRef.current;
        activeBotRequestIdRef.current = 0;
        setIsBotThinking(false);

        if (!currentMatch || !currentGame || currentGame.winner || currentGame.turn !== currentMatch.botSeat) {
          return;
        }

        const result = applyMoveToGameState(currentGame, move);

        if (!result.ok) {
          setBotFlashMessage('Bot move failed to apply.');
          return;
        }

        setSelectedBotPiece(null);
        setBotFlashMessage('');
        setBotGame(result.state);
      }, 1000);
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      activeBotRequestIdRef.current = 0;
      if (botMoveDelayTimerRef.current) {
        window.clearTimeout(botMoveDelayTimerRef.current);
        botMoveDelayTimerRef.current = null;
      }
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
      if (botWorkerRef.current === worker) {
        botWorkerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      activeScreen !== 'game-bot' ||
      !botMatch ||
      !botWorkerRef.current ||
      isBotThinking ||
      botGame.winner ||
      botGame.turn !== botMatch.botSeat
    ) {
      return;
    }

    const requestId = botRequestSequenceRef.current + 1;
    botRequestSequenceRef.current = requestId;
    activeBotRequestIdRef.current = requestId;
    setIsBotThinking(true);

    botWorkerRef.current.postMessage({
      requestId,
      gameState: botGame,
      player: botMatch.botSeat,
      difficulty: botMatch.difficulty,
    });
  }, [activeScreen, botGame, botMatch, isBotThinking]);

  const updateBotForm = (key, value) => {
    setBotForms((currentValue) => ({
      ...currentValue,
      [key]: value,
    }));
  };

  const resetBotRequest = () => {
    if (botMoveDelayTimerRef.current) {
      window.clearTimeout(botMoveDelayTimerRef.current);
      botMoveDelayTimerRef.current = null;
    }
    activeBotRequestIdRef.current = 0;
    setIsBotThinking(false);
  };

  const resetBotGame = () => {
    resetBotRequest();
    setBotGame(createInitialGameState());
    setSelectedBotPiece(null);
    setBotFlashMessage('');
  };

  const handleStartBotGame = (event) => {
    event.preventDefault();
    const { humanSeat, botSeat } = getResolvedBotSeats(botForms.seatChoice);

    resetBotRequest();
    setBotGame(createInitialGameState());
    setSelectedBotPiece(null);
    setBotFlashMessage('');
    setBotMatch({
      difficulty: botForms.difficulty,
      humanSeat,
      botSeat,
    });
  };

  const handleBotSquareClick = (index) => {
    if (!botMatch || botGame.winner || isBotThinking || botGame.turn !== botMatch.humanSeat) {
      return;
    }

    const board = botGame.board;
    const clickedPiece = board[index];

    if (!selectedBotPiece) {
      if (clickedPiece && clickedPiece.player === botMatch.humanSeat) {
        setSelectedBotPiece({
          type: clickedPiece.type,
          player: clickedPiece.player,
          from: index,
        });
      }
      return;
    }

    const nextMove = buildMoveFromSelection(board, selectedBotPiece, index);

    if (nextMove === 'clear') {
      setSelectedBotPiece(null);
      return;
    }

    if (nextMove?.reselection) {
      setSelectedBotPiece({
        type: nextMove.type,
        player: nextMove.player,
        from: nextMove.from,
      });
      return;
    }

    if (!nextMove) {
      setSelectedBotPiece(null);
      return;
    }

    const result = applyMoveToGameState(botGame, nextMove);
    if (!result.ok) {
      setSelectedBotPiece(null);
      return;
    }

    setBotGame(result.state);
    setSelectedBotPiece(null);
    setBotFlashMessage('');
  };

  const handleBotHandPieceClick = (type, player) => {
    if (
      !botMatch ||
      botGame.winner ||
      isBotThinking ||
      player !== botMatch.humanSeat ||
      botGame.turn !== botMatch.humanSeat
    ) {
      return;
    }

    if (selectedBotPiece?.type === type && selectedBotPiece?.player === player && selectedBotPiece?.from === null) {
      setSelectedBotPiece(null);
      return;
    }

    setSelectedBotPiece({ type, player, from: null });
  };

  const clearBotScreenState = () => {
    resetBotRequest();
    setSelectedBotPiece(null);
    setBotFlashMessage('');
  };

  return {
    botForms,
    botGame,
    selectedBotPiece,
    botMatch,
    botFlashMessage,
    isBotThinking,
    botStatusMessage: getBotStatusMessage(botGame, botMatch),
    botWhiteLabel: getBotPlayerLabel(botMatch, 'white'),
    botBlackLabel: getBotPlayerLabel(botMatch, 'black'),
    updateBotForm,
    resetBotRequest,
    resetBotGame,
    handleStartBotGame,
    handleBotSquareClick,
    handleBotHandPieceClick,
    clearBotScreenState,
  };
}
