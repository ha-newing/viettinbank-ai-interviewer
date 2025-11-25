import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { interviews, candidateStatuses } from '@/db/schema'
import { eq, count, and, gte } from 'drizzle-orm'
import { logoutAction } from '@/app/auth/actions'
import DashboardStats from '@/components/dashboard/DashboardStats'
import CandidateList from '@/components/dashboard/CandidateList'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, FileText, BarChart, Settings, CheckCircle, AlertTriangle, Target } from 'lucide-react'
import Link from 'next/link'

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic'

interface DashboardPageProps {
  searchParams: Promise<{
    email_sent?: string
    error?: string
  }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  // Require authentication
  const user = await requireAuth()

  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams

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
          gte(interviews.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
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
        {/* Success/Error Messages */}
        {params.email_sent && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Email mời phỏng vấn đã được gửi thành công.
            </AlertDescription>
          </Alert>
        )}

        {params.error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {params.error === 'email_send_failed'
                ? 'Có lỗi xảy ra khi gửi email. Vui lòng thử lại.'
                : decodeURIComponent(params.error)
              }
            </AlertDescription>
          </Alert>
        )}
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Tác vụ nhanh</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/assessment-sessions"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-orange-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-orange-600">
                    Assessment Center
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Đánh giá năng lực theo mô hình AC
                  </p>
                </div>
                <div className="bg-orange-100 rounded-lg p-2 group-hover:bg-orange-200 transition-colors">
                  <Target className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/interviews/create"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                    Tạo phỏng vấn
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Mời ứng viên tham gia phỏng vấn AI
                  </p>
                </div>
                <div className="bg-blue-100 rounded-lg p-2 group-hover:bg-blue-200 transition-colors">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/templates"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-green-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-green-600">
                    Quản lý Templates
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Tạo và chỉnh sửa mẫu phỏng vấn
                  </p>
                </div>
                <div className="bg-green-100 rounded-lg p-2 group-hover:bg-green-200 transition-colors">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/reports"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-purple-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-purple-600">
                    Báo cáo
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Xem kết quả phỏng vấn và thống kê
                  </p>
                </div>
                <div className="bg-purple-100 rounded-lg p-2 group-hover:bg-purple-200 transition-colors">
                  <BarChart className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/settings"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-gray-400 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">
                    Cài đặt
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Quản lý tổ chức và tài khoản
                  </p>
                </div>
                <div className="bg-gray-100 rounded-lg p-2 group-hover:bg-gray-200 transition-colors">
                  <Settings className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </Link>
          </div>
        </div>

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