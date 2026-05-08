import { describe, it, expect } from 'vitest'
import { buildMessage } from '../src/bot/messages.js'

describe('buildMessage', () => {
  it('returns RU message for new job', () => {
    const msg = buildMessage('ru', 'newJob', {
      category: 'Сантехника',
      description: 'Починить кран',
      budget: 15000,
      dateFrom: '10 мая',
      dateTo: '12 мая',
    })
    expect(msg).toContain('Новая заявка')
    expect(msg).toContain('Сантехника')
    expect(msg).toContain('15000')
  })

  it('returns EN message for new job', () => {
    const msg = buildMessage('en', 'newJob', {
      category: 'Plumbing',
      description: 'Fix faucet',
      budget: 15000,
      dateFrom: 'May 10',
      dateTo: 'May 12',
    })
    expect(msg).toContain('New job')
    expect(msg).toContain('Plumbing')
  })

  it('returns RU message for new application', () => {
    const msg = buildMessage('ru', 'newApplication', { masterName: 'Арам', jobDescription: 'Починить кран' })
    expect(msg).toContain('Арам')
    expect(msg).toContain('откликнулся')
  })
})
