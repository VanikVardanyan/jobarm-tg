import type { FastifyInstance } from 'fastify'
import { mkdir, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { z } from 'zod'
import { db } from '../db.js'

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/var/www/jobarm-uploads/avatars'
const AVATAR_PUBLIC_PATH = '/avatars'

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

  app.post('/me/avatar', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user
    const file = await request.file({ limits: { fileSize: 5 * 1024 * 1024 } })
    if (!file) return reply.status(400).send({ error: 'No file' })
    if (!/^image\//.test(file.mimetype))
      return reply.status(400).send({ error: 'Only images are allowed' })

    const buf = await file.toBuffer()
    const processed = await sharp(buf)
      .rotate()
      .resize(256, 256, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 82, progressive: true })
      .toBuffer()

    await mkdir(UPLOAD_DIR, { recursive: true })
    const filename = `${randomUUID()}.jpg`
    await writeFile(join(UPLOAD_DIR, filename), processed)

    // Best-effort cleanup of the previous avatar
    const prev = await db.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } })
    if (prev?.avatarUrl?.startsWith(`${AVATAR_PUBLIC_PATH}/`)) {
      const prevName = prev.avatarUrl.slice(AVATAR_PUBLIC_PATH.length + 1)
      unlink(join(UPLOAD_DIR, prevName)).catch(() => undefined)
    }

    const avatarUrl = `${AVATAR_PUBLIC_PATH}/${filename}`
    await db.user.update({ where: { id: userId }, data: { avatarUrl } })
    return { avatarUrl }
  })

  app.delete('/me/avatar', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user
    const user = await db.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } })
    if (user?.avatarUrl?.startsWith(`${AVATAR_PUBLIC_PATH}/`)) {
      const name = user.avatarUrl.slice(AVATAR_PUBLIC_PATH.length + 1)
      unlink(join(UPLOAD_DIR, name)).catch(() => undefined)
    }
    await db.user.update({ where: { id: userId }, data: { avatarUrl: null } })
    return reply.status(204).send()
  })
}
