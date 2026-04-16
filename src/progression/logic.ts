import { ACHIEVEMENTS, DAILY_MISSION_POOL, DAILY_PICK_COUNT } from './definitions';
import type { AchievementDef, DailyMissionDef, LifetimeStats, StoredProgressV1, TurnStatsPayload } from './types';

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic daily mission line-up from the UTC date string. */
export function pickDailyMissionIds(dateKey: string): readonly string[] {
  const pool = DAILY_MISSION_POOL.map((m) => m.id);
  const out: string[] = [];
  let state = hashString(`missions:${dateKey}`);
  const nextRand = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
  while (out.length < DAILY_PICK_COUNT && pool.length) {
    const idx = Math.floor(nextRand() * pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

export function missionDefById(id: string): DailyMissionDef | undefined {
  return DAILY_MISSION_POOL.find((m) => m.id === id);
}

export function missionProgress(
  def: DailyMissionDef,
  daily: StoredProgressV1['daily'],
): { current: number; target: number; complete: boolean } {
  let current = 0;
  switch (def.metric) {
    case 'daily_tiles':
      current = daily.tilesCleared;
      break;
    case 'daily_levels':
      current = daily.levelsCompleted;
      break;
    case 'daily_bombs':
      current = daily.bombsDetonated;
      break;
    case 'daily_best_chain':
      current = daily.bestChainToday;
      break;
    default:
      current = 0;
  }
  return {
    current,
    target: def.target,
    complete: current >= def.target,
  };
}

const UNLOCK_RULES: Record<string, (s: LifetimeStats) => boolean> = {
  'clear-8-one-turn': (s) => s.highestSingleTurnTiles >= 8,
  'clear-12-one-turn': (s) => s.highestSingleTurnTiles >= 12,
  'clear-16-one-turn': (s) => s.highestSingleTurnTiles >= 16,
  'clear-20-one-turn': (s) => s.highestSingleTurnTiles >= 20,
  'clear-28-one-turn': (s) => s.highestSingleTurnTiles >= 28,
  'clear-36-one-turn': (s) => s.highestSingleTurnTiles >= 36,
  'chain-2': (s) => s.longestCascadeChain >= 2,
  'chain-3': (s) => s.longestCascadeChain >= 3,
  'chain-4': (s) => s.longestCascadeChain >= 4,
  'chain-5': (s) => s.longestCascadeChain >= 5,
  'chain-6': (s) => s.longestCascadeChain >= 6,
  'chain-8': (s) => s.longestCascadeChain >= 8,
  'chain-10': (s) => s.longestCascadeChain >= 10,
  'bombs-5': (s) => s.lifetimeBombsDetonated >= 5,
  'bombs-25': (s) => s.lifetimeBombsDetonated >= 25,
  'bombs-100': (s) => s.lifetimeBombsDetonated >= 100,
  'bombs-500': (s) => s.lifetimeBombsDetonated >= 500,
  'tiles-500': (s) => s.lifetimeTilesCleared >= 500,
  'tiles-2000': (s) => s.lifetimeTilesCleared >= 2000,
  'tiles-10000': (s) => s.lifetimeTilesCleared >= 10000,
  'tiles-50000': (s) => s.lifetimeTilesCleared >= 50000,
  'tiles-100000': (s) => s.lifetimeTilesCleared >= 100000,
  'swaps-100': (s) => s.lifetimeSwapsMade >= 100,
  'swaps-1000': (s) => s.lifetimeSwapsMade >= 1000,
  'swaps-5000': (s) => s.lifetimeSwapsMade >= 5000,
  'levels-1': (s) => s.levelsCompletedTotal >= 1,
  'levels-5': (s) => s.levelsCompletedTotal >= 5,
  'levels-10': (s) => s.levelsCompletedTotal >= 10,
  'levels-25': (s) => s.levelsCompletedTotal >= 25,
  'levels-50': (s) => s.levelsCompletedTotal >= 50,
  'levels-100': (s) => s.levelsCompletedTotal >= 100,
  'levels-250': (s) => s.levelsCompletedTotal >= 250,
  'levels-500': (s) => s.levelsCompletedTotal >= 500,
  'score-10k': (s) => s.totalScoreAccumulated >= 10_000,
  'score-50k': (s) => s.totalScoreAccumulated >= 50_000,
  'score-250k': (s) => s.totalScoreAccumulated >= 250_000,
  'score-1m': (s) => s.totalScoreAccumulated >= 1_000_000,
  'record-tiles-40': (s) => s.highestSingleTurnTiles >= 40,
  'games-10': (s) => s.gamesStarted >= 10,
  'games-50': (s) => s.gamesStarted >= 50,
  'games-200': (s) => s.gamesStarted >= 200,
};

function collectNewUnlocks(
  stats: LifetimeStats,
  already: ReadonlySet<string>,
): AchievementDef[] {
  const out: AchievementDef[] = [];
  for (const def of ACHIEVEMENTS) {
    if (already.has(def.id)) {
      continue;
    }
    const rule = UNLOCK_RULES[def.id];
    if (rule?.(stats)) {
      out.push(def);
    }
  }
  return out;
}

export function applyTurnStats(
  progress: StoredProgressV1,
  turn: TurnStatsPayload,
): { next: StoredProgressV1; newlyUnlocked: AchievementDef[] } {
  const stats: LifetimeStats = {
    ...progress.stats,
    lifetimeTilesCleared: progress.stats.lifetimeTilesCleared + turn.tilesThisTurn,
    lifetimeBombsDetonated:
      progress.stats.lifetimeBombsDetonated + (turn.input === 'bomb' ? 1 : 0),
    lifetimeSwapsMade: progress.stats.lifetimeSwapsMade + (turn.input === 'swap' ? 1 : 0),
    highestSingleTurnTiles: Math.max(progress.stats.highestSingleTurnTiles, turn.tilesThisTurn),
    longestCascadeChain: Math.max(progress.stats.longestCascadeChain, turn.cascadeWaves),
    levelsCompletedTotal: progress.stats.levelsCompletedTotal,
    totalScoreAccumulated: progress.stats.totalScoreAccumulated,
    gamesStarted: progress.stats.gamesStarted,
  };

  const daily = {
    ...progress.daily,
    tilesCleared: progress.daily.tilesCleared + turn.tilesThisTurn,
    bombsDetonated: progress.daily.bombsDetonated + (turn.input === 'bomb' ? 1 : 0),
    swapsMade: progress.daily.swapsMade + (turn.input === 'swap' ? 1 : 0),
    bestChainToday: Math.max(progress.daily.bestChainToday, turn.cascadeWaves),
  };

  const unlockedSet = new Set(progress.unlockedAchievementIds);
  const newlyUnlocked = collectNewUnlocks(stats, unlockedSet);
  for (const a of newlyUnlocked) {
    unlockedSet.add(a.id);
  }

  const next: StoredProgressV1 = {
    ...progress,
    stats,
    daily,
    unlockedAchievementIds: [...unlockedSet],
  };

  return { next, newlyUnlocked };
}

export function applyLevelWin(
  progress: StoredProgressV1,
  scoreEarned: number,
): { next: StoredProgressV1; newlyUnlocked: AchievementDef[] } {
  const stats: LifetimeStats = {
    ...progress.stats,
    levelsCompletedTotal: progress.stats.levelsCompletedTotal + 1,
    totalScoreAccumulated: progress.stats.totalScoreAccumulated + Math.max(0, scoreEarned),
  };

  const daily = {
    ...progress.daily,
    levelsCompleted: progress.daily.levelsCompleted + 1,
  };

  const unlockedSet = new Set(progress.unlockedAchievementIds);
  const newlyUnlocked = collectNewUnlocks(stats, unlockedSet);
  for (const a of newlyUnlocked) {
    unlockedSet.add(a.id);
  }

  return {
    next: {
      ...progress,
      stats,
      daily,
      unlockedAchievementIds: [...unlockedSet],
    },
    newlyUnlocked,
  };
}

export function registerGameStart(progress: StoredProgressV1): {
  next: StoredProgressV1;
  newlyUnlocked: AchievementDef[];
} {
  const stats: LifetimeStats = {
    ...progress.stats,
    gamesStarted: progress.stats.gamesStarted + 1,
  };
  const unlockedSet = new Set(progress.unlockedAchievementIds);
  const newlyUnlocked = collectNewUnlocks(stats, unlockedSet);
  for (const a of newlyUnlocked) {
    unlockedSet.add(a.id);
  }
  return {
    next: {
      ...progress,
      stats,
      unlockedAchievementIds: [...unlockedSet],
    },
    newlyUnlocked,
  };
}

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
