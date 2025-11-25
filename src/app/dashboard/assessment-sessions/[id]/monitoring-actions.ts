'use server'

import { db } from '@/lib/db'
import {
  assessmentParticipants,
  tbeiResponses,
  hipoAssessments,
  quizResponses
} from '@/db/schema'
import { eq, and, count } from 'drizzle-orm'

interface ParticipantProgress {
  id: string
  name: string
  email: string
  roleCode: string
  roleName: string
  interviewToken: string | null
  tbeiStatus: 'pending' | 'in_progress' | 'completed'
  hipoStatus: 'pending' | 'in_progress' | 'completed'
  quizStatus: 'pending' | 'in_progress' | 'completed'
  emailSentAt: string | null
  // Additional progress data
  tbeiProgress?: {
    competenciesCompleted: number
    totalCompetencies: number
    lastActivity?: string
    evaluationStatus?: 'pending' | 'in_progress' | 'completed'
  }
  hipoProgress?: {
    sectionsCompleted: number
    totalSections: number
    score?: number
    lastActivity?: string
  }
  quizProgress?: {
    questionsAnswered: number
    totalQuestions: number
    score?: number
    timeRemaining?: number
    lastActivity?: string
  }
}

/**
 * Get detailed participant progress data for monitoring dashboard
 */
export async function getParticipantProgressData(sessionId: string): Promise<ParticipantProgress[]> {
  try {
    // Get all participants for this session
    const participants = await db
      .select()
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.sessionId, sessionId))

    const participantProgress: ParticipantProgress[] = []

    for (const participant of participants) {
      // Get TBEI progress
      let tbeiProgress: ParticipantProgress['tbeiProgress'] = undefined
      if (participant.tbeiStatus !== 'pending') {
        const tbeiResponsesData = await db
          .select()
          .from(tbeiResponses)
          .where(eq(tbeiResponses.participantId, participant.id))

        const competenciesCompleted = tbeiResponsesData.length
        const totalCompetencies = 2 // digital_transformation and talent_development

        // Check evaluation status
        let evaluationStatus: 'pending' | 'in_progress' | 'completed' = 'pending'
        const evaluatedResponses = tbeiResponsesData.filter(response => {
          try {
            const evaluation = JSON.parse(response.evaluation || '{}')
            return evaluation.aiEvaluation !== undefined
          } catch {
            return false
          }
        })

        if (evaluatedResponses.length === competenciesCompleted && competenciesCompleted > 0) {
          evaluationStatus = 'completed'
        } else if (evaluatedResponses.length > 0) {
          evaluationStatus = 'in_progress'
        }

        // Get last activity timestamp
        const lastActivity = tbeiResponsesData.length > 0
          ? tbeiResponsesData
              .map(r => {
                try {
                  const evaluation = JSON.parse(r.evaluation || '{}')
                  return evaluation.submittedAt || r.createdAt
                } catch {
                  return r.createdAt
                }
              })
              .sort()
              .pop()
          : undefined

        tbeiProgress = {
          competenciesCompleted,
          totalCompetencies,
          lastActivity,
          evaluationStatus
        }
      }

      // Get HiPo progress
      let hipoProgress: ParticipantProgress['hipoProgress'] = undefined
      if (participant.hipoStatus !== 'pending') {
        const hipoData = await db
          .select()
          .from(hipoAssessments)
          .where(eq(hipoAssessments.participantId, participant.id))
          .limit(1)

        if (hipoData[0]) {
          // Calculate sections completed based on responses
          const responses = JSON.parse(hipoData[0].responses || '{}')
          const answeredQuestions = Object.keys(responses).length
          const totalQuestions = 20 // 20 Likert scale questions
          const sectionsCompleted = Math.floor(answeredQuestions / 5) // 4 sections of 5 questions each
          const totalSections = 4

          hipoProgress = {
            sectionsCompleted: participant.hipoStatus === 'completed' ? totalSections : sectionsCompleted,
            totalSections,
            score: hipoData[0].totalScore ?? undefined,
            lastActivity: hipoData[0].completedAt?.toISOString() || hipoData[0].createdAt?.toISOString()
          }
        } else if (participant.hipoStatus === 'in_progress') {
          // In progress but no data yet
          hipoProgress = {
            sectionsCompleted: 0,
            totalSections: 4
          }
        }
      }

      // Get Quiz progress
      let quizProgress: ParticipantProgress['quizProgress'] = undefined
      if (participant.quizStatus !== 'pending') {
        const quizData = await db
          .select()
          .from(quizResponses)
          .where(eq(quizResponses.participantId, participant.id))
          .limit(1)

        if (quizData[0]) {
          const answers = JSON.parse(quizData[0].answers || '{}')
          const questionsAnswered = Object.keys(answers).length
          const totalQuestions = quizData[0].totalQuestions || 10

          // Calculate time remaining (15 minutes total)
          const maxTimeSeconds = 15 * 60
          const timeSpent = quizData[0].timeSpentSeconds || 0
          const timeRemaining = participant.quizStatus === 'in_progress'
            ? Math.max(0, maxTimeSeconds - timeSpent)
            : 0

          quizProgress = {
            questionsAnswered: participant.quizStatus === 'completed' ? totalQuestions : questionsAnswered,
            totalQuestions,
            score: quizData[0].score ?? undefined,
            timeRemaining: participant.quizStatus === 'in_progress' ? timeRemaining : undefined,
            lastActivity: quizData[0].completedAt?.toISOString()
          }
        } else if (participant.quizStatus === 'in_progress') {
          // In progress but no data yet
          quizProgress = {
            questionsAnswered: 0,
            totalQuestions: 10,
            timeRemaining: 15 * 60 // 15 minutes
          }
        }
      }

      participantProgress.push({
        id: participant.id,
        name: participant.name,
        email: participant.email,
        roleCode: participant.roleCode,
        roleName: participant.roleName,
        interviewToken: participant.interviewToken,
        tbeiStatus: participant.tbeiStatus,
        hipoStatus: participant.hipoStatus,
        quizStatus: participant.quizStatus,
        emailSentAt: participant.emailSentAt?.toISOString() || null,
        tbeiProgress,
        hipoProgress,
        quizProgress
      })
    }

    return participantProgress

  } catch (error) {
    console.error('Error fetching participant progress data:', error)
    throw error
  }
}

/**
 * Get summary statistics for the monitoring dashboard
 */
export async function getMonitoringStats(sessionId: string) {
  try {
    const participants = await db
      .select()
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.sessionId, sessionId))

    const stats = {
      total: participants.length,
      tbei: {
        pending: participants.filter(p => p.tbeiStatus === 'pending').length,
        inProgress: participants.filter(p => p.tbeiStatus === 'in_progress').length,
        completed: participants.filter(p => p.tbeiStatus === 'completed').length
      },
      hipo: {
        pending: participants.filter(p => p.hipoStatus === 'pending').length,
        inProgress: participants.filter(p => p.hipoStatus === 'in_progress').length,
        completed: participants.filter(p => p.hipoStatus === 'completed').length
      },
      quiz: {
        pending: participants.filter(p => p.quizStatus === 'pending').length,
        inProgress: participants.filter(p => p.quizStatus === 'in_progress').length,
        completed: participants.filter(p => p.quizStatus === 'completed').length
      },
      overall: {
        completed: participants.filter(p =>
          p.tbeiStatus === 'completed' &&
          p.hipoStatus === 'completed' &&
          p.quizStatus === 'completed'
        ).length,
        inProgress: participants.filter(p =>
          p.tbeiStatus === 'in_progress' ||
          p.hipoStatus === 'in_progress' ||
          p.quizStatus === 'in_progress'
        ).length
      }
    }

    return stats

  } catch (error) {
    console.error('Error fetching monitoring stats:', error)
    throw error
  }
}

/**
 * Refresh participant data - can be called periodically for real-time updates
 */
export async function refreshParticipantData(sessionId: string) {
  // This action can be used by the client to manually refresh data
  // or called periodically for real-time updates
  return getParticipantProgressData(sessionId)
}