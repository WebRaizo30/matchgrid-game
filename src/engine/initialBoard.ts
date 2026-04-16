import { createGrid, setCell } from './grid';
import type { Grid } from './grid';
import type { GridSize, Position, TileKind } from './types';
import { BLOCKED, isNormalColor } from './types';
import type { Rng } from './rng';

/**
 * Fills the grid in row-major order so that no placement immediately forms
 * a horizontal or vertical line of three identical tiles, nor a 2×2 block of one color.
 * This matches common match-3 level generators for the initial state.
 *
 * `isBlocked` marks permanent obstacles (`BLOCKED` cells); they are skipped for fills.
 */
export function fillGridWithoutImmediateMatches(
  size: GridSize,
  numKinds: number,
  rng: Rng,
  isBlocked?: (pos: Position) => boolean,
): Grid {
  if (numKinds <= 0) {
    throw new Error('numKinds must be positive');
  }

  const grid = createGrid(size, () => null);

  if (isBlocked) {
    for (let row = 0; row < size.rows; row++) {
      for (let col = 0; col < size.cols; col++) {
        const pos: Position = { row, col };
        if (isBlocked(pos)) {
          setCell(grid, pos, BLOCKED);
        }
      }
    }
  }

  for (let row = 0; row < size.rows; row++) {
    for (let col = 0; col < size.cols; col++) {
      const pos: Position = { row, col };
      if (isBlocked?.(pos)) {
        continue;
      }
      const forbidden = collectForbiddenKinds(grid, pos);
      const kind = pickTileKind(numKinds, forbidden, rng);
      setCell(grid, pos, kind);
    }
  }

  return grid;
}

function collectForbiddenKinds(grid: Grid, pos: Position): Set<TileKind> {
  const forbidden = new Set<TileKind>();
  const { row, col } = pos;

  if (col >= 2) {
    const left1 = grid[row]![col - 1]!;
    const left2 = grid[row]![col - 2]!;
    if (isNormalColor(left1) && isNormalColor(left2) && left1 === left2) {
      forbidden.add(left1);
    }
  }

  if (row >= 2) {
    const up1 = grid[row - 1]![col]!;
    const up2 = grid[row - 2]![col]!;
    if (isNormalColor(up1) && isNormalColor(up2) && up1 === up2) {
      forbidden.add(up1);
    }
  }

  if (row >= 1 && col >= 1) {
    const tl = grid[row - 1]![col - 1]!;
    const tr = grid[row - 1]![col]!;
    const bl = grid[row]![col - 1]!;
    if (isNormalColor(tl) && isNormalColor(tr) && isNormalColor(bl) && tl === tr && tr === bl) {
      forbidden.add(tl);
    }
  }

  return forbidden;
}

function pickTileKind(numKinds: number, forbidden: Set<TileKind>, rng: Rng): TileKind {
  const candidates: TileKind[] = [];
  for (let k = 0; k < numKinds; k++) {
    if (!forbidden.has(k)) {
      candidates.push(k);
    }
  }

  if (candidates.length === 0) {
    // Rare when numKinds is small and the board is tight — fall back to any kind.
    return rng.nextInt(numKinds) as TileKind;
  }

  return candidates[rng.nextInt(candidates.length)]!;
}
