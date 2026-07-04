import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_SIZE,
  createBoard,
  deepCloneBoard,
  inBounds,
  validateMove,
  placeStone,
  checkWin,
  checkDraw,
} from '../src/game.js';

describe('game.js', () => {
  describe('createBoard', () => {
    it('returns a 15x15 board filled with zeros', () => {
      const board = createBoard();
      assert.equal(board.length, BOARD_SIZE);
      board.forEach((row) => {
        assert.equal(row.length, BOARD_SIZE);
        assert.ok(row.every((cell) => cell === 0));
      });
    });
  });

  describe('deepCloneBoard', () => {
    it('creates an independent copy of the board', () => {
      const board = createBoard();
      board[0][0] = 1;
      const clone = deepCloneBoard(board);
      clone[0][0] = 2;
      assert.equal(board[0][0], 1);
      assert.equal(clone[0][0], 2);
    });
  });

  describe('inBounds', () => {
    it('returns true for valid coordinates', () => {
      assert.ok(inBounds(0, 0));
      assert.ok(inBounds(14, 14));
      assert.ok(inBounds(7, 7));
    });

    it('returns false for out of bounds coordinates', () => {
      assert.ok(!inBounds(-1, 0));
      assert.ok(!inBounds(0, -1));
      assert.ok(!inBounds(15, 0));
      assert.ok(!inBounds(0, 15));
    });

    it('returns false for non-integer coordinates', () => {
      assert.ok(!inBounds(7.5, 7));
      assert.ok(!inBounds(7, 7.5));
      assert.ok(!inBounds('7', 7));
    });
  });

  describe('validateMove', () => {
    it('returns null for a valid move', () => {
      const room = {
        status: 'playing',
        currentTurn: 1,
        board: createBoard(),
      };
      const player = { color: 1 };
      assert.equal(validateMove(room, player, 7, 7), null);
    });

    it('returns NOT_JOINED when player has no color', () => {
      const room = { status: 'playing', currentTurn: 1, board: createBoard() };
      assert.equal(validateMove(room, { color: 0 }, 7, 7), 'NOT_JOINED');
      assert.equal(validateMove(room, null, 7, 7), 'NOT_JOINED');
    });

    it('returns NOT_PLAYING when game is not in playing state', () => {
      const room = { status: 'waiting', currentTurn: 1, board: createBoard() };
      const player = { color: 1 };
      assert.equal(validateMove(room, player, 7, 7), 'NOT_PLAYING');
    });

    it('returns NOT_YOUR_TURN when it is not the player turn', () => {
      const room = { status: 'playing', currentTurn: 2, board: createBoard() };
      const player = { color: 1 };
      assert.equal(validateMove(room, player, 7, 7), 'NOT_YOUR_TURN');
    });

    it('returns INVALID_COORDINATES for non-integer values', () => {
      const room = { status: 'playing', currentTurn: 1, board: createBoard() };
      const player = { color: 1 };
      assert.equal(validateMove(room, player, 7.5, 7), 'INVALID_COORDINATES');
    });

    it('returns OUT_OF_BOUNDS for coordinates outside the board', () => {
      const room = { status: 'playing', currentTurn: 1, board: createBoard() };
      const player = { color: 1 };
      assert.equal(validateMove(room, player, 15, 0), 'OUT_OF_BOUNDS');
    });

    it('returns CELL_OCCUPIED when the cell is not empty', () => {
      const board = createBoard();
      board[7][7] = 2;
      const room = { status: 'playing', currentTurn: 1, board };
      const player = { color: 1 };
      assert.equal(validateMove(room, player, 7, 7), 'CELL_OCCUPIED');
    });
  });

  describe('placeStone', () => {
    it('places a stone and increments moveCount', () => {
      const room = { board: createBoard(), moveCount: 0 };
      placeStone(room, 7, 7, 1);
      assert.equal(room.board[7][7], 1);
      assert.equal(room.moveCount, 1);
    });
  });

  describe('checkWin', () => {
    function buildBoard(moves) {
      const board = createBoard();
      for (const [x, y, color] of moves) {
        board[y][x] = color;
      }
      return board;
    }

    it('detects horizontal five in a row', () => {
      const moves = [[0, 0, 1], [1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 1]];
      assert.ok(checkWin(buildBoard(moves), 2, 0, 1));
    });

    it('detects vertical five in a row', () => {
      const moves = [[0, 0, 2], [0, 1, 2], [0, 2, 2], [0, 3, 2], [0, 4, 2]];
      assert.ok(checkWin(buildBoard(moves), 0, 2, 2));
    });

    it('detects diagonal five in a row', () => {
      const moves = [[0, 0, 1], [1, 1, 1], [2, 2, 1], [3, 3, 1], [4, 4, 1]];
      assert.ok(checkWin(buildBoard(moves), 2, 2, 1));
    });

    it('detects anti-diagonal five in a row', () => {
      const moves = [[4, 0, 2], [3, 1, 2], [2, 2, 2], [1, 3, 2], [0, 4, 2]];
      assert.ok(checkWin(buildBoard(moves), 2, 2, 2));
    });

    it('detects six or more in a row as a win', () => {
      const moves = [[0, 0, 1], [1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 1], [5, 0, 1]];
      assert.ok(checkWin(buildBoard(moves), 3, 0, 1));
    });

    it('returns false when there is no five in a row', () => {
      const board = createBoard();
      board[0][0] = 1;
      board[0][1] = 1;
      board[0][2] = 1;
      board[0][3] = 1;
      assert.ok(!checkWin(board, 0, 2, 1));
    });
  });

  describe('checkDraw', () => {
    it('returns true when the board is full', () => {
      const room = { moveCount: BOARD_SIZE * BOARD_SIZE };
      assert.ok(checkDraw(room));
    });

    it('returns false when the board is not full', () => {
      const room = { moveCount: 224 };
      assert.ok(!checkDraw(room));
    });
  });
});
