// src/lib/services/student-dashboard.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Student dashboard metrics aggregation — FIXED to match actual schema
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '$lib/server/db/index.js';
import Redis from 'ioredis';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AcademicMetrics {
  enrolledCourses: number;
  gpa: number | null;
  unsubmittedAssignments: number;
  upcomingDeadlines: Array<{
    id: string;
    courseCode: string;
    courseName: string;
    dueDate: Date;
    daysUntilDue: number;
  }>;
  submissionRate: number; // percentage 0-100
}

export interface FinancialMetrics {
  totalDues: number;
  paidAmount: number;
  outstandingAmount: number;
  departmentalBreakdown: Array<{
    departmentName: string;
    amount: number;
    paid: boolean;
    dueDate?: Date;
  }>;
  lastPaymentDate: Date | null;
  receiptCount: number;
}

export interface EngagementMetrics {
  loginStreak: number;
  lastLogin: Date | null;
  eventsAttended: number;
  upcomingEvents: number;
  vaultUploads: number;
  submissionsThisMonth: number;
}

export interface SafetyMetrics {
  emergencyContacts: number;
  lastSafeWalkCheckin: Date | null;
  safeWalkActive: boolean;
  alertsReceived: number;
}

export interface StudentDashboardMetrics {
  studentId: string;
  university: {
    id: string;
    name: string;
  };
  student: {
    matricNumber: string | null;
    firstName: string;
    surname: string;
    currentLevel: number | null;
    department: {
      name: string;
      college: {
        name: string;
      };
    };
  };
  academic: AcademicMetrics;
  financial: FinancialMetrics;
  engagement: EngagementMetrics;
  safety: SafetyMetrics;
  calculatedAt: Date;
}

// ── Service class ───────────────────────────────────────────────────────────

export class StudentDashboardService {
  private redis: Redis | null = null;
  private cache_ttl = 5 * 60; // 5 minutes

  constructor(redisClient?: Redis) {
    this.redis = redisClient || null;
  }

  private getCacheKey(studentId: string): string {
    return `dashboard:student:${studentId}`;
  }

  /**
   * Get cached dashboard or compute fresh
   */
  async getDashboard(
    studentId: string,
    prisma: PrismaClient,
    forceRefresh = false
  ): Promise<StudentDashboardMetrics> {
    // L1: Redis cache
    if (!forceRefresh && this.redis) {
      const cached = await this.redis.get(this.getCacheKey(studentId));
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // Corrupt cache, recompute
        }
      }
    }

    // L2: Compute fresh
    const metrics = await this.computeDashboard(studentId, prisma);

    // Store in cache
    if (this.redis) {
      await this.redis.setex(
        this.getCacheKey(studentId),
        this.cache_ttl,
        JSON.stringify(metrics)
      );
    }

    return metrics;
  }

  /**
   * Main computation logic
   */
  private async computeDashboard(
    studentId: string,
    prisma: PrismaClient
  ): Promise<StudentDashboardMetrics> {
    // Fetch student with correct relations from schema
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        university: {
          select: {
            id: true,
            name: true,
          },
        },
        department: {
          select: {
            name: true,
            collegeId: true,
            college: {
              select: { name: true },
            },
          },
        },
        registrations: {
          include: {
            course: {
              select: {
                id: true,
                code: true,
                title: true,
                departmentId: true,
              },
            },
          },
        },
        submissions: {
          select: { createdAt: true, id: true },
        },
        eventRsvps: {
          select: { createdAt: true },
        },
        sessions: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' as const },
          take: 1,
        },
      },
    });

    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    if (!student.department) {
      throw new Error('Student account not properly configured (missing department)');
    }

    if (!student.university) {
      throw new Error('Student account not properly configured (missing university)');
    }

    // Compute each section in parallel
    const [academic, financial, engagement, safety] = await Promise.all([
      this.computeAcademicMetrics(studentId, student, prisma),
      this.computeFinancialMetrics(studentId, prisma),
      this.computeEngagementMetrics(studentId, student, prisma),
      this.computeSafetyMetrics(studentId, prisma),
    ]);

    return {
      studentId,
      university: {
        id: student.university!.id,
        name: student.university!.name,
      },
      student: {
        matricNumber: student.matricNumber,
        firstName: student.firstName,
        surname: student.surname,
        currentLevel: student.level,
        department: {
          name: student.department!.name,
          college: {
            name: student.department!.college.name,
          },
        },
      },
      academic,
      financial,
      engagement,
      safety,
      calculatedAt: new Date(),
    };
  }

  /**
   * Academic metrics: GPA, courses, submissions
   */
  private async computeAcademicMetrics(
    studentId: string,
    student: any,
    prisma: PrismaClient
  ): Promise<AcademicMetrics> {
    // Enrolled courses (via Registration model)
    const enrolledCourses = student.registrations.filter(
      (r: any) => r.status === 'ENROLLED'
    ).length;

    // Calculate GPA from CgpaEntry records
    const cgpaEntries = await prisma.cgpaEntry.findMany({
      where: { userId: studentId },
      select: { gradePoints: true },
    });

    const gpa =
      cgpaEntries.length > 0
        ? cgpaEntries.reduce((sum: number, e: any) => sum + (e.gradePoints || 0), 0) /
          cgpaEntries.length
        : null;

    // For now, since Assignment model doesn't exist in schema,
    // use submissions as proxy for engagement
    // In future, you'll need to define Assignment or similar model
    const submittedCount = student.submissions.length;

    // Upcoming deadlines placeholder (until Assignment model exists)
    const upcomingDeadlines: AcademicMetrics['upcomingDeadlines'] = [];
    // TODO: Once Assignment model is added, query upcoming deadlines

    const submissionRate =
      enrolledCourses > 0
        ? Math.round((submittedCount / Math.max(enrolledCourses, 1)) * 100)
        : 0;

    return {
      enrolledCourses,
      gpa: gpa ? Math.round(gpa * 100) / 100 : null,
      unsubmittedAssignments: 0, // TODO: Add Assignment model
      upcomingDeadlines,
      submissionRate: Math.min(submissionRate, 100),
    };
  }

  /**
   * Financial metrics: dues, payments, receipts
   */
  private async computeFinancialMetrics(
    studentId: string,
    prisma: PrismaClient
  ): Promise<FinancialMetrics> {
    // Get all payments for this student
    const payments = await prisma.payment.findMany({
      where: { userId: studentId },
      include: {
        due: {
          include: {
            department: true,
          },
        },
      },
    });

    // Group by department and calculate totals
    const duesByDept = new Map<
      string,
      { amount: number; paid: number; deptName: string }
    >();

    for (const payment of payments) {
      const deptId = payment.due.departmentId;
      if (!duesByDept.has(String(deptId))) {
        duesByDept.set(String(deptId), {
          amount: payment.due.amount,
          paid: 0,
          deptName: payment.due.department.name,
        });
      }

      const entry = duesByDept.get(String(deptId))!;
      if (payment.status === 'SUCCESS') {
        entry.paid += payment.amount;
      }
    }

    const totalDues = Array.from(duesByDept.values()).reduce(
      (sum, d) => sum + d.amount,
      0
    );
    const paidAmount = Array.from(duesByDept.values()).reduce(
      (sum, d) => sum + d.paid,
      0
    );

    // Departmental breakdown
    const departmentalBreakdown = Array.from(duesByDept.values()).map((d) => ({
      departmentName: d.deptName,
      amount: d.amount,
      paid: d.paid >= d.amount,
    }));

    // Last payment
    const lastPayment = await prisma.payment.findFirst({
      where: { userId: studentId, status: 'SUCCESS' },
      orderBy: { paidAt: 'desc' },
      select: { paidAt: true },
    });

    // Receipt count
    const receiptCount = await prisma.paymentReceipt.count({
      where: {
        payment: { userId: studentId },
      },
    });

    return {
      totalDues,
      paidAmount,
      outstandingAmount: Math.max(totalDues - paidAmount, 0),
      departmentalBreakdown,
      lastPaymentDate: lastPayment?.paidAt || null,
      receiptCount,
    };
  }

  /**
   * Engagement metrics: logins, events, vault, submissions
   */
  private async computeEngagementMetrics(
    studentId: string,
    student: any,
    prisma: PrismaClient
  ): Promise<EngagementMetrics> {
    // Last login from UserSession
    const lastSession = await prisma.userSession.findFirst({
      where: { userId: studentId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    // Login streak (simplified: consecutive login days via sessions)
    let loginStreak = 0;
    if (lastSession) {
      const sessions = await prisma.userSession.findMany({
        where: { userId: studentId },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      if (sessions.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(today);

        for (const session of sessions) {
          const sessionDate = new Date(session.createdAt);
          sessionDate.setHours(0, 0, 0, 0);

          if (sessionDate.getTime() === checkDate.getTime()) {
            continue; // same day
          }

          checkDate.setDate(checkDate.getDate() - 1);
          if (sessionDate.getTime() === checkDate.getTime()) {
            loginStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Events attended (RSVP'd with GOING status)
    const eventsAttended = await prisma.eventRsvp.count({
      where: {
        userId: studentId,
        status: 'GOING',
      },
    });

    // Upcoming events RSVP'd
    const upcomingEvents = await prisma.eventRsvp.count({
      where: {
        userId: studentId,
        event: {
          startAt: { gt: new Date() },
        },
      },
    });

    // Vault uploads
    const vaultUploads = await prisma.vaultDocument.count({
      where: { uploadedById: studentId },
    });

    // Submissions this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const submissionsThisMonth = await prisma.submission.count({
      where: {
        userId: studentId,
        createdAt: { gte: thisMonth },
      },
    });

    return {
      loginStreak,
      lastLogin: lastSession?.createdAt || null,
      eventsAttended,
      upcomingEvents,
      vaultUploads,
      submissionsThisMonth,
    };
  }

  /**
   * Safety metrics: emergency contacts, safe-walk, alerts
   */
  private async computeSafetyMetrics(
    studentId: string,
    prisma: PrismaClient
  ): Promise<SafetyMetrics> {
    // Emergency contacts (via TrustedContact)
    const emergencyContacts = await prisma.trustedContact.count({
      where: {
        userId: studentId,
        status: 'ACTIVE',
      },
    });

    // Last safe-walk check-in
    const lastCheckin = await prisma.safeWalkSession.findFirst({
      where: { userId: studentId },
      select: { checkedInAt: true },
      orderBy: { startedAt: 'desc' },
    });

    // Active safe-walk session
    const activeWalk = await prisma.safeWalkSession.findFirst({
      where: {
        userId: studentId,
        status: 'ACTIVE',
      },
    });

    // Alerts received (this month)
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const alertsReceived = await prisma.alertReceipt.count({
      where: {
        userId: studentId,
        receivedAt: { gte: thisMonth },
      },
    });

    return {
      emergencyContacts,
      lastSafeWalkCheckin: lastCheckin?.checkedInAt || null,
      safeWalkActive: !!activeWalk,
      alertsReceived,
    };
  }

  /**
   * Invalidate cache for a student
   */
  async invalidateCache(studentId: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(this.getCacheKey(studentId));
    }
  }
}

// Export singleton
let dashboardService: StudentDashboardService | null = null;

export function getStudentDashboardService(
  redis?: Redis
): StudentDashboardService {
  if (!dashboardService) {
    dashboardService = new StudentDashboardService(redis);
  }
  return dashboardService;
}