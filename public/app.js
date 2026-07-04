// 五子棋前端逻辑

import {
  BOARD_SIZE,
  CANVAS_SIZE,
  PADDING,
  GRID_SIZE,
  STONE_RADIUS,
  COLOR_NAMES,
  STATUS_NAMES,
  createEmptyBoard,
  validateBoard,
  isGameEnded,
  getGridCoord,
} from './game-logic.js';

// ==================== DOM 元素 ====================
const connectionStatusEl = document.getElementById('connectionStatus');
const loginSectionEl = document.getElementById('loginSection');
const gameSectionEl = document.getElementById('gameSection');
const roomIdInput = document.getElementById('roomId');
const usernameInput = document.getElementById('username');
const joinBtn = document.getElementById('joinBtn');
const myColorEl = document.getElementById('myColor');
const currentTurnEl = document.getElementById('currentTurn');
const gameStatusEl = document.getElementById('gameStatus');
const boardCanvas = document.getElementById('boardCanvas');
const turnOverlay = document.getElementById('turnOverlay');
const resignBtn = document.getElementById('resignBtn');
const notificationList = document.getElementById('notificationList');
const resultModal = document.getElementById('resultModal');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');
const closeResultBtn = document.getElementById('closeResultBtn');

const ctx = boardCanvas.getContext('2d');

// ==================== 状态 ====================
const state = {
  ws: null,
  connected: false,
  joined: false,
  roomId: '',
  username: '',
  myColor: 0,
  currentTurn: 1,
  status: 'waiting',
  board: createEmptyBoard(),
  notifications: [],
};

// ==================== 工具函数 ====================
function send(type, payload = {}) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    notify('当前未连接到服务端，请刷新页面重试', 'system-error');
    return;
  }
  state.ws.send(JSON.stringify({ type, payload }));
}

const ERROR_CODES = new Set([
  'system-error',
  'INVALID_JOIN_PAYLOAD',
  'ROOM_FULL',
  'NOT_JOINED',
  'NOT_PLAYING',
  'NOT_YOUR_TURN',
  'INVALID_COORDINATES',
  'OUT_OF_BOUNDS',
  'CELL_OCCUPIED',
  'UNKNOWN_MESSAGE_TYPE',
  'INVALID_JSON',
]);

function notify(message, code = '') {
  const item = document.createElement('li');
  item.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  if (ERROR_CODES.has(code)) {
    item.classList.add('system-error');
  }
  notificationList.appendChild(item);
  notificationList.scrollTop = notificationList.scrollHeight;
}

function setConnectionStatus(text, cls) {
  connectionStatusEl.textContent = text;
  connectionStatusEl.className = `connection-status ${cls}`;
}

// ==================== 渲染 ====================
function renderAll() {
  drawBoard();
  drawStones(state.board);
  renderStatus();
}

function drawBoard() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 棋盘背景
  ctx.fillStyle = '#e6b87d';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 网格线
  ctx.strokeStyle = '#5c4033';
  ctx.lineWidth = 1;

  for (let i = 0; i < BOARD_SIZE; i++) {
    const pos = PADDING + i * GRID_SIZE;

    ctx.beginPath();
    ctx.moveTo(PADDING, pos);
    ctx.lineTo(CANVAS_SIZE - PADDING, pos);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pos, PADDING);
    ctx.lineTo(pos, CANVAS_SIZE - PADDING);
    ctx.stroke();
  }

  // 星位
  const starPoints = [3, 7, 11];
  ctx.fillStyle = '#5c4033';
  for (const y of starPoints) {
    for (const x of starPoints) {
      const px = PADDING + x * GRID_SIZE;
      const py = PADDING + y * GRID_SIZE;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStones(board) {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const color = board[y][x];
      if (color === 0) continue;

      const px = PADDING + x * GRID_SIZE;
      const py = PADDING + y * GRID_SIZE;
      drawStone(px, py, color);
    }
  }
}

function drawStone(x, y, color) {
  const gradient = ctx.createRadialGradient(
    x - STONE_RADIUS * 0.3,
    y - STONE_RADIUS * 0.3,
    STONE_RADIUS * 0.1,
    x,
    y,
    STONE_RADIUS
  );

  if (color === 1) {
    gradient.addColorStop(0, '#6b6b6b');
    gradient.addColorStop(1, '#111111');
  } else {
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#d1d5db');
  }

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, STONE_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // 微高光
  ctx.fillStyle = color === 1 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(x - STONE_RADIUS * 0.35, y - STONE_RADIUS * 0.35, STONE_RADIUS * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function renderStatus() {
  myColorEl.textContent = `己方颜色：${COLOR_NAMES[state.myColor]}`;
  currentTurnEl.textContent = `当前回合：${COLOR_NAMES[state.currentTurn]}`;
  gameStatusEl.textContent = `对局状态：${STATUS_NAMES[state.status] || state.status}`;

  const isMyTurn = state.myColor !== 0 && state.myColor === state.currentTurn;
  const isPlaying = state.status === 'playing';

  if (!isPlaying) {
    turnOverlay.textContent = '对局结束';
    turnOverlay.classList.remove('hidden');
    boardCanvas.classList.add('disabled');
    resignBtn.disabled = true;
  } else if (!isMyTurn) {
    turnOverlay.textContent = '轮到对手';
    turnOverlay.classList.remove('hidden');
    boardCanvas.classList.add('disabled');
    resignBtn.disabled = false;
  } else {
    turnOverlay.classList.add('hidden');
    boardCanvas.classList.remove('disabled');
    resignBtn.disabled = false;
  }
}

// ==================== 事件处理 ====================
function handleBoardClick(event) {
  if (!state.joined) {
    notify('请先加入房间', 'system-error');
    return;
  }
  if (state.status !== 'playing') {
    notify('对局尚未开始或已结束', 'system-error');
    return;
  }
  if (state.myColor !== state.currentTurn) {
    notify('当前不是您的回合', 'system-error');
    return;
  }

  const rect = boardCanvas.getBoundingClientRect();
  const coord = getGridCoord(event.clientX, event.clientY, rect, boardCanvas.width, boardCanvas.height);
  if (!coord) return;

  if (state.board[coord.y][coord.x] !== 0) {
    notify('该位置已有棋子', 'system-error');
    return;
  }

  send('move', { x: coord.x, y: coord.y });
}

function handleGameState(payload) {
  state.roomId = payload.roomId || state.roomId;
  state.myColor = payload.myColor || 0;
  state.currentTurn = payload.currentTurn || 1;
  state.status = payload.status || 'waiting';
  state.board = validateBoard(payload.board) ? payload.board : createEmptyBoard();

  if (state.myColor !== 0) {
    state.joined = true;
    loginSectionEl.classList.add('hidden');
    gameSectionEl.classList.remove('hidden');
  }

  renderAll();

  if (isGameEnded(state.status)) {
    showResult(state.status);
  }
}

function handleMove(payload) {
  const { x, y, color } = payload;
  if (
    typeof x === 'number' && x >= 0 && x < BOARD_SIZE &&
    typeof y === 'number' && y >= 0 && y < BOARD_SIZE &&
    (color === 1 || color === 2)
  ) {
    state.board[y][x] = color;
    drawStones(state.board);
  }
}

function handleSystem(payload) {
  const { code, message } = payload;
  notify(message, code);
}

function showResult(status) {
  let title = '对局结束';
  let message = '';

  if (status === 'blackWin') {
    title = state.myColor === 1 ? '你赢了！' : '你输了';
    message = '黑方获胜';
  } else if (status === 'whiteWin') {
    title = state.myColor === 2 ? '你赢了！' : '你输了';
    message = '白方获胜';
  } else if (status === 'draw') {
    title = '平局';
    message = '双方握手言和';
  }

  resultTitle.textContent = title;
  resultMessage.textContent = message;
  resultModal.classList.remove('hidden');
}

function closeResult() {
  resultModal.classList.add('hidden');
}

// ==================== WebSocket ====================
function connect() {
  if (state.ws) {
    state.ws.close();
  }

  setConnectionStatus('连接中...', '');
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  state.ws = new WebSocket(`${scheme}://${location.host}`);

  state.ws.addEventListener('open', () => {
    state.connected = true;
    setConnectionStatus('已连接', 'connected');
    notify('已连接到服务端');
  });

  state.ws.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('收到服务端消息:', message);

      switch (message.type) {
        case 'gameState':
          handleGameState(message.payload);
          break;
        case 'move':
          handleMove(message.payload);
          break;
        case 'system':
          handleSystem(message.payload);
          break;
        default:
          console.warn('未知消息类型:', message.type);
      }
    } catch (err) {
      console.error('解析消息失败:', err);
    }
  });

  state.ws.addEventListener('close', () => {
    state.connected = false;
    setConnectionStatus('已断开，请刷新页面重试', 'disconnected');
    notify('连接已断开，请检查服务端是否运行', 'system-error');
  });

  state.ws.addEventListener('error', (err) => {
    console.error('WebSocket 错误:', err);
    setConnectionStatus('连接异常', 'disconnected');
  });
}

function sendJoin() {
  const roomId = roomIdInput.value.trim();
  const username = usernameInput.value.trim();

  if (!roomId) {
    notify('请输入房间号', 'system-error');
    return;
  }
  if (!username) {
    notify('请输入昵称', 'system-error');
    return;
  }

  state.roomId = roomId;
  state.username = username;
  send('join', { roomId, username });
}

function sendResign() {
  if (!state.joined) {
    notify('尚未加入房间', 'system-error');
    return;
  }
  if (state.status !== 'playing') {
    notify('对局尚未开始或已结束', 'system-error');
    return;
  }
  if (!confirm('确定要认输吗？')) return;
  send('resign', {});
}

// ==================== 事件绑定 ====================
joinBtn.addEventListener('click', sendJoin);
resignBtn.addEventListener('click', sendResign);
closeResultBtn.addEventListener('click', closeResult);
boardCanvas.addEventListener('click', handleBoardClick);

// 回车键加入房间
roomIdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') usernameInput.focus();
});
usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendJoin();
});

// ==================== 初始化 ====================
connect();
drawBoard();
