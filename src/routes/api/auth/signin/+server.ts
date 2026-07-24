// src/routes/api/auth/signin/+server.ts
// Login endpoint — validates email/password, creates session, returns token

import { json } from '@sveltejs/kit'
import type { RequestHandler } from '@sveltejs/kit'
import {
  findUserByEmail,
  verifyPassword,
  createUserSession,
  USER_COOKIE,
  cookieOptions,
} from '$lib/server/auth/index.js'
import { revealEmail, revealName } from '$lib/security/dataProtection.js'
import { checkActionRateLimit } from '$lib/middleware/rate-limit.js'

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Request body must be valid JSON' }, { status: 400 })
    }

    const { email, password } = body

    // ── Validation ───────────────────────────────────────────────────────
    if (!email || !password) {
      return json({ error: 'Email and password are required.' }, { status: 400 })
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return json({ error: 'Email and password must be strings.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // ── Rate limiting ────────────────────────────────────────────────────
    // Prevent brute force: max 5 attempts per email per minute
    const rateLimitResult = await checkActionRateLimit('signin', normalizedEmail, 5, 60)
    if (!rateLimitResult.allowed) {
      return json(
        {
          error: 'Too many signin attempts. Please try again later.',
          remaining: rateLimitResult.remaining,
        },
        { status: 429 },
      )
    }

    // ── Find user ────────────────────────────────────────────────────────
    const user = await findUserByEmail(normalizedEmail)
    if (!user) {
      // Don't reveal whether email exists
      return json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    // ── Check suspension ─────────────────────────────────────────────────
    if (user.isSuspended) {
      return json(
        {
          error: 'This account has been suspended. Please contact support.',
          suspended: true,
        },
        { status: 403 },
      )
    }

    // ── Verify password ──────────────────────────────────────────────────
    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      return json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    // ── Create session ───────────────────────────────────────────────────
    try {
      const { token, refreshToken } = await createUserSession(user.id, {
        ipAddress:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('cf-connecting-ip') ||
          getClientAddress(),
        userAgent: request.headers.get('user-agent') || undefined,
      })

      // Set HTTP-only cookie
      cookies.set(USER_COOKIE, token, {
        ...cookieOptions,
        secure: process.env.NODE_ENV === 'production',
      })

      // ── Decrypt PII for response ──────────────────────────────────────
      // user.email holds the fixed-IV encrypted ciphertext (not the hash).
      // user.firstName / surname / otherName are also encrypted ciphertext.
      // All reveal* functions are synchronous — no await needed.
      const decryptedEmail     = revealEmail(user.email)
      const decryptedFirstName = revealName(user.firstName)
      const decryptedSurname   = revealName(user.surname)
      const decryptedOtherName = user.otherName ? revealName(user.otherName) : null

      return json(
        {
          success: true,
          user: {
            id:           user.id,
            email:        decryptedEmail,
            firstName:    decryptedFirstName,
            otherName:    decryptedOtherName,
            surname:      decryptedSurname,
            role:         user.role,
            emailVerified: user.emailVerified,
            isVerified:   user.isVerified,
            nameArranged: user.nameArranged,
            universityId: user.universityId,
            departmentId: user.departmentId,
            adminProfile: user.adminProfile,
          },
          token,
          refreshToken,
        },
        { status: 200 },
      )
    } catch (sessionError) {
      console.error('[signin] Session creation error:', sessionError)
      return json({ error: 'Unable to create session. Please try again.' }, { status: 500 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[signin] Unexpected error:', message)
    return json(
      { error: 'An error occurred during login. Please try again.' },
      { status: 500 },
    )
  }
}