export const BOARD_SIZE = 15;

export function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

export function deepCloneBoard(board) {
  return board.map((row) => [...row]);
}

export function inBounds(x, y) {
  return Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && x < BOARD_SIZE
    && y >= 0 && y < BOARD_SIZE;
}

export function validateMove(room, player, x, y) {
  if (!room) return 'NOT_JOINED';
  if (!player || player.color === 0) return 'NOT_JOINED';
  if (room.status !== 'playing') return 'NOT_PLAYING';
  if (room.currentTurn !== player.color) return 'NOT_YOUR_TURN';
  if (!Number.isInteger(x) || !Number.isInteger(y)) return 'INVALID_COORDINATES';
  if (!inBounds(x, y)) return 'OUT_OF_BOUNDS';
  if (room.board[y][x] !== 0) return 'CELL_OCCUPIED';
  return null;
}

export function placeStone(room, x, y, color) {
  room.board[y][x] = color;
  room.moveCount += 1;
}

const DIRECTIONS = [
  [1, 0],   // horizontal
  [0, 1],   // vertical
  [1, 1],   // diagonal
  [1, -1],  // anti-diagonal
];

function countLine(board, x, y, dx, dy, color) {
  let count = 1;
  for (const sign of [1, -1]) {
    let cx = x + dx * sign;
    let cy = y + dy * sign;
    while (inBounds(cx, cy) && board[cy][cx] === color) {
      count += 1;
      cx += dx * sign;
      cy += dy * sign;
    }
  }
  return count;
}

export function checkWin(board, x, y, color) {
  return DIRECTIONS.some(([dx, dy]) => countLine(board, x, y, dx, dy, color) >= 5);
}

export function checkDraw(room) {
  return room.moveCount >= BOARD_SIZE * BOARD_SIZE;
}
