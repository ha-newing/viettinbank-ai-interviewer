import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { jobTemplates } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import CreateAssessmentSessionForm from '@/components/assessment-sessions/CreateAssessmentSessionForm'

export const dynamic = 'force-dynamic'

export default async function CreateAssessmentSessionPage() {
  const user = await requireAuth()

  // Fetch available job templates for the organization
  const templates = await db
    .select({
      id: jobTemplates.id,
      title: jobTemplates.title,
      description: jobTemplates.description
    })
    .from(jobTemplates)
    .where(eq(jobTemplates.organizationId, user.organizationId))
    .orderBy(jobTemplates.title)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/dashboard/assessment-sessions" className="mr-4">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Quay lại
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tạo phiên Assessment Center mới</h1>
              <p className="text-sm text-gray-600 mt-1">
                Thiết lập phiên đánh giá năng lực cho tối đa 5 thí sinh
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main form */}
          <div className="lg:col-span-2">
            <CreateAssessmentSessionForm user={user} jobTemplates={templates} />
          </div>

          {/* Help sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Assessment Center Overview */}
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Về Assessment Center
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>
                    <strong>Assessment Center</strong> là phương pháp đánh giá năng lực toàn diện
                    thông qua 4 giai đoạn:
                  </p>
                  <ul className="space-y-2 ml-4 list-disc">
                    <li>
                      <strong>Thảo luận case study (120 phút):</strong> Thí sinh thảo luận nhóm
                      về tình huống kinh doanh thực tế
                    </li>
                    <li>
                      <strong>TBEI Interview (15 phút):</strong> Phỏng vấn hành vi theo mô hình STAR
                    </li>
                    <li>
                      <strong>HiPo Questionnaire (20 phút):</strong> Bảng câu hỏi tự đánh giá năng lực
                    </li>
                    <li>
                      <strong>Quiz (15 phút):</strong> Kiểm tra kiến thức chuyên môn
                    </li>
                  </ul>
                </div>
              </div>

              {/* Role Assignments */}
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Phân công vai trò
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div><strong>Vai trò A:</strong> Corporate Banking</div>
                  <div><strong>Vai trò B:</strong> Retail Banking</div>
                  <div><strong>Vai trò C:</strong> Risk Management</div>
                  <div><strong>Vai trò D:</strong> Operations</div>
                  <div><strong>Vai trò E:</strong> Digital Transformation</div>
                  <p className="text-xs text-gray-500 mt-3">
                    Mỗi thí sinh sẽ được phân công một vai trò cụ thể để thảo luận từ góc độ chuyên môn tương ứng.
                  </p>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">
                  💡 Lời khuyên
                </h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• Đảm bảo tất cả thí sinh có email hợp lệ</li>
                  <li>• Mỗi vai trò chỉ được phân công cho 1 người</li>
                  <li>• Phiên đánh giá có thể kéo dài 3-4 tiếng</li>
                  <li>• Thông báo trước cho thí sinh về lịch trình</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}