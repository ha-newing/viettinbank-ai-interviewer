import { NextRequest, NextResponse } from 'next/server'
import { triggerAIEvaluation } from '@/lib/interview-processor'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/interview/evaluate/[id] - Trigger AI evaluation for an interview
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: interviewId } = await params

    if (!interviewId) {
      return NextResponse.json({
        success: false,
        error: 'Interview ID is required'
      }, { status: 400 })
    }

    console.log(`📊 API request to evaluate interview ${interviewId}`)

    // Trigger AI evaluation
    const success = await triggerAIEvaluation(interviewId)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'AI evaluation completed successfully',
        data: { interviewId }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'AI evaluation failed'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('API error in evaluate interview:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}