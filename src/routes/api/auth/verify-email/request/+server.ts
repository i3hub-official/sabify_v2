// src/routes/api/auth/verify-email/request/+server.ts
// Request email verification — sends OTP via email

import { json } from '@sveltejs/kit'
import type { RequestHandler } from '@sveltejs/kit'
import { canResendVerification, createVerificationToken } from '$lib/server/auth/verification'
import { sendVerificationEmail } from '$lib/services/email.service'

export const POST: RequestHandler = async ({ locals }) => {
  try {
    if (!locals.user) {
      return json(
        { error: 'You must be logged in to verify your email.' },
        { status: 401 }
      )
    }

    const userId = locals.user.id

    // ── Check rate limits ────────────────────────────────────────────────
    const canResend = await canResendVerification(userId)
    if (!canResend.allowed) {
      return json(
        {
          error: canResend.reason,
          cooldownMinutes: canResend.cooldownMinutes,
        },
        { status: 429 }
      )
    }

    // ── Generate verification code & send email ──────────────────────────
    try {
      const code = await createVerificationToken(userId)

      await sendVerificationEmail({
        email: locals.user.email, // This is encrypted; decrypt if needed
        code,
        expiryMinutes: 24 * 60, // 24 hours
      })

      return json({
        success: true,
        message: 'Verification code has been sent to your email.',
      })
    } catch (emailError) {
      console.error('[verify-email/request] Email send error:', emailError)
      return json({
        success: true,
        message: 'Verification code has been sent to your email.',
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[verify-email/request] Error:', message)

    return json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}