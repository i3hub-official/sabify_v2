// src/lib/services/guards.ts
// Service guards and middleware for checking service availability
//
// NOTE: All service modules are imported *lazily* (dynamic import) inside
// each guard function, never at module top-level. This mirrors the pattern
// in src/lib/server/auth/index.ts, which never eagerly imports a heavy
// dependency (it lazily resolves via getPrismaClient() instead).
//
// Why this matters: if any single service module throws during its own
// import-time initialization (e.g. payment.service.js constructing a
// Paystack/Flutterwave client and throwing because PAYMENT_API_KEY isn't
// set), a top-level `import` of that module in this file would fail the
// entire guards.ts module — taking every other, perfectly healthy guard
// down with it. Lazy dynamic imports isolate failures to the single
// service being checked.

/**
 * Check if email service is available and configured
 */
export async function ensureEmailService(): Promise<boolean> {
  try {
    const { verifyEmailConnection } = await import('./email.service.js')
    return await verifyEmailConnection()
  } catch (error) {
    console.error('[guards] Email service check failed:', error)
    return false
  }
}

/**
 * Check if SMS service is available and configured
 */
export async function ensureSMSService(): Promise<boolean> {
  try {
    if (!process.env.SMS_PROVIDER || !process.env.SMS_API_KEY) {
      console.warn('[guards] SMS service not configured')
      return false
    }
    return true
  } catch (error) {
    console.error('[guards] SMS service check failed:', error)
    return false
  }
}

/**
 * Check if storage service is available
 */
export async function ensureStorageService(): Promise<boolean> {
  try {
    if (!process.env.STORAGE_PROVIDER) {
      console.warn('[guards] Storage service not configured')
      return false
    }
    // Confirm the module itself loads/initializes cleanly before
    // reporting the service as available.
    await import('./storage.service.js')
    return true
  } catch (error) {
    console.error('[guards] Storage service check failed:', error)
    return false
  }
}

/**
 * Check if payment service is available and configured
 */
export async function ensurePaymentService(): Promise<boolean> {
  try {
    if (!process.env.PAYMENT_PROVIDER || !process.env.PAYMENT_API_KEY) {
      console.warn('[guards] Payment service not configured')
      return false
    }
    const { getPaymentService } = await import('./payment.service.js')
    const service = await getPaymentService()
    return service !== null
  } catch (error) {
    console.error('[guards] Payment service check failed:', error)
    return false
  }
}

/**
 * Check if search service is available
 */
export async function ensureSearchService(): Promise<boolean> {
  try {
    if (!process.env.SEARCH_PROVIDER) {
      console.warn('[guards] Search service not configured')
      return false
    }
    return true
  } catch (error) {
    console.error('[guards] Search service check failed:', error)
    return false
  }
}

/**
 * Check if notification service is available
 */
export async function ensureNotificationService(): Promise<boolean> {
  try {
    const { getNotificationService } = await import('./notification.service.js')
    const service = await getNotificationService()
    return service !== null
  } catch (error) {
    console.error('[guards] Notification service check failed:', error)
    return false
  }
}

/**
 * Service health check - returns status of all services
 */
export async function checkAllServices(): Promise<Record<string, boolean>> {
  const [email, sms, storage, payment, search, notification] = await Promise.all([
    ensureEmailService(),
    ensureSMSService(),
    ensureStorageService(),
    ensurePaymentService(),
    ensureSearchService(),
    ensureNotificationService(),
  ])

  return {
    email,
    sms,
    storage,
    payment,
    search,
    notification,
  }
}

/**
 * Require email service to be available (throw if not)
 */
export async function requireEmailService(): Promise<void> {
  const available = await ensureEmailService()
  if (!available) {
    throw new Error('Email service is not available. Check SMTP configuration.')
  }
}

/**
 * Require SMS service to be available (throw if not)
 */
export async function requireSMSService(): Promise<void> {
  const available = await ensureSMSService()
  if (!available) {
    throw new Error('SMS service is not available. Check SMS provider configuration.')
  }
}

/**
 * Require storage service to be available (throw if not)
 */
export async function requireStorageService(): Promise<void> {
  const available = await ensureStorageService()
  if (!available) {
    throw new Error('Storage service is not available. Check storage provider configuration.')
  }
}

/**
 * Require payment service to be available (throw if not)
 */
export async function requirePaymentService(): Promise<void> {
  const available = await ensurePaymentService()
  if (!available) {
    throw new Error('Payment service is not available. Check payment provider configuration.')
  }
}

/**
 * Require search service to be available (throw if not)
 */
export async function requireSearchService(): Promise<void> {
  const available = await ensureSearchService()
  if (!available) {
    throw new Error('Search service is not available. Check search provider configuration.')
  }
}

/**
 * Require notification service to be available (throw if not)
 */
export async function requireNotificationService(): Promise<void> {
  const available = await ensureNotificationService()
  if (!available) {
    throw new Error('Notification service is not available. Check notification provider configuration.')
  }
}