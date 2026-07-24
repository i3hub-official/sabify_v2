// src/lib/middleware/validation.ts
// Request validation. Deliberately NOT a global Handle — different routes
// need different schemas, so these are per-route helpers called from an
// action or +server.ts, not wired into hooks.server.ts.
//
// Needs `zod` (`pnpm add zod`) if it isn't already a dependency.

import { error, type RequestEvent } from '@sveltejs/kit'
import type { ZodSchema, ZodError } from 'zod'

function formatZodError(err: ZodError): string {
  return err.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
}

/**
 * Parse and validate a JSON request body. Throws a SvelteKit 400 (via
 * `error()`) on failure, so callers can just `await` this and use the
 * result directly.
 */
export async function validateJsonBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw error(400, 'Request body must be valid JSON')
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    throw error(400, formatZodError(result.error))
  }
  return result.data
}

/**
 * Same, but for form-encoded action data (SvelteKit form actions).
 * FormData values are all strings, so schemas passed here should expect
 * string inputs (use z.coerce.* for numbers/booleans/dates).
 */
export async function validateFormData<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  const formData = await request.formData()
  const body = Object.fromEntries(formData.entries())

  const result = schema.safeParse(body)
  if (!result.success) {
    throw error(400, formatZodError(result.error))
  }
  return result.data
}

/** Validate query/search params against a schema (pagination, filters, etc.). */
export function validateSearchParams<T>(event: RequestEvent, schema: ZodSchema<T>): T {
  const params = Object.fromEntries(event.url.searchParams.entries())
  const result = schema.safeParse(params)
  if (!result.success) {
    throw error(400, formatZodError(result.error))
  }
  return result.data
}