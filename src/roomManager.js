import { createBoard } from './game.js';

export const rooms = new Map();
export const socketRoom = new WeakMap();

const COLOR_BLACK = 1;
const COLOR_WHITE = 2;

export function createRoom(roomId) {
  const room = {
    roomId,
    players: [null, null],
    status: 'waiting',
    board: createBoard(),
    currentTurn: COLOR_BLACK,
    moveCount: 0,
  };
  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId) {
  return rooms.get(roomId);
}

export function deleteRoom(roomId) {
  rooms.delete(roomId);
}

export function findPlayer(room, ws) {
  return room.players.find((p) => p && p.ws === ws) || null;
}

export function leaveRoom(ws, roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  socketRoom.delete(ws);

  const index = room.players.findIndex((p) => p && p.ws === ws);
  if (index === -1) return room;

  room.players[index] = null;

  if (room.players.every((p) => !p)) {
    deleteRoom(roomId);
    return null;
  }

  if (room.status === 'playing') {
    // 对局中断线/离开，剩余玩家获胜
    const remaining = room.players.find((p) => p);
    room.status = remaining.color === COLOR_BLACK ? 'blackWin' : 'whiteWin';
  } else if (room.status === 'waiting') {
    // 等待中有人离开，重置棋盘与回合，保持 waiting
    room.currentTurn = COLOR_BLACK;
    room.board = createBoard();
    room.moveCount = 0;
  }
  // 已结束状态（blackWin/whiteWin/draw）保持不变，供剩余玩家查看结果

  return room;
}

export function joinRoom(ws, roomId, username) {
  let room = rooms.get(roomId);
  let isNewRoom = false;
  if (!room) {
    room = createRoom(roomId);
    isNewRoom = true;
  }

  const existingIndex = room.players.findIndex((p) => p && p.ws === ws);
  if (existingIndex !== -1) {
    socketRoom.set(ws, roomId);
    return { room, player: room.players[existingIndex], isNewRoom, alreadyInRoom: true };
  }

  const emptyIndex = room.players.findIndex((p) => !p);
  if (emptyIndex === -1) {
    return { room, player: null, isNewRoom, roomFull: true };
  }

  const color = emptyIndex === 0 ? COLOR_BLACK : COLOR_WHITE;
  const player = { ws, username, color };
  room.players[emptyIndex] = player;
  socketRoom.set(ws, roomId);

  if (room.players.every(Boolean)) {
    room.status = 'playing';
    room.currentTurn = COLOR_BLACK;
  }

  return { room, player, isNewRoom, roomFull: false };
}
