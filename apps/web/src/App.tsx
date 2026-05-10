import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from '@/store'
import { postTelegramAuth } from '@/lib/api'
import Layout from '@/components/Layout'
import { Toast } from '@/components/Toast'
import Home from '@/pages/Home'
import Masters from '@/pages/Masters'
import Notifications from '@/pages/Notifications'
import Profile from '@/pages/Profile'
import Onboarding from '@/pages/Onboarding'
import MasterProfile from '@/pages/MasterProfile'
import JobDetail from '@/pages/JobDetail'
import CreateJob from '@/pages/CreateJob'
import MasterSettings from '@/pages/MasterSettings'

export default function App() {
  const { token, isOnboarded, language, setToken } = useStore()
  const [loading, setLoading] = useState(!token)

  useEffect(() => {
    if (token) { setLoading(false); return }
    const initData = window.Telegram?.WebApp.initData
    if (!initData) { setLoading(false); return }
    postTelegramAuth(initData, language)
      .then(({ token: t }) => setToken(t))
      .finally(() => setLoading(false))
  }, [])

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
        <p className="text-muted">Откройте приложение через Telegram</p>
      </div>
    )
  }

  if (!isOnboarded) {
    return <Onboarding />
  }

  return (
    <>
      <Toast />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/masters" element={<Masters />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="/masters/:id" element={<MasterProfile />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/jobs/new" element={<CreateJob />} />
        <Route path="/profile/master" element={<MasterSettings />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  )
}
