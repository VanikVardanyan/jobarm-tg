import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { postTelegramAuth, getMe } from '@/lib/api'
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
  const { token, isOnboarded, language, setToken, setIsOnboarded, setIsMaster } = useStore()
  const [loading, setLoading] = useState(!token)
  const navigate = useNavigate()

  useEffect(() => {
    if (token) { setLoading(false); return }
    const initData = window.Telegram?.WebApp.initData
    if (!initData) { setLoading(false); return }
    postTelegramAuth(initData, language)
      .then(({ token: t }) => setToken(t))
      .finally(() => setLoading(false))
  }, [])

  // Auto-restore onboarding state from server when local flag is missing
  useEffect(() => {
    if (!token || isOnboarded) return
    getMe()
      .then((me) => {
        if (me.phone && me.name && me.name !== 'User') {
          setIsOnboarded(true)
          setIsMaster(me.isMaster)
        }
      })
      .catch(() => undefined)
  }, [token, isOnboarded])

  // Deep-link from bot notification: ?startapp=job_<id> opens that job.
  // Param is captured in main.tsx before the router boots; we navigate as soon as routes are mounted.
  useEffect(() => {
    const param = (window as { __startParam?: string | null }).__startParam
    if (!token || !isOnboarded || !param?.startsWith('job_')) return
    ;(window as { __startParam?: string | null }).__startParam = null
    const jobId = param.slice(4)
    // Use replaceState so React Router picks it up on next render too
    navigate(`/jobs/${jobId}`, { replace: true })
  }, [token, isOnboarded])

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

  // Deep-link target takes precedence over default home redirect
  const startParam = (window as { __startParam?: string | null }).__startParam
  const initialRedirect =
    startParam?.startsWith('job_') ? `/jobs/${startParam.slice(4)}` : '/home'

  return (
    <>
      <Toast />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to={initialRedirect} replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/masters" element={<Masters />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="/masters/:id" element={<MasterProfile />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/jobs/new" element={<CreateJob />} />
        <Route path="/profile/master" element={<MasterSettings />} />
        <Route path="*" element={<Navigate to={initialRedirect} replace />} />
      </Routes>
    </>
  )
}
