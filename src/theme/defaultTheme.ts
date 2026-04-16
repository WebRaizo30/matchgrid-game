import { DEFAULT_TILE_GLYPHS } from '../render/tileGlyphs';
import type { ThemeManifest } from './types';

/** Default six-fruit palette — matches `DEFAULT_TILE_KIND_COUNT`. */
export const FRUIT_THEME: ThemeManifest = {
  id: 'fruit',
  label: 'Fruit',
  pageBackground: '#0c0b09',
  shellTextColor: '#e8e4dc',
  shellMutedColor: 'rgba(138, 132, 120, 0.92)',
  tileGlyphs: DEFAULT_TILE_GLYPHS,
  cellSize: '3rem',
  cellBorderColor: 'rgba(196, 165, 116, 0.22)',
  cellBackground: 'rgba(255, 252, 245, 0.06)',
  cellHoverBorderColor: 'rgba(196, 165, 116, 0.55)',
  cellHoverBackground: 'rgba(255, 252, 245, 0.1)',
  selectedOutlineColor: '#c4a574',
};

/** Alternate glyph set for demos / screenshots. */
export const EMOJI_THEME: ThemeManifest = {
  ...FRUIT_THEME,
  id: 'emoji',
  label: 'Emoji',
  pageBackground: '#0a1218',
  shellMutedColor: 'rgba(148, 180, 196, 0.85)',
  // Faces and symbols that render on Segoe UI Emoji (Windows) and Apple/Google fonts.
  tileGlyphs: ['😀', '😎', '🐶', '🐱', '🎮', '⭐'],
  selectedOutlineColor: '#7eb8c4',
  cellHoverBorderColor: 'rgba(126, 184, 196, 0.55)',
};

/**
 * Ensures at least `numKinds` glyphs by padding from the shared default list.
 */
export function tileGlyphsForKinds(theme: ThemeManifest, numKinds: number): readonly string[] {
  const base = theme.tileGlyphs;
  if (base.length >= numKinds) {
    return base.slice(0, numKinds);
  }
  const out: string[] = [...base];
  for (let i = base.length; i < numKinds; i++) {
    out.push(DEFAULT_TILE_GLYPHS[i] ?? `#${i}`);
  }
  return out;
}
