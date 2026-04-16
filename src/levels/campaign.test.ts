import { describe, expect, it } from 'vitest';
import { buildCampaignLevels, CAMPAIGN_LEVEL_COUNT } from './campaign';
import { obstacleMaskHasAdjacentPlayablePair, parseObstaclePattern } from './obstacles';

describe('campaign obstacle masks', () => {
  it('every stage has two orthogonally adjacent playable cells (swap possible)', () => {
    const levels = buildCampaignLevels(CAMPAIGN_LEVEL_COUNT);
    for (const level of levels) {
      const mask = parseObstaclePattern(level.obstaclePattern, {
        rows: level.rows,
        cols: level.cols,
      });
      expect(obstacleMaskHasAdjacentPlayablePair(mask), `stage ${level.id}`).toBe(true);
    }
  });
});
