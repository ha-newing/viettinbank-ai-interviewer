'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createNewOrganization } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Loader2, CheckCircle } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Đang tạo tổ chức...
        </>
      ) : (
        <>
          <Building2 className="mr-2 h-4 w-4" />
          Tạo tổ chức
        </>
      )}
    </Button>
  )
}

interface CreateOrganizationFormProps {
  token: string
  email: string
}

export default function CreateOrganizationForm({ token, email }: CreateOrganizationFormProps) {
  const router = useRouter()
  const [state, formAction] = useActionState(
    async (prevState: any, formData: FormData) => await createNewOrganization(formData),
    null
  )
  const [organizationName, setOrganizationName] = useState('')

  // Extract domain from email for display
  const domain = email.split('@')[1]

  // Redirect to dashboard when organization creation is successful
  useEffect(() => {
    if (state?.success) {
      // Show success message briefly, then redirect
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, 2000) // 2 second delay to show success message

      return () => clearTimeout(timer)
    }
  }, [state, router])

  return (
    <div className="space-y-6">
      {state && (
        <Alert className={state.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <div className="flex items-center">
            {state.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <div className="h-4 w-4 rounded-full bg-red-500" />
            )}
            <AlertDescription className={`ml-2 ${state.success ? 'text-green-800' : 'text-red-800'}`}>
              {state.success ? state.message : state.error}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <form action={formAction} className="space-y-4">
        {/* Hidden fields */}
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="email" value={email} />

        <div>
          <Label htmlFor="organizationName" className="text-sm font-medium text-gray-700">
            Tên tổ chức
          </Label>
          <div className="mt-1">
            <Input
              id="organizationName"
              name="organizationName"
              type="text"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Ví dụ: Ngân hàng VietinBank"
              className="block w-full"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Tên hiển thị của tổ chức trong hệ thống
          </p>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Thông tin domain:</h4>
          <div className="text-sm text-blue-800">
            <p><strong>Domain:</strong> <code>{domain}</code></p>
            <p><strong>Email admin:</strong> {email}</p>
            <p className="mt-1 text-xs">
              Tất cả email có domain <code>@{domain}</code> sẽ thuộc tổ chức này
            </p>
          </div>
        </div>

        <SubmitButton />
      </form>

      <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <h4 className="text-sm font-medium text-yellow-900 mb-2">📋 Điều cần lưu ý:</h4>
        <ul className="text-xs text-yellow-800 space-y-1">
          <li>• Bạn sẽ trở thành quản trị viên của tổ chức</li>
          <li>• Có thể mời thêm người dùng sau khi hoàn tất</li>
          <li>• Tên tổ chức có thể thay đổi trong cài đặt</li>
          <li>• Domain không thể thay đổi sau khi tạo</li>
        </ul>
      </div>
    </div>
  )
}