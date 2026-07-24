// src/lib/rbac/guard.ts (UPDATED)
// ─────────────────────────────────────────────────────────────────────────────
// Server-side enforcement helpers — NOW with AdminProfile scope integration.
// Import these in +page.server.ts load() functions and actions.
// ─────────────────────────────────────────────────────────────────────────────

import { error } from '@sveltejs/kit';
import { getPrismaClient } from '$lib/server/db/index.js'
import { can, type Resource, type Action } from './permissions';
import { canManage, assignableRoles, PLATFORM_ROLES, type Role } from './roles';
import type { AdminProfile } from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────────────────────

/** User from session (auth layer) */
export type SessionUser = {
  id: string;
  role: Role;
  email: string;
  firstName: string;
  surname: string;
  otherName: string | null;
  universityId?: string | null;
  collegeId?: number | null;
  departmentId?: number | null;
};

/**
 * The full scope chain an admin actually sits in, resolved once from
 * whichever single field is set on their AdminProfile.
 *
 * The schema comment on AdminProfile is explicit: "Only ONE of these
 * should be non-null per admin" (universityId / collegeId / departmentId /
 * courseId). That means a COLLEGE_ADMIN's AdminProfile.universityId is
 * null — it is NOT denormalized onto the row. Any scope check that reads
 * admin.universityId directly (as the previous version of this file did)
 * is comparing against null and will wrongly deny access whenever a
 * caller also passes universityId in the scope object. This type — and
 * resolveAdminScope() below — walk the Prisma relations once (at
 * loadScopedUser time) to fill in the whole chain, so withinScope() can
 * stay a cheap synchronous comparison.
 */
export type ResolvedAdminScope = {
  universityId: string | null;
  collegeId: number | null;
  departmentId: number | null;
  courseId: string | null;
};

/** User enriched with their admin scope (if they're an admin) */
export type ScopedUser = SessionUser & {
  adminProfile?: AdminProfile | null; // null if not an admin
  resolvedScope?: ResolvedAdminScope | null; // full hierarchy chain, resolved once
};

/** Resource scope constraints */
export type ResourceScope = {
  universityId?: string | null;
  collegeId?: number | null;
  departmentId?: number | null;
  courseId?: string | null; // for course-scoped resources (vault docs, timetable entries, course reps)
  organizerId?: string | null; // for "own" checks
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS: Fetch admin scope
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the admin profile for a user (if they're an admin).
 * Null if user is a student/contributor/etc.
 *
 * Use this to get the user's actual scope (universityId, collegeId, etc.)
 *
 * @example
 * const admin = await getAdminProfile(locals.user.id);
 * if (admin?.role === 'COLLEGE_ADMIN') {
 *   const collegeId = admin.collegeId; // ← actual scope
 * }
 */
export async function getAdminProfile(userId: string): Promise<AdminProfile | null> {
  const prisma = await getPrismaClient();
  return prisma.adminProfile.findUnique({
    where: { userId },
  });
}

/**
 * Resolve an AdminProfile's single scope field into the full hierarchy
 * chain (university → college → department → course), via one Prisma
 * lookup keyed off whichever field is actually set. Returns null for
 * platform-wide admins (OWNER/SUPER_ADMIN/LAW_ENFORCEMENT) — those are
 * short-circuited by PLATFORM_ROLES in withinScope() and never need this.
 */
export async function resolveAdminScope(admin: AdminProfile | null): Promise<ResolvedAdminScope | null> {
  if (!admin) return null;

  if (admin.courseId) {
    const prisma = await getPrismaClient();
    const course = await prisma.course.findUnique({
      where: { id: admin.courseId },
      select: {
        id: true,
        departmentId: true,
        department: { select: { collegeId: true, college: { select: { universityId: true } } } },
      },
    });
    if (!course) return null;
    return {
      universityId: course.department.college.universityId,
      collegeId: course.department.collegeId,
      departmentId: course.departmentId,
      courseId: course.id,
    };
  }

  if (admin.departmentId) {
      const prisma = await getPrismaClient();
    const dept = await prisma.department.findUnique({
      where: { id: admin.departmentId },
      select: { id: true, collegeId: true, college: { select: { universityId: true } } },
    });
    if (!dept) return null;
    return {
      universityId: dept.college.universityId,
      collegeId: dept.collegeId,
      departmentId: dept.id,
      courseId: null,
    };
  }

  if (admin.collegeId) {
      const prisma = await getPrismaClient();
    const college = await prisma.college.findUnique({
      where: { id: admin.collegeId },
      select: { id: true, universityId: true },
    });
    if (!college) return null;
    return {
      universityId: college.universityId,
      collegeId: college.id,
      departmentId: null,
      courseId: null,
    };
  }

  if (admin.universityId) {
    return { universityId: admin.universityId, collegeId: null, departmentId: null, courseId: null };
  }

  return null;
}

/**
 * Load a user from session + fetch their admin profile (and its resolved
 * scope chain) in one go. Use in +page.server.ts load() functions.
 *
 * @example
 * export const load = async ({ locals }) => {
 *   const user = await loadScopedUser(locals.user);
 *   return { user };
 * };
 */
export async function loadScopedUser(
  sessionUser: SessionUser | null | undefined
): Promise<ScopedUser> {
  if (!sessionUser) throw error(401, 'Not signed in');

  const adminProfile = await getAdminProfile(sessionUser.id);
  const resolvedScope = await resolveAdminScope(adminProfile);

  return {
    ...sessionUser,
    adminProfile: adminProfile || null,
    resolvedScope,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Throws 401/403 if the user cannot perform `action` on `resource`.
 * Checks role-based permissions (ignores scope — use requirePermissionInScope for that).
 *
 * @example
 * requirePermission(user, 'event', 'approve');
 */
export function requirePermission(
  user: Pick<SessionUser, 'role'> | null | undefined,
  resource: Resource,
  action: Action,
  message?: string
): void {
  if (!user) throw error(401, 'You must be signed in.');
  if (!can(user.role, resource, action)) {
    throw error(
      403,
      message ?? `Your role does not permit: ${action} on ${resource}.`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the user's scope covers the given resource scope.
 * Platform roles (OWNER, LAW_ENFORCEMENT, SUPER_ADMIN) always return true.
 *
 * Requires `user.resolvedScope` to have been populated by loadScopedUser()
 * — a ScopedUser built any other way (without calling resolveAdminScope)
 * will be denied all scoped access, fail-closed, rather than silently
 * comparing against fields that were never resolved.
 *
 * @example
 * const user = await loadScopedUser(locals.user);
 * if (!withinScope(user, { universityId: event.universityId })) {
 *   throw error(403, 'Outside your scope.');
 * }
 */
export function withinScope(user: ScopedUser, scope: ResourceScope): boolean {
  // Platform roles (OWNER, LAW_ENFORCEMENT, SUPER_ADMIN) have access everywhere
  if ((PLATFORM_ROLES as string[]).includes(user.role)) return true;

  const resolved = user.resolvedScope;

  switch (user.role) {
    case 'UNIVERSITY_ADMIN':
      return !!resolved?.universityId && resolved.universityId === scope.universityId;

    case 'COLLEGE_ADMIN':
      return (
        !!resolved?.collegeId &&
        resolved.collegeId === scope.collegeId &&
        (!scope.universityId || resolved.universityId === scope.universityId)
      );

    case 'DEPT_ADMIN':
      return (
        !!resolved?.departmentId &&
        resolved.departmentId === scope.departmentId &&
        (!scope.collegeId || resolved.collegeId === scope.collegeId) &&
        (!scope.universityId || resolved.universityId === scope.universityId)
      );

    case 'COURSE_REP':
      // Course reps are scoped to their specific course, not their whole
      // university (the previous version only checked universityId, which
      // let a rep for one course act on any resource in the university).
      return (
        !!resolved?.courseId &&
        resolved.courseId === scope.courseId &&
        (!scope.departmentId || resolved.departmentId === scope.departmentId) &&
        (!scope.universityId || resolved.universityId === scope.universityId)
      );

    case 'CONTRIBUTOR':
    case 'STUDENT':
      // Non-admins can only act within their own university
      return user.universityId === scope.universityId;

    default:
      return false;
  }
}

/**
 * Combined check: requirePermission + withinScope.
 * This is the most common pattern — use this in most cases.
 *
 * @example
 * const user = await loadScopedUser(locals.user);
 * requirePermissionInScope(user, 'event', 'approve', {
 *   universityId: event.universityId,
 *   collegeId: event.collegeId,
 * });
 */
export function requirePermissionInScope(
  user: ScopedUser | null | undefined,
  resource: Resource,
  action: Action,
  scope: ResourceScope
): void {
  if (!user) throw error(401, 'You must be signed in.');
  requirePermission(user, resource, action);
  if (!withinScope(user, scope)) {
    throw error(403, 'This resource is outside your assigned scope.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// "OWN RESOURCE" CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the user owns the resource (is the creator/organizer).
 * Useful for "delete own event" type rules.
 */
export function isOwner(user: Pick<SessionUser, 'id'>, ownerId: string): boolean {
  return user.id === ownerId;
}

/**
 * Throws 403 unless user owns the resource OR has a role that can act on it in scope.
 */
export function requireOwnerOrPermission(
  user: ScopedUser | null | undefined,
  resource: Resource,
  action: Action,
  ownerId: string,
  scope: ResourceScope
): void {
  if (!user) throw error(401, 'You must be signed in.');
  if (isOwner(user, ownerId)) return; // own resource — always allowed
  requirePermissionInScope(user, resource, action, scope);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE ASSIGNMENT GUARDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Throws 403 if `actor` cannot assign `targetRole` to another user.
 * Enforces: you can only assign roles strictly below your own.
 */
export function requireCanAssign(actor: Role, targetRole: Role): void {
  if (!canManage(actor, targetRole)) {
    throw error(
      403,
      `You cannot assign the role "${targetRole}". ` +
      `You may only assign: ${assignableRoles(actor).join(', ')}.`
    );
  }
}

/**
 * Throws 403 if actor tries to manage (edit/delete/suspend) a user of equal or higher role.
 */
export function requireCanManageUser(actor: Role, targetUserRole: Role): void {
  if (!canManage(actor, targetUserRole)) {
    throw error(
      403,
      'You cannot manage a user with an equal or higher role than yours.'
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN PANEL GUARDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Throws 403 if the user cannot access the admin panel at all.
 * Use in (admin) +layout.server.ts.
 */
export function requireAdminAccess(
  user: Pick<SessionUser, 'role'> | null | undefined
): void {
  if (!user) throw error(401, 'You must be signed in.');
  const allowed: Role[] = [
    'OWNER', 'LAW_ENFORCEMENT', 'SUPER_ADMIN',
    'UNIVERSITY_ADMIN', 'COLLEGE_ADMIN', 'DEPT_ADMIN',
  ];
  if (!allowed.includes(user.role)) {
    throw error(403, 'You do not have access to the admin panel.');
  }
}

/**
 * Throws 403 if user is not a SUPER_ADMIN.
 * Use for platform-wide admin operations.
 */
export function requireSuperAdmin(
  user: SessionUser | null | undefined
): void {
  if (!user) throw error(401, 'You must be signed in.');
  if (user.role !== 'SUPER_ADMIN') {
    throw error(403, 'Only super admins can perform this action.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERT SEVERITY GUARDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LAW_ENFORCEMENT can only send WARNING or URGENT alerts — not INFO.
 * DEPT_ADMIN cannot send URGENT (only WARNING/INFO).
 */
export function requireAlertSeverityPermission(
  user: Pick<SessionUser, 'role'>,
  severity: 'INFO' | 'WARNING' | 'URGENT'
): void {
  if (user.role === 'LAW_ENFORCEMENT' && severity === 'INFO') {
    throw error(403, 'Law enforcement accounts may only send WARNING or URGENT alerts.');
  }
  if (user.role === 'DEPT_ADMIN' && severity === 'URGENT') {
    throw error(403, 'Department admins may not send URGENT alerts.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USAGE EXAMPLES IN ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EXAMPLE: Loading an admin page in +page.server.ts
 *
 * export const load: PageServerLoad = async ({ locals }) => {
 *   requireAdminAccess(locals.user);
 *   const user = await loadScopedUser(locals.user);
 *
 *   // Get data within user's scope
 *   const colleges = await prisma.college.findMany({
 *     where: { universityId: user.resolvedScope?.universityId }
 *   });
 *
 *   return { user, colleges };
 * };
 */

/**
 * EXAMPLE: Creating a resource in an action
 *
 * export const actions: Actions = {
 *   create: async ({ request, locals }) => {
 *     const user = await loadScopedUser(locals.user);
 *     const formData = await request.formData();
 *     const eventTitle = formData.get('title') as string;
 *     const collegeId = parseInt(formData.get('collegeId') as string);
 *
 *     // Check permission + scope
 *     requirePermissionInScope(user, 'event', 'create', { collegeId });
 *
 *     // Create the event
 *     const event = await prisma.event.create({
 *       data: { ... }
 *     });
 *
 *     return { success: true };
 *   }
 * };
 */

/**
 * EXAMPLE: Checking scope in a query
 *
 * export const load: PageServerLoad = async ({ locals, params }) => {
 *   const user = await loadScopedUser(locals.user);
 *   const eventId = params.id;
 *
 *   const event = await prisma.event.findUnique({
 *     where: { id: eventId }
 *   });
 *
 *   if (!event) throw error(404);
 *   if (!withinScope(user, { collegeId: event.collegeId })) {
 *     throw error(403, 'You cannot view this event');
 *   }
 *
 *   return { event };
 * };
 */