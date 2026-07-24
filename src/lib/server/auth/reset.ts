// src/lib/server/auth/reset.ts
// Password reset tokens — works with single User model

import { randomInt } from 'crypto'
import { getPrismaClient } from '$lib/server/db/index.js'
import { searchHashFor } from '$lib/security/dataProtection'

const RESET_TOKEN_TTL_MINUTES = 30
const OTP_LENGTH = 6
const RESET_COOLDOWN_MINUTES = 15
const MAX_RESETS_PER_DAY = 3

export function generateOtp(): string {
  // 6-char alphanumeric, uppercase, no ambiguous chars (0/O, 1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < OTP_LENGTH; i++) out += chars[randomInt(chars.length)]
  return out
}

/**
 * Check if a user can request a password reset
 * Returns { allowed: true } or { allowed: false, reason: string, cooldownMinutes?: number }
 */
export async function canRequestReset(email: string): Promise<{ 
  allowed: boolean; 
  reason?: string; 
  cooldownMinutes?: number 
}> {
  const prisma = await getPrismaClient()
  const normalized = email.trim().toLowerCase()
  const emailHash = await searchHashFor(normalized, 'email')
  
  // Find the user
  const user = await prisma.user.findUnique({ where: { emailHash } })
  
  // If no account found, allow the request (will fail at lookup stage anyway)
  if (!user) return { allowed: true }
  
  // Count recent requests (last 24 hours)
  const recentRequests = await prisma.passwordResetToken.count({
    where: {
      userId: user.id,
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    },
  })
  
  if (recentRequests >= MAX_RESETS_PER_DAY) {
    return { 
      allowed: false, 
      reason: `You have reached the maximum of ${MAX_RESETS_PER_DAY} reset requests per day. Please try again tomorrow.`,
      cooldownMinutes: 24 * 60 // Wait until tomorrow
    }
  }
  
  // Check cooldown between requests
  const lastRequest = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
    },
    orderBy: { createdAt: 'desc' },
  })
  
  if (lastRequest) {
    const minutesSinceLast = (Date.now() - lastRequest.createdAt.getTime()) / (60 * 1000)
    if (minutesSinceLast < RESET_COOLDOWN_MINUTES) {
      const remaining = Math.ceil(RESET_COOLDOWN_MINUTES - minutesSinceLast)
      return { 
        allowed: false, 
        reason: `Please wait ${remaining} minute${remaining > 1 ? 's' : ''} before requesting another reset code.`,
        cooldownMinutes: remaining
      }
    }
  }
  
  return { allowed: true }
}

export async function createPasswordReset(user: { id: string }): Promise<string> {
  const prisma = await getPrismaClient()
  const token = generateOtp()
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000)

  // Delete any existing unused reset tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
  })

  // Create new reset token
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  })

  return token // the plaintext token is only ever returned here, to be emailed
}

export async function verifyResetToken(
  token: string,
): Promise<{ valid: boolean; error?: string; userId?: string }> {
  const prisma = await getPrismaClient()
  const record = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!record) {
    return { valid: false, error: 'Invalid or expired verification code.' }
  }
  if (record.usedAt) {
    return { valid: false, error: 'This verification code has already been used. Please request a new one.' }
  }
  if (record.expiresAt < new Date()) {
    return { valid: false, error: 'This verification code has expired. Please request a new one.' }
  }

  return { valid: true, userId: record.userId }
}

export async function consumeResetToken(token: string): Promise<void> {
  const prisma = await getPrismaClient()
  await prisma.passwordResetToken.update({
    where: { token },
    data: { usedAt: new Date() },
  })
}

/**
 * Clean up expired or consumed tokens older than 7 days
 * Should be called by a scheduled job (e.g., cron job)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const prisma = await getPrismaClient()
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
  
  const result = await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { usedAt: { lt: cutoff } },
      ],
    },
  })
  
  return result.count
}

/**
 * Get reset token expiry time in minutes (for display purposes)
 */
export function getResetTokenExpiryMinutes(): number {
  return RESET_TOKEN_TTL_MINUTES
}

/**
 * Get rate limit information for display
 */
export function getRateLimitInfo(): { cooldownMinutes: number; maxPerDay: number } {
  return {
    cooldownMinutes: RESET_COOLDOWN_MINUTES,
    maxPerDay: MAX_RESETS_PER_DAY,
  }
}