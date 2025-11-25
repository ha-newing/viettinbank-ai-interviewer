import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { assessmentSessions, assessmentParticipants, jobTemplates } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CaseStudyRecordingInterface from '@/components/case-study/CaseStudyRecordingInterface'

export const dynamic = 'force-dynamic'

interface CaseStudyPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const resolvedParams = await params
  const user = await requireAuth()

  // Fetch session with job template and organization check
  const sessionWithTemplate = await db
    .select({
      id: assessmentSessions.id,
      name: assessmentSessions.name,
      status: assessmentSessions.status,
      createdAt: assessmentSessions.createdAt,
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
    .select({
      id: assessmentParticipants.id,
      name: assessmentParticipants.name,
      email: assessmentParticipants.email,
      roleCode: assessmentParticipants.roleCode,
      roleName: assessmentParticipants.roleName,
      speakerLabel: assessmentParticipants.speakerLabel
    })
    .from(assessmentParticipants)
    .where(eq(assessmentParticipants.sessionId, resolvedParams.id))
    .orderBy(assessmentParticipants.roleCode)

  // Check if session is in correct state for case study
  const canStartCaseStudy = session.status === 'created' || session.status === 'case_study_in_progress'
  const isInProgress = session.status === 'case_study_in_progress'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Link href={`/dashboard/assessment-sessions/${session.id}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Quay lại phiên
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Thảo luận Case Study
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {session.name} • {participants.length} thí sinh • {session.jobTemplate?.title}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {!canStartCaseStudy && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded">
                  Phiên không thể bắt đầu case study
                </div>
              )}
              {isInProgress && (
                <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded animate-pulse">
                  🔴 Đang ghi âm
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!canStartCaseStudy ? (
          /* Error State */
          <div className="bg-white rounded-lg p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Không thể bắt đầu Case Study
            </h3>
            <p className="text-gray-600 mb-6">
              Phiên phải ở trạng thái &quot;Đã tạo&quot; hoặc &quot;Đang thảo luận case study&quot; để có thể bắt đầu.
              Trạng thái hiện tại: <strong>{session.status}</strong>
            </p>
            <Link href={`/dashboard/assessment-sessions/${session.id}`}>
              <Button>Quay lại phiên đánh giá</Button>
            </Link>
          </div>
        ) : (
          /* Recording Interface */
          <CaseStudyRecordingInterface
            session={{
              id: session.id,
              name: session.name,
              status: session.status,
              createdAt: session.createdAt
            }}
            participants={participants}
            jobTemplate={session.jobTemplate}
          />
        )}
      </div>
    </div>
  )
}