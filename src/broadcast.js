import { deepCloneBoard } from './game.js';

export function send(ws, type, payload) {
  if (ws && ws.readyState === 1 /* WebSocket.OPEN */) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

export function sendSystem(ws, code, message) {
  send(ws, 'system', { code, message });
}

export function broadcast(room, type, payload) {
  for (const player of room.players) {
    if (player) {
      send(player.ws, type, payload);
    }
  }
}

export function broadcastSystem(room, code, message) {
  broadcast(room, 'system', { code, message });
}

export function buildGameState(room, myColor) {
  return {
    type: 'gameState',
    payload: {
      roomId: room.roomId,
      players: room.players
        .filter(Boolean)
        .map((p) => ({ username: p.username, color: p.color })),
      myColor,
      currentTurn: room.currentTurn,
      board: deepCloneBoard(room.board),
      status: room.status,
    },
  };
}

export function broadcastGameState(room) {
  for (const player of room.players) {
    if (player) {
      send(player.ws, 'gameState', buildGameState(room, player.color).payload);
    }
  }
}

export function broadcastMove(room, x, y, color) {
  broadcast(room, 'move', { x, y, color });
}
