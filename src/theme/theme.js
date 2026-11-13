const KEY = 'galaga-theme';
export const THEMES = ['dark', 'light'];

export function getStoredTheme() {
  try {
    const value = localStorage.getItem(KEY);
    return THEMES.includes(value) ? value : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // sem localStorage: o tema vale só nesta sessão
  }
}