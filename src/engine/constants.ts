/** Minimum run length that counts as a match (classic match-3). */
export const MIN_MATCH_LENGTH = 3;

/** Line length (horizontal or vertical) required to spawn a bomb. */
export const MIN_LINE_LENGTH_FOR_BOMB = 4;

/** Safety cap so a pathological board cannot infinite-loop the cascade resolver. */
export const MAX_CASCADE_STEPS = 200;

/** Default number of distinct tile kinds for random boards and refills. */
export const DEFAULT_TILE_KIND_COUNT = 6;

/** Points added per cleared tile (each cell in a cascade wave or bomb blast). */
export const POINTS_PER_CLEARED_TILE = 4;

/** Countdown length when a level does not set `timeLimitSeconds` (seconds). */
export const DEFAULT_LEVEL_TIME_SECONDS = 75;

/**
 * Extra seconds added to the clock per cleared tile in a match wave or bomb blast (scaled below).
 * Keeps short rounds playable when combined with {@link TIME_BONUS_PER_MATCH_WAVE_BASE}.
 */
export const TIME_BONUS_PER_CLEARED_TILE = 0.55;

/** Flat seconds added on top of the per-tile bonus for each scoring wave / blast. */
export const TIME_BONUS_PER_MATCH_WAVE_BASE = 4;

/** Upper cap for a single bonus tick (one cascade wave or one bomb blast). */
export const TIME_BONUS_SINGLE_EVENT_CAP = 12;

/** Seconds granted for one scoring event (blast area or one cascade wave). */
export function computeTimeBonusSeconds(tilesCleared: number): number {
  if (tilesCleared <= 0) {
    return 0;
  }
  const raw = TIME_BONUS_PER_MATCH_WAVE_BASE + tilesCleared * TIME_BONUS_PER_CLEARED_TILE;
  return Math.min(TIME_BONUS_SINGLE_EVENT_CAP, Math.max(1, Math.round(raw)));
}

/**
 * Used by **Normal** difficulty: when false, the timer can reach zero without ending the run.
 * **Relaxed** never ends on time; **Time pressure** always ends when time hits zero.
 */
export const ENABLE_TIME_UP_GAME_OVER = false;
