import { redirect } from 'next/navigation'
import { verifyEmail } from '@/app/auth/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface VerifyPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-200">
            <div className="text-center">
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Liên kết không hợp lệ
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Liên kết xác thực bị thiếu hoặc không hợp lệ.
              </p>
              <div className="mt-6">
                <Button asChild>
                  <a href="/auth/login">Quay lại đăng nhập</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Process verification
  const formData = new FormData()
  formData.append('token', token)

  try {
    const result = await verifyEmail(formData)

    if (result.success) {
      // Check if redirect is needed (for new organization)
      if ('redirect' in result) {
        redirect(result.redirect)
      } else {
        // Existing organization - redirect to assessment center
        redirect('/dashboard/assessment-sessions')
      }
    }

    // If we get here, there was an error - show error message
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-200">
            <div className="text-center">
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Xác thực thất bại
              </h2>
              <div className="mt-4">
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {result.error || 'Có lỗi xảy ra trong quá trình xác thực'}
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
  } catch (error) {
    // Handle redirect or other errors
    console.error('Verification error:', error)

    // If it's a redirect, let it happen
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-200">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Đang xử lý...
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Vui lòng đợi trong giây lát
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
}