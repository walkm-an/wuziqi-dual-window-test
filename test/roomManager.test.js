import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  rooms,
  createRoom,
  getRoom,
  deleteRoom,
  findPlayer,
  joinRoom,
  leaveRoom,
} from '../src/roomManager.js';

function createMockSocket(id) {
  const ws = { id, readyState: 1, sent: [], send: (data) => ws.sent.push(JSON.parse(data)) };
  return ws;
}

describe('roomManager.js', () => {
  beforeEach(() => {
    rooms.clear();
  });

  describe('createRoom', () => {
    it('creates a waiting room with an empty board', () => {
      const room = createRoom('r1');
      assert.equal(room.roomId, 'r1');
      assert.equal(room.status, 'waiting');
      assert.equal(room.players.length, 2);
      assert.ok(room.players.every((p) => p === null));
      assert.equal(room.currentTurn, 1);
      assert.equal(room.moveCount, 0);
      assert.equal(rooms.get('r1'), room);
    });
  });

  describe('getRoom / deleteRoom', () => {
    it('retrieves and deletes rooms', () => {
      createRoom('r1');
      assert.ok(getRoom('r1'));
      deleteRoom('r1');
      assert.equal(getRoom('r1'), undefined);
    });
  });

  describe('findPlayer', () => {
    it('finds a player by websocket', () => {
      const ws = createMockSocket('a');
      const room = createRoom('r1');
      room.players[0] = { ws, username: 'alice', color: 1 };
      assert.equal(findPlayer(room, ws).username, 'alice');
      assert.equal(findPlayer(room, createMockSocket('b')), null);
    });
  });

  describe('joinRoom', () => {
    it('creates a new room on first join and assigns black', () => {
      const ws = createMockSocket('a');
      const result = joinRoom(ws, 'r1', 'alice');
      assert.ok(result.isNewRoom);
      assert.equal(result.player.color, 1);
      assert.equal(result.room.status, 'waiting');
    });

    it('assigns white to the second joiner and starts the game', () => {
      const ws1 = createMockSocket('a');
      const ws2 = createMockSocket('b');
      joinRoom(ws1, 'r1', 'alice');
      const result = joinRoom(ws2, 'r1', 'bob');
      assert.equal(result.player.color, 2);
      assert.equal(result.room.status, 'playing');
      assert.equal(result.room.currentTurn, 1);
    });

    it('rejects a third player', () => {
      const ws1 = createMockSocket('a');
      const ws2 = createMockSocket('b');
      const ws3 = createMockSocket('c');
      joinRoom(ws1, 'r1', 'alice');
      joinRoom(ws2, 'r1', 'bob');
      const result = joinRoom(ws3, 'r1', 'carol');
      assert.ok(result.roomFull);
      assert.equal(result.player, null);
    });

    it('returns alreadyInRoom for the same socket', () => {
      const ws = createMockSocket('a');
      joinRoom(ws, 'r1', 'alice');
      const result = joinRoom(ws, 'r1', 'alice');
      assert.ok(result.alreadyInRoom);
      assert.equal(result.player.color, 1);
    });
  });

  describe('leaveRoom', () => {
    it('deletes the room when the last player leaves', () => {
      const ws = createMockSocket('a');
      joinRoom(ws, 'r1', 'alice');
      const room = leaveRoom(ws, 'r1');
      assert.equal(room, null);
      assert.equal(getRoom('r1'), undefined);
    });

    it('during playing, awards the remaining player a win', () => {
      const ws1 = createMockSocket('a');
      const ws2 = createMockSocket('b');
      joinRoom(ws1, 'r1', 'alice');
      joinRoom(ws2, 'r1', 'bob');
      const room = leaveRoom(ws2, 'r1');
      assert.equal(room.status, 'blackWin');
      assert.equal(room.players[1], null);
    });

    it('keeps terminal state intact when a player leaves after the game ended', () => {
      const ws1 = createMockSocket('a');
      const ws2 = createMockSocket('b');
      joinRoom(ws1, 'r1', 'alice');
      joinRoom(ws2, 'r1', 'bob');
      const room = getRoom('r1');
      room.status = 'blackWin';
      leaveRoom(ws2, 'r1');
      assert.equal(room.status, 'blackWin');
      assert.equal(room.players[1], null);
    });
  });
});
