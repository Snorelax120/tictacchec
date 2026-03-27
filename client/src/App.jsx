import { useEffect, useRef, useState } from 'react';
import ChessPiece from './components/ChessPiece';
import {
  applyMoveToGameState,
  createInitialGameState,
  getPawnDisplayDirection,
} from '@shared/gameRules.js';
import {
  buildSocketUrl,
  clearActiveOnlineSession,
  createOnlineLobby,
  joinOnlineLobby,
  loadActiveOnlineSession,
  saveActiveOnlineSession,
} from './lib/onlineSession';

const RULE_SECTIONS = [
  {
    title: 'What Is Tic Tac Chec?',
    body:
      'Tic Tac Chec blends a 4x4 tic-tac-toe win condition with chess-style movement. You are not trying to checkmate. You are trying to build a line of four pieces in your color.',
  },
  {
    title: 'How A Turn Works',
    body:
      'White starts. On your turn, either place one piece from your hand on an empty square or move one of your pieces already on the board using its chess movement.',
  },
  {
    title: 'Winning The Game',
    body:
      'Make a full row, column, or diagonal of four pieces in your color anywhere on the 4x4 board. The first player to complete a line wins immediately.',
  },
];

const ONLINE_DEFAULTS = {
  createName: '',
  createColorChoice: 'white',
  joinName: '',
  joinCode: '',
};

function getLocalPlayerLabel(color) {
  return color === 'white' ? 'White' : 'Black';
}

function getOnlinePlayerLabel(snapshot, color) {
  return snapshot?.players?.[color]?.name || (color === 'white' ? 'White' : 'Black');
}

function getOnlineStatusMessage(snapshot) {
  if (!snapshot) {
    return 'Connecting to lobby...';
  }

  if (snapshot.phase === 'waiting') {
    return snapshot.statusMessage || 'Waiting for an opponent to join.';
  }

  if (snapshot.game.winner) {
    return snapshot.statusMessage || `${getOnlinePlayerLabel(snapshot, snapshot.game.winner)} wins.`;
  }

  if (snapshot.closedReason === 'disconnect_timeout') {
    return snapshot.statusMessage || 'The match ended because a player disconnected.';
  }

  return snapshot.statusMessage || `${getOnlinePlayerLabel(snapshot, snapshot.game.turn)} to move.`;
}

function buildMoveFromSelection(board, selectedPiece, index) {
  if (!selectedPiece) {
    return null;
  }

  if (selectedPiece.from === null) {
    if (board[index] !== null) {
      return null;
    }

    return {
      player: selectedPiece.player,
      type: selectedPiece.type,
      from: null,
      to: index,
    };
  }

  if (selectedPiece.from === index) {
    return 'clear';
  }

  const occupant = board[index];
  if (occupant && occupant.player === selectedPiece.player) {
    return {
      player: occupant.player,
      type: occupant.type,
      from: index,
      reselection: true,
    };
  }

  return {
    player: selectedPiece.player,
    type: selectedPiece.type,
    from: selectedPiece.from,
    to: index,
  };
}

function buildWaitingSummary(snapshot) {
  if (!snapshot) {
    return {
      title: 'Connecting to lobby',
      detail: 'Opening your room and waiting for the server snapshot.',
    };
  }

  if (snapshot.hostColorChoice === 'random') {
    return {
      title: 'Color assignment will be random',
      detail: 'As soon as player two joins, the server will decide white and black and start the game.',
    };
  }

  return {
    title: `Host chose ${snapshot.hostColorChoice}`,
    detail: 'White always moves first. Once your opponent joins, the game will start immediately.',
  };
}

function App() {
  const [activeScreen, setActiveScreen] = useState('menu');
  const [localGame, setLocalGame] = useState(createInitialGameState);
  const [selectedLocalPiece, setSelectedLocalPiece] = useState(null);
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
  }, []);

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
        return;
      }

      if (payload.type === 'presence' || payload.type === 'rematch_status') {
        return;
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
  }, [onlineSession, reconnectNonce]);

  const resetLocalGame = () => {
    setLocalGame(createInitialGameState());
    setSelectedLocalPiece(null);
  };

  const openMenu = () => {
    setActiveScreen('menu');
  };

  const startLocalGame = () => {
    resetLocalGame();
    setActiveScreen('game-local');
  };

  const openRules = () => {
    setActiveScreen('rules');
  };

  const openOnlineHome = () => {
    setActiveScreen('online-home');
    setOnlineFlashMessage('');
  };

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

  const localStatusMessage = localGame.winner
    ? `${getLocalPlayerLabel(localGame.winner)} wins the game.`
    : `${getLocalPlayerLabel(localGame.turn)} to move.`;

  return (
    <div className="app-shell relative w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.2),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),_transparent_30%)] pointer-events-none" />
      <div className="absolute left-[-10rem] top-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute right-[-8rem] bottom-10 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      <div className="app-safe-shell relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden">
        {activeScreen === 'menu' && (
          <MenuScreen
            onPlayOverBoard={startLocalGame}
            onOpenRules={openRules}
            onPlayOnline={openOnlineHome}
            hasActiveSession={!!onlineSession}
            onResumeOnline={() => setActiveScreen('online-room')}
          />
        )}

        {activeScreen === 'rules' && <RulesScreen onBack={openMenu} />}

        {activeScreen === 'game-local' && (
          <GameScreen
            board={localGame.board}
            currentTurn={localGame.turn}
            selectedPiece={selectedLocalPiece}
            winner={localGame.winner}
            blackHand={localGame.hands.black}
            whiteHand={localGame.hands.white}
            blackLabel="Black"
            whiteLabel="White"
            topStatus={localStatusMessage}
            onSquareClick={handleLocalSquareClick}
            onHandPieceClick={handleLocalHandPieceClick}
            onBack={openMenu}
            onPrimaryAction={localGame.winner ? resetLocalGame : null}
            primaryActionLabel={localGame.winner ? 'Play Again' : null}
            getPawnDirection={getPawnDisplayDirection}
            mobileHandPlayer={localGame.turn}
          />
        )}

        {activeScreen === 'online-home' && (
          <OnlineHubScreen
            onBack={openMenu}
            onOpenCreate={() => setActiveScreen('online-create')}
            onOpenJoin={() => setActiveScreen('online-join')}
            flashMessage={onlineFlashMessage}
            hasActiveSession={!!onlineSession}
            onResumeLobby={() => setActiveScreen('online-room')}
          />
        )}

        {activeScreen === 'online-create' && (
          <OnlineCreateScreen
            values={onlineForms}
            isSubmitting={isSubmitting}
            flashMessage={onlineFlashMessage}
            onChange={updateOnlineForm}
            onSubmit={handleCreateLobby}
            onBack={openOnlineHome}
          />
        )}

        {activeScreen === 'online-join' && (
          <OnlineJoinScreen
            values={onlineForms}
            isSubmitting={isSubmitting}
            flashMessage={onlineFlashMessage}
            onChange={updateOnlineForm}
            onSubmit={handleJoinLobby}
            onBack={openOnlineHome}
          />
        )}

        {activeScreen === 'online-room' && (
          <OnlineRoomScreen
            snapshot={onlineSnapshot}
            selectedPiece={selectedOnlinePiece}
            onSquareClick={handleOnlineSquareClick}
            onHandPieceClick={handleOnlineHandPieceClick}
            onBack={() => leaveOnlineLobby('menu')}
            onRematch={handleOnlineRematch}
            onCopyCode={handleCopyLobbyCode}
            copyNotice={copyNotice}
            socketStatus={socketStatus}
            flashMessage={onlineFlashMessage}
            getPawnDirection={getPawnDisplayDirection}
          />
        )}
      </div>
    </div>
  );
}

function MenuScreen({
  onPlayOverBoard,
  onOpenRules,
  onPlayOnline,
  hasActiveSession,
  onResumeOnline,
}) {
  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[900px]">
        <section className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-900/70 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-blue-500/10 pointer-events-none" />
          <div className="relative flex min-h-0 flex-1 flex-col justify-between gap-4 py-1 sm:gap-6 sm:py-0">
            <div className="mx-auto w-full max-w-2xl flex-shrink text-center">
              <h1 className="text-center text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-600 drop-shadow-lg sm:text-7xl lg:text-8xl">
                TIC TAC CHEC
              </h1>
              <p className="mt-3 text-[9px] font-black uppercase tracking-[0.28em] text-cyan-300/90 sm:text-xs sm:tracking-[0.45em]">
                Chess Movement. Tic-Tac Pressure.
              </p>
              <p className="mt-3 text-sm leading-5 text-slate-300/80 sm:text-base sm:leading-7">
                Drop pieces from your hand, maneuver for control, and now create a live code-based lobby for online play.
              </p>
            </div>

            <div className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col justify-end gap-2 sm:gap-3">
              <MenuButton
                title="Play Over the Board"
                description="Start a local two-player match with the full gameboard experience."
                tone="cyan"
                onClick={onPlayOverBoard}
              />
              <MenuButton
                title="Play Online"
                description="Create a code-based lobby, share it, and play a live game backed by Cloudflare Durable Objects."
                tone="blue"
                onClick={onPlayOnline}
              />
              {hasActiveSession && (
                <MenuButton
                  title="Resume Online Lobby"
                  description="Reconnect to the lobby from the last active browser session."
                  tone="teal"
                  onClick={onResumeOnline}
                />
              )}
              <MenuButton
                title="How to Play / Rules"
                description="Learn what Tic Tac Chec is, how turns work, and how each piece helps you win."
                tone="slate"
                onClick={onOpenRules}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MenuButton({ title, description, tone, onClick }) {
  const toneClasses = {
    cyan: 'from-cyan-500 via-sky-500 to-blue-600 shadow-cyan-500/30',
    slate: 'from-slate-700 via-slate-800 to-slate-900 shadow-slate-950/40',
    blue: 'from-blue-600 via-indigo-600 to-sky-700 shadow-blue-600/30',
    teal: 'from-teal-500 via-cyan-500 to-sky-600 shadow-teal-500/30',
  };

  return (
    <button
      onClick={onClick}
      className={`group w-full flex-shrink rounded-[1.35rem] border border-white/10 bg-gradient-to-r ${toneClasses[tone]} p-[1px] text-left shadow-[0_18px_35px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_42px_rgba(15,23,42,0.4)] sm:rounded-[1.6rem]`}
    >
      <span className="flex w-full flex-col gap-2 rounded-[1.28rem] bg-slate-950/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:rounded-[1.5rem] sm:px-6 sm:py-5">
        <span>
          <span className="block text-[15px] font-black uppercase tracking-[0.06em] text-white sm:text-xl sm:tracking-[0.12em]">
            {title}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-300/85 sm:mt-2 sm:text-base sm:leading-6">
            {description}
          </span>
        </span>
        <span className="self-end text-xl font-black text-cyan-300 transition-transform duration-300 group-hover:translate-x-1 sm:self-auto sm:text-2xl">
          →
        </span>
      </span>
    </button>
  );
}

function RulesScreen({ onBack }) {
  const compactHeaderButtonClass = 'h-10 w-full justify-center overflow-hidden rounded-[1rem] px-0 py-0 text-[9px] tracking-[0.04em] !border-slate-600/80 !from-slate-800 !to-slate-950 !shadow-none hover:scale-100 active:scale-100 sm:h-auto sm:px-3 sm:py-2 sm:text-[10px]';

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col rounded-[2rem] border border-cyan-400/20 bg-slate-900/70 px-4 py-4 shadow-[0_24px_80px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:px-6 sm:py-5 lg:px-7 lg:py-6">
        <div className="flex flex-shrink-0 flex-col gap-3">
          <div className="grid grid-cols-[2.7rem_1fr_2.7rem] items-center gap-2 md:hidden">
            <ActionButton
              onClick={onBack}
              tone="slate"
              ariaLabel="Back to menu"
              className={compactHeaderButtonClass}
            >
              <span aria-hidden="true" className="text-base leading-none sm:text-sm">←</span>
              <span className="sr-only sm:not-sr-only sm:ml-1">Menu</span>
            </ActionButton>
            <h1 className="justify-self-center text-center text-[1.95rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-lg">
              How To Play
            </h1>
            <div className="w-full" />
          </div>
          <div className="hidden md:flex md:justify-start">
            <ActionButton onClick={onBack} tone="slate" className="w-full px-4 py-2 text-xs tracking-[0.08em] sm:w-auto sm:px-5 sm:text-sm">
              ← Menu
            </ActionButton>
          </div>
          <div className="hidden pt-1 text-right sm:-mt-3 md:flex md:justify-end">
            <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 sm:text-6xl lg:text-[4.2rem]">
              How To Play
            </h1>
          </div>
        </div>

        <div className="app-scroll-panel mt-4 flex-1">
          <div className="grid gap-3 pr-1 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-4 content-start">
            {RULE_SECTIONS.map((section) => (
              <div
                key={section.title}
                className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4 lg:p-5"
              >
                <h2 className="text-base font-black uppercase tracking-[0.12em] text-white lg:text-xl lg:tracking-[0.14em]">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300/85 lg:text-[15px]">
                  {section.body}
                </p>
              </div>
            ))}
            </div>

            <div className="grid gap-4 content-start">
              <div className="rounded-[1.35rem] border border-white/10 bg-gradient-to-br from-slate-800/90 to-slate-950/90 p-4 lg:p-5">
                <h2 className="text-base font-black uppercase tracking-[0.12em] text-white lg:text-xl lg:tracking-[0.14em]">
                  Piece Movements
                </h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300/85 lg:text-[15px]">
                  <li><span className="font-black text-white">Rook:</span> any distance horizontally or vertically.</li>
                  <li><span className="font-black text-white">Bishop:</span> any distance diagonally.</li>
                  <li><span className="font-black text-white">Knight:</span> L-shape jump, two plus one.</li>
                  <li><span className="font-black text-white">Pawn:</span> one step forward, diagonal captures, flips at the edge.</li>
                </ul>
              </div>

              <div className="rounded-[1.35rem] border border-cyan-400/15 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-4 lg:p-5">
                <h2 className="text-base font-black uppercase tracking-[0.12em] text-white lg:text-xl lg:tracking-[0.14em]">
                  Key Rules
                </h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200/85 lg:text-[15px]">
                  <li>Players place pieces from hand before moving them later.</li>
                  <li>Captured pieces return to the captured player&apos;s hand.</li>
                  <li>White always moves first.</li>
                  <li>Online rematches swap colors with the same opponent.</li>
                </ul>
              </div>

              <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/60 p-4 lg:p-5">
                <h2 className="text-base font-black uppercase tracking-[0.12em] text-white lg:text-xl lg:tracking-[0.14em]">
                  Winning Mindset
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300/85 lg:text-[15px]">
                  The goal is not checkmate. Build board pressure, recycle captured pieces, and race to align four of your own color first.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnlineHubScreen({
  onBack,
  onOpenCreate,
  onOpenJoin,
  flashMessage,
  hasActiveSession,
  onResumeLobby,
}) {
  return (
    <CenterCard
      title="Online Play"
      description="Create a code, share it with your opponent, and let the server run the official state for both players."
      onBack={onBack}
      hideEyebrow
      compactMobileHeader
      desktopCenteredHeader
      contentClassName="justify-end"
    >
      <div className="flex h-full min-h-0 flex-col justify-end">
        <div className="grid gap-2 sm:gap-4">
        <MenuButton
          title="Create Lobby"
          description="Pick your name, choose white, black, or random, and generate a shareable lobby code."
          tone="cyan"
          onClick={onOpenCreate}
        />
        <MenuButton
          title="Join Lobby"
          description="Enter a friend’s lobby code, add your name, and connect straight to the live match."
          tone="blue"
          onClick={onOpenJoin}
        />
        {hasActiveSession && (
          <MenuButton
            title="Resume Saved Lobby"
            description="Reconnect with the saved session token from this browser."
            tone="teal"
            onClick={onResumeLobby}
          />
        )}
        </div>
        {flashMessage && (
          <p className="mt-4 rounded-2xl border border-cyan-400/20 bg-slate-950/70 px-4 py-3 text-sm text-slate-200/85">
            {flashMessage}
          </p>
        )}
      </div>
    </CenterCard>
  );
}

function OnlineCreateScreen({ values, isSubmitting, flashMessage, onChange, onSubmit, onBack }) {
  return (
    <CenterCard
      title="Create Lobby"
      description="Your name is required, and your seat preference decides whether you start as white, black, or let the server randomize it."
      onBack={onBack}
      hideEyebrow
      compactMobileHeader
    >
      <form className="compact-height-scroll mt-5 flex h-full min-h-0 flex-col gap-4" onSubmit={onSubmit}>
        <TextInput
          label="Your Name"
          value={values.createName}
          onChange={(event) => onChange('createName', event.target.value)}
          placeholder="Player 1"
          autoFocus
        />
        <ColorChoicePicker
          value={values.createColorChoice}
          onChange={(value) => onChange('createColorChoice', value)}
        />
        {flashMessage && <InlineNotice message={flashMessage} />}
        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:justify-between">
          <ActionButton onClick={onBack} tone="slate" type="button" className="w-full sm:w-auto">
            Cancel
          </ActionButton>
          <ActionButton tone="cyan" type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Creating...' : 'Generate Lobby Code'}
          </ActionButton>
        </div>
      </form>
    </CenterCard>
  );
}

function OnlineJoinScreen({ values, isSubmitting, flashMessage, onChange, onSubmit, onBack }) {
  return (
    <CenterCard
      title="Join Lobby"
      description="Add your name, paste the six-character lobby code, and connect as player two."
      onBack={onBack}
      hideEyebrow
      compactMobileHeader
    >
      <form className="mt-5 flex h-full min-h-0 flex-col gap-4" onSubmit={onSubmit}>
        <TextInput
          label="Your Name"
          value={values.joinName}
          onChange={(event) => onChange('joinName', event.target.value)}
          placeholder="Player 2"
          autoFocus
        />
        <TextInput
          label="Lobby Code"
          value={values.joinCode}
          onChange={(event) => onChange('joinCode', event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="ABC123"
          className="tracking-[0.45em] uppercase"
        />
        {flashMessage && <InlineNotice message={flashMessage} />}
        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:justify-between">
          <ActionButton onClick={onBack} tone="slate" type="button" className="w-full sm:w-auto">
            Cancel
          </ActionButton>
          <ActionButton tone="cyan" type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Joining...' : 'Join Game'}
          </ActionButton>
        </div>
      </form>
    </CenterCard>
  );
}

function OnlineRoomScreen({
  snapshot,
  selectedPiece,
  onSquareClick,
  onHandPieceClick,
  onBack,
  onRematch,
  onCopyCode,
  copyNotice,
  socketStatus,
  flashMessage,
  getPawnDirection,
}) {
  const waitingSummary = buildWaitingSummary(snapshot);

  if (!snapshot || snapshot.phase === 'waiting') {
    return (
      <CenterCard
        title="Lobby Ready"
        description="Share the join code with player two. This room will stay attached to the same durable lobby instance."
        onBack={onBack}
        hideEyebrow
        compactMobileHeader
      >
        <div className="mt-5 flex h-full min-h-0 flex-col gap-3">
          <LobbyCodeCard
            code={snapshot?.lobbyCode || '......'}
            onCopy={onCopyCode}
            copyNotice={copyNotice}
            socketStatus={socketStatus}
          />
          <div className="grid gap-3 lg:grid-cols-2">
            <InfoCard title="Seat Preference" value={waitingSummary.title} detail={waitingSummary.detail} />
            <InfoCard
              title="Players"
              value={snapshot?.players?.host?.name || 'Connecting...'}
              detail={snapshot?.players?.guest
                ? `${snapshot.players.guest.name} joined and the match should start any second.`
                : 'Opponent slot is still open.'}
            />
          </div>
          {flashMessage && <InlineNotice message={flashMessage} />}
        </div>
      </CenterCard>
    );
  }

  const canRequestRematch =
    snapshot.phase === 'finished' &&
    snapshot.closedReason !== 'disconnect_timeout' &&
    snapshot.players.white &&
    snapshot.players.black;
  const yourRematchReady = snapshot.yourSeat
    ? snapshot.rematch?.[snapshot.yourSeat === 'white' ? 'whiteReady' : 'blackReady']
    : false;

  return (
    <GameScreen
      board={snapshot.game.board}
      currentTurn={snapshot.game.turn}
      selectedPiece={selectedPiece}
      winner={snapshot.game.winner}
      blackHand={snapshot.game.hands.black}
      whiteHand={snapshot.game.hands.white}
      blackLabel={getOnlinePlayerLabel(snapshot, 'black')}
      whiteLabel={getOnlinePlayerLabel(snapshot, 'white')}
      topStatus={getOnlineStatusMessage(snapshot)}
      onSquareClick={onSquareClick}
      onHandPieceClick={onHandPieceClick}
      onBack={onBack}
      onPrimaryAction={canRequestRematch ? onRematch : null}
      primaryActionLabel={canRequestRematch
        ? yourRematchReady
          ? 'Rematch Requested'
          : 'Request Rematch'
        : null}
      primaryActionDisabled={!canRequestRematch || yourRematchReady}
      getPawnDirection={getPawnDirection}
      socketStatus={socketStatus}
      copyCode={snapshot.lobbyCode}
      onCopyCode={onCopyCode}
      copyNotice={copyNotice}
      bottomNotice={flashMessage}
      rematchState={snapshot.rematch}
      mobileHandPlayer={snapshot.yourSeat || null}
    />
  );
}

function CenterCard({
  title,
  eyebrow,
  description,
  onBack,
  children,
  hideEyebrow = false,
  compactMobileHeader = false,
  contentClassName = '',
  desktopCenteredHeader = false,
}) {
  const compactHeaderButtonClass = 'h-10 w-full justify-center overflow-hidden rounded-[1rem] px-0 py-0 text-[9px] tracking-[0.04em] !border-slate-600/80 !from-slate-800 !to-slate-950 !shadow-none hover:scale-100 active:scale-100 sm:h-auto sm:px-3 sm:py-2 sm:text-[10px]';

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-900/80 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:p-8">
        <div className="flex flex-shrink-0 flex-col gap-3">
          {compactMobileHeader ? (
            <div className="grid grid-cols-[2.7rem_1fr_2.7rem] items-center gap-2 md:hidden">
              <ActionButton
                onClick={onBack}
                tone="slate"
                ariaLabel="Back to menu"
                className={compactHeaderButtonClass}
              >
                <span aria-hidden="true" className="text-base leading-none sm:text-sm">←</span>
                <span className="sr-only sm:not-sr-only sm:ml-1">Menu</span>
              </ActionButton>
              <h1 className="justify-self-center text-center text-[1.95rem] font-black leading-none tracking-tight text-white">
                {title}
              </h1>
              <div className="w-full" />
            </div>
          ) : null}

          {desktopCenteredHeader ? (
            <div className={`hidden md:grid md:grid-cols-[auto_1fr_auto] md:items-start md:gap-4 ${compactMobileHeader ? 'md:grid' : ''}`}>
              <div className="flex justify-start">
                <ActionButton onClick={onBack} tone="slate" className="w-full flex-shrink-0 px-4 py-2 text-xs tracking-[0.08em] sm:w-auto sm:px-5 sm:text-sm">
                  ← Menu
                </ActionButton>
              </div>
              <div className="mx-auto max-w-2xl text-center">
                {!hideEyebrow && eyebrow ? (
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300/90">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className={`${hideEyebrow ? 'mt-0' : 'mt-2 sm:mt-3'} text-[1.65rem] font-black tracking-tight text-white sm:text-5xl`}>
                  {title}
                </h1>
                <p className="mt-3 text-sm leading-5 text-slate-300/85 sm:mt-4 sm:text-base sm:leading-7">
                  {description}
                </p>
              </div>
              <div />
            </div>
          ) : null}

          <div className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${compactMobileHeader ? 'hidden md:flex' : ''} ${desktopCenteredHeader ? 'md:hidden' : ''}`}>
            <div>
              {!hideEyebrow && eyebrow ? (
                <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300/90">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className={`${hideEyebrow ? 'mt-0' : 'mt-2 sm:mt-3'} text-[1.65rem] font-black tracking-tight text-white sm:text-5xl`}>
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-5 text-slate-300/85 sm:mt-4 sm:text-base sm:leading-7">
                {description}
              </p>
            </div>
            <ActionButton onClick={onBack} tone="slate" className="w-full flex-shrink-0 px-4 py-2 text-xs tracking-[0.08em] sm:w-auto sm:px-5 sm:text-sm">
              ← Menu
            </ActionButton>
          </div>

          {compactMobileHeader ? (
            <p className="text-center text-sm leading-5 text-slate-300/85 md:hidden">
              {description}
            </p>
          ) : null}
        </div>
        <div className={`mt-4 flex min-h-0 flex-1 flex-col overflow-hidden ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

function GameScreen({
  board,
  currentTurn,
  selectedPiece,
  winner,
  blackHand,
  whiteHand,
  blackLabel,
  whiteLabel,
  topStatus,
  onSquareClick,
  onHandPieceClick,
  onBack,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionDisabled = false,
  getPawnDirection,
  socketStatus,
  copyCode,
  onCopyCode,
  copyNotice,
  bottomNotice,
  rematchState,
  mobileHandPlayer = null,
}) {
  const showRematchReadiness = Boolean(winner && rematchState);
  const boardShellClassName = 'w-full max-w-none md:w-[35rem] md:max-w-[35rem] lg:w-[39rem] lg:max-w-[39rem]';
  const mobileBottomHandLabel = mobileHandPlayer === 'white'
    ? whiteLabel
    : mobileHandPlayer === 'black'
      ? blackLabel
      : '';
  const mobileBottomHandPieces = mobileHandPlayer === 'white'
    ? whiteHand
    : mobileHandPlayer === 'black'
      ? blackHand
      : [];
  const mobileOpponentPlayer = mobileHandPlayer === 'white'
    ? 'black'
    : mobileHandPlayer === 'black'
      ? 'white'
      : null;
  const mobileTopHandLabel = mobileOpponentPlayer === 'white'
    ? whiteLabel
    : mobileOpponentPlayer === 'black'
      ? blackLabel
      : '';
  const mobileTopHandPieces = mobileOpponentPlayer === 'white'
    ? whiteHand
    : mobileOpponentPlayer === 'black'
      ? blackHand
      : [];
  const showMobileHands = Boolean(mobileHandPlayer);
  const mobileBottomHandIsActive = mobileHandPlayer === currentTurn && !winner;
  const mobileTopHandIsActive = mobileOpponentPlayer === currentTurn && !winner;
  const compactMobileEndgame = Boolean(winner && showMobileHands);
  const showTinyScreenOverlayAction = Boolean(primaryActionLabel && showMobileHands);
  const mobileHeaderButtonClass = 'mobile-ultra-compact-button h-10 w-full justify-center overflow-hidden rounded-[1rem] px-0 py-0 text-[9px] tracking-[0.04em] !border-slate-600/80 !from-slate-800 !to-slate-950 !shadow-none hover:scale-100 active:scale-100 sm:h-auto sm:px-3 sm:py-2 sm:text-[10px]';

  return (
    <div className="mobile-ultra-compact-shell flex h-full min-h-0 w-full self-stretch flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1450px] min-h-0 flex-1 flex-col gap-2 md:gap-4">
        <div className="mobile-ultra-compact-header flex-shrink-0 md:hidden">
          <div className="grid grid-cols-[2.7rem_1fr_2.7rem] items-center gap-2 sm:grid-cols-[4.4rem_1fr_4.4rem] sm:gap-2">
            <ActionButton
              onClick={onBack}
              tone="slate"
              ariaLabel="Back to menu"
              className={mobileHeaderButtonClass}
            >
              <span aria-hidden="true" className="text-base leading-none sm:text-sm">←</span>
              <span className="sr-only sm:not-sr-only sm:ml-1">Menu</span>
            </ActionButton>
            <h1 className="mobile-ultra-compact-title justify-self-center text-center text-[1.95rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-lg sm:text-[4.75rem]">
              TIC TAC CHEC
            </h1>
            {copyCode && onCopyCode ? (
              <ActionButton
                onClick={onCopyCode}
                tone="teal"
                ariaLabel="Copy code"
                className={mobileHeaderButtonClass}
              >
                <span aria-hidden="true" className="text-sm leading-none sm:hidden">⎘</span>
                <span className="hidden sm:inline">Copy</span>
              </ActionButton>
            ) : (
              <div className="w-full" />
            )}
          </div>
          {socketStatus && (
            <div className="mobile-ultra-compact-badge mt-1.5 flex justify-center">
              <ConnectionBadge status={socketStatus} copyNotice={copyNotice} />
            </div>
          )}
        </div>

        <div className="hidden md:grid md:mb-4 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-3">
          <div className="flex flex-wrap justify-start gap-2 sm:gap-3">
            <ActionButton onClick={onBack} tone="slate" className="w-full px-4 py-2 text-xs tracking-[0.08em] sm:w-auto sm:px-5 sm:text-sm">
              ← Menu
            </ActionButton>
            {copyCode && onCopyCode && (
              <ActionButton onClick={onCopyCode} tone="teal" className="w-full sm:w-auto">
                Copy Code
              </ActionButton>
            )}
          </div>

          <h1 className="text-center text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-lg md:text-6xl">
            TIC TAC CHEC
          </h1>

          <div className="flex justify-end">
            {socketStatus && <ConnectionBadge status={socketStatus} copyNotice={copyNotice} />}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-stretch gap-2 overflow-hidden pb-2 md:flex-row md:items-center md:justify-center md:gap-6 md:pb-4">
          {showMobileHands && (
            <div className="mobile-opponent-hand w-full flex-shrink-0 self-stretch md:hidden">
              <HandDisplay
                layout="tray"
                title={`${mobileTopHandLabel}'s Hand`}
                pieces={mobileTopHandPieces}
                player={mobileOpponentPlayer}
                isActive={mobileTopHandIsActive}
                compact={compactMobileEndgame}
                selectedPiece={selectedPiece}
                onPieceClick={onHandPieceClick}
              />
            </div>
          )}
          {showMobileHands && (
            <div className="mobile-opponent-summary w-full flex-shrink-0 self-stretch md:hidden">
              <HandDisplay
                layout="summary"
                title={`${mobileTopHandLabel}'s Hand`}
                pieces={mobileTopHandPieces}
                player={mobileOpponentPlayer}
                isActive={mobileTopHandIsActive}
                selectedPiece={selectedPiece}
                onPieceClick={onHandPieceClick}
              />
            </div>
          )}

          <div className="hidden w-full flex-none md:block md:w-[260px] lg:w-[290px]">
            <HandDisplay
              title={`${blackLabel}'s Hand`}
              pieces={blackHand}
              player="black"
              isActive={currentTurn === 'black' && !winner}
              selectedPiece={selectedPiece}
              onPieceClick={onHandPieceClick}
            />
          </div>

          <div className={`z-10 flex min-h-0 w-full flex-1 self-stretch flex-col justify-center ${boardShellClassName}`}>
            <div className="mobile-ultra-compact-status mb-1.5 flex w-full justify-center sm:mb-2">
              <div
                className={`w-full rounded-full font-black uppercase text-center leading-tight shadow-xl transition-all duration-500 ${
                  winner
                    ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 px-3 py-1.5 text-[11px] tracking-[0.08em] text-slate-950 shadow-[0_0_35px_rgba(251,191,36,0.9)] sm:px-4 sm:py-2.5 sm:text-base md:text-xl'
                    : currentTurn === 'white'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-1.5 text-[9px] tracking-[0.12em] text-white shadow-blue-500/40 sm:px-4 sm:py-2 sm:text-[11px] md:text-sm md:tracking-[0.2em]'
                      : 'bg-gradient-to-r from-gray-700 to-gray-900 px-3 py-1.5 text-[9px] tracking-[0.12em] text-white shadow-gray-900/50 sm:px-4 sm:py-2 sm:text-[11px] md:text-sm md:tracking-[0.2em]'
                }`}
              >
                {topStatus}
              </div>
            </div>

            <div className="mobile-ultra-compact-board relative grid w-full grid-cols-4 gap-0 overflow-hidden rounded-[1.2rem] border-4 border-slate-700/50 bg-blue-950 p-2.5 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-sm sm:rounded-[1.4rem] sm:border-[5px] sm:p-3 md:rounded-3xl md:border-8 md:p-6">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none mix-blend-overlay" />
              {board.map((piece, index) => {
                const row = Math.floor(index / 4);
                const col = index % 4;
                const isLight = (row + col) % 2 === 0;
                const isSelected = selectedPiece?.from === index;
                const pawnDirection = getPawnDirection(piece, index);

                return (
                  <div
                    key={index}
                    onClick={() => onSquareClick(index)}
                    className={`
                      relative flex aspect-square w-full cursor-pointer items-center justify-center transition-all duration-300
                      ${isLight ? 'bg-slate-300' : 'bg-slate-600'}
                      ${isSelected ? 'z-20 scale-[0.92] rounded-md ring-[3px] ring-inset ring-yellow-400 shadow-inner sm:ring-[4px] md:ring-[6px]' : 'rounded-[0.18rem] sm:rounded-[0.2rem] md:rounded-sm'}
                      hover:brightness-125 hover:scale-[0.95] hover:z-10
                    `}
                  >
                    {piece && (
                      <div className={`mobile-ultra-compact-piece ${isSelected ? 'scale-105 sm:scale-110' : 'scale-[0.88] sm:scale-[0.95] md:scale-100'} transition-transform duration-300`}>
                        <ChessPiece
                          type={piece.type}
                          player={piece.player}
                          direction={pawnDirection}
                          iconClassName="text-[2.3rem] sm:text-[2.75rem] md:text-[3.75rem]"
                        />
                      </div>
                    )}
                    <span className="mobile-ultra-compact-index absolute bottom-0.5 right-1 text-[8px] font-bold text-black/40 select-none font-mono sm:text-[9px] md:bottom-1 md:right-2 md:text-[10px]">
                      {index}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {showMobileHands && (
            <div className={`mobile-current-hand relative w-full flex-shrink-0 self-stretch md:hidden ${showTinyScreenOverlayAction ? 'mobile-current-hand-with-overlay' : ''}`}>
              {!primaryActionLabel && (
                <div className="mobile-very-short-bottom-status md:hidden">
                  <BottomStatusBar
                    notice={bottomNotice}
                    primaryActionLabel={primaryActionLabel}
                    onPrimaryAction={onPrimaryAction}
                    primaryActionDisabled={primaryActionDisabled}
                    rematchState={showRematchReadiness ? rematchState : null}
                    compactMobile={Boolean(winner)}
                    ultraCompactMobile
                  />
                </div>
              )}
              <HandDisplay
                layout="tray"
                title={`${mobileBottomHandLabel}'s Hand`}
                pieces={mobileBottomHandPieces}
                player={mobileHandPlayer}
                isActive={mobileBottomHandIsActive}
                compact={compactMobileEndgame}
                ultraCompact
                selectedPiece={selectedPiece}
                onPieceClick={onHandPieceClick}
              />
              {showTinyScreenOverlayAction && onPrimaryAction && (
                <div className="mobile-hand-overlay-action md:hidden">
                  <ActionButton
                    onClick={onPrimaryAction}
                    tone="success"
                    disabled={primaryActionDisabled}
                    className="w-full px-4 py-2 text-[11px] tracking-[0.08em]"
                  >
                    {primaryActionLabel}
                  </ActionButton>
                </div>
              )}
            </div>
          )}

          <div className="hidden w-full flex-none md:block md:w-[260px] lg:w-[290px]">
            <HandDisplay
              title={`${whiteLabel}'s Hand`}
              pieces={whiteHand}
              player="white"
              isActive={currentTurn === 'white' && !winner}
              selectedPiece={selectedPiece}
              onPieceClick={onHandPieceClick}
            />
          </div>
        </div>

        <BottomStatusBar
          className="mobile-standard-bottom-status"
          notice={bottomNotice}
          primaryActionLabel={primaryActionLabel}
          onPrimaryAction={onPrimaryAction}
          primaryActionDisabled={primaryActionDisabled}
          rematchState={showRematchReadiness ? rematchState : null}
          compactMobile={Boolean(winner)}
          ultraCompactMobile
        />
      </div>
    </div>
  );
}

function BottomStatusBar({
  className = '',
  notice,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled,
  rematchState,
  compactMobile = false,
  ultraCompactMobile = false,
}) {
  if (!primaryActionLabel && !notice && !rematchState) {
    return null;
  }

  return (
    <div className={`mobile-ultra-compact-bottom mt-2 flex-shrink-0 rounded-[1.35rem] border border-white/10 bg-slate-950/75 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:mt-4 sm:rounded-[1.75rem] sm:px-4 sm:py-3 ${compactMobile ? 'px-3 py-2' : 'px-3 py-2.5'} ${ultraCompactMobile ? 'mobile-ultra-compact-bottom-shell' : ''} ${className}`}>
      <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between ${compactMobile ? 'gap-2' : 'gap-3'}`}>
        <div className="min-h-[1.5rem]">
          {notice && (
            <p className={`mobile-ultra-compact-bottom-text font-semibold text-slate-100 sm:text-base ${compactMobile ? 'text-[11px]' : 'text-xs'}`}>
              {notice}
            </p>
          )}
          {rematchState && (
            <p className={`mobile-ultra-compact-bottom-meta uppercase tracking-[0.16em] text-slate-400 sm:text-xs sm:tracking-[0.2em] ${notice ? 'mt-1' : ''} ${compactMobile ? 'text-[9px]' : 'text-[10px]'}`}>
              Rematch readiness: {Number(rematchState.whiteReady) + Number(rematchState.blackReady)} / 2
            </p>
          )}
        </div>
        <div className={`flex flex-col sm:flex-row sm:justify-end ${compactMobile ? 'gap-2' : 'gap-3'}`}>
          {primaryActionLabel && onPrimaryAction && (
            <ActionButton
              onClick={onPrimaryAction}
              tone="success"
              disabled={primaryActionDisabled}
              className={`mobile-ultra-compact-bottom-button w-full sm:w-auto ${compactMobile ? 'px-4 py-2 text-[11px] tracking-[0.08em] sm:text-sm' : ''}`}
            >
              {primaryActionLabel}
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}

function LobbyCodeCard({ code, onCopy, copyNotice, socketStatus }) {
  return (
    <div className="rounded-[1.5rem] border border-cyan-400/20 bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-cyan-950/40 p-3.5 sm:rounded-[1.75rem] sm:p-6">
      <p className="text-center text-xs font-black uppercase tracking-[0.35em] text-cyan-300/90">
        Share This Lobby Code
      </p>
      <div className="mt-3 flex flex-col items-center gap-3 text-center sm:mt-4 sm:gap-4">
        <p className="break-all text-center text-[1.7rem] font-black tracking-[0.16em] text-white sm:text-5xl sm:tracking-[0.35em]">
          {code}
        </p>
        <ActionButton onClick={onCopy} tone="cyan" className="w-full sm:w-auto">
          Copy Code
        </ActionButton>
      </div>
      <p className="mt-4 text-center text-sm text-slate-300/85">
        Socket status: <span className="font-semibold text-white">{socketStatus}</span>
      </p>
      {copyNotice && (
        <p className="mt-2 text-center text-sm text-cyan-200">
          {copyNotice}
        </p>
      )}
    </div>
  );
}

function InfoCard({ title, value, detail }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/60 p-4 sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300/85">
        {title}
      </p>
      <h2 className="mt-3 break-words text-xl font-black text-white sm:text-2xl">
        {value}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-300/85">
        {detail}
      </p>
    </div>
  );
}

function TextInput({ label, className = '', ...props }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300/90">
        {label}
      </span>
      <input
        {...props}
        className={`mt-2.5 w-full rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/20 sm:mt-3 sm:px-5 sm:py-4 ${className}`}
      />
    </label>
  );
}

function ColorChoicePicker({ value, onChange }) {
  const options = [
    { value: 'white', label: 'Start As White', detail: 'You get White and move first.' },
    { value: 'black', label: 'Start As Black', detail: 'You get Black and your opponent moves first.' },
    { value: 'random', label: 'Random Seat', detail: 'The server decides White and Black when player two joins.' },
  ];

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300/90">
        Color Preference
      </p>
      <div className="mt-2.5 grid gap-2.5 sm:mt-3 sm:gap-3">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-2xl border px-4 py-3 text-left transition sm:px-5 sm:py-4 ${
                active
                  ? 'border-cyan-300/50 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.12)]'
                  : 'border-white/10 bg-slate-950/80 hover:border-white/25 hover:bg-white/5'
              }`}
            >
              <span className="block text-base font-black text-white">
                {option.label}
              </span>
              <span className="mt-1 block text-sm leading-5 text-slate-300/80 sm:leading-6">
                {option.detail}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InlineNotice({ message }) {
  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/75 px-4 py-2.5 text-sm text-slate-200/90 sm:py-3">
      {message}
    </div>
  );
}

function ConnectionBadge({ status, copyNotice }) {
  const colorClasses = {
    idle: 'border-slate-500/30 bg-slate-900/70 text-slate-200',
    connecting: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
    connected: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
    reconnecting: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
    error: 'border-red-400/30 bg-red-500/10 text-red-100',
  };

  return (
    <div className={`max-w-full rounded-full border px-3.5 py-1.5 text-center text-[9px] font-black uppercase tracking-[0.16em] sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.24em] ${colorClasses[status] || colorClasses.idle}`}>
      {copyNotice || status}
    </div>
  );
}

function ActionButton({ children, onClick, tone = 'cyan', type = 'button', disabled = false, className = '', ariaLabel }) {
  const toneClasses = {
    cyan: 'from-cyan-500 to-blue-600 border-cyan-300/30 shadow-[0_10px_30px_rgba(6,182,212,0.24)]',
    slate: 'from-slate-800 to-slate-950 border-slate-600/70 shadow-none',
    success: 'from-green-600 to-emerald-700 border-green-300/20 shadow-[0_10px_30px_rgba(22,163,74,0.24)]',
    danger: 'from-red-600 to-rose-700 border-red-300/20 shadow-[0_10px_30px_rgba(220,38,38,0.24)]',
    teal: 'from-teal-500 to-cyan-600 border-cyan-200/25 shadow-[0_10px_30px_rgba(20,184,166,0.24)]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex appearance-none items-center justify-center overflow-hidden rounded-full border-2 bg-gradient-to-r bg-clip-padding px-4 py-2.5 text-xs font-black uppercase tracking-[0.1em] text-white transition-all duration-300 sm:px-7 sm:py-3 sm:text-base sm:tracking-[0.14em] ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-105 active:scale-95'} ${toneClasses[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

function HandDisplay({
  title,
  pieces,
  player,
  isActive,
  selectedPiece,
  onPieceClick,
  layout = 'panel',
  compact = false,
  ultraCompact = false,
}) {
  if (layout === 'summary') {
    const summaryPieces = pieces.length > 0 ? pieces : [];

    return (
      <div
        className={`
          mobile-opponent-summary-card grid w-full grid-cols-[auto_1fr_auto] items-center rounded-[1rem] border bg-gradient-to-r px-3 py-2 shadow-lg
          ${player === 'white' ? 'from-indigo-900/95 to-blue-950/95' : 'from-slate-800/95 to-gray-900/95'}
          ${isActive ? 'border-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.16)]' : 'border-gray-700/50'}
        `}
      >
        <p className="mobile-opponent-summary-title text-[10px] font-black uppercase tracking-[0.12em] text-gray-100">
          {title}
        </p>
        <div className="mobile-opponent-summary-pieces flex w-full items-center justify-center gap-1">
          {summaryPieces.length > 0 ? (
            summaryPieces.map((piece, index) => (
              <span
                key={`${piece}-${index}`}
                className="mobile-opponent-summary-piece flex items-center justify-center"
              >
                <ChessPiece
                  type={piece}
                  player={player}
                  direction={piece === 'pawn' ? (player === 'white' ? -1 : 1) : undefined}
                  iconClassName="text-[1.45rem]"
                />
              </span>
            ))
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">Empty</span>
          )}
        </div>
        <span className={`mobile-opponent-summary-status text-[9px] font-black uppercase tracking-[0.12em] ${isActive ? 'text-yellow-300' : 'text-gray-400'}`}>
          {isActive ? 'Ready' : 'Standby'}
        </span>
      </div>
    );
  }

  if (layout === 'tray') {
    const traySlots = [...pieces];

    while (traySlots.length < 4) {
      traySlots.push(null);
    }

    return (
      <div
        className={`
          mobile-ultra-compact-tray flex w-full flex-shrink-0 flex-col rounded-[1.15rem] border-2 bg-gradient-to-br shadow-xl sm:rounded-[1.35rem] sm:p-3
          ${compact ? 'min-h-[6.75rem] p-2' : 'min-h-[8rem] p-2.5'}
          sm:min-h-[8.8rem]
          ${player === 'white' ? 'from-indigo-900 to-blue-950' : 'from-slate-800 to-gray-900'}
          ${isActive ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.2)]' : 'border-gray-700/50'}
        `}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className={`mobile-ultra-compact-tray-title font-black uppercase tracking-[0.14em] text-gray-100 drop-shadow-md sm:text-xs sm:tracking-[0.18em] ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
            {title}
          </h2>
          <span className={`mobile-ultra-compact-tray-status font-black uppercase tracking-[0.12em] sm:text-[10px] sm:tracking-[0.16em] ${compact ? 'text-[8px]' : 'text-[9px]'} ${isActive ? 'text-yellow-300' : 'text-gray-400'}`}>
            {isActive ? 'Ready' : 'Standby'}
          </span>
        </div>
        <div className={`mobile-ultra-compact-tray-grid-wrap -mx-1 flex flex-1 pb-1 sm:mt-3 sm:min-h-[5.6rem] ${compact ? 'mt-1 min-h-[4.15rem]' : 'mt-2 min-h-[5rem]'}`}>
          <div className={`mobile-ultra-compact-tray-grid grid w-full grid-cols-4 px-1 sm:gap-2 ${compact ? 'gap-1' : 'gap-1.5'}`}>
            {traySlots.map((type, index) => {
              if (!type) {
                return (
                  <div
                    key={`empty-${index}`}
                    aria-hidden="true"
                    className={`rounded-xl border border-white/5 bg-black/10 opacity-0 sm:min-h-[5.6rem] ${compact ? 'min-h-[4.15rem]' : 'min-h-[5rem]'}`}
                  />
                );
              }

              const isSelected =
                selectedPiece?.type === type &&
                selectedPiece?.player === player &&
                selectedPiece?.from === null;

              return (
                <HandPieceButton
                  key={`${type}-${index}`}
                  type={type}
                    player={player}
                    isActive={isActive}
                    isSelected={isSelected}
                    onPieceClick={onPieceClick}
                    layout="tray"
                    compact={compact}
                    ultraCompact={ultraCompact}
                  />
                );
              })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        rounded-2xl border-2 bg-gradient-to-br shadow-xl transition-all duration-500
        ${compact ? 'p-3 lg:p-3.5' : 'p-4 lg:p-5'}
        ${player === 'white' ? 'from-indigo-900 to-blue-950' : 'from-slate-800 to-gray-900'}
        ${isActive ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)]' : 'border-gray-700/50'}
        flex w-full flex-col justify-start
        ${compact ? 'h-[330px] md:h-[360px] lg:h-[390px]' : 'h-[460px] md:h-[520px] lg:h-[560px]'}
      `}
    >
      <h2 className={`font-black uppercase tracking-[0.2em] text-center text-gray-200 drop-shadow-md ${compact ? 'mb-2 text-[11px] sm:text-xs' : 'mb-4 text-xs sm:text-sm'}`}>
        {title}
      </h2>
      <div className={`flex flex-1 flex-col justify-start ${compact ? 'gap-1.5 pt-0' : 'gap-2 pt-1'}`}>
        {pieces.map((type, index) => {
          const isSelected =
            selectedPiece?.type === type &&
            selectedPiece?.player === player &&
            selectedPiece?.from === null;

          return (
            <HandPieceButton
              key={`${type}-${index}`}
              type={type}
              player={player}
              isActive={isActive}
              isSelected={isSelected}
              onPieceClick={onPieceClick}
            />
          );
        })}
      </div>
      {pieces.length === 0 && (
        <p className={`text-center text-gray-500 italic ${compact ? 'py-2 text-xs' : 'py-4 text-sm'}`}>
          No pieces left
        </p>
      )}
    </div>
  );
}

function HandPieceButton({
  type,
  player,
  isActive,
  isSelected,
  onPieceClick,
  layout = 'panel',
  compact = false,
  ultraCompact = false,
}) {
  const defaultPawnDirection = type === 'pawn'
    ? player === 'white' ? -1 : 1
    : undefined;
  const isTray = layout === 'tray';
  const baseClasses = isTray
    ? `h-full w-full rounded-xl sm:px-3 sm:py-3 ${ultraCompact ? 'px-1 py-1' : compact ? 'px-1.5 py-1.5' : 'px-2 py-2.5'}`
    : `overflow-hidden rounded-xl ${compact ? 'px-2.5 pb-2 pt-3 sm:px-3 sm:pb-2.5 sm:pt-4' : 'px-3 pb-2.5 pt-4 sm:pb-3 sm:pt-5'}`;
  const pieceScaleClasses = isTray
    ? `drop-shadow-lg ${ultraCompact ? 'mb-0' : compact ? 'mb-0.5' : 'mb-1'}`
    : compact
      ? 'mb-0.5 translate-y-0.5 drop-shadow-lg scale-[0.92] sm:translate-y-1 sm:scale-100'
      : 'mb-1 translate-y-1 drop-shadow-lg scale-100 sm:translate-y-1.5 sm:scale-110';
  const pieceIconClassName = isTray
    ? ultraCompact ? 'text-[1.95rem] sm:text-[2.2rem]' : compact ? 'text-[1.5rem] sm:text-[2.2rem]' : 'text-[1.85rem] sm:text-[2.2rem]'
    : compact ? 'text-[2rem] sm:text-[2.45rem]' : 'text-[2.35rem] sm:text-[3.05rem]';
  const labelClasses = isTray
    ? ultraCompact ? 'mt-0 text-[7px] tracking-[0.08em] sm:text-[10px] sm:tracking-[0.16em]' : compact ? 'mt-0.5 text-[8px] tracking-[0.1em] sm:text-[10px] sm:tracking-[0.16em]' : 'mt-1 text-[9px] tracking-[0.12em] sm:text-[10px] sm:tracking-[0.16em]'
    : compact ? 'mt-1 text-[10px] sm:text-[11px] tracking-wider' : 'mt-2 text-[11px] sm:text-xs tracking-wider';

  return (
    <button
      type="button"
      onClick={() => onPieceClick(type, player)}
      disabled={!isActive}
      className={`
        ${ultraCompact && isTray ? 'mobile-ultra-compact-tray-piece' : ''}
        ${baseClasses}
        flex flex-col items-center transition-all duration-300
        ${isSelected ? 'scale-[1.02] bg-yellow-400/20 ring-4 ring-yellow-400 shadow-lg' : `${compact ? 'hover:bg-white/10 hover:shadow-md' : 'hover:scale-[1.01] hover:bg-white/10 hover:shadow-md'}`}
        ${!isActive ? 'cursor-not-allowed opacity-50 grayscale-[0.5]' : 'cursor-pointer'}
      `}
    >
      <div className={pieceScaleClasses}>
        <ChessPiece
          type={type}
          player={player}
          direction={defaultPawnDirection}
          iconClassName={pieceIconClassName}
        />
      </div>
      <p className={`${labelClasses} text-center font-bold uppercase text-gray-300 drop-shadow-sm`}>
        {type}
      </p>
    </button>
  );
}

export default App;
