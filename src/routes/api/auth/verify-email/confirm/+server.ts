// src/routes/api/auth/verify-email/confirm/+server.ts
// Confirm email verification — verify OTP code and activate email

import { json } from '@sveltejs/kit'
import type { RequestHandler } from '@sveltejs/kit'
import { verifyVerificationCode, consumeVerificationCode } from '$lib/server/auth/verification'

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return json(
        { error: 'You must be logged in to verify your email.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { code } = body

    if (!code) {
      return json(
        { error: 'Verification code is required.' },
        { status: 400 }
      )
    }

    // ── Verify code ──────────────────────────────────────────────────────
    const codeCheck = await verifyVerificationCode(code)
    if (!codeCheck.valid || !codeCheck.userId) {
      return json(
        { error: codeCheck.error || 'Invalid or expired verification code.' },
        { status: 400 }
      )
    }

    // Verify it's the current user's code
    if (codeCheck.userId !== locals.user.id) {
      return json(
        { error: 'This verification code is for a different account.' },
        { status: 400 }
      )
    }

    // ── Consume code & activate email ────────────────────────────────────
    const result = await consumeVerificationCode(code)
    if (!result.success) {
      return json(
        { error: result.error || 'Unable to verify email. Please try again.' },
        { status: 500 }
      )
    }

    return json({
      success: true,
      message: 'Your email has been verified successfully.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[verify-email/confirm] Error:', message)

    return json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}