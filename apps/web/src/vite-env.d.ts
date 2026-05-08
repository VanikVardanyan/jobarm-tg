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
      }
      ready(): void
      expand(): void
      close(): void
      themeParams: Record<string, string>
    }
  }
}
