import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Users,
  Clock,
  CheckCircle2,
  Play,
  BarChart3,
  Monitor
} from 'lucide-react'
import { ParticipantProgressMonitorWrapper } from '@/components/assessment-sessions/ParticipantProgressMonitorWrapper'
import { getParticipantProgressData, getMonitoringStats } from '../monitoring-actions'
import { db } from '@/lib/db'
import { assessmentSessions } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

interface MonitoringStatsDisplayProps {
  sessionId: string
}

async function MonitoringStatsDisplay({ sessionId }: MonitoringStatsDisplayProps) {
  const stats = await getMonitoringStats(sessionId)

  const statCards = [
    {
      title: 'Tổng thí sinh',
      value: stats.total,
      icon: Users,
      description: 'Số lượng thí sinh đăng ký'
    },
    {
      title: 'Đang thực hiện',
      value: stats.overall.inProgress,
      icon: Play,
      description: 'Thí sinh đang làm đánh giá',
      badge: stats.overall.inProgress > 0 ? 'Hoạt động' : undefined
    },
    {
      title: 'Hoàn thành',
      value: stats.overall.completed,
      icon: CheckCircle2,
      description: 'Hoàn thành tất cả đánh giá',
      badge: stats.overall.completed === stats.total ? 'Xong' : undefined
    },
    {
      title: 'Tiến độ TBEI',
      value: `${stats.tbei.completed}/${stats.total}`,
      icon: BarChart3,
      description: 'Phỏng vấn hành vi'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold">{stat.value}</p>
                    {stat.badge && (
                      <Badge variant={stat.badge === 'Hoạt động' ? 'default' : 'secondary'} className="text-xs">
                        {stat.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

interface ParticipantProgressContainerProps {
  sessionId: string
}

async function ParticipantProgressContainer({ sessionId }: ParticipantProgressContainerProps) {
  const participantData = await getParticipantProgressData(sessionId)

  return (
    <ParticipantProgressMonitorWrapper
      sessionId={sessionId}
      initialParticipants={participantData}
    />
  )
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function MonitoringPage({ params }: PageProps) {
  const { id } = await params
  const user = await requireAuth()

  // Get session information
  const session = await db
    .select()
    .from(assessmentSessions)
    .where(
      and(
        eq(assessmentSessions.id, id),
        eq(assessmentSessions.organizationId, user.organizationId)
      )
    )
    .limit(1)

  if (!session[0]) {
    notFound()
  }

  const sessionData = session[0]
  const isMonitoringActive = ['tbei_in_progress', 'completed'].includes(sessionData.status)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/assessment-sessions/${id}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Quay lại
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Monitor className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-bold">Theo dõi Tiến độ</h1>
              <p className="text-muted-foreground">
                {sessionData.name} • Thời gian thực
              </p>
            </div>
          </div>
        </div>

        <Badge variant={isMonitoringActive ? 'default' : 'secondary'}>
          {isMonitoringActive ? 'Đang hoạt động' : 'Chưa bắt đầu'}
        </Badge>
      </div>

      {/* Status Warning */}
      {!isMonitoringActive && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Phiên đánh giá chưa bắt đầu giai đoạn TBEI
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Chuyển trạng thái phiên sang &quot;Đang phỏng vấn TBEI&quot; để bắt đầu theo dõi thí sinh.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monitoring Stats */}
      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-6 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      }>
        <MonitoringStatsDisplay sessionId={id} />
      </Suspense>

      {/* Progress Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Theo dõi Thí sinh
          </CardTitle>
          <CardDescription>
            Theo dõi tiến độ thời gian thực của từng thí sinh qua các giai đoạn đánh giá
          </CardDescription>
        </CardHeader>
      </Card>

      <Suspense fallback={
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                  <div className="w-20 h-2 bg-muted rounded" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="space-y-2">
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-1.5 bg-muted rounded" />
                      <div className="h-2 bg-muted rounded w-1/3" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      }>
        <ParticipantProgressContainer sessionId={id} />
      </Suspense>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Thao tác Nhanh</CardTitle>
          <CardDescription>
            Các hành động hỗ trợ trong quá trình theo dõi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/assessment-sessions/${id}`}>
                Xem chi tiết phiên
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/assessment-sessions/${id}/edit`}>
                Chỉnh sửa phiên
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/assessment-sessions">
                Danh sách phiên đánh giá
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const revalidate = 0 // Ensure fresh data on each request
export const dynamic = 'force-dynamic' // Force dynamic rendering for real-time data
