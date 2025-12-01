import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { XCircle, Loader2, Mail } from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface VerifyPageProps {
  searchParams: Promise<{ error?: string; token?: string }>
}

const errorMessages: Record<string, string> = {
  missing_token: 'Liên kết xác thực bị thiếu hoặc không hợp lệ.',
  invalid_token: 'Liên kết xác thực không hợp lệ hoặc đã hết hạn.',
  expired_token: 'Liên kết xác thực đã hết hạn. Vui lòng yêu cầu đăng nhập lại.',
  invalid_organization: 'Thông tin tổ chức không hợp lệ.',
  server_error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { error, token } = await searchParams

  // If there's a token but no error, user might have landed here directly
  // Redirect them to the API route for proper verification
  if (token && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                Đang xác thực...
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Vui lòng đợi trong giây lát
              </p>
              <div className="mt-6">
                <Button asChild>
                  <a href={`/api/auth/verify?token=${token}`}>Tiếp tục xác thực</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error message
  if (error) {
    const errorMessage = errorMessages[error] || 'Có lỗi xảy ra trong quá trình xác thực'

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                Xác thực thất bại
              </h2>
              <div className="mt-4">
                <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              </div>
              <div className="mt-6 space-y-3">
                <Button asChild className="w-full">
                  <a href="/auth/login">Thử lại</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default state - no token and no error (user landed here directly)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <Mail className="mx-auto h-12 w-12 text-blue-500" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              Kiểm tra email của bạn
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Vui lòng kiểm tra hộp thư và nhấn vào liên kết xác thực để đăng nhập.
            </p>
            <div className="mt-6">
              <Button asChild variant="outline">
                <a href="/auth/login">Quay lại đăng nhập</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
