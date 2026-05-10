import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

export default async function notificationsRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    const items = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const unread = items.filter((n) => !n.read).length
    return { items, unread }
  })

  app.post<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user
      await db.notification.updateMany({
        where: { id: request.params.id, userId },
        data: { read: true },
      })
      return reply.status(204).send()
    }
  )

  app.post(
    '/notifications/read-all',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user
      await db.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
      return reply.status(204).send()
    }
  )
}
