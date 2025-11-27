import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import LoginForm from '@/components/auth/LoginForm'

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  // Check if user is already authenticated
  const user = await getCurrentUser()
  if (user) {
    redirect('/dashboard/assessment-sessions')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            VietinBank AI Interviewer
          </h1>
          <p className="text-lg text-gray-600">
            Hệ thống phỏng vấn AI thông minh
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-200">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 text-center">
              Đăng nhập
            </h2>
            <p className="mt-2 text-sm text-gray-600 text-center">
              Nhập email của bạn để bắt đầu
            </p>
          </div>

          <LoginForm />

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Cách hoạt động
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">1</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Nhập email:</strong> Chúng tôi sẽ kiểm tra xem tổ chức của bạn đã tồn tại chưa
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">2</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Kiểm tra email:</strong> Nhấn vào liên kết trong email để xác thực
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">3</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Bắt đầu:</strong> Tạo tổ chức mới hoặc truy cập tổ chức hiện có
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Bằng cách tiếp tục, bạn đồng ý với{' '}
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