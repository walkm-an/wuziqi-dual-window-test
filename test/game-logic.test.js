import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_SIZE,
  CANVAS_SIZE,
  PADDING,
  GRID_SIZE,
  STONE_RADIUS,
  COLOR_NAMES,
  STATUS_NAMES,
  createEmptyBoard,
  isGameEnded,
  getGridCoord,
  getColorName,
  getStatusName,
} from '../public/game-logic.js';

describe('game-logic constants', () => {
  it('BOARD_SIZE should be 15', () => {
    assert.equal(BOARD_SIZE, 15);
  });

  it('CANVAS_SIZE should be 600', () => {
    assert.equal(CANVAS_SIZE, 600);
  });

  it('PADDING should be 30', () => {
    assert.equal(PADDING, 30);
  });

  it('GRID_SIZE should be (CANVAS_SIZE - 2 * PADDING) / (BOARD_SIZE - 1)', () => {
    assert.equal(GRID_SIZE, (CANVAS_SIZE - PADDING * 2) / (BOARD_SIZE - 1));
  });

  it('STONE_RADIUS should be 40% of GRID_SIZE', () => {
    assert.equal(STONE_RADIUS, GRID_SIZE * 0.4);
  });

  it('COLOR_NAMES contains expected entries', () => {
    assert.deepEqual(COLOR_NAMES, {
      0: '未确定',
      1: '黑方',
      2: '白方',
    });
  });

  it('STATUS_NAMES contains expected entries', () => {
    assert.deepEqual(STATUS_NAMES, {
      waiting: '等待玩家',
      playing: '对局进行中',
      blackWin: '黑方获胜',
      whiteWin: '白方获胜',
      draw: '平局',
    });
  });
});

describe('createEmptyBoard', () => {
  it('returns a 15x15 board filled with zeros', () => {
    const board = createEmptyBoard();
    assert.equal(board.length, BOARD_SIZE);
    for (const row of board) {
      assert.equal(row.length, BOARD_SIZE);
      assert.ok(row.every((cell) => cell === 0));
    }
  });

  it('returns independent boards', () => {
    const board1 = createEmptyBoard();
    const board2 = createEmptyBoard();
    board1[0][0] = 1;
    assert.equal(board2[0][0], 0);
  });
});

describe('isGameEnded', () => {
  it('returns true for terminal statuses', () => {
    assert.equal(isGameEnded('blackWin'), true);
    assert.equal(isGameEnded('whiteWin'), true);
    assert.equal(isGameEnded('draw'), true);
  });

  it('returns false for non-terminal statuses', () => {
    assert.equal(isGameEnded('waiting'), false);
    assert.equal(isGameEnded('playing'), false);
  });

  it('returns false for unknown statuses', () => {
    assert.equal(isGameEnded('unknown'), false);
    assert.equal(isGameEnded(''), false);
  });
});

describe('getGridCoord', () => {
  const rect = { left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE };

  it('converts exact intersection center to grid coordinates', () => {
    const x = PADDING + 7 * GRID_SIZE;
    const y = PADDING + 7 * GRID_SIZE;
    assert.deepEqual(getGridCoord(x, y, rect, CANVAS_SIZE, CANVAS_SIZE), { x: 7, y: 7 });
  });

  it('rounds to nearest intersection within threshold', () => {
    const x = PADDING + 3 * GRID_SIZE + GRID_SIZE * 0.3;
    const y = PADDING + 5 * GRID_SIZE - GRID_SIZE * 0.3;
    assert.deepEqual(getGridCoord(x, y, rect, CANVAS_SIZE, CANVAS_SIZE), { x: 3, y: 5 });
  });

  it('returns coordinates for first and last intersections', () => {
    assert.deepEqual(
      getGridCoord(PADDING, PADDING, rect, CANVAS_SIZE, CANVAS_SIZE),
      { x: 0, y: 0 }
    );
    assert.deepEqual(
      getGridCoord(CANVAS_SIZE - PADDING, CANVAS_SIZE - PADDING, rect, CANVAS_SIZE, CANVAS_SIZE),
      { x: 14, y: 14 }
    );
  });

  it('returns null for clicks outside the board', () => {
    assert.equal(getGridCoord(0, 0, rect, CANVAS_SIZE, CANVAS_SIZE), null);
    assert.equal(
      getGridCoord(CANVAS_SIZE, CANVAS_SIZE, rect, CANVAS_SIZE, CANVAS_SIZE),
      null
    );
  });

  it('handles CSS-scaled canvas correctly', () => {
    const scaledRect = { left: 0, top: 0, width: 300, height: 300 };
    const x = 15 + 7 * 20; // 300px canvas maps to 600px logical, so each grid is 20px in screen space
    const y = 15 + 7 * 20;
    assert.deepEqual(getGridCoord(x, y, scaledRect, CANVAS_SIZE, CANVAS_SIZE), { x: 7, y: 7 });
  });
});

describe('getColorName', () => {
  it('returns expected names', () => {
    assert.equal(getColorName(0), '未确定');
    assert.equal(getColorName(1), '黑方');
    assert.equal(getColorName(2), '白方');
  });

  it('returns unknown for invalid colors', () => {
    assert.equal(getColorName(3), '未知');
    assert.equal(getColorName(-1), '未知');
  });
});

describe('getStatusName', () => {
  it('returns expected names', () => {
    assert.equal(getStatusName('waiting'), '等待玩家');
    assert.equal(getStatusName('playing'), '对局进行中');
    assert.equal(getStatusName('blackWin'), '黑方获胜');
    assert.equal(getStatusName('whiteWin'), '白方获胜');
    assert.equal(getStatusName('draw'), '平局');
  });

  it('returns status itself for unknown statuses', () => {
    assert.equal(getStatusName('foo'), 'foo');
    assert.equal(getStatusName(''), '');
  });
});
