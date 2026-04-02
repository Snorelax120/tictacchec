import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PLAYER_NAME_LENGTH,
  MAX_WEBSOCKET_MESSAGE_BYTES,
  isTrustedOrigin,
  parseClientMessage,
  validatePlayerName,
} from './lib/security.js';

test('validatePlayerName trims and normalizes safe names', () => {
  const result = validatePlayerName('  Alice   Example  ');

  assert.equal(result.ok, true);
  assert.equal(result.value, 'Alice Example');
});

test('validatePlayerName rejects long or control-character names', () => {
  const tooLong = validatePlayerName('A'.repeat(MAX_PLAYER_NAME_LENGTH + 1));
  const controlChars = validatePlayerName('Bad\nName');

  assert.equal(tooLong.ok, false);
  assert.match(tooLong.error, /characters or fewer/);
  assert.equal(controlChars.ok, false);
});

test('isTrustedOrigin allows same-origin and no-origin requests, rejects foreign origins', () => {
  const sameOriginRequest = new Request('https://example.com/api/lobbies', {
    method: 'POST',
    headers: { origin: 'https://example.com' },
  });
  const foreignOriginRequest = new Request('https://example.com/api/lobbies', {
    method: 'POST',
    headers: { origin: 'https://evil.example' },
  });
  const noOriginRequest = new Request('https://example.com/api/lobbies', {
    method: 'POST',
  });

  assert.equal(isTrustedOrigin(sameOriginRequest), true);
  assert.equal(isTrustedOrigin(foreignOriginRequest), false);
  assert.equal(isTrustedOrigin(noOriginRequest), true);
});

test('parseClientMessage rejects oversized or malformed websocket payloads', () => {
  const oversize = parseClientMessage(JSON.stringify({
    type: 'resume',
    pad: 'x'.repeat(MAX_WEBSOCKET_MESSAGE_BYTES),
  }));
  const malformed = parseClientMessage('not json');
  const invalidMove = parseClientMessage(JSON.stringify({
    type: 'move',
    move: { type: 'rook', from: null, to: 99 },
  }));

  assert.equal(oversize.ok, false);
  assert.match(oversize.error, /too large/);
  assert.equal(malformed.ok, false);
  assert.equal(invalidMove.ok, false);
});

test('parseClientMessage accepts supported message shapes', () => {
  const resume = parseClientMessage(JSON.stringify({ type: 'resume' }));
  const move = parseClientMessage(JSON.stringify({
    type: 'move',
    move: { type: 'rook', from: null, to: 5 },
  }));

  assert.equal(resume.ok, true);
  assert.equal(move.ok, true);
  assert.equal(move.payload.move.to, 5);
});
