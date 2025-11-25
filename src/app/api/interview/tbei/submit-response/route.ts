import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tbeiResponses, assessmentParticipants } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { evaluateTbeiResponse } from '@/lib/tbei-evaluation'

// Request validation schema
const SubmitTbeiResponseSchema = z.object({
  participantId: z.string().min(1),
  competencyId: z.string().min(1),
  questionId: z.string().min(1),
  selectedQuestionIndex: z.number().min(0).max(2),
  transcript: z.string().optional(),
  structuredResponse: z.record(z.string()).optional(),
  audioUrl: z.string().optional(),
  durationSeconds: z.number().min(0).default(0)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = SubmitTbeiResponseSchema.parse(body)

    const {
      participantId,
      competencyId,
      questionId,
      selectedQuestionIndex,
      transcript,
      structuredResponse,
      audioUrl,
      durationSeconds
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

    // Check if response already exists for this competency
    const existingResponse = await db
      .select()
      .from(tbeiResponses)
      .where(and(
        eq(tbeiResponses.participantId, participantId),
        eq(tbeiResponses.competencyId, competencyId)
      ))
      .limit(1)

    let responseId: string

    if (existingResponse[0]) {
      // Update existing response
      await db
        .update(tbeiResponses)
        .set({
          questionId,
          selectedQuestionIndex,
          transcript: transcript || '',
          audioUrl,
          durationSeconds,
          evaluation: JSON.stringify({
            structuredResponse,
            submittedAt: new Date().toISOString()
          })
        })
        .where(eq(tbeiResponses.id, existingResponse[0].id))

      responseId = existingResponse[0].id
    } else {
      // Create new response
      const insertedResponse = await db
        .insert(tbeiResponses)
        .values({
          participantId,
          competencyId,
          questionId,
          selectedQuestionIndex,
          transcript: transcript || '',
          audioUrl,
          durationSeconds,
          evaluation: JSON.stringify({
            structuredResponse,
            submittedAt: new Date().toISOString()
          })
        })
        .returning()

      responseId = insertedResponse[0].id
    }

    // Trigger AI evaluation asynchronously (don't wait for completion)
    evaluateTbeiResponse(responseId).catch(error => {
      console.error('Error triggering TBEI AI evaluation:', error)
      // Don't fail the submission if evaluation fails
    })

    // Update participant TBEI status if both competencies are completed
    const allResponses = await db
      .select()
      .from(tbeiResponses)
      .where(eq(tbeiResponses.participantId, participantId))

    const hasDigitalTransformation = allResponses.some(r => r.competencyId === 'digital_transformation')
    const hasTalentDevelopment = allResponses.some(r => r.competencyId === 'talent_development')

    if (hasDigitalTransformation && hasTalentDevelopment) {
      await db
        .update(assessmentParticipants)
        .set({ tbeiStatus: 'completed' })
        .where(eq(assessmentParticipants.id, participantId))
    } else {
      await db
        .update(assessmentParticipants)
        .set({ tbeiStatus: 'in_progress' })
        .where(eq(assessmentParticipants.id, participantId))
    }

    return NextResponse.json({
      success: true,
      message: 'TBEI response submitted successfully',
      data: {
        responseId,
        competencyId,
        isCompleted: hasDigitalTransformation && hasTalentDevelopment,
        evaluationTriggered: true
      }
    })

  } catch (error) {
    console.error('Error submitting TBEI response:', error)

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