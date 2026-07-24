// src/lib/middleware/audit-log.ts
// Audit logging for admin/mutating actions — now backed by the real
// AuditLog model (see schema-audit-featureflag-patch.prisma) instead of
// console-only output.

import { type Handle, type RequestEvent } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'

export interface AuditEvent {
  actorId?: string | null
  action: string
  resource: string
  resourceId?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
}

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const prisma = await getPrismaClient()
    await prisma.auditLog.create({
      data: {
        actorId: event.actorId ?? null,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId ?? null,
        metadata: event.metadata as any,
        ipAddress: event.ipAddress ?? null,
      },
    })
  } catch (error) {
    // A failed audit write must never take down the request that
    // triggered it — but the event shouldn't just vanish either. Falling
    // back to structured console output means it still reaches whatever
    // log aggregator is watching stdout even if Postgres is briefly down.
    console.error('[middleware/audit-log] DB write failed, falling back to console:', error)
    console.log(
      JSON.stringify({ type: 'audit_event_fallback', timestamp: new Date().toISOString(), ...event }),
    )
  }
}

export interface AuditLogFilters {
  actorId?: string
  action?: string
  resource?: string
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
}

/** Powers the /admin/audit and /owner/audit pages from rbac/ui.ts. */
export async function listAuditLogs(filters: AuditLogFilters = {}) {
  const prisma = await getPrismaClient()
  const { actorId, action, resource, from, to, page = 1, pageSize = 50 } = filters

  const where = {
    ...(actorId ? { actorId } : {}),
    ...(action ? { action: { contains: action, mode: 'insensitive' as const } } : {}),
    ...(resource ? { resource } : {}),
    ...(from || to
      ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  }

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  return { entries, total, page, pageSize }
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Never log full detail for these — payment and auth payloads carry
// secrets/PII that don't belong in a log stream.
const SENSITIVE_PATH_PREFIXES = ['/api/payments', '/signin', '/signup', '/reset-password']

function getClientIp(event: RequestEvent): string {
  return (
    event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    event.request.headers.get('cf-connecting-ip') ||
    event.getClientAddress()
  )
}

/**
 * Global Handle that records a coarse audit trail entry for every
 * mutating request an authenticated user makes. Route/resource-specific
 * detail (what actually changed, before/after values) still belongs in a
 * targeted logAuditEvent() call inside the action itself — this only
 * guarantees "someone did something to something" is never silently
 * unlogged.
 */
export const auditLogMiddleware: Handle = async ({ event, resolve }) => {
  const response = await resolve(event)

  if (MUTATING_METHODS.has(event.request.method) && event.locals.user) {
    const isSensitive = SENSITIVE_PATH_PREFIXES.some((p) => event.url.pathname.startsWith(p))
    logAuditEvent({
      actorId: event.locals.user.id,
      action: `${event.request.method} ${event.url.pathname}`,
      resource: isSensitive ? 'redacted' : event.url.pathname,
      ipAddress: getClientIp(event),
    }).catch((err) => console.error('[middleware/audit-log] failed to log:', err))
  }

  return response
}