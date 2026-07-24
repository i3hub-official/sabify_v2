// src/lib/services/notification.service.ts
// Push notification delivery — primarily for SafetyAlert (AlertChannel "push").
//
// Previously blocked on a missing DeviceToken model; the schema now has
// one (User.deviceTokens / DeviceToken), so sendSafetyAlertPush below
// resolves userIds -> tokens for real instead of throwing.
//
// Provider assumption: Firebase Cloud Messaging (FCM) via the HTTP v1
// API. Swap for OneSignal if that's what's actually wired up — only the
// fetch calls in sendPush need to change, callers stay the same.

import { getPrismaClient } from '$lib/server/db/index.js'

const FCM_PROJECT_ID = process.env.FCM_PROJECT_ID
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY // legacy key or OAuth2 access token, depending on setup
const FCM_SEND_URL = FCM_PROJECT_ID
  ? `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`
  : null

export interface NotificationServiceHandle {
  provider: 'fcm'
}

export interface PushPayload {
  title: string
  body: string
  data?: Record<string, string>
}

export interface SendPushResult {
  sent: number
  failed: number
  errors: string[]
}

/**
 * Returns a handle confirming the provider is configured, or null —
 * matches guards.ts's ensureNotificationService() (`service !== null`).
 */
export async function getNotificationService(): Promise<NotificationServiceHandle | null> {
  if (!FCM_PROJECT_ID || !FCM_SERVER_KEY) return null
  return { provider: 'fcm' }
}

/**
 * A device token FCM reports as gone (uninstalled app, expired token,
 * etc.) — deleted immediately so we stop trying it and stop counting it
 * toward a user's notification reach.
 */
async function pruneDeadToken(token: string): Promise<void> {
  try {
    const prisma = await getPrismaClient()
    await prisma.deviceToken.deleteMany({ where: { token } })
  } catch (error) {
    console.error('[notification.service] failed to prune dead token:', error)
  }
}

function isUnregisteredError(status: number, data: unknown): boolean {
  // FCM v1 reports this as an UNREGISTERED gRPC-style status in the error body.
  if (status === 404) return true

  if (typeof data !== 'object' || data === null) return false
  const d = data as { error?: unknown }
  if (!d.error || typeof d.error !== 'object') return false
  const err = d.error as { status?: unknown }
  return err.status === 'UNREGISTERED' || err.status === 'NOT_FOUND'
}

function getErrorMessage(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const d = data as { error?: unknown }
  if (!d.error || typeof d.error !== 'object') return undefined
  const err = d.error as { message?: unknown }
  return typeof err.message === 'string' ? err.message : undefined
}

/**
 * Send a push notification to one or more device tokens directly. Dead
 * tokens are pruned from DeviceToken as they're discovered.
 */
export async function sendPush(tokens: string[], payload: PushPayload): Promise<SendPushResult> {
  const service = await getNotificationService()
  if (!service) {
    return { sent: 0, failed: tokens.length, errors: ['Notification service is not configured'] }
  }

  const errors: string[] = []
  let sent = 0

  for (const token of tokens) {
    try {
      const res = await fetch(FCM_SEND_URL as string, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${FCM_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data,
          },
        }),
      })

      if (res.ok) {
        sent += 1
        continue
      }

      const data = await res.json().catch(() => ({}))
      if (isUnregisteredError(res.status, data)) {
        await pruneDeadToken(token)
        errors.push(`Token ${token.slice(0, 8)}… is no longer registered — removed`)
      } else {
        errors.push(data?.error?.message || `FCM returned ${res.status} for token ${token.slice(0, 8)}…`)
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  return { sent, failed: tokens.length - sent, errors }
}

/**
 * Deliver a SafetyAlert over the "push" channel to a set of users.
 * Resolves each userId to their registered device(s) via DeviceToken —
 * a user with no registered devices (or push notifications disabled on
 * every device) is simply skipped, not an error.
 */
export async function sendSafetyAlertPush(userIds: string[], alert: PushPayload): Promise<SendPushResult> {
  if (userIds.length === 0) {
    return { sent: 0, failed: 0, errors: [] }
  }

  const prisma = await getPrismaClient()
  const deviceTokens = await prisma.deviceToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  })

  if (deviceTokens.length === 0) {
    return { sent: 0, failed: 0, errors: ['No registered devices for any of the given users'] }
  }

  return sendPush(
    deviceTokens.map((d: { token: string }) => d.token),
    alert,
  )
}

/**
 * Register (or refresh) a device token for a user — call this from
 * wherever the client hands you an FCM/APNs token after requesting push
 * permission (e.g. a /api/device-tokens endpoint). `token` is globally
 * unique in the schema, so re-registering the same token under a new
 * user (e.g. after sign-out/sign-in on a shared device) reassigns it
 * rather than erroring.
 */
export async function registerDeviceToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web',
): Promise<void> {
  const prisma = await getPrismaClient()
  await prisma.deviceToken.upsert({
    where: { token },
    create: { userId, token, platform },
    update: { userId, platform },
  })
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  const prisma = await getPrismaClient()
  await prisma.deviceToken.deleteMany({ where: { token } })
}