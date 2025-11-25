import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  evaluateTbeiResponse,
  evaluateParticipantTbeiResponses,
  calculateTbeiOverallScore
} from '@/lib/tbei-evaluation'

// Request validation schemas
const EvaluateResponseSchema = z.object({
  responseId: z.string().min(1)
})

const EvaluateParticipantSchema = z.object({
  participantId: z.string().min(1)
})

const CalculateOverallScoreSchema = z.object({
  participantId: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'response': {
        const { responseId } = EvaluateResponseSchema.parse(body)
        const evaluation = await evaluateTbeiResponse(responseId)

        return NextResponse.json({
          success: true,
          message: 'TBEI response evaluated successfully',
          data: evaluation
        })
      }

      case 'participant': {
        const { participantId } = EvaluateParticipantSchema.parse(body)
        const evaluations = await evaluateParticipantTbeiResponses(participantId)

        return NextResponse.json({
          success: true,
          message: 'All TBEI responses evaluated successfully',
          data: {
            evaluations,
            count: evaluations.length
          }
        })
      }

      case 'overall': {
        const { participantId } = CalculateOverallScoreSchema.parse(body)
        const overallScore = await calculateTbeiOverallScore(participantId)

        return NextResponse.json({
          success: true,
          message: 'TBEI overall score calculated successfully',
          data: overallScore
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use ?action=response|participant|overall' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in TBEI evaluation:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve evaluation status and results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const participantId = searchParams.get('participantId')
    const responseId = searchParams.get('responseId')

    if (participantId) {
      // Get evaluation summary for participant
      const { getTbeiEvaluationSummary } = await import('@/lib/tbei-evaluation')
      const summary = await getTbeiEvaluationSummary(participantId)

      return NextResponse.json({
        success: true,
        data: summary
      })
    }

    if (responseId) {
      // Get evaluation for specific response
      const { db } = await import('@/lib/db')
      const { tbeiResponses } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')

      const response = await db
        .select()
        .from(tbeiResponses)
        .where(eq(tbeiResponses.id, responseId))
        .limit(1)

      if (!response[0]) {
        return NextResponse.json(
          { error: 'Response not found' },
          { status: 404 }
        )
      }

      const evaluation = response[0].evaluation ? JSON.parse(response[0].evaluation) : null

      return NextResponse.json({
        success: true,
        data: {
          responseId: response[0].id,
          competencyId: response[0].competencyId,
          hasEvaluation: !!evaluation?.aiEvaluation,
          evaluation: evaluation?.aiEvaluation || null
        }
      })
    }

    return NextResponse.json(
      { error: 'Missing participantId or responseId parameter' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error retrieving TBEI evaluation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}