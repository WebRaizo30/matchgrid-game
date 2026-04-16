import type { Grid } from './grid';
import { getCell, gridSize, isSwapAllowed } from './grid';
import { wouldSwapCreateMatch } from './match';
import type { Position } from './types';
import { isBomb } from './types';

/**
 * True if the player can act: tap a bomb, or swap two adjacent tiles to form a match.
 */
export function hasLegalMove(grid: Grid): boolean {
  const size = gridSize(grid);

  for (let r = 0; r < size.rows; r++) {
    for (let c = 0; c < size.cols; c++) {
      if (isBomb(getCell(grid, { row: r, col: c }))) {
        return true;
      }
    }
  }

  for (let r = 0; r < size.rows; r++) {
    for (let c = 0; c < size.cols; c++) {
      const a: Position = { row: r, col: c };
      const right: Position = { row: r, col: c + 1 };
      if (c + 1 < size.cols && isSwapAllowed(grid, size, a, right) && wouldSwapCreateMatch(grid, a, right)) {
        return true;
      }
      const down: Position = { row: r + 1, col: c };
      if (r + 1 < size.rows && isSwapAllowed(grid, size, a, down) && wouldSwapCreateMatch(grid, a, down)) {
        return true;
      }
    }
  }

  return false;
}
