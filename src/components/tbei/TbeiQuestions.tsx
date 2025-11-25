'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Clock,
  Users,
  Cpu,
  ArrowRight,
  FileText,
  AlertCircle
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

type RecordingState = 'idle' | 'recording' | 'paused' | 'completed'
type CompetencyStep = 'selection' | 'recording' | 'review'

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
  const [structuredResponse, setStructuredResponse] = useState<Record<string, string>>({})
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Get current competency data
  const competencyData = TBEI_QUESTIONS[currentCompetency]
  const isLastCompetency = currentCompetency === 'digital_transformation'
  const isCompetencyCompleted = responses[currentCompetency] !== undefined

  // Timer for recording duration
  useEffect(() => {
    if (recordingState === 'recording') {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [recordingState])

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

    setStep('recording')
  }

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        // TODO: Upload audio blob to storage and get URL
        console.log('Audio recorded:', audioBlob)
      }

      mediaRecorder.start(1000) // Record in 1-second intervals
      setRecordingState('recording')
      setRecordingDuration(0)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setRecordingState('completed')
    }
  }

  // Pause/Resume recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause()
      setRecordingState('paused')
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume()
      setRecordingState('recording')
    }
  }

  // Reset recording
  const resetRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
    setRecordingState('idle')
    setRecordingDuration(0)
    setTranscript('')
    setStructuredResponse({})
    audioChunksRef.current = []
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
        structuredResponse,
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
          structuredResponse,
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
        setStructuredResponse({})
        setTranscript('')
        setRecordingDuration(0)
        setRecordingState('idle')
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

  // Recording UI
  const selectedQuestion = selectedQuestions[currentCompetency]
  if (step === 'recording' && selectedQuestion) {
    const Icon = competencyData.icon

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Icon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {competencyData.title} - Câu hỏi {selectedQuestion.questionIndex + 1}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Recording Controls */}
          <div className="space-y-6">
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

            {/* Recording Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Ghi âm câu trả lời</span>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(recordingDuration)}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center space-x-4">
                  {recordingState === 'idle' && (
                    <Button
                      onClick={startRecording}
                      size="lg"
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Mic className="h-5 w-5 mr-2" />
                      Bắt đầu ghi âm
                    </Button>
                  )}

                  {recordingState === 'recording' && (
                    <>
                      <Button onClick={pauseRecording} size="lg" variant="outline">
                        <Pause className="h-5 w-5 mr-2" />
                        Tạm dừng
                      </Button>
                      <Button onClick={stopRecording} size="lg" className="bg-green-600 hover:bg-green-700">
                        <MicOff className="h-5 w-5 mr-2" />
                        Dừng ghi âm
                      </Button>
                    </>
                  )}

                  {recordingState === 'paused' && (
                    <>
                      <Button onClick={resumeRecording} size="lg" className="bg-blue-600 hover:bg-blue-700">
                        <Play className="h-5 w-5 mr-2" />
                        Tiếp tục
                      </Button>
                      <Button onClick={stopRecording} size="lg" className="bg-green-600 hover:bg-green-700">
                        <MicOff className="h-5 w-5 mr-2" />
                        Dừng ghi âm
                      </Button>
                    </>
                  )}

                  {recordingState === 'completed' && (
                    <Button onClick={resetRecording} size="lg" variant="outline">
                      <RotateCcw className="h-5 w-5 mr-2" />
                      Ghi âm lại
                    </Button>
                  )}
                </div>

                {recordingState === 'recording' && (
                  <div className="flex items-center justify-center">
                    <div className="flex items-center space-x-2 text-red-600">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Đang ghi âm...</span>
                    </div>
                  </div>
                )}

                {recordingState === 'completed' && (
                  <div className="text-center">
                    <div className="flex items-center justify-center text-green-600 mb-4">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span>Ghi âm hoàn thành ({formatTime(recordingDuration)})</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transcript */}
            <Card>
              <CardHeader>
                <CardTitle>Transcript (tùy chọn)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Nhập transcript của câu trả lời (tùy chọn)..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Structured Response Template */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Mẫu dàn ý sự kiện
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-800">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Hãy sử dụng mẫu dàn ý này để cấu trúc câu trả lời của Anh/Chị
                </div>

                {RESPONSE_TEMPLATE.map((section) => (
                  <div key={section.id} className="space-y-2">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{section.title}</h4>
                      <p className="text-xs text-gray-600">{section.description}</p>
                    </div>
                    <Textarea
                      placeholder={section.placeholder}
                      value={structuredResponse[section.id] || ''}
                      onChange={(e) => setStructuredResponse(prev => ({
                        ...prev,
                        [section.id]: e.target.value
                      }))}
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Button */}
        {(recordingState === 'completed' || transcript.trim() || Object.values(structuredResponse).some(v => v.trim())) && (
          <div className="flex justify-center">
            <Button
              onClick={submitResponse}
              size="lg"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 px-8"
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
        )}
      </div>
    )
  }

  return null
}