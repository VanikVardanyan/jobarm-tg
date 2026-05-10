import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

async function requireAdmin(request: { user: { userId: string } }, reply: { status: (c: number) => { send: (b: unknown) => unknown } }) {
  const me = await db.user.findUnique({ where: { id: request.user.userId }, select: { isAdmin: true } })
  if (!me?.isAdmin) {
    reply.status(403).send({ error: 'forbidden' })
    return false
  }
  return true
}

export default async function adminRoutes(app: FastifyInstance) {
  app.get('/admin/users', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return
    const q = (request.query as { q?: string }).q?.trim() ?? ''
    const users = await db.user.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
              { username: { contains: q, mode: 'insensitive' } },
              { telegramId: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        telegramId: true,
        avatarUrl: true,
        isMaster: true,
        isAdmin: true,
        isBanned: true,
        createdAt: true,
        _count: { select: { jobsAsCustomer: true, applications: true } },
      },
    })
    return users
  })

  app.get<{ Params: { id: string } }>(
    '/admin/users/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return
      const user = await db.user.findUnique({
        where: { id: request.params.id },
        include: {
          categories: { include: { category: true } },
          jobsAsCustomer: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { category: true, _count: { select: { applications: true } } },
          },
          applications: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { job: { include: { category: true } } },
          },
          reviewsReceived: { orderBy: { createdAt: 'desc' }, take: 20 },
        },
      })
      if (!user) return reply.status(404).send({ error: 'not_found' })
      return {
        ...user,
        categories: user.categories.map((uc) => uc.category),
      }
    }
  )

  app.post<{ Params: { id: string }; Body: { banned?: boolean } }>(
    '/admin/users/:id/ban',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return
      const banned = request.body?.banned ?? true
      await db.user.update({ where: { id: request.params.id }, data: { isBanned: banned } })
      return { ok: true, banned }
    }
  )

  app.delete<{ Params: { id: string } }>(
    '/admin/users/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return
      const id = request.params.id
      // Cascade: applications, reviews, user-category, jobs-as-customer (and their applications), notifications
      const myJobs = await db.job.findMany({ where: { customerId: id }, select: { id: true } })
      const myJobIds = myJobs.map((j) => j.id)
      await db.application.deleteMany({ where: { OR: [{ masterId: id }, { jobId: { in: myJobIds } }] } })
      await db.review.deleteMany({ where: { OR: [{ masterId: id }, { customerId: id }] } })
      await db.userCategory.deleteMany({ where: { userId: id } })
      await db.notification.deleteMany({ where: { userId: id } })
      await db.job.deleteMany({ where: { id: { in: myJobIds } } })
      // Detach as a selected master from any other jobs to avoid FK error
      await db.job.updateMany({ where: { selectedMasterId: id }, data: { selectedMasterId: null } })
      await db.user.delete({ where: { id } })
      return reply.status(204).send()
    }
  )
}
