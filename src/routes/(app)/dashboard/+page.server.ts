// src/routes/(app)/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';
import { getStudentDashboardService } from '$lib/services/student-dashboard.service.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guards.js';
import type { UserWithAdminProfile } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Use the auth guard to get authenticated user
	const user = await requireAuth(locals.user as UserWithAdminProfile | null);
	
	const forceRefresh = url.searchParams.get('refresh') === 'true';
	
	// Initialize Prisma client
	let prisma;
	try {
		prisma = await getPrismaClient();
	} catch (err) {
		console.error('Failed to initialize Prisma client:', err);
		throw error(500, 'Database connection failed');
	}

	// Determine role from adminProfile or user role
	const role = user.adminProfile?.role || user.role || 'STUDENT';

	// Base response
	const response: any = {
		user: {
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			surname: user.surname,
			avatar: user.image || null
		},
		role
	};

	// ── Student Dashboard ──────────────────────────────────────────────────────
	if (role === 'STUDENT' || role === 'COURSE_REP' || role === 'CONTRIBUTOR') {
		try {
			// Get the student with their department info
			const student = await prisma.user.findUnique({
				where: { id: user.id },
				include: {
					department: {
						include: {
							college: {
								include: {
									university: true
								}
							}
						}
					}
				}
			});

			if (!student) {
				throw error(403, 'Student account required');
			}

			if (!student.department) {
				throw error(403, 'Student account not properly configured');
			}

			const service = getStudentDashboardService();
			const metrics = await service.getDashboard(
				user.id, // Use user ID as student identifier
				prisma,
				forceRefresh
			);
			response.metrics = metrics;
		} catch (err) {
			console.error('Student dashboard load error:', err);
			response.error = err instanceof Error ? err.message : 'Failed to load dashboard data';
		}
	}

	// ── Admin Dashboard ──────────────────────────────────────────────────────
	if (['DEPT_ADMIN', 'COLLEGE_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN', 'LAW_ENFORCEMENT'].includes(role)) {
		try {
			// Build scope filter based on admin's scope
			const whereClause: any = {};
			
			if (user.adminProfile?.universityId) {
				whereClause.universityId = user.adminProfile.universityId;
			}
			if (user.adminProfile?.collegeId) {
				whereClause.collegeId = user.adminProfile.collegeId;
			}
			if (user.adminProfile?.departmentId) {
				whereClause.departmentId = user.adminProfile.departmentId;
			}
			if (user.adminProfile?.courseId) {
				whereClause.courseId = user.adminProfile.courseId;
			}

			const [
				totalUsers,
				pendingEvents,
				pendingDocs,
				pendingPins,
				activeAlerts,
				totalRevenue
			] = await Promise.all([
				prisma.user.count({ where: whereClause }),
				prisma.event.count({
					where: { 
						isPublished: false,
						...whereClause
					}
				}),
				prisma.vaultDocument.count({
					where: { 
						isVerified: false,
						deletedAt: null,
						...whereClause
					}
				}),
				prisma.campusPin.count({
					where: { 
						isVerified: false,
						isActive: true,
						...whereClause
					}
				}),
				prisma.safetyAlert.count({
					where: { 
						expiresAt: null,
						...whereClause
					}
				}),
				prisma.payment.aggregate({
					where: {
						...whereClause,
						status: 'SUCCESS'
					},
					_sum: { amount: true }
				})
			]);

			response.adminStats = {
				totalUsers,
				pendingEvents,
				pendingDocs,
				pendingPins,
				activeAlerts,
				totalRevenue: totalRevenue._sum.amount || 0
			};
		} catch (err) {
			console.error('Admin stats error:', err);
			response.adminStats = {};
		}
	}

	// ── Owner Dashboard ──────────────────────────────────────────────────────
	if (role === 'OWNER') {
		try {
			const [
				totalUniversities,
				totalUsers,
				totalAdmins,
				totalRevenue,
				activeUniversities
			] = await Promise.all([
				prisma.university.count(),
				prisma.user.count(),
				prisma.adminProfile.count({
					where: {
						role: { in: ['SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'COLLEGE_ADMIN', 'DEPT_ADMIN'] }
					}
				}),
				prisma.payment.aggregate({
					where: { status: 'SUCCESS' },
					_sum: { amount: true }
				}),
				prisma.university.count({
					where: { isActive: true }
				})
			]);

			response.adminStats = {
				totalUniversities,
				activeUniversities,
				totalUsers,
				totalAdmins,
				totalRevenue: totalRevenue._sum.amount || 0
			};
		} catch (err) {
			console.error('Owner stats error:', err);
			response.adminStats = {};
		}
	}

	return response;
};