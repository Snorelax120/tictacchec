import { errorResponse, jsonResponse, parseJson } from './lib/http.js';
import { LobbyRoom } from './lobbyRoom.js';
import { buildWebSocketUrl, createLobbyCode, normalizeName } from './lib/session.js';
import { VALID_COLOR_CHOICES } from './lib/roomState.js';

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

export { LobbyRoom };
