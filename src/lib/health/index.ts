// src/lib/health/index.ts

export { checkDatabase, checkCache, checkExternalServices } from './checks.js'
export type { CheckResult, CheckStatus } from './checks.js'

export { handleLivenessCheck, handleReadinessCheck, handleFullHealthCheck } from './endpoints.js'
export type { HealthReport } from './endpoints.js'