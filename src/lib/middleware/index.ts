// src/lib/middleware/index.ts
// Central export + the composed Handle chain that hooks.server.ts uses.

import { sequence } from '@sveltejs/kit/hooks'
import type { Handle } from '@sveltejs/kit'
import { sessionMiddleware } from './auth.js'
import { rateLimitMiddleware } from './rate-limit.js'
import { auditLogMiddleware } from './audit-log.js'

export { sessionMiddleware } from './auth.js'
export { rateLimitMiddleware, checkActionRateLimit } from './rate-limit.js'
export { auditLogMiddleware, logAuditEvent, listAuditLogs } from './audit-log.js'
export {
  isFeatureEnabled,
  requireFeatureFlag,
  listFeatureFlags,
  setFeatureFlag,
  deleteFeatureFlag,
} from './feature-flag.js'
export { validateJsonBody, validateFormData, validateSearchParams } from './validation.js'

/**
 * The global request pipeline, in order:
 *   1. sessionMiddleware   — hydrate locals.user/session from the cookie
 *   2. rateLimitMiddleware — reject over-limit clients before hitting the DB
 *   3. auditLogMiddleware  — record mutating requests after they resolve
 *
 * feature-flag.ts and validation.ts are intentionally excluded from this
 * chain — they're per-route helpers (different routes need different
 * flags/schemas), not global concerns, so they're called directly from
 * whichever +page.server.ts / +server.ts needs them.
 */
export const handle: Handle = sequence(sessionMiddleware, rateLimitMiddleware, auditLogMiddleware)