// src/lib/cache/client.ts
// Cache client — Upstash Redis via its REST API, not a persistent-TCP
// client like ioredis. This codebase's other integrations (payment, sms,
// storage) are all fetch-based rather than long-lived connections, which
// matters if this ever runs on an edge/serverless SvelteKit adapter
// where a persistent TCP connection isn't available. Swap this file if
// you're deploying somewhere with a normal Redis instance reachable over
// TCP — the get/set/del/incr/expire/ping function signatures below
// shouldn't need to change for callers.
//
// SERVER-ONLY WARNING: this file reads UPSTASH_REDIS_REST_TOKEN, a
// secret. Like services/*.service.ts and rbac/guard.ts elsewhere in this
// codebase, it is NOT placed under $lib/server/, so SvelteKit's
// build-time server-only import guard won't stop a client component from
// accidentally importing it and leaking the token into the browser
// bundle. Only ever import this from +page.server.ts / +server.ts /
// hooks.server.ts / other server-only code — never from a .svelte file.

import { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } from '$env/static/private'

const REDIS_URL = UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = UPSTASH_REDIS_REST_TOKEN

function assertConfigured(): void {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Cache client is not configured (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing)')
  }
}

async function command<T = unknown>(parts: (string | number)[]): Promise<T> {
  assertConfigured()
  const res = await fetch(REDIS_URL as string, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(parts),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || `Redis command failed: ${res.status}`)
  }
  return data.result as T
}

export function isCacheConfigured(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN)
}

export async function pingCache(): Promise<boolean> {
  if (!isCacheConfigured()) return false
  try {
    const result = await command<string>(['PING'])
    return result === 'PONG'
  } catch (error) {
    console.error('[cache.client] pingCache failed:', error)
    return false
  }
}

export async function cacheGet<T = string>(key: string): Promise<T | null> {
  const result = await command<string | null>(['GET', key])
  return (result as T) ?? null
}

export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (ttlSeconds) {
    await command(['SET', key, value, 'EX', ttlSeconds])
  } else {
    await command(['SET', key, value])
  }
}

export async function cacheDel(key: string): Promise<void> {
  await command(['DEL', key])
}

/**
 * Atomic increment, with expiry set only the first time a key is created
 * within a window — repeated increments never push the expiry back out,
 * which is what makes this safe to use as a fixed-window rate-limit
 * counter (see middleware/rate-limit.ts).
 */
export async function cacheIncr(key: string, ttlSeconds?: number): Promise<number> {
  const value = await command<number>(['INCR', key])
  if (ttlSeconds && value === 1) {
    await command(['EXPIRE', key, ttlSeconds])
  }
  return value
}

export async function cacheExpire(key: string, ttlSeconds: number): Promise<void> {
  await command(['EXPIRE', key, ttlSeconds])
}