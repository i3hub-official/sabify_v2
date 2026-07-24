// src/routes/api/auth/password-reset/confirm/+server.ts
// Confirm password reset — verify OTP code and set new password

import { json } from '@sveltejs/kit'
import type { RequestHandler } from '@sveltejs/kit'
import { verifyResetToken, consumeResetToken } from '$lib/server/auth/reset'
import { hashPassword, validatePasswordStrength } from '$lib/server/auth'
import { getPrismaClient } from '$lib/server/db/index.js'

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json()
    const { code, newPassword, confirmPassword } = body

    // ── Validation ───────────────────────────────────────────────────────
    if (!code) {
      return json(
        { error: 'Reset code is required.' },
        { status: 400 }
      )
    }

    if (!newPassword) {
      return json(
        { error: 'New password is required.' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return json(
        { error: 'Passwords do not match.' },
        { status: 400 }
      )
    }

    // ── Check password strength ──────────────────────────────────────────
    const strengthError = validatePasswordStrength(newPassword)
    if (strengthError) {
      return json(
        { error: strengthError },
        { status: 400 }
      )
    }

    // ── Verify reset code ────────────────────────────────────────────────
    const codeCheck = await verifyResetToken(code)
    if (!codeCheck.valid || !codeCheck.userId) {
      return json(
        { error: codeCheck.error || 'Invalid or expired reset code.' },
        { status: 400 }
      )
    }

    // ── Update password & consume token ──────────────────────────────────
    const prisma = await getPrismaClient()
    const passwordHash = await hashPassword(newPassword)

    try {
      await prisma.$transaction(async (tx) => {
        // Update user password
        await tx.user.update({
          where: { id: codeCheck.userId },
          data: { passwordHash },
        })
      })

      // Mark token as used (after transaction succeeds)
      await consumeResetToken(code)

      return json({
        success: true,
        message: 'Your password has been reset successfully. Please log in.',
      })
    } catch (dbError) {
      console.error('[password-reset/confirm] Database error:', dbError)
      return json(
        { error: 'Unable to reset password. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[password-reset/confirm] Error:', message)

    return json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}