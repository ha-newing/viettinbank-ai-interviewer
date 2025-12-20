'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  SonioxClient,
  type ErrorStatus,
  type RecorderState,
  type Token,
  isActiveState
} from '@soniox/speech-to-text-web'

// Update to use SDK Token type but keep backward compatibility
export interface SpeakerSegment {
  speaker: number
  text: string
  startMs: number
  endMs: number
  tokens: Token[]
}

export interface UseSpeakerDiarizationOptions {
  sessionId: string
  onTranscriptUpdate?: (segments: SpeakerSegment[], speakerMapping: Map<number, string>) => void
  onSessionStarted?: () => void
  onSessionFinished?: () => void
  onError?: (error: Error) => void
}

export interface UseSpeakerDiarizationReturn {
  startTranscription: (audioStream: MediaStream) => Promise<void>
  stopTranscription: () => void
  isSessionActive: boolean
  error: Error | null
  correctSpeaker: (speakerId: number, newName: string) => void
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  detectedSpeakers: string[]
}

interface SonioxAuthConfig {
  apiKey: string
  endpoint?: string
  config: Record<string, any>
}

export default function useSpeakerDiarization(options: UseSpeakerDiarizationOptions): UseSpeakerDiarizationReturn {
  const {
    sessionId,
    onTranscriptUpdate,
    onSessionStarted,
    onSessionFinished,
    onError
  } = options

  // SDK state management
  const [state, setState] = useState<RecorderState>('Init')
  const [segments, setSegments] = useState<SpeakerSegment[]>([])
  const [speakerMapping, setSpeakerMapping] = useState<Map<number, string>>(new Map())
  const [error, setError] = useState<Error | null>(null)

  // Refs for SDK and data management
  const clientRef = useRef<SonioxClient | null>(null)
  const allTokensRef = useRef<Token[]>([])
  const sonioxConfigRef = useRef<SonioxAuthConfig | null>(null)
  const speakerMappingRef = useRef<Map<number, string>>(new Map())

  // Get Soniox config (temporary key + recommended options) from backend
  const getSonioxConfig = useCallback(async (sessionId: string): Promise<SonioxAuthConfig> => {
    const authResponse = await fetch('/api/case-study/soniox-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    })

    if (!authResponse.ok) {
      throw new Error('Failed to get Soniox credentials')
    }

    const authData = await authResponse.json()
    if (!authData.success) {
      throw new Error(authData.error || 'Authentication failed')
    }

    return {
      apiKey: authData.data.soniox.api_key,
      endpoint: authData.data.soniox.endpoint,
      config: authData.data.soniox.config || {}
    }
  }, [])

  // Reset client on session change
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.cancel()
        clientRef.current = null
      }
      sonioxConfigRef.current = null
      allTokensRef.current = []
    }
  }, [sessionId])

  // Process tokens into speaker segments
  const processTokensIntoSegments = useCallback((tokens: Token[]): SpeakerSegment[] => {
    const newSegments: SpeakerSegment[] = []
    let currentSegment: SpeakerSegment | null = null

    tokens.forEach((token) => {
      // Skip empty or control tokens
      if (!token.text || token.text.trim() === '' ||
          token.text === '<end>' || token.text === '<start>') {
        return
      }

      // Extract speaker ID from token - Soniox provides this in different fields
      // Try multiple field names as the SDK might use different conventions
      const tokenAny = token as any
      let speaker: number

      if (typeof tokenAny.speaker === 'number') {
        speaker = tokenAny.speaker
      } else if (typeof tokenAny.speaker === 'string') {
        speaker = parseInt(tokenAny.speaker, 10)
      } else if (typeof tokenAny.speaker_id === 'number') {
        speaker = tokenAny.speaker_id
      } else if (typeof tokenAny.speaker_id === 'string') {
        speaker = parseInt(tokenAny.speaker_id, 10)
      } else {
        // Default to speaker 1 if no speaker info available
        // (speaker 0 was being skipped before, causing single-speaker display)
        speaker = 1
      }

      // Ensure speaker is a valid number (minimum 1)
      if (isNaN(speaker) || speaker < 0) {
        speaker = 1
      }

      if (!currentSegment || currentSegment.speaker !== speaker) {
        // Start new segment
        if (currentSegment) {
          newSegments.push(currentSegment)
        }
        currentSegment = {
          speaker,
          text: token.text,
          startMs: token.start_ms || 0,
          endMs: (token.start_ms || 0) + ((tokenAny).duration_ms || (tokenAny).duration || 100),
          tokens: [token],
        }
      } else {
        // Continue current segment
        currentSegment.text += token.text
        currentSegment.endMs = (token.start_ms || 0) + ((tokenAny).duration_ms || (tokenAny).duration || 100)
        currentSegment.tokens.push(token)
      }
    })

    if (currentSegment) {
      newSegments.push(currentSegment)
    }

    return newSegments
  }, [])

  // Update speaker mapping with basic labels
  const updateSpeakerMapping = useCallback((segments: SpeakerSegment[]) => {
    const mapping = new Map(speakerMappingRef.current)

    // Get unique speakers and assign basic labels if not already mapped
    const uniqueSpeakers = new Set(segments.map(s => s.speaker))
    uniqueSpeakers.forEach(speaker => {
      if (!mapping.has(speaker)) {
        mapping.set(speaker, `Speaker ${speaker}`)
      }
    })

    setSpeakerMapping(mapping)
    speakerMappingRef.current = mapping
    return mapping
  }, [])

  // Start transcription with speaker diarization
  const startTranscription = useCallback(async (audioStream: MediaStream) => {
    try {
      setError(null)

      // Ensure Soniox config and client are initialized
      if (!sonioxConfigRef.current) {
        sonioxConfigRef.current = await getSonioxConfig(sessionId)
      }

      if (!clientRef.current) {
        clientRef.current = new SonioxClient({
          apiKey: () => sonioxConfigRef.current?.apiKey || '',
          webSocketUri: sonioxConfigRef.current?.endpoint
        })
      }

      const sonioxConfig = sonioxConfigRef.current?.config || {}

      await clientRef.current.start({
        model: sonioxConfig.model || 'stt-rt-v3',
        languageHints: sonioxConfig.language_hints || ['vi', 'en'], // Vietnamese and English
        context: sonioxConfig.context,
        enableLanguageIdentification: sonioxConfig.enable_language_identification ?? true,
        enableSpeakerDiarization: sonioxConfig.enable_speaker_diarization ?? true, // Enable speaker diarization
        enableEndpointDetection: sonioxConfig.enable_endpoint_detection ?? true,
        audioFormat: sonioxConfig.audio_format || 'pcm_s16le',
        sampleRate: sonioxConfig.sample_rate || 16000,
        numChannels: sonioxConfig.num_channels || 1,
        clientReferenceId: `case-study-${sessionId}`,
        stream: audioStream, // Let SDK handle audio processing

        onStarted: () => {
          console.log('Soniox transcription with speaker diarization started')
          setState('Running')
          onSessionStarted?.()
        },

        onFinished: () => {
          console.log('Soniox transcription finished')
          setState('Finished')
          onSessionFinished?.()
        },

        onError: (status: ErrorStatus, message: string, errorCode: number | undefined) => {
          console.error('Soniox transcription error:', { status, message, errorCode })
          setState('Error')
          const error = new Error(`Soniox error: ${message} (${status})`)
          setError(error)
          onError?.(error)
        },

        onStateChange: ({ newState }) => {
          setState(newState)
        },

        onPartialResult: (result) => {
          // Collect tokens (both final and non-final)
          const newFinalTokens: Token[] = []
          const newNonFinalTokens: Token[] = []

          for (const token of result.tokens) {
            if (token.is_final) {
              newFinalTokens.push(token)
            } else {
              newNonFinalTokens.push(token)
            }
          }

          // Update all tokens (keep existing final tokens, add new ones, replace non-final)
          const existingFinalTokens = allTokensRef.current.filter(t => t.is_final)
          const allTokens = [...existingFinalTokens, ...newFinalTokens, ...newNonFinalTokens]
          allTokensRef.current = allTokens

          // Process tokens into speaker segments
          const newSegments = processTokensIntoSegments(allTokens)
          setSegments(newSegments)

          // Update speaker mapping with basic labels
          const mapping = updateSpeakerMapping(newSegments)

          // Notify parent component
          onTranscriptUpdate?.(newSegments, mapping)
        },
      })

    } catch (error) {
      console.error('Failed to start transcription:', error)
      setState('Error')
      const err = error instanceof Error ? error : new Error('Failed to start transcription')
      setError(err)
      onError?.(err)
    }
  }, [processTokensIntoSegments, updateSpeakerMapping, onSessionStarted, onSessionFinished, onTranscriptUpdate, onError])

  // Stop transcription
  const stopTranscription = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stop()
    }
  }, [])

  // Handle manual speaker correction
  const correctSpeaker = useCallback((speakerId: number, newName: string) => {
    console.log(`Manual speaker correction: Speaker ${speakerId} -> ${newName}`)

    // Update mapping immediately
    const newMapping = new Map(speakerMappingRef.current)
    newMapping.set(speakerId, newName)
    setSpeakerMapping(newMapping)
    speakerMappingRef.current = newMapping

    // Notify parent component
    if (segments.length > 0) {
      onTranscriptUpdate?.(segments, newMapping)
    }
  }, [segments, onTranscriptUpdate])

  // Map SDK state to our connection status
  const connectionStatus = (() => {
    switch (state) {
      case 'Init':
      case 'Finished':
      case 'Canceled':
        return 'disconnected'
      case 'RequestingMedia':
      case 'OpeningWebSocket':
      case 'FinishingProcessing':
        return 'connecting'
      case 'Running':
        return 'connected'
      case 'Error':
        return 'error'
      default:
        return 'disconnected'
    }
  })() as 'disconnected' | 'connecting' | 'connected' | 'error'

  // Get detected speakers for backward compatibility
  const detectedSpeakers = Array.from(speakerMapping.keys()).map(id => id.toString())

  // Check if session is active using SDK helper
  const isSessionActive = isActiveState(state)

  return {
    startTranscription,
    stopTranscription,
    isSessionActive,
    error,
    correctSpeaker,
    connectionStatus,
    detectedSpeakers
  }
}
