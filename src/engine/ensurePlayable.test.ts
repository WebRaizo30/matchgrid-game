import { describe, expect, it } from 'vitest';
import { buildCampaignLevels, CAMPAIGN_LEVEL_COUNT } from '../levels/campaign';
import { buildPlayableInitialGrid } from './ensurePlayable';
import { hasLegalMove } from './legalMoves';
import { findMatchingPositions } from './match';
import { resolveObstacleChecker } from '../levels/obstacles';
import { DEFAULT_TILE_KIND_COUNT } from './constants';

describe('buildPlayableInitialGrid', () => {
  it('returns a board with no auto-match and at least one legal move (sample stages)', () => {
    const levels = buildCampaignLevels(Math.min(200, CAMPAIGN_LEVEL_COUNT));
    const indices = [0, 17, 41, 99, 151, 199].filter((i) => i < levels.length);
    for (const i of indices) {
      const level = levels[i]!;
      const seed = 1337 + i * 17;
      const checker = resolveObstacleChecker(level);
      const grid = buildPlayableInitialGrid(
        { rows: level.rows, cols: level.cols },
        DEFAULT_TILE_KIND_COUNT,
        seed,
        level.salt,
        checker,
      );
      expect(findMatchingPositions(grid).length === 0, `stage ${i} has immediate match`).toBe(true);
      expect(hasLegalMove(grid), `stage ${i} has no legal move`).toBe(true);
    }
  });

  it('is deterministic for a fixed seed and level', () => {
    const levels = buildCampaignLevels(1);
    const level = levels[0]!;
    const checker = resolveObstacleChecker(level);
    const a = buildPlayableInitialGrid(
      { rows: level.rows, cols: level.cols },
      DEFAULT_TILE_KIND_COUNT,
      42,
      level.salt,
      checker,
    );
    const b = buildPlayableInitialGrid(
      { rows: level.rows, cols: level.cols },
      DEFAULT_TILE_KIND_COUNT,
      42,
      level.salt,
      checker,
    );
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
