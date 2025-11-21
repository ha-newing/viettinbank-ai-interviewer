'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  SkipForward,
  Clock,
  CheckCircle,
  AlertCircle,
  Camera,
  Upload
} from 'lucide-react'

interface Interview {
  id: string
  candidateName: string
  candidateEmail: string
  status: string
  interviewLinkExpiresAt: Date
}

interface JobTemplate {
  id: string
  title: string
  description: string | null
  interviewDuration: number
}

interface InterviewQuestion {
  id: string
  questionText: string
  questionTextEn?: string
  questionOrder: number
  timeLimit: number
  category: string
  isRequired: boolean
}

interface InterviewConductProps {
  interview: Interview
  jobTemplate: JobTemplate | null
  questions: InterviewQuestion[]
  token: string
}

interface RecordedResponse {
  questionId: string
  videoBlob: Blob | null
  duration: number
  timestamp: Date
}

export default function InterviewConduct({
  interview,
  jobTemplate,
  questions,
  token
}: InterviewConductProps) {
  // State management
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [responses, setResponses] = useState<RecordedResponse[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Current question
  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  // Initialize camera and microphone
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true
        })

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        // Set up MediaRecorder
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8,opus'
        })

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data)
          }
        }

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' })

          // Save response
          const response: RecordedResponse = {
            questionId: currentQuestion.id,
            videoBlob: blob,
            duration: recordingTime,
            timestamp: new Date()
          }

          setResponses(prev => [...prev, response])
          chunksRef.current = []
        }

      } catch (err) {
        console.error('Error accessing media devices:', err)
        setError('Không thể truy cập camera hoặc microphone. Vui lòng kiểm tra quyền truy cập.')
      }
    }

    initializeMedia()

    // Cleanup
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [])

  // Set time limit when question changes
  useEffect(() => {
    if (currentQuestion) {
      setTimeRemaining(currentQuestion.timeLimit)
      setRecordingTime(0)
    }
  }, [currentQuestion])

  // Timer management
  useEffect(() => {
    if (isRecording && !isPaused && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            stopRecording()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [isRecording, isPaused, timeRemaining])

  const startRecording = () => {
    if (mediaRecorderRef.current && streamRef.current) {
      setError(null)
      chunksRef.current = []
      mediaRecorderRef.current.start(1000) // Record in chunks of 1 second
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume()
        setIsPaused(false)
      } else {
        mediaRecorderRef.current.pause()
        setIsPaused(true)
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
    }
  }

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
      }
    }
  }

  const nextQuestion = () => {
    if (!isRecording && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setTimeRemaining(questions[currentQuestionIndex + 1].timeLimit)
      setRecordingTime(0)
    }
  }

  const submitInterview = async () => {
    setIsSubmitting(true)

    try {
      // In a real implementation, you would upload videos and submit interview
      // For now, we'll just simulate submission
      console.log('Submitting interview with responses:', responses)

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Redirect to completion page
      window.location.href = `/interview/${token}/complete`

    } catch (err) {
      setError('Lỗi khi nộp phỏng vấn. Vui lòng thử lại.')
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-4">Lỗi hệ thống</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Thử lại
          </Button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Không có câu hỏi</h2>
          <p className="text-gray-600">Phỏng vấn này chưa có câu hỏi được thiết lập.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              VietinBank AI Interview - {interview.candidateName}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {jobTemplate?.title} • Câu hỏi {currentQuestionIndex + 1} / {questions.length}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-mono">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-xs text-gray-400">Thời gian còn lại</div>
            </div>

            {isRecording && (
              <div className="text-center">
                <div className="text-lg font-mono text-red-400">
                  {formatTime(recordingTime)}
                </div>
                <div className="text-xs text-gray-400">Đang ghi</div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>Tiến độ phỏng vấn</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <div className="flex flex-1">
        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Video Preview */}
          <div className="mb-6">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Recording Indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
                  <span className="text-white text-sm font-medium">
                    {isPaused ? 'Tạm dừng' : 'Đang ghi'}
                  </span>
                </div>
              )}

              {/* Controls Overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center space-x-4 bg-black bg-opacity-50 rounded-lg px-6 py-3">
                  <Button
                    onClick={toggleVideo}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white hover:bg-opacity-20"
                  >
                    {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </Button>

                  <Button
                    onClick={toggleAudio}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white hover:bg-opacity-20"
                  >
                    {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>

                  {/* Recording Controls */}
                  {!isRecording ? (
                    <Button
                      onClick={startRecording}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Bắt đầu ghi
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={pauseRecording}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </Button>

                      <Button
                        onClick={stopRecording}
                        className="bg-gray-600 hover:bg-gray-700 text-white"
                      >
                        <Square className="h-4 w-4 mr-2" />
                        Dừng ghi
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <div className="text-gray-400">
              Câu hỏi {currentQuestionIndex + 1} / {questions.length}
            </div>

            <div className="space-x-4">
              {responses.find(r => r.questionId === currentQuestion.id) && (
                <Badge className="bg-green-600 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Đã ghi
                </Badge>
              )}

              {!isLastQuestion && (
                <Button
                  onClick={nextQuestion}
                  disabled={isRecording}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <SkipForward className="h-4 w-4 mr-2" />
                  Câu tiếp theo
                </Button>
              )}

              {isLastQuestion && responses.length === questions.length && (
                <Button
                  onClick={submitInterview}
                  disabled={isRecording || isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Đang nộp bài...' : 'Hoàn thành phỏng vấn'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Question Panel */}
        <div className="w-96 bg-gray-800 p-6 border-l border-gray-700">
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <div className="text-blue-400 text-lg">💬</div>
              <h3 className="text-lg font-semibold">Câu hỏi</h3>
              <Badge variant="outline" className="border-gray-600 text-gray-300">
                <Clock className="h-3 w-3 mr-1" />
                {currentQuestion.timeLimit}s
              </Badge>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <p className="text-white text-base leading-relaxed">
                {currentQuestion.questionText}
              </p>

              {currentQuestion.questionTextEn && (
                <p className="text-gray-400 text-sm mt-2 italic">
                  {currentQuestion.questionTextEn}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">💡 Gợi ý trả lời:</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Suy nghĩ 5-10 giây trước khi bắt đầu</li>
                <li>• Trả lời rõ ràng và có cấu trúc</li>
                <li>• Đưa ra ví dụ cụ thể nếu có thể</li>
                <li>• Nhìn thẳng vào camera khi nói</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">📊 Tiêu chí đánh giá:</h4>
              <div className="text-xs text-gray-400">
                {currentQuestion.category === 'impression' && '• Ấn tượng cá nhân'}
                {currentQuestion.category === 'taskPerformance' && '• Hiệu suất nhiệm vụ'}
                {currentQuestion.category === 'logicalThinking' && '• Tư duy logic'}
                {currentQuestion.category === 'researchAbility' && '• Khả năng nghiên cứu'}
                {currentQuestion.category === 'communication' && '• Giao tiếp'}
                {!['impression', 'taskPerformance', 'logicalThinking', 'researchAbility', 'communication'].includes(currentQuestion.category) && '• Đánh giá tổng hợp'}
              </div>
            </div>

            {/* Question List */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">📝 Tiến độ:</h4>
              <div className="space-y-2">
                {questions.map((q, index) => (
                  <div
                    key={q.id}
                    className={`text-xs p-2 rounded ${
                      index === currentQuestionIndex
                        ? 'bg-blue-900 text-blue-200'
                        : responses.find(r => r.questionId === q.id)
                        ? 'bg-green-900 text-green-200'
                        : 'bg-gray-900 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Câu {index + 1}</span>
                      {responses.find(r => r.questionId === q.id) && (
                        <CheckCircle className="h-3 w-3" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}