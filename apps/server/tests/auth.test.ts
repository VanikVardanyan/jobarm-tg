import { describe, it, expect } from 'vitest'
import { validateTelegramInitData } from '../src/plugins/auth.js'

describe('validateTelegramInitData', () => {
  it('rejects tampered data', () => {
    const result = validateTelegramInitData('fake_data', 'fake_bot_token')
    expect(result).toBeNull()
  })

  it('returns null when hash is missing', () => {
    const result = validateTelegramInitData('user=test&auth_date=123', 'any_token')
    expect(result).toBeNull()
  })
})
