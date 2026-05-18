import type { FastifyInstance } from 'fastify'
import { carInputSchema } from '@jobbarm/shared'
import { db } from '../db.js'

export default async function carsRoutes(app: FastifyInstance) {
  app.get('/cars', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    return db.car.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.post('/cars', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user
    const data = carInputSchema.parse(request.body)
    const car = await db.car.create({
      data: {
        userId,
        make: data.make,
        model: data.model,
        year: data.year,
        bodyType: data.bodyType ?? null,
        color: data.color ?? null,
        licensePlate: data.licensePlate ?? null,
      },
    })
    return reply.status(201).send(car)
  })

  app.put('/cars/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user
    const { id } = request.params as { id: string }
    const data = carInputSchema.parse(request.body)
    const existing = await db.car.findFirst({ where: { id, userId } })
    if (!existing) return reply.status(404).send({ error: 'not_found' })
    return db.car.update({
      where: { id },
      data: {
        make: data.make,
        model: data.model,
        year: data.year,
        bodyType: data.bodyType ?? null,
        color: data.color ?? null,
        licensePlate: data.licensePlate ?? null,
      },
    })
  })

  app.delete('/cars/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user
    const { id } = request.params as { id: string }
    const existing = await db.car.findFirst({ where: { id, userId } })
    if (!existing) return reply.status(404).send({ error: 'not_found' })
    // A car referenced by requests must not be hard-deleted (FK). Block it.
    const used = await db.request.count({ where: { carId: id } })
    if (used > 0) return reply.status(409).send({ error: 'car_in_use' })
    await db.car.delete({ where: { id } })
    return reply.status(204).send()
  })
}
