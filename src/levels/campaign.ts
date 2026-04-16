import { ensureObstacleMaskHasAdjacentPlayablePair } from './obstacles';
import type { LevelDefinition } from './types';

/** Total stages in the default campaign. */
export const CAMPAIGN_LEVEL_COUNT = 1000;

/** Rotating board shapes — long list so 1000 stages do not feel repetitive. */
const SIZE_PRESETS: readonly (readonly [number, number])[] = [
  [6, 6],
  [6, 7],
  [7, 6],
  [7, 7],
  [6, 8],
  [8, 6],
  [7, 8],
  [8, 7],
  [8, 8],
  [7, 9],
  [9, 7],
  [8, 9],
  [9, 8],
  [9, 9],
  [8, 10],
  [10, 8],
  [9, 10],
  [10, 9],
  [10, 10],
  [6, 9],
  [9, 6],
  [7, 10],
  [10, 7],
  [6, 10],
  [10, 6],
  [8, 8],
  [9, 9],
  [10, 10],
  [7, 7],
  [6, 6],
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return (): number => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyGrid(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
}

function countPlayable(blocked: readonly (readonly boolean[])[]): number {
  let n = 0;
  for (const row of blocked) {
    for (const b of row) {
      if (!b) {
        n++;
      }
    }
  }
  return n;
}

function toPattern(blocked: boolean[][]): readonly string[] {
  return blocked.map((row) => row.map((b) => (b ? '#' : '.')).join(''));
}

/** Merge two block masks (blocked if either is blocked). */
function mergeOr(a: boolean[][], b: boolean[][]): boolean[][] {
  const rows = a.length;
  const cols = a[0]!.length;
  const out: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(a[r]![c]! || b[r]![c]!);
    }
    out.push(row);
  }
  return out;
}

/** Sparse random noise — base for several templates. */
function templateSparseRandom(rows: number, cols: number, seed: number, density: number): boolean[][] {
  const rng = mulberry32(seed);
  const blocked = emptyGrid(rows, cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      blocked[r]![c] = rng() < density;
    }
  }
  return blocked;
}

/** Outer ring of blocks (frame). */
function templateRing(rows: number, cols: number, thickness: number): boolean[][] {
  const t = Math.min(thickness, Math.floor(Math.min(rows, cols) / 3) || 1);
  const blocked = emptyGrid(rows, cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r < t || r >= rows - t || c < t || c >= cols - t) {
        blocked[r]![c] = true;
      }
    }
  }
  return blocked;
}

/** Full cross through the center. */
function templateCross(rows: number, cols: number): boolean[][] {
  const blocked = emptyGrid(rows, cols);
  const cr = Math.floor(rows / 2);
  const cc = Math.floor(cols / 2);
  for (let c = 0; c < cols; c++) {
    blocked[cr]![c] = true;
  }
  for (let r = 0; r < rows; r++) {
    blocked[r]![cc] = true;
  }
  return blocked;
}

/** Small blocks in the four corners when there is room. */
function templateCorners(rows: number, cols: number, arm: number): boolean[][] {
  const blocked = emptyGrid(rows, cols);
  const a = Math.min(arm, Math.min(rows, cols) - 1);
  if (a < 1) {
    return blocked;
  }
  for (let dr = 0; dr < a; dr++) {
    for (let dc = 0; dc < a; dc++) {
      blocked[dr]![dc] = true;
      blocked[dr]![cols - 1 - dc] = true;
      blocked[rows - 1 - dr]![dc] = true;
      blocked[rows - 1 - dr]![cols - 1 - dc] = true;
    }
  }
  return blocked;
}

/** Horizontal full rows every `step` rows. */
function templateHorizontalBars(rows: number, cols: number, step: number): boolean[][] {
  const blocked = emptyGrid(rows, cols);
  const s = Math.max(3, step);
  for (let r = 0; r < rows; r++) {
    if (r % s === 0) {
      for (let c = 0; c < cols; c++) {
        blocked[r]![c] = true;
      }
    }
  }
  return blocked;
}

/** Vertical full columns every `step` columns. */
function templateVerticalBars(rows: number, cols: number, step: number): boolean[][] {
  const blocked = emptyGrid(rows, cols);
  const s = Math.max(3, step);
  for (let c = 0; c < cols; c++) {
    if (c % s === 0) {
      for (let r = 0; r < rows; r++) {
        blocked[r]![c] = true;
      }
    }
  }
  return blocked;
}

/**
 * Checker-like texture with jitter; `ensureObstacleMaskHasAdjacentPlayablePair` still runs on the final mask.
 */
function templateChecker(rows: number, cols: number, phase: number, seed: number): boolean[][] {
  const blocked = emptyGrid(rows, cols);
  const p = phase % 2;
  const rng = mulberry32(seed ^ 0x2b7e_2a91);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (((r + c) & 1) === p) {
        blocked[r]![c] = rng() < 0.92;
      }
    }
  }
  return blocked;
}

/** Two diagonal bands of noise (deterministic). */
function templateDiagonalWeave(rows: number, cols: number, seed: number): boolean[][] {
  const rng = mulberry32(seed);
  const blocked = emptyGrid(rows, cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const onDiag = Math.abs(r - c) <= 1 || Math.abs(r + c - (rows - 1)) <= 1;
      if (onDiag && rng() < 0.55) {
        blocked[r]![c] = true;
      }
    }
  }
  return blocked;
}

/** Islands: a few small clusters. */
function templateIslands(rows: number, cols: number, seed: number): boolean[][] {
  const rng = mulberry32(seed);
  const blocked = templateSparseRandom(rows, cols, seed + 11, 0.12);
  for (let k = 0; k < 3 + (seed % 4); k++) {
    const cr = Math.floor(rng() * rows);
    const cc = Math.floor(rng() * cols);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = cr + dr;
        const c = cc + dc;
        if (r >= 0 && r < rows && c >= 0 && c < cols && rng() < 0.65) {
          blocked[r]![c] = true;
        }
      }
    }
  }
  return blocked;
}

const TEMPLATE_MOD = 14;

/**
 * Picks one of several obstacle generators so stages feel distinct:
 * random, ring, cross, corners, bars, checker, weave, islands, merges, etc.
 */
function buildObstaclePattern(rows: number, cols: number, levelIndex: number): readonly string[] {
  const mode = levelIndex % TEMPLATE_MOD;
  const seed = levelIndex * 1_009_169 + 0x9e37_79b9;
  const density = 0.045 + (levelIndex % 23) * 0.0065;

  let blocked: boolean[][];

  switch (mode) {
    case 0:
      blocked = templateSparseRandom(rows, cols, seed, density);
      break;
    case 1:
      blocked = templateRing(rows, cols, 1);
      break;
    case 2:
      blocked = templateCross(rows, cols);
      break;
    case 3:
      blocked = templateCorners(rows, cols, 1 + (levelIndex % 2));
      break;
    case 4:
      blocked = templateHorizontalBars(rows, cols, 3 + (levelIndex % 3));
      break;
    case 5:
      blocked = templateVerticalBars(rows, cols, 3 + (levelIndex % 3));
      break;
    case 6:
      blocked = mergeOr(
        templateSparseRandom(rows, cols, seed, density * 0.55),
        templateRing(rows, cols, 1),
      );
      break;
    case 7:
      blocked = mergeOr(templateCross(rows, cols), templateSparseRandom(rows, cols, seed ^ 0x55, 0.04));
      break;
    case 8:
      blocked = templateChecker(rows, cols, levelIndex, seed);
      break;
    case 9:
      blocked = templateDiagonalWeave(rows, cols, seed);
      break;
    case 10:
      blocked = templateIslands(rows, cols, seed);
      break;
    case 11:
      blocked = mergeOr(
        templateCorners(rows, cols, 1),
        templateSparseRandom(rows, cols, seed + 99, 0.06),
      );
      break;
    case 12:
      blocked = mergeOr(
        templateHorizontalBars(rows, cols, 4),
        templateSparseRandom(rows, cols, seed + 1, 0.05),
      );
      break;
    default:
      blocked = mergeOr(
        templateSparseRandom(rows, cols, seed, density),
        templateVerticalBars(rows, cols, 4 + (levelIndex % 2)),
      );
  }

  const total = rows * cols;
  const minPlayable = Math.max(18, Math.floor(total * 0.36));
  let playable = countPlayable(blocked);
  const rng = mulberry32(seed + 777);
  let guard = 0;
  while (playable < minPlayable && guard < total * 8) {
    const r = Math.floor(rng() * rows);
    const c = Math.floor(rng() * cols);
    if (blocked[r]![c]) {
      blocked[r]![c] = false;
      playable++;
    }
    guard++;
  }

  ensureObstacleMaskHasAdjacentPlayablePair(blocked, rng);

  return toPattern(blocked);
}

function boardSize(levelIndex: number): { rows: number; cols: number } {
  const [rows, cols] = SIZE_PRESETS[levelIndex % SIZE_PRESETS.length]!;
  const wave = Math.floor(levelIndex / SIZE_PRESETS.length) % 3;
  return {
    rows: Math.min(10, rows + (wave === 1 ? 1 : 0)),
    cols: Math.min(10, cols + (wave === 2 ? 1 : 0)),
  };
}

function targetScoreForLevel(levelIndex: number, rows: number, cols: number): number {
  const cells = rows * cols;
  /** Tuned for `POINTS_PER_CLEARED_TILE` = 4 so level length stays playable. */
  return Math.round((115 + levelIndex * 1.85 + cells * 0.48) * 0.4);
}

function timeLimitSecondsForLevel(levelIndex: number, rows: number, cols: number): number {
  const cells = rows * cols;
  /** Shorter base clock; extra time comes from match bonuses (`computeTimeBonusSeconds`). */
  return Math.min(150, Math.max(45, Math.round(48 + levelIndex * 0.45 + cells * 0.22)));
}

function saltForLevel(levelIndex: number): number {
  return Math.imul(levelIndex + 1, 2654435761) >>> 0;
}

export function buildCampaignLevels(count: number): readonly LevelDefinition[] {
  const out: LevelDefinition[] = [];
  const idWidth = count >= 1000 ? 4 : 3;
  for (let i = 0; i < count; i++) {
    const { rows, cols } = boardSize(i);
    out.push({
      id: `stage-${String(i + 1).padStart(idWidth, '0')}`,
      title: `Stage ${i + 1}`,
      rows,
      cols,
      salt: saltForLevel(i),
      targetScore: targetScoreForLevel(i, rows, cols),
      timeLimitSeconds: timeLimitSecondsForLevel(i, rows, cols),
      obstaclePattern: buildObstaclePattern(rows, cols, i),
    });
  }
  return out;
}
