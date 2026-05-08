import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

export default fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation error',
        details: error.errors,
      })
    }
    const statusCode = error.statusCode ?? 500
    app.log.error(error)
    reply.status(statusCode).send({
      error: error.message ?? 'Internal Server Error',
    })
  })
})
