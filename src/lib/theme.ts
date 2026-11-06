export type AppTheme = 'colorful' | 'dark';

const THEME_KEY = 'wrlc-expense-report:theme:v1';
const THEMES: AppTheme[] = ['colorful', 'dark'];

export function loadTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    // Older installs may still have the removed "light" choice saved.
    return THEMES.includes(saved as AppTheme) ? saved as AppTheme : 'colorful';
  } catch {
    return 'colorful';
  }
}

export function saveTheme(theme: AppTheme): void {
  localStorage.setItem(THEME_KEY, theme);
}
