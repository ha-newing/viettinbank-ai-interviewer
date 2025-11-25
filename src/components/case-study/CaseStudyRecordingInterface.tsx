'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Play,
  Square,
  Mic,
  MicOff,
  Users,
  Clock,
  Volume2,
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff
} from 'lucide-react'

interface Participant {
  id: string
  name: string
  email: string
  roleCode: string
  roleName: string
  speakerLabel: string | null
}

interface Session {
  id: string
  name: string
  status: string
  createdAt: Date
}

interface JobTemplate {
  id: string
  title: string
  description: string | null
}

interface SonioxToken {
  text: string
  speaker?: string
  start_time?: number
  duration?: number
  is_final?: boolean
  confidence?: number
}

interface TranscriptChunk {
  id: string
  sequenceNumber: number
  rawTranscript: string
  consolidatedTranscript: string
  durationSeconds: number
  createdAt: Date
  speakerMapping: Record<string, string> | null
}

interface CompetencyInfo {
  id: string
  name: string
  nameEn: string
}

interface ParticipantInfo {
  id: string
  name: string
  roleCode: string
  roleName: string
}

interface EvaluationRecord {
  id: string
  participant: ParticipantInfo | null
  competency: CompetencyInfo
  transcript: {
    id: string
    sequenceNumber: number
    durationSeconds: number
  }
  score: number
  level: string
  rationale: string
  evidence: string[]
  evidenceStrength: string
  countTowardOverall: boolean
  createdAt: string
  updatedAt: string
}

interface ParticipantSummary {
  participant: ParticipantInfo
  scores: Array<{
    score: number
    chunkSequence: number
    evidenceStrength: string
    createdAt: string
  }>
  averageScore: number
  latestScore: number | null
  evidenceCount: number
  strongEvidenceCount: number
  lastUpdated: string | null
  trend: 'improving' | 'declining' | 'stable'
}

interface CompetencySummary {
  competency: CompetencyInfo
  participants: Record<string, ParticipantSummary>
  overall: {
    averageScore: number
    totalEvaluations: number
    evidenceCount: number
    lastUpdated: string | null
  }
}

interface EvaluationData {
  evaluations: EvaluationRecord[]
  competencySummaries: Record<string, CompetencySummary>
  statistics: {
    totalEvaluations: number
    latestChunk: number
    lastUpdated: string | null
    competencyCount: number
    participantCount: number
  }
  metadata: {
    polledAt: string
    hasMore: boolean
    since: string | null
  }
}

interface CaseStudyRecordingInterfaceProps {
  session: Session
  participants: Participant[]
  jobTemplate: JobTemplate | null
}

export default function CaseStudyRecordingInterface({
  session,
  participants,
  jobTemplate
}: CaseStudyRecordingInterfaceProps) {
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [nextChunkIn, setNextChunkIn] = useState(60)

  // WebSocket and audio state
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [microphoneActive, setMicrophoneActive] = useState(false)

  // Transcript state
  const [currentTokens, setCurrentTokens] = useState<SonioxToken[]>([])
  const [transcriptChunks, setTranscriptChunks] = useState<TranscriptChunk[]>([])
  const [speakerMapping, setSpeakerMapping] = useState<Record<string, string>>({})
  const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([])

  // Statistics
  const [totalChunks, setTotalChunks] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [averageConfidence, setAverageConfidence] = useState(0)

  // Evaluation state
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null)
  const [evaluationError, setEvaluationError] = useState<string | null>(null)
  const [lastEvaluationPoll, setLastEvaluationPoll] = useState<string | null>(null)
  const [showEvaluations, setShowEvaluations] = useState(false)

  // Refs
  const websocketRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentChunkTokensRef = useRef<SonioxToken[]>([])
  const evaluationPollingRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize Soniox connection
  const initializeSoniox = useCallback(async () => {
    try {
      setConnectionError(null)

      // Get Soniox credentials from backend
      const authResponse = await fetch('/api/case-study/soniox-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id })
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

      ws.onopen = () => {
        console.log('Soniox WebSocket connected')

        // Send configuration as first message
        const config = {
          ...soniox.config,
          api_key: soniox.api_key
        }

        ws.send(JSON.stringify(config))
        setIsConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.error_code) {
            console.error('Soniox error:', data.error_message)
            setConnectionError(data.error_message)
            return
          }

          if (data.tokens && Array.isArray(data.tokens)) {
            const newTokens = data.tokens as SonioxToken[]

            // Add to current tokens
            setCurrentTokens(prev => [...prev, ...newTokens])
            currentChunkTokensRef.current.push(...newTokens)

            // Track detected speakers
            const speakers = newTokens
              .map(token => token.speaker)
              .filter(Boolean) as string[]

            setDetectedSpeakers(prev => {
              const combined = [...new Set([...prev, ...speakers])]
              return combined.sort()
            })

            // Update statistics
            const words = newTokens.filter(token => token.text.trim().length > 0)
            setTotalWords(prev => prev + words.length)

            const confidenceSum = newTokens
              .filter(token => token.confidence !== undefined)
              .reduce((sum, token) => sum + (token.confidence || 0), 0)

            if (confidenceSum > 0) {
              setAverageConfidence(prev => {
                const count = newTokens.filter(token => token.confidence !== undefined).length
                return (prev + confidenceSum / count) / 2
              })
            }
          }
        } catch (error) {
          console.error('Error parsing Soniox response:', error)
        }
      }

      ws.onclose = () => {
        console.log('Soniox WebSocket disconnected')
        setIsConnected(false)

        // Auto-reconnect if recording
        if (isRecording) {
          setTimeout(() => initializeSoniox(), 2000)
        }
      }

      ws.onerror = (error) => {
        console.error('Soniox WebSocket error:', error)
        setConnectionError('WebSocket connection failed')
        setIsConnected(false)
      }

    } catch (error) {
      console.error('Error initializing Soniox:', error)
      setConnectionError(error instanceof Error ? error.message : 'Connection failed')
      setIsConnected(false)
    }
  }, [session.id, isRecording])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setConnectionError(null)

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      })

      mediaStreamRef.current = stream
      setMicrophoneActive(true)

      // Connect to Soniox if not already connected
      if (!isConnected) {
        await initializeSoniox()
      }

      // Start AudioContext for PCM audio streaming (like LiveTranscriptionInput)
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)

      // Convert audio buffer to PCM 16-bit format for Soniox
      const convertAudioBuffer = (audioBuffer: Float32Array) => {
        const pcmBuffer = new Int16Array(audioBuffer.length)
        for (let i = 0; i < audioBuffer.length; i++) {
          const sample = Math.max(-1, Math.min(1, audioBuffer[i]))
          pcmBuffer[i] = sample * 0x7FFF
        }
        return pcmBuffer.buffer
      }

      processor.onaudioprocess = (event) => {
        if (websocketRef.current?.readyState === WebSocket.OPEN && isRecording) {
          const inputBuffer = event.inputBuffer.getChannelData(0)
          const audioData = convertAudioBuffer(inputBuffer)
          websocketRef.current.send(audioData)
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      // Update session status to 'case_study_in_progress'
      await fetch('/api/case-study/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          status: 'case_study_in_progress'
        })
      })

      setIsRecording(true)
      setRecordingDuration(0)
      setNextChunkIn(60)

      // Start timers
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
        setNextChunkIn(prev => {
          if (prev <= 1) {
            // Time to send chunk
            sendTranscriptChunk()
            return 60 // Reset for next chunk
          }
          return prev - 1
        })
      }, 1000)

      // Start evaluation polling
      startEvaluationPolling()

    } catch (error) {
      console.error('Error starting recording:', error)
      setConnectionError(error instanceof Error ? error.message : 'Failed to start recording')
      setMicrophoneActive(false)
    }
  }, [session.id, isConnected, initializeSoniox])

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      setIsRecording(false)

      // Stop timers
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }

      if (chunkTimerRef.current) {
        clearTimeout(chunkTimerRef.current)
        chunkTimerRef.current = null
      }

      // Stop evaluation polling
      stopEvaluationPolling()

      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }

      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }

      setMicrophoneActive(false)

      // Send final transcript chunk
      if (currentChunkTokensRef.current.length > 0) {
        await sendTranscriptChunk()
      }

      // Signal end of audio to Soniox
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send('')
      }

      // Close WebSocket
      if (websocketRef.current) {
        websocketRef.current.close()
        websocketRef.current = null
      }

      setIsConnected(false)

      // Update session status to 'case_study_completed'
      await fetch('/api/case-study/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          status: 'case_study_completed'
        })
      })

    } catch (error) {
      console.error('Error stopping recording:', error)
      setConnectionError(error instanceof Error ? error.message : 'Failed to stop recording')
    }
  }, [session.id])

  // Send transcript chunk to backend
  const sendTranscriptChunk = useCallback(async () => {
    if (currentChunkTokensRef.current.length === 0) {
      return
    }

    try {
      // Combine tokens into transcript text
      const rawTranscript = currentChunkTokensRef.current
        .map(token => `${token.speaker || 'Unknown'}: ${token.text}`)
        .join(' ')

      // Send to backend
      const response = await fetch('/api/case-study/transcript-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          rawTranscript,
          speakerMapping,
          durationSeconds: 60,
          tokens: currentChunkTokensRef.current
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setTotalChunks(prev => prev + 1)

          // Add to transcript chunks display
          const newChunk: TranscriptChunk = {
            id: result.data.id,
            sequenceNumber: result.data.sequenceNumber,
            rawTranscript,
            consolidatedTranscript: rawTranscript, // Will be processed by backend
            durationSeconds: 60,
            createdAt: new Date(),
            speakerMapping
          }
          setTranscriptChunks(prev => [newChunk, ...prev])
        }
      }

      // Clear current chunk tokens
      currentChunkTokensRef.current = []

    } catch (error) {
      console.error('Error sending transcript chunk:', error)
    }
  }, [session.id, speakerMapping])

  // Map speaker to participant
  const mapSpeaker = useCallback((speaker: string, participantId: string) => {
    setSpeakerMapping(prev => ({
      ...prev,
      [speaker]: participantId
    }))
  }, [])

  // Poll for evaluation results
  const pollEvaluations = useCallback(async () => {
    if (!isRecording && !session.status.includes('case_study')) {
      return
    }

    try {
      setEvaluationError(null)

      const params = new URLSearchParams({
        sessionId: session.id
      })

      if (lastEvaluationPoll) {
        params.append('since', lastEvaluationPoll)
      }

      const response = await fetch(`/api/case-study/evaluations?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch evaluations')
      }

      const result = await response.json()

      if (result.success) {
        setEvaluationData(result.data)
        setLastEvaluationPoll(new Date().toISOString())

        // Show evaluations section if we have data
        if (result.data.evaluations.length > 0 && !showEvaluations) {
          setShowEvaluations(true)
        }
      } else {
        throw new Error(result.error || 'Failed to fetch evaluations')
      }

    } catch (error) {
      console.error('Error polling evaluations:', error)
      setEvaluationError(error instanceof Error ? error.message : 'Evaluation polling failed')
    }
  }, [session.id, isRecording, session.status, lastEvaluationPoll, showEvaluations])

  // Start evaluation polling
  const startEvaluationPolling = useCallback(() => {
    if (evaluationPollingRef.current) {
      clearInterval(evaluationPollingRef.current)
    }

    // Poll immediately, then every 8 seconds
    pollEvaluations()
    evaluationPollingRef.current = setInterval(pollEvaluations, 8000)
  }, [pollEvaluations])

  // Stop evaluation polling
  const stopEvaluationPolling = useCallback(() => {
    if (evaluationPollingRef.current) {
      clearInterval(evaluationPollingRef.current)
      evaluationPollingRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current)
      if (evaluationPollingRef.current) clearInterval(evaluationPollingRef.current)
      if (websocketRef.current) websocketRef.current.close()
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Format time display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Get score color for badge display
  const getScoreColor = (score: number) => {
    if (score >= 4) return 'bg-green-100 text-green-800 border-green-300'
    if (score >= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  // Get trend icon and color
  const getTrendDisplay = (trend: string) => {
    switch (trend) {
      case 'improving':
        return { icon: '↗️', color: 'text-green-600', label: 'Cải thiện' }
      case 'declining':
        return { icon: '↘️', color: 'text-red-600', label: 'Giảm' }
      default:
        return { icon: '➡️', color: 'text-gray-600', label: 'Ổn định' }
    }
  }

  // Get evidence strength display
  const getEvidenceStrengthDisplay = (strength: string) => {
    switch (strength) {
      case 'strong':
        return { label: 'Mạnh', color: 'text-green-600' }
      case 'moderate':
        return { label: 'Trung bình', color: 'text-yellow-600' }
      case 'weak':
        return { label: 'Yếu', color: 'text-orange-600' }
      default:
        return { label: 'Không đủ', color: 'text-red-600' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Điều khiển ghi âm
            </span>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Badge className="bg-green-100 text-green-800">
                  <Wifi className="h-3 w-3 mr-1" />
                  Kết nối
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Mất kết nối
                </Badge>
              )}
              {microphoneActive && (
                <Badge className="bg-blue-100 text-blue-800">
                  <Mic className="h-3 w-3 mr-1" />
                  Mic hoạt động
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Error */}
          {connectionError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {connectionError}
              </AlertDescription>
            </Alert>
          )}

          {/* Recording Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!participants.length}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Bắt đầu case study
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Kết thúc
                </Button>
              )}

              {participants.length === 0 && (
                <span className="text-sm text-red-600">
                  Cần có ít nhất 1 thí sinh để bắt đầu
                </span>
              )}
            </div>

            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Thời gian: {formatTime(recordingDuration)}
              </div>
              {isRecording && (
                <div className="flex items-center">
                  <Volume2 className="h-4 w-4 mr-1" />
                  Chunk tiếp theo: {formatTime(nextChunkIn)}
                </div>
              )}
            </div>
          </div>

          {/* Progress bars */}
          {isRecording && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Tiến độ chunk ({60 - nextChunkIn}/60s)</span>
                <span>{Math.round(((60 - nextChunkIn) / 60) * 100)}%</span>
              </div>
              <Progress value={((60 - nextChunkIn) / 60) * 100} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Thí sinh tham gia ({participants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((participant) => (
              <div key={participant.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-blue-600">{participant.roleCode}</span>
                    </div>
                    <div>
                      <p className="font-medium">{participant.name}</p>
                      <p className="text-xs text-gray-600">{participant.roleName}</p>
                    </div>
                  </div>
                </div>

                {/* Speaker mapping */}
                {detectedSpeakers.length > 0 && isRecording && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-600">Mapped to speaker:</label>
                    <select
                      value={Object.keys(speakerMapping).find(s => speakerMapping[s] === participant.id) || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          mapSpeaker(e.target.value, participant.id)
                        }
                      }}
                      className="w-full mt-1 text-xs border rounded px-2 py-1"
                    >
                      <option value="">Chọn speaker...</option>
                      {detectedSpeakers.map(speaker => (
                        <option key={speaker} value={speaker}>
                          {speaker}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Transcript */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transcript trực tiếp</span>
            <div className="text-sm text-gray-600 space-x-4">
              <span>Chunks: {totalChunks}</span>
              <span>Words: {totalWords}</span>
              <span>Avg confidence: {(averageConfidence * 100).toFixed(1)}%</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Current live tokens */}
          {isRecording && currentTokens.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Live (chưa lưu)</h4>
              <p className="text-sm text-blue-800">
                {currentTokens
                  .filter(token => token.text.trim())
                  .map(token => `${token.speaker || 'Unknown'}: ${token.text}`)
                  .join(' ')}
              </p>
            </div>
          )}

          {/* Saved transcript chunks */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transcriptChunks.map((chunk) => (
              <div key={chunk.id} className="p-3 bg-gray-50 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">
                    Chunk #{chunk.sequenceNumber}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(chunk.createdAt).toLocaleTimeString('vi-VN')}
                  </span>
                </div>
                <p className="text-sm text-gray-800">{chunk.consolidatedTranscript}</p>
              </div>
            ))}
          </div>

          {transcriptChunks.length === 0 && !isRecording && (
            <p className="text-center text-gray-500 py-8">
              Chưa có transcript nào. Bắt đầu ghi âm để xem transcript trực tiếp.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Real-time Competency Evaluation */}
      {showEvaluations && evaluationData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
                Đánh giá năng lực trực tiếp
              </span>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Đánh giá: {evaluationData.statistics.totalEvaluations}</span>
                <span>Chunk mới nhất: #{evaluationData.statistics.latestChunk}</span>
                {evaluationData.statistics.lastUpdated && (
                  <span>Cập nhật: {new Date(evaluationData.statistics.lastUpdated).toLocaleTimeString('vi-VN')}</span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Evaluation Error */}
            {evaluationError && (
              <Alert className="border-red-200 bg-red-50 mb-4">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {evaluationError}
                </AlertDescription>
              </Alert>
            )}

            {/* Competency Summary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(evaluationData.competencySummaries).map(([competencyId, summary]) => (
                <div key={competencyId} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">{summary.competency.name}</h3>
                    <div className="text-xs text-gray-500">
                      {summary.overall.totalEvaluations} đánh giá
                    </div>
                  </div>

                  <div className="space-y-3">
                    {participants.map(participant => {
                      const participantSummary = summary.participants[participant.id]
                      if (!participantSummary) return null

                      const trendDisplay = getTrendDisplay(participantSummary.trend)

                      return (
                        <div key={participant.id} className="bg-white rounded p-3 border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-semibold text-blue-600">
                                  {participant.roleCode}
                                </span>
                              </div>
                              <span className="font-medium text-sm">{participant.name}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              {participantSummary.latestScore !== null && (
                                <Badge className={`border text-xs ${getScoreColor(participantSummary.latestScore)}`}>
                                  {participantSummary.latestScore.toFixed(1)}
                                </Badge>
                              )}
                              <span className={`text-xs ${trendDisplay.color}`}>
                                {trendDisplay.icon}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="block">Trung bình</span>
                              <span className="font-medium">{participantSummary.averageScore.toFixed(1)}</span>
                            </div>
                            <div>
                              <span className="block">Bằng chứng</span>
                              <span className="font-medium">
                                {participantSummary.evidenceCount}
                                {participantSummary.strongEvidenceCount > 0 &&
                                  ` (${participantSummary.strongEvidenceCount} mạnh)`
                                }
                              </span>
                            </div>
                            <div>
                              <span className="block">Xu hướng</span>
                              <span className={`font-medium ${trendDisplay.color}`}>
                                {trendDisplay.label}
                              </span>
                            </div>
                          </div>

                          {/* Progress bar for average score */}
                          <div className="mt-2">
                            <Progress
                              value={(participantSummary.averageScore / 5) * 100}
                              className="h-1"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Overall competency stats */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Điểm trung bình nhóm: <strong>{summary.overall.averageScore.toFixed(1)}/5</strong></span>
                      <span>Tổng bằng chứng: <strong>{summary.overall.evidenceCount}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Evaluations */}
            {evaluationData.evaluations.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3">Đánh giá gần nhất</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {evaluationData.evaluations.slice(0, 10).map((evaluation) => (
                    <div key={evaluation.id} className="p-3 bg-gray-50 rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-blue-600">
                            #{evaluation.transcript.sequenceNumber}
                          </span>
                          <span className="text-sm font-medium">
                            {evaluation.participant?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-600">
                            • {evaluation.competency.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={`text-xs ${getScoreColor(evaluation.score)}`}>
                            {evaluation.score}/5
                          </Badge>
                          <span className={`text-xs ${getEvidenceStrengthDisplay(evaluation.evidenceStrength).color}`}>
                            {getEvidenceStrengthDisplay(evaluation.evidenceStrength).label}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-700 mb-2">{evaluation.rationale}</p>

                      {evaluation.evidence.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-gray-600">Bằng chứng:</span>
                          <ul className="list-disc list-inside text-xs text-gray-600 mt-1">
                            {evaluation.evidence.slice(0, 2).map((evidence, index) => (
                              <li key={index} className="truncate">&quot;{evidence}&quot;</li>
                            ))}
                            {evaluation.evidence.length > 2 && (
                              <li className="text-gray-500">+{evaluation.evidence.length - 2} bằng chứng khác</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {evaluationData.evaluations.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-2">🤖</div>
                <p>Chưa có đánh giá năng lực nào.</p>
                <p className="text-xs mt-1">Đánh giá sẽ xuất hiện sau khi có transcript chunk đầu tiên.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Case Study Instructions */}
      {jobTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>Hướng dẫn Case Study</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Bối cảnh:</h4>
                <p className="text-sm text-gray-700">
                  VietinBank chi nhánh Eastern Saigon đang gặp thách thức với tỷ lệ nợ xấu NPL 2.4%
                  và điểm NPS khách hàng 32. Hãy thảo luận và đề xuất giải pháp cho năm 2026.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Thời gian:</h4>
                <p className="text-sm text-gray-700">120 phút thảo luận nhóm</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Vai trò của mỗi thí sinh:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><strong>A (Corporate Banking):</strong> Phát triển khách hàng doanh nghiệp</li>
                  <li><strong>B (Retail Banking):</strong> Phát triển khách hàng cá nhân</li>
                  <li><strong>C (Risk Management):</strong> Quản lý và giảm thiểu rủi ro</li>
                  <li><strong>D (Operations):</strong> Tối ưu hóa quy trình vận hành</li>
                  <li><strong>E (Digital Transformation):</strong> Chuyển đổi số và công nghệ</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}