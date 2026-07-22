// src/lib/rbac/ui.ts
// ─────────────────────────────────────────────────────────────────────────────
// CLIENT-SAFE RBAC helpers for Svelte components.
// Never import from guard.ts (server-only) in .svelte files — use this instead.
// ─────────────────────────────────────────────────────────────────────────────

import type { Role } from './roles';
import { can, type Resource, type Action } from './permissions';

// ── Re-exports for convenience ────────────────────────────────────────────────
export { can } from './permissions';
export type { Role } from './roles';
export { ROLE_LABELS, ROLE_COLORS, ROLE_HIERARCHY, rankOf, outranks } from './roles';

// ── UI permission check ───────────────────────────────────────────────────────
/**
 * Same as `can()` but typed for UI use.
 * Use to conditionally render buttons, forms, links.
 *
 * @example
 * {#if canUI(user.role, 'event', 'approve')}
 *   <button>Approve</button>
 * {/if}
 */
export function canUI(role: Role | undefined | null, resource: Resource, action: Action): boolean {
  if (!role) return false;
  return can(role, resource, action);
}

// ── Role group helpers ────────────────────────────────────────────────────────

/** Platform-wide authority (no scope restrictions) */
export function isPlatformRole(role: Role): boolean {
  return ['OWNER', 'LAW_ENFORCEMENT', 'SUPER_ADMIN'].includes(role);
}

/** Has access to any part of the /admin panel */
export function isAdminRole(role: Role): boolean {
  return ['OWNER', 'LAW_ENFORCEMENT', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'COLLEGE_ADMIN', 'DEPT_ADMIN'].includes(role);
}

/** Can auto-publish events (no approval queue) */
export function canAutoPublishEvents(role: Role): boolean {
  return ['OWNER', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN'].includes(role);
}

/** Can approve/reject events submitted by others */
export function canApproveEvents(role: Role): boolean {
  return ['OWNER', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'COLLEGE_ADMIN'].includes(role);
}

/** Can create events (goes to pending for most roles) */
export function canCreateEvents(role: Role): boolean {
  return ['OWNER', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'COLLEGE_ADMIN', 'DEPT_ADMIN', 'COURSE_REP'].includes(role);
}

/** Can RSVP to events */
export function canRsvp(role: Role): boolean {
  return ['COURSE_REP', 'CONTRIBUTOR', 'STUDENT'].includes(role);
}

/** Can verify vault documents */
export function canVerifyDocs(role: Role): boolean {
  return ['OWNER', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'COLLEGE_ADMIN', 'DEPT_ADMIN', 'COURSE_REP', 'CONTRIBUTOR'].includes(role);
}

/** Can send safety alerts */
export function canSendAlerts(role: Role): boolean {
  return can(role, 'safety_alert', 'create');
}

/** Can send URGENT alerts specifically */
export function canSendUrgentAlerts(role: Role): boolean {
  return ['OWNER', 'LAW_ENFORCEMENT', 'SUPER_ADMIN'].includes(role);
}

/** Can manage users (assign roles, suspend, etc.) */
export function canManageUsers(role: Role): boolean {
  return can(role, 'user', 'assign_role') || can(role, 'user', 'suspend');
}

/** Can manage departmental dues */
export function canManageDues(role: Role): boolean {
  return can(role, 'due', 'create');
}

// ── Nav item definitions ──────────────────────────────────────────────────────

export type NavItem = {
  href:     string;
  label:    string;
  icon:     string; // lucide icon name
  badge?:   number | null;
  exact?:   boolean;
};

export type NavSection = {
  section:  string;
  items:    NavItem[];
};

/**
 * Returns the admin sidebar nav sections visible to the given role.
 * Pass pending counts for badge display.
 */
export function adminNav(
  role: Role,
  counts?: {
    pendingEvents?: number;
    pendingDocs?:   number;
    pendingPins?:   number;
    activeAlerts?:  number;
  }
): NavSection[] {
  const sections: NavSection[] = [];

  // ── Overview — always shown to all admin roles ───────────────
  sections.push({
    section: 'Overview',
    items: [
      { href: '/admin',      label: 'Dashboard',   icon: 'LayoutDashboard', exact: true },
    ],
  });

  // ── Institution management ────────────────────────────────────
  const institutionItems: NavItem[] = [];

  if (can(role, 'university', 'read')) {
    institutionItems.push({ href: '/admin/universities', label: 'Universities', icon: 'Building2' });
  }
  if (can(role, 'college', 'read') || can(role, 'department', 'read') || can(role, 'course', 'read')) {
    institutionItems.push({ href: '/admin/academics',   label: 'Academics',   icon: 'Layers' });
  }

  if (institutionItems.length > 0) {
    sections.push({ section: 'Institution', items: institutionItems });
  }

  // ── People ────────────────────────────────────────────────────
  const peopleItems: NavItem[] = [];

  if (can(role, 'user', 'read')) {
    peopleItems.push({ href: '/admin/users', label: 'Users', icon: 'Users' });
  }
  if (can(role, 'user', 'assign_role')) {
    peopleItems.push({ href: '/admin/staff', label: 'Staff & Roles', icon: 'ShieldCheck' });
  }

  if (peopleItems.length > 0) {
    sections.push({ section: 'People', items: peopleItems });
  }

  // ── Content ───────────────────────────────────────────────────
  const contentItems: NavItem[] = [];

  if (can(role, 'event', 'read')) {
    contentItems.push({
      href:  '/admin/events',
      label: 'Events',
      icon:  'Calendar',
      badge: counts?.pendingEvents || null,
    });
  }
  if (can(role, 'vault_document', 'read')) {
    contentItems.push({
      href:  '/admin/vault',
      label: 'Vault',
      icon:  'FileText',
      badge: counts?.pendingDocs || null,
    });
  }
  if (can(role, 'study_group', 'read')) {
    contentItems.push({ href: '/admin/study-groups', label: 'Study Groups', icon: 'BookOpen' });
  }

  if (contentItems.length > 0) {
    sections.push({ section: 'Content', items: contentItems });
  }

  // ── Campus ────────────────────────────────────────────────────
  const campusItems: NavItem[] = [];

  if (can(role, 'safety_alert', 'create') || can(role, 'safety_alert', 'read')) {
    campusItems.push({
      href:  '/admin/alerts',
      label: 'Safety Alerts',
      icon:  'ShieldAlert',
      badge: counts?.activeAlerts || null,
    });
  }
  if (can(role, 'campus_pin', 'approve') || can(role, 'campus_pin', 'read')) {
    campusItems.push({
      href:  '/admin/pins',
      label: 'Campus Pins',
      icon:  'MapPin',
      badge: counts?.pendingPins || null,
    });
  }

  if (campusItems.length > 0) {
    sections.push({ section: 'Campus', items: campusItems });
  }

  // ── Finance ───────────────────────────────────────────────────
  const financeItems: NavItem[] = [];

  if (can(role, 'payment', 'read')) {
    financeItems.push({ href: '/admin/payments', label: 'Payments', icon: 'CreditCard' });
  }
  if (can(role, 'due', 'create')) {
    financeItems.push({ href: '/admin/dues', label: 'Departmental Dues', icon: 'Receipt' });
  }

  if (financeItems.length > 0) {
    sections.push({ section: 'Finance', items: financeItems });
  }

  // ── Intelligence ──────────────────────────────────────────────
  const intelItems: NavItem[] = [];

  if (can(role, 'ai_usage', 'read')) {
    intelItems.push({ href: '/admin/ai-usage', label: 'AI Usage', icon: 'Bot' });
  }
  if (can(role, 'audit_log', 'read')) {
    intelItems.push({ href: '/admin/audit', label: 'Audit Log', icon: 'ScrollText' });
  }

  if (intelItems.length > 0) {
    sections.push({ section: 'Intelligence', items: intelItems });
  }

  return sections;
}

// ── Main App Navigation ──────────────────────────────────────────────────────

export type AppNavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number | null;
  exact?: boolean;
  children?: AppNavItem[];
};

export function getAppNavigation(role: Role): AppNavItem[] {
  const nav: AppNavItem[] = [];

  // ── Dashboard ──────────────────────────────────────────────────
  nav.push({
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    exact: true
  });

  // ── Vault ──────────────────────────────────────────────────────
  if (can(role, 'vault_document', 'read')) {
    nav.push({
      href: '/vault',
      label: 'Vault',
      icon: 'FileText',
      children: [
        { href: '/vault', label: 'Browse', icon: 'FolderOpen' },
        { href: '/vault/upload', label: 'Upload', icon: 'Upload' },
        { href: '/vault/search', label: 'Search', icon: 'Search' }
      ]
    });
  }

  // ── Payments ──────────────────────────────────────────────────
  if (can(role, 'payment', 'read')) {
    nav.push({
      href: '/payments',
      label: 'Payments',
      icon: 'CreditCard',
      children: [
        { href: '/payments', label: 'Overview', icon: 'LayoutDashboard' },
        { href: '/payments/initiate', label: 'Make Payment', icon: 'Send' },
        { href: '/payments/history', label: 'History', icon: 'Clock' },
        { href: '/payments/receipts', label: 'Receipts', icon: 'FileText' }
      ]
    });
  }

  // ── Academics ──────────────────────────────────────────────────
  if (can(role, 'course', 'read') || can(role, 'registration', 'read')) {
    nav.push({
      href: '/courses',
      label: 'Academics',
      icon: 'BookOpen',
      children: [
        { href: '/courses', label: 'My Courses', icon: 'Book' },
        { href: '/courses/register', label: 'Register', icon: 'ClipboardList' },
        { href: '/results', label: 'Results', icon: 'Award' }
      ]
    });
  }

  // ── Logbook ────────────────────────────────────────────────────
  if (can(role, 'submission', 'read')) {
    nav.push({
      href: '/logbook',
      label: 'Logbook',
      icon: 'Clipboard',
      children: [
        { href: '/logbook', label: 'My Submissions', icon: 'FileText' },
        { href: '/logbook/submit', label: 'New Submission', icon: 'PenSquare' }
      ]
    });
  }

  // ── Events ─────────────────────────────────────────────────────
  if (canCreateEvents(role)) {
    nav.push({
      href: '/events',
      label: 'Events',
      icon: 'Calendar',
      children: [
        { href: '/events', label: 'Calendar', icon: 'CalendarDays' },
        { href: '/events/create', label: 'Create Event', icon: 'Plus' }
      ]
    });
  }

  // ── Shield ─────────────────────────────────────────────────────
  nav.push({
    href: '/shield',
    label: 'Shield',
    icon: 'Shield',
    children: [
      { href: '/shield', label: 'Status', icon: 'ShieldCheck' },
      { href: '/shield/safe-walk', label: 'Safe Walk', icon: 'Footprints' },
      { href: '/shield/emergency', label: 'Emergency', icon: 'Siren' }
    ]
  });

  // ── Alerts ─────────────────────────────────────────────────────
  if (canSendAlerts(role)) {
    nav.push({
      href: '/alerts',
      label: 'Alerts',
      icon: 'Bell',
      children: [
        { href: '/alerts', label: 'Feed', icon: 'BellRing' },
        { href: '/alerts/compose', label: 'Send Alert', icon: 'Send' }
      ]
    });
  }

  // ── Notifications ─────────────────────────────────────────────
  nav.push({
    href: '/notifications',
    label: 'Notifications',
    icon: 'Bell',
    badge: null // Will be populated from store
  });

  // ── Settings ───────────────────────────────────────────────────
  nav.push({
    href: '/settings',
    label: 'Settings',
    icon: 'Settings',
    children: [
      { href: '/profile', label: 'Profile', icon: 'User' },
      { href: '/settings', label: 'Preferences', icon: 'Sliders' },
      { href: '/settings/security', label: 'Security', icon: 'Lock' }
    ]
  });

  return nav;
}

// ── Dashboard card definitions ────────────────────────────────────────────────

export type DashCard = {
  href:        string;
  label:       string;
  description: string;
  icon:        string;
  color:       'purple' | 'blue' | 'green' | 'amber' | 'red' | 'slate';
  stat?:       string | number | null;
  statLabel?:  string;
  badge?:      number | null;
};

/**
 * Returns the quick-action cards shown on the role's dashboard home.
 */
export function dashCards(role: Role, stats?: Record<string, number | null>): DashCard[] {
  const cards: DashCard[] = [];

  switch (role) {

    case 'OWNER':
    case 'SUPER_ADMIN':
      cards.push(
        { href: '/admin/users',        label: 'Users',           description: 'Manage all platform users',       icon: 'Users',         color: 'purple', stat: stats?.totalUsers,    statLabel: 'total users'        },
        { href: '/admin/universities', label: 'Universities',    description: 'Add & manage universities',       icon: 'Building2',     color: 'blue',   stat: stats?.universities,  statLabel: 'universities'       },
        { href: '/admin/events',       label: 'Events',          description: 'Review & approve events',         icon: 'Calendar',      color: 'amber',  stat: stats?.pendingEvents, statLabel: 'pending',   badge: stats?.pendingEvents },
        { href: '/admin/alerts',       label: 'Safety Alerts',   description: 'Send campus-wide alerts',         icon: 'ShieldAlert',   color: 'red',    stat: stats?.activeAlerts,  statLabel: 'active'             },
        { href: '/admin/vault',        label: 'Vault',           description: 'Verify uploaded documents',       icon: 'FileText',      color: 'green',  stat: stats?.pendingDocs,   statLabel: 'pending',   badge: stats?.pendingDocs   },
        { href: '/admin/payments',     label: 'Payments',        description: 'View all transactions',           icon: 'CreditCard',    color: 'green',  stat: stats?.totalRevenue,  statLabel: 'total revenue'      },
        { href: '/admin/staff',        label: 'Staff & Roles',   description: 'Assign roles to staff',           icon: 'ShieldCheck',   color: 'purple'                                                             },
        { href: '/admin/ai-usage',     label: 'AI Usage',        description: 'Monitor AI call patterns',        icon: 'Bot',           color: 'slate',  stat: stats?.aiToday,       statLabel: 'calls today'        },
        { href: '/admin/audit',        label: 'Audit Log',       description: 'Full platform audit trail',       icon: 'ScrollText',    color: 'slate'                                                              },
      );
      break;

    case 'LAW_ENFORCEMENT':
      cards.push(
        { href: '/admin/alerts',       label: 'Send Alert',      description: 'Send WARNING or URGENT alerts',   icon: 'ShieldAlert',   color: 'red',    stat: stats?.activeAlerts,  statLabel: 'active'             },
        { href: '/admin/users',        label: 'View Users',      description: 'Read-only user directory',        icon: 'Users',         color: 'slate',  stat: stats?.totalUsers,    statLabel: 'total users'        },
        { href: '/admin/pins',         label: 'Campus Pins',     description: 'Submit emergency location pins',  icon: 'MapPin',        color: 'red'                                                                },
        { href: '/admin/audit',        label: 'Audit Log',       description: 'Full read-only audit trail',      icon: 'ScrollText',    color: 'slate'                                                              },
      );
      break;

    case 'UNIVERSITY_ADMIN':
      cards.push(
        { href: '/admin/users',        label: 'Users',           description: 'Manage university users',         icon: 'Users',         color: 'purple', stat: stats?.totalUsers,    statLabel: 'in your uni'        },
        { href: '/admin/events',       label: 'Events',          description: 'Approve events for your uni',     icon: 'Calendar',      color: 'amber',  badge: stats?.pendingEvents                               },
        { href: '/admin/academics',    label: 'Academics',       description: 'Manage colleges & departments',   icon: 'Layers',        color: 'blue'                                                               },
        { href: '/admin/alerts',       label: 'Alerts',          description: 'Send alerts to your campus',      icon: 'ShieldAlert',   color: 'red',    stat: stats?.activeAlerts,  statLabel: 'active'             },
        { href: '/admin/staff',        label: 'Staff',           description: 'Manage admins in your uni',       icon: 'ShieldCheck',   color: 'purple'                                                             },
        { href: '/admin/payments',     label: 'Payments',        description: 'View financial activity',         icon: 'CreditCard',    color: 'green',  stat: stats?.totalRevenue,  statLabel: 'revenue'            },
        { href: '/admin/pins',         label: 'Campus Pins',     description: 'Verify & manage map pins',        icon: 'MapPin',        color: 'blue',   badge: stats?.pendingPins                                 },
      );
      break;

    case 'COLLEGE_ADMIN':
      cards.push(
        { href: '/admin/events',       label: 'Events',          description: 'Approve college events',          icon: 'Calendar',      color: 'amber',  badge: stats?.pendingEvents                               },
        { href: '/admin/academics',    label: 'Departments',     description: 'Manage departments & courses',    icon: 'Layers',        color: 'blue'                                                               },
        { href: '/admin/vault',        label: 'Vault',           description: 'Verify documents in your college',icon: 'FileText',      color: 'green',  badge: stats?.pendingDocs                                 },
        { href: '/admin/dues',         label: 'Dues',            description: 'Manage college-level dues',       icon: 'Receipt',       color: 'green'                                                              },
        { href: '/admin/alerts',       label: 'Alerts',          description: 'Send college-scoped alerts',      icon: 'ShieldAlert',   color: 'red'                                                                },
        { href: '/admin/users',        label: 'Students',        description: 'View college student directory',  icon: 'Users',         color: 'slate',  stat: stats?.totalUsers,    statLabel: 'students'           },
      );
      break;

    case 'DEPT_ADMIN':
      cards.push(
        { href: '/admin/vault',        label: 'Vault',           description: 'Verify dept documents',           icon: 'FileText',      color: 'green',  badge: stats?.pendingDocs                                 },
        { href: '/admin/dues',         label: 'Dues',            description: 'Create & manage dept dues',       icon: 'Receipt',       color: 'amber'                                                              },
        { href: '/admin/events',       label: 'Events',          description: 'Post dept events',                icon: 'Calendar',      color: 'purple'                                                             },
        { href: '/admin/academics',    label: 'Courses',         description: 'Manage your dept courses',        icon: 'BookOpen',      color: 'blue'                                                               },
        { href: '/admin/users',        label: 'Students',        description: 'View dept student list',          icon: 'Users',         color: 'slate',  stat: stats?.totalUsers,    statLabel: 'students'           },
        { href: '/admin/alerts',       label: 'Alerts',          description: 'Send dept-scoped alerts',         icon: 'ShieldAlert',   color: 'red'                                                                },
      );
      break;

    case 'COURSE_REP':
    case 'CONTRIBUTOR':
      cards.push(
        { href: '/vault',              label: 'Vault',           description: 'Browse & upload documents',       icon: 'FileText',      color: 'blue',   stat: stats?.myDocs,        statLabel: 'my documents'       },
        { href: '/logbook',            label: 'Logbook',         description: 'Track your submissions',          icon: 'Clipboard',     color: 'green',  stat: stats?.submissions,   statLabel: 'submissions'        },
        { href: '/events',             label: 'Events',          description: 'View & create events',            icon: 'Calendar',      color: 'purple', stat: stats?.upcoming,      statLabel: 'upcoming'           },
        { href: '/shield',             label: 'Shield',          description: 'Access safety features',          icon: 'Shield',        color: 'red'                                                                },
        { href: '/payments',           label: 'Payments',        description: 'Make payments & view history',    icon: 'CreditCard',    color: 'green'                                                              },
      );
      break;

    case 'STUDENT':
    default:
      cards.push(
        { href: '/vault',              label: 'Vault',           description: 'Access past questions & notes',   icon: 'FileText',      color: 'blue',   stat: stats?.available,      statLabel: 'available'          },
        { href: '/courses',            label: 'Courses',         description: 'View your enrolled courses',      icon: 'BookOpen',      color: 'purple', stat: stats?.enrolled,      statLabel: 'enrolled'           },
        { href: '/payments',           label: 'Payments',        description: 'Pay fees & view receipts',        icon: 'CreditCard',    color: 'green'                                                              },
        { href: '/shield',             label: 'Shield',          description: 'Emergency & safety tools',        icon: 'Shield',        color: 'red'                                                                },
        { href: '/logbook',            label: 'Logbook',         description: 'Submit & track assignments',      icon: 'Clipboard',     color: 'amber'                                                              },
        { href: '/events',             label: 'Events',          description: 'Campus events & activities',      icon: 'Calendar',      color: 'purple', stat: stats?.upcoming,      statLabel: 'upcoming'           },
      );
      break;
  }

  return cards;
}

// ── Role badge color class ────────────────────────────────────────────────────
export function roleBadgeClass(role: Role): string {
  const map: Record<Role, string> = {
    OWNER:            'badge-owner',
    LAW_ENFORCEMENT:  'badge-law',
    SUPER_ADMIN:      'badge-super',
    UNIVERSITY_ADMIN: 'badge-uni',
    COLLEGE_ADMIN:    'badge-col',
    DEPT_ADMIN:       'badge-dept',
    COURSE_REP:       'badge-rep',
    CONTRIBUTOR:      'badge-contrib',
    STUDENT:          'badge-student',
  };
  return map[role] ?? 'badge-student';
}

// ── Owner specific navigation ────────────────────────────────────────────────

export function getOwnerNavigation(role: Role): AppNavItem[] {
  const nav: AppNavItem[] = [];

  if (role !== 'OWNER') return nav;

  nav.push(
    {
      href: '/owner/dashboard',
      label: 'Dashboard',
      icon: 'LayoutDashboard',
      exact: true
    },
    {
      href: '/owner/universities',
      label: 'Universities',
      icon: 'Building2',
      children: [
        { href: '/owner/universities', label: 'All Universities', icon: 'Building' },
        { href: '/owner/universities/create', label: 'Add University', icon: 'Plus' }
      ]
    },
    {
      href: '/owner/admins',
      label: 'Admins',
      icon: 'ShieldCheck',
      children: [
        { href: '/owner/admins', label: 'All Admins', icon: 'Users' },
        { href: '/owner/admins/create', label: 'Add Admin', icon: 'UserPlus' }
      ]
    },
    {
      href: '/owner/subscriptions',
      label: 'Subscriptions',
      icon: 'CreditCard',
      children: [
        { href: '/owner/subscriptions', label: 'Plans', icon: 'Package' },
        { href: '/owner/subscriptions/transactions', label: 'Transactions', icon: 'Receipt' }
      ]
    },
    {
      href: '/owner/analytics',
      label: 'Analytics',
      icon: 'ChartBar',
      children: [
        { href: '/owner/analytics', label: 'Overview', icon: 'ChartColumn' },
        { href: '/owner/analytics/reports', label: 'Reports', icon: 'FileBarChart' }
      ]
    },
    {
      href: '/owner/broadcasts',
      label: 'Broadcasts',
      icon: 'Megaphone'
    },
    {
      href: '/owner/feature-flags',
      label: 'Feature Flags',
      icon: 'Flag'
    },
    {
      href: '/owner/audit',
      label: 'Audit',
      icon: 'ScrollText'
    },
    {
      href: '/owner/system',
      label: 'System',
      icon: 'Server',
      children: [
        { href: '/owner/system', label: 'Status', icon: 'Activity' },
        { href: '/owner/system/logs', label: 'Logs', icon: 'FileCode' },
        { href: '/owner/system/backup', label: 'Backup', icon: 'Database' }
      ]
    }
  );

  return nav;
}