import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { notifyMastersNewJob } from '../bot/notifications.js'

const jobInclude = {
  category: true,
  _count: { select: { applications: true } },
} as const

export default async function jobsRoutes(app: FastifyInstance) {
  // Customer: list my jobs
  app.get('/jobs/my', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    const jobs = await db.job.findMany({
      where: { customerId: userId },
      include: jobInclude,
      orderBy: { createdAt: 'desc' },
    })
    return jobs.map((j) => ({ ...j, applicationCount: j._count.applications }))
  })

  // Master: list jobs feed (by their categories)
  app.get('/jobs/feed', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    const masterCats = await db.userCategory.findMany({ where: { userId } })
    const categoryIds = masterCats.map((mc) => mc.categoryId)

    const jobs = await db.job.findMany({
      where: { categoryId: { in: categoryIds }, status: 'new' },
      include: jobInclude,
      orderBy: { createdAt: 'desc' },
    })
    return jobs.map((j) => ({ ...j, applicationCount: j._count.applications }))
  })

  // Master: list assigned jobs (in_progress or pending_confirmation)
  app.get('/jobs/assigned', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    const jobs = await db.job.findMany({
      where: {
        selectedMasterId: userId,
        status: { in: ['in_progress', 'pending_confirmation'] },
      },
      include: jobInclude,
      orderBy: { createdAt: 'desc' },
    })
    return jobs.map((j) => ({ ...j, applicationCount: j._count.applications }))
  })

  // Get single job
  app.get<{ Params: { id: string } }>(
    '/jobs/:id',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { userId } = request.user
      const job = await db.job.findUniqueOrThrow({
        where: { id: request.params.id },
        include: { ...jobInclude, customer: true },
      })
      const myApplication = await db.application.findFirst({
        where: { jobId: job.id, masterId: userId },
        select: { id: true },
      })
      return {
        ...job,
        applicationCount: job._count.applications,
        hasApplied: !!myApplication,
      }
    }
  )

  // Customer: create job
  app.post('/jobs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user
    const schema = z.object({
      categoryId: z.string().uuid(),
      description: z.string().min(3),
      budget: z.number().int().positive(),
      dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
    const data = schema.parse(request.body)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateFrom = data.dateFrom ? new Date(data.dateFrom) : today
    const dateTo = data.dateTo ? new Date(data.dateTo) : dateFrom

    const job = await db.job.create({
      data: {
        customerId: userId,
        categoryId: data.categoryId,
        description: data.description,
        budget: data.budget,
        dateFrom,
        dateTo,
      },
      include: jobInclude,
    })

    reply.status(201)
    void notifyMastersNewJob(job.id)
    return { ...job, applicationCount: job._count.applications }
  })

  // Customer: delete own job (only when still open)
  app.delete<{ Params: { id: string } }>(
    '/jobs/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { userId } = request.user
      const job = await db.job.findUniqueOrThrow({ where: { id: request.params.id } })
      if (job.customerId !== userId) return reply.status(403).send({ error: 'Forbidden' })
      if (job.status !== 'new')
        return reply.status(400).send({ error: 'Only new jobs can be deleted' })

      await db.application.deleteMany({ where: { jobId: job.id } })
      await db.job.delete({ where: { id: job.id } })
      return reply.status(204).send()
    }
  )
}
