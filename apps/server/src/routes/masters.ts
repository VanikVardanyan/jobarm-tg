import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

async function attachRatings<T extends { id: string }>(users: T[]) {
  return Promise.all(
    users.map(async (u) => {
      const agg = await db.review.aggregate({
        where: { masterId: u.id },
        _avg: { rating: true },
        _count: { rating: true },
      })
      return { ...u, rating: agg._avg.rating, reviewCount: agg._count.rating }
    })
  )
}

export default async function mastersRoutes(app: FastifyInstance) {
  app.get('/masters', async (request) => {
    const { categoryId } = request.query as { categoryId?: string }

    const masters = await db.user.findMany({
      where: {
        isMaster: true,
        ...(categoryId ? { categories: { some: { categoryId } } } : {}),
      },
      include: { categories: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const withRatings = await attachRatings(masters)
    return withRatings.map((m) => ({
      ...m,
      categories: (m as typeof masters[0] & { rating: number | null; reviewCount: number }).categories.map((uc) => uc.category),
    }))
  })

  app.get<{ Params: { id: string } }>('/masters/:id', async (request, reply) => {
    const master = await db.user.findFirst({
      where: { id: request.params.id, isMaster: true },
      include: { categories: { include: { category: true } } },
    })

    if (!master) return reply.status(404).send({ error: 'Master not found' })

    const reviews = await db.review.findMany({
      where: { masterId: master.id },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const agg = await db.review.aggregate({
      where: { masterId: master.id },
      _avg: { rating: true },
      _count: { rating: true },
    })

    return {
      ...master,
      categories: master.categories.map((uc) => uc.category),
      rating: agg._avg.rating,
      reviewCount: agg._count.rating,
      reviews,
    }
  })
}
