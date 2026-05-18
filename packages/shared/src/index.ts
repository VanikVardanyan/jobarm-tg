// ===== Enums (mirror Prisma) =====
export type UserRole = 'CLIENT' | 'SERVICE'

export type ServiceType =
  | 'BODY_PAINT'
  | 'ENGINE_CHASSIS'
  | 'MAINTENANCE'
  | 'TIRES'
  | 'ELECTRICAL'
  | 'AC'
  | 'GLASS'
  | 'INTERIOR'
  | 'OTHER'

export type Urgency = 'URGENT' | 'THIS_WEEK' | 'NORMAL'

export type RequestStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'

export type Language = 'ru' | 'hy'

// ===== Localized reference data =====
export interface LocalizedLabel {
  ru: string
  hy: string
}

export function localizedLabel(l: LocalizedLabel, lang: Language): string {
  return l[lang] ?? l.ru
}

export const SERVICE_TYPES: { key: ServiceType; label: LocalizedLabel }[] = [
  { key: 'BODY_PAINT', label: { ru: 'Кузов и покраска', hy: 'Թափք և ներկում' } },
  { key: 'ENGINE_CHASSIS', label: { ru: 'Двигатель и ходовая', hy: 'Շարժիչ և անվախել' } },
  { key: 'MAINTENANCE', label: { ru: 'ТО и расходники', hy: 'ՏՕ և ծախսանյութեր' } },
  { key: 'TIRES', label: { ru: 'Шиномонтаж', hy: 'Անվադողերի սպասարկում' } },
  { key: 'ELECTRICAL', label: { ru: 'Электрика', hy: 'Էլեկտրասարքավորում' } },
  { key: 'AC', label: { ru: 'Кондиционер', hy: 'Օդորակիչ' } },
  { key: 'GLASS', label: { ru: 'Стёкла', hy: 'Ապակիներ' } },
  { key: 'INTERIOR', label: { ru: 'Салон / химчистка', hy: 'Սրահ / քիմմաքրում' } },
  { key: 'OTHER', label: { ru: 'Другое', hy: 'Այլ' } },
]

export const URGENCIES: { key: Urgency; label: LocalizedLabel }[] = [
  { key: 'URGENT', label: { ru: 'Срочно (сегодня)', hy: 'Շտապ (այսօր)' } },
  { key: 'THIS_WEEK', label: { ru: 'На этой неделе', hy: 'Այս շաբաթ' } },
  { key: 'NORMAL', label: { ru: 'Не срочно', hy: 'Ոչ շտապ' } },
]

export const REQUEST_STATUS_LABELS: Record<RequestStatus, LocalizedLabel> = {
  OPEN: { ru: 'Открыта', hy: 'Բաց' },
  IN_PROGRESS: { ru: 'Сервис выбран', hy: 'Ընտրված է' },
  COMPLETED: { ru: 'Завершена', hy: 'Ավարտված' },
  CANCELLED: { ru: 'Отменена', hy: 'Չեղարկված' },
  EXPIRED: { ru: 'Истекла', hy: 'Ժամկետանց' },
}

// Yerevan administrative districts
export const DISTRICTS: { key: string; label: LocalizedLabel }[] = [
  { key: 'Ajapnyak', label: { ru: 'Аджапняк', hy: 'Աջափնյակ' } },
  { key: 'Arabkir', label: { ru: 'Арабкир', hy: 'Արաբկիր' } },
  { key: 'Avan', label: { ru: 'Аван', hy: 'Ավան' } },
  { key: 'Davtashen', label: { ru: 'Давташен', hy: 'Դավթաշեն' } },
  { key: 'Erebuni', label: { ru: 'Эребуни', hy: 'Էրեբունի' } },
  { key: 'Kanaker-Zeytun', label: { ru: 'Канакер-Зейтун', hy: 'Քանաքեռ-Զեյթուն' } },
  { key: 'Kentron', label: { ru: 'Кентрон', hy: 'Կենտրոն' } },
  { key: 'Malatia-Sebastia', label: { ru: 'Малатия-Себастия', hy: 'Մալաթիա-Սեբաստիա' } },
  { key: 'Nor-Nork', label: { ru: 'Нор-Норк', hy: 'Նոր Նորք' } },
  { key: 'Nork-Marash', label: { ru: 'Норк-Мараш', hy: 'Նորք-Մարաշ' } },
  { key: 'Nubarashen', label: { ru: 'Нубарашен', hy: 'Նուբարաշեն' } },
  { key: 'Shengavit', label: { ru: 'Шенгавит', hy: 'Շենգավիթ' } },
]

export const CAR_MAKES: string[] = [
  'Toyota',
  'BMW',
  'Mercedes-Benz',
  'Lada',
  'Opel',
  'Nissan',
  'Hyundai',
  'Kia',
  'Honda',
  'Ford',
  'Volkswagen',
  'Mitsubishi',
  'Lexus',
  'Audi',
  'Renault',
  'Chevrolet',
  'Mazda',
  'Subaru',
  'Other',
]

// ===== API shapes =====
export interface ServiceProfileSummary {
  id: string
  name: string
  description: string | null
  address: string
  district: string
  phoneNumber: string
  specializations: ServiceType[]
  photos: string[]
  isVerified: boolean
  isActive: boolean
}

export interface UserProfile {
  id: string
  telegramId: string
  username: string | null
  firstName: string | null
  lastName: string | null
  phoneNumber: string | null
  role: UserRole | null
  language: Language
  isAdmin: boolean
  isBanned: boolean
  service: ServiceProfileSummary | null
}

// ===== Phase 2: cars + requests =====
import { z } from 'zod'

export const CURRENT_YEAR = new Date().getFullYear()

export const carInputSchema = z.object({
  make: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(40),
  year: z.coerce.number().int().min(1950).max(CURRENT_YEAR + 1),
  bodyType: z.string().trim().max(40).optional().nullable(),
  color: z.string().trim().max(40).optional().nullable(),
  licensePlate: z.string().trim().max(20).optional().nullable(),
})
export type CarInput = z.infer<typeof carInputSchema>

export interface Car {
  id: string
  make: string
  model: string
  year: number
  bodyType: string | null
  color: string | null
  licensePlate: string | null
  createdAt: string
}

export interface RequestSummary {
  id: string
  serviceType: ServiceType
  description: string
  district: string
  urgency: Urgency
  status: RequestStatus
  photosCount: number
  hasVoice: boolean
  createdAt: string
  expiresAt: string
  car: { make: string; model: string; year: number }
}

export interface RequestDetail extends RequestSummary {
  isDrivable: boolean
  photos: string[]
  voiceFileId: string | null
}
