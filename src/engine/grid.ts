import type { Cell, GridSize, Position } from './types';
import { isFilled } from './types';

/** Row-major 2D board. Mutated by gameplay helpers; clone before branching if needed. */
export type Grid = Cell[][];

/** Derives size from an existing grid (row 0 is the top of the board). */
export function gridSize(grid: Grid): GridSize {
  if (grid.length === 0) {
    return { rows: 0, cols: 0 };
  }
  return { rows: grid.length, cols: grid[0]!.length };
}

/** Returns true if coordinates lie inside the grid. */
export function inBounds(size: GridSize, pos: Position): boolean {
  return pos.row >= 0 && pos.col >= 0 && pos.row < size.rows && pos.col < size.cols;
}

/** Reads a cell; caller must ensure bounds (or use safeGet). */
export function getCell(grid: Grid, pos: Position): Cell {
  return grid[pos.row]![pos.col]!;
}

/** Writes a cell; caller must ensure bounds. */
export function setCell(grid: Grid, pos: Position, value: Cell): void {
  grid[pos.row]![pos.col] = value;
}

/** Deep copy of the board (for undo snapshots or immutable steps). */
export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

/** Allocates a new grid filled by the factory (e.g. random tiles). */
export function createGrid(size: GridSize, fill: (pos: Position) => Cell): Grid {
  const out: Grid = [];
  for (let r = 0; r < size.rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < size.cols; c++) {
      row.push(fill({ row: r, col: c }));
    }
    out.push(row);
  }
  return out;
}

/** Builds a grid from row arrays; throws if ragged or empty. */
export function gridFromRows(rows: Cell[][]): Grid {
  if (rows.length === 0 || rows[0]!.length === 0) {
    throw new Error('Grid must have at least one row and one column.');
  }
  const cols = rows[0]!.length;
  for (const row of rows) {
    if (row.length !== cols) {
      throw new Error('All rows must have the same length.');
    }
  }
  return rows.map((row) => [...row]);
}

/** Manhattan distance 1 (up/down/left/right), not diagonal. */
export function areOrthogonalNeighbors(a: Position, b: Position): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr + dc === 1;
}

/** Up, down, left, right — only positions inside the grid. */
export function orthogonalNeighbors(size: GridSize, pos: Position): Position[] {
  const candidates: Position[] = [
    { row: pos.row - 1, col: pos.col },
    { row: pos.row + 1, col: pos.col },
    { row: pos.row, col: pos.col - 1 },
    { row: pos.row, col: pos.col + 1 },
  ];
  return candidates.filter((p) => inBounds(size, p));
}

/**
 * Swaps two cells in place. Returns false if positions are invalid or not adjacent.
 * Does not validate whether the swap creates a match — that is game-rule logic.
 */
export function trySwap(grid: Grid, size: GridSize, a: Position, b: Position): boolean {
  if (!inBounds(size, a) || !inBounds(size, b)) {
    return false;
  }
  if (!areOrthogonalNeighbors(a, b)) {
    return false;
  }
  const tmp = getCell(grid, a);
  setCell(grid, a, getCell(grid, b));
  setCell(grid, b, tmp);
  return true;
}

/**
 * True if swapping two orthogonal neighbors could theoretically be a legal player move.
 * Both cells must hold tiles (empty swaps are usually disallowed in match-3).
 */
export function isSwapAllowed(grid: Grid, size: GridSize, a: Position, b: Position): boolean {
  if (!inBounds(size, a) || !inBounds(size, b) || !areOrthogonalNeighbors(a, b)) {
    return false;
  }
  return isFilled(getCell(grid, a)) && isFilled(getCell(grid, b));
}
