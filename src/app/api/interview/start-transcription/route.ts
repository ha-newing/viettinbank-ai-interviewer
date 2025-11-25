import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for individual question transcription
const transcriptionSchema = z.object({
  questionId: z.string().optional(),
  context: z.object({
    type: z.enum(['tbei', 'hipo', 'general']).default('general'),
    questionText: z.string().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = transcriptionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input data',
        details: result.error.errors
      }, { status: 400 })
    }

    const { questionId, context } = result.data

    // Verify API key is available
    const sonioxApiKey = process.env.SONIOX_API_KEY
    if (!sonioxApiKey) {
      console.error('SONIOX_API_KEY not configured')
      return NextResponse.json({
        success: false,
        error: 'Transcription service not configured'
      }, { status: 500 })
    }

    // Generate temporary API key from Soniox
    const tempKeyResponse = await fetch('https://api.soniox.com/v1/auth/temporary-api-key', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sonioxApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usage_type: 'transcribe_websocket',
        expires_in_seconds: 1800 // 30 minutes for individual questions
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

    // Soniox WebSocket configuration for individual question transcription
    const sonioxConfig = {
      // WebSocket endpoint
      endpoint: 'wss://stt-rt.soniox.com/transcribe-websocket',

      // Authentication
      api_key: temporaryApiKey,

      // Audio processing config optimized for single-person interviews
      config: {
        model: 'stt-rt-v3', // Real-time model
        language_hints: ['vi', 'en'], // Vietnamese primary, English fallback
        enable_language_identification: true,
        enable_speaker_diarization: false, // Single speaker for interviews
        enable_endpoint_detection: true,
        enable_punctuation: true,
        enable_partial_results: true,
        audio_format: 'pcm_s16le',
        sample_rate: 16000,
        num_channels: 1,

        // Context for better accuracy
        context: {
          general: [
            { key: 'domain', value: 'interview_assessment' },
            { key: 'type', value: context?.type || 'general' }
          ],
          terms: [
            'VietinBank', 'Ngân hàng', 'HiPo', 'TBEI',
            'lãnh đạo', 'phát triển', 'năng lực',
            'khát vọng', 'gắn kết', 'tích hợp',
            'nghề nghiệp', 'tổ chức', 'đội nhóm'
          ]
        }
      }
    }

    // Generate session metadata for client
    const sessionMetadata = {
      questionId: questionId || 'individual-question',
      type: 'individual_transcription',
      context: context,
      expectedDuration: 30 * 60, // 30 minutes in seconds
      chunkInterval: 60, // 60-second chunks

      // Instructions for client
      instructions: {
        setupSteps: [
          '1. Request microphone permissions',
          '2. Connect to Soniox WebSocket',
          '3. Send configuration as first message',
          '4. Stream audio chunks continuously',
          '5. Process real-time tokens',
          '6. Finalize transcript when done'
        ],

        errorHandling: [
          'Implement exponential backoff for WebSocket reconnection',
          'Queue failed chunks for retry',
          'Notify users of connection issues',
          'Fallback to local recording if WebSocket fails'
        ]
      }
    }

    // Log the transcription request for monitoring
    console.log('Individual transcription started:', {
      questionId: questionId || 'unknown',
      type: context?.type || 'general',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Transcription credentials provided for individual question',
      data: {
        soniox: sonioxConfig,
        session: sessionMetadata,

        // Security notes for client
        security: {
          note: 'Temporary API key provided for secure WebSocket connection to Soniox',
          restrictions: [
            'Temporary key expires in 30 minutes',
            'Use only for this transcription session',
            'Do not store permanently',
            'Connection expires when transcription ends'
          ],
          expires_in_seconds: 1800
        }
      }
    })

  } catch (error) {
    console.error('Error providing transcription credentials:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while setting up transcription'
    }, { status: 500 })
  }
}

// Get transcription service status
export async function GET() {
  try {
    const sonioxAvailable = !!process.env.SONIOX_API_KEY

    return NextResponse.json({
      success: true,
      data: {
        transcriptionAvailable: sonioxAvailable,
        supportedLanguages: ['vi', 'en'],
        maxDuration: 30 * 60, // 30 minutes
        audioFormat: 'pcm_s16le'
      }
    })

  } catch (error) {
    console.error('Error checking transcription status:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while checking transcription status'
    }, { status: 500 })
  }
}