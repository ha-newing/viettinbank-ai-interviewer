import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { jobTemplates, interviews } from '@/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Clock,
  Users,
  Edit,
  Trash2,
  ArrowLeft,
  FileText,
  BarChart3,
  Target,
  Calendar,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface TemplateViewPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TemplateViewPage({ params }: TemplateViewPageProps) {
  // Resolve params first
  const resolvedParams = await params

  // Require authentication
  const user = await requireAuth()

  // Get template by ID and ensure it belongs to user's organization
  const template = await db
    .select()
    .from(jobTemplates)
    .where(
      and(
        eq(jobTemplates.id, resolvedParams.id),
        eq(jobTemplates.organizationId, user.organizationId)
      )
    )
    .limit(1)

  if (!template[0]) {
    notFound()
  }

  const templateData = template[0]

  // Get usage statistics for this template
  const [totalInterviews, pendingInterviews, completedInterviews] = await Promise.all([
    db
      .select({ count: count() })
      .from(interviews)
      .where(eq(interviews.jobTemplateId, resolvedParams.id)),

    db
      .select({ count: count() })
      .from(interviews)
      .where(
        and(
          eq(interviews.jobTemplateId, resolvedParams.id),
          eq(interviews.status, 'pending')
        )
      ),

    db
      .select({ count: count() })
      .from(interviews)
      .where(
        and(
          eq(interviews.jobTemplateId, resolvedParams.id),
          eq(interviews.status, 'completed')
        )
      ),
  ])

  const usageStats = {
    total: totalInterviews[0]?.count || 0,
    pending: pendingInterviews[0]?.count || 0,
    completed: completedInterviews[0]?.count || 0,
  }

  // Calculate total weight for validation
  const totalWeight = templateData.impressionWeight +
                     templateData.taskPerformanceWeight +
                     templateData.logicalThinkingWeight +
                     templateData.researchAbilityWeight +
                     templateData.communicationWeight

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                href="/dashboard/templates"
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {templateData.title}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Chi tiết job template
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Link href={`/dashboard/templates/${templateData.id}/edit`}>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </Button>
              </Link>

              <form action="/dashboard/templates/delete" method="post">
                <input type="hidden" name="id" value={templateData.id} />
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    if (!confirm(`Bạn có chắc chắn muốn xóa template "${templateData.title}"? Hành động này không thể hoàn tác.`)) {
                      e.preventDefault()
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Template Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Thông tin cơ bản
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tên Template</label>
                    <p className="mt-1 text-sm text-gray-900">{templateData.title}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Thời gian phỏng vấn</label>
                    <div className="flex items-center mt-1">
                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      <p className="text-sm text-gray-900">{templateData.interviewDuration} phút</p>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Mô tả</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {templateData.description || 'Không có mô tả'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Ngày tạo</label>
                    <div className="flex items-center mt-1">
                      <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                      <p className="text-sm text-gray-900">
                        {new Date(templateData.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Cập nhật cuối</label>
                    <div className="flex items-center mt-1">
                      <Activity className="h-4 w-4 text-gray-400 mr-1" />
                      <p className="text-sm text-gray-900">
                        {new Date(templateData.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Evaluation Criteria */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Target className="mr-2 h-5 w-5" />
                    Tiêu chí đánh giá
                  </div>
                  <Badge
                    variant={totalWeight === 100 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    Tổng: {totalWeight}%
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Tỷ trọng của từng tiêu chí trong quá trình đánh giá ứng viên
                </CardDescription>
              </CardHeader>
              <CardContent>
                {totalWeight !== 100 && (
                  <Alert className="mb-6 border-yellow-200 bg-yellow-50">
                    <AlertDescription className="text-yellow-800">
                      ⚠️ Tổng tỷ trọng không bằng 100%. Template có thể cần được cập nhật.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  {/* Impression Weight */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Ấn tượng chung</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Đánh giá về thái độ, giao tiếp và ấn tượng tổng thể
                      </p>
                    </div>
                    <Badge variant="outline" className="text-lg font-semibold">
                      {templateData.impressionWeight}%
                    </Badge>
                  </div>

                  {/* Task Performance Weight */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Hiệu suất nhiệm vụ</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Khả năng hoàn thành nhiệm vụ và giải quyết vấn đề thực tế
                      </p>
                    </div>
                    <Badge variant="outline" className="text-lg font-semibold">
                      {templateData.taskPerformanceWeight}%
                    </Badge>
                  </div>

                  {/* Logical Thinking Weight */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Tư duy logic</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Khả năng phân tích, suy luận và tư duy có hệ thống
                      </p>
                    </div>
                    <Badge variant="outline" className="text-lg font-semibold">
                      {templateData.logicalThinkingWeight}%
                    </Badge>
                  </div>

                  {/* Research Ability Weight */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Khả năng nghiên cứu</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Khả năng tìm hiểu, học hỏi và cập nhật kiến thức mới
                      </p>
                    </div>
                    <Badge variant="outline" className="text-lg font-semibold">
                      {templateData.researchAbilityWeight}%
                    </Badge>
                  </div>

                  {/* Communication Weight */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Giao tiếp</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Khả năng trình bày, thuyết phục và làm việc nhóm
                      </p>
                    </div>
                    <Badge variant="outline" className="text-lg font-semibold">
                      {templateData.communicationWeight}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Usage Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Thống kê sử dụng
                </CardTitle>
                <CardDescription>
                  Số liệu phỏng vấn sử dụng template này
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-700">Tổng phỏng vấn</span>
                    </div>
                    <span className="text-lg font-semibold text-blue-600">
                      {usageStats.total}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-700">Đang chờ</span>
                    </div>
                    <span className="text-lg font-semibold text-yellow-600">
                      {usageStats.pending}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-700">Hoàn thành</span>
                    </div>
                    <span className="text-lg font-semibold text-green-600">
                      {usageStats.completed}
                    </span>
                  </div>
                </div>

                {usageStats.total > 0 && (
                  <div className="pt-4 border-t">
                    <Link
                      href={`/dashboard/reports?template=${templateData.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Xem báo cáo chi tiết →
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Tác vụ nhanh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/dashboard/interviews/create" className="w-full">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Tạo phỏng vấn với template này
                  </Button>
                </Link>

                <Link href={`/dashboard/templates/${templateData.id}/edit`} className="w-full">
                  <Button variant="outline" className="w-full justify-start">
                    <Edit className="mr-2 h-4 w-4" />
                    Chỉnh sửa template
                  </Button>
                </Link>

                <Link href="/dashboard/templates" className="w-full">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Tạo bản sao
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Template Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thông tin bổ sung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">ID:</span>
                  <span className="ml-2 text-gray-600 font-mono text-xs">
                    {templateData.id}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-gray-700">Trạng thái:</span>
                  <Badge variant="outline" className="ml-2">
                    {usageStats.total > 0 ? 'Đang sử dụng' : 'Chưa sử dụng'}
                  </Badge>
                </div>

                <div>
                  <span className="font-medium text-gray-700">Loại template:</span>
                  <span className="ml-2 text-gray-600">Job Interview</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}