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
  app.get<{ Querystring: { categoryId?: string } }>(
    '/jobs/feed',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { userId } = request.user
      const masterCats = await db.userCategory.findMany({ where: { userId } })
      const categoryIds = masterCats.map((mc) => mc.categoryId)

      const filterCat = request.query.categoryId
      const finalIds = filterCat
        ? categoryIds.filter((id) => id === filterCat)
        : categoryIds

      const jobs = await db.job.findMany({
        where: { categoryId: { in: finalIds }, status: 'new' },
        include: jobInclude,
        orderBy: { createdAt: 'desc' },
      })
      return jobs.map((j) => ({ ...j, applicationCount: j._count.applications }))
    }
  )

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
        include: { ...jobInclude, customer: true, selectedMaster: true },
      })
      const myApplication = await db.application.findFirst({
        where: { jobId: job.id, masterId: userId },
        select: { id: true },
      })

      // Reveal contacts only after a master is selected, and only to the two parties involved
      const isCustomer = job.customerId === userId
      const isSelectedMaster = job.selectedMasterId === userId
      const masterPhone = isCustomer && job.selectedMaster ? job.selectedMaster.phone : null
      const customerPhone = isSelectedMaster ? job.customer.phone : null
      const masterTgId = isCustomer && job.selectedMaster ? job.selectedMaster.telegramId : null
      const customerTgId = isSelectedMaster ? job.customer.telegramId : null
      const masterUsername =
        isCustomer && job.selectedMaster ? job.selectedMaster.username : null
      const customerUsername = isSelectedMaster ? job.customer.username : null

      return {
        ...job,
        applicationCount: job._count.applications,
        hasApplied: !!myApplication,
        masterPhone,
        customerPhone,
        masterTgId,
        customerTgId,
        masterUsername,
        customerUsername,
        masterName: job.selectedMaster?.name ?? null,
        customerName: job.customer.name,
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
