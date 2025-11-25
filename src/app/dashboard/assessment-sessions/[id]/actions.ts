'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { assessmentParticipants, assessmentSessions } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
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

    // TODO: Integrate with email service
    // For now, we'll just mark as email sent
    const emailPromises = participantsWithTokens.map(participant =>
      db.update(assessmentParticipants)
        .set({
          emailSentAt: new Date()
        })
        .where(eq(assessmentParticipants.id, participant.id))
    )

    await Promise.all(emailPromises)

    revalidatePath(`/dashboard/assessment-sessions/${sessionId}`)

  } catch (error) {
    console.error('Error sending interview invitations:', error)
    throw error
  }
}