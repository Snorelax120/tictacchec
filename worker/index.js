import {
  applyMoveToGameState,
  createInitialGameState,
} from '../shared/gameRules.js';

const ROOM_STORAGE_KEY = 'room';
const RECONNECT_WINDOW_MS = 60_000;
const VALID_COLOR_CHOICES = new Set(['white', 'black', 'random']);
const VALID_SEATS = new Set(['white', 'black']);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function errorResponse(message, status = 400, extra = {}) {
  return jsonResponse({ error: message, ...extra }, status);
}

async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function normalizeName(name) {
  return typeof name === 'string' ? name.trim() : '';
}

function createLobbyCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));

  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

async function hashToken(token) {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createSessionToken() {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
}

function buildWebSocketUrl(request, code, sessionToken) {
  const url = new URL(request.url);
  url.pathname = `/ws/${code}`;
  url.search = new URLSearchParams({ session: sessionToken }).toString();
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  return url.toString();
}

function buildLobbyStub(env, code) {
  const id = env.LOBBY_ROOM.idFromName(code);
  return env.LOBBY_ROOM.get(id);
}

async function createLobby(request, env) {
  const body = await parseJson(request);
  const playerName = normalizeName(body?.playerName);
  const colorChoice = body?.colorChoice;

  if (!playerName) {
    return errorResponse('Player name is required.');
  }

  if (!VALID_COLOR_CHOICES.has(colorChoice)) {
    return errorResponse('Color choice must be white, black, or random.');
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = createLobbyCode();
    const stub = buildLobbyStub(env, code);
    const response = await stub.fetch('https://room.internal/internal/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, playerName, colorChoice }),
    });

    if (response.status === 409) {
      continue;
    }

    const payload = await response.json();

    if (!response.ok) {
      return jsonResponse(payload, response.status);
    }

    return jsonResponse({
      ...payload,
      wsUrl: buildWebSocketUrl(request, code, payload.sessionToken),
    }, response.status);
  }

  return errorResponse('Could not allocate a unique lobby code. Please try again.', 503);
}

async function joinLobby(request, env, code) {
  const body = await parseJson(request);
  const playerName = normalizeName(body?.playerName);

  if (!playerName) {
    return errorResponse('Player name is required.');
  }

  const stub = buildLobbyStub(env, code);
  const response = await stub.fetch('https://room.internal/internal/join', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ playerName }),
  });
  const payload = await response.json();

  if (!response.ok) {
    return jsonResponse(payload, response.status);
  }

  return jsonResponse({
    ...payload,
    wsUrl: buildWebSocketUrl(request, code, payload.sessionToken),
  }, response.status);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'POST' && path === '/api/lobbies') {
      return createLobby(request, env);
    }

    const joinMatch = path.match(/^\/api\/lobbies\/([A-Z0-9]{6})\/join$/);
    if (request.method === 'POST' && joinMatch) {
      return joinLobby(request, env, joinMatch[1]);
    }

    const wsMatch = path.match(/^\/ws\/([A-Z0-9]{6})$/);
    if (request.headers.get('upgrade') === 'websocket' && wsMatch) {
      const stub = buildLobbyStub(env, wsMatch[1]);
      return stub.fetch(request);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return errorResponse('Asset binding not configured.', 500);
  },
};

function createParticipant({ name, sessionHash, assignedColor = null }) {
  return {
    name,
    sessionHash,
    assignedColor,
    connected: false,
    reconnectDeadline: null,
  };
}

function isRoomInitialized(room) {
  return !!room?.meta?.code;
}

function cloneRoom(room) {
  return structuredClone(room);
}

function getParticipantEntries(room) {
  return [
    ['host', room.participants.host],
    ['guest', room.participants.guest],
  ].filter(([, participant]) => participant);
}

function findParticipantByHash(room, sessionHash) {
  return getParticipantEntries(room).find(([, participant]) => participant.sessionHash === sessionHash) || null;
}

function findParticipantByColor(room, color) {
  return getParticipantEntries(room).find(([, participant]) => participant.assignedColor === color) || null;
}

function buildPublicParticipant(role, participant) {
  if (!participant) return null;

  return {
    name: participant.name,
    color: participant.assignedColor,
    connected: participant.connected,
    reconnectDeadline: participant.reconnectDeadline,
    isHost: role === 'host',
  };
}

function updateReconnectSummary(room) {
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

function createRoomState(code, playerName, colorChoice, sessionHash) {
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

function assignSeatColors(room) {
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

function resetRoomForRematch(room) {
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

function buildSnapshot(room, sessionHash) {
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

export class LobbyRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = new Map();

    for (const socket of this.state.getWebSockets()) {
      const attachment = socket.deserializeAttachment();

      if (attachment?.sessionHash) {
        this.addConnection(socket, attachment.sessionHash);
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/internal/create') {
      return this.handleCreate(request);
    }

    if (request.method === 'POST' && url.pathname === '/internal/join') {
      return this.handleJoin(request);
    }

    if (request.headers.get('upgrade') === 'websocket' && url.pathname.startsWith('/ws/')) {
      return this.handleWebSocket(request);
    }

    return errorResponse('Not found.', 404);
  }

  addConnection(socket, sessionHash) {
    if (!this.connections.has(sessionHash)) {
      this.connections.set(sessionHash, new Set());
    }

    this.connections.get(sessionHash).add(socket);
  }

  removeConnection(socket) {
    const attachment = socket.deserializeAttachment();
    const sessionHash = attachment?.sessionHash;

    if (!sessionHash || !this.connections.has(sessionHash)) {
      return;
    }

    const sockets = this.connections.get(sessionHash);
    sockets.delete(socket);

    if (!sockets.size) {
      this.connections.delete(sessionHash);
    }
  }

  closeExistingConnections(sessionHash, exceptSocket = null) {
    const sockets = this.connections.get(sessionHash);

    if (!sockets) {
      return;
    }

    for (const socket of sockets) {
      if (socket !== exceptSocket) {
        socket.close(4000, 'Reconnected from another tab');
      }
    }
  }

  async getRoom() {
    return await this.state.storage.get(ROOM_STORAGE_KEY);
  }

  async saveRoom(room) {
    room.meta.updatedAt = Date.now();
    updateReconnectSummary(room);
    await this.state.storage.put(ROOM_STORAGE_KEY, room);

    const deadlines = getParticipantEntries(room)
      .map(([, participant]) => participant.reconnectDeadline)
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (deadlines.length) {
      await this.state.storage.setAlarm(deadlines[0]);
    } else {
      await this.state.storage.deleteAlarm();
    }
  }

  async handleCreate(request) {
    const room = await this.getRoom();
    if (isRoomInitialized(room)) {
      return errorResponse('Lobby code already exists.', 409);
    }

    const body = await parseJson(request);
    const playerName = normalizeName(body?.playerName);
    const colorChoice = body?.colorChoice;
    const code = body?.code;

    if (!playerName) {
      return errorResponse('Player name is required.');
    }

    if (!VALID_COLOR_CHOICES.has(colorChoice) || typeof code !== 'string') {
      return errorResponse('Invalid lobby configuration.');
    }

    const sessionToken = createSessionToken();
    const sessionHash = await hashToken(sessionToken);
    const nextRoom = createRoomState(code, playerName, colorChoice, sessionHash);

    await this.saveRoom(nextRoom);

    return jsonResponse({
      code,
      sessionToken,
      rolePendingOrAssigned: nextRoom.participants.host.assignedColor,
      snapshot: buildSnapshot(nextRoom, sessionHash),
    }, 201);
  }

  async handleJoin(request) {
    const room = await this.getRoom();

    if (!isRoomInitialized(room)) {
      return errorResponse('Lobby not found.', 404);
    }

    const nextRoom = cloneRoom(room);
    const body = await parseJson(request);
    const playerName = normalizeName(body?.playerName);

    if (!playerName) {
      return errorResponse('Player name is required.');
    }

    const existingNames = getParticipantEntries(nextRoom).map(([, participant]) => participant.name.toLowerCase());
    if (existingNames.includes(playerName.toLowerCase())) {
      return errorResponse('Choose a different name. That name is already in this lobby.', 409);
    }

    if (nextRoom.participants.guest) {
      return errorResponse('Lobby is full.', 409);
    }

    const sessionToken = createSessionToken();
    const sessionHash = await hashToken(sessionToken);
    nextRoom.participants.guest = createParticipant({
      name: playerName,
      sessionHash,
    });
    assignSeatColors(nextRoom);
    nextRoom.meta.phase = 'active';
    nextRoom.meta.statusMessage = `${findParticipantByColor(nextRoom, 'white')?.[1]?.name || 'White'} plays White and moves first.`;
    nextRoom.meta.closedReason = null;

    await this.saveRoom(nextRoom);

    return jsonResponse({
      code: nextRoom.meta.code,
      sessionToken,
      assignedColor: nextRoom.participants.guest.assignedColor,
      snapshot: buildSnapshot(nextRoom, sessionHash),
    });
  }

  async handleWebSocket(request) {
    const room = await this.getRoom();

    if (!isRoomInitialized(room)) {
      return errorResponse('Lobby not found.', 404);
    }

    const url = new URL(request.url);
    const sessionToken = url.searchParams.get('session');

    if (!sessionToken) {
      return errorResponse('Session token is required.', 401);
    }

    const sessionHash = await hashToken(sessionToken);
    const participantEntry = findParticipantByHash(room, sessionHash);

    if (!participantEntry) {
      return errorResponse('Session not recognized for this lobby.', 401);
    }

    const [clientSocket, serverSocket] = Object.values(new WebSocketPair());
    serverSocket.serializeAttachment({ sessionHash });
    this.state.acceptWebSocket(serverSocket);
    this.closeExistingConnections(sessionHash, serverSocket);
    this.addConnection(serverSocket, sessionHash);

    const nextRoom = cloneRoom(room);
    const participant = findParticipantByHash(nextRoom, sessionHash)?.[1];
    participant.connected = true;
    participant.reconnectDeadline = null;
    nextRoom.meta.closedReason = null;

    await this.saveRoom(nextRoom);

    this.sendJson(serverSocket, buildSnapshot(nextRoom, sessionHash));
    await this.broadcastPresence(nextRoom);
    await this.broadcastSnapshots(nextRoom);

    return new Response(null, {
      status: 101,
      webSocket: clientSocket,
    });
  }

  sendJson(socket, payload) {
    try {
      socket.send(JSON.stringify(payload));
    } catch {
      this.removeConnection(socket);
    }
  }

  async broadcastSnapshots(room) {
    for (const [sessionHash, sockets] of this.connections.entries()) {
      const snapshot = buildSnapshot(room, sessionHash);

      for (const socket of sockets) {
        this.sendJson(socket, snapshot);
      }
    }
  }

  async broadcastPresence(room) {
    const payload = {
      type: 'presence',
      lobbyCode: room.meta.code,
      players: {
        white: buildSnapshot(room).players.white,
        black: buildSnapshot(room).players.black,
      },
      reconnect: room.reconnect,
    };

    for (const sockets of this.connections.values()) {
      for (const socket of sockets) {
        this.sendJson(socket, payload);
      }
    }
  }

  async broadcastRematchStatus(room) {
    const payload = {
      type: 'rematch_status',
      rematch: room.rematch,
      players: {
        white: buildSnapshot(room).players.white,
        black: buildSnapshot(room).players.black,
      },
    };

    for (const sockets of this.connections.values()) {
      for (const socket of sockets) {
        this.sendJson(socket, payload);
      }
    }
  }

  async sendSystemNotice(message) {
    const payload = {
      type: 'system_notice',
      message,
    };

    for (const sockets of this.connections.values()) {
      for (const socket of sockets) {
        this.sendJson(socket, payload);
      }
    }
  }

  async webSocketMessage(socket, message) {
    const attachment = socket.deserializeAttachment();
    const sessionHash = attachment?.sessionHash;
    const room = await this.getRoom();

    if (!sessionHash || !isRoomInitialized(room)) {
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message));
    } catch {
      this.sendJson(socket, { type: 'error', message: 'Invalid message payload.' });
      return;
    }

    const roomDraft = cloneRoom(room);
    const participantEntry = findParticipantByHash(roomDraft, sessionHash);
    if (!participantEntry) {
      this.sendJson(socket, { type: 'error', message: 'Session is no longer valid for this lobby.' });
      return;
    }

    const [, participant] = participantEntry;

    if (parsed.type === 'resume') {
      this.sendJson(socket, buildSnapshot(roomDraft, sessionHash));
      return;
    }

    if (parsed.type === 'leave') {
      socket.close(1000, 'Client left the lobby');
      return;
    }

    if (parsed.type === 'move') {
      if (!VALID_SEATS.has(participant.assignedColor)) {
        this.sendJson(socket, { type: 'error', message: 'Your seat has not been assigned yet.' });
        return;
      }

      if (roomDraft.meta.phase !== 'active') {
        this.sendJson(socket, { type: 'error', message: 'This match is not active.' });
        return;
      }

      const result = applyMoveToGameState(roomDraft.game, {
        player: participant.assignedColor,
        type: parsed.move?.type,
        from: parsed.move?.from ?? null,
        to: parsed.move?.to,
      });

      if (!result.ok) {
        this.sendJson(socket, { type: 'error', message: result.error });
        return;
      }

      roomDraft.game = result.state;
      roomDraft.rematch = {
        whiteReady: false,
        blackReady: false,
      };
      roomDraft.meta.closedReason = null;

      if (roomDraft.game.winner) {
        roomDraft.meta.phase = 'finished';
        roomDraft.meta.statusMessage = `${participant.name} wins the game.`;
      } else {
        roomDraft.meta.phase = 'active';
        roomDraft.meta.statusMessage = `${findParticipantByColor(roomDraft, roomDraft.game.turn)?.[1]?.name || roomDraft.game.turn} to move.`;
      }

      await this.saveRoom(roomDraft);
      await this.broadcastSnapshots(roomDraft);
      return;
    }

    if (parsed.type === 'rematch_request') {
      if (roomDraft.meta.phase !== 'finished') {
        this.sendJson(socket, { type: 'error', message: 'Rematches are only available after the game finishes.' });
        return;
      }

      if (!VALID_SEATS.has(participant.assignedColor)) {
        this.sendJson(socket, { type: 'error', message: 'Your seat has not been assigned yet.' });
        return;
      }

      roomDraft.rematch[participant.assignedColor === 'white' ? 'whiteReady' : 'blackReady'] = true;
      roomDraft.meta.statusMessage = `${participant.name} is ready for a rematch.`;

      if (roomDraft.rematch.whiteReady && roomDraft.rematch.blackReady) {
        resetRoomForRematch(roomDraft);
        await this.saveRoom(roomDraft);
        await this.broadcastSnapshots(roomDraft);
      } else {
        await this.saveRoom(roomDraft);
        await this.broadcastRematchStatus(roomDraft);
        await this.broadcastSnapshots(roomDraft);
      }

      return;
    }

    this.sendJson(socket, { type: 'error', message: 'Unknown message type.' });
  }

  async webSocketClose(socket) {
    this.removeConnection(socket);

    const attachment = socket.deserializeAttachment();
    const sessionHash = attachment?.sessionHash;

    if (!sessionHash) {
      return;
    }

    const sockets = this.connections.get(sessionHash);
    if (sockets?.size) {
      return;
    }

    const room = await this.getRoom();
    if (!isRoomInitialized(room)) {
      return;
    }

    const roomDraft = cloneRoom(room);
    const participantEntry = findParticipantByHash(roomDraft, sessionHash);
    if (!participantEntry) {
      return;
    }

    const [, participant] = participantEntry;
    participant.connected = false;
    participant.reconnectDeadline = Date.now() + RECONNECT_WINDOW_MS;
    roomDraft.meta.statusMessage = `${participant.name} disconnected. Waiting 60 seconds for them to reconnect.`;

    await this.saveRoom(roomDraft);
    await this.broadcastPresence(roomDraft);
    await this.broadcastSnapshots(roomDraft);
  }

  async alarm() {
    const room = await this.getRoom();

    if (!isRoomInitialized(room)) {
      return;
    }

    const roomDraft = cloneRoom(room);
    const now = Date.now();
    let hasExpiredParticipant = false;

    for (const [, participant] of getParticipantEntries(roomDraft)) {
      if (!participant.connected && participant.reconnectDeadline && participant.reconnectDeadline <= now) {
        participant.reconnectDeadline = null;
        hasExpiredParticipant = true;
      }
    }

    if (!hasExpiredParticipant) {
      await this.saveRoom(roomDraft);
      return;
    }

    const connectedParticipants = getParticipantEntries(roomDraft).filter(([, participant]) => participant.connected);

    if (!connectedParticipants.length) {
      await this.state.storage.deleteAll();
      return;
    }

    const disconnectedParticipant = getParticipantEntries(roomDraft).find(([, participant]) => !participant.connected);

    roomDraft.meta.phase = 'finished';
    roomDraft.meta.closedReason = 'disconnect_timeout';
    roomDraft.meta.statusMessage = disconnectedParticipant
      ? `${disconnectedParticipant[1].name} did not reconnect in time.`
      : 'The lobby expired because no players remained connected.';
    roomDraft.rematch = {
      whiteReady: false,
      blackReady: false,
    };

    await this.saveRoom(roomDraft);
    await this.sendSystemNotice(roomDraft.meta.statusMessage);
    await this.broadcastPresence(roomDraft);
    await this.broadcastSnapshots(roomDraft);
  }
}
