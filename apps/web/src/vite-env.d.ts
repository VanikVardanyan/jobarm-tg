/// <reference types="vite/client" />

interface Window {
  Telegram: {
    WebApp: {
      initData: string
      initDataUnsafe: {
        user?: {
          id: number
          first_name: string
          last_name?: string
          language_code?: string
        }
        start_param?: string
      }
      ready(): void
      expand(): void
      close(): void
      openLink?: (url: string, options?: { try_browser?: string }) => void
      openTelegramLink?: (url: string) => void
      requestFullscreen?: () => void
      exitFullscreen?: () => void
      disableVerticalSwipes?: () => void
      isExpanded?: boolean
      isFullscreen?: boolean
      viewportHeight?: number
      viewportStableHeight?: number
      themeParams: Record<string, string>
      colorScheme: 'light' | 'dark'
      onEvent(event: string, callback: () => void): void
      offEvent(event: string, callback: () => void): void
      HapticFeedback?: {
        notificationOccurred(type: 'success' | 'error' | 'warning'): void
        impactOccurred(style: 'light' | 'medium' | 'heavy'): void
      }
    }
  }
}
