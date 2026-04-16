export const STORAGE_CONTRAST = 'matchgrid-contrast';

export function loadContrastHigh(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get('contrast') === 'high') {
    return true;
  }
  try {
    return localStorage.getItem(STORAGE_CONTRAST) === 'high';
  } catch {
    return false;
  }
}

export function setContrastHigh(high: boolean): void {
  if (high) {
    document.documentElement.dataset.mgContrast = 'high';
  } else {
    document.documentElement.removeAttribute('data-mg-contrast');
  }
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_CONTRAST, high ? 'high' : 'normal');
  } catch {
    /* ignore */
  }
}

export function applyContrastFromStorage(): void {
  setContrastHigh(loadContrastHigh());
}
