import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';

const TEST_PORT = 3456;
const BASE_URL = `ws://localhost:${TEST_PORT}`;

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(BASE_URL);
    const timer = setTimeout(() => reject(new Error('connect timeout')), 1000);
    ws.on('open', () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.on('error', reject);
  });
}

function send(ws, type, payload = {}) {
  ws.send(JSON.stringify({ type, payload }));
}

function recorder(ws) {
  const messages = [];
  ws.on('message', (data) => messages.push(JSON.parse(data.toString())));
  return {
    last: (type) => {
      const filtered = messages.filter((m) => m.type === type);
      return filtered[filtered.length - 1];
    },
    hasCode: (code) => messages.some((m) => m.type === 'system' && m.payload.code === code),
    all: () => messages,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('server.js integration', () => {
  let child;

  before(async () => {
    child = spawn('node', ['src/server.js'], {
      env: { ...process.env, PORT: String(TEST_PORT) },
      cwd: process.cwd(),
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('server start timeout')), 3000);
      child.stdout.on('data', (data) => {
        if (data.toString().includes('端口')) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.stderr.on('data', (data) => console.error(data.toString()));
      child.on('error', reject);
    });
  });

  after(() => {
    if (child && !child.killed) {
      child.kill();
    }
  });

  it('serves static files over HTTP', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/index.html`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('五子棋'));
  });

  it('allows two players to join and start a game', async () => {
    const ws1 = await connect();
    const r1 = recorder(ws1);
    const ws2 = await connect();
    const r2 = recorder(ws2);

    send(ws1, 'join', { roomId: 'srv-r1', username: 'alice' });
    await sleep(150);
    send(ws2, 'join', { roomId: 'srv-r1', username: 'bob' });
    await sleep(150);

    const gs1 = r1.last('gameState');
    const gs2 = r2.last('gameState');
    assert.equal(gs1.payload.myColor, 1);
    assert.equal(gs2.payload.myColor, 2);
    assert.equal(gs1.payload.status, 'playing');
    assert.equal(gs2.payload.status, 'playing');

    ws1.close();
    ws2.close();
  });

  it('syncs a valid move and rejects an invalid move', async () => {
    const ws1 = await connect();
    const r1 = recorder(ws1);
    const ws2 = await connect();
    const r2 = recorder(ws2);

    send(ws1, 'join', { roomId: 'srv-r2', username: 'alice' });
    send(ws2, 'join', { roomId: 'srv-r2', username: 'bob' });
    await sleep(200);

    send(ws2, 'move', { x: 7, y: 7 }); // white out of turn
    await sleep(100);
    assert.ok(r2.hasCode('NOT_YOUR_TURN'));

    send(ws1, 'move', { x: 7, y: 7 }); // black valid
    await sleep(200);

    const mv = r2.last('move');
    assert.equal(mv.payload.x, 7);
    assert.equal(mv.payload.y, 7);
    assert.equal(mv.payload.color, 1);

    const gs = r2.last('gameState');
    assert.equal(gs.payload.board[7][7], 1);
    assert.equal(gs.payload.currentTurn, 2);

    ws1.close();
    ws2.close();
  });

  it('declares a winner when five in a row is formed', async () => {
    const ws1 = await connect();
    const r1 = recorder(ws1);
    const ws2 = await connect();
    const r2 = recorder(ws2);

    send(ws1, 'join', { roomId: 'srv-win', username: 'alice' });
    send(ws2, 'join', { roomId: 'srv-win', username: 'bob' });
    await sleep(200);

    const moves = [
      [ws1, 0, 0], [ws2, 7, 8],
      [ws1, 1, 0], [ws2, 7, 9],
      [ws1, 2, 0], [ws2, 7, 10],
      [ws1, 3, 0], [ws2, 7, 11],
      [ws1, 4, 0],
    ];
    for (const [ws, x, y] of moves) {
      send(ws, 'move', { x, y });
      await sleep(50);
    }
    await sleep(200);

    const gs = r1.last('gameState');
    assert.equal(gs.payload.status, 'blackWin');
    assert.ok(r2.hasCode('BLACK_WIN'));

    ws1.close();
    ws2.close();
  });

  it('handles resignation', async () => {
    const ws1 = await connect();
    const r1 = recorder(ws1);
    const ws2 = await connect();
    const r2 = recorder(ws2);

    send(ws1, 'join', { roomId: 'srv-resign', username: 'alice' });
    send(ws2, 'join', { roomId: 'srv-resign', username: 'bob' });
    await sleep(200);

    send(ws2, 'resign');
    await sleep(200);

    const gs = r1.last('gameState');
    assert.equal(gs.payload.status, 'blackWin');
    assert.ok(r2.hasCode('PLAYER_RESIGNED'));

    ws1.close();
    ws2.close();
  });
});
