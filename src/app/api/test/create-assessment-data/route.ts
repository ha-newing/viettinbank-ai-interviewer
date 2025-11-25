import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  assessmentSessions,
  assessmentParticipants
} from '@/db/schema'
import { requireAuth } from '@/lib/auth'
import { nanoid } from 'nanoid'
import { eq, and, like } from 'drizzle-orm'

/**
 * TEMPORARY API ENDPOINT FOR TESTING PURPOSES
 * Creates minimal test data for Assessment Center API testing
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Create Assessment Session
    const sessionId = nanoid()
    await db.insert(assessmentSessions).values({
      id: sessionId,
      name: 'API Test Session - VietinBank Leadership Assessment',
      organizationId: user.organizationId,
      status: 'created',
      createdAt: new Date(),
    })

    // Create Assessment Participants
    const participants = [
      {
        id: nanoid(),
        sessionId,
        name: 'Nguyễn Văn An',
        email: 'nguyen.van.an@test.viettinbank.com',
        roleCode: 'A' as const,
        roleName: 'Trưởng phòng Tín dụng',
        speakerLabel: 'Speaker 1',
        interviewToken: `interview_${nanoid(32)}`,
        tbeiStatus: 'pending' as const,
        hipoStatus: 'pending' as const,
        quizStatus: 'pending' as const,
      },
      {
        id: nanoid(),
        sessionId,
        name: 'Trần Thị Bình',
        email: 'tran.thi.binh@test.viettinbank.com',
        roleCode: 'B' as const,
        roleName: 'Phó phòng Khách hàng doanh nghiệp',
        speakerLabel: 'Speaker 2',
        interviewToken: `interview_${nanoid(32)}`,
        tbeiStatus: 'pending' as const,
        hipoStatus: 'pending' as const,
        quizStatus: 'pending' as const,
      },
      {
        id: nanoid(),
        sessionId,
        name: 'Lê Minh Cường',
        email: 'le.minh.cuong@test.viettinbank.com',
        roleCode: 'C' as const,
        roleName: 'Chuyên viên Phân tích rủi ro',
        speakerLabel: 'Speaker 3',
        interviewToken: `interview_${nanoid(32)}`,
        tbeiStatus: 'pending' as const,
        hipoStatus: 'pending' as const,
        quizStatus: 'pending' as const,
      }
    ]

    await db.insert(assessmentParticipants).values(participants)

    return NextResponse.json({
      success: true,
      message: 'Test assessment data created successfully',
      data: {
        sessionId,
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          roleCode: p.roleCode,
          roleName: p.roleName,
          interviewToken: p.interviewToken
        })),
        organizationId: user.organizationId,
        testUrls: {
          session: `https://viettinbank-ai-interviewer.fly.dev/dashboard/assessment-sessions/${sessionId}`,
          results: `https://viettinbank-ai-interviewer.fly.dev/api/assessment-sessions/${sessionId}/results`,
          updateStatus: 'https://viettinbank-ai-interviewer.fly.dev/api/case-study/update-status',
          caseStudyTranscript: 'https://viettinbank-ai-interviewer.fly.dev/api/case-study/transcript-chunk',
          tbeiSubmit: 'https://viettinbank-ai-interviewer.fly.dev/api/interview/tbei/submit-response',
          hipoSubmit: 'https://viettinbank-ai-interviewer.fly.dev/api/interview/hipo/submit-assessment',
          quizSubmit: 'https://viettinbank-ai-interviewer.fly.dev/api/interview/quiz/submit-answers'
        }
      }
    })

  } catch (error) {
    console.error('Error creating test assessment data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create test assessment data'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Clean up test data - sessions with "API Test" in name
    const testSessions = await db.select()
      .from(assessmentSessions)
      .where(and(
        like(assessmentSessions.name, '%API Test%'),
        eq(assessmentSessions.organizationId, user.organizationId)
      ))

    for (const session of testSessions) {
      // Delete participants first (FK constraint)
      await db.delete(assessmentParticipants)
        .where(eq(assessmentParticipants.sessionId, session.id))

      // Delete session
      await db.delete(assessmentSessions)
        .where(eq(assessmentSessions.id, session.id))
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${testSessions.length} test sessions`
    })

  } catch (error) {
    console.error('Error cleaning up test data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to clean up test data'
    }, { status: 500 })
  }
}