# Phase 1 — Bot Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Telegram bot core — `/start` → role selection, role-aware client/service menus, the service-registration wizard with moderation status, an `isBanned` gate on the API, and the design §19 carryover (extend shared `UserProfile` with the service relation).

**Architecture:** grammY `Bot` gains Redis-backed `session()` + `@grammyjs/conversations`. A `loadUser` middleware upserts/attaches the DB `User` and a `banGate` blocks banned users. `/start` sets `role` (CLIENT/SERVICE) via inline buttons, then renders the role menu. SERVICE users with no profile enter the `registerService` conversation; the resulting `ServiceProfile` is `isVerified=false` and admins are notified for moderation. Bot user-facing text is RU/HY via a small bot-side i18n. Server `app.authenticate` additionally rejects banned users. The bot is split into focused modules (`session`, `context`, `i18n`, `keyboards`, `middleware`, `handlers/*`, `conversations/*`) assembled in `bot.ts`.

**Tech Stack:** grammY 1.x + `@grammyjs/conversations` 1.2 (already installed), ioredis (already a dep), Fastify, Prisma, TypeScript (strict), `@jobbarm/shared`.

**Deliberate decisions (carry Phase-0 conventions):**
- No automated tests (per `SPEC_AUTO.md` #7). Per-task gate = `pnpm --filter @jobbarm/shared build && pnpm --filter server exec tsc --noEmit`. Final task adds server boot + a manual bot checklist (needs a real `BOT_TOKEN`; with a placeholder token the bot won't poll but the server + typecheck/build still pass — that is the automated acceptance gate).
- Redis session storage via a tiny in-repo `StorageAdapter` over the existing `ioredis` client — **no new dependency** (design §7 allowed "Redis or lightweight FSM"; Redis is already in the stack).
- Bot-only users (who `/start` without ever opening the Mini App) are created on `/start` (upsert), language from Telegram `language_code` (`hy` → `hy`, else `ru`). **Deliberate:** `loadUser`'s upsert `update:` refreshes only `chatId` — it does NOT re-sync `username`/`firstName`/`lastName`/`language` for returning users (language is owned by `/language`; profile fields are first-seen). This is intentionally asymmetric with Phase-0 `auth.ts` (which refreshes `username` on Mini App login); do not "fix" it to refresh on every bot update.
- `isBanned` gate: API-side in `app.authenticate` (a post-login ban must take effect on a still-valid JWT); bot-side via `banGate` middleware + a re-check at the top of the registration conversation (conversations run before `banGate` in the middleware stack — acceptable MVP nuance, documented).
- Phase 1 builds the **menu shells**; the request wizard (client) and available-requests/offers (service) are explicitly Phases 2–3. Phase-1 menu buttons that map to later phases open the Mini App or reply "скоро" — they are not dead.

**Reference:** `docs/superpowers/specs/2026-05-18-auto-service-marketplace-design.md` (§7 bot, §12 i18n, §13 ban, §19 carryover), `SPEC_AUTO.md`.

---

## File Structure

**Created:**
- `apps/server/src/bot/context.ts` — shared `BotContext` type (grammY `Context` + conversations flavor)
- `apps/server/src/bot/session.ts` — ioredis-backed grammY `StorageAdapter`
- `apps/server/src/bot/i18n.ts` — bot RU/HY strings + `t(lang, key, vars?)`
- `apps/server/src/bot/keyboards.ts` — inline keyboards (role choice, client menu, service menu, language)
- `apps/server/src/bot/middleware.ts` — `loadUser` (upsert + attach `ctx.dbUser`), `banGate`
- `apps/server/src/bot/handlers/start.ts` — `/start`, role-selection callbacks, menu router
- `apps/server/src/bot/handlers/misc.ts` — `/help`, `/language` (+ callback), `/cancel`
- `apps/server/src/bot/conversations/registerService.ts` — service-registration wizard

**Modified:**
- `apps/server/src/bot/bot.ts` — compose session/conversations/middleware/handlers
- `apps/server/src/plugins/auth.ts` — `authenticate` also rejects `isBanned`
- `packages/shared/src/index.ts` — add `ServiceProfileSummary`, extend `UserProfile.service`

**Unchanged (relied on):** `routes/me.ts` (already `include: { service: true }`), `routes/auth.ts`, `bot/notifications.ts` (`notifyAdmins`), `redis.ts`, `config.ts`, `db.ts`, `main.ts`.

---

## Task 1: Extend shared UserProfile (design §19 carryover)

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Append `ServiceProfileSummary` and extend `UserProfile` in `packages/shared/src/index.ts`**

Replace the final `// ===== API shapes =====` block (the existing `export interface UserProfile { ... }`, lines ~100–112) with EXACTLY:

```ts
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
```

- [ ] **Step 2: Build shared**

Run: `pnpm --filter @jobbarm/shared build`
Expected: tsc exit 0; `packages/shared/dist/index.d.ts` now exports `ServiceProfileSummary` and `UserProfile` has a `service` field.

- [ ] **Step 3: Typecheck server (must still pass — `me.ts` returns a superset, assignable)**

Run: `pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output. (`me.ts` returns the raw Prisma row incl. `service`; the shared type is a documentation contract for the web client and does not constrain the route's return.)

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat(shared): UserProfile.service + ServiceProfileSummary (design §19)"
```

---

## Task 2: API isBanned gate in app.authenticate

**Files:**
- Modify: `apps/server/src/plugins/auth.ts`

Currently `authenticate` only does `request.jwtVerify()`. A user banned *after* login keeps a valid JWT. Add a DB ban check.

- [ ] **Step 1: Replace `apps/server/src/plugins/auth.ts` with EXACTLY**

```ts
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createHmac } from 'crypto'
import { config } from '../config.js'
import { db } from '../db.js'

export function validateTelegramInitData(initData: string, botToken: string): Record<string, string> | null {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return null

    params.delete('hash')
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n')

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
    const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

    if (expectedHash !== hash) return null

    // Reject tokens older than 5 minutes
    const authDate = parseInt(params.get('auth_date') ?? '0', 10)
    if (Date.now() / 1000 - authDate > 300) return null

    const result: Record<string, string> = {}
    for (const [k, v] of entries) result[k] = v
    return result
  } catch {
    return null
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; telegramId: string }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export default fp(async (app: FastifyInstance) => {
  await app.register(jwt, { secret: config.JWT_SECRET })

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    await request.jwtVerify()
    const { userId } = request.user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { isBanned: true },
    })
    if (!user) return reply.status(404).send({ error: 'not_found' })
    if (user.isBanned) return reply.status(403).send({ error: 'banned' })
  })
})
```

- [ ] **Step 2: Typecheck server**

Run: `pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/plugins/auth.ts
git commit -m "feat(api): reject banned users in app.authenticate (post-login ban)"
```

---

## Task 3: Bot context + Redis session storage

**Files:**
- Create: `apps/server/src/bot/context.ts`, `apps/server/src/bot/session.ts`

- [ ] **Step 1: Create `apps/server/src/bot/context.ts` with EXACTLY**

```ts
import type { Context } from 'grammy'
import type { ConversationFlavor, Conversation } from '@grammyjs/conversations'
import type { User } from '@prisma/client'

// Set by the loadUser middleware (present for all handlers after it).
export interface UserState {
  dbUser: User
}

export type BotContext = Context & ConversationFlavor & UserState

// Inside a conversation, the outer context is the plain conversational ctx.
export type BotConversation = Conversation<BotContext>
```

- [ ] **Step 2: Create `apps/server/src/bot/session.ts` with EXACTLY**

```ts
import type { StorageAdapter } from 'grammy'
import { redis } from '../redis.js'

const PREFIX = 'botsess:'
// Abandoned wizard sessions must not accumulate forever. grammY deletes the
// key when a conversation completes; this TTL only evicts dormant sessions
// (7 days is far longer than any realistic in-flight wizard).
const TTL_SECONDS = 604800

// Minimal ioredis-backed grammY storage adapter (no extra dependency).
export function redisStorage<T>(): StorageAdapter<T> {
  return {
    async read(key: string): Promise<T | undefined> {
      const raw = await redis.get(PREFIX + key)
      if (raw == null) return undefined
      try {
        return JSON.parse(raw) as T
      } catch {
        // Corrupt/legacy value — treat as no session so the user isn't stuck.
        return undefined
      }
    },
    async write(key: string, value: T): Promise<void> {
      await redis.set(PREFIX + key, JSON.stringify(value), 'EX', TTL_SECONDS)
    },
    async delete(key: string): Promise<void> {
      await redis.del(PREFIX + key)
    },
  }
}
```

- [ ] **Step 3: Typecheck server**

Run: `pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output. (New files are not yet imported; this just confirms they compile.)

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/bot/context.ts apps/server/src/bot/session.ts
git commit -m "feat(bot): BotContext type + ioredis session storage adapter"
```

---

## Task 4: Bot i18n (RU/HY)

**Files:**
- Create: `apps/server/src/bot/i18n.ts`

- [ ] **Step 1: Create `apps/server/src/bot/i18n.ts` with EXACTLY**

```ts
import type { Language } from '@jobbarm/shared'

type Dict = Record<string, string>

const ru: Dict = {
  banned: '🚫 Доступ заблокирован администратором.',
  chooseRole: 'Привет! Я помогу с автосервисом. Кто вы?',
  roleClient: '🔍 Я ищу автосервис',
  roleService: '🔧 Я автосервис',
  roleSetClient: 'Готово! Вы — клиент. Опишите проблему — получите предложения от автосервисов.',
  clientMenuTitle: 'Главное меню',
  btnCreateRequest: '🚗 Создать заявку',
  btnMyRequests: '📋 Мои заявки',
  btnMyCars: '🚙 Мои машины',
  btnHelp: '❓ Помощь',
  comingSoon: 'Скоро будет доступно 🛠',
  serviceNeedsRegister: 'Чтобы получать заявки, зарегистрируйте автосервис.',
  btnRegisterService: '🔧 Зарегистрировать сервис',
  servicePending: '⏳ Ваш сервис на модерации. Мы уведомим вас после проверки.',
  serviceMenuTitle: 'Меню автосервиса',
  btnAvailableRequests: '📥 Доступные заявки',
  btnMyOffers: '📤 Мои предложения',
  btnActiveJobs: '🔧 Текущие заказы',
  btnProfile: '⚙️ Мой профиль',
  help: 'Это бот авто-сервис маркетплейса.\n\nКлиенты создают заявки на ремонт, автосервисы присылают предложения с ценой. Команды:\n/start — начало\n/language — сменить язык\n/cancel — отменить текущее действие\n/help — эта справка',
  languageChoose: 'Выберите язык:',
  languageSet: 'Язык изменён на русский.',
  cancelled: 'Действие отменено.',
  nothingToCancel: 'Нет активных действий.',
  regName: 'Название автосервиса?',
  regDescription: 'Краткое описание услуг (или отправьте «-»):',
  regAddress: 'Адрес сервиса?',
  regDistrict: 'Выберите район Еревана:',
  regPhone: 'Контактный телефон?',
  regSpecs: 'Выберите специализации (можно несколько), затем «Готово»:',
  regSpecsDone: '✅ Готово',
  regSpecsEmpty: 'Выберите хотя бы одну специализацию.',
  regPhotos: 'Пришлите 1–5 фото мастерской или нажмите «Пропустить».',
  regPhotosSkip: 'Пропустить',
  regPhotosDone: 'Готово',
  regPhotosMore: 'Фото добавлено ({n}/5). Ещё или «Готово».',
  regDone: '✅ Заявка на регистрацию отправлена. Сервис на модерации — мы уведомим вас.',
  regAbortNoText: 'Ожидался текст. Регистрация отменена, начните заново через меню.',
  adminNewService: '🆕 *Новый сервис на модерации*\n\n🏢 {name}\n📍 {district}, {address}\n📞 {phone}\n🔧 {specs}',
}

const hy: Dict = {
  banned: '🚫 Մուտքն արգելափակված է ադմինիստրատորի կողմից։',
  chooseRole: 'Բարև։ Կօգնեմ ավտոսերվիսի հարցում։ Ո՞վ եք դուք',
  roleClient: '🔍 Փնտրում եմ ավտոսերվիս',
  roleService: '🔧 Ես ավտոսերվիս եմ',
  roleSetClient: 'Պատրաստ է։ Դուք հաճախորդ եք։ Նկարագրեք խնդիրը — կստանաք առաջարկներ։',
  clientMenuTitle: 'Գլխավոր մենյու',
  btnCreateRequest: '🚗 Ստեղծել հայտ',
  btnMyRequests: '📋 Իմ հայտերը',
  btnMyCars: '🚙 Իմ մեքենաները',
  btnHelp: '❓ Օգնություն',
  comingSoon: 'Շուտով հասանելի կլինի 🛠',
  serviceNeedsRegister: 'Հայտեր ստանալու համար գրանցեք ավտոսերվիսը։',
  btnRegisterService: '🔧 Գրանցել սերվիսը',
  servicePending: '⏳ Ձեր սերվիսը մոդերացիայի մեջ է։ Կտեղեկացնենք ստուգումից հետո։',
  serviceMenuTitle: 'Ավտոսերվիսի մենյու',
  btnAvailableRequests: '📥 Հասանելի հայտեր',
  btnMyOffers: '📤 Իմ առաջարկները',
  btnActiveJobs: '🔧 Ընթացիկ պատվերներ',
  btnProfile: '⚙️ Իմ պրոֆիլը',
  help: 'Սա ավտոսերվիս մարկետփլեյսի բոտն է։\n\nՀաճախորդները ստեղծում են վերանորոգման հայտեր, սերվիսները ուղարկում են գնային առաջարկներ։ Հրամաններ՝\n/start — սկիզբ\n/language — փոխել լեզուն\n/cancel — չեղարկել գործողությունը\n/help — այս օգնությունը',
  languageChoose: 'Ընտրեք լեզուն՝',
  languageSet: 'Լեզուն փոխվեց հայերենի։',
  cancelled: 'Գործողությունը չեղարկվեց։',
  nothingToCancel: 'Ակտիվ գործողություններ չկան։',
  regName: 'Ավտոսերվիսի անվանումը՞',
  regDescription: 'Ծառայությունների կարճ նկարագրություն (կամ ուղարկեք «-»)՝',
  regAddress: 'Սերվիսի հասցեն՞',
  regDistrict: 'Ընտրեք Երևանի վարչական շրջանը՝',
  regPhone: 'Կոնտակտային հեռախոսը՞',
  regSpecs: 'Ընտրեք մասնագիտացումները (մի քանիսը), ապա «Պատրաստ է»՝',
  regSpecsDone: '✅ Պատրաստ է',
  regSpecsEmpty: 'Ընտրեք առնվազն մեկ մասնագիտացում։',
  regPhotos: 'Ուղարկեք արհեստանոցի 1–5 լուսանկար կամ սեղմեք «Բաց թողնել»։',
  regPhotosSkip: 'Բաց թողնել',
  regPhotosDone: 'Պատրաստ է',
  regPhotosMore: 'Լուսանկարն ավելացվեց ({n}/5)։ Ավելին կամ «Պատրաստ է»։',
  regDone: '✅ Գրանցման հայտն ուղարկվեց։ Սերվիսը մոդերացիայի մեջ է — կտեղեկացնենք։',
  regAbortNoText: 'Սպասվում էր տեքստ։ Գրանցումը չեղարկվեց, սկսեք նորից մենյուից։',
  adminNewService: '🆕 *Նոր սերվիս մոդերացիայի*\n\n🏢 {name}\n📍 {district}, {address}\n📞 {phone}\n🔧 {specs}',
}

const dicts: Record<Language, Dict> = { ru, hy }

export function normalizeLang(code: string | null | undefined): Language {
  return code === 'hy' ? 'hy' : 'ru'
}

export function t(lang: Language, key: string, vars?: Record<string, string | number>): string {
  let s = dicts[lang]?.[key] ?? dicts.ru[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}
```

NOTE for the implementer: every Armenian and Russian string above is canonical — copy verbatim, do NOT transliterate, normalize, or "fix" any non-ASCII character.

- [ ] **Step 2: Typecheck server**

Run: `pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 3: Sanity-check non-ASCII integrity**

Run: `grep -c 'Ընտրեք\|Բարև\|Գործողությունը' apps/server/src/bot/i18n.ts`
Expected: a non-zero count (Armenian preserved). Then `node -e "1"` is not needed — just visually confirm no `?`/mojibake in the file via `grep -n 'roleClient\|regDistrict' apps/server/src/bot/i18n.ts`.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/bot/i18n.ts
git commit -m "feat(bot): RU/HY i18n strings + t() helper"
```

---

## Task 5: Keyboards

**Files:**
- Create: `apps/server/src/bot/keyboards.ts`

- [ ] **Step 1: Create `apps/server/src/bot/keyboards.ts` with EXACTLY**

```ts
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
```

- [ ] **Step 2: Typecheck server**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/bot/keyboards.ts
git commit -m "feat(bot): inline keyboards (role, menus, district, specs, photos)"
```

---

## Task 6: loadUser + banGate middleware

**Files:**
- Create: `apps/server/src/bot/middleware.ts`

- [ ] **Step 1: Create `apps/server/src/bot/middleware.ts` with EXACTLY**

```ts
import type { NextFunction } from 'grammy'
import type { BotContext } from './context.js'
import { db } from '../db.js'
import { normalizeLang, t } from './i18n.js'
import type { Language } from '@jobbarm/shared'

// Upsert the Telegram user and attach the DB row as ctx.dbUser.
export async function loadUser(ctx: BotContext, next: NextFunction): Promise<void> {
  const from = ctx.from
  if (!from) return // ignore updates without a user (channel posts etc.)
  const telegramId = String(from.id)
  const chatId = String(ctx.chat?.id ?? from.id)
  const lang: Language = normalizeLang(from.language_code)

  const user = await db.user.upsert({
    where: { telegramId },
    update: { chatId },
    create: {
      telegramId,
      chatId,
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      language: lang,
    },
  })

  ctx.dbUser = user
  await next()
}

// Block banned users early (after loadUser).
export async function banGate(ctx: BotContext, next: NextFunction): Promise<void> {
  if (ctx.dbUser?.isBanned) {
    const lang = (ctx.dbUser.language as Language) ?? 'ru'
    await ctx.reply(t(lang, 'banned'))
    return // stop the middleware chain
  }
  await next()
}
```

- [ ] **Step 2: Typecheck server**

Run: `pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/bot/middleware.ts
git commit -m "feat(bot): loadUser upsert + banGate middleware"
```

---

## Task 7: Menu rendering helper + start/role handlers

**Files:**
- Create: `apps/server/src/bot/handlers/start.ts`

This renders the correct menu for a user and handles `/start` + `role:*` callbacks. The SERVICE branch checks for an existing `ServiceProfile` and shows register/pending/menu accordingly.

- [ ] **Step 1: Create `apps/server/src/bot/handlers/start.ts` with EXACTLY**

```ts
import { Composer } from 'grammy'
import type { BotContext } from '../context.js'
import { db } from '../../db.js'
import { t } from '../i18n.js'
import type { Language } from '@jobbarm/shared'
import {
  roleKeyboard,
  clientMenuKeyboard,
  serviceMenuKeyboard,
  serviceRegisterKeyboard,
} from '../keyboards.js'

export const startHandler = new Composer<BotContext>()

// Render the role-appropriate menu (or role chooser / service moderation state).
export async function showMenu(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser
  const lang = (user.language as Language) ?? 'ru'

  if (!user.role) {
    await ctx.reply(t(lang, 'chooseRole'), { reply_markup: roleKeyboard(lang) })
    return
  }

  if (user.role === 'CLIENT') {
    await ctx.reply(t(lang, 'clientMenuTitle'), { reply_markup: clientMenuKeyboard(lang) })
    return
  }

  // SERVICE
  const profile = await db.serviceProfile.findUnique({ where: { userId: user.id } })
  if (!profile) {
    await ctx.reply(t(lang, 'serviceNeedsRegister'), {
      reply_markup: serviceRegisterKeyboard(lang),
    })
    return
  }
  if (!profile.isVerified) {
    await ctx.reply(t(lang, 'servicePending'))
    return
  }
  await ctx.reply(t(lang, 'serviceMenuTitle'), { reply_markup: serviceMenuKeyboard(lang) })
}

startHandler.command('start', async (ctx) => {
  await showMenu(ctx)
})

startHandler.callbackQuery(/^role:(CLIENT|SERVICE)$/, async (ctx) => {
  // Role is fixed once set (design §7); ignore taps on stale role keyboards.
  if (ctx.dbUser.role) {
    await ctx.answerCallbackQuery()
    return
  }
  // Ack the tap before the DB write — a transient DB error must not leave
  // the inline button spinning (ack is not a gate on the write result).
  await ctx.answerCallbackQuery()
  const role = ctx.match![1] as 'CLIENT' | 'SERVICE'
  const updated = await db.user.update({
    where: { id: ctx.dbUser.id },
    data: { role },
  })
  ctx.dbUser = updated
  const lang = (updated.language as Language) ?? 'ru'
  if (role === 'CLIENT') {
    await ctx.reply(t(lang, 'roleSetClient'))
  }
  await showMenu(ctx)
})
```

- [ ] **Step 2: Typecheck server**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/bot/handlers/start.ts
git commit -m "feat(bot): /start, role selection, role-aware menu rendering"
```

---

## Task 8: misc handlers — /help, /language, /cancel, menu callbacks

**Files:**
- Create: `apps/server/src/bot/handlers/misc.ts`

- [ ] **Step 1: Create `apps/server/src/bot/handlers/misc.ts` with EXACTLY**

```ts
import { Composer } from 'grammy'
import type { BotContext } from '../context.js'
import { db } from '../../db.js'
import { t } from '../i18n.js'
import type { Language } from '@jobbarm/shared'
import { languageKeyboard } from '../keyboards.js'
import { showMenu } from './start.js'

export const miscHandler = new Composer<BotContext>()

function lang(ctx: BotContext): Language {
  return (ctx.dbUser?.language as Language) ?? 'ru'
}

miscHandler.command('help', async (ctx) => {
  await ctx.reply(t(lang(ctx), 'help'))
})

miscHandler.command('language', async (ctx) => {
  await ctx.reply(t(lang(ctx), 'languageChoose'), { reply_markup: languageKeyboard() })
})

miscHandler.command('cancel', async (ctx) => {
  const active = await ctx.conversation.active()
  if (Object.keys(active).length === 0) {
    await ctx.reply(t(lang(ctx), 'nothingToCancel'))
    return
  }
  await ctx.conversation.exit()
  await ctx.reply(t(lang(ctx), 'cancelled'))
})

miscHandler.callbackQuery(/^lang:(ru|hy)$/, async (ctx) => {
  // Ack the tap before the DB write — a transient DB error must not leave
  // the inline button spinning (ack is not a gate on the write result).
  await ctx.answerCallbackQuery()
  const next = ctx.match![1] as Language
  const updated = await db.user.update({
    where: { id: ctx.dbUser.id },
    data: { language: next },
  })
  ctx.dbUser = updated
  await ctx.reply(t(next, 'languageSet'))
  await showMenu(ctx)
})

miscHandler.callbackQuery('menu:help', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.reply(t(lang(ctx), 'help'))
})

// Phase-2/3 destinations — not dead: acknowledge + "coming soon" for now.
miscHandler.callbackQuery(
  /^menu:(create_request|my_requests|my_cars|available_requests|my_offers|active_jobs|profile)$/,
  async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(t(lang(ctx), 'comingSoon'))
  }
)
```

- [ ] **Step 2: Typecheck server**

Run: `pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/bot/handlers/misc.ts
git commit -m "feat(bot): /help, /language, /cancel, menu-callback stubs"
```

---

## Task 9: Service registration conversation

**Files:**
- Modify: `apps/server/src/bot/notifications.ts` (export `escapeMd` so the conversation can escape user input before it flows into a `parse_mode:Markdown` admin message)
- Create: `apps/server/src/bot/conversations/registerService.ts`

grammY conversations v1 replays the function on every update, so all side
effects (DB writes, admin notification) MUST be wrapped in
`conversation.external()`. Inputs are awaited via `conversation.wait*`.

**Markdown-injection note:** `notifyAdmins(text)` sends with `parse_mode: 'Markdown'`
and does NOT escape (by design — caller owns escaping, same as Phase 0's
`notifyAdminsNewUser`). The `adminNewService` template interpolates raw
user-supplied `name`/`address`/`phone`, so those MUST be passed through
`escapeMd` (`district`/`specs` come from controlled `DISTRICTS`/`SERVICE_TYPES`
lookups and are safe).

- [ ] **Step 1: Export `escapeMd` from `apps/server/src/bot/notifications.ts`**

Change the line `function escapeMd(text: string): string {` to
`export function escapeMd(text: string): string {`. Change nothing else in the file.

- [ ] **Step 2: Create `apps/server/src/bot/conversations/registerService.ts` with EXACTLY**

```ts
import type { BotContext, BotConversation } from '../context.js'
import { db } from '../../db.js'
import { t } from '../i18n.js'
import type { Language, ServiceType } from '@jobbarm/shared'
import { SERVICE_TYPES, DISTRICTS, localizedLabel } from '@jobbarm/shared'
import { districtKeyboard, specsKeyboard, photosKeyboard } from '../keyboards.js'
import { notifyAdmins, escapeMd } from '../notifications.js'

export const REGISTER_SERVICE = 'registerService'

export async function registerService(
  conversation: BotConversation,
  ctx: BotContext
): Promise<void> {
  const user = ctx.dbUser
  const lang = (user.language as Language) ?? 'ru'

  // Defense-in-depth: a user banned mid-flow must not complete registration.
  const banned = await conversation.external(async () => {
    const u = await db.user.findUnique({ where: { id: user.id }, select: { isBanned: true } })
    return u?.isBanned ?? true
  })
  if (banned) {
    await ctx.reply(t(lang, 'banned'))
    return
  }

  const askText = async (key: string): Promise<string> => {
    await ctx.reply(t(lang, key))
    const res = await conversation.waitFor('message:text')
    return res.message.text.trim()
  }

  const name = await askText('regName')
  const descRaw = await askText('regDescription')
  const description = descRaw === '-' ? null : descRaw
  const address = await askText('regAddress')

  // District (inline buttons)
  await ctx.reply(t(lang, 'regDistrict'), { reply_markup: districtKeyboard(lang) })
  const distCb = await conversation.waitForCallbackQuery(/^dist:(.+)$/)
  await distCb.answerCallbackQuery()
  const district = distCb.match![1]

  const phoneNumber = await askText('regPhone')

  // Specializations (multi-select toggle)
  const selected = new Set<string>()
  await ctx.reply(t(lang, 'regSpecs'), { reply_markup: specsKeyboard(lang, selected) })
  for (;;) {
    const cb = await conversation.waitForCallbackQuery(/^spec:(.+)$/)
    const value = cb.match![1]
    if (value === '__done__') {
      if (selected.size === 0) {
        await cb.answerCallbackQuery({ text: t(lang, 'regSpecsEmpty'), show_alert: true })
        continue
      }
      await cb.answerCallbackQuery()
      break
    }
    if (selected.has(value)) selected.delete(value)
    else selected.add(value)
    await cb.answerCallbackQuery()
    await cb.editMessageReplyMarkup({ reply_markup: specsKeyboard(lang, selected) })
  }
  const specializations = SERVICE_TYPES.map((s) => s.key).filter((k) =>
    selected.has(k)
  ) as ServiceType[]

  // Photos (optional, up to 5)
  const photos: string[] = []
  await ctx.reply(t(lang, 'regPhotos'), { reply_markup: photosKeyboard(lang) })
  for (;;) {
    const upd = await conversation.wait()
    if (upd.callbackQuery?.data === 'photos:skip' || upd.callbackQuery?.data === 'photos:done') {
      await upd.answerCallbackQuery()
      break
    }
    const photo = upd.message?.photo
    if (photo && photo.length > 0) {
      photos.push(photo[photo.length - 1].file_id)
      if (photos.length >= 5) break
      await ctx.reply(t(lang, 'regPhotosMore', { n: photos.length }), {
        reply_markup: photosKeyboard(lang),
      })
    }
    // ignore anything else; loop until skip/done or 5 photos
  }

  // Persist + notify admins (side effects -> conversation.external)
  await conversation.external(async () => {
    await db.serviceProfile.upsert({
      where: { userId: user.id },
      update: {
        name,
        description,
        address,
        district,
        phoneNumber,
        specializations,
        photos,
        isVerified: false,
      },
      create: {
        userId: user.id,
        name,
        description,
        address,
        district,
        phoneNumber,
        specializations,
        photos,
        isVerified: false,
        isActive: true,
      },
    })
    const distLabel =
      DISTRICTS.find((d) => d.key === district)?.label
    const distText = distLabel ? localizedLabel(distLabel, lang) : district
    const specsText = specializations
      .map((k) => {
        const s = SERVICE_TYPES.find((x) => x.key === k)
        return s ? localizedLabel(s.label, lang) : k
      })
      .join(', ')
    await notifyAdmins(
      t('ru', 'adminNewService', {
        name: escapeMd(name),
        district: distText,
        address: escapeMd(address),
        phone: escapeMd(phoneNumber),
        specs: specsText,
      })
    )
  })

  await ctx.reply(t(lang, 'regDone'))
}
```

- [ ] **Step 3: Typecheck server**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/bot/notifications.ts apps/server/src/bot/conversations/registerService.ts
git commit -m "feat(bot): service-registration conversation (wizard + moderation notify, escaped)"
```

---

## Task 10: Compose bot.ts + final verification

**Files:**
- Modify: `apps/server/src/bot/bot.ts`

- [ ] **Step 1: Replace `apps/server/src/bot/bot.ts` with EXACTLY**

```ts
import { Bot, session } from 'grammy'
import { conversations, createConversation } from '@grammyjs/conversations'
import { config } from '../config.js'
import type { BotContext } from './context.js'
import { redisStorage } from './session.js'
import { loadUser, banGate } from './middleware.js'
import { startHandler, showMenu } from './handlers/start.js'
import { miscHandler } from './handlers/misc.js'
import { registerService, REGISTER_SERVICE } from './conversations/registerService.js'

export const bot = new Bot<BotContext>(config.BOT_TOKEN)

// Session (Redis) is required by the conversations plugin.
bot.use(
  session({
    initial: () => ({}),
    storage: redisStorage(),
  })
)

// loadUser/banGate must run before conversations so ctx.dbUser exists inside them.
bot.use(loadUser)
bot.use(banGate)

bot.use(conversations())
bot.use(createConversation(registerService, REGISTER_SERVICE))

// Enter the registration wizard from the service "register" button.
bot.callbackQuery('menu:register_service', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.conversation.enter(REGISTER_SERVICE)
})

bot.use(startHandler)
bot.use(miscHandler)

// Fallback: any other message → show the menu.
bot.on('message', async (ctx) => {
  await showMenu(ctx)
})

bot.catch((err) => {
  console.error('Bot error:', err)
})

export async function configureBotMenu(): Promise<void> {
  await bot.api.setChatMenuButton({
    menu_button: { type: 'web_app', text: 'Открыть', web_app: { url: config.MINI_APP_URL } },
  })
  await bot.api.setMyDescription(
    '🚗 Авто-сервис маркетплейс — найдите автосервис в Армении.\n\n' +
      '📲 Опишите проблему — получите предложения с ценой.\n' +
      '⭐ Рейтинги и отзывы. Всё внутри Telegram.'
  )
  await bot.api.setMyShortDescription('Автосервисы Армении')
  await bot.api.setMyCommands([
    { command: 'start', description: 'Начало / меню' },
    { command: 'language', description: 'Сменить язык' },
    { command: 'cancel', description: 'Отменить действие' },
    { command: 'help', description: 'Помощь' },
  ])
}
```

- [ ] **Step 2: Typecheck + build everything**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter server exec tsc --noEmit && pnpm --filter web build`
Expected: all exit 0; web vite prints `✓ built in ...`. No type errors.

- [ ] **Step 3: Boot the server (regression — must still serve /health)**

Run:
```bash
pnpm --filter server dev &
SERVER_PID=$!
sleep 6
curl -s localhost:3000/health
echo
kill $SERVER_PID 2>/dev/null
```
Expected: `{"ok":true}`. With a placeholder `BOT_TOKEN` a `Bot failed to start` warning is acceptable (HTTP server unaffected). If `sleep` is blocked, start dev with `run_in_background: true`, poll the log for `Server listening`, curl, then kill.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/bot/bot.ts
git commit -m "feat(bot): compose session/conversations/middleware/handlers"
```

- [ ] **Step 5: Manual bot test checklist (requires a real BOT_TOKEN in .env)**

Document-only — record results when a real token is configured (not part of the automated gate; bot logic has no automated tests per `SPEC_AUTO.md` #7):
1. `/start` as a new user → role chooser appears (RU or HY by Telegram language).
2. Tap "Я ищу автосервис" → confirmation + client menu (4 buttons).
3. `/start` again → client menu (role persisted).
4. New user → "Я автосервис" → "register" prompt → tap register → wizard: name → description (`-` allowed) → address → district (buttons) → phone → specializations (toggle ✅, "Готово") → photos (send 1–2 then "Готово", or "Пропустить") → "на модерации" confirmation.
5. Admin (telegram id in `ADMIN_TELEGRAM_IDS`) receives the "Новый сервис на модерации" message.
6. `/start` as that service again → "⏳ на модерации" (no menu until verified).
7. `/language` → switch to Հայերեն → menu re-renders in Armenian.
8. `/cancel` mid-wizard → "Действие отменено"; `/cancel` with nothing active → "Нет активных действий".
9. DB check: `psql` or Prisma — `ServiceProfile` row exists with `isVerified=false`, correct `specializations[]`, `photos[]`.
10. Ban a user (`UPDATE users SET is_banned=true`) → their next bot message → "🚫 Доступ заблокирован"; their `GET /api/me` → HTTP 403 `{"error":"banned"}`.

---

## Done criteria (Phase 1)

- `pnpm --filter @jobbarm/shared build` + `pnpm --filter server exec tsc --noEmit` + `pnpm --filter web build` all green.
- Server boots; `GET /health` → `{"ok":true}`; banned user → `/api/me` 403.
- Shared `UserProfile.service: ServiceProfileSummary | null` exported.
- Bot: `/start` role selection persists; client & service menus render per role; SERVICE with no profile → register, pending → "на модерации", verified → service menu; registration wizard creates `ServiceProfile(isVerified=false)` and notifies admins; `/help`, `/language` (RU/HY), `/cancel` work.
- One commit per task; `git status` clean; on `main`.

## Self-Review

**Spec coverage (design §15 row "1. Bot core" + §19 carryover + §13 ban + §12 i18n):**
- `/start` + role selection → Task 7. ✓
- Client/service menus → Tasks 5,7,8. ✓
- Service-registration wizard + moderation status → Tasks 9,7 (pending/verified gating in `showMenu`). ✓
- `GET/PUT /api/me` → already shipped Phase 0; shared type extended → Task 1. ✓
- `isBanned` gate (API + bot) → Tasks 2,6 (+ conversation re-check Task 9). ✓
- i18n RU/HY for bot → Task 4; `/language` → Task 8. ✓
- §19 carryover `UserProfile.service` → Task 1; wire `@grammyjs/conversations` → Tasks 3,9,10. ✓

**Placeholder scan:** No TBD/"handle appropriately"/vague steps; every code step is complete; every command has an expected result; menu callbacks for Phase-2/3 destinations are explicitly wired to a "coming soon" reply (not dead, not placeholder logic).

**Type consistency:** `BotContext`/`BotConversation` defined in Task 3, used identically in Tasks 6–10. `ctx.dbUser` (Prisma `User`) set in `loadUser` (Task 6), read in Tasks 7–9. `showMenu` defined+exported in Task 7, imported in Tasks 8,10. `REGISTER_SERVICE`/`registerService` defined Task 9, used Task 10. `redisStorage` (Task 3) → `bot.ts` (Task 10). Keyboard fn names (`roleKeyboard`,`clientMenuKeyboard`,`serviceMenuKeyboard`,`serviceRegisterKeyboard`,`languageKeyboard`,`districtKeyboard`,`specsKeyboard`,`photosKeyboard`) defined Task 5, consumed Tasks 7–9 with matching signatures. `t(lang,key,vars?)`/`normalizeLang` (Task 4) used consistently. Callback-data namespaces (`role:`,`menu:`,`lang:`,`dist:`,`spec:`,`photos:`) are consistent between keyboards (Task 5) and handlers/conversation (Tasks 7–10); `menu:register_service` handled in `bot.ts` (Task 10), the other `menu:*` in `misc.ts` (Task 8) — no overlap.
