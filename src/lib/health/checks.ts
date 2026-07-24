// src/lib/health/checks.ts
// Individual health checks. Kept cheap — /health/ready can be hit
// frequently by load balancers/uptime monitors, so no heavy queries here.

import { getPrismaClient } from '$lib/server/db/index.js'
import { checkAllServices } from '$lib/services/index.js'
import { pingCache } from '$lib/cache/client.js'

export type CheckStatus = 'up' | 'down' | 'degraded'

export interface CheckResult {
  name: string
  status: CheckStatus
  latencyMs?: number
  error?: string
}

export async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now()
  try {
    const prisma = await getPrismaClient()
    await prisma.$queryRaw`SELECT 1`
    return { name: 'database', status: 'up', latencyMs: Date.now() - start }
  } catch (error) {
    return {
      name: 'database',
      status: 'down',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function checkCache(): Promise<CheckResult> {
  const start = Date.now()
  try {
    const ok = await pingCache()
    return { name: 'cache', status: ok ? 'up' : 'down', latencyMs: Date.now() - start }
  } catch (error) {
    return {
      name: 'cache',
      status: 'down',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * External services (email/sms/storage/payment/search/notification) are
 * optional integrations, not hard dependencies — an unconfigured payment
 * gateway in staging isn't an "outage", so it's reported as "degraded"
 * rather than "down" (which summarize() in endpoints.ts treats as fine
 * for overall readiness, unlike a real "down").
 */
export async function checkExternalServices(): Promise<CheckResult[]> {
  const results = await checkAllServices()
  return Object.entries(results).map(([name, available]) => ({
    name,
    status: available ? 'up' : 'degraded',
  }))
}