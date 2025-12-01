'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Mic,
  MicOff,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertCircle,
  Volume2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SonioxClient,
  type ErrorStatus,
  type RecorderState,
  type Token,
  isActiveState,
} from '@soniox/speech-to-text-web'

interface LiveTranscriptionInputProps {
  questionId: string
  questionText: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  sessionId?: string
  disabled?: boolean
  onDurationChange?: (duration: number) => void
}

type RecordingState = 'idle' | 'connecting' | 'recording' | 'processing' | 'completed' | 'error'

export default function LiveTranscriptionInput({
  questionId,
  questionText,
  placeholder,
  value,
  onChange,
  sessionId,
  disabled = false,
  onDurationChange
}: LiveTranscriptionInputProps) {
  // State management
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Refs for SDK and media
  const clientRef = useRef<SonioxClient | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const allTokensRef = useRef<Token[]>([])

  // Get API key function using existing endpoint
  const getApiKey = useCallback(async (): Promise<string> => {
    try {
      // Detect context type based on sessionId
      const contextType = sessionId?.includes('hipo') ? 'hipo' : 'tbei'

      const response = await fetch('/api/interview/start-transcription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          context: {
            type: contextType,
            questionText
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get Soniox credentials')
      }

      const data = await response.json()
      return data.data.soniox.api_key
    } catch (error) {
      console.error('Error getting Soniox config:', error)
      throw error
    }
  }, [questionId, questionText, sessionId])

  // Initialize Soniox client
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new SonioxClient({
        apiKey: getApiKey,
      })
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.cancel()
        clientRef.current = null
      }
    }
  }, [getApiKey])

  // Update recording duration timer
  useEffect(() => {
    if (recordingState === 'recording') {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1
          onDurationChange?.(newDuration)
          return newDuration
        })
      }, 1000)
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [recordingState, onDurationChange])

  // Process tokens into transcript text
  const processTokensToText = useCallback((tokens: Token[]): { final: string; live: string } => {
    let finalText = ''
    let liveText = ''

    for (const token of tokens) {
      if (token.text && token.text !== '<end>' && token.text !== '<start>') {
        if (token.is_final) {
          finalText += token.text
        } else {
          liveText += token.text
        }
      }
    }

    return { final: finalText, live: liveText }
  }, [])

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Start live transcription using Soniox SDK
  const startTranscription = async () => {
    if (!clientRef.current) {
      setError('Soniox client not initialized')
      setRecordingState('error')
      return
    }

    try {
      setRecordingState('connecting')
      setError(null)
      setLiveTranscript('')
      setFinalTranscript('')
      setRecordingDuration(0)
      allTokensRef.current = []
      onChange('')

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      mediaStreamRef.current = stream

      // Start transcription using the SDK
      await clientRef.current.start({
        model: 'stt-rt-preview-v2',
        languageHints: ['vi', 'en'], // Vietnamese and English
        enableLanguageIdentification: true,
        enableSpeakerDiarization: false, // Single speaker for questions
        enableEndpointDetection: true,
        stream: stream, // Let SDK handle audio processing

        onStarted: () => {
          console.log('Soniox transcription started')
          setRecordingState('recording')
        },

        onFinished: () => {
          console.log('Soniox transcription finished')
          setRecordingState('completed')
          setLiveTranscript('')
        },

        onError: (status: ErrorStatus, message: string, errorCode: number | undefined) => {
          console.error('Soniox transcription error:', { status, message, errorCode })
          setRecordingState('error')
          setError(`Transcription error: ${message}`)
        },

        onStateChange: ({ newState }) => {
          console.log('Soniox state change:', newState)
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
          allTokensRef.current = [...existingFinalTokens, ...newFinalTokens, ...newNonFinalTokens]

          // Process tokens into text
          const { final, live } = processTokensToText(allTokensRef.current)
          setFinalTranscript(final)
          setLiveTranscript(live)

          // Update the parent component with combined transcript
          const combinedTranscript = (final + live).trim()
          if (combinedTranscript !== value) {
            onChange(combinedTranscript)
          }
        },
      })

    } catch (error) {
      console.error('Error starting transcription:', error)
      setError(error instanceof Error ? error.message : 'Failed to start recording')
      setRecordingState('error')

      // Cleanup media stream on error
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }
    }
  }

  // Stop transcription
  const stopTranscription = () => {
    setRecordingState('processing')

    // Stop the Soniox client
    if (clientRef.current) {
      clientRef.current.stop()
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Finalize the transcript
    setTimeout(() => {
      const { final } = processTokensToText(allTokensRef.current)
      setFinalTranscript(final)
      setLiveTranscript('')
      onChange(final.trim())
      setRecordingState('completed')
    }, 500)
  }

  // Reset transcription
  const resetTranscription = () => {
    // Cancel any ongoing transcription
    if (clientRef.current) {
      clientRef.current.cancel()
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Re-initialize the client
    clientRef.current = new SonioxClient({
      apiKey: getApiKey,
    })

    // Reset state
    setRecordingState('idle')
    setRecordingDuration(0)
    setLiveTranscript('')
    setFinalTranscript('')
    setError(null)
    allTokensRef.current = []
    onChange('')
    onDurationChange?.(0)
  }

  // Get status color
  const getStatusColor = () => {
    switch (recordingState) {
      case 'recording': return 'text-red-600'
      case 'completed': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  // Get status text
  const getStatusText = () => {
    switch (recordingState) {
      case 'idle': return 'Sẵn sàng ghi âm'
      case 'connecting': return 'Đang kết nối...'
      case 'recording': return 'Đang ghi âm và phiên âm'
      case 'processing': return 'Đang xử lý...'
      case 'completed': return `Hoàn thành (${formatTime(recordingDuration)})`
      case 'error': return 'Lỗi kết nối'
      default: return ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Volume2 className="h-5 w-5 text-blue-600" />
            <span className="text-base">Live Transcription</span>
          </div>
          <div className={cn("flex items-center space-x-2 text-sm", getStatusColor())}>
            <Clock className="h-4 w-4" />
            <span>{formatTime(recordingDuration)}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex items-center justify-center space-x-3">
          {recordingState === 'idle' && (
            <Button
              onClick={startTranscription}
              disabled={disabled}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Mic className="h-4 w-4 mr-2" />
              Bắt đầu ghi âm
            </Button>
          )}

          {recordingState === 'connecting' && (
            <Button disabled className="bg-blue-500 text-white">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Đang kết nối...
            </Button>
          )}

          {recordingState === 'recording' && (
            <Button onClick={stopTranscription} className="bg-green-600 hover:bg-green-700">
              <MicOff className="h-4 w-4 mr-2" />
              Dừng ghi âm
            </Button>
          )}

          {recordingState === 'processing' && (
            <Button disabled className="bg-gray-500 text-white">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Đang xử lý...
            </Button>
          )}

          {(recordingState === 'completed' || recordingState === 'error') && (
            <Button onClick={resetTranscription} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Ghi âm lại
            </Button>
          )}
        </div>

        {/* Status Display */}
        <div className="text-center">
          <div className={cn("flex items-center justify-center space-x-2", getStatusColor())}>
            {recordingState === 'recording' && (
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            )}
            {recordingState === 'completed' && (
              <CheckCircle className="h-4 w-4" />
            )}
            {recordingState === 'error' && (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Live Transcript Display */}
        {recordingState === 'recording' && (liveTranscript || finalTranscript) && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Phiên âm trực tiếp:</h4>
            <div className="text-sm leading-relaxed">
              <span className="text-blue-800">{finalTranscript}</span>
              <span className="text-blue-600 italic">{liveTranscript}</span>
              {liveTranscript && <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1"></span>}
            </div>
          </div>
        )}

        {/* Manual Edit Textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chỉnh sửa/bổ sung phiên âm:
          </label>
          <Textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={6}
            className="resize-none"
            disabled={recordingState === 'recording'}
          />
          <div className="mt-2 text-sm text-gray-500">
            {value.length} ký tự
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
