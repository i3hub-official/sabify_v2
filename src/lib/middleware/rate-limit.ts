// src/lib/middleware/rate-limit.ts
// Per-IP fixed-window rate limiting, backed by cache/client.ts. Fails
// OPEN: if the cache is unreachable, requests are allowed through rather
// than a Redis hiccup taking down the entire site.

import { type Handle, type RequestEvent } from '@sveltejs/kit';
import { cacheIncr } from '$lib/cache/client.js';
import { cacheKeys } from '$lib/cache/keys.js';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 120; // ~2 req/sec sustained

// Health checks are already handled by healthCheckHandle before this runs,
// but keep this as a safety net.
const EXEMPT_PREFIXES = ['/health'];

function getClientIdentifier(event: RequestEvent): string {
  // Try headers first (more reliable in proxied environments)
  const forwarded = event.request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0].trim();
  }

  const cfIp = event.request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  // Fallback to getClientAddress with proper error handling
  try {
    const clientAddress = event.getClientAddress();
    
    // In development, localhost addresses should use a consistent identifier
    if (process.env.NODE_ENV === 'development') {
      if (['::1', '127.0.0.1', '::ffff:127.0.0.1', 'localhost'].includes(clientAddress)) {
        return 'dev-localhost';
      }
    }
    
    return clientAddress;
  } catch {
    // If getClientAddress fails completely
    if (process.env.NODE_ENV === 'development') {
      return 'dev-fallback';
    }
    
    // In production, use a combination of request metadata as fallback
    const userAgent = event.request.headers.get('user-agent') || 'unknown';
    const acceptLanguage = event.request.headers.get('accept-language') || 'unknown';
    // Use a hash of user agent + accept language as fallback identifier
    return `fallback:${userAgent.substring(0, 30)}:${acceptLanguage.substring(0, 10)}`;
  }
}

export const rateLimitMiddleware: Handle = async ({ event, resolve }) => {
  // Skip rate limiting entirely in development to avoid issues
  if (process.env.NODE_ENV === 'development') {
    return resolve(event);
  }

  // Skip exempt paths
  if (EXEMPT_PREFIXES.some((prefix) => event.url.pathname.startsWith(prefix))) {
    return resolve(event);
  }

  // Get client identifier safely
  const identifier = getClientIdentifier(event);
  const key = cacheKeys.rateLimit('global', identifier);

  try {
    const count = await cacheIncr(key, WINDOW_SECONDS);
    if (count > MAX_REQUESTS_PER_WINDOW) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(WINDOW_SECONDS),
        },
      });
    }
  } catch (error) {
    // If cache is unreachable, log but allow the request
    console.error('[middleware/rate-limit] cache unreachable, allowing request:', error);
  }

  return resolve(event);
};

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
    const count = await cacheIncr(cacheKeys.rateLimit(bucket, identifier), windowSeconds);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (error) {
    console.error(`[middleware/rate-limit] checkActionRateLimit(${bucket}) failed, allowing:`, error);
    return { allowed: true, remaining: limit };
  }
}