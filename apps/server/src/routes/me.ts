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
