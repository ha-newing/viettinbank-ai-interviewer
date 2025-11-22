'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { CheckCircle, Loader2, FileText, Settings, Target, RotateCcw } from 'lucide-react'
import { createTemplate } from '@/app/dashboard/templates/actions'

interface AuthUser {
  id: string
  email: string
  organizationId: string
  organizationName: string
  isAdmin: boolean
}

interface CreateTemplateFormProps {
  user: AuthUser
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Đang tạo template...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Tạo Template
        </>
      )}
    </Button>
  )
}

export default function CreateTemplateForm({ user }: CreateTemplateFormProps) {
  const router = useRouter()
  const [state, formAction] = useActionState(
    async (prevState: any, formData: FormData) => await createTemplate(formData),
    null
  )

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    interviewDuration: 30,
    impressionWeight: 20,
    taskPerformanceWeight: 25,
    logicalThinkingWeight: 20,
    researchAbilityWeight: 15,
    communicationWeight: 20,
  })

  // Calculate total weight
  const totalWeight = form.impressionWeight + form.taskPerformanceWeight +
                     form.logicalThinkingWeight + form.researchAbilityWeight + form.communicationWeight

  // Preset weight configurations
  const presets = [
    {
      name: 'Developer',
      description: 'Cho vị trí lập trình viên',
      weights: {
        impressionWeight: 15,
        taskPerformanceWeight: 30,
        logicalThinkingWeight: 30,
        researchAbilityWeight: 20,
        communicationWeight: 5,
      }
    },
    {
      name: 'Sales',
      description: 'Cho vị trí kinh doanh',
      weights: {
        impressionWeight: 35,
        taskPerformanceWeight: 15,
        logicalThinkingWeight: 10,
        researchAbilityWeight: 10,
        communicationWeight: 30,
      }
    },
    {
      name: 'Manager',
      description: 'Cho vị trí quản lý',
      weights: {
        impressionWeight: 25,
        taskPerformanceWeight: 20,
        logicalThinkingWeight: 20,
        researchAbilityWeight: 15,
        communicationWeight: 20,
      }
    },
    {
      name: 'Balanced',
      description: 'Cân bằng cho mọi vị trí',
      weights: {
        impressionWeight: 20,
        taskPerformanceWeight: 20,
        logicalThinkingWeight: 20,
        researchAbilityWeight: 20,
        communicationWeight: 20,
      }
    }
  ]

  const applyPreset = (preset: typeof presets[0]) => {
    setForm(prev => ({
      ...prev,
      ...preset.weights
    }))
  }

  const resetWeights = () => {
    setForm(prev => ({
      ...prev,
      impressionWeight: 20,
      taskPerformanceWeight: 25,
      logicalThinkingWeight: 20,
      researchAbilityWeight: 15,
      communicationWeight: 20,
    }))
  }

  // Redirect to template list on successful creation
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push('/dashboard/templates')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [state, router])

  const handleWeightChange = (field: string, value: number[]) => {
    setForm(prev => ({
      ...prev,
      [field]: value[0]
    }))
  }

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

      <form action={formAction} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Thông tin cơ bản
            </CardTitle>
            <CardDescription>
              Đặt tên và mô tả cho template phỏng vấn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Tên Template *</Label>
              <Input
                id="title"
                name="title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ví dụ: Senior Frontend Developer"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                name="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Mô tả chi tiết về vị trí công việc và yêu cầu ứng viên..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="interviewDuration">Thời gian phỏng vấn (phút) *</Label>
              <div className="mt-1 flex items-center space-x-4">
                <Input
                  id="interviewDuration"
                  name="interviewDuration"
                  type="number"
                  min="5"
                  max="180"
                  step="5"
                  required
                  value={form.interviewDuration}
                  onChange={(e) => setForm({ ...form, interviewDuration: parseInt(e.target.value) || 30 })}
                  className="w-32"
                />
                <div className="flex-1">
                  <Slider
                    value={[form.interviewDuration]}
                    onValueChange={(value) => setForm({ ...form, interviewDuration: value[0] })}
                    min={5}
                    max={180}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>5 phút</span>
                    <span>180 phút</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Thời gian phù hợp: 15-60 phút cho hầu hết các vị trí
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Criteria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Target className="mr-2 h-5 w-5" />
                Tỷ trọng đánh giá
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm px-2 py-1 rounded ${totalWeight === 100 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  Tổng: {totalWeight}%
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetWeights}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Cài đặt tỷ trọng cho từng tiêu chí đánh giá (tổng phải = 100%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preset Buttons */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">Preset nhanh:</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    className="text-xs"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Weight Sliders */}
            <div className="space-y-4">
              {/* Impression Weight */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="impressionWeight">Ấn tượng chung</Label>
                  <span className="text-sm font-medium">{form.impressionWeight}%</span>
                </div>
                <Slider
                  value={[form.impressionWeight]}
                  onValueChange={(value) => handleWeightChange('impressionWeight', value)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <input type="hidden" name="impressionWeight" value={form.impressionWeight} />
                <p className="text-xs text-gray-500 mt-1">
                  Đánh giá về thái độ, giao tiếp và ấn tượng tổng thể
                </p>
              </div>

              {/* Task Performance Weight */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="taskPerformanceWeight">Hiệu suất nhiệm vụ</Label>
                  <span className="text-sm font-medium">{form.taskPerformanceWeight}%</span>
                </div>
                <Slider
                  value={[form.taskPerformanceWeight]}
                  onValueChange={(value) => handleWeightChange('taskPerformanceWeight', value)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <input type="hidden" name="taskPerformanceWeight" value={form.taskPerformanceWeight} />
                <p className="text-xs text-gray-500 mt-1">
                  Khả năng hoàn thành nhiệm vụ và giải quyết vấn đề thực tế
                </p>
              </div>

              {/* Logical Thinking Weight */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="logicalThinkingWeight">Tư duy logic</Label>
                  <span className="text-sm font-medium">{form.logicalThinkingWeight}%</span>
                </div>
                <Slider
                  value={[form.logicalThinkingWeight]}
                  onValueChange={(value) => handleWeightChange('logicalThinkingWeight', value)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <input type="hidden" name="logicalThinkingWeight" value={form.logicalThinkingWeight} />
                <p className="text-xs text-gray-500 mt-1">
                  Khả năng phân tích, suy luận và tư duy có hệ thống
                </p>
              </div>

              {/* Research Ability Weight */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="researchAbilityWeight">Khả năng nghiên cứu</Label>
                  <span className="text-sm font-medium">{form.researchAbilityWeight}%</span>
                </div>
                <Slider
                  value={[form.researchAbilityWeight]}
                  onValueChange={(value) => handleWeightChange('researchAbilityWeight', value)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <input type="hidden" name="researchAbilityWeight" value={form.researchAbilityWeight} />
                <p className="text-xs text-gray-500 mt-1">
                  Khả năng tìm hiểu, học hỏi và cập nhật kiến thức mới
                </p>
              </div>

              {/* Communication Weight */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="communicationWeight">Giao tiếp</Label>
                  <span className="text-sm font-medium">{form.communicationWeight}%</span>
                </div>
                <Slider
                  value={[form.communicationWeight]}
                  onValueChange={(value) => handleWeightChange('communicationWeight', value)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <input type="hidden" name="communicationWeight" value={form.communicationWeight} />
                <p className="text-xs text-gray-500 mt-1">
                  Khả năng trình bày, thuyết phục và làm việc nhóm
                </p>
              </div>
            </div>

            {totalWeight !== 100 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertDescription className="text-yellow-800">
                  ⚠️ Tổng tỷ trọng hiện tại là {totalWeight}%. Vui lòng điều chỉnh để đạt 100%.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <SubmitButton />
      </form>
    </div>
  )
}