import { beforeEach, describe, expect, it } from 'vitest';
import { loadTheme, saveTheme } from './theme';

describe('saved appearance', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to light', () => expect(loadTheme()).toBe('light'));

  it('saves and restores each supported theme', () => {
    for (const theme of ['light', 'colorful', 'dark'] as const) {
      saveTheme(theme);
      expect(loadTheme()).toBe(theme);
    }
  });

  it('falls back to light for an unknown saved value', () => {
    localStorage.setItem('wrlc-expense-report:theme:v1', 'unknown');
    expect(loadTheme()).toBe('light');
  });
});
