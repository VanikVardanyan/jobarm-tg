import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@jobbarm/shared'

type ActiveRole = 'customer' | 'master'
type ThemeMode = 'auto' | 'light' | 'dark'

interface AppState {
  token: string | null
  language: Language
  activeRole: ActiveRole
  isMaster: boolean
  isOnboarded: boolean
  themeMode: ThemeMode
  setToken: (token: string) => void
  setLanguage: (lang: Language) => void
  setActiveRole: (role: ActiveRole) => void
  setIsMaster: (v: boolean) => void
  setIsOnboarded: (v: boolean) => void
  setThemeMode: (mode: ThemeMode) => void
  reset: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      language: 'hy',
      activeRole: 'customer',
      isMaster: false,
      isOnboarded: false,
      themeMode: 'auto',
      setToken: (token) => set({ token }),
      setLanguage: (language) => set({ language }),
      setActiveRole: (activeRole) => set({ activeRole }),
      setIsMaster: (isMaster) => set({ isMaster }),
      setIsOnboarded: (isOnboarded) => set({ isOnboarded }),
      setThemeMode: (themeMode) => set({ themeMode }),
      reset: () =>
        set({ token: null, isOnboarded: false, isMaster: false, activeRole: 'customer' }),
    }),
    {
      name: 'jobbarm-store',
      partialize: (s) => ({
        token: s.token,
        language: s.language,
        activeRole: s.activeRole,
        isMaster: s.isMaster,
        isOnboarded: s.isOnboarded,
        themeMode: s.themeMode,
      }),
    }
  )
)
