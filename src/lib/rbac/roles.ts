// src/lib/rbac/roles.ts
// ─────────────────────────────────────────────────────────────────────────────
// Role hierarchy — ordered from highest to lowest authority.
// Position 0 = most powerful (OWNER).
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_HIERARCHY = [
  'OWNER',
  'LAW_ENFORCEMENT',
  'SUPER_ADMIN',
  'UNIVERSITY_ADMIN',
  'COLLEGE_ADMIN',
  'DEPT_ADMIN',
  'COURSE_REP',
  'CONTRIBUTOR',
  'STUDENT',
] as const;

export type Role = typeof ROLE_HIERARCHY[number];

// Roles that have platform-wide (unscoped) authority
export const PLATFORM_ROLES: Role[] = ['OWNER', 'LAW_ENFORCEMENT', 'SUPER_ADMIN'];

// Roles that can access the /admin panel
export const ADMIN_ROLES: Role[] = [
  'OWNER', 'LAW_ENFORCEMENT', 'SUPER_ADMIN',
  'UNIVERSITY_ADMIN', 'COLLEGE_ADMIN', 'DEPT_ADMIN',
];

// Roles that can create/approve events
export const EVENT_MANAGER_ROLES: Role[] = [
  'OWNER', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN',
  'COLLEGE_ADMIN', 'DEPT_ADMIN', 'COURSE_REP',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Numeric rank of a role (lower = more powerful) */
export function rankOf(role: Role): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/** Returns true if actor has strictly higher authority than target */
export function outranks(actor: Role, target: Role): boolean {
  return rankOf(actor) < rankOf(target);
}

/** Returns true if actor can manage (assign/revoke/edit) target role.
 *  You can only manage roles strictly below your own. */
export function canManage(actor: Role, target: Role): boolean {
  return outranks(actor, target);
}

/** The highest role an actor is allowed to assign to another user */
export function maxAssignableRole(actor: Role): Role | null {
  const idx = rankOf(actor);
  // Actor can assign the role one step below themselves
  return ROLE_HIERARCHY[idx + 1] ?? null;
}

/** All roles an actor is allowed to assign */
export function assignableRoles(actor: Role): Role[] {
  const idx = rankOf(actor);
  return ROLE_HIERARCHY.slice(idx + 1) as unknown as Role[];
}

/** Human-readable label for display */
export const ROLE_LABELS: Record<Role, string> = {
  OWNER:            'Owner',
  LAW_ENFORCEMENT:  'Law Enforcement',
  SUPER_ADMIN:      'Super Admin',
  UNIVERSITY_ADMIN: 'University Admin',
  COLLEGE_ADMIN:    'College Admin',
  DEPT_ADMIN:       'Department Admin',
  COURSE_REP:       'Course Rep',
  CONTRIBUTOR:      'Contributor',
  STUDENT:          'Student',
};

/** Badge colour for UI chips */
export const ROLE_COLORS: Record<Role, string> = {
  OWNER:            '#7c3aed',
  LAW_ENFORCEMENT:  '#0369a1',
  SUPER_ADMIN:      '#ef4444',
  UNIVERSITY_ADMIN: '#d97706',
  COLLEGE_ADMIN:    '#16a34a',
  DEPT_ADMIN:       '#2563eb',
  COURSE_REP:       '#7c3aed',
  CONTRIBUTOR:      '#6366f1',
  STUDENT:          '#64748b',
};
