import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createHmac } from 'crypto'
import { config } from '../config.js'

export function validateTelegramInitData(initData: string, botToken: string): Record<string, string> | null {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return null

    params.delete('hash')
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n')

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
    const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

    if (expectedHash !== hash) return null

    const result: Record<string, string> = {}
    for (const [k, v] of entries) result[k] = v
    return result
  } catch {
    return null
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export default fp(async (app: FastifyInstance) => {
  await app.register(jwt, { secret: config.JWT_SECRET })

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    await request.jwtVerify()
  })
})
