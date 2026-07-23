// src/routes/api/auth/signin/+server.ts
// Login endpoint — validates email/password, creates session

import { json } from '@sveltejs/kit'
import type { RequestHandler } from '@sveltejs/kit'
import { findUserByEmail, verifyPassword, createSession, USER_COOKIE, cookieOptions } from '$lib/server/auth/index'
import { revealEmail, revealName } from '$lib/security/dataProtection'

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  try {
    const body = await request.json()
    const { email, password } = body

    // ── Validation ───────────────────────────────────────────────────────
    if (!email || !password) {
      return json(
        { error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    // ── Find user ────────────────────────────────────────────────────────
    const user = await findUserByEmail(email)
    if (!user) {
      // Don't reveal whether email exists (security best practice)
      return json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    // ── Check suspension ─────────────────────────────────────────────────
    if (user.isSuspended) {
      return json(
        {
          error: 'This account has been suspended. Please contact support.',
          suspended: true,
        },
        { status: 403 }
      )
    }

    // ── Verify password ──────────────────────────────────────────────────
    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      return json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    // ── Create session ───────────────────────────────────────────────────
    try {
      // Can't use createSession wrapper (needs SvelteKit event)
      // So create session manually and set cookie
      const { token, refreshToken } = await createUserSession(user.id, {
        ipAddress: request.headers.get('x-forwarded-for') ||
                   request.headers.get('cf-connecting-ip') ||
                   undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      })

      // Set HTTP-only cookie
      cookies.set(USER_COOKIE, token, {
        ...cookieOptions,
        secure: process.env.NODE_ENV === 'production',
      })

      // Decrypt PII for response
      const decryptedEmail = revealEmail(user.email)
      const decryptedFirstName = revealName(user.firstName)
      const decryptedSurname = revealName(user.surname)
      const decryptedOtherName = user.otherName ? revealName(user.otherName) : null

      return json({
        success: true,
        user: {
          id: user.id,
          email: decryptedEmail,
          firstName: decryptedFirstName,
          otherName: decryptedOtherName,
          surname: decryptedSurname,
          role: user.role,
          emailVerified: user.emailVerified,
          isVerified: user.isVerified,
          nameArranged: user.nameArranged,
          universityId: user.universityId,
          departmentId: user.departmentId,
          adminProfile: user.adminProfile,
        },
        token,
        refreshToken,
      })
    } catch (sessionError) {
      console.error('[signin] Session creation error:', sessionError)
      return json(
        { error: 'Unable to create session. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[signin] Error:', message)

    return json(
      { error: 'An error occurred during login. Please try again.' },
      { status: 500 }
    )
  }
}

// Import helper (add this to your auth/index.ts exports)
function createUserSession(userId: string, meta: any) {
  // This is imported from $lib/server/auth/index
  // Just placeholder here — actual function defined in index.ts
  throw new Error('Import createUserSession from $lib/server/auth/index')
}