// src/lib/server/auth/verification.ts
// Email verification tokens

import { getPrismaClient } from '$lib/server/db/index.js'
import { hashOtp } from '$lib/security/dataProtection'
import { generateOtp } from './reset.js'

const VERIFICATION_TOKEN_TTL_MINUTES = 24 * 60 // 24 hours
const RESEND_COOLDOWN_MINUTES = 5
const MAX_RESENDS_PER_DAY = 5

/**
 * Check if a user can request email verification
 */
export async function canResendVerification(
  userId: string,
): Promise<{ allowed: boolean; reason?: string; cooldownMinutes?: number }> {
  const prisma = await getPrismaClient()

  // Count verifications in the last 24 hours for this user
  const recentCount = await prisma.verification.count({
    where: {
      identifier: { startsWith: `email:${userId}:` },
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  })

  if (recentCount >= MAX_RESENDS_PER_DAY) {
    return {
      allowed: false,
      reason: `You've reached the maximum of ${MAX_RESENDS_PER_DAY} verification emails per day. Please try again tomorrow.`,
      cooldownMinutes: 24 * 60,
    }
  }

  const last = await prisma.verification.findFirst({
    where: {
      identifier: { startsWith: `email:${userId}:` },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (last) {
    const minutesSince = (Date.now() - last.createdAt.getTime()) / (60 * 1000)
    if (minutesSince < RESEND_COOLDOWN_MINUTES) {
      const remaining = Math.ceil(RESEND_COOLDOWN_MINUTES - minutesSince)
      return {
        allowed: false,
        reason: `Please wait ${remaining} minute${remaining > 1 ? 's' : ''} before requesting another verification email.`,
        cooldownMinutes: remaining,
      }
    }
  }

  return { allowed: true }
}

/**
 * Create an email verification token
 * Returns the plaintext OTP code (to be emailed)
 */
export async function createVerificationToken(userId: string): Promise<string> {
  const prisma = await getPrismaClient()
  const code = generateOtp()
  const tokenHash = await hashOtp(code)
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000)

  // Delete old unconsumed verification tokens for this user
  await prisma.verification.deleteMany({
    where: {
      identifier: { startsWith: `email:${userId}:` },
    },
  })

  // Store with identifier pattern: "email:{userId}:{timestamp}" for uniqueness
  await prisma.verification.create({
    data: {
      identifier: `email:${userId}:${Date.now()}`,
      value: tokenHash, // Store hash of the code
      expiresAt,
    },
  })

  return code
}

/**
 * Verify an email verification code
 * Returns { valid: true, userId } or { valid: false, error }
 */
export async function verifyVerificationCode(
  code: string,
): Promise<{ valid: boolean; error?: string; userId?: string }> {
  const prisma = await getPrismaClient()
  const codeHash = await hashOtp(code)

  // Find active verification record
  const record = await prisma.verification.findFirst({
    where: {
      identifier: { startsWith: 'email:' },
      value: codeHash,
      expiresAt: { gt: new Date() }, // Not expired
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) {
    return { valid: false, error: 'Invalid or expired verification code.' }
  }

  // Extract userId from identifier pattern: "email:{userId}:{timestamp}"
  const match = record.identifier.match(/^email:([^:]+):/)
  const userId = match?.[1]

  if (!userId) {
    return { valid: false, error: 'Invalid verification record.' }
  }

  return { valid: true, userId }
}

/**
 * Mark a verification code as consumed
 * Returns { success: true } or { success: false, error }
 */
export async function consumeVerificationCode(
  code: string,
): Promise<{ success: boolean; error?: string }> {
  const prisma = await getPrismaClient()
  const codeHash = await hashOtp(code)

  try {
    const record = await prisma.verification.findFirst({
      where: {
        value: codeHash,
        expiresAt: { gt: new Date() },
      },
    })

    if (!record) {
      return { success: false, error: 'Verification code not found.' }
    }

    // Extract userId from identifier
    const match = record.identifier.match(/^email:([^:]+):/)
    const userId = match?.[1]

    if (!userId) {
      return { success: false, error: 'Invalid verification record.' }
    }

    // Update user's emailVerified flag and delete verification record
    await prisma.$transaction(async (tx: typeof prisma) => {
      // Mark email as verified
      await tx.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      })

      // Delete the verification record
      await tx.verification.delete({
        where: { id: record.id },
      })
    })

    return { success: true }
  } catch (error) {
    console.error('[verification] Error consuming code:', error)
    return { success: false, error: 'Unable to verify email. Please try again.' }
  }
}

/**
 * Clean up expired verification tokens
 * Should be called by a scheduled job
 */
export async function cleanupExpiredVerifications(): Promise<number> {
  const prisma = await getPrismaClient()

  const result = await prisma.verification.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })

  return result.count
}

/**
 * Get verification token expiry time in minutes
 */
export function getVerificationTokenExpiryMinutes(): number {
  return VERIFICATION_TOKEN_TTL_MINUTES
}

/**
 * Get resend rate limit info
 */
export function getResendRateLimitInfo(): { cooldownMinutes: number; maxPerDay: number } {
  return {
    cooldownMinutes: RESEND_COOLDOWN_MINUTES,
    maxPerDay: MAX_RESENDS_PER_DAY,
  }
}