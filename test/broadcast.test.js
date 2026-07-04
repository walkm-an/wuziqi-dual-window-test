import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  send,
  sendSystem,
  broadcast,
  broadcastSystem,
  buildGameState,
  broadcastGameState,
  broadcastMove,
} from '../src/broadcast.js';
import { createBoard } from '../src/game.js';

function createMockSocket() {
  const sent = [];
  return {
    readyState: 1,
    sent,
    send: (data) => sent.push(JSON.parse(data)),
    close: () => {},
  };
}

describe('broadcast.js', () => {
  describe('send', () => {
    it('sends a typed message to an open socket', () => {
      const ws = createMockSocket();
      send(ws, 'move', { x: 1, y: 2, color: 1 });
      assert.deepEqual(ws.sent, [{ type: 'move', payload: { x: 1, y: 2, color: 1 } }]);
    });

    it('does nothing when socket is not open', () => {
      const ws = createMockSocket();
      ws.readyState = 3;
      send(ws, 'move', { x: 1, y: 2, color: 1 });
      assert.equal(ws.sent.length, 0);
    });
  });

  describe('sendSystem', () => {
    it('sends a system message', () => {
      const ws = createMockSocket();
      sendSystem(ws, 'TEST', 'test message');
      assert.deepEqual(ws.sent, [{ type: 'system', payload: { code: 'TEST', message: 'test message' } }]);
    });
  });

  describe('broadcast', () => {
    it('sends the same message to all players in the room', () => {
      const ws1 = createMockSocket();
      const ws2 = createMockSocket();
      const room = { players: [{ ws: ws1 }, { ws: ws2 }] };
      broadcast(room, 'system', { code: 'TEST' });
      assert.deepEqual(ws1.sent, [{ type: 'system', payload: { code: 'TEST' } }]);
      assert.deepEqual(ws2.sent, [{ type: 'system', payload: { code: 'TEST' } }]);
    });

    it('ignores null player slots', () => {
      const ws = createMockSocket();
      const room = { players: [null, { ws }] };
      broadcast(room, 'system', { code: 'TEST' });
      assert.equal(ws.sent.length, 1);
    });
  });

  describe('broadcastSystem', () => {
    it('sends a system message to all players', () => {
      const ws = createMockSocket();
      const room = { players: [{ ws }] };
      broadcastSystem(room, 'TEST', 'msg');
      assert.deepEqual(ws.sent, [{ type: 'system', payload: { code: 'TEST', message: 'msg' } }]);
    });
  });

  describe('buildGameState', () => {
    it('builds a complete gameState payload with per-recipient myColor', () => {
      const board = createBoard();
      board[7][7] = 1;
      const room = {
        roomId: 'r1',
        players: [
          { username: 'alice', color: 1 },
          { username: 'bob', color: 2 },
        ],
        currentTurn: 2,
        board,
        status: 'playing',
      };
      const state = buildGameState(room, 1);
      assert.equal(state.type, 'gameState');
      assert.equal(state.payload.roomId, 'r1');
      assert.deepEqual(state.payload.players, [
        { username: 'alice', color: 1 },
        { username: 'bob', color: 2 },
      ]);
      assert.equal(state.payload.myColor, 1);
      assert.equal(state.payload.currentTurn, 2);
      assert.equal(state.payload.status, 'playing');
      assert.equal(state.payload.board[7][7], 1);
      assert.notStrictEqual(state.payload.board, room.board);
    });
  });

  describe('broadcastGameState', () => {
    it('sends personalized myColor to each player', () => {
      const ws1 = createMockSocket();
      const ws2 = createMockSocket();
      const room = {
        roomId: 'r1',
        players: [
          { ws: ws1, username: 'alice', color: 1 },
          { ws: ws2, username: 'bob', color: 2 },
        ],
        currentTurn: 1,
        board: createBoard(),
        status: 'playing',
      };
      broadcastGameState(room);
      assert.equal(ws1.sent[0].payload.myColor, 1);
      assert.equal(ws2.sent[0].payload.myColor, 2);
    });
  });

  describe('broadcastMove', () => {
    it('broadcasts a move event to all players', () => {
      const ws1 = createMockSocket();
      const ws2 = createMockSocket();
      const room = { players: [{ ws: ws1 }, { ws: ws2 }] };
      broadcastMove(room, 7, 7, 1);
      const expected = { type: 'move', payload: { x: 7, y: 7, color: 1 } };
      assert.deepEqual(ws1.sent[0], expected);
      assert.deepEqual(ws2.sent[0], expected);
    });
  });
});
