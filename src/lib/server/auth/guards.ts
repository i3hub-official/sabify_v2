// src/lib/server/auth/guards.ts
// Authorization guards for Sabify's single-User + AdminProfile architecture
import { error, redirect } from '@sveltejs/kit'
import type { User, AdminProfile } from '@prisma/client'
import type { AuthenticatedUser } from './types.js'

// ─── Types ──────────────────────────────────────────────────────────────────
//
// auth/index.ts's session lookups (getUserByToken, findUserByEmail,
// findUserById) all do `include: { adminProfile: true }`. The bare `User`
// type from @prisma/client does NOT carry that relation — it's a separate
// model, only attached when explicitly included. Every guard below reads
// `user.adminProfile`, so the parameter type has to reflect what
// auth/index.ts actually returns, not the raw Prisma model.

export type UserWithAdminProfile = User & { adminProfile: AdminProfile | null }

// ─── Base authentication ───────────────────────────────────────────────────

export async function requireAuth(user: UserWithAdminProfile | null): Promise<AuthenticatedUser> {
  if (!user || user.isSuspended) {
    throw redirect(303, '/signin')
  }
  return user as AuthenticatedUser
}

// ─── Admin role checks ─────────────────────────────────────────────────────

export async function requireAdmin(
  user: UserWithAdminProfile | null,
): Promise<AuthenticatedUser & { adminProfile: NonNullable<UserWithAdminProfile['adminProfile']> }> {
  const authed = await requireAuth(user)

  if (!user?.adminProfile) {
    throw error(403, 'Admin access required')
  }

  return {
    ...authed,
    adminProfile: user.adminProfile,
  }
}

/**
 * Restrict to OWNER role only — absolute authority
 */
export async function requireOwner(user: UserWithAdminProfile | null): Promise<AuthenticatedUser> {
  const authed = await requireAuth(user)

  if (!user?.adminProfile || user.adminProfile.role !== 'OWNER') {
    throw error(403, 'Owner access required')
  }

  return authed
}

/**
 * Restrict to LAW_ENFORCEMENT role
 */
export async function requireLawEnforcement(user: UserWithAdminProfile | null): Promise<AuthenticatedUser> {
  const authed = await requireAuth(user)

  if (!user?.adminProfile || user.adminProfile.role !== 'LAW_ENFORCEMENT') {
    throw error(403, 'Law enforcement access required')
  }

  return authed
}

/**
 * Restrict to SUPER_ADMIN or OWNER
 */
export async function requireSuperAdmin(user: UserWithAdminProfile | null): Promise<AuthenticatedUser> {
  const authed = await requireAuth(user)

  if (!user?.adminProfile || !['OWNER', 'SUPER_ADMIN'].includes(user.adminProfile.role)) {
    throw error(403, 'Super admin access required')
  }

  return authed
}

/**
 * Restrict to UNIVERSITY_ADMIN or higher
 * Checks that the admin is scoped to the correct university (if universityId is provided)
 */
export async function requireUniversityAdmin(
  user: UserWithAdminProfile | null,
  universityId?: string,
): Promise<AuthenticatedUser> {
  const authed = await requireAuth(user)

  if (!user?.adminProfile) {
    throw error(403, 'University admin access required')
  }

  const allowedRoles = ['OWNER', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN']
  if (!allowedRoles.includes(user.adminProfile.role)) {
    throw error(403, 'University admin access required')
  }

  // If universityId is provided and this admin is scoped to a university, verify match
  if (universityId && user.adminProfile.universityId && user.adminProfile.universityId !== universityId) {
    throw error(403, 'Access denied — you are not scoped to this university')
  }

  return authed
}

/**
 * Restrict to COLLEGE_ADMIN or higher
 */
export async function requireCollegeAdmin(
  user: UserWithAdminProfile | null,
  collegeId?: number,
): Promise<AuthenticatedUser> {
  const authed = await requireAuth(user)

  if (!user?.adminProfile) {
    throw error(403, 'College admin access required')
  }

  const allowedRoles = ['OWNER', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'COLLEGE_ADMIN']
  if (!allowedRoles.includes(user.adminProfile.role)) {
    throw error(403, 'College admin access required')
  }

  if (collegeId && user.adminProfile.collegeId && user.adminProfile.collegeId !== collegeId) {
    throw error(403, 'Access denied — you are not scoped to this college')
  }

  return authed
}

/**
 * Restrict to DEPT_ADMIN or higher
 */
export async function requireDeptAdmin(
  user: UserWithAdminProfile | null,
  departmentId?: number,
): Promise<AuthenticatedUser> {
  const authed = await requireAuth(user)

  if (!user?.adminProfile) {
    throw error(403, 'Department admin access required')
  }

  const allowedRoles = ['OWNER', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'COLLEGE_ADMIN', 'DEPT_ADMIN']
  if (!allowedRoles.includes(user.adminProfile.role)) {
    throw error(403, 'Department admin access required')
  }

  if (departmentId && user.adminProfile.departmentId && user.adminProfile.departmentId !== departmentId) {
    throw error(403, 'Access denied — you are not scoped to this department')
  }

  return authed
}

/**
 * Restrict to COURSE_REP or higher
 */
export async function requireCourseRep(
  user: UserWithAdminProfile | null,
  courseId?: string,
): Promise<AuthenticatedUser> {
  const authed = await requireAuth(user)

  if (!user?.adminProfile) {
    throw error(403, 'Course rep access required')
  }

  const allowedRoles = ['OWNER', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'COLLEGE_ADMIN', 'DEPT_ADMIN', 'COURSE_REP']
  if (!allowedRoles.includes(user.adminProfile.role)) {
    throw error(403, 'Course rep access required')
  }

  if (courseId && user.adminProfile.courseId && user.adminProfile.courseId !== courseId) {
    throw error(403, 'Access denied — you are not assigned to this course')
  }

  return authed
}

/**
 * Restrict to CONTRIBUTOR or admin roles
 */
export async function requireContributor(user: UserWithAdminProfile | null): Promise<AuthenticatedUser> {
  const authed = await requireAuth(user)

  // AdminProfile.role only ever holds OWNER | LAW_ENFORCEMENT | SUPER_ADMIN |
  // UNIVERSITY_ADMIN | COLLEGE_ADMIN | DEPT_ADMIN | COURSE_REP (see the
  // Prisma schema comment on AdminProfile.role) — CONTRIBUTOR never appears
  // there, it only ever lives on User.role. Including it in this list was
  // dead code; a plain contributor has no adminProfile at all.
  const allowedAdminRoles = ['OWNER', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'COLLEGE_ADMIN', 'DEPT_ADMIN', 'COURSE_REP']

  if (!user?.adminProfile && user?.role !== 'CONTRIBUTOR') {
    throw error(403, 'Contributor access required')
  }

  if (user?.adminProfile && !allowedAdminRoles.includes(user.adminProfile.role)) {
    throw error(403, 'Contributor access required')
  }

  return authed
}

/**
 * Check if user is verified (emailVerified + not suspended)
 */
export async function requireVerified(user: UserWithAdminProfile | null): Promise<AuthenticatedUser> {
  const authed = await requireAuth(user)

  if (!user?.emailVerified) {
    throw error(403, 'Email verification required')
  }

  return authed
}

/**
 * Generic role check — pass any of the allowed roles
 */
export async function requireRole(
  user: UserWithAdminProfile | null,
  roles: readonly string[],
): Promise<AuthenticatedUser> {
  const authed = await requireAuth(user)

  if (user?.adminProfile) {
    if (roles.includes(user.adminProfile.role)) {
      return authed
    }
  }

  if (user?.role && roles.includes(user.role)) {
    return authed
  }

  throw error(403, 'Access denied')
}