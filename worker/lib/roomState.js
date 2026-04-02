import { applyMoveToGameState, createInitialGameState } from '../../shared/gameRules.js';

export const ROOM_STORAGE_KEY = 'room';
export const RECONNECT_WINDOW_MS = 60_000;
export const VALID_COLOR_CHOICES = new Set(['white', 'black', 'random']);
export const VALID_SEATS = new Set(['white', 'black']);

export function createParticipant({ name, sessionHash, assignedColor = null }) {
  return {
    name,
    sessionHash,
    assignedColor,
    connected: false,
    reconnectDeadline: null,
  };
}

export function isRoomInitialized(room) {
  return Boolean(room?.meta?.code);
}

export function cloneRoom(room) {
  return structuredClone(room);
}

export function getParticipantEntries(room) {
  return [
    ['host', room.participants.host],
    ['guest', room.participants.guest],
  ].filter(([, participant]) => participant);
}

export function findParticipantByHash(room, sessionHash) {
  return getParticipantEntries(room).find(([, participant]) => participant.sessionHash === sessionHash) || null;
}

export function findParticipantByColor(room, color) {
  return getParticipantEntries(room).find(([, participant]) => participant.assignedColor === color) || null;
}

export function buildPublicParticipant(role, participant) {
  if (!participant) return null;

  return {
    name: participant.name,
    color: participant.assignedColor,
    connected: participant.connected,
    reconnectDeadline: participant.reconnectDeadline,
    isHost: role === 'host',
  };
}

export function updateReconnectSummary(room) {
  const pending = getParticipantEntries(room)
    .filter(([, participant]) => !participant.connected && participant.reconnectDeadline)
    .sort((a, b) => a[1].reconnectDeadline - b[1].reconnectDeadline);

  if (!pending.length) {
    room.reconnect = {
      active: false,
      player: null,
      expiresAt: null,
    };
    return;
  }

  room.reconnect = {
    active: true,
    player: pending[0][1].assignedColor,
    expiresAt: pending[0][1].reconnectDeadline,
  };
}

export function createRoomState(code, playerName, colorChoice, sessionHash) {
  const hostColor = colorChoice === 'random' ? null : colorChoice;
  const now = Date.now();

  return {
    meta: {
      code,
      phase: 'waiting',
      createdAt: now,
      updatedAt: now,
      statusMessage: 'Waiting for an opponent to join.',
      closedReason: null,
    },
    settings: {
      hostColorChoice: colorChoice,
    },
    participants: {
      host: createParticipant({
        name: playerName,
        sessionHash,
        assignedColor: hostColor,
      }),
      guest: null,
    },
    game: createInitialGameState(),
    rematch: {
      whiteReady: false,
      blackReady: false,
    },
    reconnect: {
      active: false,
      player: null,
      expiresAt: null,
    },
  };
}

export function assignSeatColors(room) {
  const host = room.participants.host;
  const guest = room.participants.guest;

  if (!host || !guest) {
    return;
  }

  if (room.settings.hostColorChoice === 'random') {
    const hostColor = Math.random() > 0.5 ? 'white' : 'black';
    host.assignedColor = hostColor;
    guest.assignedColor = hostColor === 'white' ? 'black' : 'white';
    return;
  }

  host.assignedColor = room.settings.hostColorChoice;
  guest.assignedColor = host.assignedColor === 'white' ? 'black' : 'white';
}

export function joinRoom(room, { playerName, sessionHash }) {
  room.participants.guest = createParticipant({
    name: playerName,
    sessionHash,
  });
  assignSeatColors(room);
  room.meta.phase = 'active';
  room.meta.statusMessage = `${findParticipantByColor(room, 'white')?.[1]?.name || 'White'} plays White and moves first.`;
  room.meta.closedReason = null;

  return room;
}

export function resetRoomForRematch(room) {
  const host = room.participants.host;
  const guest = room.participants.guest;

  if (!host || !guest || !host.assignedColor || !guest.assignedColor) {
    return;
  }

  const nextHostColor = host.assignedColor === 'white' ? 'black' : 'white';
  host.assignedColor = nextHostColor;
  guest.assignedColor = nextHostColor === 'white' ? 'black' : 'white';
  room.game = createInitialGameState();
  room.meta.phase = 'active';
  room.meta.closedReason = null;
  room.meta.statusMessage = `${findParticipantByColor(room, 'white')?.[1]?.name || 'White'} has White for the rematch.`;
  room.rematch = {
    whiteReady: false,
    blackReady: false,
  };
}

export function buildSnapshot(room, sessionHash) {
  const youEntry = sessionHash ? findParticipantByHash(room, sessionHash) : null;
  const whiteEntry = findParticipantByColor(room, 'white');
  const blackEntry = findParticipantByColor(room, 'black');

  return {
    type: 'snapshot',
    lobbyCode: room.meta.code,
    phase: room.meta.phase,
    hostColorChoice: room.settings.hostColorChoice,
    yourRole: youEntry?.[0] || null,
    yourSeat: youEntry?.[1]?.assignedColor || null,
    you: youEntry ? buildPublicParticipant(youEntry[0], youEntry[1]) : null,
    players: {
      host: buildPublicParticipant('host', room.participants.host),
      guest: buildPublicParticipant('guest', room.participants.guest),
      white: whiteEntry ? buildPublicParticipant(whiteEntry[0], whiteEntry[1]) : null,
      black: blackEntry ? buildPublicParticipant(blackEntry[0], blackEntry[1]) : null,
    },
    game: room.game,
    rematch: {
      ...room.rematch,
      readyCount: Number(room.rematch.whiteReady) + Number(room.rematch.blackReady),
    },
    reconnect: room.reconnect,
    statusMessage: room.meta.statusMessage,
    closedReason: room.meta.closedReason,
  };
}

export function buildPresencePayload(room) {
  const snapshot = buildSnapshot(room);

  return {
    type: 'presence',
    lobbyCode: room.meta.code,
    players: {
      white: snapshot.players.white,
      black: snapshot.players.black,
    },
    reconnect: room.reconnect,
  };
}

export function buildRematchStatusPayload(room) {
  const snapshot = buildSnapshot(room);

  return {
    type: 'rematch_status',
    rematch: room.rematch,
    players: {
      white: snapshot.players.white,
      black: snapshot.players.black,
    },
  };
}

export function markParticipantConnected(room, sessionHash) {
  const participant = findParticipantByHash(room, sessionHash)?.[1];

  if (!participant) {
    return null;
  }

  participant.connected = true;
  participant.reconnectDeadline = null;
  room.meta.closedReason = null;
  return participant;
}

export function applyPlayerMove(room, participant, move) {
  const result = applyMoveToGameState(room.game, {
    player: participant.assignedColor,
    type: move?.type,
    from: move?.from ?? null,
    to: move?.to,
  });

  if (!result.ok) {
    return result;
  }

  room.game = result.state;
  room.rematch = {
    whiteReady: false,
    blackReady: false,
  };
  room.meta.closedReason = null;

  if (room.game.winner) {
    room.meta.phase = 'finished';
    room.meta.statusMessage = `${participant.name} wins the game.`;
  } else {
    room.meta.phase = 'active';
    room.meta.statusMessage = `${findParticipantByColor(room, room.game.turn)?.[1]?.name || room.game.turn} to move.`;
  }

  return {
    ok: true,
    state: room.game,
  };
}

export function requestRematch(room, participant) {
  room.rematch[participant.assignedColor === 'white' ? 'whiteReady' : 'blackReady'] = true;
  room.meta.statusMessage = `${participant.name} is ready for a rematch.`;

  if (room.rematch.whiteReady && room.rematch.blackReady) {
    resetRoomForRematch(room);
    return { didReset: true };
  }

  return { didReset: false };
}

export function markParticipantDisconnected(room, sessionHash, now = Date.now()) {
  const participant = findParticipantByHash(room, sessionHash)?.[1];

  if (!participant) {
    return null;
  }

  participant.connected = false;
  participant.reconnectDeadline = now + RECONNECT_WINDOW_MS;
  room.meta.statusMessage = `${participant.name} disconnected. Waiting 60 seconds for them to reconnect.`;
  return participant;
}

export function expireReconnectWindow(room, now = Date.now()) {
  let hasExpiredParticipant = false;

  for (const [, participant] of getParticipantEntries(room)) {
    if (!participant.connected && participant.reconnectDeadline && participant.reconnectDeadline <= now) {
      participant.reconnectDeadline = null;
      hasExpiredParticipant = true;
    }
  }

  if (!hasExpiredParticipant) {
    return { hasExpiredParticipant: false, shouldDeleteRoom: false };
  }

  const connectedParticipants = getParticipantEntries(room).filter(([, participant]) => participant.connected);

  if (!connectedParticipants.length) {
    return { hasExpiredParticipant: true, shouldDeleteRoom: true };
  }

  const disconnectedParticipant = getParticipantEntries(room).find(([, participant]) => !participant.connected);

  room.meta.phase = 'finished';
  room.meta.closedReason = 'disconnect_timeout';
  room.meta.statusMessage = disconnectedParticipant
    ? `${disconnectedParticipant[1].name} did not reconnect in time.`
    : 'The lobby expired because no players remained connected.';
  room.rematch = {
    whiteReady: false,
    blackReady: false,
  };

  return { hasExpiredParticipant: true, shouldDeleteRoom: false };
}
