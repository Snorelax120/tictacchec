import { BOT_DIFFICULTY_LABELS } from './appContent.js';

export function getLocalPlayerLabel(color) {
  return color === 'white' ? 'White' : 'Black';
}

export function getResolvedBotSeats(seatChoice) {
  const humanSeat = seatChoice === 'random'
    ? Math.random() > 0.5 ? 'white' : 'black'
    : seatChoice;

  return {
    humanSeat,
    botSeat: humanSeat === 'white' ? 'black' : 'white',
  };
}

export function getBotPlayerLabel(botMatch, color) {
  if (!botMatch) {
    return getLocalPlayerLabel(color);
  }

  return color === botMatch.humanSeat
    ? 'You'
    : `${BOT_DIFFICULTY_LABELS[botMatch.difficulty]} Bot`;
}

export function getBotStatusMessage(botGame, botMatch) {
  if (!botMatch) {
    return 'Set up your bot match.';
  }

  if (botGame.winner) {
    return `${getBotPlayerLabel(botMatch, botGame.winner)} wins the game.`;
  }

  return `${getBotPlayerLabel(botMatch, botGame.turn)} to move.`;
}

export function getOnlinePlayerLabel(snapshot, color) {
  return snapshot?.players?.[color]?.name || (color === 'white' ? 'White' : 'Black');
}

export function getOnlineStatusMessage(snapshot) {
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

export function getOnlineConnectionStatusInfo(participant) {
  if (!participant) {
    return {
      label: 'Waiting',
      toneClassName: 'text-slate-400',
    };
  }

  if (participant.connected) {
    return {
      label: 'Connected',
      toneClassName: 'text-emerald-300',
    };
  }

  if (participant.reconnectDeadline) {
    return {
      label: 'Reconnecting',
      toneClassName: 'text-amber-300',
    };
  }

  return {
    label: 'Offline',
    toneClassName: 'text-rose-300',
  };
}

export function buildMoveFromSelection(board, selectedPiece, index) {
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

export function buildWaitingSummary(snapshot) {
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
