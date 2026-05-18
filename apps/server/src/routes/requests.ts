import type { FastifyInstance } from 'fastify'
import type { RequestSummary, RequestDetail } from '@jobbarm/shared'
import { db } from '../db.js'

export default async function requestsRoutes(app: FastifyInstance) {
  app.get('/requests', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    const rows = await db.request.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: 'desc' },
      include: { car: { select: { make: true, model: true, year: true } } },
    })
    const out: RequestSummary[] = rows.map((r) => ({
      id: r.id,
      serviceType: r.serviceType,
      description: r.description,
      district: r.district,
      urgency: r.urgency,
      status: r.status,
      photosCount: r.photos.length,
      hasVoice: r.voiceFileId != null,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      car: { make: r.car.make, model: r.car.model, year: r.car.year },
    }))
    return out
  })

  app.get('/requests/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user
    const { id } = request.params as { id: string }
    const r = await db.request.findFirst({
      where: { id, clientId: userId },
      include: { car: { select: { make: true, model: true, year: true } } },
    })
    if (!r) return reply.status(404).send({ error: 'not_found' })
    const out: RequestDetail = {
      id: r.id,
      serviceType: r.serviceType,
      description: r.description,
      district: r.district,
      urgency: r.urgency,
      status: r.status,
      photosCount: r.photos.length,
      hasVoice: r.voiceFileId != null,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      car: { make: r.car.make, model: r.car.model, year: r.car.year },
      isDrivable: r.isDrivable,
      photos: r.photos,
      voiceFileId: r.voiceFileId,
    }
    return out
  })
}
