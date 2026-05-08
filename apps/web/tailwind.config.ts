import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans', 'Noto Sans Armenian', 'sans-serif'],
      },
      colors: {
        background: 'var(--tg-theme-bg-color)',
        foreground: 'var(--tg-theme-text-color)',
        primary: {
          DEFAULT: 'var(--tg-theme-button-color)',
          foreground: 'var(--tg-theme-button-text-color)',
        },
        secondary: {
          DEFAULT: 'var(--tg-theme-secondary-bg-color)',
          foreground: 'var(--tg-theme-text-color)',
        },
        muted: {
          DEFAULT: 'var(--tg-theme-hint-color)',
          foreground: 'var(--tg-theme-hint-color)',
        },
        link: 'var(--tg-theme-link-color)',
      },
    },
  },
  plugins: [],
} satisfies Config
