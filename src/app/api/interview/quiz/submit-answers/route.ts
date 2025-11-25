import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { quizResponses, assessmentParticipants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

// Request validation schema
const SubmitQuizAnswersSchema = z.object({
  participantId: z.string().min(1),
  answers: z.record(z.string(), z.string()), // Question ID to selected option mapping
  score: z.number().min(0),
  totalQuestions: z.number().min(1),
  timeSpentSeconds: z.number().min(0)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = SubmitQuizAnswersSchema.parse(body)

    const {
      participantId,
      answers,
      score,
      totalQuestions,
      timeSpentSeconds
    } = validatedData

    // Verify participant exists
    const participant = await db
      .select()
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.id, participantId))
      .limit(1)

    if (!participant[0]) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    // Check if quiz response already exists
    const existingResponse = await db
      .select()
      .from(quizResponses)
      .where(eq(quizResponses.participantId, participantId))
      .limit(1)

    if (existingResponse[0]) {
      // Update existing response
      await db
        .update(quizResponses)
        .set({
          answers: JSON.stringify(answers),
          score,
          totalQuestions,
          timeSpentSeconds,
          completedAt: new Date()
        })
        .where(eq(quizResponses.id, existingResponse[0].id))
    } else {
      // Create new response
      await db
        .insert(quizResponses)
        .values({
          participantId,
          answers: JSON.stringify(answers),
          score,
          totalQuestions,
          timeSpentSeconds,
          completedAt: new Date()
        })
    }

    // Update participant quiz status to completed
    await db
      .update(assessmentParticipants)
      .set({ quizStatus: 'completed' })
      .where(eq(assessmentParticipants.id, participantId))

    // Calculate percentage
    const percentage = Math.round((score / totalQuestions) * 100)

    return NextResponse.json({
      success: true,
      message: 'Quiz answers submitted successfully',
      data: {
        score,
        totalQuestions,
        percentage,
        timeSpentMinutes: Math.round(timeSpentSeconds / 60)
      }
    })

  } catch (error) {
    console.error('Error submitting quiz answers:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}