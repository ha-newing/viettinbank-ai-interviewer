'use server'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  assessmentSessions,
  assessmentParticipants,
  caseStudyEvaluations,
  tbeiResponses,
  hipoAssessments,
  quizResponses
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

/**
 * Aggregate results from all 4 Assessment Center phases:
 * 1. Case Study (group discussion analysis)
 * 2. TBEI (behavioral interviews)
 * 3. HiPo (self-assessment questionnaire)
 * 4. Quiz (knowledge test)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: sessionId } = await params

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
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Get all participants in this session
    const participants = await db
      .select()
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.sessionId, sessionId))

    // Aggregate results for each participant
    const participantResults = await Promise.all(
      participants.map(async (participant) => {
        // 1. Case Study Results - Group competency analysis
        const caseStudyResults = await db
          .select()
          .from(caseStudyEvaluations)
          .where(
            and(
              eq(caseStudyEvaluations.sessionId, sessionId),
              eq(caseStudyEvaluations.participantId, participant.id)
            )
          )

        // Calculate case study summary
        const caseStudySummary = caseStudyResults.reduce(
          (acc, evaluation) => {
            if (evaluation.countTowardOverall && evaluation.score) {
              acc.totalScore += evaluation.score
              acc.competencyCount += 1
              acc.competencies[evaluation.competencyId] = {
                score: evaluation.score,
                level: evaluation.level,
                evidenceStrength: evaluation.evidenceStrength,
                rationale: evaluation.rationale
              }
            }
            return acc
          },
          {
            totalScore: 0,
            competencyCount: 0,
            averageScore: 0,
            competencies: {} as Record<string, any>
          }
        )

        if (caseStudySummary.competencyCount > 0) {
          caseStudySummary.averageScore = Math.round(
            (caseStudySummary.totalScore / caseStudySummary.competencyCount) * 100
          ) / 100
        }

        // 2. TBEI Results - Behavioral interview analysis
        const tbeiResults = await db
          .select()
          .from(tbeiResponses)
          .where(eq(tbeiResponses.participantId, participant.id))

        const tbeiSummary = tbeiResults.reduce(
          (acc, response) => {
            const evaluation = response.evaluation ? JSON.parse(response.evaluation) : null
            if (evaluation && evaluation.score) {
              acc.totalScore += evaluation.score
              acc.responseCount += 1
              acc.competencies[response.competencyId] = {
                questionId: response.questionId,
                score: evaluation.score,
                rationale: evaluation.rationale,
                starAnalysis: evaluation.star_analysis,
                behavioralIndicators: evaluation.behavioral_indicators
              }
            }
            return acc
          },
          {
            totalScore: 0,
            responseCount: 0,
            averageScore: 0,
            competencies: {} as Record<string, any>
          }
        )

        if (tbeiSummary.responseCount > 0) {
          tbeiSummary.averageScore = Math.round(
            (tbeiSummary.totalScore / tbeiSummary.responseCount) * 100
          ) / 100
        }

        // 3. HiPo Assessment Results
        const hipoResults = await db
          .select()
          .from(hipoAssessments)
          .where(eq(hipoAssessments.participantId, participant.id))
          .limit(1)

        const hipoSummary = hipoResults[0] ? {
          totalScore: hipoResults[0].totalScore,
          abilityScore: hipoResults[0].abilityScore,
          aspirationScore: hipoResults[0].aspirationScore,
          engagementScore: hipoResults[0].engagementScore,
          integratedScore: hipoResults[0].integratedScore,
          classifications: {
            ability: hipoResults[0].abilityClassification,
            aspiration: hipoResults[0].aspirationClassification,
            engagement: hipoResults[0].engagementClassification,
            integrated: hipoResults[0].integratedClassification
          },
          completedAt: hipoResults[0].completedAt
        } : null

        // 4. Quiz Results - Knowledge assessment
        const quizResults = await db
          .select()
          .from(quizResponses)
          .where(eq(quizResponses.participantId, participant.id))
          .limit(1)

        const quizSummary = quizResults[0] ? {
          score: quizResults[0].score,
          totalQuestions: quizResults[0].totalQuestions,
          percentage: (quizResults[0].totalQuestions && quizResults[0].totalQuestions > 0 && quizResults[0].score) ?
            Math.round((quizResults[0].score / quizResults[0].totalQuestions) * 100) : 0,
          timeSpentSeconds: quizResults[0].timeSpentSeconds,
          answers: quizResults[0].answers ? JSON.parse(quizResults[0].answers) : {},
          completedAt: quizResults[0].completedAt
        } : null

        // Calculate overall assessment score
        const phaseScores = []
        if (caseStudySummary.averageScore > 0) phaseScores.push(caseStudySummary.averageScore)
        if (tbeiSummary.averageScore > 0) phaseScores.push(tbeiSummary.averageScore)
        if (hipoSummary?.totalScore) phaseScores.push(hipoSummary.totalScore)
        if (quizSummary?.percentage) phaseScores.push(quizSummary.percentage)

        const overallScore = phaseScores.length > 0 ?
          Math.round((phaseScores.reduce((a, b) => a + b, 0) / phaseScores.length) * 100) / 100 : 0

        // Get completion status for each phase
        const completionStatus = {
          caseStudy: caseStudyResults.length > 0,
          tbei: participant.tbeiStatus === 'completed',
          hipo: participant.hipoStatus === 'completed',
          quiz: participant.quizStatus === 'completed'
        }

        const allPhasesComplete = Object.values(completionStatus).every(Boolean)

        return {
          participant: {
            id: participant.id,
            name: participant.name,
            email: participant.email,
            roleCode: participant.roleCode,
            roleName: participant.roleName
          },
          completionStatus,
          allPhasesComplete,
          overallScore,
          phaseResults: {
            caseStudy: {
              completed: completionStatus.caseStudy,
              summary: caseStudySummary,
              details: caseStudyResults
            },
            tbei: {
              completed: completionStatus.tbei,
              summary: tbeiSummary,
              details: tbeiResults
            },
            hipo: {
              completed: completionStatus.hipo,
              summary: hipoSummary,
              details: hipoResults[0] || null
            },
            quiz: {
              completed: completionStatus.quiz,
              summary: quizSummary,
              details: quizResults[0] || null
            }
          }
        }
      })
    )

    // Session-level analytics
    const sessionSummary = {
      sessionInfo: {
        id: session[0].id,
        name: session[0].name,
        status: session[0].status,
        totalParticipants: participants.length,
        completedParticipants: participantResults.filter(p => p.allPhasesComplete).length
      },
      overallMetrics: {
        averageScore: participantResults.length > 0 ?
          Math.round((participantResults.reduce((acc, p) => acc + p.overallScore, 0) / participantResults.length) * 100) / 100 : 0,
        completionRate: participants.length > 0 ?
          Math.round((participantResults.filter(p => p.allPhasesComplete).length / participants.length) * 100) : 0,
        phaseCompletionRates: {
          caseStudy: participants.length > 0 ?
            Math.round((participantResults.filter(p => p.completionStatus.caseStudy).length / participants.length) * 100) : 0,
          tbei: participants.length > 0 ?
            Math.round((participantResults.filter(p => p.completionStatus.tbei).length / participants.length) * 100) : 0,
          hipo: participants.length > 0 ?
            Math.round((participantResults.filter(p => p.completionStatus.hipo).length / participants.length) * 100) : 0,
          quiz: participants.length > 0 ?
            Math.round((participantResults.filter(p => p.completionStatus.quiz).length / participants.length) * 100) : 0
        }
      }
    }

    return NextResponse.json({
      session: sessionSummary,
      participants: participantResults
    })

  } catch (error) {
    console.error('Error fetching assessment results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessment results' },
      { status: 500 }
    )
  }
}