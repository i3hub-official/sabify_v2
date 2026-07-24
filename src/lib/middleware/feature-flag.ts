// src/lib/middleware/feature-flag.ts
// Feature flag evaluation — now backed by the real FeatureFlag model
// (see schema-audit-featureflag-patch.prisma) instead of env vars, so
// rbac/ui.ts's '/owner/feature-flags' page can actually toggle these at
// runtime without a redeploy.

import { getPrismaClient } from '$lib/server/db/index.js'
import { withCache, invalidateCache } from '$lib/cache/wrappers/cache-wrapper.js'
import { cacheKeys, TTL } from '$lib/cache/keys.js'

export interface FeatureFlagContext {
  userId?: string
  universityId?: string | null
}

interface FeatureFlagRecord {
  key: string
  enabled: boolean
  rolloutPct: number | null
  universityId: string | null
}

/**
 * Deterministic 0-99 bucket for a given (flagKey, userId) pair, so a
 * user's rollout membership is stable across requests instead of
 * re-randomizing on every check.
 */
function bucketFor(flagKey: string, userId: string): number {
  const str = `${flagKey}:${userId}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 100
}

async function loadFlag(flagName: string): Promise<FeatureFlagRecord | null> {
  return withCache(
    cacheKeys.featureFlag(flagName),
    async () => {
      const prisma = await getPrismaClient()
      const flag = await prisma.featureFlag.findUnique({ where: { key: flagName } })
      if (!flag) return null
      return {
        key: flag.key,
        enabled: flag.enabled,
        rolloutPct: flag.rolloutPct,
        universityId: flag.universityId,
      }
    },
    // Short enough that toggling a flag from /owner/feature-flags takes
    // effect quickly — this is mutable admin-controlled data now, not a
    // redeploy-only env var, so TTL.DAY (the old assumption) would be
    // far too sticky.
    { ttlSeconds: TTL.MEDIUM },
  )
}

export async function isFeatureEnabled(flagName: string, context: FeatureFlagContext = {}): Promise<boolean> {
  const flag = await loadFlag(flagName)
  if (!flag || !flag.enabled) return false

  // Scoped to one university — off for everyone else.
  if (flag.universityId && flag.universityId !== context.universityId) return false

  // Percentage rollout — stable per user. Falls back to "on" if there's
  // no userId to bucket on (e.g. an anonymous request), since there's no
  // stable identity to gate against.
  if (flag.rolloutPct != null && flag.rolloutPct < 100) {
    if (!context.userId) return true
    return bucketFor(flag.key, context.userId) < flag.rolloutPct
  }

  return true
}

/**
 * SvelteKit load-function helper: throws a 404 if the flag is off, so a
 * whole route can be gated behind a flag in one line.
 */
export async function requireFeatureFlag(flagName: string, context?: FeatureFlagContext): Promise<void> {
  const { error } = await import('@sveltejs/kit')
  if (!(await isFeatureEnabled(flagName, context))) {
    throw error(404, 'Not found')
  }
}

// ── Admin management (powers /owner/feature-flags) ──────────────────────────

export interface FeatureFlagInput {
  key: string
  enabled: boolean
  description?: string
  rolloutPct?: number | null
  universityId?: string | null
  createdById?: string | null
}

export async function listFeatureFlags() {
  const prisma = await getPrismaClient()
  return prisma.featureFlag.findMany({ orderBy: { key: 'asc' } })
}

export async function setFeatureFlag(input: FeatureFlagInput) {
  const prisma = await getPrismaClient()
  const flag = await prisma.featureFlag.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      enabled: input.enabled,
      description: input.description,
      rolloutPct: input.rolloutPct ?? null,
      universityId: input.universityId ?? null,
      createdById: input.createdById ?? null,
    },
    update: {
      enabled: input.enabled,
      description: input.description,
      rolloutPct: input.rolloutPct ?? null,
      universityId: input.universityId ?? null,
    },
  })
  await invalidateCache(cacheKeys.featureFlag(input.key))
  return flag
}

export async function deleteFeatureFlag(key: string): Promise<void> {
  const prisma = await getPrismaClient()
  await prisma.featureFlag.delete({ where: { key } })
  await invalidateCache(cacheKeys.featureFlag(key))
}