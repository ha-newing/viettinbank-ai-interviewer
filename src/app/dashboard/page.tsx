import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { interviews, candidateStatuses } from '@/db/schema'
import { eq, sql, count, and } from 'drizzle-orm'
import { logoutAction } from '@/app/auth/actions'
import DashboardStats from '@/components/dashboard/DashboardStats'
import CandidateList from '@/components/dashboard/CandidateList'

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // Require authentication
  const user = await requireAuth()

  // Get statistics for the dashboard
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
          sql`${interviews.createdAt} >= datetime('now', '-7 days')`
        )
      ),
  ])

  const dashboardStats = {
    total: stats[0][0]?.count || 0,
    pending: stats[1][0]?.count || 0,
    inProgress: stats[2][0]?.count || 0,
    completed: stats[3][0]?.count || 0,
    recent: stats[4][0]?.count || 0,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Bảng điều khiển ứng viên
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Tổ chức: {user.organizationName}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Chào mừng, <span className="font-medium">{user.email}</span>
              </div>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50"
                >
                  Đăng xuất
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Statistics */}
        <DashboardStats stats={dashboardStats} />

        {/* Candidate List */}
        <div className="mt-8">
          <CandidateList organizationId={user.organizationId} />
        </div>
      </div>
    </div>
  )
}