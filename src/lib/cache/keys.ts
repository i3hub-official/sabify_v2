// src/lib/cache/keys.ts
// Centralized cache key builders + TTLs, so a key's format is never
// duplicated (and re-typed slightly differently) at each call site —
// a mismatched key format between the writer and reader is a silent,
// hard-to-debug cache-miss bug.

export const TTL = {
  SHORT: 60,           // 1 minute — volatile data (rate limit windows, OTP state)
  MEDIUM: 60 * 15,      // 15 minutes — search results, dashboard stats
  LONG: 60 * 60 * 6,    // 6 hours — mostly-static reference data (universities, courses)
  DAY: 60 * 60 * 24,    // 1 day — feature flags, rarely-changing config
} as const

export const cacheKeys = {
  session: (token: string) => `session:${token}`,

  university: (id: string) => `university:${id}`,
  universitySearch: (query: string) => `search:university:${query.toLowerCase().trim()}`,
  courseSearch: (query: string, departmentId?: number, level?: number) =>
    `search:course:${query.toLowerCase().trim()}:${departmentId ?? '*'}:${level ?? '*'}`,
  programSearch: (query: string, collegeId?: number) =>
    `search:program:${query.toLowerCase().trim()}:${collegeId ?? '*'}`,

  adminScope: (userId: string) => `admin-scope:${userId}`,

  rateLimit: (bucket: string, identifier: string) => `rate-limit:${bucket}:${identifier}`,

  featureFlag: (flagName: string) => `feature-flag:${flagName}`,

  dashboardStats: (userId: string) => `dashboard-stats:${userId}`,

  paymentVerify: (reference: string) => `payment-verify:${reference}`,
} as const