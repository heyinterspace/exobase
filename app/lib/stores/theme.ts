import { atom } from 'nanostores';
import { logStore } from './logs';

export type Theme = 'dark' | 'light';

export const kTheme = 'bolt_theme';

export function themeIsDark() {
  return themeStore.get() === 'dark';
}

/*
 * Exobase is dark-mode only (structured.glass's neobrutalist look is designed
 * against a dark canvas) — there's no light theme to fall back to anymore.
 */
export const DEFAULT_THEME = 'dark';

export const themeStore = atom<Theme>(DEFAULT_THEME);

/*
 * No-op: kept so the toggleTheme keyboard shortcut (settings.ts) and
 * ThemeSwitch's onClick handler stay valid call sites without needing to
 * hunt those down too. There's only one theme now, so there's nothing to
 * toggle to.
 */
export function toggleTheme() {
  logStore.logSystem('Theme toggle ignored — Exobase is dark-mode only');
}
