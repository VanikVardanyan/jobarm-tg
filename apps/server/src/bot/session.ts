import type { StorageAdapter } from 'grammy'
import { redis } from '../redis.js'

const PREFIX = 'botsess:'
// Abandoned wizard sessions must not accumulate forever. grammY deletes the
// key when a conversation completes; this TTL only evicts dormant sessions
// (7 days is far longer than any realistic in-flight wizard).
const TTL_SECONDS = 604800

// Minimal ioredis-backed grammY storage adapter (no extra dependency).
export function redisStorage<T>(): StorageAdapter<T> {
  return {
    async read(key: string): Promise<T | undefined> {
      const raw = await redis.get(PREFIX + key)
      if (raw == null) return undefined
      try {
        return JSON.parse(raw) as T
      } catch {
        // Corrupt/legacy value — treat as no session so the user isn't stuck.
        return undefined
      }
    },
    async write(key: string, value: T): Promise<void> {
      await redis.set(PREFIX + key, JSON.stringify(value), 'EX', TTL_SECONDS)
    },
    async delete(key: string): Promise<void> {
      await redis.del(PREFIX + key)
    },
  }
}
