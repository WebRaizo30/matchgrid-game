import type { Grid, GridSize, Position } from './types';
import { getCell, setCell } from './grid';
import { isBlocked } from './types';

/**
 * Collects all board positions in a 3×3 area around `center` (Moore neighborhood including center).
 */
export function collectBombBlastPositions(center: Position, size: GridSize): Position[] {
  const out: Position[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const row = center.row + dr;
      const col = center.col + dc;
      if (row >= 0 && row < size.rows && col >= 0 && col < size.cols) {
        out.push({ row, col });
      }
    }
  }
  return out;
}

/**
 * Clears the bomb blast area. BLOCKED cells are untouched; everything else becomes empty.
 * Returns positions that were cleared (for scoring).
 */
export function explodeBombAt(grid: Grid, size: GridSize, center: Position): Position[] {
  const cleared: Position[] = [];
  for (const p of collectBombBlastPositions(center, size)) {
    const cell = getCell(grid, p);
    if (isBlocked(cell)) {
      continue;
    }
    setCell(grid, p, null);
    cleared.push(p);
  }
  return cleared;
}
