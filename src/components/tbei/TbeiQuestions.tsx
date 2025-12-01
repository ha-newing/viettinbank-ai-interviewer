'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import LiveTranscriptionInput from '@/components/ui/LiveTranscriptionInput'
import {
  CheckCircle,
  Clock,
  Users,
  Cpu,
  ArrowRight,
  FileText,
  AlertCircle,
  Mic,
  RotateCcw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TbeiQuestionsProps {
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

// Question banks based on specs_competency.md
const TBEI_QUESTIONS = {
  talent_development: {
    id: 'talent_development',
    title: 'Phát triển Đội ngũ',
    icon: Users,
    description: 'Nhận diện tiềm năng, kế cận, coaching, tạo cơ hội phát triển trong đơn vị mình phụ trách',
    questions: [
      {
        id: 'TD_Q1',
        questionText: 'Anh/Chị hãy kể về một lần Anh/Chị xác định và xây dựng đội ngũ kế cận cho các vị trí chủ chốt trong phòng ban/mảng mình phụ trách. Anh/Chị đã lập kế hoạch phát triển cho họ như thế nào?'
      },
      {
        id: 'TD_Q2',
        questionText: 'Mô tả một tình huống Anh/Chị chủ động trao đổi với một cán bộ tiềm năng về định hướng phát triển nghề nghiệp và sau đó sắp xếp nhiệm vụ, đào tạo hoặc luân chuyển để hỗ trợ họ phát triển.'
      },
      {
        id: 'TD_Q3',
        questionText: 'Hãy kể về một ví dụ Anh/Chị giao một nhiệm vụ hoặc dự án "stretch" (vượt khỏi vùng an toàn) cho một nhân sự, đồng thời trực tiếp huấn luyện/feedback trong quá trình thực hiện để người đó trưởng thành lên một vai trò mới.'
      }
    ]
  },
  digital_transformation: {
    id: 'digital_transformation',
    title: 'Chuyển đổi Số',
    icon: Cpu,
    description: 'Phó GĐ hiểu chiến lược số, chọn đúng công nghệ, triển khai trong đơn vị, "làm cầu nối" với Hội sở',
    questions: [
      {
        id: 'DT_Q1',
        questionText: 'Anh/Chị hãy kể về một lần Anh/Chị đánh giá hiện trạng sử dụng công nghệ tại đơn vị/phòng ban mình phụ trách, nhận ra các điểm hạn chế và đề xuất một hoặc vài giải pháp số hóa để cải thiện năng suất hoặc trải nghiệm khách hàng.'
      },
      {
        id: 'DT_Q2',
        questionText: 'Mô tả một tình huống Anh/Chị triển khai hoặc hỗ trợ triển khai một công nghệ/ứng dụng số mới (ví dụ: công cụ CRM, auto-report, ứng dụng AI chăm sóc khách hàng) trong đơn vị, và cách Anh/Chị đào tạo, thuyết phục và hỗ trợ đội ngũ sử dụng hiệu quả.'
      },
      {
        id: 'DT_Q3',
        questionText: 'Hãy kể về một lần Anh/Chị phải lựa chọn giữa nhiều giải pháp/công nghệ khác nhau (trong khuôn khổ NH đưa xuống hoặc trong nội bộ), và Anh/Chị đã phân biệt đâu là xu hướng nhất thời, đâu là giải pháp mang lại tác động lâu dài cho chi nhánh như thế nào.'
      }
    ]
  }
}

const RESPONSE_TEMPLATE = [
  {
    id: 'story_overview',
    title: '1. TỔNG QUAN CÂU CHUYỆN',
    description: '2-3 câu tóm tắt tình huống',
    placeholder: 'Mô tả tóm tắt tình huống mà Anh/Chị đã trải qua...'
  },
  {
    id: 'event_context',
    title: '2. BỐI CẢNH SỰ KIỆN',
    description: 'Điều gì dẫn đến sự kiện này',
    placeholder: 'Nguyên nhân, bối cảnh dẫn đến tình huống này...'
  },
  {
    id: 'organizational_result',
    title: '3. KẾT QUẢ ĐỐI VỚI TỔ CHỨC',
    description: 'Thành công đối với tổ chức là gì',
    placeholder: 'Những kết quả, tác động tích cực mà tổ chức đạt được...'
  },
  {
    id: 'personal_result',
    title: '4. KẾT QUẢ ĐỐI VỚI CÁ NHÂN',
    description: 'Thành công đối với cá nhân anh/chị là gì',
    placeholder: 'Những kinh nghiệm, kỹ năng, học hỏi mà Anh/Chị có được...'
  }
]

type CompetencyStep = 'selection' | 'guidance' | 'recording' | 'review'

interface SelectedQuestion {
  competencyId: string
  questionId: string
  questionIndex: number
  questionText: string
}

interface Response {
  competencyId: string
  questionId: string
  selectedQuestionIndex: number
  transcript: string
  structuredResponse: Record<string, string>
  audioUrl?: string
  durationSeconds: number
}

export default function TbeiQuestions({
  participant,
  onComplete,
  timeRemaining
}: TbeiQuestionsProps) {
  // State management
  const [currentCompetency, setCurrentCompetency] = useState<'talent_development' | 'digital_transformation'>('talent_development')
  const [step, setStep] = useState<CompetencyStep>('selection')
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, SelectedQuestion>>({})
  const [responses, setResponses] = useState<Record<string, Response>>({})
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get current competency data
  const competencyData = TBEI_QUESTIONS[currentCompetency]
  const isLastCompetency = currentCompetency === 'digital_transformation'
  const isCompetencyCompleted = responses[currentCompetency] !== undefined

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Handle question selection
  const handleQuestionSelect = (questionIndex: number) => {
    const question = competencyData.questions[questionIndex]
    const selectedQuestion: SelectedQuestion = {
      competencyId: currentCompetency,
      questionId: question.id,
      questionIndex,
      questionText: question.questionText
    }

    setSelectedQuestions(prev => ({
      ...prev,
      [currentCompetency]: selectedQuestion
    }))

    setStep('guidance')
  }

  // Submit response for current competency
  const submitResponse = async () => {
    const selectedQuestion = selectedQuestions[currentCompetency]
    if (!selectedQuestion) return

    setIsSubmitting(true)

    try {
      const response: Response = {
        competencyId: currentCompetency,
        questionId: selectedQuestion.questionId,
        selectedQuestionIndex: selectedQuestion.questionIndex,
        transcript,
        structuredResponse: {}, // Empty since we don't collect structured input anymore
        durationSeconds: recordingDuration
      }

      // Submit to API
      const submitResponse = await fetch('/api/interview/tbei/submit-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
          competencyId: currentCompetency,
          questionId: selectedQuestion.questionId,
          selectedQuestionIndex: selectedQuestion.questionIndex,
          transcript,
          structuredResponse: {}, // Empty since STAR framework is guidance-only now
          durationSeconds: recordingDuration
        })
      })

      if (!submitResponse.ok) {
        throw new Error('Failed to submit response')
      }

      // Store response locally
      setResponses(prev => ({
        ...prev,
        [currentCompetency]: response
      }))

      // Move to next competency or complete
      if (currentCompetency === 'talent_development') {
        setCurrentCompetency('digital_transformation')
        setStep('selection')
        setTranscript('')
        setRecordingDuration(0)
      } else {
        // Both competencies completed
        onComplete()
      }
    } catch (error) {
      console.error('Error submitting response:', error)
      alert('Không thể gửi câu trả lời. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Question Selection UI
  if (step === 'selection') {
    const Icon = competencyData.icon

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Icon className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              {competencyData.title}
            </h2>
          </div>
          <p className="text-gray-600">{competencyData.description}</p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <span>Bước {currentCompetency === 'talent_development' ? '1' : '2'}/2</span>
            <span>•</span>
            <span>Chọn 1 trong 3 câu hỏi</span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center space-x-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
            responses.talent_development ? "bg-green-500 text-white" :
            currentCompetency === 'talent_development' ? "bg-blue-500 text-white" : "bg-gray-300"
          )}>
            {responses.talent_development ? <CheckCircle className="h-4 w-4" /> : '1'}
          </div>
          <div className="w-12 h-1 bg-gray-300"></div>
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
            responses.digital_transformation ? "bg-green-500 text-white" :
            currentCompetency === 'digital_transformation' ? "bg-blue-500 text-white" : "bg-gray-300"
          )}>
            {responses.digital_transformation ? <CheckCircle className="h-4 w-4" /> : '2'}
          </div>
        </div>

        {/* Questions */}
        <div className="grid gap-4">
          {competencyData.questions.map((question, index) => (
            <Card
              key={question.id}
              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300"
              onClick={() => handleQuestionSelect(index)}
            >
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-medium text-gray-900 leading-relaxed">
                        {question.questionText}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Instructions */}
        <Card className="bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h4 className="font-medium text-blue-900 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Hướng dẫn trả lời
              </h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p>• Chọn 1 trong 3 câu hỏi phù hợp nhất với kinh nghiệm của Anh/Chị</p>
                <p>• Trả lời theo cấu trúc STAR: <strong>Situation - Task - Action - Result</strong></p>
                <p>• Chia sẻ một ví dụ cụ thể, chi tiết từ kinh nghiệm thực tế</p>
                <p>• Thời gian trả lời: <strong>3-5 phút</strong> cho mỗi câu hỏi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Pre-Recording Guidance UI
  if (step === 'guidance') {
    const selectedQuestion = selectedQuestions[currentCompetency]
    if (!selectedQuestion) return null

    const Icon = competencyData.icon

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Icon className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              Hướng dẫn chuẩn bị trả lời
            </h2>
          </div>
          <p className="text-gray-600">
            Chuẩn bị câu trả lời theo mẫu dàn ý sự kiện STAR
          </p>
        </div>

        {/* Selected Question */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Câu hỏi đã chọn</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-800 leading-relaxed">
              {selectedQuestion.questionText}
            </p>
          </CardContent>
        </Card>

        {/* STAR Framework Guidance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Mẫu dàn ý sự kiện (STAR)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  1. TỔNG QUAN CÂU CHUYỆN (Situation - Task)
                </h3>
                <p className="text-gray-600 text-sm">
                  • Bối cảnh tổng quan: Thời điểm, địa điểm, hoàn cảnh<br />
                  • Nhiệm vụ được giao: Mục tiêu cần đạt được<br />
                  • Các bên liên quan: Ai tham gia, vai trò như thế nào
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-green-900 mb-2">
                  2. BỐI CẢNH SỰ KIỆN (Action)
                </h3>
                <p className="text-gray-600 text-sm">
                  • Hành động cụ thể: Anh/chị đã làm gì?<br />
                  • Quy trình thực hiện: Các bước tiến hành<br />
                  • Thách thức gặp phải và cách giải quyết
                </p>
              </div>

              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-semibold text-orange-900 mb-2">
                  3. KẾT QUẢ ĐỐI VỚI TỔ CHỨC (Result - Organization)
                </h3>
                <p className="text-gray-600 text-sm">
                  • Kết quả đo lường được: Số liệu, chỉ số cụ thể<br />
                  • Tác động tích cực: Lợi ích cho tổ chức/phòng ban<br />
                  • Sự công nhận: Phản hồi từ cấp trên/đồng nghiệp
                </p>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold text-purple-900 mb-2">
                  4. KẾT QUẢ ĐỐI VỚI CÁ NHÂN (Result - Personal)
                </h3>
                <p className="text-gray-600 text-sm">
                  • Bài học kinh nghiệm: Điều gì đã học được?<br />
                  • Kỹ năng phát triển: Năng lực nào được cải thiện?<br />
                  • Ứng dụng tương lai: Sẽ áp dụng như thế nào?
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Lưu ý quan trọng:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Thời gian trả lời: 3-5 phút cho mỗi câu hỏi</li>
                    <li>• Tập trung vào vai trò và đóng góp cá nhân</li>
                    <li>• Cung cấp ví dụ cụ thể, số liệu thực tế</li>
                    <li>• Thể hiện sự học hỏi và phát triển liên tục</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            onClick={() => setStep('recording')}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Bắt đầu ghi âm
          </Button>
        </div>
      </div>
    )
  }

  // Recording UI
  const selectedQuestion = selectedQuestions[currentCompetency]
  if (step === 'recording' && selectedQuestion) {
    const Icon = competencyData.icon

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Icon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {competencyData.title} - Câu hỏi {selectedQuestion.questionIndex + 1}
            </h2>
          </div>
        </div>

        {/* Selected Question */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Câu hỏi đã chọn</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900 leading-relaxed">
              {selectedQuestion.questionText}
            </p>
          </CardContent>
        </Card>

        {/* STAR Framework Guidance - Collapsible */}
        <Card className="bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-base">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Mẫu dàn ý sự kiện (STAR)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {RESPONSE_TEMPLATE.map((section) => (
                <div key={section.id} className="bg-white rounded-lg p-3 border-l-4 border-blue-500">
                  <h4 className="text-sm font-medium text-blue-900">{section.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{section.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Transcription - Main recording interface */}
        <LiveTranscriptionInput
          questionId={`${currentCompetency}_${selectedQuestion.questionId}`}
          questionText={selectedQuestion.questionText}
          placeholder="Live transcription sẽ hiển thị ở đây khi bạn ghi âm..."
          value={transcript}
          onChange={setTranscript}
          sessionId="temp-tbei-session"
          onDurationChange={setRecordingDuration}
        />

        {/* Submit Button */}
        {transcript.trim() && (
          <div className="flex justify-center">
            <Button
              onClick={() => setStep('review')}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 px-8"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <CheckCircle className="h-5 w-5 mr-2" />
              )}
              Xem lại & Gửi
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Review & Submit UI
  if (step === 'review') {
    const selectedQuestion = selectedQuestions[currentCompetency]
    if (!selectedQuestion) return null

    const Icon = competencyData.icon
    const isLastCompetency = currentCompetency === 'digital_transformation'

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Icon className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              Xem lại câu trả lời
            </h2>
          </div>
          <p className="text-gray-600">
            Kiểm tra lại câu trả lời của bạn trước khi gửi
          </p>
        </div>

        {/* Question Review */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Câu hỏi đã trả lời</span>
              <Badge variant="outline" className="text-green-600 border-green-600">
                {competencyData.title}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-800 leading-relaxed">
              {selectedQuestion.questionText}
            </p>
          </CardContent>
        </Card>

        {/* Recording Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Mic className="h-5 w-5 text-blue-600" />
              <span>Bản ghi âm của bạn</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Thời lượng ghi âm</p>
                  <p className="text-sm text-gray-600">
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {recordingDuration >= 180 ? '✅ Đủ thời gian' : '⚠️ Nên dài hơn 3 phút'}
                </p>
              </div>
            </div>

            {transcript && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-blue-900">Nội dung phiên âm:</h4>
                <p className="text-sm text-blue-800 leading-relaxed">
                  {transcript}
                </p>
              </div>
            )}

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-green-900">📝 Hướng dẫn STAR đã được cung cấp:</h4>
              <div className="text-sm text-green-800">
                Bạn đã được hướng dẫn cấu trúc STAR (Situation-Task-Action-Result) trong phần dàn ý.
                Câu trả lời của bạn sẽ được đánh giá dựa trên mức độ tuân thủ cấu trúc này.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={() => {
              setStep('recording')
              setRecordingDuration(0)
              setTranscript('')
            }}
            variant="outline"
            size="lg"
            className="px-6"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Ghi lại
          </Button>

          <Button
            onClick={submitResponse}
            size="lg"
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 px-8"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <CheckCircle className="h-5 w-5 mr-2" />
            )}
            {isSubmitting ? 'Đang gửi...' :
             isLastCompetency ? 'Hoàn thành TBEI' : 'Chuyển sang năng lực tiếp theo'}
          </Button>
        </div>
      </div>
    )
  }

  return null
}