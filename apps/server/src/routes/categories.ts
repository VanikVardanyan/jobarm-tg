import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

export default async function categoriesRoutes(app: FastifyInstance) {
  app.get('/categories', async () => {
    const cats = await db.category.findMany({ orderBy: { nameRu: 'asc' } })
    // Pin "Other" to the bottom of every list
    const other = cats.filter((c) => c.nameEn === 'Other')
    const rest = cats.filter((c) => c.nameEn !== 'Other')
    return [...rest, ...other]
  })
}
