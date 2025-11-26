import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  caseStudyTranscripts,
  assessmentSessions,
  assessmentParticipants,
  caseStudyEvaluations
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { evaluateAllCompetencies, getCaseStudyCompetencies } from '@/lib/case-study-evaluation'

// Validation schema for transcript chunk submission
const transcriptChunkSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  rawTranscript: z.string().min(1, 'Transcript cannot be empty'),
  speakerMapping: z.record(z.string(), z.string()).optional(), // {"Speaker 1": "participant_id", "Speaker 2": "participant_id"}
  durationSeconds: z.number().min(1).max(120), // 60-second chunks, allow up to 2 minutes for flexibility
  tokens: z.array(z.object({
    text: z.string(),
    speaker: z.string().optional(),
    start_time: z.number().optional(),
    duration: z.number().optional(),
    is_final: z.boolean().optional(),
    confidence: z.number().optional()
  })).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📥 Received transcript chunk request:', {
      sessionId: body.sessionId,
      transcriptLength: body.rawTranscript?.length || 0,
      speakerMappingKeys: body.speakerMapping ? Object.keys(body.speakerMapping) : [],
      durationSeconds: body.durationSeconds,
      tokenCount: body.tokens?.length || 0
    })

    const result = transcriptChunkSchema.safeParse(body)

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
    const { sessionId, rawTranscript, speakerMapping, durationSeconds, tokens } = result.data

    // Verify the session exists and is in the correct state for case study recording
    console.log('🔍 Looking up session:', sessionId)
    const session = await db
      .select({
        id: assessmentSessions.id,
        status: assessmentSessions.status,
        organizationId: assessmentSessions.organizationId
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
      organizationId: session[0].organizationId
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

    // Get the next sequence number for this session
    console.log('🔍 Getting last chunk sequence number for session:', sessionId)
    const lastChunk = await db
      .select({ sequenceNumber: caseStudyTranscripts.sequenceNumber })
      .from(caseStudyTranscripts)
      .where(eq(caseStudyTranscripts.sessionId, sessionId))
      .orderBy(desc(caseStudyTranscripts.sequenceNumber))
      .limit(1)

    const nextSequenceNumber = lastChunk[0]?.sequenceNumber ? lastChunk[0].sequenceNumber + 1 : 1
    console.log('📊 Sequence number calculated:', {
      lastSequence: lastChunk[0]?.sequenceNumber || 'none',
      nextSequence: nextSequenceNumber
    })

    // Get participants for speaker mapping consolidation
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

    // Create consolidated transcript with participant names
    console.log('🔄 Processing speaker mapping and consolidating transcript')
    let consolidatedTranscript = rawTranscript
    const participantMap: Record<string, string> = {}

    console.log('📝 Raw transcript preview:', {
      length: rawTranscript.length,
      preview: rawTranscript.substring(0, 200) + (rawTranscript.length > 200 ? '...' : '')
    })

    if (speakerMapping && participants.length > 0) {
      console.log('🔗 Building speaker mapping:', speakerMapping)
      // Build participant mapping from speaker IDs to names
      for (const [speakerId, participantId] of Object.entries(speakerMapping)) {
        const participant = participants.find(p => p.id === participantId)
        if (participant) {
          participantMap[speakerId] = `${participant.name} (${participant.roleCode})`
          console.log(`✅ Mapped speaker ${speakerId} -> ${participant.name} (${participant.roleCode})`)

          // Replace speaker labels in transcript
          const speakerPattern = new RegExp(`\\b${speakerId}\\b`, 'g')
          consolidatedTranscript = consolidatedTranscript.replace(
            speakerPattern,
            participant.name
          )
        } else {
          console.warn(`⚠️ No participant found for speaker ${speakerId} with participantId ${participantId}`)
        }
      }
    } else {
      console.log('ℹ️ No speaker mapping or participants available')
    }

    console.log('📝 Consolidated transcript preview:', {
      length: consolidatedTranscript.length,
      preview: consolidatedTranscript.substring(0, 200) + (consolidatedTranscript.length > 200 ? '...' : ''),
      participantMapCount: Object.keys(participantMap).length
    })

    // Store the transcript chunk
    console.log('💾 Attempting to store transcript chunk in database')
    let newChunk
    try {
      const insertValues = {
        sessionId,
        sequenceNumber: nextSequenceNumber,
        rawTranscript,
        consolidatedTranscript,
        speakerMapping: speakerMapping ? JSON.stringify(speakerMapping) : null,
        durationSeconds
      }

      console.log('📋 Insert values:', {
        sessionId: insertValues.sessionId,
        sequenceNumber: insertValues.sequenceNumber,
        rawTranscriptLength: insertValues.rawTranscript.length,
        consolidatedTranscriptLength: insertValues.consolidatedTranscript.length,
        hasSpeakerMapping: !!insertValues.speakerMapping,
        durationSeconds: insertValues.durationSeconds
      })

      const result = await db
        .insert(caseStudyTranscripts)
        .values(insertValues)
        .returning()

      newChunk = result[0]

      if (!newChunk) {
        console.error('❌ Database insert returned no chunk')
        return NextResponse.json({
          success: false,
          error: 'Failed to store transcript chunk'
        }, { status: 500 })
      }

      console.log('✅ Transcript chunk stored successfully:', {
        id: newChunk.id,
        sequenceNumber: newChunk.sequenceNumber,
        createdAt: newChunk.createdAt
      })
    } catch (dbError) {
      console.error('❌ Database insert failed:', dbError)
      return NextResponse.json({
        success: false,
        error: 'Database error while storing transcript chunk',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 })
    }

    // Trigger competency evaluation for this chunk (async, don't wait)
    console.log('🚀 Triggering competency evaluation for chunk:', newChunk.id)
    processChunkEvaluation({
      transcriptId: newChunk.id,
      sessionId,
      sequenceNumber: nextSequenceNumber,
      consolidatedTranscript,
      participants,
      session: session[0]
    }).catch(error => {
      console.error('❌ Error processing chunk evaluation:', error)
    })

    const responseData = {
      success: true,
      message: 'Transcript chunk stored successfully',
      data: {
        id: newChunk.id,
        sequenceNumber: nextSequenceNumber,
        participantCount: participants.length,
        speakerCount: speakerMapping ? Object.keys(speakerMapping).length : 0,
        transcriptLength: rawTranscript.length,
        durationSeconds,
        evaluationTriggered: true
      }
    }

    console.log('🎉 Sending successful response:', {
      chunkId: responseData.data.id,
      sequenceNumber: responseData.data.sequenceNumber,
      participantCount: responseData.data.participantCount,
      speakerCount: responseData.data.speakerCount,
      transcriptLength: responseData.data.transcriptLength
    })

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('💥 Unexpected error in transcript chunk route:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({
      success: false,
      error: 'Internal server error while storing transcript chunk',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Get transcript chunks for a session (for real-time display)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const since = url.searchParams.get('since') // timestamp to get chunks after
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

    // Build query conditions
    let conditions = eq(caseStudyTranscripts.sessionId, sessionId)

    if (since) {
      const sinceDate = new Date(since)
      conditions = and(
        conditions,
        // Only include chunks created after the 'since' timestamp
        // This requires a comparison that works with SQLite date storage
      ) as any
    }

    // Get transcript chunks
    const chunks = await db
      .select({
        id: caseStudyTranscripts.id,
        sequenceNumber: caseStudyTranscripts.sequenceNumber,
        rawTranscript: caseStudyTranscripts.rawTranscript,
        consolidatedTranscript: caseStudyTranscripts.consolidatedTranscript,
        speakerMapping: caseStudyTranscripts.speakerMapping,
        durationSeconds: caseStudyTranscripts.durationSeconds,
        createdAt: caseStudyTranscripts.createdAt
      })
      .from(caseStudyTranscripts)
      .where(conditions)
      .orderBy(desc(caseStudyTranscripts.sequenceNumber))
      .limit(limit)

    return NextResponse.json({
      success: true,
      data: {
        chunks: chunks.map(chunk => ({
          ...chunk,
          speakerMapping: chunk.speakerMapping ? JSON.parse(chunk.speakerMapping) : null
        })),
        count: chunks.length,
        sessionId
      }
    })

  } catch (error) {
    console.error('Error fetching transcript chunks:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while fetching transcript chunks'
    }, { status: 500 })
  }
}

// Background evaluation processing function
async function processChunkEvaluation({
  transcriptId,
  sessionId,
  sequenceNumber,
  consolidatedTranscript,
  participants,
  session
}: {
  transcriptId: string
  sessionId: string
  sequenceNumber: number
  consolidatedTranscript: string
  participants: any[]
  session: any
}) {
  try {
    console.log(`Starting evaluation for chunk #${sequenceNumber} of session ${sessionId}`)

    // Skip evaluation if transcript is too short
    if (consolidatedTranscript.trim().length < 50) {
      console.log(`Skipping evaluation - transcript too short (${consolidatedTranscript.length} chars)`)
      return
    }

    // Prepare evaluation request
    const evaluationRequest = {
      transcriptChunk: consolidatedTranscript,
      participants: participants.map(p => ({
        id: p.id,
        name: p.name,
        roleCode: p.roleCode,
        roleName: p.roleName
      })),
      chunkSequence: sequenceNumber,
      sessionContext: {
        sessionId,
        sessionName: session.name,
        totalDuration: 120, // 120 minutes
        caseStudyScenario: 'VietinBank Eastern Saigon branch - NPL 2.4%, NPS 32, strategic planning for 2026'
      }
    }

    // Evaluate all case study competencies
    const evaluationResults = await evaluateAllCompetencies(evaluationRequest)

    // Store evaluation results in database
    for (const competencyId of getCaseStudyCompetencies()) {
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
            transcriptId,
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

    console.log(`Completed evaluation for chunk #${sequenceNumber} of session ${sessionId}`)

  } catch (error) {
    console.error('Error in processChunkEvaluation:', error)
  }
}