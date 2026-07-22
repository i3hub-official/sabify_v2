// src/lib/rbac/permissions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Defines what each role can do on each resource.
// ─────────────────────────────────────────────────────────────────────────────
import type { Role } from './roles';

export type Resource =
  | 'user'
  | 'university'
  | 'college'
  | 'department'
  | 'course'
  | 'vault_document'
  | 'event'
  | 'safety_alert'
  | 'payment'
  | 'due'
  | 'study_group'
  | 'campus_pin'
  | 'ai_usage'
  | 'audit_log'
  | 'timetable'
  | 'cgpa';

export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'       // publish/approve a pending resource
  | 'verify'        // verify a document or receipt
  | 'assign_role'   // assign a role to a user
  | 'suspend';      // suspend / disable a user account

type PermissionEntry = { resource: Resource; actions: Action[] };

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION MAP
// Scope enforcement (own university / college / dept) is handled separately
// in guard.ts — this map defines the ACTION capability only.
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<Role, PermissionEntry[]> = {

  // ── OWNER ─────────────────────────────────────────────────────────────────
  OWNER: [
    { resource: 'user',         actions: ['create','read','update','delete','assign_role','suspend'] },
    { resource: 'university',   actions: ['create','read','update','delete'] },
    { resource: 'college',      actions: ['create','read','update','delete'] },
    { resource: 'department',   actions: ['create','read','update','delete'] },
    { resource: 'course',       actions: ['create','read','update','delete'] },
    { resource: 'vault_document',actions:['create','read','update','delete','verify'] },
    { resource: 'event',        actions: ['create','read','update','delete','approve'] },
    { resource: 'safety_alert', actions: ['create','read','update','delete'] },
    { resource: 'payment',      actions: ['read','update','delete'] },
    { resource: 'due',          actions: ['create','read','update','delete'] },
    { resource: 'study_group',  actions: ['create','read','update','delete'] },
    { resource: 'campus_pin',   actions: ['create','read','update','delete','approve'] },
    { resource: 'ai_usage',     actions: ['read','delete'] },
    { resource: 'audit_log',    actions: ['read'] },
    { resource: 'timetable',    actions: ['create','read','update','delete'] },
    { resource: 'cgpa',         actions: ['read'] },
  ],

  // ── LAW ENFORCEMENT ───────────────────────────────────────────────────────
  // Read-only + can send WARNING/URGENT alerts. Cannot mutate any user data.
  LAW_ENFORCEMENT: [
    { resource: 'user',         actions: ['read'] },
    { resource: 'university',   actions: ['read'] },
    { resource: 'college',      actions: ['read'] },
    { resource: 'department',   actions: ['read'] },
    { resource: 'course',       actions: ['read'] },
    { resource: 'vault_document',actions:['read'] },
    { resource: 'event',        actions: ['read'] },
    { resource: 'safety_alert', actions: ['create','read'] }, // severity enforced in action
    { resource: 'payment',      actions: ['read'] },
    { resource: 'due',          actions: ['read'] },
    { resource: 'study_group',  actions: ['read'] },
    { resource: 'campus_pin',   actions: ['create','read'] },
    { resource: 'ai_usage',     actions: ['read'] },
    { resource: 'audit_log',    actions: ['read'] },
    { resource: 'timetable',    actions: ['read'] },
    { resource: 'cgpa',         actions: ['read'] },
  ],

  // ── SUPER ADMIN ───────────────────────────────────────────────────────────
  // Full control except cannot assign OWNER or LAW_ENFORCEMENT
  SUPER_ADMIN: [
    { resource: 'user',         actions: ['create','read','update','delete','assign_role','suspend'] },
    { resource: 'university',   actions: ['create','read','update','delete'] },
    { resource: 'college',      actions: ['create','read','update','delete'] },
    { resource: 'department',   actions: ['create','read','update','delete'] },
    { resource: 'course',       actions: ['create','read','update','delete'] },
    { resource: 'vault_document',actions:['create','read','update','delete','verify'] },
    { resource: 'event',        actions: ['create','read','update','delete','approve'] },
    { resource: 'safety_alert', actions: ['create','read','update','delete'] },
    { resource: 'payment',      actions: ['read','update'] },
    { resource: 'due',          actions: ['create','read','update','delete'] },
    { resource: 'study_group',  actions: ['create','read','update','delete'] },
    { resource: 'campus_pin',   actions: ['create','read','update','delete','approve'] },
    { resource: 'ai_usage',     actions: ['read'] },
    { resource: 'audit_log',    actions: ['read'] },
    { resource: 'timetable',    actions: ['create','read','update','delete'] },
    { resource: 'cgpa',         actions: ['read'] },
  ],

  // ── UNIVERSITY ADMIN ──────────────────────────────────────────────────────
  // Scoped to their universityId
  UNIVERSITY_ADMIN: [
    { resource: 'user',         actions: ['read','update','assign_role','suspend'] },
    { resource: 'university',   actions: ['read','update'] },
    { resource: 'college',      actions: ['create','read','update','delete'] },
    { resource: 'department',   actions: ['create','read','update','delete'] },
    { resource: 'course',       actions: ['create','read','update','delete'] },
    { resource: 'vault_document',actions:['create','read','update','delete','verify'] },
    { resource: 'event',        actions: ['create','read','update','delete','approve'] },
    { resource: 'safety_alert', actions: ['create','read','update','delete'] },
    { resource: 'payment',      actions: ['read'] },
    { resource: 'due',          actions: ['create','read','update','delete'] },
    { resource: 'study_group',  actions: ['read','update','delete'] },
    { resource: 'campus_pin',   actions: ['create','read','update','delete','approve'] },
    { resource: 'ai_usage',     actions: ['read'] },
    { resource: 'audit_log',    actions: ['read'] },
    { resource: 'timetable',    actions: ['read'] },
    { resource: 'cgpa',         actions: ['read'] },
  ],

  // ── COLLEGE ADMIN ─────────────────────────────────────────────────────────
  // Scoped to their collegeId
  COLLEGE_ADMIN: [
    { resource: 'user',         actions: ['read'] },
    { resource: 'college',      actions: ['read','update'] },
    { resource: 'department',   actions: ['create','read','update','delete'] },
    { resource: 'course',       actions: ['create','read','update','delete'] },
    { resource: 'vault_document',actions:['create','read','update','delete','verify'] },
    { resource: 'event',        actions: ['create','read','update','delete','approve'] },
    { resource: 'safety_alert', actions: ['create','read'] },
    { resource: 'payment',      actions: ['read'] },
    { resource: 'due',          actions: ['create','read','update','delete'] },
    { resource: 'study_group',  actions: ['read','update'] },
    { resource: 'campus_pin',   actions: ['create','read'] },
    { resource: 'ai_usage',     actions: ['read'] },
    { resource: 'timetable',    actions: ['read'] },
    { resource: 'cgpa',         actions: ['read'] },
  ],

  // ── DEPT ADMIN ────────────────────────────────────────────────────────────
  // Scoped to their departmentId
  DEPT_ADMIN: [
    { resource: 'user',         actions: ['read'] },
    { resource: 'department',   actions: ['read','update'] },
    { resource: 'course',       actions: ['create','read','update','delete'] },
    { resource: 'vault_document',actions:['create','read','update','delete','verify'] },
    { resource: 'event',        actions: ['create','read','update','delete'] },
    { resource: 'safety_alert', actions: ['create','read'] },
    { resource: 'payment',      actions: ['read'] },
    { resource: 'due',          actions: ['create','read','update','delete'] },
    { resource: 'study_group',  actions: ['read'] },
    { resource: 'campus_pin',   actions: ['create','read'] },
    { resource: 'ai_usage',     actions: ['read'] },
    { resource: 'timetable',    actions: ['read'] },
    { resource: 'cgpa',         actions: ['read'] },
  ],

  // ── COURSE REP ────────────────────────────────────────────────────────────
  // Scoped to courseRepCourseId + courseRepLevel
  COURSE_REP: [
    { resource: 'user',         actions: ['read'] },
    { resource: 'course',       actions: ['read'] },
    { resource: 'vault_document',actions:['create','read','update','verify'] },
    { resource: 'event',        actions: ['create','read'] },
    { resource: 'safety_alert', actions: ['read'] },
    { resource: 'payment',      actions: ['read'] },      // own only
    { resource: 'due',          actions: ['read'] },
    { resource: 'study_group',  actions: ['create','read','update'] },
    { resource: 'campus_pin',   actions: ['create','read'] },
    { resource: 'ai_usage',     actions: ['read'] },
    { resource: 'timetable',    actions: ['create','read','update','delete'] },
    { resource: 'cgpa',         actions: ['read'] },      // own only
  ],

  // ── CONTRIBUTOR ───────────────────────────────────────────────────────────
  CONTRIBUTOR: [
    { resource: 'user',         actions: ['read'] },       // own only
    { resource: 'vault_document',actions:['create','read','update','verify'] },
    { resource: 'event',        actions: ['read'] },
    { resource: 'safety_alert', actions: ['read'] },
    { resource: 'payment',      actions: ['read'] },       // own only
    { resource: 'due',          actions: ['read'] },
    { resource: 'study_group',  actions: ['create','read','update'] },
    { resource: 'campus_pin',   actions: ['create','read'] },
    { resource: 'ai_usage',     actions: ['read'] },
    { resource: 'timetable',    actions: ['create','read','update','delete'] },
    { resource: 'cgpa',         actions: ['create','read','update','delete'] },
  ],

  // ── STUDENT ───────────────────────────────────────────────────────────────
  STUDENT: [
    { resource: 'user',         actions: ['read'] },       // own only
    { resource: 'vault_document',actions:['create','read'] },
    { resource: 'event',        actions: ['read'] },
    { resource: 'safety_alert', actions: ['read'] },
    { resource: 'payment',      actions: ['read'] },       // own only
    { resource: 'due',          actions: ['read'] },
    { resource: 'study_group',  actions: ['create','read'] },
    { resource: 'campus_pin',   actions: ['create','read'] },
    { resource: 'ai_usage',     actions: ['read'] },
    { resource: 'timetable',    actions: ['create','read','update','delete'] },
    { resource: 'cgpa',         actions: ['create','read','update','delete'] },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Check if a role has permission for an action on a resource */
export function can(role: Role, resource: Resource, action: Action): boolean {
  return (
    ROLE_PERMISSIONS[role]?.some(
      p => p.resource === resource && p.actions.includes(action)
    ) ?? false
  );
}

/** Get all actions a role can perform on a resource */
export function actionsFor(role: Role, resource: Resource): Action[] {
  return (
    ROLE_PERMISSIONS[role]?.find(p => p.resource === resource)?.actions ?? []
  );
}
