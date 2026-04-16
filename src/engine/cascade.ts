import { MAX_CASCADE_STEPS } from './constants';
import type { Grid } from './grid';
import { getCell, gridSize, setCell } from './grid';
import { applyGravity, clearCells, refillNulls } from './gravity';
import { findMatchResolution } from './match';
import type { BombTile, GridSize, Position, TileKind } from './types';
import { isBlocked } from './types';

export interface CascadeResult {
  /** Each wave is the set of cells cleared before gravity + refill for that step. */
  readonly waves: Position[][];
  /** True if the loop stopped only because no matches remained. */
  readonly settled: boolean;
  /** How many clear cycles ran (same as waves.length when settled). */
  readonly steps: number;
}

/**
 * After a bomb or other non-match clear, tiles must fall and empty cells spawn new pieces
 * even when {@link applyOneCascadeWave} finds no match yet.
 */
export function settleGravityAndRefill(
  grid: Grid,
  size: GridSize,
  spawn: (pos: Position) => TileKind,
): void {
  applyGravity(grid, size);
  refillNulls(grid, size, spawn);
}

/**
 * One cascade wave: detect matches, clear, spawn bombs, gravity, refill.
 * Returns cleared positions, or `null` if the board has no matches.
 */
export function applyOneCascadeWave(
  grid: Grid,
  size: GridSize,
  spawn: (pos: Position) => TileKind,
): Position[] | null {
  const resolution = findMatchResolution(grid);
  if (resolution.clearPositions.length === 0) {
    return null;
  }
  const wave = [...resolution.clearPositions];
  clearCells(grid, resolution.clearPositions);

  for (const b of resolution.bombSpawns) {
    if (!isBlocked(getCell(grid, b.pos))) {
      const bomb: BombTile = { type: 'bomb', color: b.color };
      setCell(grid, b.pos, bomb);
    }
  }

  applyGravity(grid, size);
  refillNulls(grid, size, spawn);
  return wave;
}

/**
 * Repeatedly clears matches, applies gravity, and spawns tiles until stable or `maxSteps` is hit.
 * Four or more in a line spawns a bomb at the segment center after the clear.
 * Mutates `grid` in place.
 */
export function resolveCascade(
  grid: Grid,
  size: GridSize,
  spawn: (pos: Position) => TileKind,
  maxSteps: number = MAX_CASCADE_STEPS,
): CascadeResult {
  const waves: Position[][] = [];

  for (let step = 0; step < maxSteps; step++) {
    const wave = applyOneCascadeWave(grid, size, spawn);
    if (!wave) {
      return { waves, settled: true, steps: step };
    }
    waves.push(wave);
  }

  return { waves, settled: false, steps: maxSteps };
}

/** Convenience when `size` should match the current grid dimensions. */
export function resolveCascadeForGrid(
  grid: Grid,
  spawn: (pos: Position) => TileKind,
  maxSteps?: number,
): CascadeResult {
  return resolveCascade(grid, gridSize(grid), spawn, maxSteps);
}
