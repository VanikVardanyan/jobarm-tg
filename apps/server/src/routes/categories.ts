import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

export default async function categoriesRoutes(app: FastifyInstance) {
  app.get('/categories', async () => {
    return db.category.findMany({ orderBy: { nameRu: 'asc' } })
  })
}
