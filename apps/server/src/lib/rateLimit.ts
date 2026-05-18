import { redis } from '../redis.js'

// Daily counter. Returns true if the action is allowed (and counts it),
// false if the per-day limit is already reached. The key is date-scoped
// (YYYY-MM-DD), so the count resets at the UTC day boundary regardless of
// TTL; EXPIRE is called unconditionally (idempotent) purely as GC for
// abandoned keys — a conditional `if (count===1)` expire would leak a
// no-TTL key forever if the process died between INCR and EXPIRE.
export async function consumeDailyLimit(
  scope: string,
  id: string,
  limit: number
): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
  const key = `rl:${scope}:${id}:${day}`
  const count = await redis.incr(key)
  await redis.expire(key, 86400)
  return count <= limit
}

export const DAILY_REQUEST_LIMIT = 10
