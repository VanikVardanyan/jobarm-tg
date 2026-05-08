import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'

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

  // Get single job
  app.get<{ Params: { id: string } }>(
    '/jobs/:id',
    { preHandler: [app.authenticate] },
    async (request) => {
      const job = await db.job.findUniqueOrThrow({
        where: { id: request.params.id },
        include: { ...jobInclude, customer: true },
      })
      return { ...job, applicationCount: job._count.applications }
    }
  )

  // Customer: create job
  app.post('/jobs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user
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
