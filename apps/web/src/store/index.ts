import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@jobbarm/shared'

type ThemeMode = 'auto' | 'light' | 'dark'

interface AppState {
  token: string | null
  language: Language
  themeMode: ThemeMode
  setToken: (token: string) => void
  setLanguage: (lang: Language) => void
  setThemeMode: (mode: ThemeMode) => void
  reset: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      language: 'ru',
      themeMode: 'auto',
      setToken: (token) => set({ token }),
      setLanguage: (language) => set({ language }),
      setThemeMode: (themeMode) => set({ themeMode }),
      reset: () => set({ token: null }),
    }),
    {
      name: 'autoservice-store',
      partialize: (s) => ({ token: s.token, language: s.language, themeMode: s.themeMode }),
    }
  )
)
