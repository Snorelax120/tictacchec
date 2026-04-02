import { errorResponse, parseJson, jsonResponse } from './lib/http.js';
import { createSessionToken, hashToken, normalizeName } from './lib/session.js';
import {
  ROOM_STORAGE_KEY,
  VALID_COLOR_CHOICES,
  VALID_SEATS,
  applyPlayerMove,
  buildPresencePayload,
  buildRematchStatusPayload,
  buildSnapshot,
  cloneRoom,
  createRoomState,
  expireReconnectWindow,
  findParticipantByHash,
  getParticipantEntries,
  isRoomInitialized,
  joinRoom,
  markParticipantConnected,
  markParticipantDisconnected,
  requestRematch,
  updateReconnectSummary,
} from './lib/roomState.js';

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
    return this.state.storage.get(ROOM_STORAGE_KEY);
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
    joinRoom(nextRoom, { playerName, sessionHash });

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
    markParticipantConnected(nextRoom, sessionHash);

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
    const payload = buildPresencePayload(room);

    for (const sockets of this.connections.values()) {
      for (const socket of sockets) {
        this.sendJson(socket, payload);
      }
    }
  }

  async broadcastRematchStatus(room) {
    const payload = buildRematchStatusPayload(room);

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

      const result = applyPlayerMove(roomDraft, participant, parsed.move);

      if (!result.ok) {
        this.sendJson(socket, { type: 'error', message: result.error });
        return;
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

      const rematchResult = requestRematch(roomDraft, participant);

      await this.saveRoom(roomDraft);
      if (!rematchResult.didReset) {
        await this.broadcastRematchStatus(roomDraft);
      }
      await this.broadcastSnapshots(roomDraft);
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
    const disconnectedParticipant = markParticipantDisconnected(roomDraft, sessionHash);
    if (!disconnectedParticipant) {
      return;
    }

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
    const { hasExpiredParticipant, shouldDeleteRoom } = expireReconnectWindow(roomDraft);

    if (!hasExpiredParticipant) {
      await this.saveRoom(roomDraft);
      return;
    }

    if (shouldDeleteRoom) {
      await this.state.storage.deleteAll();
      return;
    }

    await this.saveRoom(roomDraft);
    await this.sendSystemNotice(roomDraft.meta.statusMessage);
    await this.broadcastPresence(roomDraft);
    await this.broadcastSnapshots(roomDraft);
  }
}
