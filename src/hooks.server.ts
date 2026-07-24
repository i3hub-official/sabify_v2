// src/hooks.server.ts
// Composes the full request pipeline:
//   1. healthCheckHandle — /health/*, answered directly, bypasses everything else
//   2. sessionMiddleware  — hydrate locals.user/session from the cookie
//   3. rateLimitMiddleware — reject over-limit clients
//   4. auditLogMiddleware  — record mutating requests
//
// Health checks run first and return early so uptime monitors/load
// balancers never get rate-limited or blocked on cookie parsing — they
// don't need a session and shouldn't count against anyone's rate limit.

import { type Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { handle as middlewareHandle } from '$lib/middleware/index.js'
import { handleLivenessCheck, handleReadinessCheck, handleFullHealthCheck } from '$lib/health/index.js'

const healthCheckHandle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url

  if (pathname === '/health/live') return handleLivenessCheck()
  if (pathname === '/health/ready') return handleReadinessCheck()
  if (pathname === '/health') return handleFullHealthCheck(event)

  return resolve(event)
}

export const handle: Handle = sequence(healthCheckHandle, middlewareHandle)

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