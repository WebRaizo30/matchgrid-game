import type { Grid } from '../engine/grid';
import { cloneGrid, getCell } from '../engine/grid';
import { isBlocked, isBomb, type Cell, type GridSize, type Position } from '../engine/types';
import { isFilled } from '../engine/types';
import { formatCellGlyph } from './tileGlyphs';

export interface DomBoardSyncOptions {
  /** Stronger blast + board shake (bomb tap). */
  readonly kind?: 'bomb' | 'match';
  /** Cascade wave index (0-based); varies burst tint / pop timing for chain matches. */
  readonly waveIndex?: number;
}

export interface DomBoardHandle {
  readonly root: HTMLElement;
  /** Syncs every cell from the engine grid; compares to the previous frame for clear/spawn animations. */
  syncFromEngine(grid: Grid, options?: DomBoardSyncOptions): void;
  /** Highlights the selected tile, or clears selection. */
  setSelected(pos: Position | null): void;
  /** Detaches listeners and removes nodes. */
  destroy(): void;
}

export interface DomBoardOptions {
  readonly size: GridSize;
  /** One string per `TileKind` index (same order as the engine). */
  readonly tileGlyphs: readonly string[];
  /** Invoked after a cell is activated (click / keyboard). */
  readonly onActivateCell: (pos: Position) => void;
}

function applyCellContent(
  btn: HTMLButtonElement,
  pos: Position,
  cell: Cell,
  tileGlyphs: readonly string[],
): void {
  btn.textContent = formatCellGlyph(cell, tileGlyphs);
  btn.dataset.empty = cell === null ? 'true' : 'false';
  btn.dataset.blocked = isBlocked(cell) ? 'true' : 'false';
  if (isBomb(cell)) {
    btn.dataset.special = 'bomb';
  } else {
    delete btn.dataset.special;
  }
  btn.disabled = isBlocked(cell);
  btn.tabIndex = -1;
  btn.setAttribute('aria-label', describeCell(pos, cell, tileGlyphs));
}

function isPlayableCell(grid: Grid, row: number, col: number): boolean {
  const cell = getCell(grid, { row, col });
  return isFilled(cell) && !isBlocked(cell);
}

/**
 * Accessible button grid: one button per cell, keeps labels in sync with engine state.
 */
export function mountDomBoard(host: HTMLElement, options: DomBoardOptions): DomBoardHandle {
  const { size, tileGlyphs, onActivateCell } = options;
  const board = document.createElement('div');
  board.className = 'mg-board';
  board.setAttribute('role', 'grid');
  board.setAttribute('aria-label', 'Match grid. Use arrow keys to move, Enter or Space to act.');
  board.tabIndex = -1;
  board.style.gridTemplateColumns = `repeat(${size.cols}, var(--mg-cell-size, 3rem))`;

  const cells: HTMLButtonElement[][] = [];
  const timeoutIds: number[] = [];

  for (let row = 0; row < size.rows; row++) {
    const rowEls: HTMLButtonElement[] = [];
    for (let col = 0; col < size.cols; col++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mg-cell';
      btn.dataset.row = String(row);
      btn.dataset.col = String(col);
      btn.setAttribute('role', 'gridcell');
      const pos: Position = { row, col };
      btn.addEventListener('click', () => onActivateCell(pos));
      board.appendChild(btn);
      rowEls.push(btn);
    }
    cells.push(rowEls);
  }

  host.appendChild(board);

  let lastGrid: Grid | null = null;
  let lastKbGrid: Grid | null = null;
  let kbRow = 0;
  let kbCol = 0;
  let kbInited = false;

  const schedule = (fn: () => void, ms: number): void => {
    const id = window.setTimeout(fn, ms);
    timeoutIds.push(id);
  };

  function applyKbRoving(grid: Grid): void {
    const findFirst = (): { r: number; c: number } | null => {
      for (let r = 0; r < size.rows; r++) {
        for (let c = 0; c < size.cols; c++) {
          if (isPlayableCell(grid, r, c)) {
            return { r, c };
          }
        }
      }
      return null;
    };

    let pick: { r: number; c: number } | null = null;
    if (!kbInited) {
      pick = findFirst();
    } else if (!isPlayableCell(grid, kbRow, kbCol)) {
      pick = findFirst();
    } else {
      pick = { r: kbRow, c: kbCol };
    }

    if (!pick) {
      return;
    }
    kbRow = pick.r;
    kbCol = pick.c;
    kbInited = true;

    for (let r = 0; r < size.rows; r++) {
      for (let c = 0; c < size.cols; c++) {
        const btn = cells[r]![c]!;
        const play = isPlayableCell(grid, r, c);
        btn.tabIndex = play && r === kbRow && c === kbCol ? 0 : -1;
      }
    }
    cells[kbRow]?.[kbCol]?.focus();
  }

  function tryMoveKb(dr: number, dc: number): void {
    const g = lastKbGrid;
    if (!g) {
      return;
    }
    let r = kbRow + dr;
    let c = kbCol + dc;
    while (r >= 0 && r < size.rows && c >= 0 && c < size.cols) {
      if (isPlayableCell(g, r, c)) {
        kbRow = r;
        kbCol = c;
        applyKbRoving(g);
        return;
      }
      r += dr;
      c += dc;
    }
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
      if (e.key !== 'Enter' && e.key !== ' ') {
        return;
      }
      e.preventDefault();
      onActivateCell({ row: kbRow, col: kbCol });
      return;
    }
    e.preventDefault();
    if (e.key === 'ArrowUp') {
      tryMoveKb(-1, 0);
    } else if (e.key === 'ArrowDown') {
      tryMoveKb(1, 0);
    } else if (e.key === 'ArrowLeft') {
      tryMoveKb(0, -1);
    } else if (e.key === 'ArrowRight') {
      tryMoveKb(0, 1);
    }
  };

  board.addEventListener('keydown', onKeyDown);

  const syncFromEngine = (grid: Grid, syncOptions?: DomBoardSyncOptions): void => {
    const kind = syncOptions?.kind;
    const waveIndex = syncOptions?.waveIndex ?? 0;

    const clearings: Position[] = [];
    const spawns: Position[] = [];

    if (lastGrid) {
      for (let row = 0; row < size.rows; row++) {
        for (let col = 0; col < size.cols; col++) {
          const pos: Position = { row, col };
          const prev = getCell(lastGrid, pos);
          const cur = getCell(grid, pos);
          if (isFilled(prev) && cur === null) {
            clearings.push(pos);
          }
          if (prev === null && isFilled(cur)) {
            spawns.push(pos);
          }
        }
      }
    }

    for (let row = 0; row < size.rows; row++) {
      for (let col = 0; col < size.cols; col++) {
        const pos: Position = { row, col };
        const cell = getCell(grid, pos);
        const btn = cells[row]![col]!;
        btn.classList.remove(
          'mg-cell--burst',
          'mg-cell--burst-bomb',
          'mg-cell--burst-match',
          'mg-cell--spawn',
        );
        delete btn.dataset.cascadeWave;
        applyCellContent(btn, pos, cell, tileGlyphs);
      }
    }

    const burstClass = kind === 'bomb' ? 'mg-cell--burst-bomb' : 'mg-cell--burst';
    const burstMs = kind === 'bomb' ? 520 : 420;
    const waveStripe = waveIndex % 5;
    for (const pos of clearings) {
      const btn = cells[pos.row]![pos.col]!;
      btn.classList.add(burstClass);
      if (kind === 'match') {
        btn.classList.add('mg-cell--burst-match');
        btn.dataset.cascadeWave = String(waveStripe);
      }
      const popDelay = kind === 'match' ? Math.min(55, waveIndex * 12) : 0;
      schedule(() => {
        btn.classList.remove('mg-cell--burst', 'mg-cell--burst-bomb', 'mg-cell--burst-match');
        delete btn.dataset.cascadeWave;
      }, burstMs + popDelay);
    }

    if (kind === 'bomb' && clearings.length > 0) {
      board.classList.add('mg-board--shake');
      board.classList.add('mg-board--bomb-glow');
      schedule(() => {
        board.classList.remove('mg-board--shake', 'mg-board--bomb-glow');
      }, 520);
    }

    if (kind === 'match' && clearings.length > 0) {
      board.classList.remove('mg-board--match-pulse', 'mg-board--match-burst');
      void board.offsetWidth;
      board.classList.add('mg-board--match-pulse');
      board.classList.add('mg-board--match-burst');
      const fxMs = 340 + waveIndex * 28;
      schedule(() => {
        board.classList.remove('mg-board--match-pulse', 'mg-board--match-burst');
      }, fxMs);
    }

    for (const pos of spawns) {
      const btn = cells[pos.row]![pos.col]!;
      btn.classList.add('mg-cell--spawn');
      schedule(() => btn.classList.remove('mg-cell--spawn'), 380);
    }

    lastGrid = cloneGrid(grid);
    lastKbGrid = grid;
    applyKbRoving(grid);
  };

  const setSelected = (pos: Position | null): void => {
    for (let row = 0; row < size.rows; row++) {
      for (let col = 0; col < size.cols; col++) {
        cells[row]![col]!.classList.toggle('mg-cell--selected', !!pos && pos.row === row && pos.col === col);
      }
    }
  };

  const destroy = (): void => {
    board.removeEventListener('keydown', onKeyDown);
    for (const id of timeoutIds) {
      window.clearTimeout(id);
    }
    timeoutIds.length = 0;
    board.remove();
  };

  return { root: board, syncFromEngine, setSelected, destroy };
}

function describeCell(pos: Position, cell: Cell, glyphs: readonly string[]): string {
  if (cell === null) {
    return `Empty cell row ${pos.row + 1}, column ${pos.col + 1}`;
  }
  if (isBlocked(cell)) {
    return `Blocked cell row ${pos.row + 1}, column ${pos.col + 1}`;
  }
  if (isBomb(cell)) {
    return `Bomb at row ${pos.row + 1}, column ${pos.col + 1}`;
  }
  return `Tile ${formatCellGlyph(cell, glyphs)} at row ${pos.row + 1}, column ${pos.col + 1}`;
}
