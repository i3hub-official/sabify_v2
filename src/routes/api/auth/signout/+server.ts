// src/routes/api/auth/signout/+server.ts
// Signout endpoint — invalidates current session

import { json } from '@sveltejs/kit'
import type { RequestHandler } from '@sveltejs/kit'
import { invalidateUserSession, USER_COOKIE } from '$lib/server/auth/index'

export const POST: RequestHandler = async ({ locals, cookies }) => {
  try {
    // Invalidate the current session
    if (locals.session?.token) {
      await invalidateUserSession(locals.session.token)
    }

    // Clear the session cookie
    cookies.delete(USER_COOKIE, { path: '/' })

    return json({ success: true, message: 'Signed out successfully.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[signout] Error:', message)

    // Still clear cookie even if DB invalidation fails
    cookies.delete(USER_COOKIE, { path: '/' })

    return json(
      { success: false, error: 'Error during signout.' },
      { status: 500 }
    )
  }
}