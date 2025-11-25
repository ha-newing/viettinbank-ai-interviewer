'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckSquare } from 'lucide-react'

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

export default function KnowledgeQuiz({
  participant,
  onComplete,
  timeRemaining
}: KnowledgeQuizProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <CheckSquare className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            Knowledge Quiz
          </h2>
        </div>
        <p className="text-gray-600">Kiểm tra kiến thức chuyên môn</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Đang phát triển</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Knowledge Quiz đang được phát triển.
          </p>
          <p className="text-sm text-gray-500">
            Component sẽ bao gồm:
          </p>
          <ul className="text-sm text-gray-500 mt-2 space-y-1">
            <li>• Câu hỏi trắc nghiệm</li>
            <li>• Kiến thức ngành ngân hàng</li>
            <li>• Quy định và chính sách VietinBank</li>
            <li>• Tự động nộp khi hết thời gian</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}