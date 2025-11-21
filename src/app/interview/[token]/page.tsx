import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { interviews, jobTemplates, organizations } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import InterviewLanding from '@/components/interview/InterviewLanding'

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

  // Find interview by token
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

  if (!interviewResult[0]) {
    notFound()
  }

  const { interview, jobTemplate, organization } = interviewResult[0]

  // Check if interview link has expired
  if (interview.interviewLinkExpiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Link phỏng vấn đã hết hạn
          </h1>
          <p className="text-gray-600 mb-6">
            Liên kết phỏng vấn này đã hết hạn vào ngày{' '}
            {interview.interviewLinkExpiresAt.toLocaleDateString('vi-VN')}.
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
            {interview.completedAt?.toLocaleDateString('vi-VN')}.
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
      interview={interview}
      jobTemplate={jobTemplate}
      organization={organization}
      token={token}
    />
  )
}