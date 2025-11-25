'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import LiveTranscriptionInput from '@/components/ui/LiveTranscriptionInput'
import { Badge } from '@/components/ui/badge'
import {
  Brain,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Clock,
  Star,
  Target,
  Heart,
  Link,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HipoAssessmentProps {
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
  onComplete: () => void
  timeRemaining: number
}

// Question sections with their icons and descriptions
const QUESTION_SECTIONS = {
  ability: {
    title: 'Năng lực (Ability)',
    description: 'Đánh giá năng lực chuyên môn và kỹ năng hiện tại',
    icon: Star,
    color: 'blue',
    questions: [
      'Tôi có đầy đủ kiến thức và kỹ năng cần thiết để thực hiện xuất sắc công việc hiện tại của mình tại Ngân hàng.',
      'Tôi tự tin với khả năng giải quyết các vấn đề phức tạp và thách thức trong công việc.',
      'Tôi thường xuyên chủ động học hỏi và cập nhật kiến thức mới trong lĩnh vực ngân hàng.',
      'Tôi có khả năng thích ứng nhanh với những thay đổi và yêu cầu mới của tổ chức.',
      'Tôi sẵn sàng và có khả năng đảm nhận các vai trò lãnh đạo cấp cao hơn trong tương lai.'
    ]
  },
  aspiration: {
    title: 'Khát vọng (Aspiration)',
    description: 'Đánh giá mong muốn phát triển nghề nghiệp và thăng tiến',
    icon: Target,
    color: 'green',
    questions: [
      'Tôi có khát vọng rõ ràng về việc thăng tiến lên các vị trí lãnh đạo cao hơn tại Ngân hàng.',
      'Tôi luôn tìm kiếm cơ hội để đóng góp nhiều hơn cho sự phát triển của Ngân hàng.',
      'Tôi sẵn sàng làm việc ngoài giờ hoặc đảm nhận thêm trách nhiệm để đạt được mục tiêu nghề nghiệp.',
      'Tôi có kế hoạch phát triển nghề nghiệp rõ ràng trong 3-5 năm tới tại Ngân hàng.',
      'Tôi mong muốn trở thành một nhà lãnh đạo có ảnh hưởng lớn trong ngành ngân hàng.'
    ]
  },
  engagement: {
    title: 'Gắn kết (Engagement)',
    description: 'Đánh giá mức độ gắn kết và cam kết với tổ chức',
    icon: Heart,
    color: 'red',
    questions: [
      'Tôi cảm thấy tự hào khi làm việc tại Ngân hàng và sẵn sàng giới thiệu đây là nơi làm việc tốt.',
      'Tôi tin tưởng vào tầm nhìn, sứ mệnh và giá trị cốt lõi của Ngân hàng.',
      'Tôi cảm thấy được ghi nhận và đánh giá đúng mức về những đóng góp của mình.',
      'Tôi có mối quan hệ tốt với đồng nghiệp và cấp trên, tạo động lực để tôi gắn bó lâu dài.',
      'Tôi có ý định gắn bó và phát triển sự nghiệp dài hạn tại Ngân hàng (ít nhất 5 năm trở lên).'
    ]
  },
  integrated: {
    title: 'Tích hợp HiPo (Integrated)',
    description: 'Đánh giá tổng hợp về môi trường phát triển HiPo',
    icon: Link,
    color: 'purple',
    questions: [
      'Ngân hàng tạo điều kiện tốt để tôi phát huy năng lực và đạt được khát vọng nghề nghiệp.',
      'Tôi nhận được sự hỗ trợ và coaching phù hợp từ lãnh đạo để phát triển năng lực lãnh đạo.',
      'Các chương trình đào tạo và phát triển của Ngân hàng đáp ứng tốt nhu cầu phát triển nghề nghiệp của tôi.',
      'Tôi thấy lộ trình thăng tiến tại Ngân hàng rõ ràng và công bằng cho nhóm HiPo.',
      'Nhìn chung, tôi tin rằng Ngân hàng là nơi lý tưởng để tôi phát triển thành nhà lãnh đạo tương lai.'
    ]
  }
}

const OPEN_QUESTIONS = [
  {
    id: 'Q21',
    question: 'Những yếu tố nào quan trọng nhất để giúp anh/chị gắn bó lâu dài với Ngân hàng?',
    placeholder: 'Chia sẻ những yếu tố mà Anh/Chị cho là quan trọng để duy trì sự gắn kết lâu dài...'
  },
  {
    id: 'Q22',
    question: 'Anh/chị có đề xuất gì để Ngân hàng hỗ trợ tốt hơn cho sự phát triển của nhóm HiPo?',
    placeholder: 'Đề xuất các cách thức, chương trình hoặc cơ chế mà Ngân hàng có thể cải thiện...'
  }
]

const LIKERT_SCALE = [
  { value: 1, label: 'Hoàn toàn không đồng ý', shortLabel: '1' },
  { value: 2, label: 'Không đồng ý', shortLabel: '2' },
  { value: 3, label: 'Trung lập', shortLabel: '3' },
  { value: 4, label: 'Đồng ý', shortLabel: '4' },
  { value: 5, label: 'Hoàn toàn đồng ý', shortLabel: '5' }
]

type SectionKey = keyof typeof QUESTION_SECTIONS
type AssessmentStep = 'likert' | 'open' | 'review'

interface LikertResponses {
  ability: Record<number, number>
  aspiration: Record<number, number>
  engagement: Record<number, number>
  integrated: Record<number, number>
}

interface OpenResponses {
  Q21: string
  Q22: string
}

export default function HipoAssessment({
  participant,
  onComplete,
  timeRemaining
}: HipoAssessmentProps) {
  const [step, setStep] = useState<AssessmentStep>('likert')
  const [currentSection, setCurrentSection] = useState<SectionKey>('ability')
  const [likertResponses, setLikertResponses] = useState<LikertResponses>({
    ability: {},
    aspiration: {},
    engagement: {},
    integrated: {}
  })
  const [openResponses, setOpenResponses] = useState<OpenResponses>({
    Q21: '',
    Q22: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sectionKeys = Object.keys(QUESTION_SECTIONS) as SectionKey[]
  const currentSectionIndex = sectionKeys.indexOf(currentSection)
  const isLastSection = currentSection === 'integrated'

  // Calculate scores and classifications
  const calculateSectionScore = (sectionKey: SectionKey) => {
    const responses = likertResponses[sectionKey]
    const scores = Object.values(responses)
    return scores.length === 5 ? scores.reduce((sum, score) => sum + score, 0) : 0
  }

  const getClassification = (score: number) => {
    if (score >= 21) return { level: 'Xuất sắc', color: 'green' }
    if (score >= 16) return { level: 'Tốt', color: 'blue' }
    if (score >= 11) return { level: 'Trung bình', color: 'yellow' }
    return { level: 'Cần quan tâm', color: 'red' }
  }

  // Calculate progress
  const getTotalProgress = () => {
    const likertProgress = sectionKeys.reduce((total, key) => {
      const responses = likertResponses[key]
      return total + Object.keys(responses).length
    }, 0)
    const openProgress = Object.values(openResponses).filter(r => r.trim()).length
    return ((likertProgress + openProgress) / 22) * 100
  }

  const getSectionProgress = (sectionKey: SectionKey) => {
    const responses = likertResponses[sectionKey]
    return (Object.keys(responses).length / 5) * 100
  }

  // Handle responses
  const handleLikertResponse = (questionIndex: number, value: number) => {
    setLikertResponses(prev => ({
      ...prev,
      [currentSection]: {
        ...prev[currentSection],
        [questionIndex]: value
      }
    }))
  }

  const handleOpenResponse = (questionId: keyof OpenResponses, value: string) => {
    setOpenResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  // Navigation
  const goToNextSection = () => {
    if (currentSectionIndex < sectionKeys.length - 1) {
      setCurrentSection(sectionKeys[currentSectionIndex + 1])
    } else {
      setStep('open')
    }
  }

  const goToPreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSection(sectionKeys[currentSectionIndex - 1])
    }
  }

  // Submit assessment
  const submitAssessment = async () => {
    setIsSubmitting(true)

    try {
      // Calculate all scores
      const abilityScore = calculateSectionScore('ability')
      const aspirationScore = calculateSectionScore('aspiration')
      const engagementScore = calculateSectionScore('engagement')
      const integratedScore = calculateSectionScore('integrated')
      const totalScore = abilityScore + aspirationScore + engagementScore + integratedScore

      // Submit to API
      const response = await fetch('/api/interview/hipo/submit-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
          abilityScore,
          aspirationScore,
          engagementScore,
          integratedScore,
          totalScore,
          responses: {
            ...likertResponses.ability,
            ...Object.fromEntries(Object.entries(likertResponses.aspiration).map(([k, v]) => [parseInt(k) + 5, v])),
            ...Object.fromEntries(Object.entries(likertResponses.engagement).map(([k, v]) => [parseInt(k) + 10, v])),
            ...Object.fromEntries(Object.entries(likertResponses.integrated).map(([k, v]) => [parseInt(k) + 15, v]))
          },
          openResponse1: openResponses.Q21,
          openResponse2: openResponses.Q22,
          abilityClassification: getClassification(abilityScore).level.toLowerCase().replace(' ', '_'),
          aspirationClassification: getClassification(aspirationScore).level.toLowerCase().replace(' ', '_'),
          engagementClassification: getClassification(engagementScore).level.toLowerCase().replace(' ', '_'),
          integratedClassification: getClassification(integratedScore).level.toLowerCase().replace(' ', '_')
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit assessment')
      }

      onComplete()
    } catch (error) {
      console.error('Error submitting HiPo assessment:', error)
      alert('Không thể gửi bài đánh giá. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Check if current section is complete
  const isCurrentSectionComplete = () => {
    if (step === 'likert') {
      return Object.keys(likertResponses[currentSection]).length === 5
    }
    if (step === 'open') {
      return openResponses.Q21.trim() && openResponses.Q22.trim()
    }
    return false
  }

  // Likert Scale Questions UI
  if (step === 'likert') {
    const sectionData = QUESTION_SECTIONS[currentSection]
    const SectionIcon = sectionData.icon

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Brain className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">HiPo Assessment</h2>
          </div>
          <p className="text-gray-600">Đánh giá tiềm năng lãnh đạo cao</p>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700">Tiến độ tổng thể</span>
              <span className="text-sm text-gray-600">{Math.round(getTotalProgress())}% hoàn thành</span>
            </div>
            <Progress value={getTotalProgress()} className="mb-4" />
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{formatTime(timeRemaining)} còn lại</span>
              <span>•</span>
              <span>22 câu hỏi tổng cộng</span>
            </div>
          </CardContent>
        </Card>

        {/* Section Navigation */}
        <div className="flex items-center justify-center space-x-2">
          {sectionKeys.map((key, index) => {
            const section = QUESTION_SECTIONS[key]
            const SectionIcon = section.icon
            const isActive = key === currentSection
            const isCompleted = Object.keys(likertResponses[key]).length === 5

            return (
              <div
                key={key}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-blue-100 text-blue-700" :
                  isCompleted ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-600"
                )}
              >
                <SectionIcon className="h-4 w-4" />
                <span>{section.title}</span>
                {isCompleted && <CheckCircle className="h-4 w-4" />}
              </div>
            )
          })}
        </div>

        {/* Current Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SectionIcon className={`h-5 w-5 text-${sectionData.color}-600`} />
                <span>{sectionData.title}</span>
              </div>
              <Badge variant="outline">
                {Object.keys(likertResponses[currentSection]).length}/5 hoàn thành
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-600">{sectionData.description}</p>

            {/* Likert Scale Header */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>Hoàn toàn không đồng ý</span>
                <span>Trung lập</span>
                <span>Hoàn toàn đồng ý</span>
              </div>
              <div className="flex justify-between mt-2">
                {LIKERT_SCALE.map(scale => (
                  <div key={scale.value} className="text-center">
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 text-sm font-medium flex items-center justify-center">
                      {scale.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-6">
              {sectionData.questions.map((question, index) => {
                const questionNumber = currentSectionIndex * 5 + index + 1
                const selectedValue = likertResponses[currentSection][index]

                return (
                  <div key={index} className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center flex-shrink-0 mt-1">
                        {questionNumber}
                      </div>
                      <p className="text-gray-900 leading-relaxed flex-1">{question}</p>
                    </div>

                    <div className="flex justify-center space-x-2 ml-9">
                      {LIKERT_SCALE.map(scale => (
                        <button
                          key={scale.value}
                          onClick={() => handleLikertResponse(index, scale.value)}
                          className={cn(
                            "w-10 h-10 rounded-full text-sm font-medium transition-colors",
                            selectedValue === scale.value
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                          )}
                          title={scale.label}
                        >
                          {scale.value}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={goToPreviousSection}
            variant="outline"
            disabled={currentSectionIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Phần trước
          </Button>

          <Button
            onClick={goToNextSection}
            disabled={!isCurrentSectionComplete()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLastSection ? 'Chuyển sang câu hỏi mở' : 'Phần tiếp theo'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  // Open Questions UI
  if (step === 'open') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Câu hỏi mở</h2>
          </div>
          <p className="text-gray-600">Chia sẻ quan điểm và đề xuất của Anh/Chị</p>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700">Tiến độ tổng thể</span>
              <span className="text-sm text-gray-600">{Math.round(getTotalProgress())}% hoàn thành</span>
            </div>
            <Progress value={getTotalProgress()} />
          </CardContent>
        </Card>

        {/* Open Questions */}
        <div className="space-y-6">
          {OPEN_QUESTIONS.map((q, index) => (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                    {21 + index}
                  </div>
                  <span className="text-base">{q.question}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LiveTranscriptionInput
                  questionId={q.id}
                  questionText={q.question}
                  placeholder={q.placeholder}
                  value={openResponses[q.id as keyof OpenResponses]}
                  onChange={(value) => handleOpenResponse(q.id as keyof OpenResponses, value)}
                  sessionId="temp-hipo-session"
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={() => setStep('likert')}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại câu hỏi thang điểm
          </Button>

          <Button
            onClick={() => setStep('review')}
            disabled={!isCurrentSectionComplete()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Xem lại và hoàn thành
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  // Review & Submit UI
  if (step === 'review') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Xem lại kết quả</h2>
          </div>
          <p className="text-gray-600">Kiểm tra lại câu trả lời trước khi nộp</p>
        </div>

        {/* Score Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Tổng kết điểm số</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sectionKeys.map((key) => {
                const section = QUESTION_SECTIONS[key]
                const score = calculateSectionScore(key)
                const classification = getClassification(score)
                const SectionIcon = section.icon

                return (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <SectionIcon className="h-5 w-5 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">{section.title}</div>
                        <div className="text-sm text-gray-600">{score}/25 điểm</div>
                      </div>
                    </div>
                    <Badge className={`bg-${classification.color}-100 text-${classification.color}-800`}>
                      {classification.level}
                    </Badge>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-blue-900">Tổng điểm</div>
                  <div className="text-sm text-blue-700">
                    {Object.values(likertResponses).reduce((total, section) =>
                      total + Object.values(section).reduce((sum: number, score) => sum + (score as number), 0), 0
                    )}/100 điểm
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((Object.values(likertResponses).reduce((total, section) =>
                    total + Object.values(section).reduce((sum: number, score) => sum + (score as number), 0), 0
                  ) / 100) * 100)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={() => setStep('open')}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Chỉnh sửa câu trả lời
          </Button>

          <Button
            onClick={submitAssessment}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 px-8"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <CheckCircle className="h-5 w-5 mr-2" />
            )}
            {isSubmitting ? 'Đang nộp...' : 'Hoàn thành HiPo Assessment'}
          </Button>
        </div>
      </div>
    )
  }

  return null
}