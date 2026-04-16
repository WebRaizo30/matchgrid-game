import type { Grid } from './grid';
import { isSwapAllowed, trySwap } from './grid';
import { findMatchingPositions } from './match';
import type { GridSize, Position } from './types';

/**
 * Classic match-3 rule: a swap is legal only if it creates at least one new match.
 * On failure the grid is restored to its original state.
 */
export function tryPlayerSwap(grid: Grid, size: GridSize, a: Position, b: Position): boolean {
  if (!isSwapAllowed(grid, size, a, b)) {
    return false;
  }

  trySwap(grid, size, a, b);

  if (findMatchingPositions(grid).length === 0) {
    trySwap(grid, size, a, b);
    return false;
  }

  return true;
}
