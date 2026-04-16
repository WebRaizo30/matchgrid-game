/**
 * Mixes a user-facing seed with level-specific salt (both 32-bit unsigned).
 */
export function mixSeed(baseSeed: number, salt: number): number {
  const a = baseSeed >>> 0;
  const b = salt >>> 0;
  return Math.imul(a ^ b, 2654435761) >>> 0;
}
