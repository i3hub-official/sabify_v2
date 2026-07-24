// src/lib/cache/wrappers/cache-wrapper.ts
// Cache-aside helper: read from cache, fall through to the source on a
// miss — or if the cache itself is unreachable. Caching must never be a
// hard dependency for a request to succeed, so read/write failures are
// swallowed (fail open) by default.

import { cacheGet, cacheSet, cacheDel } from '../client.js'

export interface WithCacheOptions {
  ttlSeconds: number
  /** If false, a cache read/write failure is re-thrown instead of swallowed. Default true. */
  failOpen?: boolean
}

export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  options: WithCacheOptions,
): Promise<T> {
  const { ttlSeconds, failOpen = true } = options

  try {
    const cached = await cacheGet<string>(key)
    if (cached !== null) {
      return JSON.parse(cached) as T
    }
  } catch (error) {
    if (!failOpen) throw error
    console.error(`[cache-wrapper] read failed for "${key}", falling through:`, error)
  }

  const value = await fn()

  try {
    await cacheSet(key, JSON.stringify(value), ttlSeconds)
  } catch (error) {
    if (!failOpen) throw error
    console.error(`[cache-wrapper] write failed for "${key}":`, error)
  }

  return value
}

/**
 * Invalidate a single cache key — call this from the write path whenever
 * you mutate something withCache() might have cached. Prefer explicit
 * key invalidation like this over prefix/pattern-based clearing (Upstash
 * supports SCAN, but it's expensive to run often).
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await cacheDel(key)
  } catch (error) {
    console.error(`[cache-wrapper] invalidate failed for "${key}":`, error)
  }
}