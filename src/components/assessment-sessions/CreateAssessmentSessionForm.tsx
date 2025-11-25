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
import { CheckCircle, Loader2, Plus, Trash2, Users } from 'lucide-react'
import { createAssessmentSession } from '@/app/dashboard/assessment-sessions/actions'
import { assessmentRoleCodeEnum } from '@/db/schema'

interface AuthUser {
  id: string
  email: string
  organizationId: string
  organizationName: string
  isAdmin: boolean
}

interface JobTemplate {
  id: string
  title: string
  description: string | null
}

interface CreateAssessmentSessionFormProps {
  user: AuthUser
  jobTemplates: JobTemplate[]
}

interface Participant {
  name: string
  email: string
  roleCode: string
  roleName: string
}

const roleOptions = [
  { code: 'A', name: 'Corporate Banking' },
  { code: 'B', name: 'Retail Banking' },
  { code: 'C', name: 'Risk Management' },
  { code: 'D', name: 'Operations' },
  { code: 'E', name: 'Digital Transformation' }
] as const

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Đang tạo phiên...
        </>
      ) : (
        <>
          <Users className="mr-2 h-4 w-4" />
          Tạo phiên đánh giá
        </>
      )}
    </Button>
  )
}

export default function CreateAssessmentSessionForm({ user, jobTemplates }: CreateAssessmentSessionFormProps) {
  const router = useRouter()
  const [state, formAction] = useActionState(
    async (prevState: any, formData: FormData) =>
      await createAssessmentSession(formData),
    null
  )

  const [formData, setFormData] = useState({
    name: '',
    jobTemplateId: ''
  })

  const [participants, setParticipants] = useState<Participant[]>([
    { name: '', email: '', roleCode: 'A', roleName: 'Corporate Banking' }
  ])

  // Redirect on success
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push('/dashboard/assessment-sessions?created=true')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [state, router])

  const addParticipant = () => {
    if (participants.length >= 5) return

    // Find the first available role
    const usedRoles = participants.map(p => p.roleCode)
    const availableRole = roleOptions.find(role => !usedRoles.includes(role.code))

    if (availableRole) {
      setParticipants([
        ...participants,
        {
          name: '',
          email: '',
          roleCode: availableRole.code,
          roleName: availableRole.name
        }
      ])
    }
  }

  const removeParticipant = (index: number) => {
    if (participants.length <= 1) return
    setParticipants(participants.filter((_, i) => i !== index))
  }

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const updated = [...participants]
    updated[index] = { ...updated[index], [field]: value }

    // If role code changes, update role name
    if (field === 'roleCode') {
      const roleOption = roleOptions.find(r => r.code === value)
      if (roleOption) {
        updated[index].roleName = roleOption.name
      }
    }

    setParticipants(updated)
  }

  const getAvailableRoles = (currentIndex: number) => {
    const usedRoles = participants
      .map((p, index) => index !== currentIndex ? p.roleCode : null)
      .filter(Boolean)

    return roleOptions.filter(role => !usedRoles.includes(role.code))
  }

  return (
    <form action={formAction} className="space-y-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Tên phiên đánh giá <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Ví dụ: Assessment Center Q4 2024"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="jobTemplateId" className="text-sm font-medium">
                Mẫu công việc <span className="text-gray-500">(tùy chọn)</span>
              </Label>
              <Select
                name="jobTemplateId"
                value={formData.jobTemplateId}
                onValueChange={(value) => setFormData({ ...formData, jobTemplateId: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Assessment Center (không cần template)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Assessment Center (sử dụng khung năng lực chuẩn)</SelectItem>
                  {jobTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Thí sinh tham gia ({participants.length}/5)</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addParticipant}
            disabled={participants.length >= 5}
          >
            <Plus className="h-4 w-4 mr-1" />
            Thêm thí sinh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {participants.map((participant, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">
                  Thí sinh {index + 1}
                </h4>
                {participants.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeParticipant(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">
                    Họ và tên <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name={`participants[${index}][name]`}
                    placeholder="Nhập họ tên thí sinh"
                    value={participant.name}
                    onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name={`participants[${index}][email]`}
                    type="email"
                    placeholder="email@example.com"
                    value={participant.email}
                    onChange={(e) => updateParticipant(index, 'email', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  Vai trò <span className="text-red-500">*</span>
                </Label>
                <Select
                  name={`participants[${index}][roleCode]`}
                  value={participant.roleCode}
                  onValueChange={(value) => updateParticipant(index, 'roleCode', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableRoles(index).map((role) => (
                      <SelectItem key={role.code} value={role.code}>
                        {role.code} - {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  type="hidden"
                  name={`participants[${index}][roleName]`}
                  value={participant.roleName}
                />
              </div>
            </div>
          ))}

          {participants.length < 5 && (
            <button
              type="button"
              onClick={addParticipant}
              className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              <Plus className="h-6 w-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Thêm thí sinh (tối đa 5 người)</p>
            </button>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <SubmitButton />
    </form>
  )
}