export type Language = 'hy' | 'ru' | 'en'

export type JobStatus = 'new' | 'in_progress' | 'pending_confirmation' | 'completed'

export interface Category {
  id: string
  nameRu: string
  nameEn: string
  nameHy: string
}

export interface UserProfile {
  id: string
  telegramId: string
  name: string
  phone: string
  language: Language
  isMaster: boolean
  isCustomer: boolean
  categories: Category[]
  rating: number | null
  reviewCount: number
}

export interface Job {
  id: string
  customerId: string
  categoryId: string
  category: Category
  description: string
  budget: number
  dateFrom: string
  dateTo: string
  status: JobStatus
  applicationCount: number
  selectedMasterId: string | null
  masterConfirmed: boolean
  customerConfirmed: boolean
  createdAt: string
}

export interface Application {
  id: string
  jobId: string
  master: UserProfile
  comment: string | null
  createdAt: string
}

export interface Review {
  id: string
  masterId: string
  customerId: string
  rating: number
  comment: string | null
  createdAt: string
}
