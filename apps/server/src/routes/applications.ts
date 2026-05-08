import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import {
  notifyCustomerNewApplication,
  notifyMasterSelected,
  notifyMasterJobDone,
  notifyJobCompleted,
} from '../bot/notifications.js'

export default async function applicationsRoutes(app: FastifyInstance) {
  // Master: apply to job
  app.post<{ Params: { id: string } }>(
    '/jobs/:id/apply',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user
      const schema = z.object({ comment: z.string().optional() })
      const { comment } = schema.parse(request.body)

      const job = await db.job.findUniqueOrThrow({ where: { id: request.params.id } })
      if (job.status !== 'new') return reply.status(400).send({ error: 'Job is not open' })

      const application = await db.application.create({
        data: { jobId: job.id, masterId: userId, comment },
        include: { master: true },
      })

      reply.status(201)
      void notifyCustomerNewApplication(job.id, userId)
      return application
    }
  )

  // Customer: list applications for a job
  app.get<{ Params: { id: string } }>(
    '/jobs/:id/applications',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user
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
      const { userId } = request.user
      const { id: jobId, masterId } = request.params

      const job = await db.job.findUniqueOrThrow({ where: { id: jobId } })
      if (job.customerId !== userId) return reply.status(403).send({ error: 'Forbidden' })
      if (job.status !== 'new') return reply.status(400).send({ error: 'Job already has a master' })

      await db.job.update({
        where: { id: jobId },
        data: { selectedMasterId: masterId, status: 'in_progress' },
      })

      void notifyMasterSelected(jobId, masterId)

      const master = await db.user.findUniqueOrThrow({ where: { id: masterId } })
      return { phone: master.phone }
    }
  )

  // Both master and customer: confirm job completion
  app.post<{ Params: { id: string } }>(
    '/jobs/:id/complete',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user
      const job = await db.job.findUniqueOrThrow({ where: { id: request.params.id } })

      if (job.status !== 'in_progress' && job.status !== 'pending_confirmation') {
        return reply.status(400).send({ error: 'Job cannot be completed' })
      }

      const isMaster = job.selectedMasterId === userId
      const isCustomer = job.customerId === userId
      if (!isMaster && !isCustomer) return reply.status(403).send({ error: 'Forbidden' })

      const update = isMaster
        ? { masterConfirmed: true, status: 'pending_confirmation' as const }
        : { customerConfirmed: true, status: 'pending_confirmation' as const }

      const updated = await db.job.update({
        where: { id: job.id },
        data: update,
      })

      if (updated.masterConfirmed && updated.customerConfirmed) {
        await db.job.update({ where: { id: job.id }, data: { status: 'completed' } })
        if (job.selectedMasterId) void notifyJobCompleted(job.id, job.selectedMasterId)
        return { status: 'completed' }
      }

      if (isMaster) void notifyMasterJobDone(job.id)

      return { status: 'pending_confirmation' }
    }
  )
}
