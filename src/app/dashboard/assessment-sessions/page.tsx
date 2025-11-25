import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { assessmentSessions, assessmentParticipants, jobTemplates } from '@/db/schema'
import { eq, count } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowLeft,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  PlayCircle,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAssessmentSessionStats } from './actions'
import DeleteButton from '@/components/assessment-sessions/DeleteButton'

export const dynamic = 'force-dynamic'

interface AssessmentSessionsPageProps {
  searchParams: Promise<{
    deleted?: string
    error?: string
    created?: string
  }>
}

const statusConfig = {
  created: {
    label: 'Đã tạo',
    color: 'bg-gray-100 text-gray-800',
    icon: Clock
  },
  case_study_in_progress: {
    label: 'Đang thảo luận',
    color: 'bg-blue-100 text-blue-800',
    icon: PlayCircle
  },
  case_study_completed: {
    label: 'Hoàn thành thảo luận',
    color: 'bg-yellow-100 text-yellow-800',
    icon: AlertTriangle
  },
  tbei_in_progress: {
    label: 'Đang phỏng vấn TBEI',
    color: 'bg-purple-100 text-purple-800',
    icon: PlayCircle
  },
  completed: {
    label: 'Hoàn thành',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  }
} as const

export default async function AssessmentSessionsPage({ searchParams }: AssessmentSessionsPageProps) {
  const user = await requireAuth()
  const params = await searchParams

  // Fetch assessment sessions with related data
  const sessionsWithData = await db
    .select({
      id: assessmentSessions.id,
      name: assessmentSessions.name,
      status: assessmentSessions.status,
      createdAt: assessmentSessions.createdAt,
      completedAt: assessmentSessions.completedAt,
      jobTemplate: {
        id: jobTemplates.id,
        title: jobTemplates.title
      }
    })
    .from(assessmentSessions)
    .leftJoin(jobTemplates, eq(assessmentSessions.jobTemplateId, jobTemplates.id))
    .where(eq(assessmentSessions.organizationId, user.organizationId))
    .orderBy(assessmentSessions.createdAt)

  // Get participant counts for each session
  const sessionsWithCounts = await Promise.all(
    sessionsWithData.map(async (session) => {
      const [participantCount] = await db
        .select({ count: count() })
        .from(assessmentParticipants)
        .where(eq(assessmentParticipants.sessionId, session.id))

      return {
        ...session,
        participantCount: participantCount?.count || 0
      }
    })
  )

  // Get statistics
  const stats = await getAssessmentSessionStats(user.organizationId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="lg:hidden">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Assessment Center</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Quản lý các phiên đánh giá năng lực theo mô hình Assessment Center
                </p>
              </div>
            </div>

            <Link href="/dashboard/assessment-sessions/create">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Tạo phiên mới
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error messages */}
        {params.created && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Phiên đánh giá đã được tạo thành công!
            </AlertDescription>
          </Alert>
        )}

        {params.deleted && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Phiên đánh giá đã được xóa thành công!
            </AlertDescription>
          </Alert>
        )}

        {params.error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {decodeURIComponent(params.error)}
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tổng phiên</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Đã tạo</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.created}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <PlayCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Đang diễn ra</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Hoàn thành</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions Grid */}
        {sessionsWithCounts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Chưa có phiên đánh giá nào
              </h3>
              <p className="text-gray-600 mb-6">
                Bắt đầu bằng cách tạo phiên Assessment Center đầu tiên của bạn
              </p>
              <Link href="/dashboard/assessment-sessions/create">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo phiên mới
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessionsWithCounts.map((session) => {
              const statusInfo = statusConfig[session.status as keyof typeof statusConfig] || statusConfig.created
              const StatusIcon = statusInfo.icon

              return (
                <Card key={session.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                          {session.name}
                        </CardTitle>
                        {session.jobTemplate && (
                          <p className="text-sm text-gray-600 mt-1 truncate">
                            {session.jobTemplate.title}
                          </p>
                        )}
                      </div>
                      <Badge className={`ml-2 ${statusInfo.color} flex items-center gap-1`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {session.participantCount} thí sinh
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(session.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>

                    {session.completedAt && (
                      <div className="text-xs text-gray-500 mb-4">
                        Hoàn thành: {new Date(session.completedAt).toLocaleDateString('vi-VN')}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2">
                      <Link href={`/dashboard/assessment-sessions/${session.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-1" />
                          Xem
                        </Button>
                      </Link>

                      <Link href={`/dashboard/assessment-sessions/${session.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>

                      {session.status === 'created' && (
                        <DeleteButton sessionId={session.id} sessionName={session.name} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}