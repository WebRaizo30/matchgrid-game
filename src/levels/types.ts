/**
 * Level metadata — board shape and deterministic mixing with the global RNG seed.
 * (Goals and move limits can extend this type later.)
 */
export interface LevelDefinition {
  readonly id: string;
  readonly title: string;
  readonly rows: number;
  readonly cols: number;
  /**
   * Mixed into the URL seed so different levels stay distinct when `?seed=` is fixed.
   */
  readonly salt: number;
  /** Reach this score (from cleared tiles) to unlock the next level. */
  readonly targetScore: number;
  /**
   * Countdown in seconds. Omit to use `DEFAULT_LEVEL_TIME_SECONDS`; `0` disables the timer.
   */
  readonly timeLimitSeconds?: number;
  /**
   * Optional obstacle grid (same `rows` × `cols`). `true` = permanent block.
   */
  readonly obstacles?: readonly (readonly boolean[])[];
  /**
   * Alternative: one ASCII row per board row (`#` = block, `.` = play). Overrides `obstacles` when set.
   */
  readonly obstaclePattern?: readonly string[];
}
