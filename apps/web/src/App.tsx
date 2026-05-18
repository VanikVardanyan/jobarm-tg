import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useT } from '@/lib/i18n'
import { postTelegramAuth, getMe } from '@/lib/api'
import { Toast } from '@/components/Toast'
import RequestsPage from '@/pages/RequestsPage'
import RequestDetailPage from '@/pages/RequestDetailPage'
import CarsPage from '@/pages/CarsPage'
import ProfilePage from '@/pages/ProfilePage'

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
        <Toast />
        <p className="text-muted">{t.app.openInTelegram}</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/requests" replace />} />
      <Route path="/requests" element={<RequestsPage />} />
      <Route path="/requests/:id" element={<RequestDetailPage />} />
      <Route path="/cars" element={<CarsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/requests" replace />} />
    </Routes>
  )
}
