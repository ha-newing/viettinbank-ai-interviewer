'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Clock,
  FileText,
  Brain,
  CheckSquare,
  ArrowRight,
  Building,
  User,
  CalendarDays
} from 'lucide-react'
import Link from 'next/link'

interface TbeiAssessmentLandingProps {
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

export default function TbeiAssessmentLanding({
  participant,
  session,
  jobTemplate,
  organization,
  token
}: TbeiAssessmentLandingProps) {
  // Get next assessment to complete
  const getNextAssessment = () => {
    if (participant.tbeiStatus === 'pending') return 'tbei'
    if (participant.hipoStatus === 'pending') return 'hipo'
    if (participant.quizStatus === 'pending') return 'quiz'
    return null
  }

  const nextAssessment = getNextAssessment()

  const assessments = [
    {
      id: 'tbei',
      title: 'TBEI Interview',
      description: 'Phỏng vấn hành vi có mục tiêu - 2 năng lực cốt lõi',
      duration: '15 phút',
      icon: Users,
      status: participant.tbeiStatus,
      details: [
        'Chuyển đổi số (Digital Transformation)',
        'Phát triển đội ngũ (Talent Development)',
        'Chọn và trả lời 1 trong 3 câu hỏi cho mỗi năng lực',
        'Sử dụng phương pháp STAR trong câu trả lời'
      ]
    },
    {
      id: 'hipo',
      title: 'HiPo Assessment',
      description: 'Đánh giá tiềm năng lãnh đạo cao',
      duration: '10 phút',
      icon: Brain,
      status: participant.hipoStatus,
      details: [
        '20 câu hỏi thang điểm Likert (1-5)',
        '2 câu hỏi mở về định hướng nghề nghiệp',
        'Đánh giá 4 khía cạnh: Khả năng, Động lực, Cam kết, Tích hợp'
      ]
    },
    {
      id: 'quiz',
      title: 'Knowledge Quiz',
      description: 'Kiểm tra kiến thức chuyên môn',
      duration: '15 phút',
      icon: CheckSquare,
      status: participant.quizStatus,
      details: [
        'Câu hỏi trắc nghiệm',
        'Kiến thức ngành ngân hàng',
        'Quy định và chính sách VietinBank'
      ]
    }
  ]

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                VietinBank Assessment Center
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Đánh giá năng lực cá nhân - Phần 2: Đánh giá riêng lẻ
              </p>
            </div>
            {organization && (
              <div className="flex items-center text-gray-600">
                <Building className="h-4 w-4 mr-1" />
                <span className="text-sm">{organization.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Welcome Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Chào mừng, {participant.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Thông tin phiên đánh giá
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Vai trò:</span>
                      <p className="text-blue-800">{participant.roleName} ({participant.roleCode})</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Phiên:</span>
                      <p className="text-blue-800">{session.name}</p>
                    </div>
                    {jobTemplate && (
                      <div className="md:col-span-2">
                        <span className="text-blue-700 font-medium">Vị trí ứng tuyển:</span>
                        <p className="text-blue-800">{jobTemplate.title}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">📋 Hướng dẫn quan trọng</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Hoàn thành tất cả 3 phần đánh giá theo thứ tự</li>
                    <li>• Một khi bắt đầu, không thể dừng giữa chừng</li>
                    <li>• Đảm bảo kết nối internet ổn định</li>
                    <li>• Trả lời thật và cụ thể nhất có thể</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Assessment List */}
            <Card>
              <CardHeader>
                <CardTitle>Các phần đánh giá</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assessments.map((assessment, index) => {
                    const Icon = assessment.icon
                    const isNext = assessment.id === nextAssessment
                    const isCompleted = assessment.status === 'completed'
                    const isInProgress = assessment.status === 'in_progress'

                    return (
                      <div
                        key={assessment.id}
                        className={`border rounded-lg p-4 transition-all ${
                          isNext
                            ? 'border-blue-300 bg-blue-50 shadow-md'
                            : isCompleted
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className={`p-2 rounded-lg ${
                              isCompleted
                                ? 'bg-green-100'
                                : isNext
                                ? 'bg-blue-100'
                                : 'bg-gray-100'
                            }`}>
                              <Icon className={`h-5 w-5 ${
                                isCompleted
                                  ? 'text-green-600'
                                  : isNext
                                  ? 'text-blue-600'
                                  : 'text-gray-600'
                              }`} />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-semibold text-gray-900">
                                  {index + 1}. {assessment.title}
                                </h3>
                                <Badge className={getStatusColor(assessment.status)}>
                                  {getStatusText(assessment.status)}
                                </Badge>
                              </div>

                              <p className="text-sm text-gray-600 mb-2">
                                {assessment.description}
                              </p>

                              <div className="flex items-center text-xs text-gray-500 mb-3">
                                <Clock className="h-3 w-3 mr-1" />
                                Thời gian: {assessment.duration}
                              </div>

                              <ul className="text-xs text-gray-600 space-y-1">
                                {assessment.details.map((detail, i) => (
                                  <li key={i} className="flex items-start">
                                    <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                    {detail}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="ml-4">
                            {isCompleted ? (
                              <div className="text-green-600 text-2xl">✓</div>
                            ) : isNext ? (
                              <Link href={`/interview/${token}/tbei`}>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                  <ArrowRight className="h-4 w-4 mr-1" />
                                  Bắt đầu
                                </Button>
                              </Link>
                            ) : isInProgress ? (
                              <Link href={`/interview/${token}/tbei`}>
                                <Button size="sm" variant="outline" className="border-blue-300 text-blue-600">
                                  <ArrowRight className="h-4 w-4 mr-1" />
                                  Tiếp tục
                                </Button>
                              </Link>
                            ) : (
                              <Button size="sm" variant="ghost" disabled>
                                Chờ thứ tự
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Tiến độ hoàn thành
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assessments.map((assessment) => {
                    const isCompleted = assessment.status === 'completed'
                    return (
                      <div key={assessment.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{assessment.title}</span>
                        <div className={`w-3 h-3 rounded-full ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {assessments.filter(a => a.status === 'completed').length}/3
                    </div>
                    <div className="text-xs text-gray-500">Phần đã hoàn thành</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarDays className="h-5 w-5 mr-2" />
                  Chi tiết phiên
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Ngày tạo</span>
                  <p className="text-sm text-gray-900">
                    {new Date(session.createdAt).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Trạng thái phiên</span>
                  <p className="text-sm text-gray-900 capitalize">{session.status.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Email</span>
                  <p className="text-sm text-gray-900">{participant.email}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}