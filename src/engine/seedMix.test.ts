import { describe, expect, it } from 'vitest';
import { mixSeed } from './seedMix';

describe('mixSeed', () => {
  it('returns a 32-bit unsigned mix', () => {
    const m = mixSeed(12345, 0xff);
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(0xffff_ffff);
  });

  it('differs when salt differs', () => {
    expect(mixSeed(100, 1)).not.toBe(mixSeed(100, 2));
  });
});
