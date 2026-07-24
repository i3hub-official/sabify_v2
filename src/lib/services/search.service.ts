// src/lib/services/search.service.ts
// Search across institutions, courses, and academic programs.
//
// Provider assumption: the schema has no dedicated search index (no
// Algolia/Meilisearch/Elasticsearch config anywhere), so the default and
// only implemented provider is the database itself via Prisma
// `contains`/`insensitive` filtering — consistent with how auth/index.ts
// lazily resolves `getPrismaClient()` rather than holding a module-level
// client. SEARCH_PROVIDER is read only to decide whether search is
// "configured" per guards.ts; the query path below always hits the DB.
//
// Note: there is no `Program` model in the schema. Nigerian universities
// typically equate "program" with a Department (e.g. "B.Sc Computer
// Science"), so searchPrograms searches Department — rename/replace this
// once/if a dedicated Program model exists.

import { getPrismaClient } from '$lib/server/db/index.js'

export interface UniversitySearchResult {
  id: string
  name: string
  slug: string
  logoUrl: string | null
}

export interface CourseSearchResult {
  id: string
  code: string
  title: string
  level: number
  departmentId: number
}

export interface ProgramSearchResult {
  id: number
  name: string
  code: string
  collegeId: number
}

const DEFAULT_LIMIT = 20

export async function searchUniversities(query: string, limit = DEFAULT_LIMIT): Promise<UniversitySearchResult[]> {
  const prisma = await getPrismaClient()

  return prisma.university.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, slug: true, logoUrl: true },
    take: limit,
    orderBy: { name: 'asc' },
  })
}

export async function searchCourses(
  query: string,
  filters: { departmentId?: number; level?: number; semester?: number } = {},
  limit = DEFAULT_LIMIT,
): Promise<CourseSearchResult[]> {
  const prisma = await getPrismaClient()

  return prisma.course.findMany({
    where: {
      isActive: true,
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.level ? { level: filters.level } : {}),
      ...(filters.semester ? { semester: filters.semester } : {}),
      OR: [
        { code: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true, code: true, title: true, level: true, departmentId: true },
    take: limit,
    orderBy: { code: 'asc' },
  })
}

export async function searchPrograms(
  query: string,
  filters: { collegeId?: number } = {},
  limit = DEFAULT_LIMIT,
): Promise<ProgramSearchResult[]> {
  const prisma = await getPrismaClient()

  return prisma.department.findMany({
    where: {
      isActive: true,
      ...(filters.collegeId ? { collegeId: filters.collegeId } : {}),
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { code: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, code: true, collegeId: true },
    take: limit,
    orderBy: { name: 'asc' },
  })
}