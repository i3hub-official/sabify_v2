// src/lib/server/auth/index.ts
// Session management for single-User architecture (Sabify)
import { hash, verify } from '@node-rs/argon2'
import { randomBytes } from 'crypto'
import { getPrismaClient } from '$lib/server/db/index.js'
import { searchHashFor } from '$lib/security/dataProtection'

// ─── Constants ───────────────────────────────────────────────────────────────

const SESSION_TTL_DAYS = 7
const REFRESH_TTL_DAYS = 30

const ARGON2_OPTIONS = {
  algorithm: 2, // Argon2id
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
}

// ─── Passwords ───────────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS)
}

export async function verifyPassword(plain: string, storedHash: string): Promise<boolean> {
  return verify(storedHash, plain, ARGON2_OPTIONS)
}

export function needsRehashCheck(storedHash: string): boolean {
  const match = storedHash.match(/^\$argon2id\$v=\d+\$m=(\d+),t=(\d+),p=(\d+)\$/)
  if (!match) return true

  const memoryCost = Number(match[1])
  const timeCost = Number(match[2])
  const parallelism = Number(match[3])

  return (
    memoryCost !== ARGON2_OPTIONS.memoryCost ||
    timeCost !== ARGON2_OPTIONS.timeCost ||
    parallelism !== ARGON2_OPTIONS.parallelism
  )
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain a number'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain a special character'
  return null
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

function sessionExpiry(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

// ─── User Sessions (single User model) ────────────────────────────────────────

export async function createUserSession(
  userId: string,
  meta: { ipAddress?: string; userAgent?: string } = {},
) {
  const prisma = await getPrismaClient()
  const token = generateToken()
  const refreshToken = generateToken()

  const session = await prisma.userSession.create({
    data: {
      userId,
      token,
      refreshToken,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      expiresAt: sessionExpiry(SESSION_TTL_DAYS),
    },
  })

  return { token, refreshToken, session }
}

export async function getUserByToken(token: string) {
  const prisma = await getPrismaClient()
  const session = await prisma.userSession.findUnique({
    where: { token }, // Query by token field (unique)
    include: {
      user: {
        include: {
          adminProfile: true,
        },
      },
    },
  })

  if (!session || session.expiresAt < new Date()) return null
  if (session.user.isSuspended) return null

  // Update last activity time (fire and forget)
  prisma.userSession
    .update({ where: { id: session.id }, data: { createdAt: new Date() } })
    .catch(() => {})

  return { user: session.user, session }
}

export async function refreshUserSession(refreshToken: string) {
  const prisma = await getPrismaClient()
  const session = await prisma.userSession.findFirst({
    where: { refreshToken },
    include: { user: true },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) return null
  if (session.user.isSuspended) return null

  const newToken = generateToken()
  const newRefreshToken = generateToken()

  const updated = await prisma.userSession.update({
    where: { id: session.id },
    data: {
      token: newToken,
      refreshToken: newRefreshToken,
      expiresAt: sessionExpiry(SESSION_TTL_DAYS),
      updatedAt: new Date(),
    },
  })

  return { token: newToken, refreshToken: newRefreshToken, session: updated }
}

export async function invalidateUserSession(token: string) {
  const prisma = await getPrismaClient()
  await prisma.userSession.deleteMany({ where: { token } })
}

export async function invalidateAllUserSessions(userId: string) {
  const prisma = await getPrismaClient()
  await prisma.userSession.deleteMany({ where: { userId } })
}

// ─── Cookie helpers ──────────────────────────────────────────────────────────

export const USER_COOKIE = 'sabify_session'
export const COOKIE_MAX_AGE = SESSION_TTL_DAYS * 24 * 60 * 60

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: COOKIE_MAX_AGE,
}

// ─── User lookups ─────────────────────────────────────────────────────────────

export async function findUserByEmail(email: string) {
  const prisma = await getPrismaClient()
  const emailHash = await searchHashFor(email, 'email')
  return prisma.user.findUnique({ 
    where: { emailHash },
    include: { adminProfile: true }
  })
}

export async function findUserById(userId: string) {
  const prisma = await getPrismaClient()
  return prisma.user.findUnique({
    where: { id: userId },
    include: { adminProfile: true }
  })
}

// ─── SvelteKit integration ────────────────────────────────────────────────────

/**
 * High-level session creation for SvelteKit events.
 * Creates UserSession in DB and sets the session cookie.
 * 
 * Used in signup and login flows to establish a session with:
 * - UserSession database record (token, refreshToken, expiry)
 * - HTTP-only session cookie
 * - Populated locals (event.locals.user, event.locals.session)
 * 
 * Usage in signup action:
 * ```ts
 * await createSession(event, {
 *   id: user.id,
 *   email: rawEmail,
 *   firstName: rawFirstName,
 *   otherName: null,
 *   surname: rawSurname,
 *   role: 'STUDENT',
 *   isVerified: false,
 *   emailVerified: false,
 *   nameArranged: false,
 *   universityId: user.universityId,
 *   departmentId: user.departmentId,
 *   matricNumber: matricNumber || '',
 *   isActive: true,
 * })
 * ```
 */
export async function createSession(
  event: any, // SvelteKit RequestEvent
  userData: {
    id: string
    email: string
    firstName: string
    otherName?: string | null
    surname: string
    role: string
    isVerified: boolean
    nameArranged: boolean
    universityId: string | null
    departmentId: number | null
    matricNumber?: string
    isActive: boolean
    emailVerified: boolean
    [key: string]: any
  },
) {
  const { token, refreshToken } = await createUserSession(userData.id, {
    ipAddress: event.request.headers.get('x-forwarded-for') || 
               event.request.headers.get('cf-connecting-ip') ||
               event.getClientAddress?.() ||
               undefined,
    userAgent: event.request.headers.get('user-agent') || undefined,
  })

  // Set HTTP-only cookie
  event.cookies.set(USER_COOKIE, token, {
    ...cookieOptions,
    secure: process.env.NODE_ENV === 'production',
  })

  // Store in locals for immediate use
  event.locals.user = userData as any
  event.locals.session = {
    id: token, // Use token as session ID for now
    userId: userData.id,
    token,
    refreshToken,
    expiresAt: new Date(Date.now() + COOKIE_MAX_AGE * 1000),
  } as any

  return { token, refreshToken }
}