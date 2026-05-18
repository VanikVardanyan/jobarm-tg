import type { StorageAdapter } from 'grammy'
import { redis } from '../redis.js'

const PREFIX = 'botsess:'

// Minimal ioredis-backed grammY storage adapter (no extra dependency).
export function redisStorage<T>(): StorageAdapter<T> {
  return {
    async read(key: string): Promise<T | undefined> {
      const raw = await redis.get(PREFIX + key)
      return raw == null ? undefined : (JSON.parse(raw) as T)
    },
    async write(key: string, value: T): Promise<void> {
      await redis.set(PREFIX + key, JSON.stringify(value))
    },
    async delete(key: string): Promise<void> {
      await redis.del(PREFIX + key)
    },
  }
}
