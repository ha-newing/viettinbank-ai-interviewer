import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { assessmentParticipants, assessmentSessions, jobTemplates, organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import TbeiAssessmentConduct from '@/components/tbei/TbeiAssessmentConduct'

export const dynamic = 'force-dynamic'

interface TbeiPageProps {
  params: Promise<{ token: string }>
}

export default async function TbeiPage({ params }: TbeiPageProps) {
  const { token } = await params

  if (!token) {
    notFound()
  }

  // Find TBEI assessment participant by token
  const tbeiResult = await db
    .select({
      participant: assessmentParticipants,
      session: assessmentSessions,
      jobTemplate: jobTemplates,
      organization: organizations,
    })
    .from(assessmentParticipants)
    .leftJoin(assessmentSessions, eq(assessmentParticipants.sessionId, assessmentSessions.id))
    .leftJoin(jobTemplates, eq(assessmentSessions.jobTemplateId, jobTemplates.id))
    .leftJoin(organizations, eq(assessmentSessions.organizationId, organizations.id))
    .where(eq(assessmentParticipants.interviewToken, token))
    .limit(1)

  if (!tbeiResult[0]) {
    notFound()
  }

  const { participant, session, jobTemplate, organization } = tbeiResult[0]

  // Validate that session exists (required for TBEI)
  if (!session) {
    notFound()
  }

  // Check if all assessments are completed
  const allCompleted =
    participant.tbeiStatus === 'completed' &&
    participant.hipoStatus === 'completed' &&
    participant.quizStatus === 'completed'

  if (allCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-green-500 text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Tất cả đánh giá đã hoàn thành!
          </h1>
          <p className="text-gray-600 mb-6">
            Cảm ơn bạn đã hoàn thành đánh giá Assessment Center của VietinBank.
          </p>
          <p className="text-sm text-gray-500">
            Kết quả sẽ được thông báo qua email trong thời gian sớm nhất.
          </p>
        </div>
      </div>
    )
  }

  return (
    <TbeiAssessmentConduct
      participant={participant}
      session={session}
      jobTemplate={jobTemplate}
      organization={organization}
      token={token}
    />
  )
}