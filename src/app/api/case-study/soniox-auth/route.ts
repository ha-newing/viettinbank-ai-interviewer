import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { assessmentSessions, assessmentParticipants } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// Validation schema for Soniox auth request
const sonioxAuthSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  participantRole: z.enum(['A', 'B', 'C', 'D', 'E']).optional() // For participant-specific access
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = sonioxAuthSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input data',
        details: result.error.errors
      }, { status: 400 })
    }

    const { sessionId, participantRole } = result.data

    // Verify the session exists and is in case study phase
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
      return NextResponse.json({
        success: false,
        error: 'Assessment session not found'
      }, { status: 404 })
    }

    // Check if session is in case study phase (allow both in_progress and completed for restart)
    const allowedStatuses = ['case_study_in_progress', 'case_study_completed']
    if (!allowedStatuses.includes(session[0].status)) {
      return NextResponse.json({
        success: false,
        error: 'Session is not in case study phase',
        currentStatus: session[0].status
      }, { status: 400 })
    }

    // Get participants for the session
    const participants = await db
      .select({
        id: assessmentParticipants.id,
        name: assessmentParticipants.name,
        roleCode: assessmentParticipants.roleCode,
        roleName: assessmentParticipants.roleName,
        speakerLabel: assessmentParticipants.speakerLabel
      })
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.sessionId, sessionId))
      .orderBy(assessmentParticipants.roleCode)

    // Verify API key is available
    const sonioxApiKey = process.env.SONIOX_API_KEY
    if (!sonioxApiKey) {
      console.error('SONIOX_API_KEY not configured')
      return NextResponse.json({
        success: false,
        error: 'Soniox service not configured'
      }, { status: 500 })
    }

    // Generate temporary API key from Soniox (using correct endpoint)
    const tempKeyResponse = await fetch('https://api.soniox.com/v1/auth/temporary-api-key', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sonioxApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usage_type: 'transcribe_websocket',
        expires_in_seconds: 3600 // 1 hour (Soniox max limit)
      })
    })

    if (!tempKeyResponse.ok) {
      const errorText = await tempKeyResponse.text()
      console.error('Failed to generate temporary API key:', errorText)
      return NextResponse.json({
        success: false,
        error: 'Failed to generate temporary authentication credentials'
      }, { status: 500 })
    }

    const tempKeyData = await tempKeyResponse.json()
    const temporaryApiKey = tempKeyData.api_key

    // Soniox WebSocket configuration for group discussion
    const sonioxConfig = {
      // WebSocket endpoint
      endpoint: 'wss://stt-rt.soniox.com/transcribe-websocket',

      // Authentication
      api_key: temporaryApiKey, // Temporary API key for WebSocket auth

      // Audio processing config
      config: {
        model: 'stt-rt-v3', // Real-time model
        language_hints: ['vi', 'en'], // Vietnamese primary, English fallback
        enable_language_identification: true,
        enable_speaker_diarization: true, // Critical for 5-person group
        enable_endpoint_detection: true, // Finalizes tokens when speaker stops
        enable_punctuation: true,
        enable_partial_results: true, // For real-time feedback
        audio_format: 'auto', // Auto-detect from browser

        // Context for better accuracy
        context: {
          general: [
            { key: 'domain', value: 'business_discussion' },
            { key: 'topic', value: 'banking_case_study' }
          ],
          terms: [
            'VietinBank', 'NPL', 'NPS', 'Eastern Saigon',
            'corporate banking', 'retail banking', 'risk management',
            'digital transformation', 'operations'
          ]
        },

        // Speaker diarization settings for group
        speaker_diarization: {
          max_speakers: participants.length, // Exact number of participants
          min_speakers: participants.length
        }
      }
    }

    // Generate session metadata for client
    const sessionMetadata = {
      sessionId,
      sessionName: session[0].name,
      status: session[0].status,
      participants: participants.map(p => ({
        id: p.id,
        name: p.name,
        roleCode: p.roleCode,
        roleName: p.roleName,
        speakerLabel: p.speakerLabel
      })),
      expectedDuration: 120 * 60, // 120 minutes in seconds
      chunkInterval: 60, // 60-second chunks

      // Instructions for client
      instructions: {
        setupSteps: [
          '1. Request microphone permissions',
          '2. Connect to Soniox WebSocket',
          '3. Send configuration as first message',
          '4. Stream audio chunks continuously',
          '5. Process real-time tokens with speaker diarization',
          '6. Send 60-second transcript chunks to backend'
        ],

        errorHandling: [
          'Implement exponential backoff for WebSocket reconnection',
          'Queue failed chunks for retry',
          'Notify users of connection issues',
          'Fallback to local recording if WebSocket fails'
        ]
      }
    }

    // Log the auth request for monitoring
    console.log('Soniox auth granted:', {
      sessionId,
      sessionName: session[0].name,
      participantCount: participants.length,
      participantRole,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Soniox authentication credentials provided',
      data: {
        soniox: sonioxConfig,
        session: sessionMetadata,

        // Security notes for client
        security: {
          note: 'Temporary API key provided for secure WebSocket connection to Soniox',
          restrictions: [
            'Temporary key expires in 1 hour',
            'Use only for this session',
            'Do not store permanently',
            'Connection expires when session ends'
          ],
          expires_in_seconds: 3600
        }
      }
    })

  } catch (error) {
    console.error('Error providing Soniox auth:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while setting up Soniox authentication'
    }, { status: 500 })
  }
}

// Get current session status (for monitoring)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, { status: 400 })
    }

    // Get session info
    const session = await db
      .select({
        id: assessmentSessions.id,
        name: assessmentSessions.name,
        status: assessmentSessions.status,
        createdAt: assessmentSessions.createdAt
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
        roleCode: assessmentParticipants.roleCode
      })
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.sessionId, sessionId))

    return NextResponse.json({
      success: true,
      data: {
        session: session[0],
        participantCount: participants.length,
        canStartRecording: session[0].status === 'case_study_in_progress',
        sonioxAvailable: !!process.env.SONIOX_API_KEY
      }
    })

  } catch (error) {
    console.error('Error getting session status:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while checking session status'
    }, { status: 500 })
  }
}