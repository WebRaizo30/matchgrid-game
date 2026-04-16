import { EMOJI_THEME, FRUIT_THEME } from './defaultTheme';
import type { ThemeManifest } from './types';

/**
 * Pushes palette values into CSS variables on the shell so `styles.css` can stay generic.
 */
export function applyThemeToShell(shell: HTMLElement, theme: ThemeManifest): void {
  shell.style.background = theme.pageBackground;
  shell.style.setProperty('--mg-shell-text', theme.shellTextColor ?? '#f1f5f9');
  shell.style.setProperty('--mg-shell-muted', theme.shellMutedColor ?? 'rgba(226, 232, 240, 0.72)');
  /* Cell size comes from layout CSS (`--mg-board-cols` / `--mg-board-rows`) so the board never overflows. */
  shell.style.setProperty('--mg-cell-border', theme.cellBorderColor ?? 'rgba(255, 255, 255, 0.16)');
  shell.style.setProperty('--mg-cell-bg', theme.cellBackground ?? 'rgba(255, 255, 255, 0.1)');
  shell.style.setProperty('--mg-cell-hover-border', theme.cellHoverBorderColor ?? 'rgba(251, 113, 133, 0.65)');
  shell.style.setProperty('--mg-cell-hover-bg', theme.cellHoverBackground ?? 'rgba(255, 255, 255, 0.16)');
  shell.style.setProperty('--mg-cell-selected-outline', theme.selectedOutlineColor ?? '#fb7185');
  shell.dataset.themeId = theme.id;
}

/**
 * Reads `?seed=123` for reproducible RNG. Invalid or missing → `undefined`.
 */
export function readSeedFromSearch(): number | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const raw = new URLSearchParams(window.location.search).get('seed');
  if (raw === null) {
    return undefined;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return undefined;
  }
  return Math.trunc(n);
}

/** `?theme=emoji` switches built-in packs; unknown values fall back to fruit. */
export function readThemeFromSearch(): ThemeManifest {
  if (typeof window === 'undefined') {
    return FRUIT_THEME;
  }
  const id = new URLSearchParams(window.location.search).get('theme');
  if (id === 'emoji') {
    return EMOJI_THEME;
  }
  return FRUIT_THEME;
}
