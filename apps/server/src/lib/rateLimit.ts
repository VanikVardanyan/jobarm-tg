import { redis } from '../redis.js'

// Atomic daily counter. Returns true if the action is allowed (and counts it),
// false if the per-day limit is already reached. Key auto-expires after 24h.
export async function consumeDailyLimit(
  scope: string,
  id: string,
  limit: number
): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
  const key = `rl:${scope}:${id}:${day}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 86400)
  return count <= limit
}

export const DAILY_REQUEST_LIMIT = 10
