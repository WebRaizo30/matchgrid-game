import { buildCampaignLevels, CAMPAIGN_LEVEL_COUNT } from './campaign';
import type { LevelDefinition } from './types';

/** Full campaign — `CAMPAIGN_LEVEL_COUNT` stages with procedural board sizes and obstacle fields. */
export const LEVELS: readonly LevelDefinition[] = buildCampaignLevels(CAMPAIGN_LEVEL_COUNT);

export { CAMPAIGN_LEVEL_COUNT };

export function getLevelOrDefault(index: number): LevelDefinition {
  if (index < 0 || index >= LEVELS.length) {
    return LEVELS[0]!;
  }
  return LEVELS[index]!;
}

/** `?level=0` is the first stage; values beyond the last index clamp to the final stage. */
export function readLevelIndexFromSearch(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  const raw = new URLSearchParams(window.location.search).get('level');
  if (raw === null) {
    return 0;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return 0;
  }
  const idx = Math.trunc(n);
  if (idx < 0) {
    return 0;
  }
  if (idx >= LEVELS.length) {
    return LEVELS.length - 1;
  }
  return idx;
}
