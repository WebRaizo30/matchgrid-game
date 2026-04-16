import { resolveSessionTiming } from './difficulty';
import type { SessionTiming } from './difficulty';
import { computeTimeBonusSeconds, DEFAULT_TILE_KIND_COUNT, POINTS_PER_CLEARED_TILE } from '../engine/constants';
import { areOrthogonalNeighbors, getCell } from '../engine/grid';
import { hasLegalMove } from '../engine/legalMoves';
import { applyOneCascadeWave, settleGravityAndRefill } from '../engine/cascade';
import { explodeBombAt } from '../engine/specials';
import { buildPlayableInitialGrid } from '../engine/ensurePlayable';
import { tryPlayerSwap } from '../engine/move';
import { createRng } from '../engine/rng';
import { mixSeed } from '../engine/seedMix';
import { createUniformTileSpawn } from '../engine/spawn';
import type { GridSize, Position } from '../engine/types';
import { isBomb } from '../engine/types';
import { getLevelOrDefault } from '../levels/catalog';
import { resolveObstacleChecker } from '../levels/obstacles';
import type { LevelDefinition } from '../levels/types';
import { mountDomBoard } from '../render/domBoard';
import { FRUIT_THEME, tileGlyphsForKinds } from '../theme/defaultTheme';
import type { ThemeManifest } from '../theme/types';
import type { TurnStatsPayload } from '../progression/types';

/** Delay between cascade waves (chain-match visuals + score ticks). */
const CASCADE_WAVE_GAP_MS = 118;

export interface BoardSessionOptions {
  /** RNG seed; same value reproduces the same starting board (with the same code version). */
  readonly seed?: number;
  /** Visual pack; defaults to fruit. */
  readonly theme?: ThemeManifest;
  /** Board layout; defaults to the first catalog entry. */
  readonly level?: LevelDefinition;
  /** Fired after each scoring cascade. */
  readonly onScoreChange?: (score: number, target: number) => void;
  /** Fired once when `targetScore` is reached. */
  readonly onLevelComplete?: () => void;
  /** Remaining seconds when the countdown is enabled (`timeLimitSeconds` &gt; 0). */
  readonly onTimerTick?: (secondsLeft: number) => void;
  /** Seconds added after a match wave or bomb blast (for HUD toast). */
  readonly onTimeBonus?: (secondsAdded: number) => void;
  /** Fired once when the run ends without reaching the target (no moves or time up). */
  readonly onGameOver?: (reason: 'no-moves' | 'time') => void;
  /** Fired when a swap or bomb cascade fully settles (for achievements / daily quests). */
  readonly onTurnStats?: (payload: TurnStatsPayload) => void;
  /**
   * Countdown length and whether reaching zero ends the run.
   * Defaults to Normal difficulty rules for the level.
   */
  readonly sessionTiming?: SessionTiming;
  /** Short UI sounds (match wave, bomb, time bonus). */
  readonly onSoundEffect?: (kind: 'match' | 'bomb' | 'timeBonus') => void;
}

function stopTimer(id: ReturnType<typeof setInterval> | null): null {
  if (id !== null) {
    clearInterval(id);
  }
  return null;
}

/**
 * Wires the engine to the DOM: selection, swaps, and cascade resolution.
 * Returns a disposer for tests or hot reload (optional).
 */
export function mountBoardSession(host: HTMLElement, options?: BoardSessionOptions): () => void {
  const seed = options?.seed ?? Date.now();
  const theme = options?.theme ?? FRUIT_THEME;
  const level = options?.level ?? getLevelOrDefault(0);
  const size: GridSize = { rows: level.rows, cols: level.cols };
  const numKinds = DEFAULT_TILE_KIND_COUNT;

  const obstacleChecker = resolveObstacleChecker(level);

  let grid = buildPlayableInitialGrid(size, numKinds, seed, level.salt, obstacleChecker);

  const spawn = createUniformTileSpawn(numKinds, createRng(mixSeed(seed, level.salt)));

  /** Bumps the RNG mix when we must reshuffle — never end the run for "no moves". */
  let shuffleGen = 0;

  let selected: Position | null = null;
  let busy = false;
  let won = false;
  let lost = false;
  let score = 0;
  const targetScore = level.targetScore;

  const timing = options?.sessionTiming ?? resolveSessionTiming(level, 'normal');
  const timeLimitRaw = timing.timeLimitSeconds;
  const timerEnabled = timeLimitRaw > 0;
  let secondsLeft = timerEnabled ? timeLimitRaw : 0;
  let timerId: ReturnType<typeof setInterval> | null = null;

  const glyphs = tileGlyphsForKinds(theme, numKinds);

  options?.onScoreChange?.(score, targetScore);
  if (timerEnabled) {
    options?.onTimerTick?.(secondsLeft);
    timerId = setInterval(() => {
      if (won || lost) {
        return;
      }
      secondsLeft -= 1;
      options?.onTimerTick?.(secondsLeft);
      if (secondsLeft <= 0) {
        timerId = stopTimer(timerId);
        if (timing.timeUpEndsRun && !won) {
          lost = true;
          options?.onGameOver?.('time');
        }
      }
    }, 1000);
  }

  const board = mountDomBoard(host, {
    size,
    tileGlyphs: glyphs,
    onActivateCell: (pos) => handleActivate(pos),
  });

  board.syncFromEngine(grid);

  function reshuffleUntilPlayable(): void {
    if (hasLegalMove(grid)) {
      return;
    }
    selected = null;
    board.setSelected(null);
    const maxTries = 48;
    for (let t = 0; t < maxTries; t++) {
      shuffleGen += 1;
      const s = mixSeed(seed, level.salt + shuffleGen * 0x9e3779b1 + t * 0x6a09e667);
      grid = buildPlayableInitialGrid(size, numKinds, s, level.salt ^ shuffleGen, obstacleChecker);
      if (hasLegalMove(grid)) {
        break;
      }
    }
    /** Keep engine state and DOM in sync even when reshuffle finds no improvement. */
    board.syncFromEngine(grid);
  }

  reshuffleUntilPlayable();

  let turnTilesCleared = 0;
  let turnCascadeWaves = 0;

  function finalizeTurnStats(input: 'swap' | 'bomb'): void {
    options?.onTurnStats?.({
      tilesThisTurn: turnTilesCleared,
      cascadeWaves: turnCascadeWaves,
      input,
    });
    turnTilesCleared = 0;
    turnCascadeWaves = 0;
  }

  function grantTimeBonusForClears(tileCount: number): void {
    if (!timerEnabled || won || lost) {
      return;
    }
    const bonus = computeTimeBonusSeconds(tileCount);
    if (bonus <= 0) {
      return;
    }
    secondsLeft += bonus;
    options?.onTimerTick?.(secondsLeft);
    options?.onTimeBonus?.(bonus);
    options?.onSoundEffect?.('timeBonus');
  }

  function endRunOnWin(): void {
    won = true;
    timerId = stopTimer(timerId);
    options?.onLevelComplete?.();
  }

  function checkStalemate(): void {
    if (won || lost) {
      return;
    }
    reshuffleUntilPlayable();
  }

  function finishCascadeRun(): void {
    busy = false;
    if (!won) {
      checkStalemate();
    }
  }

  function endTurnAndIdle(input: 'swap' | 'bomb'): void {
    finalizeTurnStats(input);
    finishCascadeRun();
  }

  function handleActivate(pos: Position): void {
    if (won || lost || busy) {
      return;
    }

    const tapped = getCell(grid, pos);
    if (isBomb(tapped)) {
      selected = null;
      board.setSelected(null);
      busy = true;
      turnCascadeWaves = 0;
      const blast = explodeBombAt(grid, size, pos);
      turnTilesCleared = blast.length;
      score += blast.length * POINTS_PER_CLEARED_TILE;
      options?.onScoreChange?.(score, targetScore);
      options?.onSoundEffect?.('bomb');
      if (blast.length > 0) {
        grantTimeBonusForClears(blast.length);
      }
      if (score >= targetScore) {
        endRunOnWin();
      }
      board.syncFromEngine(grid, { kind: 'bomb' });
      settleGravityAndRefill(grid, size, spawn);
      board.syncFromEngine(grid);
      let waveIndex = 0;
      const stepBomb = (): void => {
        const wave = applyOneCascadeWave(grid, size, spawn);
        if (!wave) {
          endTurnAndIdle('bomb');
          return;
        }
        options?.onSoundEffect?.('match');
        turnTilesCleared += wave.length;
        turnCascadeWaves += 1;
        score += wave.length * POINTS_PER_CLEARED_TILE;
        options?.onScoreChange?.(score, targetScore);
        grantTimeBonusForClears(wave.length);
        if (score >= targetScore) {
          endRunOnWin();
        }
        board.syncFromEngine(grid, { kind: 'match', waveIndex });
        waveIndex += 1;
        window.setTimeout(stepBomb, CASCADE_WAVE_GAP_MS);
      };
      window.setTimeout(stepBomb, 95);
      return;
    }

    if (!selected) {
      selected = pos;
      board.setSelected(selected);
      return;
    }

    if (selected.row === pos.row && selected.col === pos.col) {
      selected = null;
      board.setSelected(null);
      return;
    }

    if (!areOrthogonalNeighbors(selected, pos)) {
      selected = pos;
      board.setSelected(selected);
      return;
    }

    const from = selected;
    const to = pos;
    selected = null;
    board.setSelected(null);

    const accepted = tryPlayerSwap(grid, size, from, to);
    if (!accepted) {
      board.syncFromEngine(grid);
      return;
    }

    busy = true;
    turnTilesCleared = 0;
    turnCascadeWaves = 0;
    board.syncFromEngine(grid);
    let waveIndex = 0;
    const stepSwap = (): void => {
      const wave = applyOneCascadeWave(grid, size, spawn);
      if (!wave) {
        endTurnAndIdle('swap');
        return;
      }
      options?.onSoundEffect?.('match');
      turnTilesCleared += wave.length;
      turnCascadeWaves += 1;
      score += wave.length * POINTS_PER_CLEARED_TILE;
      options?.onScoreChange?.(score, targetScore);
      grantTimeBonusForClears(wave.length);
      if (score >= targetScore) {
        endRunOnWin();
      }
      board.syncFromEngine(grid, { kind: 'match', waveIndex });
      waveIndex += 1;
      window.setTimeout(stepSwap, CASCADE_WAVE_GAP_MS);
    };
    window.setTimeout(stepSwap, 0);
  }

  return () => {
    timerId = stopTimer(timerId);
    board.destroy();
  };
}
