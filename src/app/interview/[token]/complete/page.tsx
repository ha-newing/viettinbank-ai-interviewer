import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { interviews, organizations, jobTemplates } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Clock, Mail, Calendar } from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface InterviewCompletePageProps {
  params: Promise<{ token: string }>
}

export default async function InterviewCompletePage({ params }: InterviewCompletePageProps) {
  const { token } = await params

  if (!token) {
    notFound()
  }

  // Find interview by token
  const interviewResult = await db
    .select({
      interview: interviews,
      jobTemplate: jobTemplates,
      organization: organizations,
    })
    .from(interviews)
    .leftJoin(jobTemplates, eq(interviews.jobTemplateId, jobTemplates.id))
    .leftJoin(organizations, eq(interviews.organizationId, organizations.id))
    .where(eq(interviews.interviewLinkToken, token))
    .limit(1)

  if (!interviewResult[0]) {
    notFound()
  }

  const { interview, jobTemplate, organization } = interviewResult[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="text-green-500 text-6xl mb-6">
            <CheckCircle className="h-24 w-24 mx-auto" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Phỏng vấn hoàn thành!
          </h1>
          <p className="text-xl text-gray-600">
            Cảm ơn bạn đã tham gia phỏng vấn tại {organization?.name || 'VietinBank'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Interview Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Thông tin phỏng vấn</span>
              </CardTitle>
              <CardDescription>
                Tóm tắt về cuộc phỏng vấn vừa hoàn thành
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900">Ứng viên:</span>
                  <p className="text-gray-600">{interview.candidateName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Email:</span>
                  <p className="text-gray-600">{interview.candidateEmail}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Vị trí:</span>
                  <p className="text-gray-600">{jobTemplate?.title || 'Không xác định'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Tổ chức:</span>
                  <p className="text-gray-600">{organization?.name || 'Không xác định'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Hoàn thành:</span>
                  <p className="text-gray-600">
                    {new Date().toLocaleDateString('vi-VN')} lúc {new Date().toLocaleTimeString('vi-VN')}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Trạng thái:</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 font-medium">Đã hoàn thành</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What's Next */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Bước tiếp theo</span>
              </CardTitle>
              <CardDescription>
                Thông tin về quá trình xử lý và kết quả
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">1</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Xử lý bằng AI</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Hệ thống AI sẽ phân tích video phỏng vấn của bạn và tạo báo cáo đánh giá chi tiết.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">2</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Đánh giá HR</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Đội ngũ HR sẽ xem xét báo cáo AI và đưa ra quyết định cuối cùng.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Mail className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Thông báo kết quả</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Kết quả sẽ được gửi đến email của bạn trong vòng 3-5 ngày làm việc.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Important Notes */}
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-blue-900">📋 Những điều cần lưu ý:</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <h4 className="font-medium mb-2">✅ Phỏng vấn của bạn:</h4>
                  <ul className="space-y-1">
                    <li>• Đã được lưu trữ an toàn</li>
                    <li>• Sẽ được phân tích bằng AI</li>
                    <li>• Được bảo mật theo quy định</li>
                    <li>• Không thể chỉnh sửa thêm</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">📧 Kết quả phỏng vấn:</h4>
                  <ul className="space-y-1">
                    <li>• Được gửi qua email đã đăng ký</li>
                    <li>• Thời gian: 3-5 ngày làm việc</li>
                    <li>• Bao gồm điểm số chi tiết</li>
                    <li>• Có nhận xét từ AI và HR</li>
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-blue-200">
                <p className="text-sm text-blue-700">
                  <strong>Lưu ý:</strong> Nếu bạn có bất kỳ câu hỏi nào về quá trình phỏng vấn hoặc
                  không nhận được kết quả trong thời gian dự kiến, vui lòng liên hệ với đội ngũ HR
                  qua email: <span className="font-medium">hr@{organization?.name.toLowerCase().replace(/\s+/g, '')}.com</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-12 text-center space-y-4">
          <Button
            onClick={() => window.close()}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            Đóng trang
          </Button>

          <p className="text-sm text-gray-500">
            Bạn có thể đóng tab này một cách an toàn. Cảm ơn bạn đã tham gia phỏng vấn!
          </p>
        </div>
      </div>
    </div>
  )
}