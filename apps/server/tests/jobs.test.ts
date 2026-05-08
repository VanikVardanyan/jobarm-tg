import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

describe('Jobs routes', () => {
  it('POST /api/jobs requires auth', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/jobs',
      payload: {},
    })
    expect(res.statusCode).toBe(401)
  })

  it('GET /api/jobs/my requires auth', async () => {
    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/jobs/my' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /api/jobs/feed requires auth', async () => {
    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/jobs/feed' })
    expect(res.statusCode).toBe(401)
  })
})
