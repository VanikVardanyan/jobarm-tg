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

// Categories
export const getCategories = () => client.get<Category[]>('/categories').then((r) => r.data)

// Jobs
export const getMyJobs = () => client.get<Job[]>('/jobs/my').then((r) => r.data)
export const getJobFeed = () => client.get<Job[]>('/jobs/feed').then((r) => r.data)
export const getAssignedJobs = () => client.get<Job[]>('/jobs/assigned').then((r) => r.data)
export const getJob = (id: string) =>
  client.get<Job & { customer: UserProfile }>(`/jobs/${id}`).then((r) => r.data)
export const postJob = (data: {
  categoryId: string
  description: string
  budget: number
  dateFrom: string
  dateTo: string
}) => client.post<Job>('/jobs', data).then((r) => r.data)

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
