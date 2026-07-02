import { globSync } from 'fast-glob';
import fs from 'node:fs/promises';
import { basename } from 'node:path';
import { defineConfig, presetIcons } from 'unocss';

/*
 * Tailwind is the utility-class engine for this app (see tailwind.config.ts).
 * UnoCSS is kept around solely for its icon preset — presetIcons turns
 * `i-ph:gear`/`i-bolt:logo`-style classes into real inline SVGs on demand,
 * something Tailwind has no built-in equivalent for, and hundreds of
 * components already reference these classes.
 */

const iconPaths = globSync('./icons/*.svg');

const collectionName = 'bolt';

const customIconCollection = iconPaths.reduce(
  (acc, iconPath) => {
    const [iconName] = basename(iconPath).split('.');

    acc[collectionName] ??= {};
    acc[collectionName][iconName] = async () => fs.readFile(iconPath, 'utf8');

    return acc;
  },
  {} as Record<string, Record<string, () => Promise<string>>>,
);

export default defineConfig({
  safelist: [...Object.keys(customIconCollection[collectionName] || {}).map((x) => `i-bolt:${x}`)],
  presets: [
    presetIcons({
      warn: true,
      collections: {
        ...customIconCollection,
      },
      unit: 'em',
    }),
  ],
});
