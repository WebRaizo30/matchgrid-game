/**
 * Player profile and mission state persisted in localStorage.
 */
export interface LifetimeStats {
  readonly lifetimeTilesCleared: number;
  readonly lifetimeBombsDetonated: number;
  readonly lifetimeSwapsMade: number;
  readonly levelsCompletedTotal: number;
  readonly highestSingleTurnTiles: number;
  readonly longestCascadeChain: number;
  readonly totalScoreAccumulated: number;
  readonly gamesStarted: number;
}

export interface DailyProgress {
  /** UTC calendar day `YYYY-MM-DD`. */
  readonly dateKey: string;
  readonly tilesCleared: number;
  readonly levelsCompleted: number;
  readonly bombsDetonated: number;
  readonly swapsMade: number;
  /** Best cascade wave count in a single turn today. */
  readonly bestChainToday: number;
  /** Three mission definition ids valid for `dateKey`. */
  readonly activeMissionIds: readonly string[];
}

export interface StoredProgressV1 {
  readonly version: 1;
  readonly unlockedAchievementIds: readonly string[];
  readonly stats: LifetimeStats;
  readonly daily: DailyProgress;
}

export type AchievementCategory =
  | 'chains'
  | 'clears'
  | 'explosives'
  | 'campaign'
  | 'dedication'
  | 'mastery';

export interface AchievementDef {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly category: AchievementCategory;
}

export interface DailyMissionDef {
  readonly id: string;
  readonly description: string;
  readonly target: number;
  readonly metric: 'daily_tiles' | 'daily_levels' | 'daily_bombs' | 'daily_best_chain';
}

/** Emitted when a swap or bomb cascade fully resolves. */
export interface TurnStatsPayload {
  readonly tilesThisTurn: number;
  readonly cascadeWaves: number;
  readonly input: 'swap' | 'bomb';
}
