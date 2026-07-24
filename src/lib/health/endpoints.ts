// src/lib/health/endpoints.ts
// Reusable handlers for liveness/readiness/full health checks. Called
// directly from hooks.server.ts (see the healthCheckHandle there) rather
// than needing dedicated +server.ts route files — that lets health checks
// run before session/rate-limit middleware, so monitors never get rate
// limited or blocked on cookie parsing.

import type { RequestEvent } from '@sveltejs/kit'
import { checkDatabase, checkExternalServices, checkCache, type CheckResult } from './checks.js'

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: CheckResult[]
}

function summarize(checks: CheckResult[]): HealthReport['status'] {
  if (checks.some((c) => c.status === 'down' && (c.name === 'database' || c.name === 'cache'))) {
    return 'unhealthy'
  }
  if (checks.some((c) => c.status === 'down' || c.status === 'degraded')) {
    return 'degraded'
  }
  return 'healthy'
}

/** Liveness — is the process itself up? No dependency checks; must return instantly. */
export async function handleLivenessCheck(): Promise<Response> {
  return new Response(JSON.stringify({ status: 'alive' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Readiness — are we ready to serve traffic? Checks the two things that gate almost every request: DB and cache. */
export async function handleReadinessCheck(): Promise<Response> {
  const checks = await Promise.all([checkDatabase(), checkCache()])
  const status = summarize(checks)
  const report: HealthReport = { status, timestamp: new Date().toISOString(), checks }
  return new Response(JSON.stringify(report), {
    status: status === 'unhealthy' ? 503 : 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Full report — DB + cache + every external service's config status.
 * This reveals which providers you use, so it's gated behind a shared
 * secret header rather than being fully public. Set HEALTH_CHECK_SECRET
 * in production; if it's unset (e.g. local dev) the check is left open.
 */
export async function handleFullHealthCheck(event: RequestEvent): Promise<Response> {
  const expectedToken = process.env.HEALTH_CHECK_SECRET
  if (expectedToken) {
    const providedToken = event.request.headers.get('x-health-token')
    if (providedToken !== expectedToken) {
      // 404, not 401/403 — don't confirm this endpoint even exists to an unauthenticated scanner.
      return new Response(null, { status: 404 })
    }
  }

  const [db, cache, services] = await Promise.all([checkDatabase(), checkCache(), checkExternalServices()])
  const checks = [db, cache, ...services]
  const status = summarize(checks)
  const report: HealthReport = { status, timestamp: new Date().toISOString(), checks }
  return new Response(JSON.stringify(report), {
    status: status === 'unhealthy' ? 503 : 200,
    headers: { 'Content-Type': 'application/json' },
  })
}