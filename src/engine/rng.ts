/**
 * Deterministic PRNG for reproducible boards and tests.
 * Uses a 32-bit mulberry32 generator (small, fast, good enough for gameplay).
 */

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
}

/** FNV-1a style mix — turns arbitrary strings into a 32-bit seed. */
export function hashStringToSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Creates a seeded RNG. The same seed produces the same sequence on all runs.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    nextInt(maxExclusive: number): number {
      if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
        throw new Error('maxExclusive must be a positive finite number');
      }
      return Math.floor(next() * maxExclusive);
    },
  };
}
