/**
 * Core engine types shared by rules, rendering, and level JSON.
 * All user-facing copy lives outside this module; comments stay technical.
 */

/** Plain color index (0 .. numKinds - 1). */
export type NormalColor = number;

/** Legacy alias — random spawns only produce normal colors. */
export type TileKind = NormalColor;

/** Created when four or more of the same color align in a line. */
export interface BombTile {
  readonly type: 'bomb';
  /** Origin color (for visuals). */
  readonly color: NormalColor;
}

export type PlayableTile = NormalColor | BombTile;

/** Permanent obstacle — no tile, no swap, breaks match lines. */
export const BLOCKED = -1 as const;

/**
 * Normal tile, bomb special, empty (`null`), or obstacle (`BLOCKED`).
 */
export type Cell = PlayableTile | null | typeof BLOCKED;

export interface GridSize {
  readonly rows: number;
  readonly cols: number;
}

/** Integer coordinates in row-major order, origin at top-left. */
export interface Position {
  readonly row: number;
  readonly col: number;
}

/** Creates a position; use when validating moves or indexing helpers. */
export function position(row: number, col: number): Position {
  return { row, col };
}

export function isNormalColor(cell: Cell): cell is NormalColor {
  return typeof cell === 'number' && cell >= 0;
}

export function isBomb(cell: Cell): cell is BombTile {
  return typeof cell === 'object' && cell !== null && 'type' in cell && cell.type === 'bomb';
}

/** True if the cell holds any playable tile (color or special). */
export function isFilled(cell: Cell): cell is PlayableTile {
  return cell !== null && cell !== BLOCKED;
}

/** True if the cell is a fixed obstacle. */
export function isBlocked(cell: Cell): cell is typeof BLOCKED {
  return cell === BLOCKED;
}
