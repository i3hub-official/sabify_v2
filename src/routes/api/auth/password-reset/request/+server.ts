// src/routes/api/auth/password-reset/request/+server.ts
// Request password reset — sends OTP via email

import { json } from '@sveltejs/kit'
import type { RequestHandler } from '@sveltejs/kit'
import { canRequestReset, createPasswordReset, findUserByEmail } from '$lib/server/auth/reset'
import { sendPasswordResetEmail } from '$lib/services/email.service'

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return json(
        { error: 'Email is required.' },
        { status: 400 }
      )
    }

    // ── Check rate limits ────────────────────────────────────────────────
    const rateCheck = await canRequestReset(email)
    if (!rateCheck.allowed) {
      return json(
        {
          error: rateCheck.reason,
          cooldownMinutes: rateCheck.cooldownMinutes,
        },
        { status: 429 } // Too Many Requests
      )
    }

    // ── Find user ────────────────────────────────────────────────────────
    const user = await findUserByEmail(email)

    // Don't reveal whether account exists (security)
    if (!user) {
      return json({
        success: true,
        message: 'If an account exists, a password reset code has been sent.',
      })
    }

    // ── Generate reset code & send email ─────────────────────────────────
    try {
      const code = await createPasswordReset(user.id)

      // Send email with code
      await sendPasswordResetEmail({
        email,
        code,
        expiryMinutes: 30,
      })

      return json({
        success: true,
        message: 'Password reset code has been sent to your email.',
      })
    } catch (emailError) {
      console.error('[password-reset/request] Email send error:', emailError)
      // Still return success to client (code was created, but email may have failed)
      // Log this for investigation
      return json({
        success: true,
        message: 'If an account exists, a password reset code has been sent.',
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[password-reset/request] Error:', message)

    return json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}