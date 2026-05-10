import { useStore } from '@/store'

const BRAND_PRIMARY = '#6366f1'
const BRAND_BUTTON_TEXT = '#ffffff'
const BRAND_LINK = '#6366f1'

const LIGHT = {
  bg: '#ffffff',
  text: '#0b0f1a',
  hint: '#6b7280',
  secondary: '#e5e7eb',
}

const DARK = {
  bg: '#0b0f1a',
  text: '#f3f4f6',
  hint: '#9ca3af',
  secondary: '#1f2937',
}

function isDarkMode(): boolean {
  const mode = useStore.getState().themeMode
  if (mode === 'light') return false
  if (mode === 'dark') return true
  return window.Telegram?.WebApp?.colorScheme === 'dark'
}

export function applyTheme() {
  const dark = isDarkMode()
  const palette = dark ? DARK : LIGHT
  const root = document.documentElement.style

  root.setProperty('--tg-theme-bg-color', palette.bg)
  root.setProperty('--tg-theme-text-color', palette.text)
  root.setProperty('--tg-theme-hint-color', palette.hint)
  root.setProperty('--tg-theme-secondary-bg-color', palette.secondary)
  root.setProperty('--tg-theme-button-color', BRAND_PRIMARY)
  root.setProperty('--tg-theme-button-text-color', BRAND_BUTTON_TEXT)
  root.setProperty('--tg-theme-link-color', BRAND_LINK)

  document.documentElement.classList.toggle('dark', dark)
}

export function watchTheme() {
  applyTheme()
  window.Telegram?.WebApp?.onEvent('themeChanged', applyTheme)
  useStore.subscribe(() => applyTheme())
}
