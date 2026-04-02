import { useEffect, useRef, useState } from 'react';
import {
  buildSocketUrl,
  clearActiveOnlineSession,
  createOnlineLobby,
  joinOnlineLobby,
  loadActiveOnlineSession,
  saveActiveOnlineSession,
} from '../lib/onlineSession.js';
import { ONLINE_DEFAULTS } from '../lib/appContent.js';
import { buildMoveFromSelection } from '../lib/gameUi.js';

export function useOnlineLobbyController(setActiveScreen) {
  const [onlineForms, setOnlineForms] = useState(ONLINE_DEFAULTS);
  const [onlineSession, setOnlineSession] = useState(null);
  const [onlineSnapshot, setOnlineSnapshot] = useState(null);
  const [selectedOnlinePiece, setSelectedOnlinePiece] = useState(null);
  const [onlineFlashMessage, setOnlineFlashMessage] = useState('');
  const [copyNotice, setCopyNotice] = useState('');
  const [socketStatus, setSocketStatus] = useState('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reconnectNonce, setReconnectNonce] = useState(0);

  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const manualDisconnectRef = useRef(false);

  useEffect(() => {
    const restoredSession = loadActiveOnlineSession();

    if (restoredSession) {
      setOnlineSession(restoredSession);
      setActiveScreen('online-room');
      setOnlineFlashMessage('Restoring your online lobby...');
    }
  }, [setActiveScreen]);

  useEffect(() => {
    if (!onlineSession) {
      return undefined;
    }

    manualDisconnectRef.current = false;

    const socket = new WebSocket(buildSocketUrl(onlineSession));
    socketRef.current = socket;
    setSocketStatus((currentStatus) => (currentStatus === 'connected' ? currentStatus : 'connecting'));

    socket.addEventListener('open', () => {
      setSocketStatus('connected');
      socket.send(JSON.stringify({ type: 'resume' }));
    });

    socket.addEventListener('message', (event) => {
      let payload;

      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (payload.type === 'snapshot') {
        setOnlineSnapshot(payload);
        setOnlineFlashMessage(payload.statusMessage || '');
        setSelectedOnlinePiece(null);
        saveActiveOnlineSession({
          ...onlineSession,
          code: payload.lobbyCode,
          playerName: payload.you?.name || onlineSession.playerName,
        });
        setActiveScreen('online-room');
        return;
      }

      if (payload.type === 'error') {
        setOnlineFlashMessage(payload.message || 'Something went wrong.');
        return;
      }

      if (payload.type === 'system_notice') {
        setOnlineFlashMessage(payload.message || '');
      }
    });

    socket.addEventListener('close', () => {
      socketRef.current = null;

      if (manualDisconnectRef.current) {
        setSocketStatus('idle');
        return;
      }

      setSocketStatus('reconnecting');
      setOnlineFlashMessage('Connection dropped. Trying to reconnect...');
      reconnectTimerRef.current = window.setTimeout(() => {
        setReconnectNonce((value) => value + 1);
      }, 2000);
    });

    socket.addEventListener('error', () => {
      setSocketStatus('error');
    });

    return () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      socket.close();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [onlineSession, reconnectNonce, setActiveScreen]);

  const updateOnlineForm = (key, value) => {
    setOnlineForms((currentValue) => ({
      ...currentValue,
      [key]: value,
    }));
  };

  const clearOnlineState = ({ keepFlashMessage = false } = {}) => {
    manualDisconnectRef.current = true;
    if (socketRef.current) {
      try {
        socketRef.current.send(JSON.stringify({ type: 'leave' }));
      } catch {
        // The socket may already be closed during reconnect handling.
      }
      socketRef.current.close();
      socketRef.current = null;
    }

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    clearActiveOnlineSession();
    setOnlineSession(null);
    setOnlineSnapshot(null);
    setSelectedOnlinePiece(null);
    setSocketStatus('idle');

    if (!keepFlashMessage) {
      setOnlineFlashMessage('');
    }
  };

  const handleCreateLobby = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setOnlineFlashMessage('');

    try {
      const payload = await createOnlineLobby({
        playerName: onlineForms.createName,
        colorChoice: onlineForms.createColorChoice,
      });

      const nextSession = {
        code: payload.code,
        sessionToken: payload.sessionToken,
        playerName: onlineForms.createName.trim(),
        wsUrl: payload.wsUrl,
      };

      saveActiveOnlineSession(nextSession);
      setOnlineSession(nextSession);
      setOnlineSnapshot(payload.snapshot);
      setActiveScreen('online-room');
      setSocketStatus('connecting');
      setSelectedOnlinePiece(null);
      setOnlineFlashMessage('Lobby created. Share the code and wait for player two.');
    } catch (error) {
      setOnlineFlashMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinLobby = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setOnlineFlashMessage('');

    try {
      const payload = await joinOnlineLobby({
        code: onlineForms.joinCode.trim().toUpperCase(),
        playerName: onlineForms.joinName,
      });

      const nextSession = {
        code: payload.code,
        sessionToken: payload.sessionToken,
        playerName: onlineForms.joinName.trim(),
        wsUrl: payload.wsUrl,
      };

      saveActiveOnlineSession(nextSession);
      setOnlineSession(nextSession);
      setOnlineSnapshot(payload.snapshot);
      setActiveScreen('online-room');
      setSocketStatus('connecting');
      setSelectedOnlinePiece(null);
      setOnlineFlashMessage('Joined lobby. Opening the live board...');
    } catch (error) {
      setOnlineFlashMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLobbyCode = async () => {
    if (!onlineSnapshot?.lobbyCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(onlineSnapshot.lobbyCode);
      setCopyNotice('Lobby code copied.');
      window.setTimeout(() => setCopyNotice(''), 1800);
    } catch {
      setCopyNotice('Copy failed. Select the code manually.');
      window.setTimeout(() => setCopyNotice(''), 1800);
    }
  };

  const sendOnlineMessage = (payload) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setOnlineFlashMessage('The live connection is still reconnecting.');
      return false;
    }

    socketRef.current.send(JSON.stringify(payload));
    return true;
  };

  const handleOnlineSquareClick = (index) => {
    if (!onlineSnapshot || onlineSnapshot.phase !== 'active') {
      return;
    }

    const yourSeat = onlineSnapshot.yourSeat;
    const board = onlineSnapshot.game.board;
    const clickedPiece = board[index];

    if (!yourSeat || onlineSnapshot.game.turn !== yourSeat || onlineSnapshot.game.winner) {
      return;
    }

    if (!selectedOnlinePiece) {
      if (clickedPiece && clickedPiece.player === yourSeat) {
        setSelectedOnlinePiece({
          type: clickedPiece.type,
          player: clickedPiece.player,
          from: index,
        });
      }
      return;
    }

    const nextMove = buildMoveFromSelection(board, selectedOnlinePiece, index);

    if (nextMove === 'clear') {
      setSelectedOnlinePiece(null);
      return;
    }

    if (nextMove?.reselection) {
      setSelectedOnlinePiece({
        type: nextMove.type,
        player: nextMove.player,
        from: nextMove.from,
      });
      return;
    }

    if (!nextMove) {
      setSelectedOnlinePiece(null);
      return;
    }

    if (sendOnlineMessage({ type: 'move', move: nextMove })) {
      setSelectedOnlinePiece(null);
    }
  };

  const handleOnlineHandPieceClick = (type, player) => {
    if (!onlineSnapshot || onlineSnapshot.phase !== 'active') {
      return;
    }

    if (onlineSnapshot.game.winner || player !== onlineSnapshot.yourSeat || player !== onlineSnapshot.game.turn) {
      return;
    }

    if (selectedOnlinePiece?.type === type && selectedOnlinePiece?.player === player && selectedOnlinePiece?.from === null) {
      setSelectedOnlinePiece(null);
      return;
    }

    setSelectedOnlinePiece({ type, player, from: null });
  };

  const handleOnlineRematch = () => {
    sendOnlineMessage({ type: 'rematch_request' });
  };

  const leaveOnlineLobby = (nextScreen = 'menu') => {
    clearOnlineState();
    setActiveScreen(nextScreen);
  };

  return {
    onlineForms,
    onlineSession,
    onlineSnapshot,
    selectedOnlinePiece,
    onlineFlashMessage,
    copyNotice,
    socketStatus,
    isSubmitting,
    updateOnlineForm,
    clearOnlineState,
    handleCreateLobby,
    handleJoinLobby,
    handleCopyLobbyCode,
    handleOnlineSquareClick,
    handleOnlineHandPieceClick,
    handleOnlineRematch,
    leaveOnlineLobby,
    setOnlineFlashMessage,
  };
}
