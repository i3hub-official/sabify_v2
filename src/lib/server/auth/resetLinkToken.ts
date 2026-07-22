// src/lib/server/auth/resetLinkToken.ts
//
// Signs a compact, tamper-evident token embedded in password-reset email
// links. This token exists purely to let someone go from their inbox to the
// "reveal my code" page — it is NOT a credential and cannot reset a
// password by itself. The actual reset still requires the OTP code to be
// typed back in and validated/consumed against the DB record in
// $lib/server/auth/reset.ts.

import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '$env/dynamic/private'

const SECRET = env.RESET_LINK_SECRET

if (!SECRET) {
  // Fail loud in every environment except local dev, since a missing
  // secret here would mean reset links can't be verified (or worse, would
  // fall back to something guessable).
  if (process.env.NODE_ENV === 'production') {
    throw new Error('RESET_LINK_SECRET environment variable is not set')
  }
  console.warn(
    '[resetLinkToken] RESET_LINK_SECRET is not set — using an insecure dev-only fallback. ' +
      'Set RESET_LINK_SECRET (32+ random bytes) in your environment before deploying.',
  )
}

const EFFECTIVE_SECRET = SECRET || 'dev-only-insecure-secret-change-me'

export interface ResetLinkPayload {
  userId: string
  userType: 'staff' | 'student'
  code: string
  exp: number // unix ms
}

function b64url(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64url')
}

function sign(body: string): string {
  return createHmac('sha256', EFFECTIVE_SECRET).update(body).digest('base64url')
}

export function signResetLink(
  payload: Omit<ResetLinkPayload, 'exp'>,
  ttlMinutes: number,
): string {
  const full: ResetLinkPayload = { ...payload, exp: Date.now() + ttlMinutes * 60 * 1000 }
  const body = b64url(JSON.stringify(full))
  return `${body}.${sign(body)}`
}

export function verifyResetLink(
  token: string,
): { valid: boolean; payload?: ResetLinkPayload; error?: string } {
  const parts = token.split('.')
  if (parts.length !== 2) {
    return { valid: false, error: 'This link is invalid.' }
  }
  const [body, sig] = parts

  const expectedSig = sign(body)
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, error: 'This link is invalid or has been tampered with.' }
  }

  let payload: ResetLinkPayload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'))
  } catch {
    return { valid: false, error: 'This link is invalid.' }
  }

  if (!payload?.userId || !payload.userType || !payload.code || !payload.exp) {
    return { valid: false, error: 'This link is invalid.' }
  }

  if (Date.now() > payload.exp) {
    return { valid: false, error: 'This link has expired. Please request a new password reset.' }
  }

  return { valid: true, payload }
}