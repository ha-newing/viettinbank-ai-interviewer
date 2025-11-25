import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { assessmentSessions, jobTemplates } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditAssessmentSessionForm from '@/components/assessment-sessions/EditAssessmentSessionForm'

export const dynamic = 'force-dynamic'

interface EditAssessmentSessionPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditAssessmentSessionPage({ params }: EditAssessmentSessionPageProps) {
  const resolvedParams = await params
  const user = await requireAuth()

  // Fetch session with access check
  const session = await db
    .select()
    .from(assessmentSessions)
    .where(
      and(
        eq(assessmentSessions.id, resolvedParams.id),
        eq(assessmentSessions.organizationId, user.organizationId)
      )
    )
    .limit(1)

  if (!session[0]) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href={`/dashboard/assessment-sessions/${session[0].id}`} className="mr-4">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Quay lại
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa phiên đánh giá</h1>
              <p className="text-sm text-gray-600 mt-1">
                Cập nhật thông tin phiên: {session[0].name}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main form */}
          <div className="lg:col-span-2">
            <EditAssessmentSessionForm session={session[0]} />
          </div>

          {/* Help sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Edit Notes */}
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📝 Lưu ý chỉnh sửa
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div>
                    <strong>Tên phiên:</strong> Có thể chỉnh sửa bất kỳ lúc nào
                  </div>
                  <div>
                    <strong>Trạng thái:</strong> Chỉ có thể thay đổi theo quy trình:
                    <ul className="ml-4 mt-1 list-disc">
                      <li>Đã tạo → Đang thảo luận</li>
                      <li>Đang thảo luận → Hoàn thành thảo luận</li>
                      <li>Hoàn thành thảo luận → Đang phỏng vấn TBEI</li>
                      <li>Đang phỏng vấn TBEI → Hoàn thành</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Thí sinh:</strong> Không thể chỉnh sửa sau khi tạo phiên để đảm bảo tính nhất quán của dữ liệu
                  </div>
                </div>
              </div>

              {/* Status Guide */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">
                  📋 Hướng dẫn trạng thái
                </h3>
                <div className="space-y-3 text-sm text-blue-800">
                  <div>
                    <strong>Đã tạo:</strong> Phiên vừa được tạo, chưa bắt đầu
                  </div>
                  <div>
                    <strong>Đang thảo luận:</strong> Các thí sinh đang thảo luận case study
                  </div>
                  <div>
                    <strong>Hoàn thành thảo luận:</strong> Case study đã kết thúc, sẵn sàng cho TBEI
                  </div>
                  <div>
                    <strong>Đang phỏng vấn TBEI:</strong> Đang tiến hành phỏng vấn hành vi cá nhân
                  </div>
                  <div>
                    <strong>Hoàn thành:</strong> Tất cả giai đoạn đã hoàn thành
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
                <h3 className="text-lg font-semibold text-amber-900 mb-4">
                  ⚠️ Cảnh báo
                </h3>
                <p className="text-sm text-amber-800">
                  Việc thay đổi trạng thái phiên có thể ảnh hưởng đến quyền truy cập của thí sinh
                  và tình trạng dữ liệu đánh giá. Vui lòng kiểm tra kỹ trước khi lưu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}