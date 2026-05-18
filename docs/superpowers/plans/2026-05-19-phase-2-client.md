# Phase 2 — Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a CLIENT manage a car garage and create + view repair requests — garage CRUD API + the request-creation bot wizard (photos/voice) + the first real Mini App screens (Garage, My Requests, Request Detail, Profile) + a per-client daily request rate-limit.

**Architecture:** New Fastify routes `cars`/`requests` (Zod-validated, JWT-gated, owner-scoped) added to `app.ts`. A Redis daily-counter rate-limit util. A grammY `@grammyjs/conversations` wizard `createRequest` (mirrors the Phase-1 `registerService` conventions: side effects in `conversation.external`, abort-on-non-text, callback ack before DB write) that picks/creates a `Car`, collects service type/description/photos/optional voice/district/urgency/isDrivable, then creates `Request(OPEN, expiresAt = now + 24h)`. The Mini App gains React-Router routing, a `Layout`+`BottomNav` shell, and four pages consuming the new API via TanStack Query.

**Tech Stack:** Fastify + Prisma + Zod + ioredis, grammY 1.x + `@grammyjs/conversations` 1.2, React 18 + React Router v6.24 + TanStack Query v5 + Zustand + Tailwind, `@jobbarm/shared` (workspace), TypeScript strict.

**Deliberate decisions / phase boundaries (carry Phase-0/1 conventions; do NOT relitigate):**
- **No matching in Phase 2.** Design §15: matching + notifying services is **Phase 3**. The wizard creates the `Request` and replies a plain confirmation (`reqCreated`) — it does NOT query `ServiceProfile` or notify anyone. Do not add matching "to be helpful".
- **No media rendering in Phase 2.** The Telegram file-proxy (`GET /api/files/:id`) is **Phase 4** (design §6/§15). Request-detail shows `📷 N фото` / `🎤 голосовое` badges from array lengths, not `<img>`/`<audio>`. The Phase-0 `fileUrl()` helper exists but is not wired here.
- **Request screens are read-only in Phase 2.** Offer list, select-offer, cancel are **Phase 4** (design §15 "Связка"). `GET /api/requests` (own list) + `GET /api/requests/:id` (own detail) only — no `cancel`/`select`/`offers` endpoints.
- **No automated tests** (per `SPEC_AUTO.md` #7). Per-task gate = `pnpm --filter @jobbarm/shared build && pnpm --filter server exec tsc --noEmit && pnpm --filter web exec tsc --noEmit`; the final task adds `pnpm --filter web build` + server boot + a manual checklist.
- **Strict non-ASCII integrity.** Every Cyrillic/Armenian string below is canonical — copy verbatim, never transliterate/normalize/substitute. Reference data (districts, service types, urgency, car makes, status labels) comes from `@jobbarm/shared` (`localizedLabel`) — do NOT hand-write those translations anywhere.
- **Bot add-car sub-flow is minimal:** make (buttons incl. `Other`→text) → model (text) → year (validated int) → licence plate (optional `-`). `bodyType`/`color` are intentionally NOT collected in the bot (fully editable in the Mini App Garage form, Task 11). Documented; do not "complete" the bot sub-flow.
- ESM TypeScript: relative imports use `.js` extensions on the server; web uses the `@/*` alias and `@jobbarm/shared`.

**Reference:** `docs/superpowers/specs/2026-05-18-auto-service-marketplace-design.md` (§5 data model, §7 wizard, §8 API, §9 screens, §13 rate-limit, §15 phases), `SPEC_AUTO.md`, `docs/superpowers/plans/2026-05-18-phase-1-bot-core.md` (conventions to mirror).

---

## File Structure

**Created (server):**
- `apps/server/src/lib/rateLimit.ts` — Redis daily-counter rate-limit helper
- `apps/server/src/routes/cars.ts` — garage CRUD (owner-scoped)
- `apps/server/src/routes/requests.ts` — client request list + detail (owner-scoped, read-only)
- `apps/server/src/bot/conversations/createRequest.ts` — request-creation wizard

**Created (web):**
- `apps/web/src/components/Layout.tsx` — page shell (header + safe-area + outlet)
- `apps/web/src/components/BottomNav.tsx` — 3-tab bottom navigation
- `apps/web/src/pages/RequestsPage.tsx` — "Мои заявки" list
- `apps/web/src/pages/RequestDetailPage.tsx` — "Детали заявки"
- `apps/web/src/pages/CarsPage.tsx` — "Гараж" CRUD
- `apps/web/src/pages/ProfilePage.tsx` — "Профиль" (phone, language)

**Modified:**
- `packages/shared/src/index.ts` — add `Car`/`RequestSummary`/`RequestDetail` shapes + `carInputSchema`
- `apps/server/src/app.ts` — register `carsRoutes`, `requestsRoutes`
- `apps/server/src/bot/i18n.ts` — request-wizard + car RU/HY keys
- `apps/server/src/bot/keyboards.ts` — single-select service-type / urgency / drivable / confirm / car-pick / car-make keyboards
- `apps/server/src/bot/bot.ts` — register `createRequest` conversation + `menu:create_request` entry; webApp buttons unchanged here (see Task 8)
- `apps/server/src/bot/handlers/start.ts` — `clientMenuKeyboard` is in `keyboards.ts`; this file unchanged unless noted
- `apps/server/src/bot/keyboards.ts` `clientMenuKeyboard` — `my_requests`/`my_cars` become `webApp` buttons (Task 8)
- `apps/server/src/bot/handlers/misc.ts` — drop `create_request|my_requests|my_cars` from the "coming soon" stub regex
- `apps/web/src/lib/api.ts` — cars/requests API methods
- `apps/web/src/lib/i18n.ts` — Phase-2 RU/HY UI strings
- `apps/web/src/App.tsx` — React-Router routes + auth gate preserved

**Unchanged (relied on):** `routes/me.ts`, `routes/auth.ts`, `plugins/auth.ts`, `bot/middleware.ts`, `bot/context.ts`, `bot/session.ts`, `bot/notifications.ts`, `redis.ts`, `config.ts`, `db.ts`, `main.ts`, web `store/index.ts`, `components/Toast.tsx`, `lib/theme.ts`.

---

## Task 1: Shared — Car/Request API shapes + carInputSchema

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Append to the end of `packages/shared/src/index.ts` (after the `UserProfile` interface) EXACTLY:**

```ts

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
```

- [ ] **Step 2: Confirm `zod` is a dependency of the shared package**

Run: `node -e "require('./packages/shared/package.json').dependencies && process.stdout.write(JSON.stringify(require('./packages/shared/package.json').dependencies))"`
Expected: output contains `"zod"`. (It is already used by server/web; if shared lacks it, run `pnpm --filter @jobbarm/shared add zod` and note it — but it is expected to resolve via the workspace. If `zod` is NOT listed in shared's own deps, add it with `pnpm --filter @jobbarm/shared add zod` before continuing.)

- [ ] **Step 3: Build shared + typecheck both apps**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter server exec tsc --noEmit && pnpm --filter web exec tsc --noEmit`
Expected: all exit 0, no output. `packages/shared/dist/index.d.ts` now exports `carInputSchema`, `CarInput`, `Car`, `RequestSummary`, `RequestDetail`, `CURRENT_YEAR`.

- [ ] **Step 4: Commit** (include `pnpm-lock.yaml` — `pnpm add zod` updates it; committing keeps `--frozen-lockfile` CI green)

```bash
git add packages/shared/src/index.ts packages/shared/package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(shared): Car/RequestSummary/RequestDetail shapes + carInputSchema

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Rate-limit util (Redis daily counter)

**Files:**
- Create: `apps/server/src/lib/rateLimit.ts`

Design §13: ≤10 requests/day/client. Generic per-key daily counter over the existing ioredis client.

- [ ] **Step 1: Create `apps/server/src/lib/rateLimit.ts` with EXACTLY:**

```ts
import { redis } from '../redis.js'

// Atomic daily counter. Returns true if the action is allowed (and counts it),
// false if the per-day limit is already reached. Key auto-expires after 24h.
export async function consumeDailyLimit(
  scope: string,
  id: string,
  limit: number
): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
  const key = `rl:${scope}:${id}:${day}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 86400)
  return count <= limit
}

export const DAILY_REQUEST_LIMIT = 10
```

- [ ] **Step 2: Typecheck server**

Run: `pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output. (Not yet imported; confirms it compiles.)

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/lib/rateLimit.ts
git commit -m "$(cat <<'EOF'
feat(server): Redis daily-counter rate-limit helper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: routes/cars.ts (garage CRUD)

**Files:**
- Create: `apps/server/src/routes/cars.ts`
- Modify: `apps/server/src/app.ts`

Mirror `routes/me.ts` conventions: `preHandler: [app.authenticate]`, `request.user.userId`, Zod parse, owner-scoped queries.

- [ ] **Step 1: Create `apps/server/src/routes/cars.ts` with EXACTLY:**

```ts
import type { FastifyInstance } from 'fastify'
import { carInputSchema } from '@jobbarm/shared'
import { db } from '../db.js'

export default async function carsRoutes(app: FastifyInstance) {
  app.get('/cars', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    return db.car.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.post('/cars', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user
    const data = carInputSchema.parse(request.body)
    const car = await db.car.create({
      data: {
        userId,
        make: data.make,
        model: data.model,
        year: data.year,
        bodyType: data.bodyType ?? null,
        color: data.color ?? null,
        licensePlate: data.licensePlate ?? null,
      },
    })
    return reply.status(201).send(car)
  })

  app.put('/cars/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user
    const { id } = request.params as { id: string }
    const data = carInputSchema.parse(request.body)
    const existing = await db.car.findFirst({ where: { id, userId } })
    if (!existing) return reply.status(404).send({ error: 'not_found' })
    return db.car.update({
      where: { id },
      data: {
        make: data.make,
        model: data.model,
        year: data.year,
        bodyType: data.bodyType ?? null,
        color: data.color ?? null,
        licensePlate: data.licensePlate ?? null,
      },
    })
  })

  app.delete('/cars/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user
    const { id } = request.params as { id: string }
    const existing = await db.car.findFirst({ where: { id, userId } })
    if (!existing) return reply.status(404).send({ error: 'not_found' })
    // A car referenced by requests must not be hard-deleted (FK). Block it.
    const used = await db.request.count({ where: { carId: id } })
    if (used > 0) return reply.status(409).send({ error: 'car_in_use' })
    await db.car.delete({ where: { id } })
    return reply.status(204).send()
  })
}
```

- [ ] **Step 2: Register the route in `apps/server/src/app.ts`**

In `apps/server/src/app.ts`, add the import after the `meRoutes` import line:

```ts
import carsRoutes from './routes/cars.js'
```

and register it after the `meRoutes` registration line (`app.register(meRoutes, { prefix: '/api' })`):

```ts
  app.register(carsRoutes, { prefix: '/api' })
```

- [ ] **Step 3: Typecheck server**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/cars.ts apps/server/src/app.ts
git commit -m "$(cat <<'EOF'
feat(api): garage CRUD routes (owner-scoped, car-in-use guard)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: routes/requests.ts (client list + detail, read-only)

**Files:**
- Create: `apps/server/src/routes/requests.ts`
- Modify: `apps/server/src/app.ts`

Returns the shared `RequestSummary`/`RequestDetail` shapes (dates serialized as ISO strings by Fastify's JSON; map explicitly to avoid leaking extra columns and to compute `photosCount`/`hasVoice`).

- [ ] **Step 1: Create `apps/server/src/routes/requests.ts` with EXACTLY:**

```ts
import type { FastifyInstance } from 'fastify'
import type { RequestSummary, RequestDetail } from '@jobbarm/shared'
import { db } from '../db.js'

export default async function requestsRoutes(app: FastifyInstance) {
  app.get('/requests', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    const rows = await db.request.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: 'desc' },
      include: { car: { select: { make: true, model: true, year: true } } },
    })
    const out: RequestSummary[] = rows.map((r) => ({
      id: r.id,
      serviceType: r.serviceType,
      description: r.description,
      district: r.district,
      urgency: r.urgency,
      status: r.status,
      photosCount: r.photos.length,
      hasVoice: r.voiceFileId != null,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      car: { make: r.car.make, model: r.car.model, year: r.car.year },
    }))
    return out
  })

  app.get('/requests/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user
    const { id } = request.params as { id: string }
    const r = await db.request.findFirst({
      where: { id, clientId: userId },
      include: { car: { select: { make: true, model: true, year: true } } },
    })
    if (!r) return reply.status(404).send({ error: 'not_found' })
    const out: RequestDetail = {
      id: r.id,
      serviceType: r.serviceType,
      description: r.description,
      district: r.district,
      urgency: r.urgency,
      status: r.status,
      photosCount: r.photos.length,
      hasVoice: r.voiceFileId != null,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      car: { make: r.car.make, model: r.car.model, year: r.car.year },
      isDrivable: r.isDrivable,
      photos: r.photos,
      voiceFileId: r.voiceFileId,
    }
    return out
  })
}
```

- [ ] **Step 2: Register the route in `apps/server/src/app.ts`**

Add the import after the `carsRoutes` import line:

```ts
import requestsRoutes from './routes/requests.js'
```

and register it after the `carsRoutes` registration line:

```ts
  app.register(requestsRoutes, { prefix: '/api' })
```

- [ ] **Step 3: Typecheck server**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/requests.ts apps/server/src/app.ts
git commit -m "$(cat <<'EOF'
feat(api): client request list + detail (read-only, owner-scoped)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Bot i18n — request-wizard + car keys (RU/HY)

**Files:**
- Modify: `apps/server/src/bot/i18n.ts`

Add the keys below into the `ru` dict (before its closing `}`) and the mirrored keys into the `hy` dict (before its closing `}`). **Every Armenian/Russian value is canonical — copy verbatim; do NOT transliterate or "fix" any character. The two dicts MUST end up with identical key sets.**

- [ ] **Step 1: Insert into the `ru` dict (immediately before the line `adminNewService:` so ordering stays readable) EXACTLY these keys:**

```ts
  reqPickCar: 'Выберите машину или добавьте новую:',
  reqAddCar: '➕ Добавить машину',
  reqCarMake: 'Марка автомобиля? Выберите или нажмите «Другое».',
  reqCarMakeOther: 'Введите марку автомобиля:',
  reqCarModel: 'Модель?',
  reqCarYear: 'Год выпуска? (например, 2015)',
  reqCarYearBad: 'Введите год числом от 1950 до следующего года.',
  reqCarPlate: 'Гос. номер? (или отправьте «-», чтобы пропустить)',
  reqCarSaved: '🚗 Машина добавлена.',
  reqServiceType: 'Какая нужна услуга?',
  reqDescription: 'Опишите проблему текстом:',
  reqPhotos: 'Пришлите 1–5 фото или нажмите «Пропустить».',
  reqPhotosSkip: 'Пропустить',
  reqPhotosDone: 'Готово',
  reqPhotosMore: 'Фото добавлено ({n}/5). Ещё или «Готово».',
  reqVoice: 'Можно добавить голосовое сообщение с описанием — пришлите его или нажмите «Пропустить».',
  reqVoiceSkip: 'Пропустить',
  reqDistrict: 'В каком районе Еревана вы находитесь?',
  reqUrgency: 'Насколько срочно?',
  reqDrivable: 'Машина на ходу?',
  reqDrivableYes: '✅ На ходу',
  reqDrivableNo: '🛑 Не на ходу',
  reqConfirm: 'Создать заявку?\n\n🚗 {car}\n🔧 {service}\n📍 {district}\n⏱ {urgency}\n📝 {description}',
  reqConfirmYes: '✅ Создать',
  reqConfirmNo: '❌ Отмена',
  reqCreated: '✅ Заявка создана! Автосервисы скоро получат её и пришлют предложения — следите в Mini App.',
  reqCancelled: 'Создание заявки отменено.',
  reqRateLimited: 'Лимит заявок на сегодня исчерпан (10/день). Попробуйте завтра.',
  reqNoCarsHint: 'У вас пока нет машин — добавьте первую.',
  reqAbortNoText: 'Ожидался текст. Создание заявки отменено, начните заново через меню.',
```

- [ ] **Step 2: Insert into the `hy` dict (immediately before its `adminNewService:` line) EXACTLY these keys:**

```ts
  reqPickCar: 'Ընտրեք մեքենան կամ ավելացրեք նորը՝',
  reqAddCar: '➕ Ավելացնել մեքենա',
  reqCarMake: 'Մեքենայի մակնիշը՞ Ընտրեք կամ սեղմեք «Այլ»։',
  reqCarMakeOther: 'Մուտքագրեք մեքենայի մակնիշը՝',
  reqCarModel: 'Մոդելը՞',
  reqCarYear: 'Թողարկման տարին՞ (օրինակ՝ 2015)',
  reqCarYearBad: 'Մուտքագրեք տարին թվով՝ 1950-ից մինչև հաջորդ տարի։',
  reqCarPlate: 'Պետհամարանիշը՞ (կամ ուղարկեք «-» բաց թողնելու համար)',
  reqCarSaved: '🚗 Մեքենան ավելացվեց։',
  reqServiceType: 'Ի՞նչ ծառայություն է պետք։',
  reqDescription: 'Նկարագրեք խնդիրը տեքստով՝',
  reqPhotos: 'Ուղարկեք 1–5 լուսանկար կամ սեղմեք «Բաց թողնել»։',
  reqPhotosSkip: 'Բաց թողնել',
  reqPhotosDone: 'Պատրաստ է',
  reqPhotosMore: 'Լուսանկարն ավելացվեց ({n}/5)։ Ավելին կամ «Պատրաստ է»։',
  reqVoice: 'Կարող եք ավելացնել ձայնային հաղորդագրություն նկարագրությամբ — ուղարկեք այն կամ սեղմեք «Բաց թողնել»։',
  reqVoiceSkip: 'Բաց թողնել',
  reqDistrict: 'Երևանի ո՞ր վարչական շրջանում եք գտնվում։',
  reqUrgency: 'Որքանո՞վ է շտապ։',
  reqDrivable: 'Մեքենան ընթացքի մե՞ջ է։',
  reqDrivableYes: '✅ Ընթացքի մեջ է',
  reqDrivableNo: '🛑 Ընթացքի մեջ չէ',
  reqConfirm: 'Ստեղծե՞լ հայտը։\n\n🚗 {car}\n🔧 {service}\n📍 {district}\n⏱ {urgency}\n📝 {description}',
  reqConfirmYes: '✅ Ստեղծել',
  reqConfirmNo: '❌ Չեղարկել',
  reqCreated: '✅ Հայտը ստեղծվեց։ Ավտոսերվիսները շուտով կստանան այն և կուղարկեն առաջարկներ — հետևեք Mini App-ում։',
  reqCancelled: 'Հայտի ստեղծումը չեղարկվեց։',
  reqRateLimited: 'Այսօրվա հայտերի սահմանաչափը սպառված է (10/օր)։ Փորձեք վաղը։',
  reqNoCarsHint: 'Դեռ մեքենա չունեք — ավելացրեք առաջինը։',
  reqAbortNoText: 'Սպասվում էր տեքստ։ Հայտի ստեղծումը չեղարկվեց, սկսեք նորից մենյուից։',
```

- [ ] **Step 3: Typecheck + non-ASCII sanity**

Run: `pnpm --filter server exec tsc --noEmit && grep -c 'reqPickCar\|reqConfirm\|reqCreated' apps/server/src/bot/i18n.ts`
Expected: tsc exit 0; grep prints `6` (3 keys × ru+hy). Visually confirm no `?`/mojibake near the new Armenian lines.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/bot/i18n.ts
git commit -m "$(cat <<'EOF'
feat(bot): RU/HY i18n for the create-request wizard

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Keyboards — request-wizard inline keyboards

**Files:**
- Modify: `apps/server/src/bot/keyboards.ts`

Append these builders to the end of `apps/server/src/bot/keyboards.ts`. They reuse the existing `Language`, `SERVICE_TYPES`, `URGENCIES`, `CAR_MAKES`, `localizedLabel`, `t` already imported in that file (verify the import line at the top already includes `URGENCIES`; if not, add it — Step 1a).

- [ ] **Step 1a: Ensure the shared import in `apps/server/src/bot/keyboards.ts` includes `URGENCIES` and `CAR_MAKES`**

The current top import is:
```ts
import { SERVICE_TYPES, DISTRICTS, localizedLabel } from '@jobbarm/shared'
```
Replace it with EXACTLY:
```ts
import { SERVICE_TYPES, DISTRICTS, URGENCIES, CAR_MAKES, localizedLabel } from '@jobbarm/shared'
```

- [ ] **Step 1b: Append to the end of `apps/server/src/bot/keyboards.ts` EXACTLY:**

```ts
// Single-select service type for a request (one tap → spec:<key>).
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
```

- [ ] **Step 2: Typecheck server**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/bot/keyboards.ts
git commit -m "$(cat <<'EOF'
feat(bot): request-wizard keyboards (service/urgency/drivable/confirm/cars/makes)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: conversations/createRequest.ts (request wizard)

**Files:**
- Create: `apps/server/src/bot/conversations/createRequest.ts`

Mirrors `registerService.ts` conventions exactly: all side effects (DB reads/writes, rate-limit) in `conversation.external`; `askText` aborts on non-text; callback acked before any DB write. NO matching/notification (Phase 3).

- [ ] **Step 1: Create `apps/server/src/bot/conversations/createRequest.ts` with EXACTLY:**

```ts
import type { BotContext, BotConversation } from '../context.js'
import { db } from '../../db.js'
import { t } from '../i18n.js'
import type { Language, ServiceType, Urgency } from '@jobbarm/shared'
import { SERVICE_TYPES, URGENCIES, DISTRICTS, localizedLabel, CURRENT_YEAR } from '@jobbarm/shared'
import {
  carsKeyboard,
  carMakeKeyboard,
  serviceTypeKeyboard,
  urgencyKeyboard,
  drivableKeyboard,
  confirmRequestKeyboard,
  districtKeyboard,
  photosKeyboard,
} from '../keyboards.js'
import { consumeDailyLimit, DAILY_REQUEST_LIMIT } from '../../lib/rateLimit.js'

export const CREATE_REQUEST = 'createRequest'

export async function createRequest(
  conversation: BotConversation,
  ctx: BotContext
): Promise<void> {
  const user = ctx.dbUser
  const lang = (user.language as Language) ?? 'ru'

  // Defense-in-depth: a user banned mid-flow must not complete creation.
  const banned = await conversation.external(async () => {
    const u = await db.user.findUnique({ where: { id: user.id }, select: { isBanned: true } })
    return u?.isBanned ?? true
  })
  if (banned) {
    await ctx.reply(t(lang, 'banned'))
    return
  }

  // Returns trimmed text, or null on a non-text message (wizard aborts).
  const askText = async (key: string): Promise<string | null> => {
    await ctx.reply(t(lang, key))
    const res = await conversation.wait()
    const text = res.message?.text
    if (!text) {
      await ctx.reply(t(lang, 'reqAbortNoText'))
      return null
    }
    return text.trim()
  }

  // ----- pick or create a car -----
  const cars = await conversation.external(() =>
    db.car.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, make: true, model: true, year: true },
    })
  )

  await ctx.reply(t(lang, cars.length ? 'reqPickCar' : 'reqNoCarsHint'), {
    reply_markup: carsKeyboard(lang, cars),
  })
  const carCb = await conversation.waitForCallbackQuery(/^rqcar:(.+)$/)
  await carCb.answerCallbackQuery()
  let carId = carCb.match![1]

  if (carId === '__add__') {
    // make (buttons incl. Other → free text)
    await ctx.reply(t(lang, 'reqCarMake'), { reply_markup: carMakeKeyboard(lang) })
    const mkCb = await conversation.waitForCallbackQuery(/^rqmk:(.+)$/)
    await mkCb.answerCallbackQuery()
    let make: string
    if (mkCb.match![1] === '__other__') {
      const typed = await askText('reqCarMakeOther')
      if (typed === null) return
      make = typed
    } else {
      make = mkCb.match![1]
    }

    const model = await askText('reqCarModel')
    if (model === null) return

    let year = 0
    for (;;) {
      const yRaw = await askText('reqCarYear')
      if (yRaw === null) return
      const y = Number.parseInt(yRaw, 10)
      if (Number.isInteger(y) && y >= 1950 && y <= CURRENT_YEAR + 1) {
        year = y
        break
      }
      await ctx.reply(t(lang, 'reqCarYearBad'))
    }

    const plateRaw = await askText('reqCarPlate')
    if (plateRaw === null) return
    const licensePlate = plateRaw === '-' ? null : plateRaw

    const created = await conversation.external(() =>
      db.car.create({
        data: { userId: user.id, make, model, year, licensePlate },
        select: { id: true },
      })
    )
    carId = created.id
    await ctx.reply(t(lang, 'reqCarSaved'))
  }

  // ----- service type (single select) -----
  await ctx.reply(t(lang, 'reqServiceType'), { reply_markup: serviceTypeKeyboard(lang) })
  const svcCb = await conversation.waitForCallbackQuery(/^rqsvc:(.+)$/)
  await svcCb.answerCallbackQuery()
  const serviceType = svcCb.match![1] as ServiceType

  // ----- description -----
  const description = await askText('reqDescription')
  if (description === null) return

  // ----- photos (0–5) -----
  const photos: string[] = []
  await ctx.reply(t(lang, 'reqPhotos'), { reply_markup: photosKeyboard(lang) })
  for (;;) {
    const upd = await conversation.wait()
    if (upd.callbackQuery?.data === 'photos:skip' || upd.callbackQuery?.data === 'photos:done') {
      await upd.answerCallbackQuery()
      break
    }
    const photo = upd.message?.photo
    if (photo && photo.length > 0) {
      photos.push(photo[photo.length - 1].file_id)
      if (photos.length >= 5) {
        await ctx.reply(t(lang, 'reqPhotosMore', { n: photos.length }))
        break
      }
      await ctx.reply(t(lang, 'reqPhotosMore', { n: photos.length }), {
        reply_markup: photosKeyboard(lang),
      })
    }
    // ignore anything else; loop until skip/done or 5 photos
  }

  // ----- optional voice -----
  let voiceFileId: string | null = null
  await ctx.reply(t(lang, 'reqVoice'), {
    reply_markup: { inline_keyboard: [[{ text: t(lang, 'reqVoiceSkip'), callback_data: 'rqvoice:skip' }]] },
  })
  for (;;) {
    const upd = await conversation.wait()
    if (upd.callbackQuery?.data === 'rqvoice:skip') {
      await upd.answerCallbackQuery()
      break
    }
    if (upd.message?.voice) {
      voiceFileId = upd.message.voice.file_id
      break
    }
    // ignore anything else; loop until a voice message or skip
  }

  // ----- district -----
  await ctx.reply(t(lang, 'reqDistrict'), { reply_markup: districtKeyboard(lang) })
  const distCb = await conversation.waitForCallbackQuery(/^dist:(.+)$/)
  await distCb.answerCallbackQuery()
  const district = distCb.match![1]

  // ----- urgency -----
  await ctx.reply(t(lang, 'reqUrgency'), { reply_markup: urgencyKeyboard(lang) })
  const urgCb = await conversation.waitForCallbackQuery(/^rqurg:(.+)$/)
  await urgCb.answerCallbackQuery()
  const urgency = urgCb.match![1] as Urgency

  // ----- drivable -----
  await ctx.reply(t(lang, 'reqDrivable'), { reply_markup: drivableKeyboard(lang) })
  const drvCb = await conversation.waitForCallbackQuery(/^rqdrv:(0|1)$/)
  await drvCb.answerCallbackQuery()
  const isDrivable = drvCb.match![1] === '1'

  // ----- confirm -----
  const carRow = cars.find((c) => c.id === carId)
  const carLabel = carRow
    ? `${carRow.make} ${carRow.model} ${carRow.year}`
    : await conversation.external(async () => {
        const c = await db.car.findUnique({
          where: { id: carId },
          select: { make: true, model: true, year: true },
        })
        return c ? `${c.make} ${c.model} ${c.year}` : '—'
      })
  const svcLabel = localizedLabel(
    SERVICE_TYPES.find((s) => s.key === serviceType)!.label,
    lang
  )
  const urgLabel = localizedLabel(URGENCIES.find((u) => u.key === urgency)!.label, lang)
  const distLabelObj = DISTRICTS.find((d) => d.key === district)?.label
  const distLabel = distLabelObj ? localizedLabel(distLabelObj, lang) : district

  await ctx.reply(
    t(lang, 'reqConfirm', {
      car: carLabel,
      service: svcLabel,
      district: distLabel,
      urgency: urgLabel,
      description,
    }),
    { reply_markup: confirmRequestKeyboard(lang) }
  )
  const okCb = await conversation.waitForCallbackQuery(/^rqok:(0|1)$/)
  await okCb.answerCallbackQuery()
  if (okCb.match![1] === '0') {
    await ctx.reply(t(lang, 'reqCancelled'))
    return
  }

  // ----- rate-limit + persist (side effects) -----
  const allowed = await conversation.external(() =>
    consumeDailyLimit('req', user.id, DAILY_REQUEST_LIMIT)
  )
  if (!allowed) {
    await ctx.reply(t(lang, 'reqRateLimited'))
    return
  }

  await conversation.external(async () => {
    await db.request.create({
      data: {
        clientId: user.id,
        carId,
        serviceType,
        description,
        voiceFileId,
        photos,
        district,
        urgency,
        isDrivable,
        // status defaults to OPEN (schema); matching/notify is Phase 3.
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })
  })

  await ctx.reply(t(lang, 'reqCreated'))
}
```

- [ ] **Step 2: Typecheck server**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/bot/conversations/createRequest.ts
git commit -m "$(cat <<'EOF'
feat(bot): create-request wizard (car pick/add, media, rate-limit, no matching)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Wire bot.ts + clientMenuKeyboard webApp buttons + trim misc stubs

**Files:**
- Modify: `apps/server/src/bot/bot.ts`
- Modify: `apps/server/src/bot/keyboards.ts`
- Modify: `apps/server/src/bot/handlers/misc.ts`

- [ ] **Step 1: Register the new conversation + entry in `apps/server/src/bot/bot.ts`**

Add the import after the `registerService` import line:
```ts
import { createRequest, CREATE_REQUEST } from './conversations/createRequest.js'
```

Add the `createConversation` registration immediately after the existing `bot.use(createConversation(registerService, REGISTER_SERVICE))` line:
```ts
bot.use(createConversation(createRequest, CREATE_REQUEST))
```

Add the entry callback immediately after the existing `menu:register_service` callback block (the `bot.callbackQuery('menu:register_service', …)` block, before `bot.use(startHandler)`):
```ts
bot.callbackQuery('menu:create_request', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.conversation.enter(CREATE_REQUEST)
})
```

- [ ] **Step 2: Make `clientMenuKeyboard` open the Mini App for requests/cars**

In `apps/server/src/bot/keyboards.ts`, the current `clientMenuKeyboard` is:
```ts
export function clientMenuKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'btnCreateRequest'), 'menu:create_request')
    .row()
    .text(t(lang, 'btnMyRequests'), 'menu:my_requests')
    .text(t(lang, 'btnMyCars'), 'menu:my_cars')
    .row()
    .text(t(lang, 'btnHelp'), 'menu:help')
}
```
Replace it with EXACTLY (adds a `config` import usage — see Step 2a):
```ts
export function clientMenuKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'btnCreateRequest'), 'menu:create_request')
    .row()
    .webApp(t(lang, 'btnMyRequests'), `${config.MINI_APP_URL}/requests`)
    .webApp(t(lang, 'btnMyCars'), `${config.MINI_APP_URL}/cars`)
    .row()
    .text(t(lang, 'btnHelp'), 'menu:help')
}
```

- [ ] **Step 2a: Add the `config` import to `apps/server/src/bot/keyboards.ts`**

The current top imports are:
```ts
import { InlineKeyboard } from 'grammy'
import type { Language } from '@jobbarm/shared'
import { SERVICE_TYPES, DISTRICTS, URGENCIES, CAR_MAKES, localizedLabel } from '@jobbarm/shared'
import { t } from './i18n.js'
```
Add this line directly after the `import { t } from './i18n.js'` line:
```ts
import { config } from '../config.js'
```

- [ ] **Step 3: Trim the "coming soon" stub regex in `apps/server/src/bot/handlers/misc.ts`**

The current stub handler regex is:
```ts
  /^menu:(create_request|my_requests|my_cars|available_requests|my_offers|active_jobs|profile)$/,
```
Replace that single line with EXACTLY (drops the three Phase-2 destinations now handled elsewhere — `create_request` → wizard via bot.ts; `my_requests`/`my_cars` → webApp buttons, no callback):
```ts
  /^menu:(available_requests|my_offers|active_jobs|profile)$/,
```

- [ ] **Step 4: Typecheck + build everything**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter server exec tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/bot/bot.ts apps/server/src/bot/keyboards.ts apps/server/src/bot/handlers/misc.ts
git commit -m "$(cat <<'EOF'
feat(bot): wire create-request wizard + Mini App webApp menu buttons

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Web — API methods + i18n strings

**Files:**
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/lib/i18n.ts`

- [ ] **Step 1: Append to `apps/web/src/lib/api.ts` (after the existing `fileUrl` export) EXACTLY:**

```ts

import type { Car, CarInput, RequestSummary, RequestDetail } from '@jobbarm/shared'

export const getCars = () => client.get<Car[]>('/cars').then((r) => r.data)

export const createCar = (data: CarInput) =>
  client.post<Car>('/cars', data).then((r) => r.data)

export const updateCar = (id: string, data: CarInput) =>
  client.put<Car>(`/cars/${id}`, data).then((r) => r.data)

export const deleteCar = (id: string) =>
  client.delete<void>(`/cars/${id}`).then((r) => r.data)

export const getRequests = () =>
  client.get<RequestSummary[]>('/requests').then((r) => r.data)

export const getRequest = (id: string) =>
  client.get<RequestDetail>(`/requests/${id}`).then((r) => r.data)
```

- [ ] **Step 2: Add Phase-2 UI strings to `apps/web/src/lib/i18n.ts`**

In the `ru` object, add these sections as siblings of `app`/`errors` (insert before the closing `}` of `const ru = { … }`):

```ts
  nav: { requests: 'Заявки', garage: 'Гараж', profile: 'Профиль' },
  requests: {
    title: 'Мои заявки',
    empty: 'Заявок пока нет. Создайте заявку через бота.',
    photos: '📷 {n} фото',
    voice: '🎤 голосовое',
    car: 'Машина',
    district: 'Район',
    urgency: 'Срочность',
    status: 'Статус',
    drivable: 'На ходу',
    notDrivable: 'Не на ходу',
    description: 'Описание',
    created: 'Создана',
    back: '← Назад',
    notFound: 'Заявка не найдена',
  },
  garage: {
    title: 'Гараж',
    empty: 'В гараже пока нет машин.',
    add: 'Добавить машину',
    edit: 'Изменить',
    delete: 'Удалить',
    save: 'Сохранить',
    cancel: 'Отмена',
    make: 'Марка',
    model: 'Модель',
    year: 'Год',
    bodyType: 'Кузов',
    color: 'Цвет',
    plate: 'Гос. номер',
    optional: 'необязательно',
    confirmDelete: 'Удалить эту машину?',
    inUse: 'Нельзя удалить: машина используется в заявке.',
    saved: 'Сохранено',
    deleted: 'Удалено',
  },
  profile: {
    title: 'Профиль',
    phone: 'Телефон',
    language: 'Язык',
    ru: 'Русский',
    hy: 'Армянский',
    save: 'Сохранить',
    saved: 'Сохранено',
  },
```

In the `hy` object, add the mirrored sections (same keys, Armenian values — copy verbatim):

```ts
  nav: { requests: 'Հայտեր', garage: 'Ավտոտնակ', profile: 'Պրոֆիլ' },
  requests: {
    title: 'Իմ հայտերը',
    empty: 'Հայտեր դեռ չկան։ Ստեղծեք հայտ բոտի միջոցով։',
    photos: '📷 {n} լուսանկար',
    voice: '🎤 ձայնային',
    car: 'Մեքենա',
    district: 'Շրջան',
    urgency: 'Հրատապություն',
    status: 'Կարգավիճակ',
    drivable: 'Ընթացքի մեջ է',
    notDrivable: 'Ընթացքի մեջ չէ',
    description: 'Նկարագրություն',
    created: 'Ստեղծված',
    back: '← Հետ',
    notFound: 'Հայտը չի գտնվել',
  },
  garage: {
    title: 'Ավտոտնակ',
    empty: 'Ավտոտնակում դեռ մեքենա չկա։',
    add: 'Ավելացնել մեքենա',
    edit: 'Փոփոխել',
    delete: 'Ջնջել',
    save: 'Պահպանել',
    cancel: 'Չեղարկել',
    make: 'Մակնիշ',
    model: 'Մոդել',
    year: 'Տարի',
    bodyType: 'Թափք',
    color: 'Գույն',
    plate: 'Պետհամարանիշ',
    optional: 'ոչ պարտադիր',
    confirmDelete: 'Ջնջե՞լ այս մեքենան։',
    inUse: 'Հնարավոր չէ ջնջել՝ մեքենան օգտագործվում է հայտում։',
    saved: 'Պահպանվեց',
    deleted: 'Ջնջվեց',
  },
  profile: {
    title: 'Պրոֆիլ',
    phone: 'Հեռախոս',
    language: 'Լեզու',
    ru: 'Ռուսերեն',
    hy: 'Հայերեն',
    save: 'Պահպանել',
    saved: 'Պահպանվեց',
  },
```

- [ ] **Step 3: Typecheck web**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter web exec tsc --noEmit`
Expected: exit 0, no output. (`Strings = typeof ru` forces `hy` to match — if keys mismatch, tsc fails; fix the mismatch.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/lib/i18n.ts
git commit -m "$(cat <<'EOF'
feat(web): cars/requests API client + RU/HY Phase-2 strings

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Web — Layout + BottomNav + Router

**Files:**
- Create: `apps/web/src/components/Layout.tsx`
- Create: `apps/web/src/components/BottomNav.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Create `apps/web/src/components/BottomNav.tsx` with EXACTLY:**

```tsx
import { NavLink } from 'react-router-dom'
import { useT } from '@/lib/i18n'

const tabs = [
  { to: '/requests', icon: '📋', key: 'requests' as const },
  { to: '/cars', icon: '🚗', key: 'garage' as const },
  { to: '/profile', icon: '⚙️', key: 'profile' as const },
]

export function BottomNav() {
  const t = useT()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-secondary bg-background"
      style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs ${
              isActive ? 'text-primary' : 'text-muted'
            }`
          }
        >
          <span className="text-xl">{tab.icon}</span>
          <span>{t.nav[tab.key]}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Create `apps/web/src/components/Layout.tsx` with EXACTLY:**

```tsx
import type { ReactNode } from 'react'
import { Toast } from '@/components/Toast'
import { BottomNav } from '@/components/BottomNav'

export function Layout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Toast />
      <div
        className="min-h-screen bg-background text-foreground"
        style={{ paddingBottom: 'calc(var(--safe-bottom, 0px) + 4rem)' }}
      >
        <header
          className="sticky top-0 z-10 bg-background border-b border-secondary px-4 py-3"
          style={{ paddingTop: 'var(--header-top, 12px)' }}
        >
          <h1 className="text-lg font-bold">{title}</h1>
        </header>
        <main className="p-4">{children}</main>
      </div>
      <BottomNav />
    </>
  )
}
```

- [ ] **Step 3: Replace `apps/web/src/App.tsx` with EXACTLY (auth gate preserved; routes added):**

```tsx
import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useT } from '@/lib/i18n'
import { postTelegramAuth, getMe } from '@/lib/api'
import { Toast } from '@/components/Toast'
import RequestsPage from '@/pages/RequestsPage'
import RequestDetailPage from '@/pages/RequestDetailPage'
import CarsPage from '@/pages/CarsPage'
import ProfilePage from '@/pages/ProfilePage'

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
        <Toast />
        <p className="text-muted">{t.app.openInTelegram}</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/requests" replace />} />
      <Route path="/requests" element={<RequestsPage />} />
      <Route path="/requests/:id" element={<RequestDetailPage />} />
      <Route path="/cars" element={<CarsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/requests" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 4: Typecheck web (EXPECTED TO FAIL until Tasks 11–13 create the pages)**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: FAIL with "Cannot find module '@/pages/RequestsPage'" (and the other three). This is expected — the four page modules are created in Tasks 11–13. Do NOT create stubs; proceed to commit (the build gate is satisfied at Task 14 once all pages exist). Commit the shell now so the work is atomic per-file.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/Layout.tsx apps/web/src/components/BottomNav.tsx apps/web/src/App.tsx
git commit -m "$(cat <<'EOF'
feat(web): Layout + BottomNav + React Router shell (pages follow)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

> NOTE for the executor/reviewers: Tasks 10–13 form one shippable unit; the web typecheck gate is only expected green at the END of Task 13. Task 10's spec-compliance review should verify the shell content is exact and that the only tsc errors are the four missing-page imports. Do not block Task 10 on the expected missing-module errors.

---

## Task 11: Web — CarsPage (garage CRUD)

**Files:**
- Create: `apps/web/src/pages/CarsPage.tsx`

- [ ] **Step 1: Create `apps/web/src/pages/CarsPage.tsx` with EXACTLY:**

```tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Car, CarInput } from '@jobbarm/shared'
import { CAR_MAKES } from '@jobbarm/shared'
import { getCars, createCar, updateCar, deleteCar } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { useToast } from '@/components/Toast'
import { Layout } from '@/components/Layout'

type Draft = { id: string | null; make: string; model: string; year: string; bodyType: string; color: string; licensePlate: string }

const emptyDraft: Draft = { id: null, make: CAR_MAKES[0], model: '', year: '', bodyType: '', color: '', licensePlate: '' }

export default function CarsPage() {
  const t = useT()
  const qc = useQueryClient()
  const { show } = useToast()
  const [draft, setDraft] = useState<Draft | null>(null)

  const { data: cars, isLoading, error } = useQuery({ queryKey: ['cars'], queryFn: getCars })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cars'] })

  const saveMut = useMutation({
    mutationFn: (d: Draft) => {
      const payload: CarInput = {
        make: d.make.trim(),
        model: d.model.trim(),
        year: Number(d.year),
        bodyType: d.bodyType.trim() || null,
        color: d.color.trim() || null,
        licensePlate: d.licensePlate.trim() || null,
      }
      return d.id ? updateCar(d.id, payload) : createCar(payload)
    },
    onSuccess: () => {
      invalidate()
      setDraft(null)
      show(t.garage.saved, 'success')
    },
    onError: () => show(t.errors.generic, 'error'),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCar(id),
    onSuccess: () => {
      invalidate()
      show(t.garage.deleted, 'success')
    },
    onError: (e: unknown) => {
      const status = (e as { response?: { status?: number } })?.response?.status
      show(status === 409 ? t.garage.inUse : t.errors.generic, 'error')
    },
  })

  const startEdit = (c: Car) =>
    setDraft({
      id: c.id,
      make: c.make,
      model: c.model,
      year: String(c.year),
      bodyType: c.bodyType ?? '',
      color: c.color ?? '',
      licensePlate: c.licensePlate ?? '',
    })

  const field = (label: string, value: string, onChange: (v: string) => void, opt = false) => (
    <label className="block mb-3">
      <span className="text-sm text-muted">
        {label}
        {opt ? ` (${t.garage.optional})` : ''}
      </span>
      <input
        className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )

  return (
    <Layout title={t.garage.title}>
      {isLoading && <p className="text-muted">…</p>}
      {error && <p className="text-rose-500">{t.errors.generic}</p>}

      {!draft && (
        <>
          {cars && cars.length === 0 && <p className="text-muted mb-4">{t.garage.empty}</p>}
          <div className="flex flex-col gap-2">
            {cars?.map((c) => (
              <div key={c.id} className="rounded-lg bg-secondary p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">
                    {c.make} {c.model} {c.year}
                  </div>
                  <div className="text-sm text-muted">
                    {[c.bodyType, c.color, c.licensePlate].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <button className="text-primary" onClick={() => startEdit(c)}>
                    {t.garage.edit}
                  </button>
                  <button
                    className="text-rose-500"
                    onClick={() => {
                      if (window.confirm(t.garage.confirmDelete)) delMut.mutate(c.id)
                    }}
                  >
                    {t.garage.delete}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="mt-4 w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold"
            onClick={() => setDraft({ ...emptyDraft })}
          >
            {t.garage.add}
          </button>
        </>
      )}

      {draft && (
        <div>
          <label className="block mb-3">
            <span className="text-sm text-muted">{t.garage.make}</span>
            <select
              className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 outline-none"
              value={draft.make}
              onChange={(e) => setDraft({ ...draft, make: e.target.value })}
            >
              {CAR_MAKES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          {field(t.garage.model, draft.model, (v) => setDraft({ ...draft, model: v }))}
          {field(t.garage.year, draft.year, (v) => setDraft({ ...draft, year: v }))}
          {field(t.garage.bodyType, draft.bodyType, (v) => setDraft({ ...draft, bodyType: v }), true)}
          {field(t.garage.color, draft.color, (v) => setDraft({ ...draft, color: v }), true)}
          {field(t.garage.plate, draft.licensePlate, (v) => setDraft({ ...draft, licensePlate: v }), true)}
          <div className="flex gap-2 mt-2">
            <button
              className="flex-1 rounded-lg bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50"
              disabled={saveMut.isPending || !draft.make.trim() || !draft.model.trim() || !draft.year.trim()}
              onClick={() => saveMut.mutate(draft)}
            >
              {t.garage.save}
            </button>
            <button
              className="flex-1 rounded-lg bg-secondary py-3"
              onClick={() => setDraft(null)}
            >
              {t.garage.cancel}
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
```

- [ ] **Step 2: Typecheck web**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter web exec tsc --noEmit`
Expected: still FAILS, but ONLY with the 3 remaining missing-page imports (`RequestsPage`, `RequestDetailPage`, `ProfilePage`). `CarsPage` must NOT appear in the errors. If `CarsPage` has its own type error, fix it.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/CarsPage.tsx
git commit -m "$(cat <<'EOF'
feat(web): Garage page — list + add/edit/delete with in-use guard

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Web — RequestsPage + RequestDetailPage

**Files:**
- Create: `apps/web/src/pages/RequestsPage.tsx`
- Create: `apps/web/src/pages/RequestDetailPage.tsx`

- [ ] **Step 1: Create `apps/web/src/pages/RequestsPage.tsx` with EXACTLY:**

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { SERVICE_TYPES, REQUEST_STATUS_LABELS, localizedLabel } from '@jobbarm/shared'
import { getRequests } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { useStore } from '@/store'
import { Layout } from '@/components/Layout'

export default function RequestsPage() {
  const t = useT()
  const lang = useStore((s) => s.language)
  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['requests'],
    queryFn: getRequests,
  })

  return (
    <Layout title={t.requests.title}>
      {isLoading && <p className="text-muted">…</p>}
      {error && <p className="text-rose-500">{t.errors.generic}</p>}
      {requests && requests.length === 0 && <p className="text-muted">{t.requests.empty}</p>}
      <div className="flex flex-col gap-2">
        {requests?.map((r) => {
          const svc = SERVICE_TYPES.find((s) => s.key === r.serviceType)
          return (
            <Link
              key={r.id}
              to={`/requests/${r.id}`}
              className="rounded-lg bg-secondary p-3 block"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {svc ? localizedLabel(svc.label, lang) : r.serviceType}
                </span>
                <span className="text-xs text-muted">
                  {localizedLabel(REQUEST_STATUS_LABELS[r.status], lang)}
                </span>
              </div>
              <div className="text-sm text-muted mt-1">
                {r.car.make} {r.car.model} {r.car.year}
              </div>
              <div className="text-sm mt-1 line-clamp-2">{r.description}</div>
              <div className="text-xs text-muted mt-1 flex gap-3">
                {r.photosCount > 0 && <span>{t.requests.photos.replace('{n}', String(r.photosCount))}</span>}
                {r.hasVoice && <span>{t.requests.voice}</span>}
              </div>
            </Link>
          )
        })}
      </div>
    </Layout>
  )
}
```

- [ ] **Step 2: Create `apps/web/src/pages/RequestDetailPage.tsx` with EXACTLY:**

```tsx
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  SERVICE_TYPES,
  URGENCIES,
  DISTRICTS,
  REQUEST_STATUS_LABELS,
  localizedLabel,
} from '@jobbarm/shared'
import { getRequest } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { useStore } from '@/store'
import { Layout } from '@/components/Layout'

export default function RequestDetailPage() {
  const t = useT()
  const lang = useStore((s) => s.language)
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: r, isLoading, error } = useQuery({
    queryKey: ['request', id],
    queryFn: () => getRequest(id as string),
    enabled: !!id,
  })

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-2 border-b border-secondary">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )

  return (
    <Layout title={t.requests.title}>
      <button className="text-primary text-sm mb-3" onClick={() => navigate('/requests')}>
        {t.requests.back}
      </button>
      {isLoading && <p className="text-muted">…</p>}
      {error && <p className="text-rose-500">{t.requests.notFound}</p>}
      {r && (
        <div>
          {(() => {
            const svc = SERVICE_TYPES.find((s) => s.key === r.serviceType)
            const urg = URGENCIES.find((u) => u.key === r.urgency)
            const dist = DISTRICTS.find((d) => d.key === r.district)
            return (
              <>
                <Row label={t.requests.status} value={localizedLabel(REQUEST_STATUS_LABELS[r.status], lang)} />
                <Row label={t.requests.car} value={`${r.car.make} ${r.car.model} ${r.car.year}`} />
                <Row
                  label={t.requests.urgency}
                  value={urg ? localizedLabel(urg.label, lang) : r.urgency}
                />
                <Row
                  label={t.requests.district}
                  value={dist ? localizedLabel(dist.label, lang) : r.district}
                />
                <Row
                  label={t.requests.drivable}
                  value={r.isDrivable ? t.requests.drivable : t.requests.notDrivable}
                />
                <div className="py-3">
                  <div className="text-muted text-sm mb-1">{t.requests.description}</div>
                  <div className="whitespace-pre-wrap">{r.description}</div>
                </div>
                <div className="text-sm text-muted flex gap-3">
                  {r.photos.length > 0 && (
                    <span>{t.requests.photos.replace('{n}', String(r.photos.length))}</span>
                  )}
                  {r.voiceFileId && <span>{t.requests.voice}</span>}
                </div>
                {svc && (
                  <div className="mt-2 text-sm text-muted">
                    {localizedLabel(svc.label, lang)}
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}
    </Layout>
  )
}
```

- [ ] **Step 3: Typecheck web**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter web exec tsc --noEmit`
Expected: still FAILS, but ONLY with the 1 remaining missing-page import (`ProfilePage`). The two request pages must NOT appear in the errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/RequestsPage.tsx apps/web/src/pages/RequestDetailPage.tsx
git commit -m "$(cat <<'EOF'
feat(web): My Requests list + Request detail (read-only, media badges)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Web — ProfilePage

**Files:**
- Create: `apps/web/src/pages/ProfilePage.tsx`

- [ ] **Step 1: Create `apps/web/src/pages/ProfilePage.tsx` with EXACTLY:**

```tsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Language } from '@jobbarm/shared'
import { getMe, putMe } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { useStore } from '@/store'
import { useToast } from '@/components/Toast'
import { Layout } from '@/components/Layout'

export default function ProfilePage() {
  const t = useT()
  const qc = useQueryClient()
  const { show } = useToast()
  const setLanguage = useStore((s) => s.setLanguage)
  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: getMe })

  const [phone, setPhone] = useState('')
  const [language, setLang] = useState<Language>('ru')

  useEffect(() => {
    if (me) {
      setPhone(me.phoneNumber ?? '')
      setLang(me.language)
    }
  }, [me])

  const saveMut = useMutation({
    mutationFn: () => putMe({ phoneNumber: phone.trim() || undefined, language }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['me'] })
      setLanguage(updated.language)
      show(t.profile.saved, 'success')
    },
    onError: () => show(t.errors.generic, 'error'),
  })

  return (
    <Layout title={t.profile.title}>
      {isLoading && <p className="text-muted">…</p>}
      <label className="block mb-3">
        <span className="text-sm text-muted">{t.profile.phone}</span>
        <input
          className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 outline-none"
          value={phone}
          inputMode="tel"
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <label className="block mb-4">
        <span className="text-sm text-muted">{t.profile.language}</span>
        <select
          className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 outline-none"
          value={language}
          onChange={(e) => setLang(e.target.value as Language)}
        >
          <option value="ru">{t.profile.ru}</option>
          <option value="hy">{t.profile.hy}</option>
        </select>
      </label>
      <button
        className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50"
        disabled={saveMut.isPending}
        onClick={() => saveMut.mutate()}
      >
        {t.profile.save}
      </button>
    </Layout>
  )
}
```

- [ ] **Step 2: Typecheck web (now GREEN — all four pages exist)**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter web exec tsc --noEmit`
Expected: exit 0, no output. All `@/pages/*` imports in `App.tsx` resolve.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/ProfilePage.tsx
git commit -m "$(cat <<'EOF'
feat(web): Profile page (phone + language) — web typecheck green

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Final verification + manual checklist

**Files:** none modified (verification only).

- [ ] **Step 1: Full typecheck + build chain**

Run: `pnpm --filter @jobbarm/shared build && pnpm --filter server exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter web build`
Expected: all exit 0; web vite prints `✓ built in …`. No type errors.

- [ ] **Step 2: Boot the server (regression — must still serve /health)**

Run:
```bash
pnpm --filter server dev &
SERVER_PID=$!
sleep 6
curl -s localhost:3000/health
echo
kill $SERVER_PID 2>/dev/null
```
Expected: `{"ok":true}`. With a placeholder `BOT_TOKEN` a `Bot failed to start` warning is acceptable. If `sleep` is blocked, start dev with `run_in_background: true`, poll the log for `Server listening`, curl, then kill.

- [ ] **Step 3: Commit (verification marker, only if any incidental fix was needed; otherwise skip)**

If Steps 1–2 required a fix, commit it:
```bash
git add -A
git commit -m "$(cat <<'EOF'
fix(phase2): final verification fixes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
If no fix was needed, skip (nothing to commit).

- [ ] **Step 4: Manual test checklist (requires a real BOT_TOKEN + DB + Redis; document-only, not the automated gate)**

1. Client `/start` → client menu. Tap `🚗 Создать заявку` → wizard starts.
2. No cars yet → "add car" button only → add car: pick make (or Other→type) → model → year (bad year re-prompts) → plate (`-` skips) → "Машина добавлена".
3. Wizard continues: service type (1 tap) → description (text) → photos (send 1–2 then "Готово", or "Пропустить") → voice (send a voice msg or "Пропустить") → district → urgency → drivable → confirm summary → "✅ Создать" → "Заявка создана!".
4. `/cancel` mid-wizard at a button step → "Создание заявки отменено" (text-step `/cancel` caveat per Phase-1 docs).
5. Create 11 requests in a day → 11th → "Лимит заявок на сегодня исчерпан".
6. Bot client menu: tap `📋 Мои заявки` / `🚙 Мои машины` → Mini App opens at `/requests` / `/cars`.
7. Mini App: Garage tab → list shows the car; add/edit/delete; deleting a car used by a request → "Нельзя удалить: машина используется".
8. Requests tab → list shows the created request with status/photos badge; tap → detail shows fields, `📷 N фото`/`🎤 голосовое` badges (no media render — Phase 4).
9. Profile tab → change phone + language → "Сохранено"; bottom-nav labels switch RU/HY.
10. DB check: `Request` row has `status=OPEN`, `expiresAt ≈ now+24h`, correct `carId`/`serviceType`/`photos[]`/`voiceFileId`.

---

## Done criteria (Phase 2)

- `pnpm --filter @jobbarm/shared build` + `server tsc --noEmit` + `web tsc --noEmit` + `pnpm --filter web build` all green.
- Server boots; `GET /health` → `{"ok":true}`.
- `GET/POST/PUT/DELETE /api/cars` owner-scoped; car-in-use delete → 409. `GET /api/requests`, `GET /api/requests/:id` owner-scoped, read-only.
- Bot `🚗 Создать заявку` runs the full wizard (car pick/add → service → description → photos → voice → district → urgency → drivable → confirm), enforces ≤10/day, creates `Request(OPEN, expiresAt=now+24h)`, NO matching/notification.
- Mini App: React-Router shell + BottomNav; Garage CRUD; My Requests list + Detail (media badges only); Profile (phone/language); RU + HY.
- One commit per task; `git status` clean; on `main`.

## Self-Review

**Spec coverage (design §15 row "2. Клиент" + §7 wizard + §8 API + §9 screens + §13 rate-limit):**
- Гараж CRUD (Mini App) → Tasks 1,3,9,11 (`/api/cars` + CarsPage). ✓
- Визард создания заявки (фото/голос) → Tasks 5,6,7,8 (createRequest conversation + keyboards + i18n + wiring). ✓
- «Мои заявки» + «Детали заявки» (Mini App) → Tasks 1,4,9,10,12 (`/api/requests` + pages). ✓
- rate-limit заявок (≤10/день) → Tasks 2,7 (consumeDailyLimit in wizard). ✓
- Phase boundary: matching/notify = Phase 3 (wizard has none); media proxy = Phase 4 (badges only); offers/select/cancel = Phase 4 (read-only). Documented in header. ✓
- Profile (телефон, язык) §9 → Task 13 (reuses Phase-1 `PUT /api/me`). ✓

**Placeholder scan:** No TBD/"handle appropriately"; every code step is complete verbatim code; every command has an expected result. Task 10 explicitly documents the EXPECTED transient tsc failure (missing pages) and how Tasks 11–13 resolve it — this is a sequencing note, not a placeholder.

**Type consistency:** `carInputSchema`/`CarInput`/`Car`/`RequestSummary`/`RequestDetail`/`CURRENT_YEAR` defined Task 1, consumed by routes (Tasks 3,4), web api (Task 9), pages (Tasks 11,12). `consumeDailyLimit(scope,id,limit)`/`DAILY_REQUEST_LIMIT` defined Task 2, used Task 7. Keyboards (`serviceTypeKeyboard`,`urgencyKeyboard`,`drivableKeyboard`,`confirmRequestKeyboard`,`carsKeyboard`,`carMakeKeyboard`) defined Task 6, consumed Task 7 with matching callback-data namespaces (`rqcar:`,`rqmk:`,`rqsvc:`,`rqurg:`,`rqdrv:`,`rqok:`,`rqvoice:`, reused `dist:`/`photos:`). `CREATE_REQUEST`/`createRequest` defined Task 7, wired Task 8. i18n keys added Task 5 are exactly those `t(lang,'req…')` referenced in Tasks 6,7. Web i18n keys added Task 9 (`nav`/`requests`/`garage`/`profile`) are exactly those `t.…` referenced in Tasks 10–13; `Strings = typeof ru` enforces ru/hy parity at compile time. API method names (`getCars`/`createCar`/`updateCar`/`deleteCar`/`getRequests`/`getRequest`) defined Task 9, consumed Tasks 11,12. Routes registered in `app.ts` Tasks 3,4 match the api client paths Task 9.
