import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { applyContrastFromStorage, loadContrastHigh, setContrastHigh } from './a11y/contrastPreference';
import { initGameAudio, isMuted, playGameSound, setMuted } from './audio/gameSounds';
import { mountBoardSession } from './app/boardSession';
import type { DifficultyId } from './app/difficulty';
import {
  applyDifficultyToParams,
  loadDifficulty,
  markDifficultyOnboarded,
  parseDifficultyFromSearch,
  persistDifficulty,
  resolveSessionTiming,
  shouldShowDifficultyGate,
} from './app/difficulty';
import { getLevelOrDefault, LEVELS, readLevelIndexFromSearch } from './levels/catalog';
import { applyLevelWin, applyTurnStats, pickDailyMissionIds, registerGameStart } from './progression/logic';
import { loadProgress, saveProgress } from './progression/storage';
import { applyThemeToShell, readSeedFromSearch, readThemeFromSearch } from './theme/applyTheme';
import {
  activateQuestsTab,
  bindQuestsTabs,
  refreshQuestsMarkup,
  showAchievementUnlockToast,
  type QuestsTabId,
} from './ui/questsPanel';

/**
 * Application bootstrap. The match-3 engine and theme system will mount here.
 */
function bootstrap(): void {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) {
    throw new Error('Root element #app not found.');
  }

  root.innerHTML = `
    <div
      id="mg-difficulty-gate"
      class="mg-difficulty-gate mg-difficulty-gate--hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mg-difficulty-gate-title"
      aria-hidden="true"
    >
      <div class="mg-difficulty-gate__panel">
        <h2 id="mg-difficulty-gate-title" class="mg-difficulty-gate__title">Choose your mode</h2>
        <p class="mg-difficulty-gate__lead">Pick how you want to play before the board loads.</p>
        <div class="mg-difficulty-gate__options" role="group" aria-label="Difficulty options">
          <button type="button" class="mg-difficulty-gate__opt" data-difficulty="relaxed">
            <span class="mg-difficulty-gate__opt-name">Relaxed</span>
            <span class="mg-difficulty-gate__opt-desc">No timer · Play at your pace</span>
          </button>
          <button type="button" class="mg-difficulty-gate__opt" data-difficulty="normal">
            <span class="mg-difficulty-gate__opt-name">Normal</span>
            <span class="mg-difficulty-gate__opt-desc">Level timer · Standard rules</span>
          </button>
          <button type="button" class="mg-difficulty-gate__opt" data-difficulty="pressure">
            <span class="mg-difficulty-gate__opt-name">Time pressure</span>
            <span class="mg-difficulty-gate__opt-desc">Strict clock · Lose when time runs out</span>
          </button>
        </div>
      </div>
    </div>
    <main class="mg-shell">
      <header class="mg-header">
        <div class="mg-header__row mg-header__row--primary">
          <div class="mg-header__brand">
            <h1 class="mg-title">MatchGrid</h1>
            <p class="mg-level-line">
              <span class="mg-level-pill"></span>
            </p>
          </div>
          <div class="mg-header__primary-actions">
            <div class="mg-header__a11y" role="group" aria-label="Sound and display">
              <button type="button" class="mg-aux-btn" id="mg-btn-sound" aria-pressed="false">
                Sound on
              </button>
              <button type="button" class="mg-aux-btn" id="mg-btn-contrast" aria-pressed="false">
                High contrast
              </button>
            </div>
            <div class="mg-header__quest-triggers" role="group" aria-label="Quests">
              <button
                type="button"
                class="mg-header-quest-btn"
                id="mg-header-btn-daily"
                data-action="open-quests"
                data-quests-tab="daily"
                aria-pressed="false"
              >
                <span class="mg-header-quest-btn__k">Daily</span>
                <span class="mg-header-quest-btn__sub">Today’s missions</span>
              </button>
              <button
                type="button"
                class="mg-header-quest-btn"
                id="mg-header-btn-achievements"
                data-action="open-quests"
                data-quests-tab="achievements"
                aria-pressed="false"
              >
                <span class="mg-header-quest-btn__k">Achievements</span>
                <span class="mg-header-quest-btn__sub">Trophies</span>
              </button>
            </div>
          </div>
        </div>
        <div class="mg-header__row mg-header__row--hud">
          <p class="mg-board-help" id="mg-board-help">
            Board: arrow keys to move · Enter or Space to select and swap
          </p>
          <div class="mg-header__hud-main">
          <div class="mg-header__stat-cards" aria-live="polite">
            <div class="mg-stat-card">
              <span class="mg-stat-card__label">Score</span>
              <span class="mg-hud__score mg-stat-card__value">0 / 0</span>
            </div>
            <div class="mg-stat-card">
              <span class="mg-stat-card__label">Time</span>
              <span class="mg-hud__timer mg-stat-card__value">0:00</span>
            </div>
            <div class="mg-stat-card mg-stat-card--goal">
              <span class="mg-stat-card__label">Level goal</span>
              <div
                class="mg-hud__track"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="0"
                aria-label="Progress toward level target score"
              >
                <div class="mg-hud__fill"></div>
              </div>
              <span class="mg-stat-card__hint">Fill the bar to clear the stage</span>
            </div>
          </div>
          <div class="mg-header__level-actions" role="group" aria-label="Level">
            <button type="button" class="mg-header-btn" data-action="prev-level">
              <span class="mg-header-btn__text">Prev level</span>
            </button>
            <button type="button" class="mg-header-btn" data-action="next-level">
              <span class="mg-header-btn__text">Next level</span>
            </button>
            <button type="button" class="mg-header-btn" data-action="new-seed">
              <span class="mg-header-btn__text">New board</span>
            </button>
          </div>
          </div>
        </div>
      </header>
      <section class="mg-board-stage" aria-label="Playfield">
        <div class="mg-board-host" aria-describedby="mg-board-help"></div>
      </section>
      <div class="mg-toast-host" aria-live="polite"></div>
      <div class="mg-achievement-toast-host" aria-live="polite"></div>
      <div class="mg-quests mg-quests--hidden" id="mg-quests-root" aria-hidden="true">
        <div class="mg-quests__backdrop" data-close-quests tabindex="-1"></div>
        <div
          class="mg-quests__sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mg-quests-title"
        >
          <div class="mg-quests__layout">
            <aside class="mg-quests__rail" role="tablist" aria-label="Quest sections">
              <button type="button" class="mg-quests__tab mg-quests__tab--active" role="tab" data-tab="daily" aria-selected="true">
                <span class="mg-quests__tab-ico" aria-hidden="true">☀</span>
                <span class="mg-quests__tab-text">Daily</span>
              </button>
              <button type="button" class="mg-quests__tab" role="tab" data-tab="achievements" aria-selected="false">
                <span class="mg-quests__tab-ico" aria-hidden="true">◇</span>
                <span class="mg-quests__tab-text">Achievements</span>
              </button>
            </aside>
            <div class="mg-quests__column">
              <div class="mg-quests__head">
                <h2 id="mg-quests-title">Quests</h2>
                <button type="button" class="mg-quests__close" data-close-quests aria-label="Close">×</button>
              </div>
              <div class="mg-quests__body"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="mg-overlay mg-overlay--hidden" role="dialog" aria-modal="true" aria-hidden="true">
        <div class="mg-overlay__card">
          <h2 class="mg-overlay__title">Level complete</h2>
          <p class="mg-overlay__msg">Target score reached — outstanding run.</p>
          <button type="button" class="mg-next-level">Next level</button>
        </div>
      </div>
    </main>
  `;

  const shell = root.querySelector<HTMLElement>('.mg-shell');
  if (!shell) {
    throw new Error('Shell element not found.');
  }

  initGameAudio();
  applyContrastFromStorage();

  const theme = readThemeFromSearch();
  applyThemeToShell(shell, theme);

  const soundBtn = root.querySelector<HTMLButtonElement>('#mg-btn-sound');
  const contrastBtn = root.querySelector<HTMLButtonElement>('#mg-btn-contrast');

  function syncSoundButton(): void {
    if (!soundBtn) {
      return;
    }
    const m = isMuted();
    soundBtn.textContent = m ? 'Muted' : 'Sound on';
    soundBtn.setAttribute('aria-pressed', m ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', m ? 'Sound off' : 'Sound on');
  }

  function syncContrastButton(): void {
    if (!contrastBtn) {
      return;
    }
    const on = loadContrastHigh();
    contrastBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    contrastBtn.textContent = on ? 'High contrast on' : 'High contrast';
  }

  syncSoundButton();
  syncContrastButton();

  soundBtn?.addEventListener('click', () => {
    setMuted(!isMuted());
    syncSoundButton();
  });

  contrastBtn?.addEventListener('click', () => {
    setContrastHigh(!loadContrastHigh());
    syncContrastButton();
  });

  const boardHost = root.querySelector<HTMLElement>('.mg-board-stage .mg-board-host');
  if (!boardHost) {
    throw new Error('Board host element not found.');
  }

  const levelIndex = readLevelIndexFromSearch();
  const level = getLevelOrDefault(levelIndex);

  shell.style.setProperty('--mg-board-cols', String(level.cols));
  shell.style.setProperty('--mg-board-rows', String(level.rows));

  const levelPill = root.querySelector<HTMLElement>('.mg-level-pill');
  if (levelPill) {
    levelPill.textContent = `${levelIndex + 1} / ${LEVELS.length} · ${level.title}`;
  }

  const hudScoreEl = root.querySelector<HTMLElement>('.mg-hud__score');
  const hudTimerEl = root.querySelector<HTMLElement>('.mg-hud__timer');
  const hudFill = root.querySelector<HTMLElement>('.mg-hud__fill');
  const hudTrack = root.querySelector<HTMLElement>('.mg-hud__track');
  const overlay = root.querySelector<HTMLElement>('.mg-overlay');
  const nextBtn = root.querySelector<HTMLButtonElement>('.mg-next-level');

  function formatSeconds(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  const gateEl = root.querySelector<HTMLElement>('#mg-difficulty-gate');
  if (parseDifficultyFromSearch()) {
    markDifficultyOnboarded();
  }
  if (new URLSearchParams(window.location.search).has('difficulty')) {
    persistDifficulty(loadDifficulty());
  }

  if (shouldShowDifficultyGate()) {
    gateEl?.classList.remove('mg-difficulty-gate--hidden');
    gateEl?.setAttribute('aria-hidden', 'false');
    shell.classList.add('mg-shell--gated');
  } else {
    gateEl?.classList.add('mg-difficulty-gate--hidden');
    gateEl?.setAttribute('aria-hidden', 'true');
  }

  let overlayOutcome: 'win' | 'lose' | null = null;
  let prevHudScore = -1;
  let prevHudPct = -1;
  /** Last score shown in HUD (same run — resets each level load). */
  let lastScore = 0;

  let gameProgress = loadProgress(pickDailyMissionIds);
  const gameStart = registerGameStart(gameProgress);
  gameProgress = gameStart.next;
  saveProgress(gameProgress);
  const achievementToastHost = root.querySelector<HTMLElement>('.mg-achievement-toast-host');
  const questsRootEl = root.querySelector<HTMLElement>('#mg-quests-root');
  for (const a of gameStart.newlyUnlocked) {
    showAchievementUnlockToast(achievementToastHost, a);
  }

  function updateHud(score: number, target: number): void {
    if (hudScoreEl) {
      hudScoreEl.textContent = `${score} / ${target}`;
      if (score > prevHudScore && prevHudScore >= 0) {
        hudScoreEl.classList.remove('mg-hud__score--pop');
        void hudScoreEl.offsetWidth;
        hudScoreEl.classList.add('mg-hud__score--pop');
        window.setTimeout(() => hudScoreEl.classList.remove('mg-hud__score--pop'), 560);
      }
    }
    const pct = target > 0 ? Math.min(100, Math.round((score / target) * 100)) : 0;
    if (hudFill) {
      hudFill.style.width = `${pct}%`;
      if (pct > prevHudPct && prevHudPct >= 0) {
        hudFill.classList.remove('mg-hud__fill--flash');
        void hudFill.offsetWidth;
        hudFill.classList.add('mg-hud__fill--flash');
        window.setTimeout(() => hudFill.classList.remove('mg-hud__fill--flash'), 480);
      }
    }
    if (hudTrack) {
      hudTrack.setAttribute('aria-valuenow', String(pct));
    }
    prevHudScore = score;
    prevHudPct = pct;
    lastScore = score;
  }

  function updateTimer(secondsLeft: number): void {
    if (hudTimerEl) {
      hudTimerEl.textContent = formatSeconds(secondsLeft);
    }
  }

  const toastHost = root.querySelector<HTMLElement>('.mg-toast-host');

  function showTimeBonusToast(secondsAdded: number): void {
    if (!toastHost || secondsAdded <= 0) {
      return;
    }
    const el = document.createElement('div');
    el.className = 'mg-time-toast';
    el.setAttribute('role', 'status');
    el.dataset.bonus = secondsAdded >= 10 ? 'high' : secondsAdded >= 5 ? 'mid' : 'low';
    el.textContent = `+${secondsAdded} sec`;
    toastHost.appendChild(el);
    window.setTimeout(() => {
      el.classList.add('mg-time-toast--out');
      window.setTimeout(() => el.remove(), 680);
    }, 2200);
  }

  function showLevelComplete(): void {
    if (!overlay || !nextBtn) {
      return;
    }
    playGameSound('levelComplete');
    const win = applyLevelWin(gameProgress, lastScore);
    gameProgress = win.next;
    saveProgress(gameProgress);
    for (const a of win.newlyUnlocked) {
      showAchievementUnlockToast(achievementToastHost, a);
    }
    if (questsRootEl && !questsRootEl.classList.contains('mg-quests--hidden')) {
      refreshQuestsMarkup(questsRootEl, gameProgress);
      syncQuestsHeaderButtons();
    }
    overlayOutcome = 'win';
    const titleEl = overlay.querySelector<HTMLElement>('.mg-overlay__title');
    const msgEl = overlay.querySelector<HTMLElement>('.mg-overlay__msg');
    const card = overlay.querySelector<HTMLElement>('.mg-overlay__card');
    if (titleEl) {
      titleEl.textContent = 'Level complete';
    }
    if (msgEl) {
      msgEl.textContent = 'Target score reached — outstanding run.';
    }
    const isLast = levelIndex >= LEVELS.length - 1;
    nextBtn.textContent = isLast ? 'Play again' : 'Next level';
    overlay.classList.remove('mg-overlay--hidden');
    overlay.classList.add('mg-overlay--victory');
    if (card) {
      card.classList.remove('mg-overlay__card--celebrate');
      void card.offsetWidth;
      card.classList.add('mg-overlay__card--celebrate');
    }
    overlay.setAttribute('aria-hidden', 'false');
  }

  function showGameOver(reason: 'no-moves' | 'time'): void {
    if (!overlay || !nextBtn) {
      return;
    }
    overlayOutcome = 'lose';
    const titleEl = overlay.querySelector<HTMLElement>('.mg-overlay__title');
    const msgEl = overlay.querySelector<HTMLElement>('.mg-overlay__msg');
    if (titleEl) {
      titleEl.textContent = 'Game over';
    }
    if (msgEl) {
      msgEl.textContent = reason === 'time' ? 'Time is up.' : 'No moves left.';
    }
    nextBtn.textContent = 'Try again';
    overlay.classList.remove('mg-overlay--victory');
    overlay.classList.remove('mg-overlay--hidden');
    overlay.setAttribute('aria-hidden', 'false');
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const params = new URLSearchParams(window.location.search);
      if (overlayOutcome === 'lose') {
        params.set('level', String(levelIndex));
        params.set('seed', String(Date.now()));
        applyDifficultyToParams(params);
        window.location.assign(`${window.location.pathname}?${params.toString()}`);
        return;
      }
      const next = levelIndex >= LEVELS.length - 1 ? 0 : levelIndex + 1;
      params.set('level', String(next));
      applyDifficultyToParams(params);
      window.location.assign(`${window.location.pathname}?${params.toString()}`);
    });
  }

  function navigateToLevel(nextIndex: number): void {
    const clamped = Math.max(0, Math.min(nextIndex, LEVELS.length - 1));
    const params = new URLSearchParams(window.location.search);
    params.set('level', String(clamped));
    applyDifficultyToParams(params);
    window.location.assign(`${window.location.pathname}?${params.toString()}`);
  }

  const prevNav = root.querySelector<HTMLButtonElement>('[data-action="prev-level"]');
  const nextNav = root.querySelector<HTMLButtonElement>('[data-action="next-level"]');
  if (prevNav) {
    prevNav.disabled = levelIndex <= 0;
  }
  if (nextNav) {
    nextNav.disabled = levelIndex >= LEVELS.length - 1;
  }

  function syncQuestsHeaderButtons(): void {
    const dailyBtn = root.querySelector<HTMLButtonElement>('#mg-header-btn-daily');
    const achBtn = root.querySelector<HTMLButtonElement>('#mg-header-btn-achievements');
    const open = questsRootEl && !questsRootEl.classList.contains('mg-quests--hidden');
    const activeTab = open
      ? questsRootEl?.querySelector<HTMLButtonElement>('.mg-quests__tab.mg-quests__tab--active')?.dataset.tab
      : null;
    const dailyOn = Boolean(open && activeTab === 'daily');
    const achOn = Boolean(open && activeTab === 'achievements');
    dailyBtn?.classList.toggle('mg-header-quest-btn--on', dailyOn);
    achBtn?.classList.toggle('mg-header-quest-btn--on', achOn);
    dailyBtn?.setAttribute('aria-pressed', dailyOn ? 'true' : 'false');
    achBtn?.setAttribute('aria-pressed', achOn ? 'true' : 'false');
  }

  function openQuestsPanel(tab?: QuestsTabId): void {
    if (!questsRootEl) {
      return;
    }
    refreshQuestsMarkup(questsRootEl, gameProgress);
    if (tab) {
      activateQuestsTab(questsRootEl, tab);
    }
    questsRootEl.classList.remove('mg-quests--hidden');
    questsRootEl.setAttribute('aria-hidden', 'false');
    syncQuestsHeaderButtons();
  }

  function closeQuestsPanel(): void {
    if (!questsRootEl) {
      return;
    }
    questsRootEl.classList.add('mg-quests--hidden');
    questsRootEl.setAttribute('aria-hidden', 'true');
    syncQuestsHeaderButtons();
  }

  if (questsRootEl) {
    bindQuestsTabs(questsRootEl);
    refreshQuestsMarkup(questsRootEl, gameProgress);
    questsRootEl.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-close-quests]')) {
        closeQuestsPanel();
        return;
      }
      if ((e.target as HTMLElement).closest('.mg-quests__tab')) {
        syncQuestsHeaderButtons();
      }
    });
    syncQuestsHeaderButtons();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') {
      return;
    }
    if (gateEl && !gateEl.classList.contains('mg-difficulty-gate--hidden')) {
      return;
    }
    if (!questsRootEl || questsRootEl.classList.contains('mg-quests--hidden')) {
      return;
    }
    closeQuestsPanel();
  });

  root.querySelectorAll<HTMLButtonElement>('.mg-header [data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const params = new URLSearchParams(window.location.search);
      if (action === 'open-quests') {
        const raw = btn.dataset.questsTab;
        const tab: QuestsTabId | undefined =
          raw === 'daily' || raw === 'achievements' ? raw : undefined;
        openQuestsPanel(tab);
        return;
      }
      if (action === 'prev-level') {
        navigateToLevel(levelIndex - 1);
        return;
      }
      if (action === 'next-level') {
        navigateToLevel(levelIndex + 1);
        return;
      }
      if (action === 'new-seed') {
        params.set('seed', String(Date.now()));
        applyDifficultyToParams(params);
        window.location.assign(`${window.location.pathname}?${params.toString()}`);
      }
    });
  });

  let boardMounted = false;

  function startSession(difficulty: DifficultyId): void {
    if (boardMounted) {
      return;
    }
    boardMounted = true;
    const sessionTiming = resolveSessionTiming(level, difficulty);
    const timerEnabled = sessionTiming.timeLimitSeconds > 0;
    if (hudTimerEl) {
      hudTimerEl.textContent = timerEnabled ? formatSeconds(sessionTiming.timeLimitSeconds) : '—';
    }
    const seed = readSeedFromSearch() ?? Date.now();
    mountBoardSession(boardHost, {
      seed,
      theme,
      level,
      sessionTiming,
      onSoundEffect: (kind) => {
        playGameSound(kind);
      },
      onScoreChange: updateHud,
      onLevelComplete: showLevelComplete,
      onTimerTick: timerEnabled ? updateTimer : undefined,
      onTimeBonus: timerEnabled ? showTimeBonusToast : undefined,
      onGameOver: showGameOver,
      onTurnStats: (payload) => {
        const r = applyTurnStats(gameProgress, payload);
        gameProgress = r.next;
        saveProgress(gameProgress);
        for (const a of r.newlyUnlocked) {
          showAchievementUnlockToast(achievementToastHost, a);
        }
      if (questsRootEl && !questsRootEl.classList.contains('mg-quests--hidden')) {
        refreshQuestsMarkup(questsRootEl, gameProgress);
        syncQuestsHeaderButtons();
      }
    },
  });
}

  if (gateEl) {
    gateEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-difficulty]');
      if (!btn?.dataset.difficulty) {
        return;
      }
      const v = btn.dataset.difficulty;
      if (v !== 'relaxed' && v !== 'normal' && v !== 'pressure') {
        return;
      }
      persistDifficulty(v);
      markDifficultyOnboarded();
      const params = new URLSearchParams(window.location.search);
      params.set('difficulty', v);
      history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
      gateEl.classList.add('mg-difficulty-gate--hidden');
      gateEl.setAttribute('aria-hidden', 'true');
      shell.classList.remove('mg-shell--gated');
      startSession(v);
    });
  }

  if (!shouldShowDifficultyGate()) {
    startSession(loadDifficulty());
  }

  registerSW({ immediate: true });
}

bootstrap();
