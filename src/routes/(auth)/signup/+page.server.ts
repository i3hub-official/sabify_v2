// src/routes/(auth)/signup/+page.server.ts

import type { PageServerLoad } from './$types';
import type { Actions } from '@sveltejs/kit';
import { nanoid } from 'nanoid';
import { getPrismaClient } from '$lib/server/db/index.js';
import { hashPassword, createSession } from '$lib/server/auth';
import {
  protectEmail,
  protectPhone,
  protectName,
} from '$lib/security/dataProtection';

export const load: PageServerLoad = async () => {
  const prisma = await getPrismaClient();
  const universities = await prisma.university.findMany({
    where:   { isActive: true },
    select:  { id: true, name: true, slug: true, logoUrl: true, isActive: true },
    orderBy: { name: 'asc' },
  });
  return { universities };
};

export const actions: Actions = {
  signup: async (event) => {
    const prisma = await getPrismaClient();
    const form = await event.request.formData();
    const g = (k: string) => form.get(k)?.toString().trim() ?? '';

    const rawEmail      = g('email');
    const rawPhone      = g('phone');
    const rawFirstName  = g('firstName');
    const rawOtherName  = g('otherName');
    const rawSurname    = g('surname');
    const password      = g('password');
    const rawFaculty    = g('faculty');
    const rawDepartment = g('department');

    const matricNumber       = g('matricNumber')      || null;
    const jambRegNo          = g('jambRegNo')         || null;
    const level              = g('level')             || null;
    const session            = g('session')           || null;
    const receiptNo          = g('receiptNo')         || null;
    const receiptRef         = g('receiptRef')        || null;
    const receiptSource      = g('universityAcronym') || null;
    const clientUniversityId = g('universityId')      || null;

    // ── Validation ──────────────────────────────────────
    if (!rawEmail)     return { success: false, error: 'Email is required.' };
    if (!rawFirstName) return { success: false, error: 'First name is required.' };
    if (!rawSurname)   return { success: false, error: 'Surname is required.' };
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    try {
      // ── Protect sensitive data ─────────────────────────
      const { encrypted: encEmail, searchHash: emailHash } = await protectEmail(rawEmail);
      const encFirstName = await protectName(rawFirstName);
      const encSurname = await protectName(rawSurname);
      const encOtherName = rawOtherName ? await protectName(rawOtherName) : null;
      const { encrypted: encPhone, searchHash: phoneHash } = rawPhone
        ? await protectPhone(rawPhone)
        : { encrypted: null, searchHash: null };
      const passwordHash = await hashPassword(password);

      // ── Duplicate checks ───────────────────────────────
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { emailHash },
            ...(matricNumber ? [{ matricNumber }] : []),
            ...(receiptNo ? [{ receiptNo }] : []),
            ...(receiptRef ? [{ receiptRef }] : []),
          ],
        },
        select: { id: true },
      });
      
      if (existing) {
        return { 
          success: false, 
          error: 'An account with this email, matric number, or receipt already exists.' 
        };
      }

      // ── Resolve university ─────────────────────────────
      let resolvedUniversityId: string | null = null;
      if (clientUniversityId) {
        const uni = await prisma.university.findUnique({
          where:  { id: clientUniversityId },
          select: { id: true },
        });
        resolvedUniversityId = uni?.id ?? null;
      }

      // ── Resolve college ────────────────────────────────
      let collegeId: number | null = null;
      if (rawFaculty && resolvedUniversityId) {
        const college = await prisma.college.findFirst({
          where: {
            name:         { contains: rawFaculty, mode: 'insensitive' },
            universityId: resolvedUniversityId,
          },
          select: { id: true },
        });
        collegeId = college?.id ?? null;
      }

      // ── Resolve department ─────────────────────────────
      let departmentId: number | null = null;
      if (rawDepartment && resolvedUniversityId) {
        const found = await prisma.department.findFirst({
          where: {
            name:   { contains: rawDepartment, mode: 'insensitive' },
            college: collegeId
              ? { id: collegeId }
              : { universityId: resolvedUniversityId },
          },
          select: { id: true },
        });
        departmentId = found?.id ?? null;
      }

      // ── Parse level ────────────────────────────────────
      let parsedLevel: number | null = null;
      if (level) {
        const levelNum = parseInt(level);
        if (!isNaN(levelNum) && [100, 200, 300, 400, 500, 600].includes(levelNum)) {
          parsedLevel = levelNum;
        }
      }

      // ── Get client info for audit ──────────────────────
      const clientIP = event.getClientAddress();
      const userAgent = event.request.headers.get('user-agent');

      // ── Create user ─────────────────────────────────────
      const user = await prisma.user.create({
        data: {
          id:            nanoid(),
          email:         encEmail,
          emailHash,
          emailVerified: false,
          passwordHash,
          firstName:     encFirstName.encrypted,
          otherName:     encOtherName?.encrypted || null,
          surname:       encSurname.encrypted,
          phone:         encPhone,
          phoneHash,
          matricNumber:  matricNumber || null,
          jambRegNo:     jambRegNo || null,
          level:         parsedLevel,
          session:       session || null,
          nameArranged:  false,
          universityId:  resolvedUniversityId,
          departmentId,
          
          // ── Receipt records ─────────────────────────────
          receiptNo:     receiptNo || null,
          receiptRef:    receiptRef || null,
          receiptSource: receiptSource || null,
          
          // ── Registration audit ─────────────────────────
          registeredAt:  new Date(),
          registeredIP:  clientIP || null,
          registeredVia: "web",
          userAgent:     userAgent || null,
          
          // ── Verification status ────────────────────────
          receiptVerified: false,
        },
        select: {
          id:           true,
          firstName:    true,
          otherName:    true,
          surname:      true,
          role:         true,
          isVerified:   true,
          nameArranged: true,
          universityId: true,
          departmentId: true,
          receiptNo:    true,
          receiptRef:   true,
          receiptSource: true,
        },
      });

      // ── Create session ──────────────────────────────────
      await createSession(event, {
        id:                user.id,
        email:             rawEmail,
        firstName:         rawFirstName,
        otherName:         rawOtherName || null,
        surname:           rawSurname,
        role:              user.role,
        isVerified:        user.isVerified,
        nameArranged:      user.nameArranged,
        universityId:      user.universityId,
        collegeId:         null,
        departmentId:      user.departmentId,
        matricNumber:      matricNumber ?? '',
        isActive:          true,
        emailVerified:     false,
        courseRepCourseId: null,
        courseRepLevel:    null,
      });

      return { success: true };

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[signup] error:', message);

      // Handle specific Prisma errors
      if (message.includes('Unique constraint') || message.includes('unique')) {
        if (message.includes('receiptNo')) {
          return { success: false, error: 'This receipt number has already been used.' };
        }
        if (message.includes('receiptRef')) {
          return { success: false, error: 'This receipt reference has already been used.' };
        }
        if (message.includes('matricNumber')) {
          return { success: false, error: 'This matric number is already registered.' };
        }
        if (message.includes('emailHash')) {
          return { success: false, error: 'An account with this email already exists.' };
        }
        return { success: false, error: 'Duplicate entry detected. Please check your information.' };
      }

      return { success: false, error: 'Unable to create account. Please try again.' };
    }
  },
};