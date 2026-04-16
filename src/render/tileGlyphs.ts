import { BLOCKED, isBomb, type Cell } from '../engine/types';

/**
 * Temporary glyph map until theme JSON drives visuals.
 * Index matches `TileKind` (0 .. numKinds - 1).
 * Prefer older, widely-fonted codepoints (avoid Unicode 13+ only glyphs on older Windows).
 */
export const DEFAULT_TILE_GLYPHS: readonly string[] = ['🍎', '🍊', '🍇', '🍋', '🍉', '🍓'];

/** Visual for obstacle cells (plain Unicode, no color font required). */
export const OBSTACLE_GLYPH = '▓';

/** Bomb special (line-4 spawn); shown as mine icon. */
export const BOMB_GLYPH = '💣';

/** Human-readable cell content for the DOM layer. */
export function formatCellGlyph(cell: Cell, glyphs: readonly string[]): string {
  if (cell === null) {
    return '';
  }
  if (cell === BLOCKED) {
    return OBSTACLE_GLYPH;
  }
  if (isBomb(cell)) {
    return BOMB_GLYPH;
  }
  return glyphs[cell] ?? `#${cell}`;
}
