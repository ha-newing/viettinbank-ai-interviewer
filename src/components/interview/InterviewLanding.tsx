'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Camera,
  Mic,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Monitor,
  Headphones,
  Wifi,
  User,
  Building
} from 'lucide-react'

interface Interview {
  id: string
  candidateName: string
  candidateEmail: string
  status: string
  interviewLinkExpiresAt: Date
  createdAt: Date
}

interface JobTemplate {
  id: string
  title: string
  description: string | null
  interviewDuration: number
  impressionWeight: number
  taskPerformanceWeight: number
  logicalThinkingWeight: number
  researchAbilityWeight: number
  communicationWeight: number
}

interface Organization {
  id: string
  name: string
}

interface InterviewLandingProps {
  interview: Interview
  jobTemplate: JobTemplate | null
  organization: Organization | null
  token: string
}

export default function InterviewLanding({
  interview,
  jobTemplate,
  organization,
  token
}: InterviewLandingProps) {
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)
  const [microphonePermission, setMicrophonePermission] = useState<boolean | null>(null)
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false)
  const [canStartInterview, setCanStartInterview] = useState(false)

  const checkPermissions = async () => {
    setIsCheckingPermissions(true)

    try {
      // Check camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      setCameraPermission(true)
      setMicrophonePermission(true)
      setCanStartInterview(true)

      // Stop the stream immediately after checking
      stream.getTracks().forEach(track => track.stop())
    } catch (error) {
      console.error('Permission error:', error)
      setCameraPermission(false)
      setMicrophonePermission(false)
      setCanStartInterview(false)
    }

    setIsCheckingPermissions(false)
  }

  const startInterview = () => {
    if (canStartInterview) {
      window.location.href = `/interview/${token}/conduct`
    }
  }

  const getPermissionStatus = (permission: boolean | null) => {
    if (permission === null) {
      return <Badge variant="outline">Chưa kiểm tra</Badge>
    } else if (permission) {
      return <Badge className="bg-green-100 text-green-800">Đã cấp phép</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">Bị từ chối</Badge>
    }
  }

  const getPermissionIcon = (permission: boolean | null) => {
    if (permission === null) {
      return <AlertCircle className="h-4 w-4 text-gray-500" />
    } else if (permission) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-blue-600 text-4xl mb-4">🤖</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            VietinBank AI Interviewer
          </h1>
          <p className="text-lg text-gray-600">
            Chào mừng bạn đến với phỏng vấn AI thông minh
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Interview Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Thông tin phỏng vấn</span>
                </CardTitle>
                <CardDescription>
                  Chi tiết về cuộc phỏng vấn của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">Ứng viên:</span>
                    <p className="text-gray-600">{interview.candidateName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Email:</span>
                    <p className="text-gray-600">{interview.candidateEmail}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Vị trí:</span>
                    <p className="text-gray-600">{jobTemplate?.title || 'Không xác định'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Tổ chức:</span>
                    <p className="text-gray-600">{organization?.name || 'Không xác định'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Thời gian:</span>
                    <p className="text-gray-600 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {jobTemplate?.interviewDuration || 15} phút
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Hạn cuối:</span>
                    <p className="text-gray-600">
                      {interview.interviewLinkExpiresAt.toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                {jobTemplate?.description && (
                  <div className="pt-4 border-t border-gray-200">
                    <span className="font-medium text-gray-900">Mô tả công việc:</span>
                    <p className="text-gray-600 mt-1">{jobTemplate.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Check */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="h-5 w-5" />
                  <span>Kiểm tra hệ thống</span>
                </CardTitle>
                <CardDescription>
                  Đảm bảo thiết bị của bạn sẵn sàng cho phỏng vấn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getPermissionIcon(cameraPermission)}
                      <Camera className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Camera</span>
                    </div>
                    {getPermissionStatus(cameraPermission)}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getPermissionIcon(microphonePermission)}
                      <Mic className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Microphone</span>
                    </div>
                    {getPermissionStatus(microphonePermission)}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <Wifi className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Kết nối Internet</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Đã kết nối</Badge>
                  </div>
                </div>

                <Button
                  onClick={checkPermissions}
                  disabled={isCheckingPermissions}
                  className="w-full"
                  variant="outline"
                >
                  {isCheckingPermissions ? (
                    'Đang kiểm tra...'
                  ) : (
                    'Kiểm tra Camera & Microphone'
                  )}
                </Button>

                {(cameraPermission === false || microphonePermission === false) && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">
                      Vui lòng cấp quyền truy cập Camera và Microphone để tiếp tục phỏng vấn.
                      Bạn có thể thử refresh trang và cho phép quyền truy cập.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Start Interview */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Sẵn sàng bắt đầu?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Hãy chắc chắn bạn đã đọc kỹ hướng dẫn và kiểm tra thiết bị
                  </p>
                  <Button
                    onClick={startInterview}
                    disabled={!canStartInterview}
                    className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg"
                    size="lg"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Bắt đầu phỏng vấn
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Headphones className="h-5 w-5" />
                  <span>Hướng dẫn</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">🎯 Chuẩn bị</h4>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• Tìm nơi yên tĩnh, ánh sáng tốt</li>
                    <li>• Kiểm tra camera và microphone</li>
                    <li>• Đảm bảo kết nối internet ổn định</li>
                    <li>• Chuẩn bị tinh thần thoải mái</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">⚡ Trong phỏng vấn</h4>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• Đọc kỹ câu hỏi trước khi trả lời</li>
                    <li>• Nhìn thẳng vào camera khi nói</li>
                    <li>• Trả lời rõ ràng và tự tin</li>
                    <li>• Tận dụng thời gian suy nghĩ</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">⏱️ Thời gian</h4>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• Mỗi câu hỏi có thời gian giới hạn</li>
                    <li>• Có thể tạm dừng giữa các câu hỏi</li>
                    <li>• Tổng thời gian: {jobTemplate?.interviewDuration || 15} phút</li>
                    <li>• Hệ thống sẽ tự động lưu câu trả lời</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">📊 Đánh giá</h4>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p>• Ấn tượng cá nhân</p>
                    <p>• Hiệu suất nhiệm vụ</p>
                    <p>• Tư duy logic</p>
                    <p>• Khả năng nghiên cứu</p>
                    <p>• Giao tiếp</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    <strong>Lưu ý:</strong> Phỏng vấn được ghi lại để phục vụ đánh giá.
                    Dữ liệu được bảo mật theo chính sách riêng tư.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}