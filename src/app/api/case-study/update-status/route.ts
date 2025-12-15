import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { assessmentSessions, assessmentSessionStatusEnum } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Validation schema for status update
const updateStatusSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  status: z.enum(assessmentSessionStatusEnum, {
    errorMap: () => ({ message: 'Invalid status value' })
  })
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📥 Received status update request:', {
      sessionId: body.sessionId,
      status: body.status,
      bodyKeys: Object.keys(body)
    })

    const result = updateStatusSchema.safeParse(body)

    if (!result.success) {
      console.error('❌ Status update schema validation failed:', {
        sessionId: body.sessionId,
        status: body.status,
        errors: result.error.errors
      })
      return NextResponse.json({
        success: false,
        error: 'Invalid input data',
        details: result.error.errors
      }, { status: 400 })
    }

    console.log('✅ Status update schema validation passed')
    const { sessionId, status } = result.data

    // Verify the session exists
    const existingSession = await db
      .select({
        id: assessmentSessions.id,
        status: assessmentSessions.status,
        name: assessmentSessions.name
      })
      .from(assessmentSessions)
      .where(eq(assessmentSessions.id, sessionId))
      .limit(1)

    if (!existingSession[0]) {
      return NextResponse.json({
        success: false,
        error: 'Assessment session not found'
      }, { status: 404 })
    }

    const currentStatus = existingSession[0].status
    console.log('🔍 Session status check:', {
      sessionId,
      sessionName: existingSession[0].name,
      currentStatus,
      requestedStatus: status
    })

    // Validate status transition
    const allowedTransitions: Record<string, string[]> = {
      'created': ['case_study_in_progress'],
      'case_study_in_progress': ['case_study_completed'],
      'case_study_completed': ['case_study_in_progress', 'tbei_in_progress'], // Allow restart
      'tbei_in_progress': ['completed'],
      'completed': [] // No transitions from completed
    }

    const allowedForCurrentStatus = allowedTransitions[currentStatus] || []
    console.log('🔄 Status transition validation:', {
      currentStatus,
      requestedStatus: status,
      allowedTransitions: allowedForCurrentStatus,
      isAllowed: allowedForCurrentStatus.includes(status)
    })

    if (!allowedForCurrentStatus.includes(status)) {
      console.error('❌ Invalid status transition:', {
        sessionId,
        currentStatus,
        requestedStatus: status,
        allowedTransitions: allowedForCurrentStatus
      })
      return NextResponse.json({
        success: false,
        error: `Cannot transition from '${currentStatus}' to '${status}'`,
        allowedTransitions: allowedForCurrentStatus
      }, { status: 400 })
    }

    console.log('✅ Status transition validation passed')

    // Update the session status
    const updateData: any = { status }

    // Set completion timestamp if moving to completed
    if (status === 'completed') {
      updateData.completedAt = new Date()
    }

    const [updatedSession] = await db
      .update(assessmentSessions)
      .set(updateData)
      .where(eq(assessmentSessions.id, sessionId))
      .returning()

    if (!updatedSession) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update session status'
      }, { status: 500 })
    }

    // Log the status change for monitoring
    console.log('Session status updated:', {
      sessionId,
      sessionName: existingSession[0].name,
      fromStatus: currentStatus,
      toStatus: status,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `Session status updated to '${status}'`,
      data: {
        id: updatedSession.id,
        previousStatus: currentStatus,
        newStatus: status,
        updatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error updating session status:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while updating session status'
    }, { status: 500 })
  }
}