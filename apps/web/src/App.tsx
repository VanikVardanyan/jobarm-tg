import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { postTelegramAuth, getMe } from '@/lib/api'
import { Toast } from '@/components/Toast'
import { useT } from '@/lib/i18n'

export default function App() {
  const { token, language, setToken } = useStore()
  const [loading, setLoading] = useState(!token)
  const t = useT()

  useEffect(() => {
    if (token) {
      setLoading(false)
      return
    }
    const initData = window.Telegram?.WebApp.initData
    if (!initData) {
      setLoading(false)
      return
    }
    postTelegramAuth(initData, language)
      .then(({ token: tk }) => setToken(tk))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!token) return
    getMe().catch(() => undefined)
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 text-center">
        <p className="text-muted">{t.app.openInTelegram}</p>
      </div>
    )
  }

  return (
    <>
      <Toast />
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center gap-2">
        <h1 className="text-2xl font-bold">{t.app.name}</h1>
        <p className="text-muted">{t.app.placeholder}</p>
      </div>
    </>
  )
}
