'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { assessmentParticipants, assessmentSessions } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { sendAssessmentInvitationEmail } from '@/lib/email'
import { nanoid } from 'nanoid'

/**
 * Generate unique interview tokens for all participants in a session
 * This enables participants to access their individual interview pages
 */
export async function generateInterviewTokens(sessionId: string) {
  try {
    const user = await requireAuth()

    // Verify session belongs to user's organization
    const session = await db
      .select()
      .from(assessmentSessions)
      .where(
        and(
          eq(assessmentSessions.id, sessionId),
          eq(assessmentSessions.organizationId, user.organizationId)
        )
      )
      .limit(1)

    if (!session[0]) {
      throw new Error('Session not found')
    }

    // Get all participants for this session
    const participants = await db
      .select()
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.sessionId, sessionId))

    if (participants.length === 0) {
      throw new Error('No participants found for this session')
    }

    // Generate tokens for participants who don't have them
    const updatePromises = participants
      .filter(p => !p.interviewToken) // Only update those without tokens
      .map(participant =>
        db.update(assessmentParticipants)
          .set({
            interviewToken: `interview_${nanoid(32)}`
          })
          .where(eq(assessmentParticipants.id, participant.id))
      )

    await Promise.all(updatePromises)

    revalidatePath(`/dashboard/assessment-sessions/${sessionId}`)

  } catch (error) {
    console.error('Error generating interview tokens:', error)
    throw error
  }
}

/**
 * Send interview invitation emails to all participants
 */
export async function sendInterviewInvitations(sessionId: string) {
  try {
    const user = await requireAuth()

    // Verify session belongs to user's organization
    const session = await db
      .select({
        id: assessmentSessions.id,
        name: assessmentSessions.name,
        organizationId: assessmentSessions.organizationId
      })
      .from(assessmentSessions)
      .where(
        and(
          eq(assessmentSessions.id, sessionId),
          eq(assessmentSessions.organizationId, user.organizationId)
        )
      )
      .limit(1)

    if (!session[0]) {
      throw new Error('Session not found')
    }

    // Get participants with tokens
    const participants = await db
      .select()
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.sessionId, sessionId))

    const participantsWithTokens = participants.filter(p => p.interviewToken)

    if (participantsWithTokens.length === 0) {
      throw new Error('No participants with interview tokens found. Generate tokens first.')
    }

    // Send email invitations to all participants
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const emailPromises = participantsWithTokens.map(async (participant) => {
      try {
        const interviewUrl = `${baseUrl}/interview/${participant.interviewToken}`

        const emailSent = await sendAssessmentInvitationEmail({
          participantName: participant.name,
          participantEmail: participant.email,
          sessionName: session[0].name,
          interviewUrl,
          organizationName: user.organizationName,
          participantRole: participant.roleName,
        })

        if (emailSent) {
          // Mark email as sent in database
          await db.update(assessmentParticipants)
            .set({
              emailSentAt: new Date()
            })
            .where(eq(assessmentParticipants.id, participant.id))

          console.log(`📧 Assessment invitation sent to ${participant.email}`)
        } else {
          console.error(`❌ Failed to send email to ${participant.email}`)
        }
      } catch (error) {
        console.error(`❌ Error sending email to ${participant.email}:`, error)
      }
    })

    await Promise.all(emailPromises)

    revalidatePath(`/dashboard/assessment-sessions/${sessionId}`)

  } catch (error) {
    console.error('Error sending interview invitations:', error)
    throw error
  }
}

/**
 * Start the case study by updating session status to 'case_study_in_progress'
 */
export async function startCaseStudy(sessionId: string) {
  try {
    const user = await requireAuth()

    // Verify session belongs to user's organization and is in 'created' status
    const session = await db
      .select()
      .from(assessmentSessions)
      .where(
        and(
          eq(assessmentSessions.id, sessionId),
          eq(assessmentSessions.organizationId, user.organizationId),
          eq(assessmentSessions.status, 'created')
        )
      )
      .limit(1)

    if (!session[0]) {
      throw new Error('Session not found or not in created status')
    }

    // Update session status to case_study_in_progress
    await db
      .update(assessmentSessions)
      .set({
        status: 'case_study_in_progress'
      })
      .where(eq(assessmentSessions.id, sessionId))

    revalidatePath(`/dashboard/assessment-sessions/${sessionId}`)

    // Redirect to case study monitoring page
    redirect(`/dashboard/assessment-sessions/${sessionId}/case-study`)

  } catch (error) {
    console.error('Error starting case study:', error)
    throw error
  }
}

/**
 * Mark session as completed when all participants have finished all assessments
 */
export async function completeSession(sessionId: string) {
  try {
    const user = await requireAuth()

    // Verify session belongs to user's organization
    const session = await db
      .select()
      .from(assessmentSessions)
      .where(
        and(
          eq(assessmentSessions.id, sessionId),
          eq(assessmentSessions.organizationId, user.organizationId)
        )
      )
      .limit(1)

    if (!session[0]) {
      throw new Error('Session not found')
    }

    // Only update if currently in tbei_in_progress
    if (session[0].status !== 'tbei_in_progress') {
      return { success: false, message: 'Session is not in TBEI phase' }
    }

    // Check if all participants have completed all assessments
    const participants = await db
      .select()
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.sessionId, sessionId))

    if (participants.length === 0) {
      return { success: false, message: 'No participants found' }
    }

    const allComplete = participants.every(p =>
      p.tbeiStatus === 'completed' &&
      p.hipoStatus === 'completed' &&
      p.quizStatus === 'completed'
    )

    if (!allComplete) {
      return { success: false, message: 'Not all participants have completed' }
    }

    // Update session status to completed
    await db
      .update(assessmentSessions)
      .set({
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(assessmentSessions.id, sessionId))

    revalidatePath(`/dashboard/assessment-sessions/${sessionId}`)

    return { success: true, message: 'Session marked as completed' }

  } catch (error) {
    console.error('Error completing session:', error)
    throw error
  }
}

/**
 * Force complete a session - for manual override when auto-complete doesn't trigger
 * Use this when all participants have completed but session status is stuck
 */
export async function forceCompleteSession(sessionId: string) {
  try {
    const user = await requireAuth()

    // Verify session belongs to user's organization
    const session = await db
      .select()
      .from(assessmentSessions)
      .where(
        and(
          eq(assessmentSessions.id, sessionId),
          eq(assessmentSessions.organizationId, user.organizationId)
        )
      )
      .limit(1)

    if (!session[0]) {
      throw new Error('Session not found')
    }

    // Only allow force complete from tbei_in_progress status
    if (session[0].status !== 'tbei_in_progress') {
      throw new Error('Session must be in TBEI phase to complete')
    }

    // Update session status to completed
    await db
      .update(assessmentSessions)
      .set({
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(assessmentSessions.id, sessionId))

    revalidatePath(`/dashboard/assessment-sessions/${sessionId}`)

  } catch (error) {
    console.error('Error force completing session:', error)
    throw error
  }
}

/**
 * Start the TBEI interview phase by updating session status
 * This generates tokens if not already generated and updates status
 */
export async function startTbeiPhase(sessionId: string) {
  try {
    const user = await requireAuth()

    // Verify session belongs to user's organization and is in correct status
    const session = await db
      .select()
      .from(assessmentSessions)
      .where(
        and(
          eq(assessmentSessions.id, sessionId),
          eq(assessmentSessions.organizationId, user.organizationId)
        )
      )
      .limit(1)

    if (!session[0]) {
      throw new Error('Session not found')
    }

    // Check if session is in the right status (case_study_completed)
    if (session[0].status !== 'case_study_completed') {
      throw new Error(`Cannot start TBEI phase from status: ${session[0].status}. Must complete case study first.`)
    }

    // Get all participants for this session
    const participants = await db
      .select()
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.sessionId, sessionId))

    if (participants.length === 0) {
      throw new Error('No participants found for this session')
    }

    // Generate tokens for participants who don't have them
    const participantsWithoutTokens = participants.filter(p => !p.interviewToken)
    if (participantsWithoutTokens.length > 0) {
      const updatePromises = participantsWithoutTokens.map(participant =>
        db.update(assessmentParticipants)
          .set({
            interviewToken: `interview_${nanoid(32)}`
          })
          .where(eq(assessmentParticipants.id, participant.id))
      )
      await Promise.all(updatePromises)
    }

    // Update session status to tbei_in_progress
    await db
      .update(assessmentSessions)
      .set({
        status: 'tbei_in_progress'
      })
      .where(eq(assessmentSessions.id, sessionId))

    revalidatePath(`/dashboard/assessment-sessions/${sessionId}`)

    // Redirect to monitoring page
    redirect(`/dashboard/assessment-sessions/${sessionId}/monitor`)

  } catch (error) {
    console.error('Error starting TBEI phase:', error)
    throw error
  }
}