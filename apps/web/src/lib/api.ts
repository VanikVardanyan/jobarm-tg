import axios from 'axios'
import { useStore } from '@/store'
import type { Category, Job, Application, UserProfile, Review } from '@jobbarm/shared'

const client = axios.create({ baseURL: '/api' })

client.interceptors.request.use((cfg) => {
  const token = useStore.getState().token
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Auth
export const postTelegramAuth = (initData: string, language: string) =>
  client.post<{ token: string; isNew: boolean }>('/auth/telegram', { initData, language }).then((r) => r.data)

// Me
export const getMe = () => client.get<UserProfile>('/me').then((r) => r.data)
export const putMe = (data: Partial<Pick<UserProfile, 'name' | 'phone' | 'language'>>) =>
  client.put<UserProfile>('/me', data).then((r) => r.data)
export const postMeMaster = (categoryIds: string[]) =>
  client.post<UserProfile>('/me/master', { categoryIds }).then((r) => r.data)
export const putMeCategories = (categoryIds: string[]) =>
  client.put('/me/categories', { categoryIds }).then((r) => r.data)
export const uploadAvatar = (blob: Blob, filename = 'avatar.jpg') => {
  const fd = new FormData()
  fd.append('file', blob, filename)
  return client
    .post<{ avatarUrl: string }>('/me/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}
export const deleteAvatar = () => client.delete('/me/avatar').then((r) => r.data)

// Admin
export interface AdminUser {
  id: string
  name: string
  username: string | null
  phone: string | null
  telegramId: string
  avatarUrl: string | null
  isMaster: boolean
  isAdmin: boolean
  isBanned: boolean
  createdAt: string
  _count: { jobsAsCustomer: number; applications: number }
}
export const getAdminUsers = (q?: string) =>
  client.get<AdminUser[]>('/admin/users', { params: q ? { q } : {} }).then((r) => r.data)
type AdminApplication = Application & { jobId: string; job: Job & { category: Category } }
export const getAdminUser = (id: string) =>
  client.get<AdminUser & {
    jobsAsCustomer: (Job & { category: Category })[]
    applications: AdminApplication[]
    categories: Category[]
  }>(`/admin/users/${id}`).then((r) => r.data)
export const banAdminUser = (id: string, banned: boolean) =>
  client.post(`/admin/users/${id}/ban`, { banned }).then((r) => r.data)
export const deleteAdminUser = (id: string) =>
  client.delete(`/admin/users/${id}`).then((r) => r.data)

// Notifications
export interface NotificationItem {
  id: string
  kind: string
  title: string
  body: string
  jobId: string | null
  read: boolean
  createdAt: string
}
export const getNotifications = () =>
  client
    .get<{ items: NotificationItem[]; unread: number }>('/notifications')
    .then((r) => r.data)
export const markNotificationRead = (id: string) =>
  client.post(`/notifications/${id}/read`).then((r) => r.data)
export const markAllNotificationsRead = () =>
  client.post('/notifications/read-all').then((r) => r.data)

// Categories
export const getCategories = () => client.get<Category[]>('/categories').then((r) => r.data)

// Jobs
export const getMyJobs = () => client.get<Job[]>('/jobs/my').then((r) => r.data)
export const getJobFeed = (categoryId?: string) =>
  client
    .get<Job[]>('/jobs/feed', { params: categoryId ? { categoryId } : {} })
    .then((r) => r.data)
export const getAssignedJobs = () => client.get<Job[]>('/jobs/assigned').then((r) => r.data)
export const getJob = (id: string) =>
  client
    .get<
      Job & {
        customer: UserProfile
        hasApplied: boolean
        masterPhone: string | null
        customerPhone: string | null
        masterTgId: string | null
        customerTgId: string | null
        masterUsername: string | null
        customerUsername: string | null
        masterName: string | null
        customerName: string
        masterAvatar: string | null
        customerAvatar: string | null
      }
    >(`/jobs/${id}`)
    .then((r) => r.data)
export const postJob = (data: {
  categoryId: string
  description: string
  budget?: number
  dateFrom?: string
  dateTo?: string
}) => client.post<Job>('/jobs', data).then((r) => r.data)
export const deleteJob = (id: string) => client.delete(`/jobs/${id}`).then((r) => r.data)

// Applications
export const applyToJob = (jobId: string, comment?: string) =>
  client.post<Application>(`/jobs/${jobId}/apply`, { comment }).then((r) => r.data)
export const getApplications = (jobId: string) =>
  client.get<Application[]>(`/jobs/${jobId}/applications`).then((r) => r.data)
export const selectMaster = (jobId: string, masterId: string) =>
  client.post<{ phone: string }>(`/jobs/${jobId}/select/${masterId}`).then((r) => r.data)
export const completeJob = (jobId: string) =>
  client.post<{ status: string }>(`/jobs/${jobId}/complete`).then((r) => r.data)

// Reviews
export const postReview = (jobId: string, data: { rating: number; comment?: string }) =>
  client.post<Review>(`/jobs/${jobId}/review`, data).then((r) => r.data)

// Masters
export const getMasters = (categoryId?: string) =>
  client
    .get<UserProfile[]>('/masters', { params: categoryId ? { categoryId } : {} })
    .then((r) => r.data)
export const getMaster = (id: string) =>
  client
    .get<UserProfile & { reviews: (Review & { customer: { name: string } })[] }>(`/masters/${id}`)
    .then((r) => r.data)
