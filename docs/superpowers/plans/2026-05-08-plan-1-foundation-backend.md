# JobArm — Plan 1: Foundation + Backend API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the monorepo, Docker dev environment, PostgreSQL schema with Prisma, and a fully working Fastify REST API with JWT auth via Telegram WebApp data.

**Architecture:** pnpm monorepo with `/apps/server` (Fastify + Prisma + Telegraf notifications service) and `/packages/shared` (TypeScript types). Docker Compose runs postgres + redis + api. Auth is Telegram WebApp `initData` validation → JWT.

**Tech Stack:** Node.js 20, TypeScript, Fastify, Prisma, PostgreSQL 16, Redis, pnpm workspaces, Docker Compose, Vitest

---

## File Map

```
/
├── package.json                        # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── docker-compose.yml
├── .env.example
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts                # shared TS types
└── apps/
    └── server/
        ├── package.json
        ├── tsconfig.json
        ├── prisma/
        │   └── schema.prisma           # DB schema
        ├── src/
        │   ├── main.ts                 # entry point
        │   ├── app.ts                  # Fastify app factory
        │   ├── config.ts               # env config (zod)
        │   ├── db.ts                   # Prisma client singleton
        │   ├── redis.ts                # Redis client singleton
        │   ├── plugins/
        │   │   ├── auth.ts             # JWT plugin + TG initData validation
        │   │   └── error-handler.ts    # global error handler
        │   └── routes/
        │       ├── auth.ts             # POST /api/auth/telegram
        │       ├── users.ts            # GET/PUT /api/me, POST /api/me/master
        │       ├── categories.ts       # GET /api/categories
        │       ├── jobs.ts             # CRUD jobs
        │       ├── applications.ts     # apply, select, complete
        │       ├── reviews.ts          # POST /api/jobs/:id/review
        │       └── masters.ts          # GET /api/masters, GET /api/masters/:id
        └── tests/
            ├── setup.ts
            ├── auth.test.ts
            ├── jobs.test.ts
            ├── applications.test.ts
            └── masters.test.ts
```

---

## Task 1: Monorepo & Docker setup

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "jobbarm",
  "private": true,
  "version": "0.0.1",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev:server": "pnpm --filter server dev",
    "test": "pnpm --filter server test"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 4: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: jobbarm
      POSTGRES_PASSWORD: jobbarm
      POSTGRES_DB: jobbarm
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U jobbarm -d jobbarm"]
      interval: 3s
      timeout: 3s
      retries: 20

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 3s
      retries: 20

  api:
    build:
      context: ./apps/server
      dockerfile: Dockerfile.dev
    volumes:
      - ./apps/server:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file: .env
    environment:
      DATABASE_URL: postgresql://jobbarm:jobbarm@postgres:5432/jobbarm
      REDIS_URL: redis://redis:6379/0

volumes:
  pg_data:
```

- [ ] **Step 5: Create .env.example**

```env
DATABASE_URL=postgresql://jobbarm:jobbarm@localhost:5432/jobbarm
REDIS_URL=redis://localhost:6379/0
BOT_TOKEN=your_bot_token_here
JWT_SECRET=change_me_in_production
WEBHOOK_SECRET=change_me_in_production
PORT=3000
```

- [ ] **Step 6: Create packages/shared/package.json**

```json
{
  "name": "@jobbarm/shared",
  "version": "0.0.1",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 7: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 8: Create packages/shared/src/index.ts**

```typescript
export type Language = 'ru' | 'en'

export type JobStatus = 'new' | 'in_progress' | 'pending_confirmation' | 'completed'

export interface Category {
  id: string
  nameRu: string
  nameEn: string
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
```

- [ ] **Step 9: Create apps/server/package.json**

```json
{
  "name": "server",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@jobbarm/shared": "workspace:*",
    "@prisma/client": "^5.13.0",
    "fastify": "^4.27.0",
    "@fastify/jwt": "^8.0.1",
    "@fastify/cors": "^9.0.1",
    "ioredis": "^5.3.2",
    "zod": "^3.23.0",
    "crypto-js": "^4.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "prisma": "^5.13.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0",
    "vitest": "^1.5.0",
    "@vitest/coverage-v8": "^1.5.0"
  }
}
```

- [ ] **Step 10: Create apps/server/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["src", "tests", "prisma"]
}
```

- [ ] **Step 11: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 12: Commit**

```bash
git init
echo "node_modules\ndist\n.env\n.superpowers" > .gitignore
git add .
git commit -m "feat: monorepo scaffold with Docker Compose"
```

---

## Task 2: Prisma schema + migrations

**Files:**
- Create: `apps/server/prisma/schema.prisma`
- Create: `apps/server/prisma/seed.ts`

- [ ] **Step 1: Create prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id         String   @id @default(uuid())
  telegramId String   @unique @map("telegram_id")
  name       String
  phone      String
  language   String   @default("ru")
  isMaster   Boolean  @default(false) @map("is_master")
  isCustomer Boolean  @default(true) @map("is_customer")
  createdAt  DateTime @default(now()) @map("created_at")

  categories        UserCategory[]
  jobsAsCustomer    Job[]         @relation("CustomerJobs")
  applications      Application[]
  selectedInJobs    Job[]         @relation("SelectedMaster")
  reviewsReceived   Review[]      @relation("MasterReviews")
  reviewsGiven      Review[]      @relation("CustomerReviews")

  @@map("users")
}

model Category {
  id     String @id @default(uuid())
  nameRu String @map("name_ru")
  nameEn String @map("name_en")

  users UserCategory[]
  jobs  Job[]

  @@map("categories")
}

model UserCategory {
  userId     String @map("user_id")
  categoryId String @map("category_id")

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([userId, categoryId])
  @@map("user_categories")
}

model Job {
  id               String    @id @default(uuid())
  customerId       String    @map("customer_id")
  categoryId       String    @map("category_id")
  description      String
  budget           Int
  dateFrom         DateTime  @map("date_from") @db.Date
  dateTo           DateTime  @map("date_to") @db.Date
  status           String    @default("new")
  selectedMasterId String?   @map("selected_master_id")
  masterConfirmed  Boolean   @default(false) @map("master_confirmed")
  customerConfirmed Boolean  @default(false) @map("customer_confirmed")
  createdAt        DateTime  @default(now()) @map("created_at")

  customer       User          @relation("CustomerJobs", fields: [customerId], references: [id])
  category       Category      @relation(fields: [categoryId], references: [id])
  selectedMaster User?         @relation("SelectedMaster", fields: [selectedMasterId], references: [id])
  applications   Application[]
  review         Review?

  @@map("jobs")
}

model Application {
  id        String   @id @default(uuid())
  jobId     String   @map("job_id")
  masterId  String   @map("master_id")
  comment   String?
  createdAt DateTime @default(now()) @map("created_at")

  job    Job  @relation(fields: [jobId], references: [id], onDelete: Cascade)
  master User @relation(fields: [masterId], references: [id])

  @@unique([jobId, masterId])
  @@map("applications")
}

model Review {
  id         String   @id @default(uuid())
  jobId      String   @unique @map("job_id")
  masterId   String   @map("master_id")
  customerId String   @map("customer_id")
  rating     Int
  comment    String?
  createdAt  DateTime @default(now()) @map("created_at")

  job      Job  @relation(fields: [jobId], references: [id])
  master   User @relation("MasterReviews", fields: [masterId], references: [id])
  customer User @relation("CustomerReviews", fields: [customerId], references: [id])

  @@map("reviews")
}
```

- [ ] **Step 2: Create prisma/seed.ts (categories)**

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { nameRu: 'Сантехника', nameEn: 'Plumbing' },
  { nameRu: 'Электрик', nameEn: 'Electrician' },
  { nameRu: 'Уборка', nameEn: 'Cleaning' },
  { nameRu: 'Грузчик', nameEn: 'Moving' },
  { nameRu: 'Ремонт техники', nameEn: 'Appliance Repair' },
  { nameRu: 'Строительство', nameEn: 'Construction' },
  { nameRu: 'Малярные работы', nameEn: 'Painting' },
  { nameRu: 'Репетитор', nameEn: 'Tutor' },
  { nameRu: 'Курьер', nameEn: 'Courier' },
  { nameRu: 'Другое', nameEn: 'Other' },
]

async function main() {
  await prisma.category.createMany({ data: categories, skipDuplicates: true })
  console.log('Seeded categories')
}

main().finally(() => prisma.$disconnect())
```

- [ ] **Step 3: Start Docker and run migration**

```bash
docker compose up postgres -d
# wait for healthy
cd apps/server
DATABASE_URL=postgresql://jobbarm:jobbarm@localhost:5432/jobbarm pnpm db:migrate
# Enter migration name: "init"
DATABASE_URL=postgresql://jobbarm:jobbarm@localhost:5432/jobbarm pnpm db:seed
```

Expected: migration files created in `prisma/migrations/`, categories seeded.

- [ ] **Step 4: Commit**

```bash
git add apps/server/prisma/
git commit -m "feat: prisma schema and initial migration"
```

---

## Task 3: Config + DB + Redis singletons

**Files:**
- Create: `apps/server/src/config.ts`
- Create: `apps/server/src/db.ts`
- Create: `apps/server/src/redis.ts`

- [ ] **Step 1: Create src/config.ts**

```typescript
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  BOT_TOKEN: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  PORT: z.coerce.number().default(3000),
})

export const config = schema.parse(process.env)
```

- [ ] **Step 2: Create src/db.ts**

```typescript
import { PrismaClient } from '@prisma/client'

export const db = new PrismaClient()
```

- [ ] **Step 3: Create src/redis.ts**

```typescript
import Redis from 'ioredis'
import { config } from './config.js'

export const redis = new Redis(config.REDIS_URL)
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/
git commit -m "feat: config, db, redis singletons"
```

---

## Task 4: Fastify app + auth plugin

**Files:**
- Create: `apps/server/src/plugins/auth.ts`
- Create: `apps/server/src/plugins/error-handler.ts`
- Create: `apps/server/src/app.ts`
- Create: `apps/server/src/main.ts`
- Create: `apps/server/tests/setup.ts`
- Create: `apps/server/tests/auth.test.ts`

- [ ] **Step 1: Write failing test for TG initData validation**

```typescript
// tests/auth.test.ts
import { describe, it, expect } from 'vitest'
import { validateTelegramInitData } from '../src/plugins/auth.js'

describe('validateTelegramInitData', () => {
  it('rejects tampered data', () => {
    const result = validateTelegramInitData('fake_data', 'fake_bot_token')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/server && pnpm test
```

Expected: FAIL — `validateTelegramInitData` not found.

- [ ] **Step 3: Create src/plugins/auth.ts**

```typescript
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

    const result: Record<string, string> = {}
    for (const [k, v] of entries) result[k] = v
    return result
  } catch {
    return null
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
  })
})
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd apps/server && pnpm test
```

Expected: PASS.

- [ ] **Step 5: Create src/plugins/error-handler.ts**

```typescript
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

export default fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500
    app.log.error(error)
    reply.status(statusCode).send({
      error: error.message ?? 'Internal Server Error',
    })
  })
})
```

- [ ] **Step 6: Create src/app.ts**

```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import authPlugin from './plugins/auth.js'
import errorHandler from './plugins/error-handler.js'
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import categoriesRoutes from './routes/categories.js'
import jobsRoutes from './routes/jobs.js'
import applicationsRoutes from './routes/applications.js'
import reviewsRoutes from './routes/reviews.js'
import mastersRoutes from './routes/masters.js'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: true })
  app.register(authPlugin)
  app.register(errorHandler)

  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(usersRoutes, { prefix: '/api' })
  app.register(categoriesRoutes, { prefix: '/api' })
  app.register(jobsRoutes, { prefix: '/api' })
  app.register(applicationsRoutes, { prefix: '/api' })
  app.register(reviewsRoutes, { prefix: '/api' })
  app.register(mastersRoutes, { prefix: '/api' })

  app.get('/health', async () => ({ ok: true }))

  return app
}
```

- [ ] **Step 7: Create src/main.ts**

```typescript
import { buildApp } from './app.js'
import { config } from './config.js'

const app = buildApp()

app.listen({ port: config.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
```

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/ apps/server/tests/
git commit -m "feat: fastify app with JWT auth plugin"
```

---

## Task 5: Auth route (POST /api/auth/telegram)

**Files:**
- Create: `apps/server/src/routes/auth.ts`

- [ ] **Step 1: Create src/routes/auth.ts**

```typescript
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validateTelegramInitData } from '../plugins/auth.js'
import { db } from '../db.js'
import { config } from '../config.js'

const bodySchema = z.object({
  initData: z.string().min(1),
  language: z.enum(['ru', 'en']).default('ru'),
})

export default async function authRoutes(app: FastifyInstance) {
  app.post('/telegram', async (request, reply) => {
    const { initData, language } = bodySchema.parse(request.body)

    const data = validateTelegramInitData(initData, config.BOT_TOKEN)
    if (!data) return reply.status(401).send({ error: 'Invalid initData' })

    const tgUser = JSON.parse(data['user'] ?? '{}')
    const telegramId = String(tgUser.id)
    if (!telegramId) return reply.status(400).send({ error: 'No user in initData' })

    const user = await db.user.upsert({
      where: { telegramId },
      update: {},
      create: {
        telegramId,
        name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'User',
        phone: '',
        language,
      },
    })

    const token = app.jwt.sign({ userId: user.id, telegramId })
    return { token, isNew: !user.phone }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/routes/auth.ts
git commit -m "feat: POST /api/auth/telegram"
```

---

## Task 6: Users routes (GET/PUT /api/me)

**Files:**
- Create: `apps/server/src/routes/users.ts`

- [ ] **Step 1: Create src/routes/users.ts**

```typescript
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'

async function getMasterRating(userId: string) {
  const result = await db.review.aggregate({
    where: { masterId: userId },
    _avg: { rating: true },
    _count: { rating: true },
  })
  return {
    rating: result._avg.rating,
    reviewCount: result._count.rating,
  }
}

export default async function usersRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      include: { categories: { include: { category: true } } },
    })
    const { rating, reviewCount } = await getMasterRating(userId)
    return {
      ...user,
      categories: user.categories.map((uc) => uc.category),
      rating,
      reviewCount,
    }
  })

  app.put('/me', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const schema = z.object({
      name: z.string().min(1).optional(),
      phone: z.string().min(5).optional(),
      language: z.enum(['ru', 'en']).optional(),
    })
    const data = schema.parse(request.body)
    return db.user.update({ where: { id: userId }, data })
  })

  app.post('/me/master', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const schema = z.object({
      categoryIds: z.array(z.string().uuid()).min(1),
    })
    const { categoryIds } = schema.parse(request.body)

    await db.user.update({ where: { id: userId }, data: { isMaster: true } })
    await db.userCategory.deleteMany({ where: { userId } })
    await db.userCategory.createMany({
      data: categoryIds.map((categoryId) => ({ userId, categoryId })),
    })

    return db.user.findUniqueOrThrow({
      where: { id: userId },
      include: { categories: { include: { category: true } } },
    })
  })

  app.put('/me/categories', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const schema = z.object({ categoryIds: z.array(z.string().uuid()).min(1) })
    const { categoryIds } = schema.parse(request.body)

    await db.userCategory.deleteMany({ where: { userId } })
    await db.userCategory.createMany({
      data: categoryIds.map((categoryId) => ({ userId, categoryId })),
    })
    return { ok: true }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/routes/users.ts
git commit -m "feat: GET/PUT /api/me, POST /api/me/master"
```

---

## Task 7: Categories route

**Files:**
- Create: `apps/server/src/routes/categories.ts`

- [ ] **Step 1: Create src/routes/categories.ts**

```typescript
import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

export default async function categoriesRoutes(app: FastifyInstance) {
  app.get('/categories', async () => {
    return db.category.findMany({ orderBy: { nameRu: 'asc' } })
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/routes/categories.ts
git commit -m "feat: GET /api/categories"
```

---

## Task 8: Jobs routes

**Files:**
- Create: `apps/server/src/routes/jobs.ts`
- Create: `apps/server/tests/jobs.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/jobs.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'

describe('POST /api/jobs', () => {
  it('requires auth', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/jobs',
      payload: {},
    })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/server && pnpm test tests/jobs.test.ts
```

Expected: FAIL — route not found (404 not 401).

- [ ] **Step 3: Create src/routes/jobs.ts**

```typescript
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'

const jobInclude = {
  category: true,
  _count: { select: { applications: true } },
}

export default async function jobsRoutes(app: FastifyInstance) {
  // Customer: list my jobs
  app.get('/jobs/my', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const jobs = await db.job.findMany({
      where: { customerId: userId },
      include: jobInclude,
      orderBy: { createdAt: 'desc' },
    })
    return jobs.map((j) => ({ ...j, applicationCount: j._count.applications }))
  })

  // Master: list jobs feed (by categories)
  app.get('/jobs/feed', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const masterCats = await db.userCategory.findMany({ where: { userId } })
    const categoryIds = masterCats.map((mc) => mc.categoryId)

    const jobs = await db.job.findMany({
      where: { categoryId: { in: categoryIds }, status: 'new' },
      include: jobInclude,
      orderBy: { createdAt: 'desc' },
    })
    return jobs.map((j) => ({ ...j, applicationCount: j._count.applications }))
  })

  // Get single job
  app.get<{ Params: { id: string } }>('/jobs/:id', { preHandler: [app.authenticate] }, async (request) => {
    return db.job.findUniqueOrThrow({
      where: { id: request.params.id },
      include: { ...jobInclude, customer: true },
    })
  })

  // Customer: create job
  app.post('/jobs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const schema = z.object({
      categoryId: z.string().uuid(),
      description: z.string().min(10),
      budget: z.number().int().positive(),
      dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    const data = schema.parse(request.body)

    const job = await db.job.create({
      data: {
        customerId: userId,
        categoryId: data.categoryId,
        description: data.description,
        budget: data.budget,
        dateFrom: new Date(data.dateFrom),
        dateTo: new Date(data.dateTo),
      },
      include: jobInclude,
    })

    reply.status(201)
    return { ...job, applicationCount: job._count.applications }
  })
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd apps/server && pnpm test tests/jobs.test.ts
```

Expected: PASS (now returns 401 for unauth request).

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/jobs.ts apps/server/tests/jobs.test.ts
git commit -m "feat: jobs routes (feed, my, create)"
```

---

## Task 9: Applications routes

**Files:**
- Create: `apps/server/src/routes/applications.ts`
- Create: `apps/server/tests/applications.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/applications.test.ts
import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

describe('POST /api/jobs/:id/apply', () => {
  it('requires auth', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/jobs/fake-id/apply',
      payload: {},
    })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/server && pnpm test tests/applications.test.ts
```

Expected: FAIL — 404 not 401.

- [ ] **Step 3: Create src/routes/applications.ts**

```typescript
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'

export default async function applicationsRoutes(app: FastifyInstance) {
  // Master: apply to job
  app.post<{ Params: { id: string } }>(
    '/jobs/:id/apply',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string }
      const schema = z.object({ comment: z.string().optional() })
      const { comment } = schema.parse(request.body)

      const job = await db.job.findUniqueOrThrow({ where: { id: request.params.id } })
      if (job.status !== 'new') return reply.status(400).send({ error: 'Job is not open' })

      const application = await db.application.create({
        data: { jobId: job.id, masterId: userId, comment },
        include: { master: true },
      })

      reply.status(201)
      return application
    }
  )

  // Customer: list applications for a job
  app.get<{ Params: { id: string } }>(
    '/jobs/:id/applications',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string }
      const job = await db.job.findUniqueOrThrow({ where: { id: request.params.id } })

      if (job.customerId !== userId) return reply.status(403).send({ error: 'Forbidden' })

      return db.application.findMany({
        where: { jobId: job.id },
        include: {
          master: {
            include: { categories: { include: { category: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      })
    }
  )

  // Customer: select master (reveals phone)
  app.post<{ Params: { id: string; masterId: string } }>(
    '/jobs/:id/select/:masterId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string }
      const { id: jobId, masterId } = request.params

      const job = await db.job.findUniqueOrThrow({ where: { id: jobId } })
      if (job.customerId !== userId) return reply.status(403).send({ error: 'Forbidden' })
      if (job.status !== 'new') return reply.status(400).send({ error: 'Job already has a master' })

      await db.job.update({
        where: { id: jobId },
        data: { selectedMasterId: masterId, status: 'in_progress' },
      })

      const master = await db.user.findUniqueOrThrow({ where: { id: masterId } })
      return { phone: master.phone }
    }
  )

  // Both: confirm completion
  app.post<{ Params: { id: string } }>(
    '/jobs/:id/complete',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string }
      const job = await db.job.findUniqueOrThrow({ where: { id: request.params.id } })

      if (job.status !== 'in_progress' && job.status !== 'pending_confirmation') {
        return reply.status(400).send({ error: 'Job cannot be completed' })
      }

      const isMaster = job.selectedMasterId === userId
      const isCustomer = job.customerId === userId
      if (!isMaster && !isCustomer) return reply.status(403).send({ error: 'Forbidden' })

      const update = isMaster ? { masterConfirmed: true } : { customerConfirmed: true }
      const updated = await db.job.update({
        where: { id: job.id },
        data: {
          ...update,
          status: 'pending_confirmation',
        },
      })

      if (updated.masterConfirmed && updated.customerConfirmed) {
        await db.job.update({ where: { id: job.id }, data: { status: 'completed' } })
        return { status: 'completed' }
      }

      return { status: 'pending_confirmation' }
    }
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd apps/server && pnpm test tests/applications.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/applications.ts apps/server/tests/applications.test.ts
git commit -m "feat: applications routes (apply, select, complete)"
```

---

## Task 10: Reviews + Masters routes

**Files:**
- Create: `apps/server/src/routes/reviews.ts`
- Create: `apps/server/src/routes/masters.ts`

- [ ] **Step 1: Create src/routes/reviews.ts**

```typescript
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'

export default async function reviewsRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>(
    '/jobs/:id/review',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string }
      const schema = z.object({
        rating: z.number().int().min(1).max(5),
        comment: z.string().optional(),
      })
      const { rating, comment } = schema.parse(request.body)

      const job = await db.job.findUniqueOrThrow({ where: { id: request.params.id } })
      if (job.customerId !== userId) return reply.status(403).send({ error: 'Forbidden' })
      if (job.status !== 'completed') return reply.status(400).send({ error: 'Job not completed' })
      if (!job.selectedMasterId) return reply.status(400).send({ error: 'No master selected' })

      const review = await db.review.create({
        data: {
          jobId: job.id,
          masterId: job.selectedMasterId,
          customerId: userId,
          rating,
          comment,
        },
      })

      reply.status(201)
      return review
    }
  )
}
```

- [ ] **Step 2: Create src/routes/masters.ts**

```typescript
import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

async function withRating(users: { id: string; [key: string]: unknown }[]) {
  return Promise.all(
    users.map(async (u) => {
      const agg = await db.review.aggregate({
        where: { masterId: u.id },
        _avg: { rating: true },
        _count: { rating: true },
      })
      return { ...u, rating: agg._avg.rating, reviewCount: agg._count.rating }
    })
  )
}

export default async function mastersRoutes(app: FastifyInstance) {
  app.get('/masters', async (request) => {
    const { categoryId } = request.query as { categoryId?: string }

    const masters = await db.user.findMany({
      where: {
        isMaster: true,
        ...(categoryId
          ? { categories: { some: { categoryId } } }
          : {}),
      },
      include: { categories: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return withRating(masters)
  })

  app.get<{ Params: { id: string } }>('/masters/:id', async (request) => {
    const master = await db.user.findUniqueOrThrow({
      where: { id: request.params.id, isMaster: true },
      include: { categories: { include: { category: true } } },
    })
    const reviews = await db.review.findMany({
      where: { masterId: master.id },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    const agg = await db.review.aggregate({
      where: { masterId: master.id },
      _avg: { rating: true },
      _count: { rating: true },
    })

    return {
      ...master,
      phone: master.phone,
      rating: agg._avg.rating,
      reviewCount: agg._count.rating,
      reviews,
    }
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/reviews.ts apps/server/src/routes/masters.ts
git commit -m "feat: reviews and masters routes"
```

---

## Task 11: Run full test suite + smoke test

- [ ] **Step 1: Run all tests**

```bash
cd apps/server && pnpm test
```

Expected: all tests PASS.

- [ ] **Step 2: Start full Docker stack and smoke test**

```bash
# From repo root
cp .env.example .env
# Edit .env: add BOT_TOKEN (any string for dev), set JWT_SECRET to anything 16+ chars
docker compose up -d
# Wait ~10s for migrations

curl http://localhost:3000/health
# Expected: {"ok":true}

curl http://localhost:3000/api/categories
# Expected: JSON array of 10 categories

curl -X POST http://localhost:3000/api/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{"initData":"fake"}' 
# Expected: {"error":"Invalid initData"}
```

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete backend API - Plan 1 done"
```

---

## What's next

- **Plan 2:** Bot (Telegraf) — launch Mini App, send notifications on job events
- **Plan 3:** Mini App (React + Vite) — all frontend screens
