import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { jobTemplates } from '@/db/schema'
import { eq } from 'drizzle-orm'
import CreateInterviewForm from '@/components/interviews/CreateInterviewForm'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function CreateInterviewPage() {
  // Require authentication
  const user = await requireAuth()

  // Get job templates for this organization
  const templates = await db
    .select()
    .from(jobTemplates)
    .where(eq(jobTemplates.organizationId, user.organizationId))
    .orderBy(jobTemplates.createdAt)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Tạo phỏng vấn mới
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Mời ứng viên tham gia phỏng vấn AI
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50"
              >
                ← Quay lại dashboard
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Interview Creation Form */}
          <div className="lg:col-span-2">
            <CreateInterviewForm
              user={user}
              jobTemplates={templates}
            />
          </div>

          {/* Help Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📋 Hướng dẫn
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Tạo phỏng vấn đơn lẻ
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Nhập thông tin ứng viên</li>
                    <li>• Chọn job template phù hợp</li>
                    <li>• Email mời sẽ được gửi tự động</li>
                    <li>• Link phỏng vấn có thời hạn 7 ngày</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Upload danh sách CSV
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Định dạng: name,email,phone</li>
                    <li>• Tối đa 100 ứng viên/lần</li>
                    <li>• Hỗ trợ .csv và .xlsx</li>
                    <li>• Tự động validate email</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    💡 Mẹo sử dụng
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Tạo job template trước khi tạo phỏng vấn</li>
                    <li>• Kiểm tra quota còn lại của tổ chức</li>
                    <li>• Preview email trước khi gửi</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    <strong>Quota hiện tại:</strong><br />
                    <span className="text-green-600">
                      {user.organizationName}: 95/100 phỏng vấn
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}