import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  caseStudyTranscripts,
  assessmentSessions,
  assessmentParticipants
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

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
    const result = transcriptChunkSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input data',
        details: result.error.errors
      }, { status: 400 })
    }

    const { sessionId, rawTranscript, speakerMapping, durationSeconds, tokens } = result.data

    // Verify the session exists and is in the correct state for case study recording
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
      return NextResponse.json({
        success: false,
        error: 'Assessment session not found'
      }, { status: 404 })
    }

    // Check if session is in case study phase
    if (session[0].status !== 'case_study_in_progress') {
      return NextResponse.json({
        success: false,
        error: 'Session is not in case study phase',
        currentStatus: session[0].status
      }, { status: 400 })
    }

    // Get the next sequence number for this session
    const lastChunk = await db
      .select({ sequenceNumber: caseStudyTranscripts.sequenceNumber })
      .from(caseStudyTranscripts)
      .where(eq(caseStudyTranscripts.sessionId, sessionId))
      .orderBy(desc(caseStudyTranscripts.sequenceNumber))
      .limit(1)

    const nextSequenceNumber = lastChunk[0]?.sequenceNumber ? lastChunk[0].sequenceNumber + 1 : 1

    // Get participants for speaker mapping consolidation
    const participants = await db
      .select({
        id: assessmentParticipants.id,
        name: assessmentParticipants.name,
        roleCode: assessmentParticipants.roleCode,
        speakerLabel: assessmentParticipants.speakerLabel
      })
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.sessionId, sessionId))

    // Create consolidated transcript with participant names
    let consolidatedTranscript = rawTranscript
    const participantMap: Record<string, string> = {}

    if (speakerMapping && participants.length > 0) {
      // Build participant mapping from speaker IDs to names
      for (const [speakerId, participantId] of Object.entries(speakerMapping)) {
        const participant = participants.find(p => p.id === participantId)
        if (participant) {
          participantMap[speakerId] = `${participant.name} (${participant.roleCode})`

          // Replace speaker labels in transcript
          const speakerPattern = new RegExp(`\\b${speakerId}\\b`, 'g')
          consolidatedTranscript = consolidatedTranscript.replace(
            speakerPattern,
            participant.name
          )
        }
      }
    }

    // Store the transcript chunk
    const [newChunk] = await db
      .insert(caseStudyTranscripts)
      .values({
        sessionId,
        sequenceNumber: nextSequenceNumber,
        rawTranscript,
        consolidatedTranscript,
        speakerMapping: speakerMapping ? JSON.stringify(speakerMapping) : null,
        durationSeconds
      })
      .returning()

    if (!newChunk) {
      return NextResponse.json({
        success: false,
        error: 'Failed to store transcript chunk'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Transcript chunk stored successfully',
      data: {
        id: newChunk.id,
        sequenceNumber: nextSequenceNumber,
        participantCount: participants.length,
        speakerCount: speakerMapping ? Object.keys(speakerMapping).length : 0,
        transcriptLength: rawTranscript.length,
        durationSeconds
      }
    })

  } catch (error) {
    console.error('Error storing transcript chunk:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while storing transcript chunk'
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