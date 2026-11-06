export type AppTheme = 'light' | 'colorful' | 'dark';

const THEME_KEY = 'wrlc-expense-report:theme:v1';
const THEMES: AppTheme[] = ['light', 'colorful', 'dark'];

export function loadTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return THEMES.includes(saved as AppTheme) ? saved as AppTheme : 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(theme: AppTheme): void {
  localStorage.setItem(THEME_KEY, theme);
}
