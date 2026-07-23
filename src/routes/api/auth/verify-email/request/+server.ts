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

// ─────────────────────────────────────────────────────────────────────────

// src/routes/api/auth/verify-email/confirm/+server.ts
// Confirm email verification — verify OTP code and activate email

import { json as json2 } from '@sveltejs/kit'
import type { RequestHandler as RequestHandler2 } from '@sveltejs/kit'
import { verifyVerificationCode, consumeVerificationCode } from '$lib/server/auth/verification'

export const POST: RequestHandler2 = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return json2(
        { error: 'You must be logged in to verify your email.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { code } = body

    if (!code) {
      return json2(
        { error: 'Verification code is required.' },
        { status: 400 }
      )
    }

    // ── Verify code ──────────────────────────────────────────────────────
    const codeCheck = await verifyVerificationCode(code)
    if (!codeCheck.valid || !codeCheck.userId) {
      return json2(
        { error: codeCheck.error || 'Invalid or expired verification code.' },
        { status: 400 }
      )
    }

    // Verify it's the current user's code
    if (codeCheck.userId !== locals.user.id) {
      return json2(
        { error: 'This verification code is for a different account.' },
        { status: 400 }
      )
    }

    // ── Consume code & activate email ────────────────────────────────────
    try {
      await consumeVerificationCode(code)

      return json2({
        success: true,
        message: 'Your email has been verified successfully.',
      })
    } catch (error) {
      console.error('[verify-email/confirm] Consumption error:', error)
      return json2(
        { error: 'Unable to verify email. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[verify-email/confirm] Error:', message)

    return json2(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}