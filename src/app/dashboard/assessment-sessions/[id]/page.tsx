import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  assessmentSessions,
  assessmentParticipants,
  jobTemplates,
  caseStudyTranscripts,
  caseStudyEvaluations,
  tbeiResponses,
  hipoAssessments,
  quizResponses
} from '@/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  PlayCircle,
  AlertTriangle,
  FileText,
  MessageSquare,
  BarChart3,
  Mail,
  Key,
  Monitor
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { generateInterviewTokens, sendInterviewInvitations, startCaseStudy } from './actions'
import DeleteButton from '@/components/assessment-sessions/DeleteButton'

export const dynamic = 'force-dynamic'

interface AssessmentSessionViewProps {
  params: Promise<{
    id: string
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

export default async function AssessmentSessionViewPage({ params }: AssessmentSessionViewProps) {
  const resolvedParams = await params
  const user = await requireAuth()

  // Fetch session with job template
  const sessionWithTemplate = await db
    .select({
      id: assessmentSessions.id,
      name: assessmentSessions.name,
      status: assessmentSessions.status,
      createdAt: assessmentSessions.createdAt,
      completedAt: assessmentSessions.completedAt,
      organizationId: assessmentSessions.organizationId,
      jobTemplate: {
        id: jobTemplates.id,
        title: jobTemplates.title,
        description: jobTemplates.description
      }
    })
    .from(assessmentSessions)
    .leftJoin(jobTemplates, eq(assessmentSessions.jobTemplateId, jobTemplates.id))
    .where(
      and(
        eq(assessmentSessions.id, resolvedParams.id),
        eq(assessmentSessions.organizationId, user.organizationId)
      )
    )
    .limit(1)

  if (!sessionWithTemplate[0]) {
    notFound()
  }

  const session = sessionWithTemplate[0]

  // Fetch participants
  const participants = await db
    .select()
    .from(assessmentParticipants)
    .where(eq(assessmentParticipants.sessionId, resolvedParams.id))
    .orderBy(assessmentParticipants.roleCode)

  // Get statistics for this session
  const [
    transcriptCount,
    evaluationCount,
    tbeiCount,
    hipoCount,
    quizCount
  ] = await Promise.all([
    db.select({ count: count() })
      .from(caseStudyTranscripts)
      .where(eq(caseStudyTranscripts.sessionId, resolvedParams.id)),

    db.select({ count: count() })
      .from(caseStudyEvaluations)
      .where(eq(caseStudyEvaluations.sessionId, resolvedParams.id)),

    db.select({ count: count() })
      .from(tbeiResponses)
      .where(
        and(
          eq(tbeiResponses.participantId, participants[0]?.id || ''),
          // This is a simplified count - in reality we'd need to join properly
        )
      ),

    db.select({ count: count() })
      .from(hipoAssessments)
      .where(
        and(
          eq(hipoAssessments.participantId, participants[0]?.id || '')
        )
      ),

    db.select({ count: count() })
      .from(quizResponses)
      .where(
        and(
          eq(quizResponses.participantId, participants[0]?.id || '')
        )
      )
  ])

  const statusInfo = statusConfig[session.status as keyof typeof statusConfig] || statusConfig.created
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/assessment-sessions">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Quay lại
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{session.name}</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <Badge className={`${statusInfo.color} flex items-center gap-1`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusInfo.label}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {participants.length} thí sinh
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Monitoring Button - Show when TBEI is active */}
              {(session.status === 'tbei_in_progress' || session.status === 'completed') && (
                <Link href={`/dashboard/assessment-sessions/${session.id}/monitor`}>
                  <Button variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
                    <Monitor className="h-4 w-4 mr-2" />
                    Theo dõi tiến độ
                  </Button>
                </Link>
              )}

              <Link href={`/dashboard/assessment-sessions/${session.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </Button>
              </Link>

              {session.status === 'created' && (
                <DeleteButton sessionId={session.id} sessionName={session.name} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Session Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Thông tin phiên
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tên phiên</label>
                    <p className="mt-1 text-gray-900">{session.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Trạng thái</label>
                    <div className="mt-1">
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Ngày tạo</label>
                    <p className="mt-1 text-gray-900 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(session.createdAt).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  {session.completedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Ngày hoàn thành</label>
                      <p className="mt-1 text-gray-900 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                        {new Date(session.completedAt).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {session.jobTemplate && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Mẫu công việc</label>
                    <p className="mt-1 text-gray-900">{session.jobTemplate.title}</p>
                    {session.jobTemplate.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {session.jobTemplate.description}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Participants List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Danh sách thí sinh ({participants.length})
                  </CardTitle>

                  {/* Interview Management Actions */}
                  {session.status === 'case_study_completed' && (
                    <div className="flex items-center space-x-2">
                      <form action={generateInterviewTokens.bind(null, session.id)}>
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={participants.every(p => p.interviewToken)}
                        >
                          <Key className="h-4 w-4 mr-1" />
                          {participants.some(p => !p.interviewToken) ? 'Tạo link phỏng vấn' : 'Đã tạo link'}
                        </Button>
                      </form>

                      {participants.every(p => p.interviewToken) && (
                        <form action={sendInterviewInvitations.bind(null, session.id)}>
                          <Button
                            type="submit"
                            size="sm"
                            variant="default"
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Gửi email mời
                          </Button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-blue-600">{participant.roleCode}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{participant.name}</p>
                          <p className="text-sm text-gray-600">{participant.roleName}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-600 flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {participant.email}
                          </p>
                          {participant.interviewToken && (
                            <div className="text-xs text-blue-600 mt-1">
                              <Link
                                href={`/interview/${participant.interviewToken}`}
                                className="flex items-center hover:underline"
                                target="_blank"
                              >
                                <Key className="h-3 w-3 mr-1" />
                                Link phỏng vấn
                              </Link>
                            </div>
                          )}
                          <div className="flex space-x-2 mt-1">
                            <Badge
                              variant="outline"
                              className={
                                participant.tbeiStatus === 'completed'
                                  ? 'border-green-200 text-green-700'
                                  : participant.tbeiStatus === 'in_progress'
                                  ? 'border-blue-200 text-blue-700'
                                  : 'border-gray-200 text-gray-700'
                              }
                            >
                              TBEI
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                participant.hipoStatus === 'completed'
                                  ? 'border-green-200 text-green-700'
                                  : participant.hipoStatus === 'in_progress'
                                  ? 'border-blue-200 text-blue-700'
                                  : 'border-gray-200 text-gray-700'
                              }
                            >
                              HiPo
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                participant.quizStatus === 'completed'
                                  ? 'border-green-200 text-green-700'
                                  : participant.quizStatus === 'in_progress'
                                  ? 'border-blue-200 text-blue-700'
                                  : 'border-gray-200 text-gray-700'
                              }
                            >
                              Quiz
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Thao tác nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form action={startCaseStudy.bind(null, session.id)}>
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full justify-start"
                    disabled={session.status !== 'created'}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Bắt đầu case study
                  </Button>
                </form>
                <Link
                  href={`/dashboard/assessment-sessions/${session.id}/case-study`}
                  className={session.status === 'case_study_in_progress' ? '' : 'pointer-events-none'}
                >
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled={session.status !== 'case_study_in_progress'}
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Theo dõi Case Study (Live)
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={session.status !== 'case_study_completed'}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Mở TBEI interview
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Xuất báo cáo
                </Button>
              </CardContent>
            </Card>

            {/* Assessment Phases */}
            <Card>
              <CardHeader>
                <CardTitle>Các giai đoạn đánh giá</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    session.status === 'case_study_in_progress' || session.status === 'case_study_completed' ||
                    session.status === 'tbei_in_progress' || session.status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`} />
                  <span>Case Study (120 phút)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    session.status === 'tbei_in_progress' || session.status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`} />
                  <span>TBEI Interview (15 phút/người)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    session.status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`} />
                  <span>HiPo Questionnaire (20 phút)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    session.status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`} />
                  <span>Quiz (15 phút)</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}