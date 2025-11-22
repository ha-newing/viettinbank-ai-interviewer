import { requireAuth } from '@/lib/auth'
import CreateTemplateForm from '@/components/templates/CreateTemplateForm'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function CreateTemplatePage() {
  // Require authentication
  const user = await requireAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Tạo Job Template mới
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Thiết lập mẫu phỏng vấn và tiêu chí đánh giá
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <a
                href="/dashboard/templates"
                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50"
              >
                ← Quay lại danh sách
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Template Creation Form */}
          <div className="lg:col-span-2">
            <CreateTemplateForm user={user} />
          </div>

          {/* Help Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📋 Hướng dẫn tạo Template
              </h3>

              <div className="space-y-4">
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

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Tỷ trọng đánh giá
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• <strong>Ấn tượng:</strong> Giao tiếp, thái độ</li>
                    <li>• <strong>Hiệu suất:</strong> Hoàn thành nhiệm vụ</li>
                    <li>• <strong>Logic:</strong> Tư duy, phân tích</li>
                    <li>• <strong>Nghiên cứu:</strong> Tìm hiểu, học hỏi</li>
                    <li>• <strong>Giao tiếp:</strong> Trình bày, thuyết phục</li>
                  </ul>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    💡 Tips quan trọng
                  </h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Tổng tỷ trọng phải = 100%</li>
                    <li>• Cân bằng theo yêu cầu vị trí</li>
                    <li>• Test template trước khi sử dụng</li>
                    <li>• Thu thập feedback để cải thiện</li>
                  </ul>
                </div>

                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2">
                    ⚠️ Lưu ý
                  </h4>
                  <ul className="text-xs text-yellow-800 space-y-1">
                    <li>• Template có thể sửa sau khi tạo</li>
                    <li>• Những template đã dùng nên thận trọng khi sửa</li>
                    <li>• Backup trước khi thay đổi lớn</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    <strong>Gợi ý tỷ trọng:</strong><br />
                    <span className="text-gray-700">
                      • <strong>Dev:</strong> Logic 30%, Hiệu suất 25%, Nghiên cứu 20%<br />
                      • <strong>Sales:</strong> Giao tiếp 40%, Ấn tượng 30%<br />
                      • <strong>Manager:</strong> Logic 25%, Giao tiếp 25%, Ấn tượng 25%
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