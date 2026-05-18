import Fastify from 'fastify'
import cors from '@fastify/cors'
import authPlugin from './plugins/auth.js'
import errorHandler from './plugins/error-handler.js'
import authRoutes from './routes/auth.js'
import meRoutes from './routes/me.js'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: true })
  app.register(authPlugin)
  app.register(errorHandler)

  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(meRoutes, { prefix: '/api' })

  app.get('/health', async () => ({ ok: true }))

  return app
}
