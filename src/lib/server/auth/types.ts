// src/lib/server/auth/types.ts
// Shape of `event.locals.user`, hydrated in hooks.server.ts
import type { User, AdminProfile, Role } from '@prisma/client'

/**
 * Authenticated user — subset of User model for safe session use.
 * Populated in hooks.server.ts via getUserByToken().
 */
export type AuthenticatedUser = Omit<User, 'passwordHash' | 'deletionReason' | 'suspendedReason'> & {
  adminProfile?: AdminProfile | null
}

/**
 * Session attached to locals.session
 */
export interface AuthSession {
  id: string
  userId: string
  token: string
  refreshToken: string
  expiresAt: Date
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: Date
  updatedAt?: Date
}

/**
 * Type guard to check if user is an admin
 */
export function isAdmin(user: AuthenticatedUser | null): user is AuthenticatedUser & { adminProfile: NonNullable<AdminProfile> } {
  return !!(user?.adminProfile)
}

/**
 * Type guard to check if user has a specific admin role
 */
export function hasAdminRole(user: AuthenticatedUser | null, role: Role): boolean {
  return user?.adminProfile?.role === role
}

/**
 * Type guard to check if user has any of the given admin roles
 */
export function hasAnyAdminRole(user: AuthenticatedUser | null, roles: readonly Role[]): boolean {
  return !!(user?.adminProfile && roles.includes(user.adminProfile.role as Role))
}

/**
 * Type guard to check if user is scoped to a specific university
 */
export function isScopedToUniversity(user: AuthenticatedUser, universityId: string): boolean {
  return user?.adminProfile?.universityId === universityId || user?.adminProfile?.universityId === null
}

/**
 * Type guard to check if user is scoped to a specific college
 */
export function isScopedToCollege(user: AuthenticatedUser, collegeId: number): boolean {
  return user?.adminProfile?.collegeId === collegeId || user?.adminProfile?.collegeId === null
}

/**
 * Type guard to check if user is scoped to a specific department
 */
export function isScopedToDepartment(user: AuthenticatedUser, departmentId: number): boolean {
  return user?.adminProfile?.departmentId === departmentId || user?.adminProfile?.departmentId === null
}