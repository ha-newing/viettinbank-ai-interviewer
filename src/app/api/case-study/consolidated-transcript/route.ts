import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  caseStudyTranscriptVersions,
  assessmentSessions,
  assessmentParticipants,
  caseStudyEvaluations
} from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { evaluateAllCompetencies } from '@/lib/case-study-evaluation'

// Validation schema for consolidated transcript submission
const consolidatedTranscriptSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  fullTranscript: z.string().min(1, 'Transcript cannot be empty'),
  speakerMapping: z.record(z.string(), z.string()).optional(), // {"Speaker 1": "participant_id"}
  totalDurationSeconds: z.number().min(1).optional(),
  timestamp: z.number().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📥 Received consolidated transcript request:', {
      sessionId: body.sessionId,
      transcriptLength: body.fullTranscript?.length || 0,
      speakerMappingKeys: body.speakerMapping ? Object.keys(body.speakerMapping) : [],
      totalDurationSeconds: body.totalDurationSeconds,
      timestamp: body.timestamp
    })

    const result = consolidatedTranscriptSchema.safeParse(body)

    if (!result.success) {
      console.error('❌ Schema validation failed:', {
        sessionId: body.sessionId,
        errors: result.error.errors
      })
      return NextResponse.json({
        success: false,
        error: 'Invalid input data',
        details: result.error.errors
      }, { status: 400 })
    }

    console.log('✅ Schema validation passed')
    const { sessionId, fullTranscript, speakerMapping, totalDurationSeconds } = result.data

    // Verify the session exists and is in the correct state for case study recording
    console.log('🔍 Looking up session:', sessionId)
    const session = await db
      .select({
        id: assessmentSessions.id,
        status: assessmentSessions.status,
        organizationId: assessmentSessions.organizationId,
        name: assessmentSessions.name
      })
      .from(assessmentSessions)
      .where(eq(assessmentSessions.id, sessionId))
      .limit(1)

    if (!session[0]) {
      console.error('❌ Session not found:', sessionId)
      return NextResponse.json({
        success: false,
        error: 'Assessment session not found'
      }, { status: 404 })
    }

    console.log('✅ Session found:', {
      id: session[0].id,
      status: session[0].status,
      organizationId: session[0].organizationId,
      name: session[0].name
    })

    // Check if session is in case study phase
    if (session[0].status !== 'case_study_in_progress') {
      console.error('❌ Session not in case study phase:', {
        sessionId,
        currentStatus: session[0].status,
        expectedStatus: 'case_study_in_progress'
      })
      return NextResponse.json({
        success: false,
        error: 'Session is not in case study phase',
        currentStatus: session[0].status
      }, { status: 400 })
    }

    console.log('✅ Session status verified - case study in progress')

    // Get the next version number for this session
    console.log('🔍 Getting latest transcript version for session:', sessionId)
    const latestVersion = await db
      .select({ version: caseStudyTranscriptVersions.version })
      .from(caseStudyTranscriptVersions)
      .where(eq(caseStudyTranscriptVersions.sessionId, sessionId))
      .orderBy(desc(caseStudyTranscriptVersions.version))
      .limit(1)

    const nextVersion = latestVersion[0]?.version ? latestVersion[0].version + 1 : 1
    console.log('📊 Version number calculated:', {
      latestVersion: latestVersion[0]?.version || 'none',
      nextVersion
    })

    // Get participants for evaluation context
    console.log('👥 Getting participants for session:', sessionId)
    const participants = await db
      .select({
        id: assessmentParticipants.id,
        name: assessmentParticipants.name,
        roleCode: assessmentParticipants.roleCode,
        speakerLabel: assessmentParticipants.speakerLabel
      })
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.sessionId, sessionId))

    console.log('✅ Participants found:', {
      count: participants.length,
      participants: participants.map(p => ({ id: p.id, name: p.name, roleCode: p.roleCode }))
    })

    console.log('📝 Full transcript preview:', {
      length: fullTranscript.length,
      preview: fullTranscript.substring(0, 300) + (fullTranscript.length > 300 ? '...' : ''),
      speakerMappingCount: speakerMapping ? Object.keys(speakerMapping).length : 0
    })

    // Store the consolidated transcript version
    console.log('💾 Attempting to store consolidated transcript in database')
    let newVersion
    try {
      const insertValues = {
        sessionId,
        version: nextVersion,
        fullTranscript,
        speakerMapping: speakerMapping ? JSON.stringify(speakerMapping) : null,
        totalDurationSeconds: totalDurationSeconds || null
      }

      console.log('📋 Insert values:', {
        sessionId: insertValues.sessionId,
        version: insertValues.version,
        fullTranscriptLength: insertValues.fullTranscript.length,
        hasSpeakerMapping: !!insertValues.speakerMapping,
        totalDurationSeconds: insertValues.totalDurationSeconds
      })

      const result = await db
        .insert(caseStudyTranscriptVersions)
        .values(insertValues)
        .returning()

      newVersion = result[0]

      if (!newVersion) {
        console.error('❌ Database insert returned no version')
        return NextResponse.json({
          success: false,
          error: 'Failed to store consolidated transcript'
        }, { status: 500 })
      }

      console.log('✅ Consolidated transcript stored successfully:', {
        id: newVersion.id,
        version: newVersion.version,
        createdAt: newVersion.createdAt
      })
    } catch (dbError) {
      console.error('❌ Database insert failed:', dbError)
      return NextResponse.json({
        success: false,
        error: 'Database error while storing consolidated transcript',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 })
    }

    // Trigger competency evaluation for the full transcript (async, don't wait)
    console.log('🚀 Triggering competency evaluation for full transcript:', newVersion.id)
    processConsolidatedEvaluation({
      transcriptVersionId: newVersion.id,
      sessionId,
      version: nextVersion,
      fullTranscript,
      participants,
      session: session[0]
    }).catch(error => {
      console.error('❌ Error processing consolidated evaluation:', error)
    })

    const responseData = {
      success: true,
      message: 'Consolidated transcript stored successfully',
      data: {
        id: newVersion.id,
        version: nextVersion,
        participantCount: participants.length,
        speakerCount: speakerMapping ? Object.keys(speakerMapping).length : 0,
        transcriptLength: fullTranscript.length,
        totalDurationSeconds: totalDurationSeconds || null,
        evaluationTriggered: true
      }
    }

    console.log('🎉 Sending successful response:', {
      versionId: responseData.data.id,
      version: responseData.data.version,
      participantCount: responseData.data.participantCount,
      speakerCount: responseData.data.speakerCount,
      transcriptLength: responseData.data.transcriptLength
    })

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('💥 Unexpected error in consolidated transcript route:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({
      success: false,
      error: 'Internal server error while storing consolidated transcript',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Get consolidated transcript versions for a session
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const limit = parseInt(url.searchParams.get('limit') || '10')

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, { status: 400 })
    }

    // Verify session exists
    const session = await db
      .select({ id: assessmentSessions.id })
      .from(assessmentSessions)
      .where(eq(assessmentSessions.id, sessionId))
      .limit(1)

    if (!session[0]) {
      return NextResponse.json({
        success: false,
        error: 'Assessment session not found'
      }, { status: 404 })
    }

    // Get transcript versions
    const versions = await db
      .select({
        id: caseStudyTranscriptVersions.id,
        version: caseStudyTranscriptVersions.version,
        fullTranscript: caseStudyTranscriptVersions.fullTranscript,
        speakerMapping: caseStudyTranscriptVersions.speakerMapping,
        totalDurationSeconds: caseStudyTranscriptVersions.totalDurationSeconds,
        createdAt: caseStudyTranscriptVersions.createdAt
      })
      .from(caseStudyTranscriptVersions)
      .where(eq(caseStudyTranscriptVersions.sessionId, sessionId))
      .orderBy(desc(caseStudyTranscriptVersions.version))
      .limit(limit)

    return NextResponse.json({
      success: true,
      data: {
        versions: versions.map(version => ({
          ...version,
          speakerMapping: version.speakerMapping ? JSON.parse(version.speakerMapping) : null
        })),
        count: versions.length,
        sessionId
      }
    })

  } catch (error) {
    console.error('Error fetching consolidated transcript versions:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while fetching transcript versions'
    }, { status: 500 })
  }
}

// Background evaluation processing function for consolidated transcript
async function processConsolidatedEvaluation({
  transcriptVersionId,
  sessionId,
  version,
  fullTranscript,
  participants,
  session
}: {
  transcriptVersionId: string
  sessionId: string
  version: number
  fullTranscript: string
  participants: any[]
  session: any
}) {
  try {
    console.log(`Starting evaluation for consolidated transcript version ${version} of session ${sessionId}`)

    // Skip evaluation if transcript is too short
    if (fullTranscript.trim().length < 100) {
      console.log(`Skipping evaluation - transcript too short (${fullTranscript.length} chars)`)
      return
    }

    // Prepare evaluation request
    const evaluationRequest = {
      transcriptChunk: fullTranscript, // Use full transcript as "chunk"
      participants: participants.map(p => ({
        id: p.id,
        name: p.name,
        roleCode: p.roleCode,
        roleName: p.roleName
      })),
      chunkSequence: version, // Use version number as sequence
      sessionContext: {
        sessionId,
        sessionName: session.name,
        totalDuration: 120, // 120 minutes
        caseStudyScenario: 'VietinBank Eastern Saigon branch - NPL 2.4%, NPS 32, strategic planning for 2026'
      }
    }

    // Evaluate all case study competencies on the full transcript
    const evaluationResults = await evaluateAllCompetencies(evaluationRequest)

    // Store evaluation results in database
    // Link evaluations to consolidated transcript versions (session-based approach)
    for (const competencyId of ['strategic_thinking', 'innovation', 'risk_balance', 'digital_transformation']) {
      const competencyResult = evaluationResults[competencyId]

      if (!competencyResult.success) {
        console.error(`Evaluation failed for competency ${competencyId}:`, competencyResult.error)
        continue
      }

      for (const evaluation of competencyResult.evaluations) {
        try {
          await db.insert(caseStudyEvaluations).values({
            sessionId,
            participantId: evaluation.participantId,
            transcriptId: transcriptVersionId, // Links to consolidated transcript version (session-based)
            competencyId: evaluation.competencyId,
            score: evaluation.score,
            level: evaluation.level,
            rationale: evaluation.rationale,
            evidence: JSON.stringify(evaluation.evidence),
            evidenceStrength: evaluation.evidenceStrength,
            countTowardOverall: evaluation.score > 0, // Only count if there's actual evidence
          })
        } catch (dbError) {
          console.error('Error storing evaluation:', dbError)
        }
      }
    }

    console.log(`Completed evaluation for consolidated transcript version ${version} of session ${sessionId}`)

  } catch (error) {
    console.error('Error in processConsolidatedEvaluation:', error)
  }
}