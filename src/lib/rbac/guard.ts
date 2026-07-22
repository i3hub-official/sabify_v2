// src/lib/rbac/guard.ts (UPDATED)
// ─────────────────────────────────────────────────────────────────────────────
// Server-side enforcement helpers — NOW with AdminProfile scope integration.
// Import these in +page.server.ts load() functions and actions.
// ─────────────────────────────────────────────────────────────────────────────

import { error } from '@sveltejs/kit';
import { prisma } from '../server/prisma';
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

/** User enriched with their admin scope (if they're an admin) */
export type ScopedUser = SessionUser & {
  adminProfile?: AdminProfile | null; // null if not an admin
};

/** Resource scope constraints */
export type ResourceScope = {
  universityId?: string | null;
  collegeId?: number | null;
  departmentId?: number | null;
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
  return prisma.adminProfile.findUnique({
    where: { userId },
  });
}

/**
 * Load a user from session + fetch their admin profile in one go.
 * Use in +page.server.ts load() functions.
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

  return {
    ...sessionUser,
    adminProfile: adminProfile || null,
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
 * BEFORE (old schema):
 * if (!withinScope(locals.user, { collegeId: event.collegeId }))
 *
 * AFTER (new schema):
 * const user = await loadScopedUser(locals.user);
 * if (!withinScope(user, { collegeId: event.collegeId }))
 *
 * @example
 * const user = await loadScopedUser(locals.user);
 * if (!withinScope(user, { universityId: event.universityId })) {
 *   throw error(403, 'Outside your scope.');
 * }
 */
export function withinScope(user: ScopedUser, scope: ResourceScope): boolean {
  // Platform roles (OWNER, SUPER_ADMIN) have access everywhere
  if ((PLATFORM_ROLES as string[]).includes(user.role)) return true;

  // For scoped roles, check their AdminProfile
  const admin = user.adminProfile;

  switch (user.role) {
    case 'UNIVERSITY_ADMIN':
      // Must have universityId in scope + it must match
      return (
        admin?.universityId !== undefined &&
        admin.universityId === scope.universityId
      );

    case 'COLLEGE_ADMIN':
      // Must have collegeId in scope + it must match
      // + if universityId is specified, it must also match
      return (
        admin?.collegeId !== undefined &&
        admin.collegeId === scope.collegeId &&
        (!scope.universityId || admin.universityId === scope.universityId)
      );

    case 'DEPT_ADMIN':
      // Must have departmentId in scope + it must match
      return (
        admin?.departmentId !== undefined &&
        admin.departmentId === scope.departmentId &&
        (!scope.universityId || admin.universityId === scope.universityId)
      );

    case 'COURSE_REP':
      // Course reps can only act within their university
      return user.universityId === scope.universityId;

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
 *     where: { universityId: user.adminProfile?.universityId }
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