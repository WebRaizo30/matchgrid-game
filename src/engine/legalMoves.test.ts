import { describe, expect, it } from 'vitest';
import { gridFromRows } from './grid';
import { hasLegalMove } from './legalMoves';
import { BLOCKED, type Cell } from './types';

describe('hasLegalMove', () => {
  it('returns false on a 2×2 board with four distinct colors and no bomb', () => {
    const rows: Cell[][] = [
      [0, 1],
      [2, 3],
    ];
    expect(hasLegalMove(gridFromRows(rows))).toBe(false);
  });

  it('returns true when a bomb is present', () => {
    const rows: Cell[][] = [[{ type: 'bomb', color: 0 }, 1, 2]];
    expect(hasLegalMove(gridFromRows(rows))).toBe(true);
  });

  it('returns false when blocked cells split the board', () => {
    const rows: Cell[][] = [[0, BLOCKED, 1, 2]];
    expect(hasLegalMove(gridFromRows(rows))).toBe(false);
  });
});
