'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  User,
  Brain,
  BookOpen,
  Target,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface ParticipantProgress {
  id: string
  name: string
  email: string
  roleCode: string
  roleName: string
  interviewToken: string | null
  tbeiStatus: 'pending' | 'in_progress' | 'completed'
  hipoStatus: 'pending' | 'in_progress' | 'completed'
  quizStatus: 'pending' | 'in_progress' | 'completed'
  emailSentAt: string | null
  // Additional progress data
  tbeiProgress?: {
    competenciesCompleted: number
    totalCompetencies: number
    lastActivity?: string
    evaluationStatus?: 'pending' | 'in_progress' | 'completed'
  }
  hipoProgress?: {
    sectionsCompleted: number
    totalSections: number
    score?: number
    lastActivity?: string
  }
  quizProgress?: {
    questionsAnswered: number
    totalQuestions: number
    score?: number
    timeRemaining?: number
    lastActivity?: string
  }
}

interface Props {
  sessionId: string
  participants: ParticipantProgress[]
  onRefresh?: () => void
  refreshing?: boolean
}

const statusConfig = {
  pending: { label: 'Chờ bắt đầu', color: 'secondary', icon: Clock },
  in_progress: { label: 'Đang thực hiện', color: 'default', icon: Play },
  completed: { label: 'Hoàn thành', color: 'success', icon: CheckCircle2 }
} as const

const phaseConfig = {
  tbei: {
    title: 'TBEI Interview',
    icon: User,
    duration: '15 phút',
    description: 'Phỏng vấn hành vi'
  },
  hipo: {
    title: 'HiPo Assessment',
    icon: Brain,
    duration: '10 phút',
    description: 'Đánh giá tiềm năng'
  },
  quiz: {
    title: 'Knowledge Quiz',
    icon: BookOpen,
    duration: '15 phút',
    description: 'Kiểm tra kiến thức'
  }
} as const

export function ParticipantProgressMonitor({ sessionId, participants, onRefresh, refreshing }: Props) {
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return

    const interval = setInterval(() => {
      onRefresh()
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, onRefresh])

  const getOverallProgress = (participant: ParticipantProgress) => {
    const phases = [participant.tbeiStatus, participant.hipoStatus, participant.quizStatus]
    const completed = phases.filter(status => status === 'completed').length
    return (completed / phases.length) * 100
  }

  const getPhaseProgress = (participant: ParticipantProgress, phase: keyof typeof phaseConfig) => {
    const status = participant[`${phase}Status` as keyof ParticipantProgress] as string

    if (status === 'completed') return 100
    if (status === 'pending') return 0

    // For in_progress, check detailed progress if available
    const progressData = participant[`${phase}Progress` as keyof ParticipantProgress] as any
    if (!progressData) return 25 // Default progress for in_progress

    if (phase === 'tbei') {
      return (progressData.competenciesCompleted / progressData.totalCompetencies) * 100
    } else if (phase === 'hipo') {
      return (progressData.sectionsCompleted / progressData.totalSections) * 100
    } else if (phase === 'quiz') {
      return (progressData.questionsAnswered / progressData.totalQuestions) * 100
    }

    return 25
  }

  const getTimeRemaining = (participant: ParticipantProgress, phase: keyof typeof phaseConfig) => {
    if (phase === 'quiz' && participant.quizProgress?.timeRemaining) {
      const minutes = Math.floor(participant.quizProgress.timeRemaining / 60)
      const seconds = participant.quizProgress.timeRemaining % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
    return null
  }

  const getStatusBadge = (status: 'pending' | 'in_progress' | 'completed') => {
    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <Badge variant={config.color === 'success' ? 'default' : config.color as any} className={
        config.color === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''
      }>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const participantsInProgress = participants.filter(p =>
    p.tbeiStatus === 'in_progress' || p.hipoStatus === 'in_progress' || p.quizStatus === 'in_progress'
  )

  const completedParticipants = participants.filter(p =>
    p.tbeiStatus === 'completed' && p.hipoStatus === 'completed' && p.quizStatus === 'completed'
  ).length

  return (
    <div className="space-y-6">
      {/* Header with Summary Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Theo dõi Tiến độ Thí sinh</h3>
          <p className="text-sm text-muted-foreground">
            {completedParticipants}/{participants.length} thí sinh hoàn thành •
            {participantsInProgress.length} đang thực hiện
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            {autoRefresh ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            Tự động cập nhật
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Cập nhật
          </Button>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tiến độ chung</span>
              <span>{Math.round((completedParticipants / participants.length) * 100)}%</span>
            </div>
            <Progress value={(completedParticipants / participants.length) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Active Participants Alert */}
      {participantsInProgress.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {participantsInProgress.length} thí sinh đang thực hiện đánh giá
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participants List */}
      <div className="grid gap-4">
        {participants.map((participant) => {
          const overallProgress = getOverallProgress(participant)
          const isSelected = selectedParticipant === participant.id

          return (
            <Card
              key={participant.id}
              className={`transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}
            >
              <CardHeader
                className="pb-3 cursor-pointer"
                onClick={() => setSelectedParticipant(isSelected ? null : participant.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {participant.roleCode}
                    </div>
                    <div>
                      <CardTitle className="text-base">{participant.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {participant.roleName} • {participant.email}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {Math.round(overallProgress)}%
                    </span>
                    <Progress value={overallProgress} className="w-20 h-2" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Phase Progress */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(Object.keys(phaseConfig) as Array<keyof typeof phaseConfig>).map((phase) => {
                    const config = phaseConfig[phase]
                    const Icon = config.icon
                    const status = participant[`${phase}Status` as keyof ParticipantProgress] as string
                    const progress = getPhaseProgress(participant, phase)
                    const timeRemaining = getTimeRemaining(participant, phase)

                    return (
                      <div key={phase} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span className="text-sm font-medium">{config.title}</span>
                          </div>
                          {getStatusBadge(status as any)}
                        </div>

                        <Progress value={progress} className="h-1.5" />

                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{config.duration}</span>
                          {timeRemaining && (
                            <span className="text-orange-600 font-medium">
                              Còn lại: {timeRemaining}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Detailed Progress (when expanded) */}
                {isSelected && (
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="text-sm font-medium">Chi tiết tiến độ</h4>

                    {/* TBEI Details */}
                    {participant.tbeiProgress && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>TBEI - Năng lực hoàn thành:</span>
                          <span>{participant.tbeiProgress.competenciesCompleted}/{participant.tbeiProgress.totalCompetencies}</span>
                        </div>
                        {participant.tbeiProgress.evaluationStatus && (
                          <div className="flex justify-between text-sm">
                            <span>Trạng thái đánh giá AI:</span>
                            {getStatusBadge(participant.tbeiProgress.evaluationStatus)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* HiPo Details */}
                    {participant.hipoProgress && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>HiPo - Phần hoàn thành:</span>
                          <span>{participant.hipoProgress.sectionsCompleted}/{participant.hipoProgress.totalSections}</span>
                        </div>
                        {participant.hipoProgress.score && (
                          <div className="flex justify-between text-sm">
                            <span>Điểm số:</span>
                            <span className="font-medium">{participant.hipoProgress.score}/100</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quiz Details */}
                    {participant.quizProgress && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Quiz - Câu hỏi đã trả lời:</span>
                          <span>{participant.quizProgress.questionsAnswered}/{participant.quizProgress.totalQuestions}</span>
                        </div>
                        {participant.quizProgress.score !== undefined && (
                          <div className="flex justify-between text-sm">
                            <span>Điểm số:</span>
                            <span className="font-medium">{participant.quizProgress.score}/{participant.quizProgress.totalQuestions}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      {participant.interviewToken && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/interview/${participant.interviewToken}`} target="_blank">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Xem giao diện thí sinh
                          </Link>
                        </Button>
                      )}

                      {participant.tbeiStatus === 'completed' && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/assessment-sessions/${sessionId}/participants/${participant.id}/results`}>
                            <Target className="w-4 h-4 mr-1" />
                            Xem kết quả
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {participants.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Chưa có thí sinh nào trong phiên đánh giá này.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}