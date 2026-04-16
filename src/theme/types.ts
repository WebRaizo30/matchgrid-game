/**
 * Declarative theme: visuals only — the engine still uses numeric `TileKind` values.
 * Future JSON packs can validate against this shape.
 */
export interface ThemeManifest {
  readonly id: string;
  readonly label: string;
  /** CSS background for the main shell (solid, gradient, or `url(...)`). */
  readonly pageBackground: string;
  /** Primary heading text color. */
  readonly shellTextColor?: string;
  /** Secondary copy (instructions). */
  readonly shellMutedColor?: string;
  /** One glyph per tile kind index (length should be >= engine kind count). */
  readonly tileGlyphs: readonly string[];
  readonly cellSize?: string;
  readonly cellBorderColor?: string;
  readonly cellBackground?: string;
  readonly cellHoverBorderColor?: string;
  readonly cellHoverBackground?: string;
  readonly selectedOutlineColor?: string;
}
