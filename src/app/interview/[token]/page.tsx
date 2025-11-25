import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { interviews, jobTemplates, organizations, assessmentParticipants, assessmentSessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import InterviewLanding from '@/components/interview/InterviewLanding'
import TbeiAssessmentLanding from '@/components/tbei/TbeiAssessmentLanding'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface InterviewPageProps {
  params: Promise<{ token: string }>
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { token } = await params

  if (!token) {
    notFound()
  }

  // First, try to find a regular interview by token
  const interviewResult = await db
    .select({
      interview: interviews,
      jobTemplate: jobTemplates,
      organization: organizations,
    })
    .from(interviews)
    .leftJoin(jobTemplates, eq(interviews.jobTemplateId, jobTemplates.id))
    .leftJoin(organizations, eq(interviews.organizationId, organizations.id))
    .where(eq(interviews.interviewLinkToken, token))
    .limit(1)

  // If found, handle regular interview
  if (interviewResult[0]) {
    return handleRegularInterview(interviewResult[0], token)
  }

  // If not found, try to find a TBEI assessment participant by token
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

  return handleTbeiAssessment(tbeiResult[0], token)
}

// Handle regular interview system
async function handleRegularInterview(result: any, token: string) {
  const { interview, jobTemplate, organization } = result

  // Ensure dates are properly converted
  const expiresAt = new Date(interview.interviewLinkExpiresAt)
  const completedAt = interview.completedAt ? new Date(interview.completedAt) : null

  // Check if interview link has expired
  if (expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Link phỏng vấn đã hết hạn
          </h1>
          <p className="text-gray-600 mb-6">
            Liên kết phỏng vấn này đã hết hạn vào ngày{' '}
            {expiresAt.toLocaleDateString('vi-VN')}.
          </p>
          <p className="text-sm text-gray-500">
            Vui lòng liên hệ với HR để nhận liên kết mới.
          </p>
        </div>
      </div>
    )
  }

  // Check if interview is already completed
  if (interview.status === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-green-500 text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Phỏng vấn đã hoàn thành
          </h1>
          <p className="text-gray-600 mb-6">
            Bạn đã hoàn thành phỏng vấn này vào ngày{' '}
            {completedAt?.toLocaleDateString('vi-VN')}.
          </p>
          <p className="text-sm text-gray-500">
            Kết quả sẽ được thông báo qua email trong thời gian sớm nhất.
          </p>
        </div>
      </div>
    )
  }

  // Check if interview is in progress (redirect to continue)
  if (interview.status === 'in_progress') {
    redirect(`/interview/${token}/conduct`)
  }

  return (
    <InterviewLanding
      interview={{
        ...interview,
        interviewLinkExpiresAt: expiresAt,
      }}
      jobTemplate={jobTemplate}
      organization={organization}
      token={token}
    />
  )
}

// Handle TBEI assessment system
async function handleTbeiAssessment(result: any, token: string) {
  const { participant, session, jobTemplate, organization } = result

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
            Đánh giá đã hoàn thành
          </h1>
          <p className="text-gray-600 mb-6">
            Bạn đã hoàn thành tất cả các phần đánh giá:
          </p>
          <div className="space-y-2 text-sm text-gray-700 mb-6">
            <div className="flex items-center justify-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              TBEI Interview
            </div>
            <div className="flex items-center justify-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              HiPo Assessment
            </div>
            <div className="flex items-center justify-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Knowledge Quiz
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Kết quả sẽ được thông báo qua email trong thời gian sớm nhất.
          </p>
        </div>
      </div>
    )
  }

  // Check if participant has any assessments in progress
  const hasInProgress =
    participant.tbeiStatus === 'in_progress' ||
    participant.hipoStatus === 'in_progress' ||
    participant.quizStatus === 'in_progress'

  if (hasInProgress) {
    redirect(`/interview/${token}/tbei`)
  }

  return (
    <TbeiAssessmentLanding
      participant={participant}
      session={session}
      jobTemplate={jobTemplate}
      organization={organization}
      token={token}
    />
  )
}