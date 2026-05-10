import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validateTelegramInitData } from '../plugins/auth.js'
import { db } from '../db.js'
import { config } from '../config.js'

const bodySchema = z.object({
  initData: z.string().min(1),
  language: z.enum(['hy', 'ru', 'en']).default('hy'),
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
        name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'User',
        language,
        ...adminFlag,
      },
    })

    if (user.isBanned) return reply.status(403).send({ error: 'banned' })

    const token = app.jwt.sign({ userId: user.id, telegramId })
    return { token, isNew: existingUser === null }
  })
}
