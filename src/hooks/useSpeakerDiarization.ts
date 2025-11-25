'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface SonioxToken {
  text: string
  speaker?: string
  start_time?: number
  duration?: number
  is_final?: boolean
  confidence?: number
}

export interface SpeakerSegment {
  speaker: number
  text: string
  startMs: number
  endMs: number
  tokens: SonioxToken[]
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

export default function useSpeakerDiarization(options: UseSpeakerDiarizationOptions): UseSpeakerDiarizationReturn {
  const {
    sessionId,
    onTranscriptUpdate,
    onSessionStarted,
    onSessionFinished,
    onError
  } = options

  // State
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([])

  // Refs
  const websocketRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isReconnectingRef = useRef(false)
  const connectionAttemptsRef = useRef(0)
  const speakerSegmentsRef = useRef<SpeakerSegment[]>([])
  const speakerMappingRef = useRef<Map<number, string>>(new Map())
  const currentTokensRef = useRef<SonioxToken[]>([])
  const audioBufferRef = useRef<Int16Array[]>([])
  const lastAudioSendRef = useRef(0)

  // Constants
  const AUDIO_SEND_THROTTLE_MS = 100
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY_MS = 2000
  const HEARTBEAT_INTERVAL_MS = 25000
  const WEBSOCKET_TIMEOUT_MS = 10000

  // Clean up resources
  const cleanup = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect()
      audioProcessorRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (websocketRef.current) {
      websocketRef.current.close()
      websocketRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
  }, [])

  // Send heartbeat to keep connection alive
  const sendHeartbeat = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      try {
        websocketRef.current.send(JSON.stringify({ type: 'ping' }))
      } catch (error) {
        console.warn('Failed to send heartbeat:', error)
      }
    }
  }, [])

  // Start heartbeat mechanism
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
    }
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
  }, [sendHeartbeat])

  // Send audio data with throttling
  const sendAudioData = useCallback((audioData: ArrayBuffer) => {
    const now = Date.now()
    if (now - lastAudioSendRef.current < AUDIO_SEND_THROTTLE_MS) {
      audioBufferRef.current.push(new Int16Array(audioData))
      return
    }

    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      try {
        websocketRef.current.send(audioData)
        lastAudioSendRef.current = now

        // Send any buffered audio data
        while (audioBufferRef.current.length > 0) {
          const bufferedData = audioBufferRef.current.shift()
          if (bufferedData) {
            websocketRef.current.send(bufferedData.buffer)
          }
        }
      } catch (error) {
        console.warn('Failed to send audio data:', error)
        setError(new Error('Audio send failed'))
      }
    } else {
      console.warn('WebSocket not ready, buffering audio data')
      audioBufferRef.current.push(new Int16Array(audioData))
    }
  }, [])

  // Process Soniox tokens into speaker segments
  const processTokensIntoSegments = useCallback((tokens: SonioxToken[]) => {
    if (!tokens || tokens.length === 0) return []

    const segments: SpeakerSegment[] = []
    let currentSegment: SpeakerSegment | null = null

    tokens.forEach((token) => {
      const speakerId = token.speaker ? parseInt(token.speaker) : 0

      if (!currentSegment || currentSegment.speaker !== speakerId) {
        // Start new segment
        if (currentSegment) {
          segments.push(currentSegment)
        }
        currentSegment = {
          speaker: speakerId,
          text: token.text || '',
          startMs: token.start_time || 0,
          endMs: (token.start_time || 0) + (token.duration || 0),
          tokens: [token]
        }
      } else {
        // Continue current segment
        currentSegment.text += token.text || ''
        currentSegment.endMs = (token.start_time || 0) + (token.duration || 0)
        currentSegment.tokens.push(token)
      }
    })

    // Push last segment
    if (currentSegment) {
      segments.push(currentSegment)
    }

    return segments
  }, [])

  // Initialize Soniox connection
  const initializeSoniox = useCallback(async () => {
    try {
      setError(null)
      setConnectionStatus('connecting')

      // Get Soniox credentials
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

      const { soniox } = authData.data

      // Connect to Soniox WebSocket
      const ws = new WebSocket(soniox.endpoint)
      websocketRef.current = ws

      // Set up timeout for connection
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close()
          setError(new Error('Connection timeout'))
          setConnectionStatus('error')
        }
      }, WEBSOCKET_TIMEOUT_MS)

      ws.onopen = () => {
        clearTimeout(connectionTimeout)
        console.log('Soniox WebSocket connected')

        // Send configuration
        const config = {
          ...soniox.config,
          api_key: soniox.api_key
        }

        ws.send(JSON.stringify(config))
        setConnectionStatus('connected')
        connectionAttemptsRef.current = 0
        startHeartbeat()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.error_code) {
            console.error('Soniox error:', data.error_message)
            setError(new Error(data.error_message))
            return
          }

          if (data.tokens && Array.isArray(data.tokens)) {
            const newTokens = data.tokens as SonioxToken[]
            currentTokensRef.current.push(...newTokens)

            // Process tokens into segments
            const segments = processTokensIntoSegments(currentTokensRef.current)
            speakerSegmentsRef.current = segments

            // Track detected speakers
            const speakers = newTokens
              .map(token => token.speaker)
              .filter(Boolean) as string[]

            setDetectedSpeakers(prev => {
              const combined = [...new Set([...prev, ...speakers])]
              return combined.sort()
            })

            // Update speaker mapping
            segments.forEach(segment => {
              if (!speakerMappingRef.current.has(segment.speaker)) {
                speakerMappingRef.current.set(segment.speaker, `Speaker ${segment.speaker}`)
              }
            })

            // Notify parent component
            if (onTranscriptUpdate) {
              onTranscriptUpdate(segments, speakerMappingRef.current)
            }
          }
        } catch (error) {
          console.error('Error parsing Soniox response:', error)
        }
      }

      ws.onclose = () => {
        clearTimeout(connectionTimeout)
        console.log('Soniox WebSocket disconnected')
        setConnectionStatus('disconnected')

        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
          heartbeatRef.current = null
        }

        // Auto-reconnect if session is active and we haven't exceeded max attempts
        if (isSessionActive && connectionAttemptsRef.current < MAX_RECONNECT_ATTEMPTS && !isReconnectingRef.current) {
          isReconnectingRef.current = true
          connectionAttemptsRef.current++

          reconnectTimeoutRef.current = setTimeout(() => {
            isReconnectingRef.current = false
            initializeSoniox()
          }, RECONNECT_DELAY_MS)
        } else if (connectionAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError(new Error(`Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`))
          setConnectionStatus('error')
        }
      }

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout)
        console.error('Soniox WebSocket error:', error)
        setError(new Error('WebSocket connection failed'))
        setConnectionStatus('error')
      }

    } catch (error) {
      console.error('Error initializing Soniox:', error)
      setError(error instanceof Error ? error : new Error('Connection failed'))
      setConnectionStatus('error')
    }
  }, [sessionId, isSessionActive, onTranscriptUpdate, processTokensIntoSegments, startHeartbeat])

  // Start transcription
  const startTranscription = useCallback(async (audioStream: MediaStream) => {
    try {
      setError(null)
      mediaStreamRef.current = audioStream

      // Initialize Soniox connection
      await initializeSoniox()

      // Set up audio processing
      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(audioStream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      audioProcessorRef.current = processor

      // Convert audio buffer to PCM 16-bit format
      const convertAudioBuffer = (audioBuffer: Float32Array) => {
        const pcmBuffer = new Int16Array(audioBuffer.length)
        for (let i = 0; i < audioBuffer.length; i++) {
          const sample = Math.max(-1, Math.min(1, audioBuffer[i]))
          pcmBuffer[i] = sample * 0x7FFF
        }
        return pcmBuffer.buffer
      }

      processor.onaudioprocess = (event) => {
        if (websocketRef.current?.readyState === WebSocket.OPEN && isSessionActive) {
          const inputBuffer = event.inputBuffer.getChannelData(0)
          const audioData = convertAudioBuffer(inputBuffer)
          sendAudioData(audioData)
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      setIsSessionActive(true)

      // Clear any existing data
      currentTokensRef.current = []
      speakerSegmentsRef.current = []
      speakerMappingRef.current.clear()
      audioBufferRef.current = []

      if (onSessionStarted) {
        onSessionStarted()
      }

    } catch (error) {
      console.error('Error starting transcription:', error)
      const err = error instanceof Error ? error : new Error('Failed to start transcription')
      setError(err)
      if (onError) {
        onError(err)
      }
    }
  }, [initializeSoniox, isSessionActive, sendAudioData, onSessionStarted, onError])

  // Stop transcription
  const stopTranscription = useCallback(() => {
    setIsSessionActive(false)

    // Signal end of audio to Soniox
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      try {
        websocketRef.current.send('')
      } catch (error) {
        console.warn('Failed to signal end of audio:', error)
      }
    }

    // Cleanup all resources
    cleanup()

    if (onSessionFinished) {
      onSessionFinished()
    }
  }, [cleanup, onSessionFinished])

  // Correct speaker name
  const correctSpeaker = useCallback((speakerId: number, newName: string) => {
    speakerMappingRef.current.set(speakerId, newName)

    // Notify parent component with updated mapping
    if (onTranscriptUpdate) {
      onTranscriptUpdate(speakerSegmentsRef.current, speakerMappingRef.current)
    }
  }, [onTranscriptUpdate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

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