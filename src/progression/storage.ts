import type { DailyProgress, LifetimeStats, StoredProgressV1 } from './types';

const STORAGE_KEY = 'matchgrid-progress-v1';

function defaultLifetime(): LifetimeStats {
  return {
    lifetimeTilesCleared: 0,
    lifetimeBombsDetonated: 0,
    lifetimeSwapsMade: 0,
    levelsCompletedTotal: 0,
    highestSingleTurnTiles: 0,
    longestCascadeChain: 0,
    totalScoreAccumulated: 0,
    gamesStarted: 0,
  };
}

function defaultDaily(dateKey: string, missionIds: readonly string[]): DailyProgress {
  return {
    dateKey,
    tilesCleared: 0,
    levelsCompleted: 0,
    bombsDetonated: 0,
    swapsMade: 0,
    bestChainToday: 0,
    activeMissionIds: missionIds,
  };
}

export function utcDateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function loadProgress(
  pickMissionIds: (dateKey: string) => readonly string[],
): StoredProgressV1 {
  if (typeof localStorage === 'undefined') {
    const key = utcDateKey();
    return {
      version: 1,
      unlockedAchievementIds: [],
      stats: defaultLifetime(),
      daily: defaultDaily(key, pickMissionIds(key)),
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const key = utcDateKey();
      return {
        version: 1,
        unlockedAchievementIds: [],
        stats: defaultLifetime(),
        daily: defaultDaily(key, pickMissionIds(key)),
      };
    }
    const parsed = JSON.parse(raw) as StoredProgressV1;
    if (parsed.version !== 1 || !parsed.stats) {
      throw new Error('bad format');
    }
    const today = utcDateKey();
    if (parsed.daily.dateKey !== today) {
      return {
        ...parsed,
        daily: defaultDaily(today, pickMissionIds(today)),
      };
    }
    const ids = pickMissionIds(parsed.daily.dateKey);
    if (
      !parsed.daily.activeMissionIds ||
      parsed.daily.activeMissionIds.length !== ids.length
    ) {
      return {
        ...parsed,
        daily: {
          ...parsed.daily,
          activeMissionIds: ids,
        },
      };
    }
    return parsed;
  } catch {
    const key = utcDateKey();
    return {
      version: 1,
      unlockedAchievementIds: [],
      stats: defaultLifetime(),
      daily: defaultDaily(key, pickMissionIds(key)),
    };
  }
}

export function saveProgress(progress: StoredProgressV1): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* quota / private mode */
  }
}
