import { atom } from 'nanostores';

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
