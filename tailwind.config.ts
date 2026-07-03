import type { Config } from 'tailwindcss';
import { COLOR_PRIMITIVES, BOLT_ELEMENT_COLORS } from './theme-colors';

export default {
  content: ['./app/**/*.{ts,tsx,jsx,js}'],
  theme: {
    extend: {
      fontFamily: {
        display: 'var(--sl-font-display)',
        body: 'var(--sl-font-body)',
        mono: 'var(--sl-font-mono)',
      },
      colors: {
        ...COLOR_PRIMITIVES,
        ...BOLT_ELEMENT_COLORS,
      },
    },
  },
} satisfies Config;
