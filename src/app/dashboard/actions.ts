/**
 * Server actions for dashboard data fetching
 */

'use server'

import { db } from '@/lib/db'
import { interviews, jobTemplates } from '@/db/schema'
import { eq, count, and, gte, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export interface DashboardInterview {
  id: string
  candidateName: string
  candidateEmail: string
  candidatePhone: string | null
  interviewStatus: 'pending' | 'in_progress' | 'completed' | 'expired'
  candidateStatus: 'all' | 'screened' | 'selected' | 'rejected' | 'waiting'
  overallScore: number | null
  recommendation: 'RECOMMEND' | 'CONSIDER' | 'NOT_RECOMMEND' | null
  createdAt: Date
  completedAt: Date | null
  jobTemplate?: {
    title: string
  }
}

export interface DashboardStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  recent: number
}

/**
 * Fetch interviews for dashboard with filtering and pagination
 */
export async function getDashboardInterviews(params?: {
  candidateStatus?: string
  searchQuery?: string
  limit?: number
  offset?: number
}): Promise<{
  success: boolean
  data?: DashboardInterview[]
  error?: string
}> {
  try {
    const user = await requireAuth()
    const { candidateStatus, searchQuery, limit = 100, offset = 0 } = params || {}

    // Build query conditions
    const conditions = [eq(interviews.organizationId, user.organizationId)]

    // Add candidate status filter
    if (candidateStatus && candidateStatus !== 'all') {
      conditions.push(eq(interviews.candidateStatus, candidateStatus as any))
    }

    // Fetch interviews with related data
    let query = db
      .select({
        interview: interviews,
        jobTemplate: jobTemplates,
      })
      .from(interviews)
      .leftJoin(jobTemplates, eq(interviews.jobTemplateId, jobTemplates.id))
      .where(and(...conditions))
      .orderBy(desc(interviews.createdAt))
      .limit(limit)
      .offset(offset)

    const results = await query

    // Filter by search query if provided (done in JavaScript for simplicity)
    let filteredResults = results
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredResults = results.filter(({ interview }) =>
        interview.candidateName.toLowerCase().includes(query) ||
        interview.candidateEmail.toLowerCase().includes(query)
      )
    }

    // Map to dashboard interface
    const dashboardInterviews: DashboardInterview[] = filteredResults.map(({ interview, jobTemplate }) => ({
      id: interview.id,
      candidateName: interview.candidateName,
      candidateEmail: interview.candidateEmail,
      candidatePhone: interview.candidatePhone,
      interviewStatus: interview.status as DashboardInterview['interviewStatus'],
      candidateStatus: interview.candidateStatus as DashboardInterview['candidateStatus'],
      overallScore: interview.overallScore,
      recommendation: interview.recommendation as DashboardInterview['recommendation'],
      createdAt: interview.createdAt,
      completedAt: interview.completedAt,
      jobTemplate: jobTemplate ? { title: jobTemplate.title } : undefined,
    }))

    return {
      success: true,
      data: dashboardInterviews
    }

  } catch (error) {
    console.error('Failed to fetch dashboard interviews:', error)
    return {
      success: false,
      error: 'Failed to fetch interviews'
    }
  }
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<{
  success: boolean
  data?: DashboardStats
  error?: string
}> {
  try {
    const user = await requireAuth()

    const stats = await Promise.all([
      // Total interviews for this organization
      db
        .select({ count: count() })
        .from(interviews)
        .where(eq(interviews.organizationId, user.organizationId)),

      // Pending interviews
      db
        .select({ count: count() })
        .from(interviews)
        .where(
          and(
            eq(interviews.organizationId, user.organizationId),
            eq(interviews.status, 'pending')
          )
        ),

      // In progress interviews
      db
        .select({ count: count() })
        .from(interviews)
        .where(
          and(
            eq(interviews.organizationId, user.organizationId),
            eq(interviews.status, 'in_progress')
          )
        ),

      // Completed interviews
      db
        .select({ count: count() })
        .from(interviews)
        .where(
          and(
            eq(interviews.organizationId, user.organizationId),
            eq(interviews.status, 'completed')
          )
        ),

      // Recent interviews (last 7 days)
      db
        .select({ count: count() })
        .from(interviews)
        .where(
          and(
            eq(interviews.organizationId, user.organizationId),
            gte(interviews.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          )
        ),
    ])

    const dashboardStats: DashboardStats = {
      total: stats[0][0]?.count || 0,
      pending: stats[1][0]?.count || 0,
      inProgress: stats[2][0]?.count || 0,
      completed: stats[3][0]?.count || 0,
      recent: stats[4][0]?.count || 0,
    }

    return {
      success: true,
      data: dashboardStats
    }

  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return {
      success: false,
      error: 'Failed to fetch statistics'
    }
  }
}

/**
 * Get candidate status counts for dashboard tabs
 */
export async function getCandidateStatusCounts(): Promise<{
  success: boolean
  data?: { [key: string]: number }
  error?: string
}> {
  try {
    const user = await requireAuth()

    // Get candidate status counts using database aggregation
    const statusCounts = await Promise.all([
      // Total count
      db
        .select({ count: count() })
        .from(interviews)
        .where(eq(interviews.organizationId, user.organizationId)),

      // Screened count
      db
        .select({ count: count() })
        .from(interviews)
        .where(
          and(
            eq(interviews.organizationId, user.organizationId),
            eq(interviews.candidateStatus, 'screened')
          )
        ),

      // Selected count
      db
        .select({ count: count() })
        .from(interviews)
        .where(
          and(
            eq(interviews.organizationId, user.organizationId),
            eq(interviews.candidateStatus, 'selected')
          )
        ),

      // Rejected count
      db
        .select({ count: count() })
        .from(interviews)
        .where(
          and(
            eq(interviews.organizationId, user.organizationId),
            eq(interviews.candidateStatus, 'rejected')
          )
        ),

      // Waiting count
      db
        .select({ count: count() })
        .from(interviews)
        .where(
          and(
            eq(interviews.organizationId, user.organizationId),
            eq(interviews.candidateStatus, 'waiting')
          )
        ),
    ])

    const counts = {
      all: statusCounts[0][0]?.count || 0,
      screened: statusCounts[1][0]?.count || 0,
      selected: statusCounts[2][0]?.count || 0,
      rejected: statusCounts[3][0]?.count || 0,
      waiting: statusCounts[4][0]?.count || 0,
    }

    return {
      success: true,
      data: counts
    }

  } catch (error) {
    console.error('Failed to fetch candidate status counts:', error)
    return {
      success: false,
      error: 'Failed to fetch status counts'
    }
  }
}