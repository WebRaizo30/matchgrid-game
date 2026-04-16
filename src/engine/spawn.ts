import type { Position, TileKind } from './types';
import type { Rng } from './rng';

/**
 * Uniform random refills — used by `refillNulls` / cascade after gravity.
 * Position is passed through for themed spawners later (e.g. bias by column).
 */
export function createUniformTileSpawn(numKinds: number, rng: Rng): (pos: Position) => TileKind {
  if (!Number.isFinite(numKinds) || numKinds <= 0) {
    throw new Error('numKinds must be a positive finite number');
  }
  return (_pos: Position) => rng.nextInt(numKinds) as TileKind;
}
