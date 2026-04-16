import type { GridSize, Position } from '../engine/types';
import type { LevelDefinition } from './types';

/**
 * `'#'` or `'X'` = obstacle, `'.'` = playable. One string per row; length must match `size.cols`.
 * In the returned mask, `true` means blocked.
 */
export function parseObstaclePattern(rows: readonly string[], size: GridSize): boolean[][] {
  if (rows.length !== size.rows) {
    throw new Error(`Obstacle pattern rows ${rows.length} !== board rows ${size.rows}`);
  }
  return rows.map((line, r) => {
    if (line.length !== size.cols) {
      throw new Error(`Obstacle row ${r} length ${line.length} !== cols ${size.cols}`);
    }
    return [...line].map((ch) => ch === '#' || ch === 'X');
  });
}

/** Returns a predicate used by the board generator, or `undefined` when there are no obstacles. */
export function resolveObstacleChecker(
  level: LevelDefinition,
): ((pos: Position) => boolean) | undefined {
  if (level.obstaclePattern) {
    const mask = parseObstaclePattern(level.obstaclePattern, {
      rows: level.rows,
      cols: level.cols,
    });
    return (pos) => mask[pos.row]![pos.col]!;
  }
  if (level.obstacles) {
    const obs = level.obstacles;
    return (pos) => obs[pos.row]?.[pos.col] ?? false;
  }
  return undefined;
}

/**
 * Match-3 swaps require two orthogonally adjacent playable (non-obstacle) cells.
 * Some masks (e.g. a perfect checkerboard) place playables on one parity only, so no such pair exists.
 *
 * @param blocked Row-major mask where `true` means blocked / obstacle.
 */
export function obstacleMaskHasAdjacentPlayablePair(blocked: readonly (readonly boolean[])[]): boolean {
  const rows = blocked.length;
  if (rows === 0) {
    return false;
  }
  const cols = blocked[0]!.length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (blocked[r]![c]) {
        continue;
      }
      if (c + 1 < cols && !blocked[r]![c + 1]) {
        return true;
      }
      if (r + 1 < rows && !blocked[r + 1]![c]) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Opens blocked cells until {@link obstacleMaskHasAdjacentPlayablePair} holds.
 * Mutates `blocked` in place.
 */
export function ensureObstacleMaskHasAdjacentPlayablePair(blocked: boolean[][], rng: () => number): void {
  if (obstacleMaskHasAdjacentPlayablePair(blocked)) {
    return;
  }
  const rows = blocked.length;
  const cols = blocked[0]!.length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!blocked[r]![c]) {
        if (c + 1 < cols && blocked[r]![c + 1]) {
          blocked[r]![c + 1] = false;
          return;
        }
        if (r + 1 < rows && blocked[r + 1]![c]) {
          blocked[r + 1]![c] = false;
          return;
        }
      }
    }
  }
  let guard = 0;
  const max = rows * cols * 10;
  while (guard < max) {
    const r = Math.floor(rng() * rows);
    const c = Math.floor(rng() * cols);
    if (blocked[r]![c]) {
      blocked[r]![c] = false;
      if (obstacleMaskHasAdjacentPlayablePair(blocked)) {
        return;
      }
    }
    guard++;
  }
}
