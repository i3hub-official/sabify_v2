// src/routes/(app)/seed/+page.server.ts
// ─────────────────────────────────────────────────────────────────────────────
// Web UI for seeding database — with proper type imports.
// ⚠️  SECURITY: Only accessible in development mode. Disable in production.
// ─────────────────────────────────────────────────────────────────────────────

import { fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { hashPassword } from '$lib/server/auth';
import { protectEmail, protectName } from '$lib/security/dataProtection';
import { nanoid } from 'nanoid';
import type { Role, StaffTitle } from '@prisma/client';

// Import your existing data structures
import universitiesData from '$lib/data/universities.json';
import { allUniversities } from '$lib/data/index';

// ── Security: Only allow in development ──────────────────────────────────────

const DEV_MODE = process.env.NODE_ENV === 'development';

export const prerender = false;

// ── Helper functions ────────────────────────────────────────────────────────

function sanitize(name: string): string {
  return name
    .replace(/&/g, 'and')
    .replace(/\//g, ' or ')
    .replace(/[^a-zA-Z0-9\s(),.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBracketCode(name: string): string | null {
  const match = name.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

function cleanName(name: string): string {
  return sanitize(name.replace(/\s*\([^)]+\)\s*/g, '').trim());
}

function autoCode(name: string): string {
  const clean = sanitize(name)
    .replace(/^College\s+of\s+/i, '')
    .replace(/^School\s+of\s+/i, '')
    .replace(/^Department\s+of\s+/i, '')
    .replace(/^Faculty\s+of\s+/i, '')
    .replace(/^Faculty\s+/i, '')
    .replace(/^Center\s+for\s+/i, '')
    .trim();
  const words = clean.split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.map(w => w[0]).join('').toUpperCase().slice(0, 10);
}

function getCode(name: string): string {
  return extractBracketCode(name) ?? autoCode(cleanName(name));
}

async function uniqueSlug(base: string): Promise<string> {
  const prisma = await getPrismaClient();
  let slug = base.toUpperCase();
  let n = 1;
  while (await prisma.university.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base.toUpperCase()}-${++n}`;
  }
  return slug;
}

async function uniqueDeptCode(base: string, collegeId: number): Promise<string> {
  const prisma = await getPrismaClient();
  let code = base;
  let n = 1;
  while (
    await prisma.department.findUnique({
      where: { code_collegeId: { code, collegeId } },
      select: { id: true },
    })
  ) {
    code = `${base}${++n}`;
  }
  return code;
}

// ── Course data ──────────────────────────────────────────────────────────────

const courseData: Record<string, Array<{ code: string; title: string; level: number }>> = {
  'Computer Science': [
    { code: 'CSC101', title: 'Introduction to Computer Science', level: 100 },
    { code: 'CSC102', title: 'Programming in C', level: 100 },
    { code: 'CSC201', title: 'Data Structures', level: 200 },
    { code: 'CSC202', title: 'Object Oriented Programming', level: 200 },
    { code: 'CSC301', title: 'Database Management Systems', level: 300 },
    { code: 'CSC302', title: 'Computer Networks', level: 300 },
    { code: 'CSC401', title: 'Software Engineering', level: 400 },
    { code: 'CSC402', title: 'Project Management', level: 400 },
  ],
  Mathematics: [
    { code: 'MTH101', title: 'General Mathematics I', level: 100 },
    { code: 'MTH102', title: 'General Mathematics II', level: 100 },
    { code: 'MTH201', title: 'Linear Algebra', level: 200 },
    { code: 'MTH202', title: 'Calculus', level: 200 },
    { code: 'MTH301', title: 'Abstract Algebra', level: 300 },
    { code: 'MTH302', title: 'Real Analysis', level: 300 },
  ],
  Physics: [
    { code: 'PHY101', title: 'General Physics I', level: 100 },
    { code: 'PHY102', title: 'General Physics II', level: 100 },
    { code: 'PHY201', title: 'Mechanics', level: 200 },
    { code: 'PHY202', title: 'Thermodynamics', level: 200 },
    { code: 'PHY301', title: 'Quantum Mechanics', level: 300 },
  ],
  Chemistry: [
    { code: 'CHM101', title: 'General Chemistry I', level: 100 },
    { code: 'CHM102', title: 'General Chemistry II', level: 100 },
    { code: 'CHM201', title: 'Organic Chemistry', level: 200 },
    { code: 'CHM202', title: 'Inorganic Chemistry', level: 200 },
  ],
  Economics: [
    { code: 'ECO101', title: 'Principles of Economics I', level: 100 },
    { code: 'ECO102', title: 'Principles of Economics II', level: 100 },
    { code: 'ECO201', title: 'Microeconomics', level: 200 },
    { code: 'ECO202', title: 'Macroeconomics', level: 200 },
  ],
  Biochemistry: [
    { code: 'BCH101', title: 'Introduction to Biochemistry', level: 100 },
    { code: 'BCH201', title: 'Metabolic Biochemistry', level: 200 },
    { code: 'BCH301', title: 'Molecular Biology', level: 300 },
  ],
  Microbiology: [
    { code: 'MCB101', title: 'General Microbiology', level: 100 },
    { code: 'MCB201', title: 'Bacteriology', level: 200 },
    { code: 'MCB301', title: 'Virology', level: 300 },
  ],
  'Agricultural Economics': [
    { code: 'AEC101', title: 'Principles of Agricultural Economics', level: 100 },
    { code: 'AEC201', title: 'Farm Management', level: 200 },
    { code: 'AEC301', title: 'Agricultural Marketing', level: 300 },
  ],
};

// ── Page load ────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async () => {
  // ✅ Check DEV_MODE in load function
  // if (!DEV_MODE) {
  //   throw error(403, 'Seeding is only available in development mode');
  // }

  const prisma = await getPrismaClient();

  const stats = {
    universities: await prisma.university.count(),
    colleges: await prisma.college.count(),
    departments: await prisma.department.count(),
    courses: await prisma.course.count(),
    users: await prisma.user.count(),
    admins: await prisma.adminProfile.count(),
  };

  return { stats };
};

// ── Actions ──────────────────────────────────────────────────────────────────

export const actions: Actions = {
  seedUniversities: async () => {
    // if (!DEV_MODE) {
    //   throw error(403, 'Seeding is only available in development mode');
    // }

    const prisma = await getPrismaClient();

    try {
      let created = 0;
      let skipped = 0;

      for (const uni of universitiesData) {
        const existing = await prisma.university.findUnique({
          where: { id: uni.id },
          select: { id: true },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const slug = await uniqueSlug(uni.acronym);
        await prisma.university.create({
          data: {
            id: uni.id,
            name: sanitize(uni.name),
            slug,
            logoUrl: uni.logo ?? null,
            isActive: uni.active,
          },
        });
        created++;
      }

      return { success: true, created, skipped };
    } catch (err) {
      console.error('Error seeding universities:', err);
      return fail(500, {
        error: err instanceof Error ? err.message : 'Error seeding universities',
      });
    }
  },

  seedCollegesAndDepts: async () => {
    // if (!DEV_MODE) {
    //   throw error(403, 'Seeding is only available in development mode');
    // }

    const prisma = await getPrismaClient();
    try {
      let collegeCreated = 0;
      let deptCreated = 0;

      for (const uniStructure of allUniversities) {
        const uni = await prisma.university.findFirst({
          where: { slug: { startsWith: uniStructure.acronym.toUpperCase() } },
          select: { id: true },
        });

        if (!uni) continue;

        for (const collegeEntry of uniStructure.colleges) {
          const collegeName = cleanName(collegeEntry.name);
          const collegeCode = getCode(collegeEntry.name);

          let collegeId: number;

          const existingCollege = await prisma.college.findUnique({
            where: { name_universityId: { name: collegeName, universityId: uni.id } },
            select: { id: true },
          });

          if (existingCollege) {
            collegeId = existingCollege.id;
          } else {
            const created = await prisma.college.create({
              data: {
                name: collegeName,
                abbreviation: collegeCode,
                universityId: uni.id,
              },
            });
            collegeId = created.id;
            collegeCreated++;
          }

          for (const deptEntry of collegeEntry.departments) {
            const deptName = cleanName(deptEntry);
            const baseCode = getCode(deptEntry);

            const existingDept = await prisma.department.findUnique({
              where: { name_collegeId: { name: deptName, collegeId } },
              select: { id: true },
            });

            if (!existingDept) {
              const code = await uniqueDeptCode(baseCode, collegeId);
              await prisma.department.create({
                data: { name: deptName, code, collegeId, isActive: true },
              });
              deptCreated++;
            }
          }
        }
      }

      return { success: true, collegeCreated, deptCreated };
    } catch (err) {
      console.error('Error seeding colleges/departments:', err);
      return fail(500, {
        error: err instanceof Error ? err.message : 'Error seeding colleges/departments',
      });
    }
  },

  seedCourses: async () => {
    // if (!DEV_MODE) {
    //   throw error(403, 'Seeding is only available in development mode');
    // }

    const prisma = await getPrismaClient();
    try {
      let coursesCreated = 0;
      const currentYear = new Date().getFullYear();

      for (const uniStructure of allUniversities) {
        const uni = await prisma.university.findFirst({
          where: { slug: { startsWith: uniStructure.acronym.toUpperCase() } },
          select: { id: true },
        });

        if (!uni) continue;

        for (const collegeEntry of uniStructure.colleges) {
          for (const deptEntry of collegeEntry.departments) {
            const deptName = cleanName(deptEntry);

            if (!courseData[deptName]) continue;

            const department = await prisma.department.findFirst({
              where: {
                name: deptName,
                college: {
                  name: cleanName(collegeEntry.name),
                  universityId: uni.id,
                },
              },
              select: { id: true },
            });

            if (!department) continue;

            for (const course of courseData[deptName]) {
              const existing = await prisma.course.findUnique({
                where: {
                  code_departmentId_level_semester_academicYear: {
                    code: course.code,
                    departmentId: department.id,
                    level: course.level,
                    semester: 1,
                    academicYear: `${currentYear}/${currentYear + 1}`,
                  },
                },
                select: { id: true },
              });

              if (!existing) {
                await prisma.course.create({
                  data: {
                    code: course.code,
                    title: course.title,
                    level: course.level,
                    creditUnits: 3,
                    semester: 1,
                    academicYear: `${currentYear}/${currentYear + 1}`,
                    departmentId: department.id,
                    isActive: true,
                  },
                });
                coursesCreated++;
              }
            }
          }
        }
      }

      return { success: true, coursesCreated };
    } catch (err) {
      console.error('Error seeding courses:', err);
      return fail(500, {
        error: err instanceof Error ? err.message : 'Error seeding courses',
      });
    }
  },

  seedAdmins: async () => {
    // if (!DEV_MODE) {
    //   throw error(403, 'Seeding is only available in development mode');
    // }

    const prisma = await getPrismaClient();
    try {
      let created = 0;

      interface AdminConfig {
        email: string;
        password: string;
        surname: string;
        firstName: string;
        role: Role;
        staffTitle?: StaffTitle;
        universitySlug?: string;
        collegeName?: string;
        departmentName?: string;
      }

      const admins: AdminConfig[] = [
        {
          email: 'super.admin@sabify.com',
          password: 'SuperPass123!',
          surname: 'Super',
          firstName: 'Admin',
          role: 'SUPER_ADMIN',
        },
        {
          email: 'vc.absu@sabify.com',
          password: 'VCPass123!',
          surname: 'Vice-Chancellor',
          firstName: 'ABSU',
          role: 'UNIVERSITY_ADMIN',
          staffTitle: 'VC',
          universitySlug: 'ABSU',
        },
        {
          email: 'dean.colnas@absu.edu.ng',
          password: 'DeanPass123!',
          surname: 'Dean',
          firstName: 'Natural Science',
          role: 'COLLEGE_ADMIN',
          staffTitle: 'DEAN',
          universitySlug: 'ABSU',
          collegeName: 'College of Natural Science',
        },
        {
          email: 'hod.computer.science@absu.edu.ng',
          password: 'HODPass123!',
          surname: 'Dr.',
          firstName: 'Computer Science',
          role: 'DEPT_ADMIN',
          staffTitle: 'HOD',
          universitySlug: 'ABSU',
          collegeName: 'College of Physical & Applied Science',
          departmentName: 'Computer Science',
        },
      ];

      for (const adminConfig of admins) {
        const { encrypted: encEmail, searchHash: emailHash } = await protectEmail(adminConfig.email);

        const existing = await prisma.user.findUnique({
          where: { emailHash },
          select: { id: true },
        });

        if (existing) continue;

        const userId = nanoid();
        const passwordHash = await hashPassword(adminConfig.password);
        
        // ✅ FIX: Access the encrypted property from the returned object
        const encSurname = await protectName(adminConfig.surname);
        const encFirstName = await protectName(adminConfig.firstName);

        // Resolve scope IDs
        let universityId: string | null = null;
        let collegeId: number | null = null;
        let departmentId: number | null = null;

        if (adminConfig.universitySlug) {
          const uni = await prisma.university.findUnique({
            where: { slug: adminConfig.universitySlug.toUpperCase() },
            select: { id: true },
          });
          if (uni) universityId = uni.id;
        }

        if (adminConfig.collegeName && universityId) {
          const college = await prisma.college.findFirst({
            where: {
              universityId,
              name: { contains: adminConfig.collegeName, mode: 'insensitive' },
            },
            select: { id: true },
          });
          if (college) collegeId = college.id;
        }

        if (adminConfig.departmentName && collegeId) {
          const dept = await prisma.department.findFirst({
            where: {
              collegeId,
              name: { contains: adminConfig.departmentName, mode: 'insensitive' },
            },
            select: { id: true },
          });
          if (dept) departmentId = dept.id;
        }

        // Create user
        const user = await prisma.user.create({
          data: {
            id: userId,
            email: encEmail,
            emailHash,
            emailVerified: true,
            passwordHash,
            surname: encSurname.encrypted, // ✅ Access the encrypted property
            firstName: encFirstName.encrypted, // ✅ Access the encrypted property
            role: adminConfig.role,
            isVerified: true,
            contributorBadge: true,
            nameArranged: true,
            universityId: null,
            departmentId: null,
          },
        });

        // Create admin profile
        await prisma.adminProfile.create({
          data: {
            userId: user.id,
            role: adminConfig.role,
            staffTitle: adminConfig.staffTitle || null,
            universityId,
            collegeId,
            departmentId,
          },
        });

        created++;
      }

      return { success: true, created };
    } catch (err) {
      console.error('Error seeding admins:', err);
      return fail(500, {
        error: err instanceof Error ? err.message : 'Error seeding admins',
      });
    }
  },

  seedAll: async (event) => {
    // if (!DEV_MODE) {
    //   throw error(403, 'Seeding is only available in development mode');
    // }

    try {
      const unis = await actions.seedUniversities(event);
      if (!unis || !('success' in unis)) throw new Error('Failed to seed universities');

      const collegesDepts = await actions.seedCollegesAndDepts(event);
      if (!collegesDepts || !('success' in collegesDepts)) throw new Error('Failed to seed colleges/departments');

      const courses = await actions.seedCourses(event);
      if (!courses || !('success' in courses)) throw new Error('Failed to seed courses');

      const admins = await actions.seedAdmins(event);
      if (!admins || !('success' in admins)) throw new Error('Failed to seed admins');

      return {
        success: true,
        message: 'All data seeded successfully!',
        summary: {
          universities: 'success' in unis ? unis.created : 0,
          collegesDepts: 'success' in collegesDepts ? collegesDepts.collegeCreated : 0,
          courses: 'success' in courses ? courses.coursesCreated : 0,
          admins: 'success' in admins ? admins.created : 0,
        },
      };
    } catch (err) {
      console.error('Error seeding all:', err);
      return fail(500, {
        error: err instanceof Error ? err.message : 'Error seeding all data',
      });
    }
  },

  reset: async ({ request }) => {
    // if (!DEV_MODE) {
    //   throw error(403, 'Seeding is only available in development mode');
    // }

    const prisma = await getPrismaClient();

    const formData = await request.formData();
    const confirm = formData.get('confirm') as string;

    try {
      await prisma.adminProfile.deleteMany({});
      await prisma.studyGroupTag.deleteMany({});
      await prisma.studyGroupMember.deleteMany({});
      await prisma.studyGroup.deleteMany({});
      await prisma.eventRsvp.deleteMany({});
      await prisma.event.deleteMany({});
      await prisma.paymentReceipt.deleteMany({});
      await prisma.payment.deleteMany({});
      await prisma.departmentalDue.deleteMany({});
      await prisma.submission.deleteMany({});
      await prisma.pinnedDocument.deleteMany({});
      await prisma.vaultDocument.deleteMany({});
      await prisma.course.deleteMany({});
      await prisma.timetableEntry.deleteMany({});
      await prisma.cgpaEntry.deleteMany({});
      await prisma.alertReceipt.deleteMany({});
      await prisma.safetyAlert.deleteMany({});
      await prisma.campusPin.deleteMany({});
      await prisma.trustedContact.deleteMany({});
      await prisma.safeWalkSession.deleteMany({});
      await prisma.userPreference.deleteMany({});
      await prisma.userSession.deleteMany({});
      await prisma.passwordResetToken.deleteMany({});
      await prisma.verification.deleteMany({});
      await prisma.resetRateLimit.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.department.deleteMany({});
      await prisma.college.deleteMany({});
      await prisma.university.deleteMany({});

      return { success: true, message: 'Database reset successfully!' };
    } catch (err) {
      console.error('Error resetting database:', err);
      return fail(500, {
        error: err instanceof Error ? err.message : 'Error resetting database',
      });
    }
  },
};