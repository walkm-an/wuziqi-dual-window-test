import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { WebSocketServer } from 'ws';
import { validateMove, placeStone, checkWin, checkDraw } from './game.js';
import {
  send,
  sendSystem,
  buildGameState,
  broadcastGameState,
  broadcastMove,
  broadcastSystem,
} from './broadcast.js';
import { socketRoom, getRoom, joinRoom, leaveRoom, findPlayer } from './roomManager.js';

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = join(process.cwd(), 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  let pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (pathname === '/') pathname = '/index.html';

  const filePath = normalize(join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

const wss = new WebSocketServer({ server });

function handleJoin(ws, payload) {
  const roomId = payload?.roomId;
  const username = payload?.username;

  if (typeof roomId !== 'string' || typeof username !== 'string') {
    sendSystem(ws, 'INVALID_JOIN_PAYLOAD', '房间号与用户名必须为字符串');
    return;
  }

  const trimmedRoomId = roomId.trim();
  const trimmedUsername = username.trim();

  if (!trimmedRoomId || !trimmedUsername) {
    sendSystem(ws, 'INVALID_JOIN_PAYLOAD', '房间号与用户名不能为空');
    return;
  }

  const oldRoomId = socketRoom.get(ws);
  if (oldRoomId && oldRoomId !== trimmedRoomId) {
    leaveRoom(ws, oldRoomId);
  }

  const result = joinRoom(ws, trimmedRoomId, trimmedUsername);

  if (result.roomFull) {
    sendSystem(ws, 'ROOM_FULL', `房间 ${trimmedRoomId} 已满`);
    return;
  }

  const { room, player, alreadyInRoom } = result;

  if (alreadyInRoom) {
    send(ws, 'gameState', buildGameState(room, player.color).payload);
    return;
  }

  sendSystem(ws, 'PLAYER_JOINED', `${trimmedUsername} 加入了房间 ${trimmedRoomId}`);

  const opponent = room.players.find((p) => p && p.ws !== ws);
  if (opponent) {
    sendSystem(opponent.ws, 'OPPONENT_JOINED', `${trimmedUsername} 加入了房间，对局开始`);
  }

  broadcastGameState(room);
}

function handleMove(ws, payload) {
  const roomId = socketRoom.get(ws);
  const room = getRoom(roomId);
  const player = room ? findPlayer(room, ws) : null;

  const x = payload?.x;
  const y = payload?.y;

  const errorCode = validateMove(room, player, x, y);
  if (errorCode) {
    const messages = {
      NOT_JOINED: '您尚未加入房间',
      NOT_PLAYING: '对局未在进行中',
      NOT_YOUR_TURN: '现在不是您的回合',
      INVALID_COORDINATES: '坐标必须是 0 ~ 14 的整数',
      OUT_OF_BOUNDS: '坐标超出棋盘范围',
      CELL_OCCUPIED: '该位置已有棋子',
    };
    sendSystem(ws, errorCode, messages[errorCode] || '非法落子');
    return;
  }

  placeStone(room, x, y, player.color);
  broadcastMove(room, x, y, player.color);

  if (checkWin(room.board, x, y, player.color)) {
    room.status = player.color === 1 ? 'blackWin' : 'whiteWin';
    broadcastSystem(room, room.status === 'blackWin' ? 'BLACK_WIN' : 'WHITE_WIN', '对局结束');
  } else if (checkDraw(room)) {
    room.status = 'draw';
    broadcastSystem(room, 'DRAW', '棋盘已满，平局');
  } else {
    room.currentTurn = player.color === 1 ? 2 : 1;
  }

  broadcastGameState(room);
}

function handleResign(ws) {
  const roomId = socketRoom.get(ws);
  const room = getRoom(roomId);
  const player = room ? findPlayer(room, ws) : null;

  if (!player || player.color === 0) {
    sendSystem(ws, 'NOT_JOINED', '您尚未加入房间');
    return;
  }

  if (room.status !== 'playing') {
    sendSystem(ws, 'NOT_PLAYING', '对局未在进行中');
    return;
  }

  const winnerColor = player.color === 1 ? 2 : 1;
  room.status = winnerColor === 1 ? 'blackWin' : 'whiteWin';

  const winner = room.players.find((p) => p && p.color === winnerColor);
  const winnerName = winner ? winner.username : (winnerColor === 1 ? '黑方' : '白方');
  broadcastSystem(room, 'PLAYER_RESIGNED', `${player.username} 认输，${winnerName} 获胜`);
  broadcastGameState(room);
}

function handleClose(ws) {
  const roomId = socketRoom.get(ws);
  if (!roomId) return;

  const room = getRoom(roomId);
  const previousStatus = room ? room.status : null;

  const updatedRoom = leaveRoom(ws, roomId);
  if (!updatedRoom) return;

  const remaining = updatedRoom.players.find((p) => p);
  if (!remaining) return;

  if (previousStatus === 'playing' && (updatedRoom.status === 'blackWin' || updatedRoom.status === 'whiteWin')) {
    broadcastSystem(updatedRoom, 'OPPONENT_DISCONNECTED', '对方已断开连接，您获胜了');
  } else if (updatedRoom.status === 'waiting') {
    broadcastSystem(updatedRoom, 'GAME_RESET', '对方离开，等待新玩家加入');
  } else {
    broadcastSystem(updatedRoom, 'OPPONENT_LEFT', '对方已离开');
  }

  broadcastGameState(updatedRoom);
}

wss.on('connection', (ws) => {
  console.log('新客户端已连接');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { type, payload = {} } = message;

      switch (type) {
        case 'join':
          handleJoin(ws, payload);
          break;
        case 'move':
          handleMove(ws, payload);
          break;
        case 'resign':
          handleResign(ws);
          break;
        default:
          sendSystem(ws, 'UNKNOWN_MESSAGE_TYPE', '未知消息类型');
      }
    } catch (err) {
      sendSystem(ws, 'INVALID_JSON', '消息格式非法');
    }
  });

  ws.on('close', () => {
    console.log('客户端已断开');
    handleClose(ws);
  });
});

server.listen(PORT, () => {
  console.log(`五子棋服务端已启动，端口: ${PORT}`);
});
