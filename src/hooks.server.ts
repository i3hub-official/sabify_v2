// src/hooks.server.ts
// Session hydration for Sabify's single-User + AdminProfile architecture
import { type Handle } from '@sveltejs/kit'
import { USER_COOKIE } from '$lib/server/auth/index'
import { getUserByToken } from '$lib/server/auth/index'
import type { AuthenticatedUser, AuthSession } from '$lib/server/auth/types'

/**
 * Hydrate locals with user session on every request
 * Called by SvelteKit before every route handler
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Extract session token from cookies
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
      console.error('[hooks.server] Session hydration error:', error)
      // Session is invalid — clear it
      event.cookies.delete(USER_COOKIE)
    }
  }

  // Continue with the request
  return resolve(event)
}

// app.d.ts should include:
/*
declare global {
  namespace App {
    interface Locals {
      user?: AuthenticatedUser
      session?: AuthSession
    }
  }
}

export {}
*/