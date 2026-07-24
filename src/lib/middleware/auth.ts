// src/lib/middleware/auth.ts
// Session hydration — the same logic that lived inline in
// hooks.server.ts, extracted so it composes with the other middleware via
// sequence() and can be reasoned about (or tested) on its own.
//
// BUG FIXED FROM THE ORIGINAL: `event.cookies.delete(USER_COOKIE)` was
// called with no options object. SvelteKit's Cookies.delete() requires a
// `path` matching the one the cookie was set with (auth/index.ts's
// cookieOptions.path is '/') — calling delete() without it either throws
// or silently fails to clear the cookie depending on your SvelteKit
// version, meaning a user whose session token turned invalid would keep
// sending the same bad cookie on every subsequent request forever.

import { type Handle } from '@sveltejs/kit'
import { USER_COOKIE, getUserByToken } from '$lib/server/auth/index.js'
import type { AuthenticatedUser, AuthSession } from '$lib/server/auth/types.js'

export const sessionMiddleware: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(USER_COOKIE)

  if (token) {
    try {
      const result = await getUserByToken(token)
      if (result) {
        event.locals.user = result.user as AuthenticatedUser
        event.locals.session = {
          id: result.session.id,
          userId: result.session.userId,
          token: result.session.token,
          refreshToken: result.session.refreshToken,
          expiresAt: result.session.expiresAt,
          ipAddress: result.session.ipAddress,
          userAgent: result.session.userAgent,
          createdAt: result.session.createdAt,
          updatedAt: result.session.updatedAt,
        } as AuthSession
      }
    } catch (error) {
      console.error('[middleware/auth] Session hydration error:', error)
      event.cookies.delete(USER_COOKIE, { path: '/' })
    }
  }

  return resolve(event)
}