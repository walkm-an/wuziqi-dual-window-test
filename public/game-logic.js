// 五子棋前端纯逻辑（不依赖 DOM，可单元测试）

export const BOARD_SIZE = 15;
export const CANVAS_SIZE = 600;
export const PADDING = 30;
export const GRID_SIZE = (CANVAS_SIZE - PADDING * 2) / (BOARD_SIZE - 1);
export const STONE_RADIUS = GRID_SIZE * 0.4;

export const COLOR_NAMES = {
  0: '未确定',
  1: '黑方',
  2: '白方',
};

export const STATUS_NAMES = {
  waiting: '等待玩家',
  playing: '对局进行中',
  blackWin: '黑方获胜',
  whiteWin: '白方获胜',
  draw: '平局',
};

/**
 * 创建空棋盘
 * @returns {number[][]} 15×15 的二维数组，所有元素为 0
 */
export function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

/**
 * 判断对局是否已结束
 * @param {string} status
 * @returns {boolean}
 */
export function isGameEnded(status) {
  return status === 'blackWin' || status === 'whiteWin' || status === 'draw';
}

/**
 * 将鼠标点击位置转换为棋盘交叉点坐标
 * @param {number} clientX
 * @param {number} clientY
 * @param {DOMRect} rect
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @returns {{x: number, y: number} | null}
 */
export function getGridCoord(clientX, clientY, rect, canvasWidth, canvasHeight) {
  const dprX = canvasWidth / rect.width;
  const dprY = canvasHeight / rect.height;

  const x = (clientX - rect.left) * dprX - PADDING;
  const y = (clientY - rect.top) * dprY - PADDING;

  const gridX = Math.round(x / GRID_SIZE);
  const gridY = Math.round(y / GRID_SIZE);

  if (gridX < 0 || gridX >= BOARD_SIZE || gridY < 0 || gridY >= BOARD_SIZE) {
    return null;
  }

  return { x: gridX, y: gridY };
}

/**
 * 获取颜色显示文本
 * @param {number} color
 * @returns {string}
 */
export function getColorName(color) {
  return COLOR_NAMES[color] ?? '未知';
}

/**
 * 获取状态显示文本
 * @param {string} status
 * @returns {string}
 */
export function getStatusName(status) {
  return STATUS_NAMES[status] ?? status;
}
