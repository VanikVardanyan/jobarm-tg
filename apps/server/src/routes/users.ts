import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'

async function getMasterStats(userId: string) {
  const result = await db.review.aggregate({
    where: { masterId: userId },
    _avg: { rating: true },
    _count: { rating: true },
  })
  return {
    rating: result._avg.rating,
    reviewCount: result._count.rating,
  }
}

export default async function usersRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      include: { categories: { include: { category: true } } },
    })
    const { rating, reviewCount } = await getMasterStats(userId)
    return {
      ...user,
      categories: user.categories.map((uc) => uc.category),
      rating,
      reviewCount,
    }
  })

  app.put('/me', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    const schema = z.object({
      name: z.string().min(1).optional(),
      phone: z.string().min(5).optional(),
      language: z.enum(['hy', 'ru', 'en']).optional(),
    })
    const data = schema.parse(request.body)
    return db.user.update({ where: { id: userId }, data })
  })

  app.post('/me/master', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    const schema = z.object({
      categoryIds: z.array(z.string().uuid()).min(1),
    })
    const { categoryIds } = schema.parse(request.body)

    await db.user.update({ where: { id: userId }, data: { isMaster: true } })
    await db.userCategory.deleteMany({ where: { userId } })
    await db.userCategory.createMany({
      data: categoryIds.map((categoryId) => ({ userId, categoryId })),
    })

    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      include: { categories: { include: { category: true } } },
    })
    return { ...user, categories: user.categories.map((uc) => uc.category) }
  })

  app.put('/me/categories', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    const schema = z.object({ categoryIds: z.array(z.string().uuid()).min(1) })
    const { categoryIds } = schema.parse(request.body)

    await db.userCategory.deleteMany({ where: { userId } })
    await db.userCategory.createMany({
      data: categoryIds.map((categoryId) => ({ userId, categoryId })),
    })
    return { ok: true }
  })
}
