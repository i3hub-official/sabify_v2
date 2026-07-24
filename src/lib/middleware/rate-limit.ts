// src/lib/middleware/rate-limit.ts
// Per-IP fixed-window rate limiting, backed by cache/client.ts. Fails
// OPEN: if the cache is unreachable, requests are allowed through rather
// than a Redis hiccup taking down the entire site.

import { type Handle, type RequestEvent } from '@sveltejs/kit'
import { cacheIncr } from '$lib/cache/client.js'
import { cacheKeys } from '$lib/cache/keys.js'

const WINDOW_SECONDS = 60
const MAX_REQUESTS_PER_WINDOW = 120 // ~2 req/sec sustained — generous default; tighten per-route with checkActionRateLimit below

// Health checks need to be hit frequently by uptime monitors/load
// balancers — never rate-limit them. (They're also handled before this
// middleware even runs — see hooks.server.ts — but this exemption stays
// here too in case rate-limiting is ever reordered.)
const EXEMPT_PREFIXES = ['/health']

function getClientIdentifier(event: RequestEvent): string {
  return (
    event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    event.request.headers.get('cf-connecting-ip') ||
    event.getClientAddress()
  )
}

export const rateLimitMiddleware: Handle = async ({ event, resolve }) => {
  if (EXEMPT_PREFIXES.some((prefix) => event.url.pathname.startsWith(prefix))) {
    return resolve(event)
  }

  const identifier = getClientIdentifier(event)
  const key = cacheKeys.rateLimit('global', identifier)

  try {
    const count = await cacheIncr(key, WINDOW_SECONDS)
    if (count > MAX_REQUESTS_PER_WINDOW) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(WINDOW_SECONDS),
        },
      })
    }
  } catch (error) {
    console.error('[middleware/rate-limit] cache unreachable, allowing request:', error)
  }

  return resolve(event)
}

/**
 * Per-action rate limiting for sensitive endpoints (login, OTP send,
 * password reset) that need a tighter, action-specific bucket than the
 * global per-IP limit above. Call this from inside an action/+server.ts —
 * it's not part of the global Handle chain.
 *
 * @example
 * const { allowed } = await checkActionRateLimit('otp-send', email, 3, 60 * 15);
 * if (!allowed) throw error(429, 'Too many OTP requests — try again later.');
 */
export async function checkActionRateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const count = await cacheIncr(cacheKeys.rateLimit(bucket, identifier), windowSeconds)
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
  } catch (error) {
    console.error(`[middleware/rate-limit] checkActionRateLimit(${bucket}) failed, allowing:`, error)
    return { allowed: true, remaining: limit }
  }
}