'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertCircle,
  Volume2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiveTranscriptionInputProps {
  questionId: string
  questionText: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  sessionId?: string
  disabled?: boolean
}

type RecordingState = 'idle' | 'connecting' | 'recording' | 'paused' | 'processing' | 'completed' | 'error'

interface SonioxToken {
  text: string
  is_final: boolean
  speaker?: string
  language?: string
  start_time?: number
  duration?: number
}

interface SonioxResponse {
  tokens?: SonioxToken[]
  finished?: boolean
  error_code?: string
  error_message?: string
}

export default function LiveTranscriptionInput({
  questionId,
  questionText,
  placeholder,
  value,
  onChange,
  sessionId,
  disabled = false
}: LiveTranscriptionInputProps) {
  // State management
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Refs for WebSocket and media
  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop recording timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Update recording duration timer
  useEffect(() => {
    if (recordingState === 'recording') {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
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
  }, [recordingState])

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Get Soniox configuration for single-question transcription
  const getSonioxConfig = async () => {
    try {
      // We'll create a temporary session for individual question transcription
      // Since this is for single questions, we don't need the full assessment session
      const response = await fetch('/api/case-study/soniox-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || 'temp-session',
          questionId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get Soniox credentials')
      }

      const data = await response.json()
      return data.data.soniox
    } catch (error) {
      console.error('Error getting Soniox config:', error)
      throw error
    }
  }

  // Convert audio buffer to proper format for Soniox
  const convertAudioBuffer = (audioBuffer: Float32Array, sampleRate: number) => {
    // Convert float32 to PCM 16-bit
    const pcmBuffer = new Int16Array(audioBuffer.length)
    for (let i = 0; i < audioBuffer.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit
      const sample = Math.max(-1, Math.min(1, audioBuffer[i]))
      pcmBuffer[i] = sample * 0x7FFF
    }
    return pcmBuffer.buffer
  }

  // Start live transcription
  const startTranscription = async () => {
    try {
      setRecordingState('connecting')
      setError(null)
      setLiveTranscript('')
      setFinalTranscript('')
      setRecordingDuration(0)

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

      // Set up audio processing
      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      // Get Soniox configuration
      const sonioxConfig = await getSonioxConfig()

      // Connect to Soniox WebSocket
      const ws = new WebSocket('wss://stt-rt.soniox.com/transcribe-websocket')
      wsRef.current = ws

      ws.onopen = () => {
        console.log('🎙️ Connected to Soniox WebSocket')

        // Send configuration optimized for single-question transcription
        const config = {
          api_key: sonioxConfig.api_key,
          model: 'stt-rt-v3',
          language_hints: ['vi', 'en'], // Vietnamese primary, English fallback
          enable_language_identification: true,
          enable_speaker_diarization: false, // Single speaker for questions
          enable_endpoint_detection: true,
          enable_punctuation: true,
          enable_partial_results: true,
          audio_format: 'pcm_s16le',
          sample_rate: 16000,
          num_channels: 1,

          // Context for better accuracy on assessment questions
          context: {
            general: [
              { key: 'domain', value: 'assessment_interview' },
              { key: 'topic', value: 'hipo_evaluation' },
              { key: 'organization', value: 'VietinBank' }
            ],
            terms: [
              'VietinBank', 'Ngân hàng', 'HiPo', 'lãnh đạo',
              'phát triển', 'năng lực', 'khát vọng', 'gắn kết',
              'tích hợp', 'nghề nghiệp', 'tổ chức'
            ]
          }
        }

        ws.send(JSON.stringify(config))
        setRecordingState('recording')
      }

      ws.onmessage = (event) => {
        try {
          const response: SonioxResponse = JSON.parse(event.data)

          if (response.error_code) {
            console.error('Soniox error:', response.error_message)
            setError(`Transcription error: ${response.error_message}`)
            setRecordingState('error')
            return
          }

          if (response.tokens) {
            let currentLive = ''
            let newFinal = finalTranscript

            for (const token of response.tokens) {
              if (token.text) {
                if (token.is_final) {
                  // Add final token to final transcript
                  newFinal += token.text
                } else {
                  // Add non-final token to live transcript
                  currentLive += token.text
                }
              }
            }

            setFinalTranscript(newFinal)
            setLiveTranscript(currentLive)

            // Update the parent component with combined transcript
            const combinedTranscript = (newFinal + currentLive).trim()
            if (combinedTranscript !== value) {
              onChange(combinedTranscript)
            }
          }

          if (response.finished) {
            console.log('🎙️ Transcription session finished')
            setRecordingState('completed')
            setLiveTranscript('')
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('Connection error occurred')
        setRecordingState('error')
      }

      ws.onclose = () => {
        console.log('🎙️ WebSocket connection closed')
        if (recordingState === 'recording') {
          setRecordingState('completed')
        }
      }

      // Set up audio processing
      processor.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN && recordingState === 'recording') {
          const inputBuffer = event.inputBuffer.getChannelData(0)
          const audioData = convertAudioBuffer(inputBuffer, 16000)
          ws.send(audioData)
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

    } catch (error) {
      console.error('Error starting transcription:', error)
      setError(error instanceof Error ? error.message : 'Failed to start recording')
      setRecordingState('error')
      cleanup()
    }
  }

  // Stop transcription
  const stopTranscription = () => {
    setRecordingState('processing')

    // Send end-of-audio signal
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('') // Empty string signals end of audio
    }

    cleanup()
    setTimeout(() => {
      setRecordingState('completed')
    }, 1000)
  }

  // Pause transcription
  const pauseTranscription = () => {
    setRecordingState('paused')
    // Keep WebSocket open but stop audio processing
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null
    }
  }

  // Resume transcription
  const resumeTranscription = () => {
    setRecordingState('recording')
    // Restore audio processing
    if (processorRef.current && wsRef.current) {
      processorRef.current.onaudioprocess = (event) => {
        if (wsRef.current!.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer.getChannelData(0)
          const audioData = convertAudioBuffer(inputBuffer, 16000)
          wsRef.current!.send(audioData)
        }
      }
    }
  }

  // Reset transcription
  const resetTranscription = () => {
    cleanup()
    setRecordingState('idle')
    setRecordingDuration(0)
    setLiveTranscript('')
    setFinalTranscript('')
    setError(null)
    onChange('')
  }

  // Get status color
  const getStatusColor = () => {
    switch (recordingState) {
      case 'recording': return 'text-red-600'
      case 'paused': return 'text-yellow-600'
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
      case 'paused': return 'Tạm dừng'
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
            <>
              <Button onClick={pauseTranscription} variant="outline">
                <Pause className="h-4 w-4 mr-2" />
                Tạm dừng
              </Button>
              <Button onClick={stopTranscription} className="bg-green-600 hover:bg-green-700">
                <MicOff className="h-4 w-4 mr-2" />
                Dừng ghi âm
              </Button>
            </>
          )}

          {recordingState === 'paused' && (
            <>
              <Button onClick={resumeTranscription} className="bg-blue-600 hover:bg-blue-700">
                <Play className="h-4 w-4 mr-2" />
                Tiếp tục
              </Button>
              <Button onClick={stopTranscription} className="bg-green-600 hover:bg-green-700">
                <MicOff className="h-4 w-4 mr-2" />
                Dừng ghi âm
              </Button>
            </>
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

        {/* Live Transcript Display */}
        {(recordingState === 'recording' || recordingState === 'paused') && (liveTranscript || finalTranscript) && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Phiên âm trực tiếp:</h4>
            <div className="text-sm leading-relaxed">
              <span className="text-blue-800">{finalTranscript}</span>
              <span className="text-blue-600 italic">{liveTranscript}</span>
              {liveTranscript && <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1"></span>}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
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
            disabled={recordingState === 'recording' || recordingState === 'paused'}
          />
          <div className="mt-2 text-sm text-gray-500">
            {value.length} ký tự
          </div>
        </div>
      </CardContent>
    </Card>
  )
}