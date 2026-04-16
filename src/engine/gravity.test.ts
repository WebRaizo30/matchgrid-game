import { describe, expect, it } from 'vitest';
import { getCell, gridFromRows } from './grid';
import { applyGravity } from './gravity';
import { BLOCKED } from './types';

describe('applyGravity', () => {
  it('packs tiles toward the bottom of a column segment above an obstacle', () => {
    const grid = gridFromRows([
      [null],
      [BLOCKED],
      [0],
      [0],
    ]);
    applyGravity(grid, { rows: 4, cols: 1 });
    expect(getCell(grid, { row: 0, col: 0 })).toBe(null);
    expect(getCell(grid, { row: 2, col: 0 })).toBe(0);
    expect(getCell(grid, { row: 3, col: 0 })).toBe(0);
  });
});
