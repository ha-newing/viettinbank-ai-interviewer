import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { jobTemplates } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Plus, Edit, Trash2, Eye, FileText } from 'lucide-react'
import Link from 'next/link'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  // Require authentication
  const user = await requireAuth()

  // Get templates for this organization
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
                Quản lý Job Templates
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Tạo và quản lý các mẫu phỏng vấn cho tổ chức của bạn
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/dashboard/templates/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo template mới
                </Button>
              </Link>

              <Link
                href="/dashboard"
                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50"
              >
                ← Quay lại dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {templates.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Chưa có job template nào
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Tạo template đầu tiên để bắt đầu tổ chức các phỏng vấn
            </p>
            <div className="mt-6">
              <Link href="/dashboard/templates/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo template mới
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Template Grid */
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Danh sách Templates ({templates.length})
                </h2>
                <p className="text-sm text-gray-600">
                  Quản lý các mẫu phỏng vấn và câu hỏi
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                          {template.title}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {template.description || 'Không có mô tả'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Template Stats */}
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{template.interviewDuration} phút</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>5 tiêu chí</span>
                        </div>
                      </div>

                      {/* Evaluation Criteria */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-700 mb-1">
                          Tỷ trọng đánh giá:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            Ấn tượng: {template.impressionWeight}%
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Thực hiện: {template.taskPerformanceWeight}%
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Logic: {template.logicalThinkingWeight}%
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            Nghiên cứu: {template.researchAbilityWeight}%
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Giao tiếp: {template.communicationWeight}%
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-xs text-gray-500">
                          {new Date(template.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link href={`/dashboard/templates/${template.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              Xem
                            </Button>
                          </Link>
                          <Link href={`/dashboard/templates/${template.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-3 w-3 mr-1" />
                              Sửa
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Help Section */}
        {templates.length > 0 && (
          <div className="mt-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  💡 Tips sử dụng Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Tạo Templates hiệu quả
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Đặt tên rõ ràng, dễ hiểu</li>
                      <li>• Mô tả chi tiết vị trí và yêu cầu</li>
                      <li>• Cân bằng tỷ trọng các tiêu chí</li>
                      <li>• Thời gian phù hợp với vị trí</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Quản lý Templates
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Sao chép template cho vị trí tương tự</li>
                      <li>• Cập nhật thường xuyên theo phản hồi</li>
                      <li>• Tối ưu hóa tỷ trọng đánh giá</li>
                      <li>• Backup templates quan trọng</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Thống kê sử dụng
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Template được dùng nhiều nhất</li>
                      <li>• Tỷ lệ hoàn thành theo template</li>
                      <li>• Đánh giá trung bình của từng template</li>
                      <li>• Feedback từ ứng viên</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}