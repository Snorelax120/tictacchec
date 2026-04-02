import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECONNECT_WINDOW_MS,
  applyPlayerMove,
  buildSnapshot,
  createRoomState,
  expireReconnectWindow,
  findParticipantByColor,
  findParticipantByHash,
  joinRoom,
  markParticipantConnected,
  markParticipantDisconnected,
  requestRematch,
  updateReconnectSummary,
} from './lib/roomState.js';

test('online room smoke: create, join, and apply a legal move', () => {
  const room = createRoomState('ABC123', 'Host', 'white', 'host-hash');
  joinRoom(room, { playerName: 'Guest', sessionHash: 'guest-hash' });

  const host = findParticipantByHash(room, 'host-hash')[1];
  const guest = findParticipantByHash(room, 'guest-hash')[1];

  assert.equal(room.meta.phase, 'active');
  assert.equal(host.assignedColor, 'white');
  assert.equal(guest.assignedColor, 'black');

  const moveResult = applyPlayerMove(room, host, {
    type: 'rook',
    from: null,
    to: 0,
  });

  assert.equal(moveResult.ok, true);
  assert.equal(room.game.board[0].type, 'rook');
  assert.equal(room.game.board[0].player, 'white');
  assert.equal(room.game.turn, 'black');

  const guestSnapshot = buildSnapshot(room, 'guest-hash');
  assert.equal(guestSnapshot.yourSeat, 'black');
  assert.equal(guestSnapshot.players.white.name, 'Host');
  assert.equal(guestSnapshot.players.black.name, 'Guest');
});

test('online room smoke: disconnect and resume clears reconnect state', () => {
  const room = createRoomState('ABC123', 'Host', 'white', 'host-hash');
  joinRoom(room, { playerName: 'Guest', sessionHash: 'guest-hash' });

  markParticipantConnected(room, 'host-hash');
  markParticipantConnected(room, 'guest-hash');
  updateReconnectSummary(room);

  markParticipantDisconnected(room, 'guest-hash', 1_000);
  updateReconnectSummary(room);
  assert.equal(room.reconnect.active, true);
  assert.equal(room.reconnect.player, 'black');

  markParticipantConnected(room, 'guest-hash');
  updateReconnectSummary(room);

  const guestSnapshot = buildSnapshot(room, 'guest-hash');
  assert.equal(room.reconnect.active, false);
  assert.equal(guestSnapshot.players.black.connected, true);
  assert.equal(guestSnapshot.players.black.reconnectDeadline, null);
});

test('online room smoke: rematch swaps colors and resets the room', () => {
  const room = createRoomState('ABC123', 'Host', 'white', 'host-hash');
  joinRoom(room, { playerName: 'Guest', sessionHash: 'guest-hash' });

  room.meta.phase = 'finished';
  room.game.winner = 'white';

  const host = findParticipantByColor(room, 'white')[1];
  const guest = findParticipantByColor(room, 'black')[1];

  const firstRequest = requestRematch(room, host);
  assert.equal(firstRequest.didReset, false);
  assert.equal(room.rematch.whiteReady, true);

  const secondRequest = requestRematch(room, guest);
  assert.equal(secondRequest.didReset, true);
  assert.equal(room.meta.phase, 'active');
  assert.equal(room.game.winner, null);
  assert.equal(findParticipantByColor(room, 'white')[1].name, 'Guest');
  assert.equal(findParticipantByColor(room, 'black')[1].name, 'Host');
});

test('online room smoke: reconnect timeout closes a partially connected room', () => {
  const room = createRoomState('ABC123', 'Host', 'white', 'host-hash');
  joinRoom(room, { playerName: 'Guest', sessionHash: 'guest-hash' });

  markParticipantConnected(room, 'host-hash');
  markParticipantConnected(room, 'guest-hash');
  markParticipantDisconnected(room, 'guest-hash', 2_000);

  const result = expireReconnectWindow(room, 2_000 + RECONNECT_WINDOW_MS);

  assert.equal(result.hasExpiredParticipant, true);
  assert.equal(result.shouldDeleteRoom, false);
  assert.equal(room.meta.phase, 'finished');
  assert.equal(room.meta.closedReason, 'disconnect_timeout');
  assert.match(room.meta.statusMessage, /did not reconnect in time/);
});
