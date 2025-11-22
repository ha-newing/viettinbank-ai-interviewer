import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { interviews, jobTemplates, interviewQuestions } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import InterviewConduct from '@/components/interview/InterviewConduct'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface InterviewConductPageProps {
  params: Promise<{ token: string }>
}

export default async function InterviewConductPage({ params }: InterviewConductPageProps) {
  const { token } = await params

  if (!token) {
    notFound()
  }

  // Find interview by token
  const interviewResult = await db
    .select({
      interview: interviews,
      jobTemplate: jobTemplates,
    })
    .from(interviews)
    .leftJoin(jobTemplates, eq(interviews.jobTemplateId, jobTemplates.id))
    .where(eq(interviews.interviewLinkToken, token))
    .limit(1)

  if (!interviewResult[0]) {
    notFound()
  }

  const { interview, jobTemplate } = interviewResult[0]

  // Check if interview link has expired or is completed
  if (interview.interviewLinkExpiresAt < new Date() || interview.status === 'completed') {
    notFound()
  }

  // Get interview questions for this job template
  let questions: any[] = []

  if (jobTemplate) {
    questions = await db
      .select()
      .from(interviewQuestions)
      .where(eq(interviewQuestions.jobTemplateId, jobTemplate.id))
      .orderBy(interviewQuestions.questionOrder)
  }

  // If no questions found, create and insert default questions
  if (questions.length === 0 && jobTemplate) {
    const defaultQuestions = [
      {
        jobTemplateId: jobTemplate.id,
        questionText: 'Vui lòng giới thiệu về bản thân và kinh nghiệm làm việc của bạn.',
        questionTextEn: 'Please introduce yourself and your work experience.',
        questionOrder: 1,
        timeLimit: 120,
        category: 'impression',
        isRequired: true,
      },
      {
        jobTemplateId: jobTemplate.id,
        questionText: 'Tại sao bạn quan tâm đến vị trí này và công ty chúng tôi?',
        questionTextEn: 'Why are you interested in this position and our company?',
        questionOrder: 2,
        timeLimit: 90,
        category: 'motivation',
        isRequired: true,
      },
      {
        jobTemplateId: jobTemplate.id,
        questionText: 'Kể về một thách thức khó khăn mà bạn đã vượt qua trong công việc.',
        questionTextEn: 'Tell me about a difficult challenge you overcame at work.',
        questionOrder: 3,
        timeLimit: 120,
        category: 'problemSolving',
        isRequired: true,
      },
    ]

    // Insert default questions into database
    questions = await db
      .insert(interviewQuestions)
      .values(defaultQuestions)
      .returning()
  }

  return (
    <InterviewConduct
      interview={interview}
      jobTemplate={jobTemplate}
      questions={questions}
      token={token}
    />
  )
}