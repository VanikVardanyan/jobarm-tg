import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

describe('Applications routes', () => {
  it('POST /api/jobs/:id/apply requires auth', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/jobs/fake-id/apply',
      payload: {},
    })
    expect(res.statusCode).toBe(401)
  })

  it('GET /api/jobs/:id/applications requires auth', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/jobs/fake-id/applications',
    })
    expect(res.statusCode).toBe(401)
  })

  it('POST /api/jobs/:id/select/:masterId requires auth', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/jobs/fake-id/select/fake-master',
    })
    expect(res.statusCode).toBe(401)
  })

  it('POST /api/jobs/:id/complete requires auth', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/jobs/fake-id/complete',
    })
    expect(res.statusCode).toBe(401)
  })
})
