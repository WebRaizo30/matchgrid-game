import { ACHIEVEMENTS } from '../progression/definitions';
import { missionDefById, missionProgress } from '../progression/logic';
import type { AchievementDef, StoredProgressV1 } from '../progression/types';

export type QuestsTabId = 'daily' | 'achievements';

export function activateQuestsTab(questsRoot: HTMLElement, tab: QuestsTabId): void {
  const tabs = questsRoot.querySelectorAll<HTMLButtonElement>('.mg-quests__tab');
  const panels = questsRoot.querySelectorAll<HTMLElement>('.mg-quests__panel');
  tabs.forEach((t) => {
    const on = t.dataset.tab === tab;
    t.classList.toggle('mg-quests__tab--active', on);
    t.setAttribute('aria-selected', String(on));
  });
  panels.forEach((p) => {
    const show = p.dataset.panel === tab;
    p.toggleAttribute('hidden', !show);
    p.classList.toggle('mg-quests__panel--active', show);
  });
}

export function renderQuestsPanelContent(progress: StoredProgressV1): string {
  const unlocked = new Set(progress.unlockedAchievementIds);
  const achievementRows = ACHIEVEMENTS.map((a) => {
    const ok = unlocked.has(a.id);
    return `
      <li class="mg-quests__achievement mg-quests__achievement-card ${ok ? 'mg-quests__achievement--unlocked' : 'mg-quests__achievement--locked'}" data-id="${escapeHtml(a.id)}">
        <span class="mg-quests__ach-icon" aria-hidden="true">${a.icon}</span>
        <span class="mg-quests__ach-body">
          <span class="mg-quests__ach-title">${escapeHtml(a.title)}</span>
          <span class="mg-quests__ach-desc">${escapeHtml(a.description)}</span>
        </span>
        <span class="mg-quests__ach-state">${ok ? 'Unlocked' : 'Locked'}</span>
      </li>`;
  }).join('');

  const dailyRows = progress.daily.activeMissionIds
    .map((mid) => missionDefById(mid))
    .filter((m): m is NonNullable<typeof m> => m != null)
    .map((def) => {
      const { current, target, complete } = missionProgress(def, progress.daily);
      const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      return `
      <li class="mg-quests__mission mg-quests__mission-card ${complete ? 'mg-quests__mission--done' : ''}">
        <p class="mg-quests__mission-text">${escapeHtml(def.description)}</p>
        <div class="mg-quests__mission-track" role="progressbar" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${Math.min(current, target)}">
          <div class="mg-quests__mission-fill" style="width:${pct}%"></div>
        </div>
        <p class="mg-quests__mission-meta">${current} / ${target}${complete ? ' · Done' : ''}</p>
      </li>`;
    })
    .join('');

  return `
    <div class="mg-quests__panels">
      <div class="mg-quests__panel mg-quests__panel--active" data-panel="daily" role="tabpanel">
        <p class="mg-quests__hint">Resets at UTC midnight · ${escapeHtml(progress.daily.dateKey)}</p>
        <ul class="mg-quests__list mg-quests__list--missions">${dailyRows || '<li class="mg-quests__empty">No daily missions.</li>'}</ul>
      </div>
      <div class="mg-quests__panel" data-panel="achievements" role="tabpanel" hidden>
        <p class="mg-quests__hint">${unlocked.size} / ${ACHIEVEMENTS.length} achievements unlocked</p>
        <ul class="mg-quests__list mg-quests__list--achievements">${achievementRows}</ul>
      </div>
    </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** One delegated listener so refreshing panel markup does not stack handlers. */
export function bindQuestsTabs(questsRoot: HTMLElement): void {
  if (questsRoot.dataset.mgQuestsUiBound === '1') {
    return;
  }
  questsRoot.dataset.mgQuestsUiBound = '1';
  questsRoot.addEventListener('click', (e) => {
    const tab = (e.target as HTMLElement).closest<HTMLButtonElement>('.mg-quests__tab');
    if (!tab || !questsRoot.contains(tab)) {
      return;
    }
    const name = tab.dataset.tab;
    if (name !== 'daily' && name !== 'achievements') {
      return;
    }
    activateQuestsTab(questsRoot, name);
  });
}

export function refreshQuestsMarkup(questsRoot: HTMLElement, progress: StoredProgressV1): void {
  const body = questsRoot.querySelector<HTMLElement>('.mg-quests__body');
  if (!body) {
    return;
  }
  const activeTab =
    questsRoot.querySelector<HTMLButtonElement>('.mg-quests__tab.mg-quests__tab--active')?.dataset.tab ??
    'daily';
  body.innerHTML = renderQuestsPanelContent(progress);
  const tabs = questsRoot.querySelectorAll<HTMLButtonElement>('.mg-quests__tab');
  const panels = questsRoot.querySelectorAll<HTMLElement>('.mg-quests__panel');
  tabs.forEach((t) => {
    const on = t.dataset.tab === activeTab;
    t.classList.toggle('mg-quests__tab--active', on);
    t.setAttribute('aria-selected', String(on));
  });
  panels.forEach((p) => {
    const show = p.dataset.panel === activeTab;
    p.toggleAttribute('hidden', !show);
    p.classList.toggle('mg-quests__panel--active', show);
  });
  bindQuestsTabs(questsRoot);
}

/** Small toast line for newly unlocked achievement (English). */
export function showAchievementUnlockToast(host: HTMLElement | null, def: AchievementDef): void {
  if (!host) {
    return;
  }
  const el = document.createElement('div');
  el.className = 'mg-achievement-toast';
  el.setAttribute('role', 'status');
  const lab = document.createElement('span');
  lab.className = 'mg-achievement-toast__label';
  lab.textContent = 'Achievement unlocked';
  const title = document.createElement('span');
  title.className = 'mg-achievement-toast__title';
  title.textContent = `${def.icon} ${def.title}`;
  el.appendChild(lab);
  el.appendChild(title);
  host.appendChild(el);
  window.setTimeout(() => {
    el.classList.add('mg-achievement-toast--out');
    window.setTimeout(() => el.remove(), 520);
  }, 3200);
}
