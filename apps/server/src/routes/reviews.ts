import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'

export default async function reviewsRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>(
    '/jobs/:id/review',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user
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
