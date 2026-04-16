import type { Grid } from './grid';
import { getCell, setCell } from './grid';
import type { Cell, GridSize, PlayableTile, Position, TileKind } from './types';
import { isBlocked, isFilled } from './types';

/**
 * Row index 0 is the top of the screen; tiles fall toward higher row indices.
 * Obstacle cells stay fixed; gravity runs independently inside each vertical segment
 * between obstacles in the same column.
 */
export function applyGravity(grid: Grid, size: GridSize): void {
  for (let col = 0; col < size.cols; col++) {
    let row = 0;
    while (row < size.rows) {
      while (row < size.rows && isBlocked(getCell(grid, { row, col }))) {
        row++;
      }
      if (row >= size.rows) {
        break;
      }
      const segmentStart = row;
      while (row < size.rows && !isBlocked(getCell(grid, { row, col }))) {
        row++;
      }
      const segmentEnd = row - 1;
      packColumnSegment(grid, col, segmentStart, segmentEnd);
    }
  }
}

function packColumnSegment(grid: Grid, col: number, r0: number, r1: number): void {
  const tiles: PlayableTile[] = [];
  for (let r = r0; r <= r1; r++) {
    const cell = getCell(grid, { row: r, col });
    if (isFilled(cell)) {
      tiles.push(cell);
    }
  }
  const len = r1 - r0 + 1;
  const pad = len - tiles.length;
  for (let i = 0; i < len; i++) {
    const r = r0 + i;
    const value: Cell = i < pad ? null : tiles[i - pad]!;
    setCell(grid, { row: r, col }, value);
  }
}

/** Sets every listed cell to empty. Skips obstacles. */
export function clearCells(grid: Grid, positions: readonly Position[]): void {
  for (const p of positions) {
    if (isBlocked(getCell(grid, p))) {
      continue;
    }
    setCell(grid, p, null);
  }
}

/**
 * Fills null cells with new tiles. Order is top-to-bottom, left-to-right so RNG stays deterministic
 * for a given spawn function and board shape. Obstacles are left unchanged.
 */
export function refillNulls(grid: Grid, size: GridSize, spawn: (pos: Position) => TileKind): void {
  for (let row = 0; row < size.rows; row++) {
    for (let col = 0; col < size.cols; col++) {
      const pos: Position = { row, col };
      const cell = getCell(grid, pos);
      if (cell === null) {
        setCell(grid, pos, spawn(pos));
      }
    }
  }
}
