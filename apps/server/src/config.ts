import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  BOT_TOKEN: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  MINI_APP_URL: z.string().url().default('https://example.com'),
  PORT: z.coerce.number().default(3000),
})

export const config = schema.parse(process.env)
