import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'

export default async function meRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { service: true },
    })
    if (!user) return reply.status(404).send({ error: 'not_found' })
    return user
  })

  app.put('/me', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    const schema = z.object({
      phoneNumber: z.string().min(5).optional(),
      language: z.enum(['ru', 'hy']).optional(),
    })
    const data = schema.parse(request.body)
    return db.user.update({
      where: { id: userId },
      data,
      include: { service: true },
    })
  })
}
