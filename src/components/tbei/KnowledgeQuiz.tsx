'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  CheckSquare,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  Shield,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface KnowledgeQuizProps {
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

// Quiz questions organized by category
const QUIZ_CATEGORIES = {
  banking_regulations: {
    title: 'Quy định Ngân hàng',
    icon: Shield,
    color: 'red'
  },
  products_services: {
    title: 'Sản phẩm & Dịch vụ',
    icon: BookOpen,
    color: 'blue'
  },
  risk_management: {
    title: 'Quản lý Rủi ro',
    icon: AlertTriangle,
    color: 'yellow'
  },
  customer_service: {
    title: 'Dịch vụ Khách hàng',
    icon: Users,
    color: 'green'
  },
  digital_banking: {
    title: 'Ngân hàng Số',
    icon: TrendingUp,
    color: 'purple'
  }
}

const QUIZ_QUESTIONS = [
  // Banking Regulations
  {
    id: 'BR_001',
    category: 'banking_regulations',
    question: 'Theo Thông tư 01/2020/TT-NHNN, mức trích lập dự phòng rủi ro tín dụng tối thiểu cho nợ nhóm 2 là bao nhiêu?',
    options: [
      { id: 'A', text: '2%' },
      { id: 'B', text: '5%' },
      { id: 'C', text: '10%' },
      { id: 'D', text: '15%' }
    ],
    correctAnswer: 'B',
    explanation: 'Theo quy định hiện hành, nợ nhóm 2 phải trích lập dự phòng tối thiểu 5%.'
  },
  {
    id: 'BR_002',
    category: 'banking_regulations',
    question: 'Hạn mức cho vay tối đa của một TCTD đối với 1 khách hàng là bao nhiêu % vốn điều lệ?',
    options: [
      { id: 'A', text: '10%' },
      { id: 'B', text: '15%' },
      { id: 'C', text: '20%' },
      { id: 'D', text: '25%' }
    ],
    correctAnswer: 'B',
    explanation: 'Hạn mức cho vay tối đa đối với 1 khách hàng là 15% vốn điều lệ theo quy định của NHNN.'
  },

  // Products & Services
  {
    id: 'PS_001',
    category: 'products_services',
    question: 'VietinBank iPay là dịch vụ gì của VietinBank?',
    options: [
      { id: 'A', text: 'Internet Banking' },
      { id: 'B', text: 'Mobile Banking' },
      { id: 'C', text: 'Ví điện tử' },
      { id: 'D', text: 'Cổng thanh toán trực tuyến' }
    ],
    correctAnswer: 'D',
    explanation: 'VietinBank iPay là cổng thanh toán trực tuyến của VietinBank cho các doanh nghiệp.'
  },
  {
    id: 'PS_002',
    category: 'products_services',
    question: 'Sản phẩm "Vay thế chấp bất động sản" của VietinBank có thể vay tối đa bao nhiêu % giá trị tài sản đảm bảo?',
    options: [
      { id: 'A', text: '70%' },
      { id: 'B', text: '80%' },
      { id: 'C', text: '85%' },
      { id: 'D', text: '90%' }
    ],
    correctAnswer: 'C',
    explanation: 'VietinBank cho vay thế chấp bất động sản tối đa 85% giá trị tài sản đảm bảo.'
  },

  // Risk Management
  {
    id: 'RM_001',
    category: 'risk_management',
    question: 'Basel III yêu cầu tỷ lệ an toàn vốn tối thiểu (CAR) là bao nhiêu?',
    options: [
      { id: 'A', text: '6%' },
      { id: 'B', text: '8%' },
      { id: 'C', text: '10%' },
      { id: 'D', text: '10.5%' }
    ],
    correctAnswer: 'B',
    explanation: 'Basel III yêu cầu tỷ lệ an toàn vốn tối thiểu 8%, trong đó Tier 1 capital tối thiểu 6%.'
  },
  {
    id: 'RM_002',
    category: 'risk_management',
    question: 'KYC là viết tắt của cụm từ nào?',
    options: [
      { id: 'A', text: 'Know Your Customer' },
      { id: 'B', text: 'Keep Your Capital' },
      { id: 'C', text: 'Key Yield Component' },
      { id: 'D', text: 'Know Your Compliance' }
    ],
    correctAnswer: 'A',
    explanation: 'KYC là viết tắt của "Know Your Customer" - tìm hiểu khách hàng của bạn.'
  },

  // Customer Service
  {
    id: 'CS_001',
    category: 'customer_service',
    question: 'Thời gian xử lý khiếu nại của khách hàng theo quy định nội bộ VietinBank là?',
    options: [
      { id: 'A', text: '15 ngày làm việc' },
      { id: 'B', text: '30 ngày làm việc' },
      { id: 'C', text: '45 ngày làm việc' },
      { id: 'D', text: '60 ngày làm việc' }
    ],
    correctAnswer: 'A',
    explanation: 'VietinBank cam kết xử lý khiếu nại khách hàng trong vòng 15 ngày làm việc.'
  },
  {
    id: 'CS_002',
    category: 'customer_service',
    question: 'Nguyên tắc "5S" trong dịch vụ khách hàng không bao gồm yếu tố nào?',
    options: [
      { id: 'A', text: 'Sạch sẽ (Seiri)' },
      { id: 'B', text: 'Sắp xếp (Seiton)' },
      { id: 'C', text: 'Sáng tạo (Seisou)' },
      { id: 'D', text: 'Sẵn sàng phục vụ (Service)' }
    ],
    correctAnswer: 'D',
    explanation: '5S gồm: Seiri (sắp xếp), Seiton (sờn), Seiso (sạch sẽ), Seiketsu (săn sóc), Shitsuke (siết chặt).'
  },

  // Digital Banking
  {
    id: 'DB_001',
    category: 'digital_banking',
    question: 'API trong ngân hàng số có ý nghĩa gì?',
    options: [
      { id: 'A', text: 'Automated Payment Interface' },
      { id: 'B', text: 'Application Programming Interface' },
      { id: 'C', text: 'Advanced Payment Infrastructure' },
      { id: 'D', text: 'Artificial Payment Intelligence' }
    ],
    correctAnswer: 'B',
    explanation: 'API là Application Programming Interface - giao diện lập trình ứng dụng.'
  },
  {
    id: 'DB_002',
    category: 'digital_banking',
    question: 'Blockchain trong thanh toán có ưu điểm chính là gì?',
    options: [
      { id: 'A', text: 'Tốc độ xử lý nhanh' },
      { id: 'B', text: 'Chi phí thấp' },
      { id: 'C', text: 'Bảo mật và minh bạch' },
      { id: 'D', text: 'Dễ sử dụng' }
    ],
    correctAnswer: 'C',
    explanation: 'Blockchain mang lại tính bảo mật cao và minh bạch trong các giao dịch.'
  }
]

interface QuizAnswer {
  questionId: string
  selectedOption: string
}

export default function KnowledgeQuiz({
  participant,
  onComplete,
  timeRemaining
}: KnowledgeQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoSubmitTriggered, setAutoSubmitTriggered] = useState(false)

  const currentQuestion = QUIZ_QUESTIONS[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === QUIZ_QUESTIONS.length - 1
  const totalQuestions = QUIZ_QUESTIONS.length

  // Get current answer
  const getCurrentAnswer = () => {
    return answers.find(a => a.questionId === currentQuestion.id)?.selectedOption
  }

  // Calculate progress
  const getProgress = () => {
    return ((currentQuestionIndex + 1) / totalQuestions) * 100
  }

  // Calculate completion percentage
  const getCompletionPercentage = () => {
    return (answers.length / totalQuestions) * 100
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining <= 0 && !autoSubmitTriggered && !showResults) {
      setAutoSubmitTriggered(true)
      submitQuiz()
    }
  }, [timeRemaining, autoSubmitTriggered, showResults])

  // Handle answer selection
  const handleAnswerSelect = (optionId: string) => {
    const newAnswer = { questionId: currentQuestion.id, selectedOption: optionId }
    const updatedAnswers = answers.filter(a => a.questionId !== currentQuestion.id)
    setAnswers([...updatedAnswers, newAnswer])
  }

  // Navigation
  const goToNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index)
  }

  // Calculate score
  const calculateScore = () => {
    let correctCount = 0
    answers.forEach(answer => {
      const question = QUIZ_QUESTIONS.find(q => q.id === answer.questionId)
      if (question && question.correctAnswer === answer.selectedOption) {
        correctCount++
      }
    })
    return {
      correctCount,
      totalQuestions: QUIZ_QUESTIONS.length,
      percentage: Math.round((correctCount / QUIZ_QUESTIONS.length) * 100)
    }
  }

  // Submit quiz
  const submitQuiz = async () => {
    setIsSubmitting(true)

    try {
      const score = calculateScore()

      // Format answers for API
      const formattedAnswers = answers.reduce((acc, answer) => ({
        ...acc,
        [answer.questionId]: answer.selectedOption
      }), {})

      const response = await fetch('/api/interview/quiz/submit-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
          answers: formattedAnswers,
          score: score.correctCount,
          totalQuestions: score.totalQuestions,
          timeSpentSeconds: 900 - timeRemaining // 15 minutes - remaining time
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit quiz')
      }

      setShowResults(true)
    } catch (error) {
      console.error('Error submitting quiz:', error)
      alert('Không thể nộp bài quiz. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Complete quiz and move to next step
  const completeQuiz = () => {
    onComplete()
  }

  // Get category info for current question
  const getCategoryInfo = (categoryKey: string) => {
    return QUIZ_CATEGORIES[categoryKey as keyof typeof QUIZ_CATEGORIES]
  }

  // Results view
  if (showResults) {
    const score = calculateScore()
    const scoreLevel = score.percentage >= 80 ? 'excellent' :
                     score.percentage >= 60 ? 'good' :
                     score.percentage >= 40 ? 'average' : 'poor'

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Quiz Hoàn thành</h2>
          </div>
          <p className="text-gray-600">Kết quả kiểm tra kiến thức chuyên môn</p>
        </div>

        {/* Score Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Kết quả điểm số</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className={cn(
                "text-6xl font-bold mb-2",
                scoreLevel === 'excellent' ? 'text-green-600' :
                scoreLevel === 'good' ? 'text-blue-600' :
                scoreLevel === 'average' ? 'text-yellow-600' : 'text-red-600'
              )}>
                {score.percentage}%
              </div>
              <div className="text-lg text-gray-600">
                {score.correctCount}/{score.totalQuestions} câu đúng
              </div>
              <Badge className={cn(
                "mt-2",
                scoreLevel === 'excellent' ? 'bg-green-100 text-green-800' :
                scoreLevel === 'good' ? 'bg-blue-100 text-blue-800' :
                scoreLevel === 'average' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
              )}>
                {scoreLevel === 'excellent' ? 'Xuất sắc' :
                 scoreLevel === 'good' ? 'Tốt' :
                 scoreLevel === 'average' ? 'Trung bình' : 'Cần cải thiện'}
              </Badge>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(QUIZ_CATEGORIES).map(([key, category]) => {
                const categoryQuestions = QUIZ_QUESTIONS.filter(q => q.category === key)
                const categoryAnswers = answers.filter(a =>
                  categoryQuestions.some(q => q.id === a.questionId)
                )
                const correctInCategory = categoryAnswers.filter(a => {
                  const question = categoryQuestions.find(q => q.id === a.questionId)
                  return question && question.correctAnswer === a.selectedOption
                }).length

                const CategoryIcon = category.icon

                return (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CategoryIcon className="h-5 w-5 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">{category.title}</div>
                        <div className="text-sm text-gray-600">
                          {correctInCategory}/{categoryQuestions.length} câu đúng
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {categoryQuestions.length > 0 ?
                        Math.round((correctInCategory / categoryQuestions.length) * 100) : 0}%
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Complete Button */}
        <div className="flex justify-center">
          <Button
            onClick={completeQuiz}
            className="bg-green-600 hover:bg-green-700 px-8"
            size="lg"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Hoàn thành tất cả đánh giá
          </Button>
        </div>
      </div>
    )
  }

  // Quiz interface
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <CheckSquare className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Knowledge Quiz</h2>
        </div>
        <p className="text-gray-600">Kiểm tra kiến thức chuyên môn ngân hàng</p>
      </div>

      {/* Progress and Timer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                Câu {currentQuestionIndex + 1}/{totalQuestions}
              </span>
              <span className="text-sm text-gray-600">
                {Math.round(getCompletionPercentage())}% đã trả lời
              </span>
            </div>
            <div className={cn(
              "flex items-center space-x-2 px-3 py-1 rounded-lg",
              timeRemaining < 300 ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
            )}>
              <Clock className="h-4 w-4" />
              <span className="font-mono font-semibold">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
          <Progress value={getProgress()} />
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {(() => {
                const categoryInfo = getCategoryInfo(currentQuestion.category)
                const CategoryIcon = categoryInfo.icon
                return (
                  <>
                    <CategoryIcon className="h-5 w-5 text-gray-600" />
                    <Badge variant="outline">{categoryInfo.title}</Badge>
                  </>
                )
              })()}
            </div>
            <Badge variant="secondary">
              Câu {currentQuestionIndex + 1}
            </Badge>
          </div>
          <CardTitle className="text-lg leading-relaxed mt-4">
            {currentQuestion.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentQuestion.options.map((option) => {
            const isSelected = getCurrentAnswer() === option.id

            return (
              <button
                key={option.id}
                onClick={() => handleAnswerSelect(option.id)}
                className={cn(
                  "w-full text-left p-4 rounded-lg border-2 transition-all",
                  isSelected
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium",
                    isSelected
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-300 text-gray-600"
                  )}>
                    {option.id}
                  </div>
                  <span className="flex-1">{option.text}</span>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* Question Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between mb-4">
            <Button
              onClick={goToPreviousQuestion}
              variant="outline"
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Câu trước
            </Button>

            <div className="flex items-center space-x-2">
              {QUIZ_QUESTIONS.map((_, index) => {
                const hasAnswer = answers.some(a => a.questionId === QUIZ_QUESTIONS[index].id)
                const isCurrent = index === currentQuestionIndex

                return (
                  <button
                    key={index}
                    onClick={() => goToQuestion(index)}
                    className={cn(
                      "w-8 h-8 rounded-full text-xs font-medium transition-colors",
                      isCurrent
                        ? "bg-blue-600 text-white"
                        : hasAnswer
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>

            {isLastQuestion ? (
              <Button
                onClick={submitQuiz}
                disabled={isSubmitting || answers.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? 'Đang nộp bài...' : 'Nộp bài'}
              </Button>
            ) : (
              <Button
                onClick={goToNextQuestion}
                disabled={!getCurrentAnswer()}
              >
                Câu tiếp theo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {timeRemaining < 300 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center text-red-700">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">
                  Chú ý: Còn ít hơn 5 phút! Bài sẽ được tự động nộp khi hết thời gian.
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}