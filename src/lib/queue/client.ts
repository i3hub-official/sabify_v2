// src/lib/queue/client.ts
// Database-backed job queue — persists jobs in Postgres via the `job`
// table so they survive server restarts and hot reloads.
//
// Architecture:
//   • Producers call enqueue() to insert a job row with status PENDING.
//   • Workers call dequeue() inside a Prisma $transaction with a
//     SELECT FOR UPDATE SKIP LOCKED so two concurrent workers never
//     claim the same job (Postgres-level mutual exclusion, no extra infra).
//   • On success the worker calls complete(). On failure it calls fail(),
//     which increments attempts and reschedules (up to maxAttempts) with
//     exponential backoff, then marks FAILED permanently.
//   • A processJobs() loop runs per job type — each worker imports it
//     and starts its own polling loop via startWorker().
//
// To swap in BullMQ or another queue later, replace enqueue/dequeue/
// complete/fail — the producer/worker files stay the same.
//
// SERVER-ONLY: never import from a .svelte file.

import { getPrismaClient } from '$lib/server/db/index.js'

// ── Job types ─────────────────────────────────────────────────────────────────

export type JobType =
  | 'email.verification'
  | 'email.password_reset'
  | 'email.welcome'
  | 'sms.alert'
  | 'sms.otp'
  | 'notification.push_alert'
  | 'image.process'
  | 'image.delete'
  | 'qr.generate_receipt'

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

// ── Job payloads — one interface per JobType ──────────────────────────────────

export interface EmailVerificationPayload {
  email: string
  code: string
  expiryMinutes: number
}

export interface EmailPasswordResetPayload {
  email: string
  code: string
  expiryMinutes: number
}

export interface EmailWelcomePayload {
  email: string
  firstName: string
}

export interface SmsAlertPayload {
  to: string
  message: string
}

export interface SmsOtpPayload {
  to: string
}

export interface NotificationPushAlertPayload {
  userIds: string[]
  title: string
  body: string
  data?: Record<string, string>
}

export interface ImageProcessPayload {
  documentId: number   // VaultDocument.id
  fileData: string     // base64 data URI or remote URL
  folder: string       // e.g. "vault/courseId/LECTURE_NOTE"
  resourceType?: 'image' | 'raw' | 'video' | 'auto'
}

export interface ImageDeletePayload {
  publicId: string
  resourceType?: 'image' | 'raw' | 'video'
}

export interface QrGenerateReceiptPayload {
  paymentId: number
  receiptNumber: string
  verifyHash: string
}

// Discriminated union mapping type → payload
export type JobPayloadMap = {
  'email.verification':      EmailVerificationPayload
  'email.password_reset':    EmailPasswordResetPayload
  'email.welcome':           EmailWelcomePayload
  'sms.alert':               SmsAlertPayload
  'sms.otp':                 SmsOtpPayload
  'notification.push_alert': NotificationPushAlertPayload
  'image.process':           ImageProcessPayload
  'image.delete':            ImageDeletePayload
  'qr.generate_receipt':     QrGenerateReceiptPayload
}

// ── Internal DB row shape (mirrors the Job Prisma model) ─────────────────────

export interface JobRow {
  id:          string
  type:        string
  payload:     unknown
  status:      JobStatus
  attempts:    number
  maxAttempts: number
  runAt:       Date
  createdAt:   Date
  updatedAt:   Date
  error:       string | null
}

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULTS = {
  maxAttempts:      3,
  pollIntervalMs:   2_000,  // how often each worker polls for new jobs
  lockTimeoutMs:    30_000, // jobs stuck PROCESSING longer than this are re-queued on next poll
} as const

// ── Core queue operations ─────────────────────────────────────────────────────

/**
 * Insert a new job. Returns the created job row.
 * `runAt` defaults to now; pass a future Date to schedule.
 */
export async function enqueue<T extends JobType>(
  type: T,
  payload: JobPayloadMap[T],
  options: { maxAttempts?: number; runAt?: Date } = {},
): Promise<JobRow> {
  const prisma = await getPrismaClient()
  const job = await prisma.job.create({
    data: {
      type,
      payload: payload as object,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: options.maxAttempts ?? DEFAULTS.maxAttempts,
      runAt: options.runAt ?? new Date(),
    },
  })
  return job as unknown as JobRow
}

/**
 * Claim one PENDING job of the given type using SELECT FOR UPDATE SKIP LOCKED
 * so concurrent workers never collide. Returns null when the queue is empty.
 *
 * The raw SQL is necessary because Prisma doesn't expose SKIP LOCKED natively.
 * The transaction is committed immediately after the UPDATE so the lock is
 * released — the worker then does its work and calls complete() or fail().
 */
export async function dequeue(type: JobType): Promise<JobRow | null> {
  const prisma = await getPrismaClient()
  const now = new Date()
  const lockCutoff = new Date(now.getTime() - DEFAULTS.lockTimeoutMs)

  const rows = await prisma.$transaction(async (tx) => {
    // Re-queue jobs that have been stuck PROCESSING past the lock timeout
    // (handles crashed workers that never called complete/fail).
    await tx.$executeRaw`
      UPDATE "job"
      SET    status = 'PENDING', "updatedAt" = NOW()
      WHERE  type = ${type}
        AND  status = 'PROCESSING'
        AND  "updatedAt" < ${lockCutoff}
        AND  attempts < "maxAttempts"
    `

    // Claim one PENDING job atomically
    const claimed = await tx.$queryRaw<JobRow[]>`
      UPDATE "job"
      SET    status = 'PROCESSING', "updatedAt" = NOW()
      WHERE  id = (
        SELECT id FROM "job"
        WHERE  type   = ${type}
          AND  status = 'PENDING'
          AND  "runAt" <= NOW()
        ORDER BY "runAt" ASC
        LIMIT  1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `
    return claimed
  })

  return rows[0] ?? null
}

/**
 * Mark a job as successfully completed.
 */
export async function complete(jobId: string): Promise<void> {
  const prisma = await getPrismaClient()
  await prisma.job.update({
    where: { id: jobId },
    data:  { status: 'COMPLETED', updatedAt: new Date() },
  })
}

/**
 * Record a failure. If attempts < maxAttempts, reschedules with
 * exponential backoff (2^attempts * 10 s). Otherwise marks FAILED.
 */
export async function fail(jobId: string, error: unknown): Promise<void> {
  const prisma = await getPrismaClient()
  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) return

  const attempts    = job.attempts + 1
  const errorMsg    = error instanceof Error ? error.message : String(error)
  const exhausted   = attempts >= job.maxAttempts
  const backoffMs   = Math.pow(2, attempts) * 10_000 // 20s, 40s, 80s …
  const runAt       = new Date(Date.now() + backoffMs)

  await prisma.job.update({
    where: { id: jobId },
    data: {
      attempts,
      error:     errorMsg,
      status:    exhausted ? 'FAILED' : 'PENDING',
      runAt:     exhausted ? job.runAt : runAt,
      updatedAt: new Date(),
    },
  })

  if (exhausted) {
    console.error(`[queue] Job ${jobId} (${job.type}) permanently failed after ${attempts} attempts: ${errorMsg}`)
  }
}

// ── Worker loop ───────────────────────────────────────────────────────────────

export type JobHandler<T extends JobType> = (
  payload: JobPayloadMap[T],
  job: JobRow,
) => Promise<void>

/**
 * Start a polling worker for one job type.
 * Call this once per worker file — it runs until the process exits.
 *
 * Example (in email.worker.ts):
 *   startWorker('email.verification', handleVerificationEmail)
 */
export function startWorker<T extends JobType>(
  type: T,
  handler: JobHandler<T>,
  options: { pollIntervalMs?: number } = {},
): void {
  const interval = options.pollIntervalMs ?? DEFAULTS.pollIntervalMs
  console.log(`[queue] Worker started for job type: ${type} (poll every ${interval}ms)`)

  async function tick() {
    try {
      const job = await dequeue(type)
      if (!job) return // nothing to do

      console.log(`[queue] Processing job ${job.id} (${type}), attempt ${job.attempts + 1}`)

      try {
        await handler(job.payload as JobPayloadMap[T], job)
        await complete(job.id)
        console.log(`[queue] Job ${job.id} completed`)
      } catch (err) {
        await fail(job.id, err)
        console.error(`[queue] Job ${job.id} failed:`, err)
      }
    } catch (err) {
      // dequeue itself threw — log and keep polling
      console.error(`[queue] dequeue error for ${type}:`, err)
    }
  }

  // Run immediately then on interval
  tick()
  setInterval(tick, interval).unref()
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** List jobs by status — useful for admin dashboards / health checks. */
export async function listJobs(
  filter: { type?: JobType; status?: JobStatus } = {},
  limit = 50,
): Promise<JobRow[]> {
  const prisma = await getPrismaClient()
  const rows = await prisma.job.findMany({
    where: {
      ...(filter.type   ? { type:   filter.type   } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return rows as unknown as JobRow[]
}

/** Purge completed jobs older than `olderThanDays` — call from a scheduler. */
export async function purgeCompleted(olderThanDays = 7): Promise<number> {
  const prisma = await getPrismaClient()
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000)
  const { count } = await prisma.job.deleteMany({
    where: { status: 'COMPLETED', updatedAt: { lt: cutoff } },
  })
  return count
}