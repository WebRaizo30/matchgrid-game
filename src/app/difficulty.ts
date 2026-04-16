import { DEFAULT_LEVEL_TIME_SECONDS, ENABLE_TIME_UP_GAME_OVER } from '../engine/constants';
import type { LevelDefinition } from '../levels/types';

export type DifficultyId = 'relaxed' | 'normal' | 'pressure';

export const DIFFICULTY_STORAGE_KEY = 'matchgrid-difficulty';

/** Set when the player has confirmed difficulty once (or migrated from older saves). */
export const DIFFICULTY_ONBOARDED_KEY = 'matchgrid-difficulty-onboarded';

export interface SessionTiming {
  readonly timeLimitSeconds: number;
  readonly timeUpEndsRun: boolean;
}

export function parseDifficultyFromSearch(): DifficultyId | null {
  const raw = new URLSearchParams(window.location.search).get('difficulty');
  if (raw === 'relaxed' || raw === 'normal' || raw === 'pressure') {
    return raw;
  }
  return null;
}

export function isDifficultyOnboarded(): boolean {
  if (typeof localStorage === 'undefined') {
    return true;
  }
  try {
    if (localStorage.getItem(DIFFICULTY_ONBOARDED_KEY) === '1') {
      return true;
    }
    if (localStorage.getItem(DIFFICULTY_STORAGE_KEY)) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function markDifficultyOnboarded(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(DIFFICULTY_ONBOARDED_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** First visit without `?difficulty=` — show the pre-game picker once. */
export function shouldShowDifficultyGate(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (parseDifficultyFromSearch()) {
    return false;
  }
  return !isDifficultyOnboarded();
}

/** URL overrides localStorage; default is Normal. */
export function loadDifficulty(): DifficultyId {
  const fromUrl = parseDifficultyFromSearch();
  if (fromUrl) {
    return fromUrl;
  }
  if (typeof localStorage === 'undefined') {
    return 'normal';
  }
  try {
    const s = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (s === 'relaxed' || s === 'normal' || s === 'pressure') {
      return s;
    }
  } catch {
    /* ignore */
  }
  return 'normal';
}

export function persistDifficulty(id: DifficultyId): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(DIFFICULTY_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** Keeps `difficulty` in the query string in sync with {@link loadDifficulty}. */
export function applyDifficultyToParams(params: URLSearchParams): void {
  params.set('difficulty', loadDifficulty());
}

/**
 * Level timer: `0` = off; omit = {@link DEFAULT_LEVEL_TIME_SECONDS}.
 * - Relaxed: no countdown, never lose on time.
 * - Normal: level rules; game over on time only if {@link ENABLE_TIME_UP_GAME_OVER}.
 * - Time pressure: if the level disables the timer, a default countdown is used; always lose when time hits 0.
 */
export function resolveSessionTiming(level: LevelDefinition, difficulty: DifficultyId): SessionTiming {
  const levelSeconds =
    level.timeLimitSeconds === undefined
      ? DEFAULT_LEVEL_TIME_SECONDS
      : level.timeLimitSeconds === 0
        ? 0
        : level.timeLimitSeconds;

  if (difficulty === 'relaxed') {
    return { timeLimitSeconds: 0, timeUpEndsRun: false };
  }
  if (difficulty === 'normal') {
    return {
      timeLimitSeconds: levelSeconds,
      timeUpEndsRun: ENABLE_TIME_UP_GAME_OVER,
    };
  }
  if (levelSeconds === 0) {
    return {
      timeLimitSeconds: DEFAULT_LEVEL_TIME_SECONDS,
      timeUpEndsRun: true,
    };
  }
  return {
    timeLimitSeconds: levelSeconds,
    timeUpEndsRun: true,
  };
}
