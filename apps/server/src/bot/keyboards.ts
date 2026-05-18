import { InlineKeyboard } from 'grammy'
import type { Language } from '@jobbarm/shared'
import { SERVICE_TYPES, DISTRICTS, URGENCIES, CAR_MAKES, localizedLabel } from '@jobbarm/shared'
import { t } from './i18n.js'

export function roleKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'roleClient'), 'role:CLIENT')
    .row()
    .text(t(lang, 'roleService'), 'role:SERVICE')
}

export function clientMenuKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'btnCreateRequest'), 'menu:create_request')
    .row()
    .text(t(lang, 'btnMyRequests'), 'menu:my_requests')
    .text(t(lang, 'btnMyCars'), 'menu:my_cars')
    .row()
    .text(t(lang, 'btnHelp'), 'menu:help')
}

export function serviceRegisterKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard().text(t(lang, 'btnRegisterService'), 'menu:register_service')
}

export function serviceMenuKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'btnAvailableRequests'), 'menu:available_requests')
    .row()
    .text(t(lang, 'btnMyOffers'), 'menu:my_offers')
    .text(t(lang, 'btnActiveJobs'), 'menu:active_jobs')
    .row()
    .text(t(lang, 'btnProfile'), 'menu:profile')
    .text(t(lang, 'btnHelp'), 'menu:help')
}

export function languageKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('Русский', 'lang:ru').text('Հայերեն', 'lang:hy')
}

export function districtKeyboard(lang: Language): InlineKeyboard {
  const kb = new InlineKeyboard()
  DISTRICTS.forEach((d, i) => {
    kb.text(localizedLabel(d.label, lang), `dist:${d.key}`)
    // New row after every 2nd item, but never a trailing empty row (DISTRICTS
    // has an even count — a final .row() would make Telegram reject the kb).
    if (i % 2 === 1 && i < DISTRICTS.length - 1) kb.row()
  })
  return kb
}

// selected: set of ServiceType keys currently chosen (✓ prefix when selected)
export function specsKeyboard(lang: Language, selected: Set<string>): InlineKeyboard {
  const kb = new InlineKeyboard()
  SERVICE_TYPES.forEach((s, i) => {
    const mark = selected.has(s.key) ? '✅ ' : ''
    kb.text(mark + localizedLabel(s.label, lang), `spec:${s.key}`)
    if (i % 2 === 1) kb.row()
  })
  kb.row().text(t(lang, 'regSpecsDone'), 'spec:__done__')
  return kb
}

export function photosKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'regPhotosSkip'), 'photos:skip')
    .text(t(lang, 'regPhotosDone'), 'photos:done')
}

// Single-select service type for a request (one tap → rqsvc:<key>).
export function serviceTypeKeyboard(lang: Language): InlineKeyboard {
  const kb = new InlineKeyboard()
  SERVICE_TYPES.forEach((s, i) => {
    kb.text(localizedLabel(s.label, lang), `rqsvc:${s.key}`)
    if (i % 2 === 1 && i < SERVICE_TYPES.length - 1) kb.row()
  })
  return kb
}

export function urgencyKeyboard(lang: Language): InlineKeyboard {
  const kb = new InlineKeyboard()
  URGENCIES.forEach((u, i) => {
    kb.text(localizedLabel(u.label, lang), `rqurg:${u.key}`)
    if (i < URGENCIES.length - 1) kb.row()
  })
  return kb
}

export function drivableKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'reqDrivableYes'), 'rqdrv:1')
    .text(t(lang, 'reqDrivableNo'), 'rqdrv:0')
}

export function confirmRequestKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'reqConfirmYes'), 'rqok:1')
    .text(t(lang, 'reqConfirmNo'), 'rqok:0')
}

// Garage picker: one button per car (rqcar:<id>) + an "add car" row.
export function carsKeyboard(
  lang: Language,
  cars: { id: string; make: string; model: string; year: number }[]
): InlineKeyboard {
  const kb = new InlineKeyboard()
  for (const c of cars) {
    kb.text(`${c.make} ${c.model} ${c.year}`, `rqcar:${c.id}`).row()
  }
  kb.text(t(lang, 'reqAddCar'), 'rqcar:__add__')
  return kb
}

// Car make picker (rqmk:<make>) + "Other" → free text (rqmk:__other__).
export function carMakeKeyboard(lang: Language): InlineKeyboard {
  const kb = new InlineKeyboard()
  CAR_MAKES.forEach((m, i) => {
    const isOther = m === 'Other'
    kb.text(isOther ? localizedLabel({ ru: 'Другое', hy: 'Այլ' }, lang) : m, isOther ? 'rqmk:__other__' : `rqmk:${m}`)
    if (i % 2 === 1 && i < CAR_MAKES.length - 1) kb.row()
  })
  return kb
}
