import { beforeEach, describe, expect, it } from 'vitest';
import { loadTheme, saveTheme } from './theme';

describe('saved appearance', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to colorful', () => expect(loadTheme()).toBe('colorful'));

  it('saves and restores each supported theme', () => {
    for (const theme of ['colorful', 'dark'] as const) {
      saveTheme(theme);
      expect(loadTheme()).toBe(theme);
    }
  });

  it('falls back to colorful for an unknown or removed theme', () => {
    localStorage.setItem('wrlc-expense-report:theme:v1', 'unknown');
    expect(loadTheme()).toBe('colorful');
    localStorage.setItem('wrlc-expense-report:theme:v1', 'light');
    expect(loadTheme()).toBe('colorful');
  });
});
