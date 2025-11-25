'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Loader2, Save } from 'lucide-react'
import { updateAssessmentSession } from '@/app/dashboard/assessment-sessions/actions'
import { assessmentSessionStatusEnum, type AssessmentSessionStatus } from '@/db/schema'

interface AssessmentSession {
  id: string
  name: string
  status: AssessmentSessionStatus
  createdAt: Date
  completedAt: Date | null
  organizationId: string
  jobTemplateId: string | null
}

interface EditAssessmentSessionFormProps {
  session: AssessmentSession
}

const statusOptions = [
  { value: 'created', label: 'Đã tạo', disabled: false },
  { value: 'case_study_in_progress', label: 'Đang thảo luận case study', disabled: false },
  { value: 'case_study_completed', label: 'Hoàn thành thảo luận', disabled: false },
  { value: 'tbei_in_progress', label: 'Đang phỏng vấn TBEI', disabled: false },
  { value: 'completed', label: 'Hoàn thành', disabled: false }
] as const

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Đang cập nhật...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          Lưu thay đổi
        </>
      )}
    </Button>
  )
}

export default function EditAssessmentSessionForm({ session }: EditAssessmentSessionFormProps) {
  const router = useRouter()
  const [state, formAction] = useActionState(
    async (prevState: any, formData: FormData) =>
      await updateAssessmentSession(formData),
    null
  )

  const [formData, setFormData] = useState({
    name: session.name,
    status: session.status
  })

  // Redirect on success
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push(`/dashboard/assessment-sessions/${session.id}`)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [state, router, session.id])

  // Determine which status options should be available based on current status
  const getAvailableStatuses = () => {
    const currentIndex = statusOptions.findIndex(option => option.value === session.status)

    // Allow staying in current status or progressing to next status
    return statusOptions.map((option, index) => ({
      ...option,
      disabled: index > currentIndex + 1 // Can only go to next status or stay in current
    }))
  }

  const availableStatuses = getAvailableStatuses()

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden ID field */}
      <input type="hidden" name="id" value={session.id} />

      {/* Success alert */}
      {state?.success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {state.message} Đang chuyển hướng...
          </AlertDescription>
        </Alert>
      )}

      {/* Error alert */}
      {state && !state.success && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {state.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              Tên phiên đánh giá <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Nhập tên phiên đánh giá"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tên phiên có thể được thay đổi bất kỳ lúc nào
            </p>
          </div>

          <div>
            <Label htmlFor="status" className="text-sm font-medium">
              Trạng thái <span className="text-red-500">*</span>
            </Label>
            <Select
              name="status"
              value={formData.status}
              onValueChange={(value: AssessmentSessionStatus) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((status) => (
                  <SelectItem
                    key={status.value}
                    value={status.value}
                    disabled={status.disabled}
                  >
                    {status.label}
                    {status.disabled && ' (Không khả dụng)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Chỉ có thể chuyển sang trạng thái tiếp theo hoặc giữ nguyên
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Session Metadata (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin không thể chỉnh sửa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Ngày tạo</Label>
              <p className="mt-1 text-gray-900">
                {new Date(session.createdAt).toLocaleDateString('vi-VN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            {session.completedAt && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Ngày hoàn thành</Label>
                <p className="mt-1 text-gray-900">
                  {new Date(session.completedAt).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Lưu ý về thí sinh</h4>
            <p className="text-sm text-gray-600">
              Danh sách thí sinh và phân công vai trò không thể chỉnh sửa sau khi phiên được tạo
              để đảm bảo tính nhất quán của dữ liệu đánh giá. Nếu cần thay đổi thí sinh,
              vui lòng tạo phiên mới.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Status Change Warning */}
      {formData.status !== session.status && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertDescription className="text-amber-800">
            <strong>Cảnh báo:</strong> Việc thay đổi trạng thái từ &quot;{statusOptions.find(s => s.value === session.status)?.label}&quot;
            sang &quot;{statusOptions.find(s => s.value === formData.status)?.label}&quot; có thể ảnh hưởng đến:
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>Quyền truy cập của thí sinh vào các giai đoạn đánh giá</li>
              <li>Tình trạng thu thập dữ liệu từ các cuộc phỏng vấn</li>
              <li>Khả năng tạo báo cáo đánh giá</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Submit */}
      <SubmitButton />
    </form>
  )
}