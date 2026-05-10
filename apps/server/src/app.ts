import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import authPlugin from './plugins/auth.js'
import errorHandler from './plugins/error-handler.js'
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import categoriesRoutes from './routes/categories.js'
import jobsRoutes from './routes/jobs.js'
import applicationsRoutes from './routes/applications.js'
import reviewsRoutes from './routes/reviews.js'
import mastersRoutes from './routes/masters.js'
import notificationsRoutes from './routes/notifications.js'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: true })
  app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } })
  app.register(authPlugin)
  app.register(errorHandler)

  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(usersRoutes, { prefix: '/api' })
  app.register(categoriesRoutes, { prefix: '/api' })
  app.register(jobsRoutes, { prefix: '/api' })
  app.register(applicationsRoutes, { prefix: '/api' })
  app.register(reviewsRoutes, { prefix: '/api' })
  app.register(mastersRoutes, { prefix: '/api' })
  app.register(notificationsRoutes, { prefix: '/api' })

  app.get('/health', async () => ({ ok: true }))

  return app
}
