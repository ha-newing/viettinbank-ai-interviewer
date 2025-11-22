import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { jobTemplates } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import EditTemplateForm from '@/components/templates/EditTemplateForm'
import { notFound } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface EditTemplatePageProps {
  params: {
    id: string
  }
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  // Require authentication
  const user = await requireAuth()

  // Get template by ID and ensure it belongs to user's organization
  const template = await db
    .select()
    .from(jobTemplates)
    .where(
      and(
        eq(jobTemplates.id, params.id),
        eq(jobTemplates.organizationId, user.organizationId)
      )
    )
    .limit(1)

  if (!template[0]) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Chỉnh sửa Job Template
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Cập nhật thông tin và tiêu chí đánh giá
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <a
                href={`/dashboard/templates/${template[0].id}`}
                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50"
              >
                ← Quay lại xem
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Edit Form */}
          <div className="lg:col-span-2">
            <EditTemplateForm user={user} template={template[0]} />
          </div>

          {/* Help Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📝 Hướng dẫn chỉnh sửa
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Lưu ý khi chỉnh sửa
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Template đã được sử dụng cần cân nhắc khi sửa</li>
                    <li>• Thay đổi tỷ trọng ảnh hưởng đến đánh giá</li>
                    <li>• Backup trước khi thay đổi lớn</li>
                    <li>• Kiểm tra tổng tỷ trọng = 100%</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Thông tin cơ bản
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Tên template rõ ràng, dễ hiểu</li>
                    <li>• Mô tả chi tiết vị trí tuyển dụng</li>
                    <li>• Thời gian phù hợp: 15-60 phút</li>
                    <li>• Xem xét kỹ năng cần đánh giá</li>
                  </ul>
                </div>

                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2">
                    ⚠️ Cảnh báo
                  </h4>
                  <ul className="text-xs text-yellow-800 space-y-1">
                    <li>• Template đã dùng: thận trọng khi sửa</li>
                    <li>• Thay đổi có thể ảnh hưởng kết quả</li>
                    <li>• Xem xét tác động trước khi lưu</li>
                  </ul>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    💡 Tips hữu ích
                  </h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Sử dụng preset cho các vị trí phổ biến</li>
                    <li>• Test template sau khi chỉnh sửa</li>
                    <li>• Thu thập feedback để cải thiện</li>
                    <li>• Giữ nguyên template cũ nếu nghi ngờ</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    <strong>Template ID:</strong><br />
                    <span className="font-mono">
                      {template[0].id}
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