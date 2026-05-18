import axios from 'axios'
import { useStore } from '@/store'
import type { UserProfile } from '@jobbarm/shared'

const client = axios.create({ baseURL: '/api' })

client.interceptors.request.use((cfg) => {
  const token = useStore.getState().token
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export const postTelegramAuth = (initData: string, language: string) =>
  client
    .post<{ token: string; isNew: boolean }>('/auth/telegram', { initData, language })
    .then((r) => r.data)

export const getMe = () => client.get<UserProfile>('/me').then((r) => r.data)

export const putMe = (data: Partial<Pick<UserProfile, 'phoneNumber' | 'language'>>) =>
  client.put<UserProfile>('/me', data).then((r) => r.data)

// Telegram-stored media is served via the backend file-proxy (added in Phase 4).
export const fileUrl = (fileId: string) => `/api/files/${encodeURIComponent(fileId)}`
