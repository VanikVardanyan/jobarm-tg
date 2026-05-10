const BRAND_PRIMARY = '#6366f1'
const BRAND_BUTTON_TEXT = '#ffffff'
const BRAND_LINK = '#6366f1'

export function applyTelegramTheme() {
  const tg = window.Telegram?.WebApp
  if (!tg) return

  const params = tg.themeParams ?? {}
  const isDark = tg.colorScheme === 'dark'

  const root = document.documentElement.style
  root.setProperty('--tg-theme-bg-color', params.bg_color ?? (isDark ? '#0b0f1a' : '#ffffff'))
  root.setProperty('--tg-theme-text-color', params.text_color ?? (isDark ? '#f3f4f6' : '#0b0f1a'))
  root.setProperty('--tg-theme-hint-color', params.hint_color ?? (isDark ? '#9ca3af' : '#6b7280'))
  root.setProperty(
    '--tg-theme-secondary-bg-color',
    params.secondary_bg_color ?? (isDark ? '#1f2937' : '#f3f4f6')
  )

  // Brand colors stay the same regardless of theme
  root.setProperty('--tg-theme-button-color', BRAND_PRIMARY)
  root.setProperty('--tg-theme-button-text-color', BRAND_BUTTON_TEXT)
  root.setProperty('--tg-theme-link-color', BRAND_LINK)
}

export function watchTelegramTheme() {
  applyTelegramTheme()
  window.Telegram?.WebApp?.onEvent('themeChanged', applyTelegramTheme)
}
