import { NextRequest, NextResponse } from 'next/server'
import { batchProcessAIEvaluation } from '@/lib/interview-processor'

/**
 * POST /api/interview/evaluate-batch - Trigger AI evaluation for multiple interviews
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { interviewIds } = body

    if (!interviewIds || !Array.isArray(interviewIds) || interviewIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Interview IDs array is required'
      }, { status: 400 })
    }

    if (interviewIds.length > 50) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 50 interviews can be processed in a batch'
      }, { status: 400 })
    }

    console.log(`📦 API request to batch evaluate ${interviewIds.length} interviews`)

    // Trigger batch AI evaluation
    const results = await batchProcessAIEvaluation(interviewIds)

    return NextResponse.json({
      success: true,
      message: `Batch evaluation completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: {
        successful: results.successful,
        failed: results.failed,
        total: interviewIds.length,
        successCount: results.successful.length,
        failureCount: results.failed.length
      }
    })

  } catch (error) {
    console.error('API error in batch evaluate interviews:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}