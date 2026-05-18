import { InlineKeyboard } from 'grammy'
import type { Language } from '@jobbarm/shared'
import { SERVICE_TYPES, DISTRICTS, localizedLabel } from '@jobbarm/shared'
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
    if (i % 2 === 1) kb.row()
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
