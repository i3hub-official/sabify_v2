// src/routes/api/auth/refresh/+server.ts
// Token refresh endpoint — rotates access token using refresh token

import { json } from '@sveltejs/kit'
import type { RequestHandler } from '@sveltejs/kit'
import { refreshUserSession, USER_COOKIE, cookieOptions } from '$lib/server/auth/index'

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return json(
        { error: 'Refresh token is required.' },
        { status: 400 }
      )
    }

    // ── Refresh the session ──────────────────────────────────────────────
    const result = await refreshUserSession(refreshToken)

    if (!result) {
      // Refresh token invalid or expired — force re-login
      cookies.delete(USER_COOKIE, { path: '/' })
      return json(
        { error: 'Refresh token expired. Please log in again.' },
        { status: 401 }
      )
    }

    // ── Set new cookie ───────────────────────────────────────────────────
    cookies.set(USER_COOKIE, result.token, {
      ...cookieOptions,
      secure: process.env.NODE_ENV === 'production',
    })

    return json({
      success: true,
      token: result.token,
      refreshToken: result.refreshToken,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[refresh] Error:', message)

    return json(
      { error: 'Unable to refresh session.' },
      { status: 500 }
    )
  }
}