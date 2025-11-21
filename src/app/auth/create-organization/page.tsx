import { redirect } from 'next/navigation'
import CreateOrganizationForm from '@/components/auth/CreateOrganizationForm'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface CreateOrganizationPageProps {
  searchParams: Promise<{ token?: string; email?: string }>
}

export default async function CreateOrganizationPage({ searchParams }: CreateOrganizationPageProps) {
  const { token, email } = await searchParams

  if (!token || !email) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            VietinBank AI Interviewer
          </h1>
          <p className="text-lg text-gray-600">
            Tạo tổ chức mới
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-200">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 text-center">
              Chào mừng!
            </h2>
            <p className="mt-2 text-sm text-gray-600 text-center">
              Hãy tạo tổ chức mới cho <span className="font-medium text-blue-600">{email}</span>
            </p>
          </div>

          <CreateOrganizationForm token={token} email={email} />

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Gói khởi đầu
                </span>
              </div>
            </div>

            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="text-sm font-medium text-green-900 mb-2">
                🚀 Gói Startup - Miễn phí
              </h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• 100 phỏng vấn mỗi tháng</li>
                <li>• Tối đa 15 phút mỗi phỏng vấn</li>
                <li>• Phân tích AI 5 tiêu chí cơ bản</li>
                <li>• Báo cáo chi tiết</li>
                <li>• Hỗ trợ qua email</li>
              </ul>
              <p className="mt-2 text-xs text-green-700">
                Bạn có thể nâng cấp gói sau khi hoàn tất đăng ký
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Bằng cách tạo tổ chức, bạn đồng ý với{' '}
            <a href="/terms" className="text-blue-600 hover:text-blue-500">
              Điều khoản sử dụng
            </a>{' '}
            và{' '}
            <a href="/privacy" className="text-blue-600 hover:text-blue-500">
              Chính sách bảo mật
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}