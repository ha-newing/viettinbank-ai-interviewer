'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain } from 'lucide-react'

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

export default function HipoAssessment({
  participant,
  onComplete,
  timeRemaining
}: HipoAssessmentProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Brain className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            HiPo Assessment
          </h2>
        </div>
        <p className="text-gray-600">Đánh giá tiềm năng lãnh đạo cao</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Đang phát triển</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            HiPo Assessment questionnaire đang được phát triển.
          </p>
          <p className="text-sm text-gray-500">
            Component sẽ bao gồm:
          </p>
          <ul className="text-sm text-gray-500 mt-2 space-y-1">
            <li>• 20 câu hỏi thang điểm Likert (1-5)</li>
            <li>• 2 câu hỏi mở về định hướng nghề nghiệp</li>
            <li>• Đánh giá 4 khía cạnh: Khả năng, Động lực, Cam kết, Tích hợp</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}