# Phase 0 — Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the JobArm domain out of the repo and stand up a clean, compiling Auto Service Marketplace foundation (new Prisma schema, shared types/reference data, grammY bot bootstrap, minimal API + web shell) that boots locally.

**Architecture:** Repurpose the existing pnpm monorepo in place. Keep all infrastructure (Fastify app, Telegram initData auth plugin, JWT, error handler, Redis, Docker, web shell primitives). Replace the entire domain layer with empty/foundational scaffolding — Phases 1–6 build features on top. No feature logic in Phase 0; success = it compiles, migrates, seeds, and the server answers `/health`.

**Tech Stack:** Node 20 + TypeScript (strict), Fastify, **grammY** (replaces telegraf), Prisma + PostgreSQL, Redis, React + Vite + Tailwind, Zod, pnpm workspaces, Docker (dev).

**Deliberate deviations from `SPEC_AUTO.md` (decided during brainstorming/planning):**
- `User.telegramId` stays `String @unique` (spec said `BigInt`) — avoids `JSON.stringify(BigInt)` breakage across the API and keeps the existing auth plugin/JWT untouched.
- Prisma IDs use `@default(uuid())` (spec used `cuid()`) — matches the existing codebase convention.
- Reference data (districts, service types, urgency, car makes) lives as **static constants in `packages/shared`**, not DB tables — Mini App imports them directly (workspace), no reference API endpoints.
- The shared package keeps its existing name `@jobbarm/shared` — renaming would ripple through both `package.json` files and every import for zero functional gain.
- No automated tests (per `SPEC_AUTO.md` instruction #7). Verification is typecheck/build/migrate/boot.

**Reference:** `docs/superpowers/specs/2026-05-18-auto-service-marketplace-design.md`, `SPEC_AUTO.md`.

---

## File Structure (created/modified/deleted in Phase 0)

**Created:**
- `docker-compose.override.yml` — local dev: publish Postgres/Redis ports
- `apps/server/src/routes/me.ts` — `GET/PUT /api/me`

**Modified (full replacement):**
- `apps/server/prisma/schema.prisma`, `apps/server/prisma/seed.ts`
- `apps/server/src/app.ts`, `apps/server/src/main.ts`
- `apps/server/src/bot/bot.ts`, `apps/server/src/bot/notifications.ts`
- `apps/server/src/routes/auth.ts`
- `apps/server/package.json`, `apps/server/tsconfig.json`
- `packages/shared/src/index.ts`
- `apps/web/src/store/index.ts`, `apps/web/src/lib/i18n.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/utils.ts`, `apps/web/src/App.tsx`, `apps/web/index.html`
- `.gitignore`

**Deleted:**
- `apps/server/src/routes/{jobs,masters,applications,categories,reviews,notifications,users,admin}.ts`
- `apps/server/src/bot/messages.ts`
- `apps/server/tests/` (whole dir), `apps/server/src/assets/`
- `apps/server/prisma/migrations/*` (regenerated fresh)
- `apps/web/src/pages/` (whole dir), `apps/web/src/components/{Layout,BottomNav}.tsx`, `apps/web/src/lib/image.ts`, `apps/web/jobarm-brand/`
- `deploy/landing/`, `deploy/jobarm-brand/`

**Kept untouched:** `plugins/auth.ts`, `plugins/error-handler.ts`, `config.ts`, `db.ts`, `redis.ts`, `components/{Toast,Avatar}.tsx`, `lib/theme.ts`, `main.tsx`, `docker-compose.yml`, all tsconfig base.

---

## Task 1: Local dev infrastructure

The base `docker-compose.yml` deliberately does **not** publish Postgres/Redis ports (so prod/staging can coexist). For local dev we run Postgres+Redis in Docker and the server/web on the host, so we need the ports published. Docker Compose auto-merges `docker-compose.override.yml`.

**Files:**
- Create: `docker-compose.override.yml`
- Modify: `.gitignore`
- Verify: `.env`

- [ ] **Step 1: Create `docker-compose.override.yml`**

```yaml
services:
  postgres:
    ports:
      - "5432:5432"
  redis:
    ports:
      - "6379:6379"
```

- [ ] **Step 2: Append the override to `.gitignore`**

Add this line to the end of `.gitignore`:

```
docker-compose.override.yml
```

- [ ] **Step 3: Ensure `.env` points at localhost**

Open `.env`. Confirm (and edit if needed) these two lines exactly — leave `BOT_TOKEN`, `JWT_SECRET`, `ADMIN_TELEGRAM_IDS`, `MINI_APP_URL` as they already are:

```
DATABASE_URL=postgresql://jobbarm:jobbarm@localhost:5432/jobbarm
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 4: Start Postgres + Redis and verify**

Run: `docker compose up -d postgres redis && docker compose ps`
Expected: both `postgres` and `redis` services listed as running (`Up`), Postgres on `0.0.0.0:5432`, Redis on `0.0.0.0:6379`.

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git commit -m "chore: local dev compose override (publish pg/redis ports)"
```

(`docker-compose.override.yml` is intentionally gitignored — do not commit it.)

---

## Task 2: New Prisma schema + fresh migration

**Files:**
- Modify (replace): `apps/server/prisma/schema.prisma`
- Delete: `apps/server/prisma/migrations/` (all subfolders + `migration_lock.toml`)

- [ ] **Step 1: Replace `apps/server/prisma/schema.prisma` with the full new schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  CLIENT
  SERVICE

  @@map("user_role")
}

enum ServiceType {
  BODY_PAINT
  ENGINE_CHASSIS
  MAINTENANCE
  TIRES
  ELECTRICAL
  AC
  GLASS
  INTERIOR
  OTHER

  @@map("service_type")
}

enum Urgency {
  URGENT
  THIS_WEEK
  NORMAL

  @@map("urgency")
}

enum RequestStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
  EXPIRED

  @@map("request_status")
}

model User {
  id              String          @id @default(uuid())
  telegramId      String          @unique @map("telegram_id")
  username        String?
  firstName       String?         @map("first_name")
  lastName        String?         @map("last_name")
  phoneNumber     String?         @map("phone_number")
  role            UserRole?
  language        String          @default("ru")
  isAdmin         Boolean         @default(false) @map("is_admin")
  isBanned        Boolean         @default(false) @map("is_banned")
  chatId          String?         @map("chat_id")
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  cars            Car[]
  requests        Request[]       @relation("ClientRequests")
  service         ServiceProfile?
  offers          Offer[]
  receivedReviews Review[]        @relation("ReviewedService")
  givenReviews    Review[]        @relation("ReviewAuthor")

  @@map("users")
}

model ServiceProfile {
  id              String   @id @default(uuid())
  userId          String   @unique @map("user_id")
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  description     String?
  address         String
  district        String
  phoneNumber     String   @map("phone_number")
  latitude        Float?
  longitude       Float?
  specializations String[]
  workingHours    Json?    @map("working_hours")
  isVerified      Boolean  @default(false) @map("is_verified")
  isActive        Boolean  @default(true) @map("is_active")
  photos          String[]
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([district, isVerified, isActive])
  @@map("service_profiles")
}

model Car {
  id           String    @id @default(uuid())
  userId       String    @map("user_id")
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  make         String
  model        String
  year         Int
  bodyType     String?   @map("body_type")
  color        String?
  licensePlate String?   @map("license_plate")
  createdAt    DateTime  @default(now()) @map("created_at")

  requests     Request[]

  @@index([userId])
  @@map("cars")
}

model Request {
  id              String        @id @default(uuid())
  clientId        String        @map("client_id")
  client          User          @relation("ClientRequests", fields: [clientId], references: [id])
  carId           String        @map("car_id")
  car             Car           @relation(fields: [carId], references: [id])
  serviceType     ServiceType   @map("service_type")
  description     String
  voiceFileId     String?       @map("voice_file_id")
  photos          String[]
  district        String
  urgency         Urgency       @default(NORMAL)
  isDrivable      Boolean       @default(true) @map("is_drivable")
  status          RequestStatus @default(OPEN)
  selectedOfferId String?       @unique @map("selected_offer_id")
  selectedOffer   Offer?        @relation("SelectedOffer", fields: [selectedOfferId], references: [id])
  reminderSentAt  DateTime?     @map("reminder_sent_at")
  selectedAt      DateTime?     @map("selected_at")
  createdAt       DateTime      @default(now()) @map("created_at")
  expiresAt       DateTime      @map("expires_at")

  offers          Offer[]       @relation("RequestOffers")
  reviews         Review[]

  @@index([district, status])
  @@index([clientId])
  @@map("requests")
}

model Offer {
  id            String   @id @default(uuid())
  requestId     String   @map("request_id")
  request       Request  @relation("RequestOffers", fields: [requestId], references: [id], onDelete: Cascade)
  serviceId     String   @map("service_id")
  service       User     @relation(fields: [serviceId], references: [id])
  price         Int
  priceMax      Int?     @map("price_max")
  comment       String?
  duration      String?
  examplePhotos String[] @map("example_photos")
  createdAt     DateTime @default(now()) @map("created_at")

  selectedFor   Request? @relation("SelectedOffer")

  @@unique([requestId, serviceId])
  @@index([serviceId])
  @@map("offers")
}

model Review {
  id        String   @id @default(uuid())
  requestId String   @map("request_id")
  request   Request  @relation(fields: [requestId], references: [id])
  authorId  String   @map("author_id")
  author    User     @relation("ReviewAuthor", fields: [authorId], references: [id])
  serviceId String   @map("service_id")
  service   User     @relation("ReviewedService", fields: [serviceId], references: [id])
  rating    Int
  text      String?
  photos    String[]
  createdAt DateTime @default(now()) @map("created_at")

  @@index([serviceId])
  @@map("reviews")
}
```

- [ ] **Step 2: Delete old migrations**

Run: `rm -rf "apps/server/prisma/migrations"`
Expected: no output; the directory is gone.

- [ ] **Step 3: Reset the dev database (drops old JobArm tables)**

Run: `pnpm --filter server exec prisma migrate reset --force --skip-seed`
Expected: "Database reset successful" — with no migration files present, Prisma drops & recreates the public schema, applies 0 migrations, and runs `prisma generate`.

- [ ] **Step 4: Create the fresh migration**

Run: `pnpm --filter server exec prisma migrate dev --name init_auto_service`
Expected: a new folder `apps/server/prisma/migrations/<timestamp>_init_auto_service/migration.sql` is created and applied; ends with "Your database is now in sync with your schema."

- [ ] **Step 5: Regenerate the Prisma client**

Run: `pnpm --filter server exec prisma generate`
Expected: "Generated Prisma Client".

- [ ] **Step 6: Commit**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations
git commit -m "feat: replace Prisma schema with Auto Service domain (fresh migration)"
```

---

## Task 3: Replace the shared package

**Files:**
- Modify (replace): `packages/shared/src/index.ts`

- [ ] **Step 1: Replace `packages/shared/src/index.ts`**

```ts
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

export function label(l: LocalizedLabel, lang: Language): string {
  return l[lang] ?? l.ru
}

export const SERVICE_TYPES: { key: ServiceType; label: LocalizedLabel }[] = [
  { key: 'BODY_PAINT', label: { ru: 'Кузов и покраска', hy: 'Թափք և ներկում' } },
  { key: 'ENGINE_CHASSIS', label: { ru: 'Двигатель и ходовая', hy: 'Շարժիչ և անվախել' } },
  { key: 'MAINTENANCE', label: { ru: 'ТО и расходники', hy: 'ՏO և ծախսանյութեր' } },
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
}
```

- [ ] **Step 2: Build the shared package**

Run: `pnpm --filter @jobbarm/shared build`
Expected: tsc exits 0; `packages/shared/dist/index.js` and `index.d.ts` regenerated with the new exports.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/index.ts packages/shared/dist
git commit -m "feat: replace shared types with Auto Service domain + reference data"
```

---

## Task 4: Swap the bot from telegraf to grammY

**Files:**
- Modify: `apps/server/package.json`
- Modify (replace): `apps/server/src/bot/bot.ts`, `apps/server/src/bot/notifications.ts`, `apps/server/src/main.ts`
- Delete: `apps/server/src/bot/messages.ts`

- [ ] **Step 1: Edit `apps/server/package.json` dependencies**

In the `"dependencies"` block, **remove** these three lines:

```json
    "@fastify/multipart": "^8.3.0",
    "sharp": "^0.34.5",
    "telegraf": "^4.16.3",
```

and **add** these two lines (keep alphabetical-ish order, valid JSON — no trailing comma on the last dependency):

```json
    "@grammyjs/conversations": "^1.2.0",
    "grammy": "^1.30.0",
```

- [ ] **Step 2: Install**

Run: `pnpm install`
Expected: completes; `grammy` and `@grammyjs/conversations` resolved; `telegraf`/`sharp`/`@fastify/multipart` removed from the lockfile.

- [ ] **Step 3: Replace `apps/server/src/bot/bot.ts`**

```ts
import { Bot } from 'grammy'
import { config } from '../config.js'
import { db } from '../db.js'

export const bot = new Bot(config.BOT_TOKEN)

bot.command('start', async (ctx) => {
  const from = ctx.from
  if (!from) return
  const telegramId = String(from.id)
  const chatId = String(ctx.chat?.id ?? from.id)
  try {
    await db.user.update({ where: { telegramId }, data: { chatId } })
  } catch {
    // Not registered yet — the Mini App auth flow will create the user.
  }
  await ctx.reply('🚗 Авто-сервис маркетплейс', {
    reply_markup: {
      inline_keyboard: [[{ text: '🚀 Открыть', web_app: { url: config.MINI_APP_URL } }]],
    },
  })
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
}
```

- [ ] **Step 4: Replace `apps/server/src/bot/notifications.ts`**

```ts
import type { Bot } from 'grammy'
import { db } from '../db.js'
import { config } from '../config.js'

let _bot: Bot | null = null

export function initNotifications(bot: Bot): void {
  _bot = bot
}

export async function notify(
  telegramId: string,
  text: string,
  opts: { requestId?: string; buttonLabel?: string } = {}
): Promise<void> {
  if (!_bot) return
  try {
    const user = await db.user.findUnique({
      where: { telegramId },
      select: { chatId: true },
    })
    if (!user?.chatId) return
    const url = opts.requestId
      ? `${config.MINI_APP_URL}?startapp=request_${opts.requestId}`
      : config.MINI_APP_URL
    await _bot.api.sendMessage(user.chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: opts.buttonLabel ?? 'Открыть', web_app: { url } }]],
      },
    })
  } catch {
    // User may have blocked the bot — ignore.
  }
}

export async function notifyAdmins(text: string): Promise<void> {
  if (!_bot || config.ADMIN_TELEGRAM_IDS.length === 0) return
  await Promise.all(
    config.ADMIN_TELEGRAM_IDS.map((id) =>
      _bot!.api.sendMessage(id, text, { parse_mode: 'Markdown' }).catch(() => undefined)
    )
  )
}

export async function notifyAdminsNewUser(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      username: true,
      telegramId: true,
      phoneNumber: true,
      language: true,
      role: true,
    },
  })
  if (!user) return
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User'
  const text =
    `🆕 *Новый пользователь*\n\n` +
    `👤 ${name}\n` +
    (user.username ? `🆔 @${user.username}\n` : '') +
    (user.phoneNumber ? `📞 ${user.phoneNumber}\n` : '') +
    `🌐 ${user.language} · ${user.role ?? 'роль не выбрана'}\n` +
    `tg id: \`${user.telegramId}\``
  await notifyAdmins(text)
}
```

- [ ] **Step 5: Delete the old telegraf message templates**

Run: `rm "apps/server/src/bot/messages.ts"`
Expected: no output.

- [ ] **Step 6: Replace `apps/server/src/main.ts`**

```ts
import { buildApp } from './app.js'
import { config } from './config.js'
import { bot, configureBotMenu } from './bot/bot.js'
import { initNotifications } from './bot/notifications.js'

const app = buildApp()

initNotifications(bot)

app.listen({ port: config.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})

// Long polling. A bad/placeholder BOT_TOKEN must not crash the HTTP server.
bot
  .start({ onStart: () => app.log.info('Bot started (long polling)') })
  .catch((err) => app.log.warn({ err }, 'Bot failed to start'))

configureBotMenu().catch((err) => {
  app.log.warn({ err }, 'Failed to configure bot menu')
})

const shutdown = async () => {
  await bot.stop().catch(() => undefined)
  await app.close()
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
```

- [ ] **Step 7: Commit**

```bash
git add apps/server/package.json apps/server/src/bot/bot.ts apps/server/src/bot/notifications.ts apps/server/src/main.ts pnpm-lock.yaml
git commit -m "feat: swap Telegram bot library telegraf -> grammY (minimal bootstrap)"
```

---

## Task 5: Strip and rewire the server routes

**Files:**
- Delete: `apps/server/src/routes/{jobs,masters,applications,categories,reviews,notifications,users,admin}.ts`
- Delete: `apps/server/tests/` (whole dir)
- Create: `apps/server/src/routes/me.ts`
- Modify (replace): `apps/server/src/routes/auth.ts`, `apps/server/src/app.ts`, `apps/server/tsconfig.json`

- [ ] **Step 1: Delete JobArm route files and the tests dir**

Run:
```bash
rm "apps/server/src/routes/jobs.ts" "apps/server/src/routes/masters.ts" "apps/server/src/routes/applications.ts" "apps/server/src/routes/categories.ts" "apps/server/src/routes/reviews.ts" "apps/server/src/routes/notifications.ts" "apps/server/src/routes/users.ts" "apps/server/src/routes/admin.ts"
rm -rf "apps/server/tests"
```
Expected: no output. Remaining files in `apps/server/src/routes/`: only `auth.ts`.

- [ ] **Step 2: Create `apps/server/src/routes/me.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'

export default async function meRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    return db.user.findUniqueOrThrow({
      where: { id: userId },
      include: { service: true },
    })
  })

  app.put('/me', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    const schema = z.object({
      phoneNumber: z.string().min(5).optional(),
      language: z.enum(['ru', 'hy']).optional(),
    })
    const data = schema.parse(request.body)
    return db.user.update({ where: { id: userId }, data })
  })
}
```

- [ ] **Step 3: Replace `apps/server/src/routes/auth.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validateTelegramInitData } from '../plugins/auth.js'
import { db } from '../db.js'
import { config } from '../config.js'
import { notifyAdminsNewUser } from '../bot/notifications.js'

const bodySchema = z.object({
  initData: z.string().min(1),
  language: z.enum(['ru', 'hy']).default('ru'),
})

export default async function authRoutes(app: FastifyInstance) {
  app.post('/telegram', async (request, reply) => {
    const { initData, language } = bodySchema.parse(request.body)

    const data = validateTelegramInitData(initData, config.BOT_TOKEN)
    if (!data) return reply.status(401).send({ error: 'Invalid initData' })

    let tgUser: { id?: number; first_name?: string; last_name?: string; username?: string } = {}
    try {
      tgUser = JSON.parse(data['user'] ?? '{}') as typeof tgUser
    } catch {
      return reply.status(400).send({ error: 'Malformed user field' })
    }
    const telegramId = String(tgUser.id ?? '')
    if (!telegramId) return reply.status(400).send({ error: 'No user in initData' })

    const existingUser = await db.user.findUnique({ where: { telegramId } })
    const adminFlag = config.ADMIN_TELEGRAM_IDS.includes(telegramId) ? { isAdmin: true } : {}

    const user = await db.user.upsert({
      where: { telegramId },
      update: { chatId: telegramId, username: tgUser.username ?? null, ...adminFlag },
      create: {
        telegramId,
        chatId: telegramId,
        username: tgUser.username ?? null,
        firstName: tgUser.first_name ?? null,
        lastName: tgUser.last_name ?? null,
        language,
        ...adminFlag,
      },
    })

    if (user.isBanned) return reply.status(403).send({ error: 'banned' })

    const isNew = existingUser === null
    if (isNew) void notifyAdminsNewUser(user.id)

    const token = app.jwt.sign({ userId: user.id, telegramId })
    return { token, isNew }
  })
}
```

- [ ] **Step 4: Replace `apps/server/src/app.ts`**

```ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import authPlugin from './plugins/auth.js'
import errorHandler from './plugins/error-handler.js'
import authRoutes from './routes/auth.js'
import meRoutes from './routes/me.js'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: true })
  app.register(authPlugin)
  app.register(errorHandler)

  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(meRoutes, { prefix: '/api' })

  app.get('/health', async () => ({ ok: true }))

  return app
}
```

- [ ] **Step 5: Update `apps/server/tsconfig.json` include (drop deleted `tests`)**

Replace the file with:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["src", "prisma"]
}
```

- [ ] **Step 6: Typecheck the server**

Run: `pnpm --filter server exec tsc --noEmit`
Expected: exits 0, no output. (If `prisma generate` was skipped earlier, run `pnpm --filter server exec prisma generate` first.)

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/routes apps/server/src/app.ts apps/server/tsconfig.json
git rm -r --cached apps/server/tests 2>/dev/null || true
git add -A apps/server
git commit -m "feat: strip JobArm routes; add minimal /api/me; delete tests"
```

---

## Task 6: Rewrite the seed

**Files:**
- Modify (replace): `apps/server/prisma/seed.ts`

- [ ] **Step 1: Replace `apps/server/prisma/seed.ts`**

```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const client = await prisma.user.upsert({
    where: { telegramId: '100000001' },
    update: {},
    create: {
      telegramId: '100000001',
      chatId: '100000001',
      firstName: 'Тест',
      lastName: 'Клиент',
      role: 'CLIENT',
      language: 'ru',
    },
  })

  const serviceUser = await prisma.user.upsert({
    where: { telegramId: '100000002' },
    update: {},
    create: {
      telegramId: '100000002',
      chatId: '100000002',
      firstName: 'Тест',
      lastName: 'Сервис',
      role: 'SERVICE',
      language: 'ru',
    },
  })

  await prisma.serviceProfile.upsert({
    where: { userId: serviceUser.id },
    update: {},
    create: {
      userId: serviceUser.id,
      name: 'Авто Мастер Плюс',
      address: 'Ереван, ул. Тестовая 1',
      district: 'Kentron',
      phoneNumber: '+37400000000',
      specializations: ['BODY_PAINT', 'ENGINE_CHASSIS'],
      isVerified: true,
      isActive: true,
      photos: [],
    },
  })

  console.log('Seeded test users:', { client: client.id, service: serviceUser.id })
}

main().finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run the seed**

Run: `pnpm --filter server db:seed`
Expected: prints `Seeded test users: { client: '<uuid>', service: '<uuid>' }`, exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/server/prisma/seed.ts
git commit -m "feat: seed test client + verified service for local dev"
```

---

## Task 7: Reset the web shell

**Files:**
- Modify (replace): `apps/web/src/store/index.ts`, `apps/web/src/lib/i18n.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/utils.ts`, `apps/web/src/App.tsx`, `apps/web/index.html`
- Delete: `apps/web/src/pages/` (whole dir), `apps/web/src/components/Layout.tsx`, `apps/web/src/components/BottomNav.tsx`, `apps/web/src/lib/image.ts`

- [ ] **Step 1: Delete JobArm pages and unused primitives**

Run:
```bash
rm -rf "apps/web/src/pages"
rm "apps/web/src/components/Layout.tsx" "apps/web/src/components/BottomNav.tsx" "apps/web/src/lib/image.ts"
```
Expected: no output. Remaining in `apps/web/src/components/`: `Avatar.tsx`, `Toast.tsx`.

- [ ] **Step 2: Replace `apps/web/src/store/index.ts`**

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@jobbarm/shared'

type ThemeMode = 'auto' | 'light' | 'dark'

interface AppState {
  token: string | null
  language: Language
  themeMode: ThemeMode
  setToken: (token: string) => void
  setLanguage: (lang: Language) => void
  setThemeMode: (mode: ThemeMode) => void
  reset: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      language: 'ru',
      themeMode: 'auto',
      setToken: (token) => set({ token }),
      setLanguage: (language) => set({ language }),
      setThemeMode: (themeMode) => set({ themeMode }),
      reset: () => set({ token: null }),
    }),
    {
      name: 'autoservice-store',
      partialize: (s) => ({ token: s.token, language: s.language, themeMode: s.themeMode }),
    }
  )
)
```

- [ ] **Step 3: Replace `apps/web/src/lib/i18n.ts`**

```ts
import { useStore } from '@/store'

const ru = {
  app: {
    name: 'Авто-сервис',
    loading: 'Загрузка…',
    openInTelegram: 'Откройте приложение через Telegram',
    placeholder: 'Скоро здесь появится поиск автосервиса',
  },
  errors: {
    generic: 'Что-то пошло не так',
  },
}

type Strings = typeof ru

const hy: Strings = {
  app: {
    name: 'Ավտոսերվիս',
    loading: 'Բեռնում…',
    openInTelegram: 'Բացեք հավելվածը Telegram-ի միջոցով',
    placeholder: 'Շուտով այստեղ կլինի ավտոսերվիսի որոնում',
  },
  errors: {
    generic: 'Ինչ-որ բան սխալ է գնացել',
  },
}

const strings: Record<string, Strings> = { ru, hy }

export function useT(): Strings {
  const language = useStore((s) => s.language)
  return strings[language] ?? strings.ru
}
```

- [ ] **Step 4: Replace `apps/web/src/lib/api.ts`**

```ts
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
```

- [ ] **Step 5: Replace `apps/web/src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang === 'hy' ? 'hy-AM' : 'ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatAmount(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} ֏`
}
```

- [ ] **Step 6: Replace `apps/web/src/App.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { postTelegramAuth, getMe } from '@/lib/api'
import { Toast } from '@/components/Toast'
import { useT } from '@/lib/i18n'

export default function App() {
  const { token, language, setToken } = useStore()
  const [loading, setLoading] = useState(!token)
  const t = useT()

  useEffect(() => {
    if (token) {
      setLoading(false)
      return
    }
    const initData = window.Telegram?.WebApp.initData
    if (!initData) {
      setLoading(false)
      return
    }
    postTelegramAuth(initData, language)
      .then(({ token: tk }) => setToken(tk))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!token) return
    getMe().catch(() => undefined)
  }, [token])

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
        <p className="text-muted">{t.app.openInTelegram}</p>
      </div>
    )
  }

  return (
    <>
      <Toast />
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center gap-2">
        <h1 className="text-2xl font-bold">{t.app.name}</h1>
        <p className="text-muted">{t.app.placeholder}</p>
      </div>
    </>
  )
}
```

- [ ] **Step 7: Update the title in `apps/web/index.html`**

Replace the line `    <title>JobArm</title>` with:

```html
    <title>Авто-сервис</title>
```

- [ ] **Step 8: Typecheck + build the web app**

Run: `pnpm --filter web build`
Expected: `tsc` passes and `vite build` ends with `✓ built in ...`. No type errors. (`main.tsx`, `lib/theme.ts`, `components/Toast.tsx`, `components/Avatar.tsx` are unchanged and still compile — `main.tsx` keeps `BrowserRouter`/`QueryClientProvider`, harmless even though `App` no longer routes.)

- [ ] **Step 9: Commit**

```bash
git add apps/web/src apps/web/index.html
git commit -m "feat: reset web to Auto Service shell (auth + placeholder, RU/HY)"
```

---

## Task 8: Delete JobArm brand & landing assets

**Files:**
- Delete: `deploy/landing/`, `deploy/jobarm-brand/`, `apps/web/jobarm-brand/`, `apps/server/src/assets/`

- [ ] **Step 1: Delete brand/landing/asset directories**

Run:
```bash
rm -rf "deploy/landing" "deploy/jobarm-brand" "apps/web/jobarm-brand" "apps/server/src/assets"
```
Expected: no output.

- [ ] **Step 2: Verify nothing references the removed asset**

Run: `grep -rn "assets/welcome" "apps/server/src" || echo "clean"`
Expected: prints `clean` (the old telegraf bot.ts that referenced it was already replaced in Task 4).

- [ ] **Step 3: Commit**

```bash
git add -A deploy apps/web apps/server
git commit -m "chore: remove JobArm brand, landing, and bot assets"
```

---

## Task 9: Full local verification

**Files:** none (verification only).

- [ ] **Step 1: Clean install from the workspace root**

Run: `pnpm install`
Expected: completes with no errors.

- [ ] **Step 2: Confirm Postgres/Redis are up**

Run: `docker compose ps`
Expected: `postgres` and `redis` both `Up`. If not: `docker compose up -d postgres redis`.

- [ ] **Step 3: Apply migrations + seed fresh**

Run:
```bash
pnpm --filter server exec prisma migrate reset --force
```
Expected: drops & recreates schema, applies the `init_auto_service` migration, runs the seed (`Seeded test users: ...`).

- [ ] **Step 4: Typecheck server + build web**

Run: `pnpm --filter server exec tsc --noEmit && pnpm --filter web build`
Expected: both succeed, no type errors, vite reports `✓ built in ...`.

- [ ] **Step 5: Boot the server and hit /health**

Run the server in the background:
```bash
pnpm --filter server dev &
SERVER_PID=$!
sleep 6
curl -s localhost:3000/health
kill $SERVER_PID
```
Expected: `curl` prints `{"ok":true}`. The log shows Fastify listening on `0.0.0.0:3000`. A `Bot failed to start` warning is acceptable here if `.env`'s `BOT_TOKEN` is a placeholder — it must NOT crash the HTTP server (verified by the successful `/health` response).

- [ ] **Step 6: Final commit (lockfile / any cleanup)**

```bash
git add -A
git commit -m "chore: Phase 0 reset complete — clean Auto Service foundation boots locally" || echo "nothing to commit"
```

---

## Done criteria (Phase 0)

- `pnpm install` clean; `telegraf`/`sharp`/`@fastify/multipart` gone, `grammy` present.
- `prisma migrate reset` applies the new Auto Service schema and seeds a test client + verified service.
- `pnpm --filter server exec tsc --noEmit` passes; `pnpm --filter web build` passes.
- Server boots and `GET /health` returns `{"ok":true}` even with a placeholder bot token.
- No JobArm domain code, routes, pages, brand, or landing remains.
- Repo is on `main` with one commit per task.

## Self-Review

**Spec coverage (Phase 0 scope = design §15 row "0. Reset"):**
- Снос домена JobArm → Tasks 2, 5, 7, 8. ✓
- Новая Prisma-схема + миграция → Task 2. ✓
- seed справочников и тестовых юзеров → справочники are static in shared (Task 3, deliberate deviation); test users → Task 6. ✓
- shared-типы/Zod → Task 3 (types + reference data; Zod request schemas belong to feature phases — none needed in Phase 0). ✓
- i18n RU+HY каркас → Task 7 Step 3 (`ru` + `hy`, default `ru`). ✓
- Local boot (design "runs locally") → Tasks 1, 9. ✓

**Placeholder scan:** No "TBD"/"handle appropriately"/vague steps; every code step shows full file content; every command has an expected result. ✓

**Type consistency:** `UserProfile` (shared) — `telegramId/firstName/lastName/phoneNumber/role/language` match Prisma `User` and `me.ts`/`auth.ts`. `Language='ru'|'hy'` consistent across shared/store/i18n/api/auth/me. `notifyAdminsNewUser` selects fields that exist on the new `User`. `bot.ts`/`notifications.ts`/`main.ts` all use the grammY `Bot` type. `app.ts` imports only `auth.ts`+`me.ts` (the only surviving route files). ✓
