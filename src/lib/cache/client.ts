// src/lib/cache/client.ts
// In-memory cache — drop-in replacement for the Upstash Redis client.
// Same function signatures, zero external dependencies.
//
// Trade-offs vs Redis:
//   • State is per-process and resets on server restart — fine for dev,
//     and acceptable for single-instance production deployments.
//   • Not shared across multiple server instances (no horizontal scaling).
//     When you're ready to scale, swap this file back to the Upstash
//     implementation — no callers need to change.
//   • TTL expiry is lazy (checked on read) + periodic sweep every 60s,
//     so memory usage stays bounded without a background thread per key.
//
// SERVER-ONLY: only import from +page.server.ts / +server.ts /
// hooks.server.ts. Never import from a .svelte file.

interface CacheEntry {
  value: string
  expiresAt: number | null // ms timestamp, null = no expiry
}

const store = new Map<string, CacheEntry>()

// ── Lazy expiry sweep ─────────────────────────────────────────────────────────
// Runs every 60 s to evict stale keys so the Map doesn't grow unboundedly
// in long-running dev sessions.
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.expiresAt !== null && entry.expiresAt <= now) {
      store.delete(key)
    }
  }
}, 60_000).unref() // .unref() so this timer never keeps the process alive

// ── Internal helpers ──────────────────────────────────────────────────────────

function isExpired(entry: CacheEntry): boolean {
  return entry.expiresAt !== null && entry.expiresAt <= Date.now()
}

function getEntry(key: string): CacheEntry | null {
  const entry = store.get(key)
  if (!entry) return null
  if (isExpired(entry)) {
    store.delete(key)
    return null
  }
  return entry
}

// ── Public API (mirrors the Upstash client exactly) ───────────────────────────

export function isCacheConfigured(): boolean {
  return true // always available
}

export async function pingCache(): Promise<boolean> {
  return true
}

export async function cacheGet<T = string>(key: string): Promise<T | null> {
  const entry = getEntry(key)
  if (!entry) return null
  return entry.value as unknown as T
}

export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  store.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  })
}

export async function cacheDel(key: string): Promise<void> {
  store.delete(key)
}

/**
 * Atomic increment with fixed-window expiry semantics:
 * expiry is set only when the key is first created (value === 1),
 * so repeated increments within the window never push the reset time out.
 * This matches the Redis INCR + EXPIRE behaviour used by rate-limit.ts.
 */
export async function cacheIncr(key: string, ttlSeconds?: number): Promise<number> {
  const entry = getEntry(key)
  const current = entry ? parseInt(entry.value, 10) : 0
  const next = current + 1

  store.set(key, {
    value: String(next),
    // Only set expiry on first creation — preserve existing expiry on increment
    expiresAt: entry ? entry.expiresAt : ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  })

  return next
}

export async function cacheExpire(key: string, ttlSeconds: number): Promise<void> {
  const entry = store.get(key)
  if (!entry || isExpired(entry)) return
  store.set(key, { ...entry, expiresAt: Date.now() + ttlSeconds * 1000 })
}