'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Brain,
  CheckSquare,
  Clock,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import TbeiQuestions from './TbeiQuestions'
import HipoAssessment from './HipoAssessment'
import KnowledgeQuiz from './KnowledgeQuiz'

interface TbeiAssessmentConductProps {
  participant: {
    id: string
    name: string
    email: string
    roleCode: string
    roleName: string
    tbeiStatus: string
    hipoStatus: string
    quizStatus: string
  }
  session: {
    id: string
    name: string
    status: string
    createdAt: Date
  }
  jobTemplate?: {
    id: string
    title: string
    description?: string | null
  } | null
  organization?: {
    id: string
    name: string
  } | null
  token: string
}

type AssessmentPart = 'tbei' | 'hipo' | 'quiz'

interface AssessmentStep {
  id: AssessmentPart
  title: string
  description: string
  duration: number // in minutes
  icon: React.ElementType
  status: string
}

export default function TbeiAssessmentConduct({
  participant,
  session,
  jobTemplate,
  organization,
  token
}: TbeiAssessmentConductProps) {
  const router = useRouter()

  // Assessment steps configuration
  const assessmentSteps: AssessmentStep[] = [
    {
      id: 'tbei',
      title: 'TBEI Interview',
      description: 'Phỏng vấn hành vi có mục tiêu',
      duration: 15,
      icon: Users,
      status: participant.tbeiStatus
    },
    {
      id: 'hipo',
      title: 'HiPo Assessment',
      description: 'Đánh giá tiềm năng lãnh đạo cao',
      duration: 10,
      icon: Brain,
      status: participant.hipoStatus
    },
    {
      id: 'quiz',
      title: 'Knowledge Quiz',
      description: 'Kiểm tra kiến thức chuyên môn',
      duration: 15,
      icon: CheckSquare,
      status: participant.quizStatus
    }
  ]

  // Determine current step
  const getCurrentStep = (): AssessmentPart => {
    if (participant.tbeiStatus !== 'completed') return 'tbei'
    if (participant.hipoStatus !== 'completed') return 'hipo'
    if (participant.quizStatus !== 'completed') return 'quiz'
    return 'tbei' // fallback
  }

  const [currentStep, setCurrentStep] = useState<AssessmentPart>(getCurrentStep())
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isStarted, setIsStarted] = useState(false)

  // Get current step info
  const currentStepInfo = assessmentSteps.find(step => step.id === currentStep)
  const currentStepIndex = assessmentSteps.findIndex(step => step.id === currentStep)

  // Calculate progress
  const completedSteps = assessmentSteps.filter(step => step.status === 'completed').length
  const progressPercentage = (completedSteps / assessmentSteps.length) * 100

  // Timer effect
  useEffect(() => {
    if (!isStarted || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up - auto submit current assessment
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isStarted, timeRemaining])

  // Start assessment
  const startAssessment = () => {
    setIsStarted(true)
    setTimeRemaining((currentStepInfo?.duration || 15) * 60) // Convert to seconds
  }

  // Handle time up
  const handleTimeUp = () => {
    console.log('Time is up for:', currentStep)
    // TODO: Auto-submit current assessment
  }

  // Handle step completion
  const handleStepComplete = async () => {
    // Move to next step
    const nextStepIndex = currentStepIndex + 1
    if (nextStepIndex < assessmentSteps.length) {
      const nextStep = assessmentSteps[nextStepIndex]
      setCurrentStep(nextStep.id)
      setTimeRemaining(nextStep.duration * 60)
    } else {
      // All assessments completed
      router.push(`/interview/${token}`)
    }
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành'
      case 'in_progress':
        return 'Đang thực hiện'
      default:
        return 'Chưa bắt đầu'
    }
  }

  if (!isStarted) {
    // Pre-assessment screen
    const Icon = currentStepInfo?.icon || Users

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  VietinBank Assessment Center
                </h1>
                <p className="text-sm text-gray-600">
                  {participant.name} • {participant.roleName}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/interview/${token}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Quay lại
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress Overview */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Tiến độ đánh giá</span>
                <span className="text-sm font-normal text-gray-600">
                  {completedSteps}/{assessmentSteps.length} hoàn thành
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progressPercentage} className="mb-4" />
              <div className="grid grid-cols-3 gap-4">
                {assessmentSteps.map((step, index) => {
                  const StepIcon = step.icon
                  const isActive = step.id === currentStep
                  const isCompleted = step.status === 'completed'

                  return (
                    <div
                      key={step.id}
                      className={`text-center p-3 rounded-lg border ${
                        isActive
                          ? 'border-blue-300 bg-blue-50'
                          : isCompleted
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <StepIcon className={`h-6 w-6 mx-auto mb-2 ${
                        isActive
                          ? 'text-blue-600'
                          : isCompleted
                          ? 'text-green-600'
                          : 'text-gray-400'
                      }`} />
                      <div className="text-xs font-medium text-gray-900">
                        {step.title}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs mt-1 ${getStatusColor(step.status)}`}
                      >
                        {getStatusText(step.status)}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Current Assessment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icon className="h-6 w-6 mr-3 text-blue-600" />
                {currentStepInfo?.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-gray-700 mb-4">{currentStepInfo?.description}</p>

                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Thông tin thời gian
                  </h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>Thời gian làm bài: <strong>{currentStepInfo?.duration} phút</strong></div>
                    <div>Bộ đếm thời gian sẽ bắt đầu khi bạn nhấn "Bắt đầu"</div>
                    <div>Khi hết thời gian, bài làm sẽ được tự động nộp</div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Lưu ý quan trọng
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Đảm bảo kết nối internet ổn định</li>
                    <li>• Không đóng hoặc làm mới trang web</li>
                    <li>• Hoàn thành trong một lần, không thể dừng giữa chừng</li>
                    <li>• Trả lời thật và cụ thể nhất có thể</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <Button
                  size="lg"
                  onClick={startAssessment}
                  className="bg-blue-600 hover:bg-blue-700 px-8"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Bắt đầu {currentStepInfo?.title}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Assessment in progress
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {currentStepInfo?.title}
              </h1>
              <p className="text-sm text-gray-600">
                {participant.name} • Bước {currentStepIndex + 1}/{assessmentSteps.length}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                timeRemaining < 300 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
              }`}>
                <Clock className="h-4 w-4" />
                <span className="font-mono font-semibold">
                  {formatTime(timeRemaining)}
                </span>
              </div>

              <div className="text-sm text-gray-600">
                {completedSteps}/{assessmentSteps.length} hoàn thành
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentStep === 'tbei' && (
          <TbeiQuestions
            participant={participant}
            onComplete={handleStepComplete}
            timeRemaining={timeRemaining}
          />
        )}

        {currentStep === 'hipo' && (
          <HipoAssessment
            participant={participant}
            onComplete={handleStepComplete}
            timeRemaining={timeRemaining}
          />
        )}

        {currentStep === 'quiz' && (
          <KnowledgeQuiz
            participant={participant}
            onComplete={handleStepComplete}
            timeRemaining={timeRemaining}
          />
        )}
      </div>
    </div>
  )
}