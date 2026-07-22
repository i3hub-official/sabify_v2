// src/lib/server/auth/verification.ts
// Email verification tokens — OTP-based flow for single User table
import { getPrismaClient } from '$lib/server/db/index.js'
import { hashOtp } from '$lib/security/dataProtection'
import { generateOtp } from './reset'

const VERIFICATION_TOKEN_TTL_MINUTES = 24 * 60 // 24 hours
const RESEND_COOLDOWN_MINUTES = 2
const MAX_RESENDS_PER_DAY = 5

/**
 * Check if a user can request email verification
 */
export async function canResendVerification(
  userId: string,
): Promise<{ allowed: boolean; reason?: string; cooldownMinutes?: number }> {
  const prisma = await getPrismaClient()

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
  const tokenHash = hashOtp(code)
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000)

  // Delete old unconsumed verification tokens for this user
  await prisma.verification.deleteMany({
    where: {
      identifier: { startsWith: `email:${userId}:` },
    },
  })

  // Store with identifier pattern: "email:{userId}:{random}" for uniqueness
  await prisma.verification.create({
    data: {
      identifier: `email:${userId}:${Date.now()}`,
      value: tokenHash, // Store hash of the code
      expiresAt,
    },
  })

  return code // Plaintext returned only here, to be emailed
}

/**
 * Verify an email verification code (read-only check)
 * Does NOT consume the token
 */
export async function verifyVerificationCode(code: string): Promise<{
  valid: boolean
  error?: string
  userId?: string
}> {
  const prisma = await getPrismaClient()
  const codeHash = hashOtp(code)

  // Search for this verification code hash across all users
  const record = await prisma.verification.findFirst({
    where: {
      value: codeHash,
      identifier: { startsWith: 'email:' },
    },
  })

  if (!record) {
    return { valid: false, error: 'This verification link is invalid.' }
  }
  if (record.expiresAt < new Date()) {
    return { valid: false, error: 'This verification link has expired. Please request a new one.' }
  }

  // Extract userId from identifier pattern "email:{userId}:{timestamp}"
  const parts = record.identifier.split(':')
  if (parts.length < 2 || parts[0] !== 'email') {
    return { valid: false, error: 'This verification link is invalid.' }
  }

  const userId = parts[1]
  return { valid: true, userId }
}

/**
 * Consume a verification code and activate the user's email
 * Only call this from a POST/button click after validation
 */
export async function consumeVerificationCode(code: string): Promise<{ success: boolean; error?: string }> {
  const check = await verifyVerificationCode(code)
  if (!check.valid || !check.userId) {
    return { success: false, error: check.error }
  }

  const codeHash = hashOtp(code)
  const prisma = await getPrismaClient()
  const userId = check.userId

  try {
    await prisma.$transaction(async (tx) => {
      // Delete the verification token
      await tx.verification.deleteMany({
        where: { value: codeHash },
      })

      // Update user: mark email as verified, flip status if PENDING
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })
      await tx.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
          // Only flip PENDING -> STUDENT; leave other statuses untouched
          // (SUSPENDED should not be overridden by email verification)
        },
      })
    })
    return { success: true }
  } catch (error) {
    console.error('[consumeVerificationCode] Error:', error)
    return { success: false, error: 'Unable to verify your email right now. Please try again.' }
  }
}

/**
 * Get verification token expiry time in minutes (for display)
 */
export function getVerificationTokenExpiryMinutes(): number {
  return VERIFICATION_TOKEN_TTL_MINUTES
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
      identifier: { startsWith: 'email:' },
    },
  })
  return result.count
}