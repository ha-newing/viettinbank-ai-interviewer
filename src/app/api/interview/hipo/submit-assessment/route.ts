import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hipoAssessments, assessmentParticipants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

// Request validation schema
const SubmitHipoAssessmentSchema = z.object({
  participantId: z.string().min(1),
  abilityScore: z.number().min(5).max(25),
  aspirationScore: z.number().min(5).max(25),
  engagementScore: z.number().min(5).max(25),
  integratedScore: z.number().min(5).max(25),
  totalScore: z.number().min(20).max(100),
  responses: z.record(z.string(), z.number().min(1).max(5)), // Question ID to score mapping
  openResponse1: z.string().min(1),
  openResponse2: z.string().min(1),
  abilityClassification: z.enum(['xuất_sắc', 'tốt', 'trung_bình', 'cần_quan_tâm']),
  aspirationClassification: z.enum(['xuất_sắc', 'tốt', 'trung_bình', 'cần_quan_tâm']),
  engagementClassification: z.enum(['xuất_sắc', 'tốt', 'trung_bình', 'cần_quan_tâm']),
  integratedClassification: z.enum(['xuất_sắc', 'tốt', 'trung_bình', 'cần_quan_tâm'])
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = SubmitHipoAssessmentSchema.parse(body)

    const {
      participantId,
      abilityScore,
      aspirationScore,
      engagementScore,
      integratedScore,
      totalScore,
      responses,
      openResponse1,
      openResponse2,
      abilityClassification,
      aspirationClassification,
      engagementClassification,
      integratedClassification
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

    // Check if assessment already exists
    const existingAssessment = await db
      .select()
      .from(hipoAssessments)
      .where(eq(hipoAssessments.participantId, participantId))
      .limit(1)

    if (existingAssessment[0]) {
      // Update existing assessment
      await db
        .update(hipoAssessments)
        .set({
          abilityScore,
          aspirationScore,
          engagementScore,
          integratedScore,
          totalScore,
          responses: JSON.stringify(responses),
          openResponse1,
          openResponse2,
          abilityClassification: abilityClassification as any,
          aspirationClassification: aspirationClassification as any,
          engagementClassification: engagementClassification as any,
          integratedClassification: integratedClassification as any,
          completedAt: new Date()
        })
        .where(eq(hipoAssessments.id, existingAssessment[0].id))
    } else {
      // Create new assessment
      await db
        .insert(hipoAssessments)
        .values({
          participantId,
          abilityScore,
          aspirationScore,
          engagementScore,
          integratedScore,
          totalScore,
          responses: JSON.stringify(responses),
          openResponse1,
          openResponse2,
          abilityClassification: abilityClassification as any,
          aspirationClassification: aspirationClassification as any,
          engagementClassification: engagementClassification as any,
          integratedClassification: integratedClassification as any,
          completedAt: new Date()
        })
    }

    // Update participant HiPo status to completed
    await db
      .update(assessmentParticipants)
      .set({ hipoStatus: 'completed' })
      .where(eq(assessmentParticipants.id, participantId))

    return NextResponse.json({
      success: true,
      message: 'HiPo assessment submitted successfully',
      data: {
        totalScore,
        classifications: {
          ability: abilityClassification,
          aspiration: aspirationClassification,
          engagement: engagementClassification,
          integrated: integratedClassification
        }
      }
    })

  } catch (error) {
    console.error('Error submitting HiPo assessment:', error)

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