export type GameSoundId = 'match' | 'bomb' | 'timeBonus' | 'levelComplete';

const CANDIDATES: Record<GameSoundId, readonly string[]> = {
  match: ['/sounds/match.ogg', '/sounds/match.wav', '/sounds/match.mp3'],
  bomb: ['/sounds/bomb.ogg', '/sounds/bomb.wav', '/sounds/bomb.mp3'],
  timeBonus: ['/sounds/time-bonus.ogg', '/sounds/time-bonus.wav', '/sounds/time_bonus.ogg', '/sounds/time_bonus.wav'],
  levelComplete: [
    '/sounds/level-complete.ogg',
    '/sounds/level-complete.wav',
    '/sounds/level_complete.ogg',
    '/sounds/level_complete.wav',
  ],
};

const STORAGE_MUTE = 'matchgrid-audio-muted';

let muted = false;
/** First working URL index per sound id (avoids re-probing missing files). */
const workingIndex: Partial<Record<GameSoundId, number>> = {};

export function loadMutePreference(): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }
  try {
    return localStorage.getItem(STORAGE_MUTE) === '1';
  } catch {
    return false;
  }
}

export function saveMutePreference(m: boolean): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_MUTE, m ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function setMuted(m: boolean): void {
  muted = m;
  saveMutePreference(m);
}

export function isMuted(): boolean {
  return muted;
}

export function initGameAudio(): void {
  muted = loadMutePreference();
}

function tryPlayFrom(id: GameSoundId, startIndex: number): void {
  const urls = CANDIDATES[id];
  if (startIndex >= urls.length) {
    return;
  }
  const url = urls[startIndex]!;
  const a = new Audio(url);
  a.volume = 0.42;
  const onPlaying = (): void => {
    workingIndex[id] = startIndex;
    a.removeEventListener('playing', onPlaying);
  };
  a.addEventListener('playing', onPlaying, { once: true });
  a.addEventListener(
    'error',
    () => {
      a.removeEventListener('playing', onPlaying);
      tryPlayFrom(id, startIndex + 1);
    },
    { once: true },
  );
  void a.play().catch(() => {
    a.removeEventListener('playing', onPlaying);
    tryPlayFrom(id, startIndex + 1);
  });
}

export function playGameSound(id: GameSoundId): void {
  if (muted) {
    return;
  }
  const idx = workingIndex[id] ?? 0;
  tryPlayFrom(id, idx);
}
