import { create } from 'zustand'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

type ToastKind = 'success' | 'error'

interface ToastState {
  message: string | null
  kind: ToastKind
  show: (message: string, kind?: ToastKind) => void
  hide: () => void
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  kind: 'success',
  show: (message, kind = 'success') => {
    set({ message, kind })
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(kind)
  },
  hide: () => set({ message: null }),
}))

export function Toast() {
  const { message, kind, hide } = useToast()

  useEffect(() => {
    if (!message) return
    const t = setTimeout(hide, 2000)
    return () => clearTimeout(t)
  }, [message, hide])

  if (!message) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={cn(
          'px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg text-white',
          kind === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
        )}
      >
        {message}
      </div>
    </div>
  )
}
