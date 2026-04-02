const PLAYER_NAME_CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/;
const VALID_MOVE_TYPES = new Set(['rook', 'knight', 'bishop', 'pawn']);

export const MAX_PLAYER_NAME_LENGTH = 24;
export const MAX_WEBSOCKET_MESSAGE_BYTES = 2_048;

export function validatePlayerName(name) {
  if (typeof name !== 'string') {
    return { ok: false, error: 'Player name is required.' };
  }

  if (PLAYER_NAME_CONTROL_CHAR_PATTERN.test(name)) {
    return { ok: false, error: 'Player name contains unsupported characters.' };
  }

  const normalizedName = name.trim().replace(/\s+/g, ' ');

  if (!normalizedName) {
    return { ok: false, error: 'Player name is required.' };
  }

  if (normalizedName.length > MAX_PLAYER_NAME_LENGTH) {
    return { ok: false, error: `Player name must be ${MAX_PLAYER_NAME_LENGTH} characters or fewer.` };
  }

  return {
    ok: true,
    value: normalizedName,
  };
}

export function isTrustedOrigin(request) {
  const origin = request.headers.get('origin');

  if (!origin) {
    return true;
  }

  return origin === new URL(request.url).origin;
}

export function decodeWebSocketMessage(message) {
  if (typeof message === 'string') {
    return message;
  }

  return new TextDecoder().decode(message);
}

export function parseClientMessage(message) {
  const rawMessage = decodeWebSocketMessage(message);
  const messageSize = new TextEncoder().encode(rawMessage).byteLength;

  if (messageSize > MAX_WEBSOCKET_MESSAGE_BYTES) {
    return {
      ok: false,
      error: `Message payload is too large. Limit is ${MAX_WEBSOCKET_MESSAGE_BYTES} bytes.`,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    return { ok: false, error: 'Invalid message payload.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Invalid message payload.' };
  }

  if (!['resume', 'leave', 'move', 'rematch_request'].includes(parsed.type)) {
    return { ok: false, error: 'Unknown message type.' };
  }

  if (parsed.type !== 'move') {
    return { ok: true, payload: parsed };
  }

  const move = parsed.move;

  if (!move || typeof move !== 'object' || Array.isArray(move)) {
    return { ok: false, error: 'Invalid move payload.' };
  }

  if (!VALID_MOVE_TYPES.has(move.type)) {
    return { ok: false, error: 'Invalid move payload.' };
  }

  const hasValidFrom = move.from === null || Number.isInteger(move.from);
  const hasValidTo = Number.isInteger(move.to);

  if (!hasValidFrom || !hasValidTo) {
    return { ok: false, error: 'Invalid move payload.' };
  }

  if (move.from !== null && (move.from < 0 || move.from > 15)) {
    return { ok: false, error: 'Invalid move payload.' };
  }

  if (move.to < 0 || move.to > 15) {
    return { ok: false, error: 'Invalid move payload.' };
  }

  return { ok: true, payload: parsed };
}
