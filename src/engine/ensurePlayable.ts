import { fillGridWithoutImmediateMatches } from './initialBoard';
import {
  cloneGrid,
  getCell,
  gridSize,
  isSwapAllowed,
  orthogonalNeighbors,
  setCell,
  trySwap,
  type Grid,
} from './grid';
import { hasLegalMove } from './legalMoves';
import { findMatchingPositions, wouldSwapCreateMatch } from './match';
import { createRng, type Rng } from './rng';
import { mixSeed } from './seedMix';
import type { GridSize, Position } from './types';

/** Random fills before shuffle / inject (dense obstacles rarely succeed here; long runs only slow loads). */
const MAX_FILL_ATTEMPTS = 3_500;

/**
 * Adjacent swaps that do not create an immediate match (walk the configuration space).
 * Kept moderate: checker / dense obstacle stages hit the inject + safety path quickly instead of freezing the UI.
 */
const MAX_SHUFFLE_STEPS = 900;

/** Extra fill + inject passes after shuffle. */
const MAX_INJECT_REFILL = 3_000;

function playable(isBlocked: ((pos: Position) => boolean) | undefined, pos: Position): boolean {
  return !isBlocked?.(pos);
}

function copyGridInto(target: Grid, source: Grid): void {
  const size = gridSize(source);
  for (let r = 0; r < size.rows; r++) {
    for (let c = 0; c < size.cols; c++) {
      const p: Position = { row: r, col: c };
      setCell(target, p, getCell(source, p));
    }
  }
}

/**
 * One random orthogonal swap that does not leave the board in an auto-match state.
 * Returns true if a swap was applied.
 */
function tryRandomNonMatchingSwap(grid: Grid, size: GridSize, rng: Rng): boolean {
  for (let attempt = 0; attempt < 160; attempt++) {
    const r = rng.nextInt(size.rows);
    const c = rng.nextInt(size.cols);
    const a: Position = { row: r, col: c };
    const neighbors = orthogonalNeighbors(size, a);
    if (neighbors.length === 0) {
      continue;
    }
    const b = neighbors[rng.nextInt(neighbors.length)]!;
    if (!isSwapAllowed(grid, size, a, b)) {
      continue;
    }
    trySwap(grid, size, a, b);
    if (findMatchingPositions(grid).length === 0) {
      return true;
    }
    trySwap(grid, size, a, b);
  }
  return false;
}

/**
 * Pattern (row r): 0 — 1 — 0 and (r+1, c+1): 0. Vertical swap on center creates a horizontal triple.
 * Requires a 2×3 playable block.
 */
function tryInjectVerticalSwap(
  grid: Grid,
  size: GridSize,
  isBlocked: ((pos: Position) => boolean) | undefined,
  numKinds: number,
): boolean {
  if (numKinds < 2 || size.rows < 2 || size.cols < 3) {
    return false;
  }

  for (let r = 0; r < size.rows - 1; r++) {
    for (let c = 0; c < size.cols - 2; c++) {
      const p0: Position = { row: r, col: c };
      const p1: Position = { row: r, col: c + 1 };
      const p2: Position = { row: r, col: c + 2 };
      const pb: Position = { row: r + 1, col: c + 1 };
      if (!playable(isBlocked, p0) || !playable(isBlocked, p1) || !playable(isBlocked, p2) || !playable(isBlocked, pb)) {
        continue;
      }

      const backup = cloneGrid(grid);
      setCell(grid, p0, 0);
      setCell(grid, p1, 1);
      setCell(grid, p2, 0);
      setCell(grid, pb, 0);

      if (findMatchingPositions(grid).length > 0) {
        copyGridInto(grid, backup);
        continue;
      }
      if (!wouldSwapCreateMatch(grid, p1, pb)) {
        copyGridInto(grid, backup);
        continue;
      }
      if (!hasLegalMove(grid)) {
        copyGridInto(grid, backup);
        continue;
      }
      return true;
    }
  }
  return false;
}

/**
 * Single row, ≥5 columns: 0 0 1 0 0 — swap (c+2) with (c+3) gives three zeros.
 */
function tryInjectHorizontalFive(
  grid: Grid,
  size: GridSize,
  isBlocked: ((pos: Position) => boolean) | undefined,
  numKinds: number,
): boolean {
  if (numKinds < 2 || size.rows !== 1 || size.cols < 5) {
    return false;
  }

  const r = 0;
  for (let c = 0; c <= size.cols - 5; c++) {
    const ps: Position[] = [
      { row: r, col: c },
      { row: r, col: c + 1 },
      { row: r, col: c + 2 },
      { row: r, col: c + 3 },
      { row: r, col: c + 4 },
    ];
    if (!ps.every((p) => playable(isBlocked, p))) {
      continue;
    }

    const backup = cloneGrid(grid);
    setCell(grid, ps[0]!, 0);
    setCell(grid, ps[1]!, 0);
    setCell(grid, ps[2]!, 1);
    setCell(grid, ps[3]!, 0);
    setCell(grid, ps[4]!, 0);

    if (findMatchingPositions(grid).length > 0) {
      copyGridInto(grid, backup);
      continue;
    }
    const mid = { row: r, col: c + 2 };
    const right = { row: r, col: c + 3 };
    if (!wouldSwapCreateMatch(grid, mid, right)) {
      copyGridInto(grid, backup);
      continue;
    }
    if (!hasLegalMove(grid)) {
      copyGridInto(grid, backup);
      continue;
    }
    return true;
  }
  return false;
}

function tryInjectAny(grid: Grid, size: GridSize, isBlocked: ((pos: Position) => boolean) | undefined, numKinds: number): boolean {
  return (
    tryInjectVerticalSwap(grid, size, isBlocked, numKinds) ||
    tryInjectHorizontalFive(grid, size, isBlocked, numKinds)
  );
}

/**
 * Builds a board with no immediate matches and at least one legal player move (swap or bomb).
 * Uses many random fills, non-matching shuffles, then deterministic pattern injection.
 */
export function buildPlayableInitialGrid(
  size: GridSize,
  numKinds: number,
  baseSeed: number,
  salt: number,
  isBlocked?: (pos: Position) => boolean,
): Grid {
  for (let attempt = 0; attempt < MAX_FILL_ATTEMPTS; attempt++) {
    const rng = createRng(mixSeed(baseSeed, salt + attempt * 1315423911));
    const grid = fillGridWithoutImmediateMatches(size, numKinds, rng, isBlocked);
    if (findMatchingPositions(grid).length === 0 && hasLegalMove(grid)) {
      return grid;
    }
  }

  const rng0 = createRng(mixSeed(baseSeed, salt ^ 0xdeadbeef));
  let grid = fillGridWithoutImmediateMatches(size, numKinds, rng0, isBlocked);

  /** Cheap win before the shuffle loop (e.g. checker boards where inject fixes a dead fill). */
  if (
    tryInjectAny(grid, size, isBlocked, numKinds) &&
    hasLegalMove(grid) &&
    findMatchingPositions(grid).length === 0
  ) {
    return grid;
  }

  for (let step = 0; step < MAX_SHUFFLE_STEPS; step++) {
    if (hasLegalMove(grid) && findMatchingPositions(grid).length === 0) {
      return grid;
    }
    const srng = createRng(mixSeed(baseSeed, salt + step * 0x85ebca6b));
    if (!tryRandomNonMatchingSwap(grid, gridSize(grid), srng)) {
      grid = fillGridWithoutImmediateMatches(
        size,
        numKinds,
        createRng(mixSeed(baseSeed, salt + step * 0x9e3779b9 + 0x4f2a)),
        isBlocked,
      );
    }
  }

  if (tryInjectAny(grid, size, isBlocked, numKinds)) {
    return grid;
  }

  for (let j = 0; j < MAX_INJECT_REFILL; j++) {
    const rng = createRng(mixSeed(baseSeed, salt + j * 0x4f2a + 0x6a09e667));
    grid = fillGridWithoutImmediateMatches(size, numKinds, rng, isBlocked);
    if (tryInjectAny(grid, size, isBlocked, numKinds)) {
      return grid;
    }
  }

  /** Last resort: cheap refills until stable + playable (avoids returning a dead board). */
  for (let safety = 0; safety < 6_000; safety++) {
    if (hasLegalMove(grid) && findMatchingPositions(grid).length === 0) {
      return grid;
    }
    const rng = createRng(mixSeed(baseSeed, salt + safety * 0x9e3779b1 + 0x4b82f2b8));
    grid = fillGridWithoutImmediateMatches(size, numKinds, rng, isBlocked);
    if (tryInjectAny(grid, size, isBlocked, numKinds) && hasLegalMove(grid) && findMatchingPositions(grid).length === 0) {
      return grid;
    }
  }

  return grid;
}
