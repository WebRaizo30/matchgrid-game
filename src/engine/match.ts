import type { Grid, NormalColor, Position } from './types';
import { getCell, gridSize, inBounds, setCell } from './grid';
import { isNormalColor } from './types';
import { MIN_LINE_LENGTH_FOR_BOMB, MIN_MATCH_LENGTH } from './constants';

export interface BombSpawn {
  readonly pos: Position;
  readonly color: NormalColor;
}

export interface MatchResolution {
  /** All cells that must be cleared (matches + bomb blast when used elsewhere). */
  readonly clearPositions: Position[];
  /** Bomb placements after this wave (line: segment center; 2×2 square: top-left tile). */
  readonly bombSpawns: readonly BombSpawn[];
}

function posKey(p: Position): string {
  return `${p.row},${p.col}`;
}

/**
 * Finds horizontal and vertical runs (length ≥ minMatch), plus 2×2 blocks of one normal color.
 * Bombs and empty cells break runs. BLOCKED cells break runs.
 * For each run of length ≥ bombLineMin, or each 2×2 square, schedules a bomb (line: segment center; square: top-left cell).
 */
export function findMatchResolution(
  grid: Grid,
  minMatch: number = MIN_MATCH_LENGTH,
  bombLineMin: number = MIN_LINE_LENGTH_FOR_BOMB,
): MatchResolution {
  const size = gridSize(grid);
  const clearSet = new Set<string>();
  const bombMap = new Map<string, BombSpawn>();

  const addClear = (p: Position): void => {
    clearSet.add(posKey(p));
  };

  const tryBomb = (runStart: Position, length: number, color: NormalColor, axis: 'h' | 'v'): void => {
    if (length < bombLineMin) {
      return;
    }
    const mid = Math.floor((length - 1) / 2);
    const pos: Position =
      axis === 'h'
        ? { row: runStart.row, col: runStart.col + mid }
        : { row: runStart.row + mid, col: runStart.col };
    const k = posKey(pos);
    if (!bombMap.has(k)) {
      bombMap.set(k, { pos, color });
    }
  };

  // Horizontal runs
  for (let r = 0; r < size.rows; r++) {
    let c = 0;
    while (c < size.cols) {
      const cell = grid[r]![c];
      if (!isNormalColor(cell)) {
        c += 1;
        continue;
      }
      const color = cell;
      const startCol = c;
      c += 1;
      while (c < size.cols) {
        const next = grid[r]![c];
        if (!isNormalColor(next) || next !== color) {
          break;
        }
        c += 1;
      }
      const runLen = c - startCol;
      if (runLen >= minMatch) {
        for (let cc = startCol; cc < startCol + runLen; cc++) {
          addClear({ row: r, col: cc });
        }
        tryBomb({ row: r, col: startCol }, runLen, color, 'h');
      }
    }
  }

  // Vertical runs
  for (let col = 0; col < size.cols; col++) {
    let r = 0;
    while (r < size.rows) {
      const cell = grid[r]![col];
      if (!isNormalColor(cell)) {
        r += 1;
        continue;
      }
      const color = cell;
      const startRow = r;
      r += 1;
      while (r < size.rows) {
        const next = grid[r]![col];
        if (!isNormalColor(next) || next !== color) {
          break;
        }
        r += 1;
      }
      const runLen = r - startRow;
      if (runLen >= minMatch) {
        for (let rr = startRow; rr < startRow + runLen; rr++) {
          addClear({ row: rr, col });
        }
        tryBomb({ row: startRow, col }, runLen, color, 'v');
      }
    }
  }

  // 2×2 blocks of the same normal color (also counts as a match; bomb at top-left of the square)
  for (let r = 0; r < size.rows - 1; r++) {
    for (let c = 0; c < size.cols - 1; c++) {
      const a = grid[r]![c];
      const b = grid[r]![c + 1]!;
      const d = grid[r + 1]![c]!;
      const e = grid[r + 1]![c + 1]!;
      if (!isNormalColor(a) || !isNormalColor(b) || !isNormalColor(d) || !isNormalColor(e)) {
        continue;
      }
      if (a === b && b === d && d === e) {
        const color = a;
        addClear({ row: r, col: c });
        addClear({ row: r, col: c + 1 });
        addClear({ row: r + 1, col: c });
        addClear({ row: r + 1, col: c + 1 });
        const k = posKey({ row: r, col: c });
        if (!bombMap.has(k)) {
          bombMap.set(k, { pos: { row: r, col: c }, color });
        }
      }
    }
  }

  const clearPositions: Position[] = [...clearSet].map((k) => {
    const [row, col] = k.split(',').map(Number) as [number, number];
    return { row, col };
  });

  return {
    clearPositions,
    bombSpawns: [...bombMap.values()],
  };
}

/** Positions that participate in at least one match (swap validation, hints). */
export function findMatchingPositions(grid: Grid, minMatch: number = MIN_MATCH_LENGTH): Position[] {
  return findMatchResolution(grid, minMatch).clearPositions;
}

/**
 * True if swapping a and b would create a match **after** the swap is applied.
 * Mutates `grid` temporarily; restores before return.
 */
export function wouldSwapCreateMatch(grid: Grid, a: Position, b: Position, minMatch: number = MIN_MATCH_LENGTH): boolean {
  const size = gridSize(grid);
  if (!inBounds(size, a) || !inBounds(size, b)) {
    return false;
  }
  const va = getCell(grid, a);
  const vb = getCell(grid, b);
  setCell(grid, a, vb);
  setCell(grid, b, va);

  const matches = findMatchingPositions(grid, minMatch);

  setCell(grid, a, va);
  setCell(grid, b, vb);

  return matches.length > 0;
}
