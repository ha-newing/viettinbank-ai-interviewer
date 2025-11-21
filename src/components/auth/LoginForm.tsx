'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { requestLogin } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Loader2, CheckCircle } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Đang xử lý...
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Tiếp tục với email
        </>
      )}
    </Button>
  )
}

export default function LoginForm() {
  const [state, formAction] = useFormState(
    async (prevState: any, formData: FormData) => await requestLogin(formData),
    null
  )
  const [email, setEmail] = useState('')

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
        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Địa chỉ email
          </Label>
          <div className="mt-1">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="block w-full"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Sử dụng email công ty để tự động xác định tổ chức
          </p>
        </div>

        <SubmitButton />
      </form>

      {/* Email domain examples */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-xs font-medium text-blue-900 mb-2">Ví dụ về email được hỗ trợ:</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• <code>hr@vietinbank.vn</code> - Ngân hàng VietinBank</li>
          <li>• <code>talent@company.com</code> - Công ty tự doanh</li>
          <li>• <code>admin@startup.vn</code> - Startup Việt Nam</li>
        </ul>
      </div>
    </div>
  )
}