import { describe, expect, it } from 'vitest';
import { cloneGrid, gridFromRows } from './grid';
import { findMatchResolution, findMatchingPositions, wouldSwapCreateMatch } from './match';
import { BLOCKED, type Cell } from './types';

describe('findMatchingPositions', () => {
  it('detects a horizontal triple', () => {
    const rows: Cell[][] = [[0, 0, 0, 1]];
    const grid = gridFromRows(rows);
    const m = findMatchingPositions(grid);
    expect(m).toHaveLength(3);
  });

  it('detects a vertical triple', () => {
    const rows: Cell[][] = [[1], [1], [1], [2]];
    const grid = gridFromRows(rows);
    const m = findMatchingPositions(grid);
    expect(m).toHaveLength(3);
  });

  it('ignores obstacles between tiles', () => {
    const rows: Cell[][] = [
      [0, BLOCKED, 0, 0],
    ];
    const grid = gridFromRows(rows);
    const m = findMatchingPositions(grid);
    expect(m).toHaveLength(0);
  });

  it('detects a 2×2 square of one color', () => {
    const rows: Cell[][] = [
      [0, 0],
      [0, 0],
    ];
    const grid = gridFromRows(rows);
    const m = findMatchingPositions(grid);
    expect(m).toHaveLength(4);
  });
});

describe('findMatchResolution', () => {
  it('schedules a bomb at the center of a horizontal four', () => {
    const rows: Cell[][] = [[0, 0, 0, 0]];
    const grid = gridFromRows(rows);
    const r = findMatchResolution(grid);
    expect(r.clearPositions).toHaveLength(4);
    expect(r.bombSpawns).toHaveLength(1);
    expect(r.bombSpawns[0]).toEqual({ pos: { row: 0, col: 1 }, color: 0 });
  });

  it('schedules a bomb at the center of a vertical four', () => {
    const rows: Cell[][] = [[0], [0], [0], [0]];
    const grid = gridFromRows(rows);
    const r = findMatchResolution(grid);
    expect(r.bombSpawns).toHaveLength(1);
    expect(r.bombSpawns[0]).toEqual({ pos: { row: 1, col: 0 }, color: 0 });
  });

  it('schedules a bomb for a 2×2 square (top-left cell)', () => {
    const rows: Cell[][] = [
      [0, 0],
      [0, 0],
    ];
    const grid = gridFromRows(rows);
    const r = findMatchResolution(grid);
    expect(r.clearPositions).toHaveLength(4);
    expect(r.bombSpawns).toHaveLength(1);
    expect(r.bombSpawns[0]).toEqual({ pos: { row: 0, col: 0 }, color: 0 });
  });
});

describe('wouldSwapCreateMatch', () => {
  it('leaves the grid unchanged after probing a vertical neighbor swap', () => {
    const rows: Cell[][] = [
      [1, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const grid = gridFromRows(rows);
    const snapshot = cloneGrid(grid);
    wouldSwapCreateMatch(grid, { row: 0, col: 0 }, { row: 1, col: 0 });
    expect(grid).toEqual(snapshot);
  });

  it('detects a match created only by a vertical swap', () => {
    const rows: Cell[][] = [
      [1, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const grid = gridFromRows(rows);
    expect(wouldSwapCreateMatch(grid, { row: 0, col: 0 }, { row: 1, col: 0 })).toBe(true);
  });
});
