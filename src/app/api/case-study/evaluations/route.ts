import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  caseStudyEvaluations,
  assessmentSessions,
  assessmentParticipants,
  caseStudyTranscripts
} from '@/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { getCaseStudyCompetencies, getCompetencyInfo } from '@/lib/case-study-evaluation'

// Validation schema for evaluation polling
const evaluationPollSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  since: z.string().nullish(), // ISO timestamp to get evaluations after
  participantId: z.string().nullish() // Filter by specific participant
})

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const result = evaluationPollSchema.safeParse({
      sessionId: url.searchParams.get('sessionId'),
      since: url.searchParams.get('since'),
      participantId: url.searchParams.get('participantId')
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: result.error.errors
      }, { status: 400 })
    }

    const { sessionId, since, participantId } = result.data

    // Verify session exists
    const session = await db
      .select({
        id: assessmentSessions.id,
        name: assessmentSessions.name,
        status: assessmentSessions.status
      })
      .from(assessmentSessions)
      .where(eq(assessmentSessions.id, sessionId))
      .limit(1)

    if (!session[0]) {
      return NextResponse.json({
        success: false,
        error: 'Assessment session not found'
      }, { status: 404 })
    }

    // Get participants
    const participants = await db
      .select({
        id: assessmentParticipants.id,
        name: assessmentParticipants.name,
        roleCode: assessmentParticipants.roleCode,
        roleName: assessmentParticipants.roleName
      })
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.sessionId, sessionId))
      .orderBy(assessmentParticipants.roleCode)

    // Build query conditions
    let conditions = eq(caseStudyEvaluations.sessionId, sessionId)

    if (participantId) {
      conditions = and(conditions, eq(caseStudyEvaluations.participantId, participantId)) || conditions
    }

    if (since) {
      // Filter evaluations updated after the timestamp
      const sinceDate = new Date(since)
      conditions = and(
        conditions,
        sql`${caseStudyEvaluations.updatedAt} > ${sinceDate}`
      ) || conditions
    }

    // Get evaluations with transcript info
    const evaluations = await db
      .select({
        id: caseStudyEvaluations.id,
        participantId: caseStudyEvaluations.participantId,
        transcriptId: caseStudyEvaluations.transcriptId,
        competencyId: caseStudyEvaluations.competencyId,
        score: caseStudyEvaluations.score,
        level: caseStudyEvaluations.level,
        rationale: caseStudyEvaluations.rationale,
        evidence: caseStudyEvaluations.evidence,
        evidenceStrength: caseStudyEvaluations.evidenceStrength,
        countTowardOverall: caseStudyEvaluations.countTowardOverall,
        createdAt: caseStudyEvaluations.createdAt,
        updatedAt: caseStudyEvaluations.updatedAt,
        // Transcript info
        transcriptSequence: caseStudyTranscripts.sequenceNumber,
        transcriptDuration: caseStudyTranscripts.durationSeconds
      })
      .from(caseStudyEvaluations)
      .leftJoin(caseStudyTranscripts, eq(caseStudyEvaluations.transcriptId, caseStudyTranscripts.id))
      .where(conditions)
      .orderBy(desc(caseStudyEvaluations.updatedAt))

    // Transform evaluations with participant info
    const enrichedEvaluations = evaluations.map(evaluation => {
      const participant = participants.find(p => p.id === evaluation.participantId)
      const competencyInfo = getCompetencyInfo(evaluation.competencyId)

      return {
        id: evaluation.id,
        participant: participant ? {
          id: participant.id,
          name: participant.name,
          roleCode: participant.roleCode,
          roleName: participant.roleName
        } : null,
        competency: {
          id: evaluation.competencyId,
          name: competencyInfo?.name || evaluation.competencyId,
          nameEn: competencyInfo?.name_en || evaluation.competencyId
        },
        transcript: {
          id: evaluation.transcriptId,
          sequenceNumber: evaluation.transcriptSequence,
          durationSeconds: evaluation.transcriptDuration
        },
        score: evaluation.score,
        level: evaluation.level,
        rationale: evaluation.rationale,
        evidence: evaluation.evidence ? JSON.parse(evaluation.evidence) : [],
        evidenceStrength: evaluation.evidenceStrength,
        countTowardOverall: evaluation.countTowardOverall,
        createdAt: evaluation.createdAt,
        updatedAt: evaluation.updatedAt
      }
    })

    // Calculate competency summaries
    const competencySummaries = calculateCompetencySummaries(enrichedEvaluations, participants)

    // Get latest chunk info
    const latestChunk = await db
      .select({
        sequenceNumber: caseStudyTranscripts.sequenceNumber,
        createdAt: caseStudyTranscripts.createdAt
      })
      .from(caseStudyTranscripts)
      .where(eq(caseStudyTranscripts.sessionId, sessionId))
      .orderBy(desc(caseStudyTranscripts.sequenceNumber))
      .limit(1)

    return NextResponse.json({
      success: true,
      data: {
        session: session[0],
        participants,
        evaluations: enrichedEvaluations,
        competencySummaries,
        statistics: {
          totalEvaluations: evaluations.length,
          latestChunk: latestChunk[0]?.sequenceNumber || 0,
          lastUpdated: evaluations[0]?.updatedAt || null,
          competencyCount: getCaseStudyCompetencies().length,
          participantCount: participants.length
        },
        metadata: {
          polledAt: new Date().toISOString(),
          hasMore: false, // Could implement pagination if needed
          since: since || null
        }
      }
    })

  } catch (error) {
    console.error('Error fetching case study evaluations:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while fetching evaluations'
    }, { status: 500 })
  }
}

/**
 * Calculate competency summaries for all participants
 */
function calculateCompetencySummaries(
  evaluations: any[],
  participants: any[]
): Record<string, any> {
  const competencies = getCaseStudyCompetencies()
  const summaries: Record<string, any> = {}

  // Initialize summary structure
  for (const competencyId of competencies) {
    const competencyInfo = getCompetencyInfo(competencyId)
    summaries[competencyId] = {
      competency: {
        id: competencyId,
        name: competencyInfo?.name || competencyId,
        nameEn: competencyInfo?.name_en || competencyId
      },
      participants: {},
      overall: {
        averageScore: 0,
        totalEvaluations: 0,
        evidenceCount: 0,
        lastUpdated: null
      }
    }

    // Initialize participant scores
    for (const participant of participants) {
      summaries[competencyId].participants[participant.id] = {
        participant: {
          id: participant.id,
          name: participant.name,
          roleCode: participant.roleCode,
          roleName: participant.roleName
        },
        scores: [],
        averageScore: 0,
        latestScore: null,
        evidenceCount: 0,
        strongEvidenceCount: 0,
        lastUpdated: null,
        trend: 'stable' // 'improving', 'declining', 'stable'
      }
    }
  }

  // Process evaluations
  for (const evaluation of evaluations) {
    const competencyId = evaluation.competency.id
    const participantId = evaluation.participant?.id

    if (!summaries[competencyId] || !participantId) continue

    const participantSummary = summaries[competencyId].participants[participantId]
    if (!participantSummary) continue

    // Add score to participant
    participantSummary.scores.push({
      score: evaluation.score,
      chunkSequence: evaluation.transcript.sequenceNumber,
      evidenceStrength: evaluation.evidenceStrength,
      createdAt: evaluation.createdAt
    })

    participantSummary.evidenceCount += evaluation.evidence.length
    if (evaluation.evidenceStrength === 'strong') {
      participantSummary.strongEvidenceCount++
    }

    if (!participantSummary.lastUpdated || evaluation.updatedAt > participantSummary.lastUpdated) {
      participantSummary.lastUpdated = evaluation.updatedAt
      participantSummary.latestScore = evaluation.score
    }

    // Update overall summary
    summaries[competencyId].overall.totalEvaluations++
    summaries[competencyId].overall.evidenceCount += evaluation.evidence.length

    if (!summaries[competencyId].overall.lastUpdated || evaluation.updatedAt > summaries[competencyId].overall.lastUpdated) {
      summaries[competencyId].overall.lastUpdated = evaluation.updatedAt
    }
  }

  // Calculate averages and trends
  for (const competencyId of competencies) {
    const competencySummary = summaries[competencyId]
    let totalScore = 0
    let totalParticipants = 0

    for (const participantId of Object.keys(competencySummary.participants)) {
      const participantSummary = competencySummary.participants[participantId]

      if (participantSummary.scores.length > 0) {
        // Calculate average score
        const avgScore = participantSummary.scores.reduce((sum: number, s: any) => sum + s.score, 0) / participantSummary.scores.length
        participantSummary.averageScore = Math.round(avgScore * 10) / 10

        // Calculate trend (simple: compare first half vs second half of scores)
        if (participantSummary.scores.length >= 4) {
          const mid = Math.floor(participantSummary.scores.length / 2)
          const firstHalf = participantSummary.scores.slice(0, mid)
          const secondHalf = participantSummary.scores.slice(mid)

          const firstAvg = firstHalf.reduce((sum: number, s: any) => sum + s.score, 0) / firstHalf.length
          const secondAvg = secondHalf.reduce((sum: number, s: any) => sum + s.score, 0) / secondHalf.length

          if (secondAvg > firstAvg + 0.3) {
            participantSummary.trend = 'improving'
          } else if (secondAvg < firstAvg - 0.3) {
            participantSummary.trend = 'declining'
          }
        }

        totalScore += participantSummary.averageScore
        totalParticipants++
      }
    }

    // Calculate overall average
    if (totalParticipants > 0) {
      competencySummary.overall.averageScore = Math.round((totalScore / totalParticipants) * 10) / 10
    }
  }

  return summaries
}