import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

export default fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500
    app.log.error(error)
    reply.status(statusCode).send({
      error: error.message ?? 'Internal Server Error',
    })
  })
})
