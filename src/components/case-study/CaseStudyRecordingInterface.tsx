'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
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
  WifiOff,
  Info
} from 'lucide-react'
import useSpeakerDiarization, { type SpeakerSegment } from '@/hooks/useSpeakerDiarization'
import SpeakerDiarizedTranscript from './SpeakerDiarizedTranscript'

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

interface TranscriptVersion {
  id: string
  version: number
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
    version: number
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
  const [nextEvaluationIn, setNextEvaluationIn] = useState(60)
  const [microphoneActive, setMicrophoneActive] = useState(false)

  // Transcript state
  const [transcriptVersions, setTranscriptVersions] = useState<TranscriptVersion[]>([])
  const [speakerSegments, setSpeakerSegments] = useState<SpeakerSegment[]>([])
  const [speakerMapping, setSpeakerMapping] = useState<Map<number, string>>(new Map())

  // Statistics
  const [totalEvaluations, setTotalEvaluations] = useState(0)
  const [totalWords, setTotalWords] = useState(0)

  // Evaluation state
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null)
  const [evaluationError, setEvaluationError] = useState<string | null>(null)
  const [lastEvaluationPoll, setLastEvaluationPoll] = useState<string | null>(null)
  const [showEvaluations, setShowEvaluations] = useState(false)

  // Refs
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const evaluationPollingRef = useRef<NodeJS.Timeout | null>(null)
  const isSendingEvaluationRef = useRef<boolean>(false)

  // Speaker Diarization Hook
  const {
    startTranscription,
    stopTranscription,
    isSessionActive,
    error: transcriptionError,
    correctSpeaker,
    connectionStatus
  } = useSpeakerDiarization({
    sessionId: session.id,
    onTranscriptUpdate: (segments, mapping) => {
      // console.log('🎤 Transcript update received:', {
      //   segmentCount: segments.length,
      //   mappingSize: mapping.size,
      //   newSegments: segments.slice(-2).map(s => ({
      //     speaker: s.speaker,
      //     text: s.text.substring(0, 50) + (s.text.length > 50 ? '...' : ''),
      //     startMs: s.startMs,
      //     endMs: s.endMs
      //   })),
      //   speakers: Array.from(mapping.keys()).map(key => ({ id: key, name: mapping.get(key) }))
      // })

      setSpeakerSegments(segments)
      setSpeakerMapping(mapping)

      // Update statistics
      const words = segments.reduce((acc, segment) => acc + segment.tokens.length, 0)
      setTotalWords(words)
    },
    onSessionStarted: () => {
      setIsRecording(true)
      setRecordingDuration(0)
      setNextEvaluationIn(60)
    },
    onSessionFinished: () => {
      setIsRecording(false)
    },
    onError: (error) => {
      console.error('Speaker diarization error:', error)
    }
  })


  // Start recording
  const startRecording = useCallback(async () => {
    try {
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

      // Start transcription using the hook
      await startTranscription(stream)

      // Update session status to 'case_study_in_progress'
      await fetch('/api/case-study/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          status: 'case_study_in_progress'
        })
      })

      // Start timers
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
        setNextEvaluationIn(prev => {
          if (prev <= 1) {
            // Time to sync consolidated transcript
            console.log('⏰ 60-second timer fired, syncing consolidated transcript')
            // Use current state values instead of potentially stale closure
            setSpeakerSegments(currentSegments => {
              setSpeakerMapping(currentMapping => {
                // Send current consolidated transcript for evaluation
                sendConsolidatedTranscript(currentSegments, currentMapping)
                return currentMapping
              })
              return currentSegments
            })
            return 60 // Reset for next sync
          }
          return prev - 1
        })
      }, 1000)

      // Start evaluation polling
      startEvaluationPolling()

    } catch (error) {
      console.error('Error starting recording:', error)
      setMicrophoneActive(false)
    }
  }, [session.id, startTranscription])

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      // Stop timers
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }


      // Stop evaluation polling
      stopEvaluationPolling()

      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }

      setMicrophoneActive(false)

      // Send final consolidated transcript
      await sendTranscriptChunk()

      // Stop transcription using the hook
      stopTranscription()

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
    }
  }, [session.id, stopTranscription])

  // Send consolidated transcript to backend with provided data
  const sendConsolidatedTranscript = useCallback(async (segments: SpeakerSegment[], mapping: Map<number, string>) => {
    console.log('🔄 sendConsolidatedTranscript called:', {
      segmentsLength: segments.length,
      mappingSize: mapping.size,
      isRecording,
      isSendingEvaluation: isSendingEvaluationRef.current,
      sessionId: session.id
    })

    if (segments.length === 0) {
      console.log('⏭️ No speaker segments to send, skipping consolidated transcript sync')
      return
    }

    if (isSendingEvaluationRef.current) {
      console.log('🔒 Already sending consolidated transcript, skipping to prevent duplicates')
      return
    }

    isSendingEvaluationRef.current = true

    console.log('📤 Sending consolidated transcript for evaluation:', {
      segmentCount: segments.length,
      preview: segments.slice(0, 2).map(s => ({
        speaker: s.speaker,
        text: s.text.substring(0, 100) + (s.text.length > 100 ? '...' : '')
      }))
    })

    try {
      // Build unified chronological transcript from speaker segments (following technical reference pattern)
      const fullTranscript = segments
        .map(segment => {
          const speakerName = mapping.get(segment.speaker) || `Speaker ${segment.speaker}`
          return `[${speakerName}]: ${segment.text}`
        })
        .join('\n')

      // Convert Map to Record for API
      const speakerMappingRecord: Record<string, string> = {}
      mapping.forEach((name, id) => {
        speakerMappingRecord[id.toString()] = name
      })

      // Calculate total duration from segments
      const totalDurationSeconds = segments.length > 0
        ? Math.round((segments[segments.length - 1].endMs - segments[0].startMs) / 1000)
        : recordingDuration

      console.log('🚀 Making API request for consolidated transcript sync')

      // Send to consolidated transcript endpoint
      const response = await fetch('/api/case-study/consolidated-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          fullTranscript,
          speakerMapping: speakerMappingRecord,
          totalDurationSeconds,
          timestamp: Date.now()
        })
      })

      console.log('📥 API response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Consolidated transcript sent successfully:', result.success)
        if (result.success) {
          setTotalEvaluations(prev => prev + 1)

          // Add to transcript versions display (updated for consolidated approach)
          const newVersion: TranscriptVersion = {
            id: result.data.id,
            version: result.data.version,
            rawTranscript: fullTranscript,
            consolidatedTranscript: fullTranscript,
            durationSeconds: totalDurationSeconds,
            createdAt: new Date(),
            speakerMapping: speakerMappingRecord
          }
          setTranscriptVersions(prev => [newVersion, ...prev])
          console.log('📋 Consolidated transcript version added to display')
        }
      } else {
        console.error('❌ Consolidated transcript sync failed with status:', response.status)
        const errorText = await response.text()
        console.error('❌ Error response:', errorText)
      }

    } catch (error) {
      console.error('❌ Error sending consolidated transcript:', error)
    } finally {
      isSendingEvaluationRef.current = false
    }
  }, [session.id, isRecording, recordingDuration])

  // Send consolidated transcript to backend (updated for new approach)
  const sendTranscriptChunk = useCallback(async () => {
    return sendConsolidatedTranscript(speakerSegments, speakerMapping)
  }, [sendConsolidatedTranscript, speakerSegments, speakerMapping])


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

    // Poll immediately, then every 60 seconds
    pollEvaluations()
    evaluationPollingRef.current = setInterval(pollEvaluations, 60000)
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
      if (evaluationPollingRef.current) clearInterval(evaluationPollingRef.current)
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
              {connectionStatus === 'connected' ? (
                <Badge className="bg-green-100 text-green-800">
                  <Wifi className="h-3 w-3 mr-1" />
                  Kết nối
                </Badge>
              ) : connectionStatus === 'connecting' ? (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <Wifi className="h-3 w-3 mr-1" />
                  Đang kết nối
                </Badge>
              ) : connectionStatus === 'error' ? (
                <Badge className="bg-red-100 text-red-800">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Lỗi kết nối
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Chưa kết nối
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
          {transcriptionError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {transcriptionError.message}
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
                  <Clock className="h-4 w-4 mr-1" />
                  Đồng bộ tiếp theo: {formatTime(nextEvaluationIn)}
                </div>
              )}
            </div>
          </div>

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
              <span>Đánh giá: {totalEvaluations}</span>
              <span>Words: {totalWords}</span>
              {connectionStatus === 'connected' && (
                <Badge className="bg-green-100 text-green-800">
                  <Wifi className="h-3 w-3 mr-1" />
                  Đang kết nối
                </Badge>
              )}
              {connectionStatus === 'connecting' && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  Đang kết nối...
                </Badge>
              )}
              {connectionStatus === 'error' && (
                <Badge className="bg-red-100 text-red-800">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Lỗi kết nối
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Connection Error */}
          {transcriptionError && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {transcriptionError.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Speaker Diarized Transcript */}
          <SpeakerDiarizedTranscript
            segments={speakerSegments}
            speakerMapping={speakerMapping}
            placeholder={isRecording ? "Đang khởi động transcription..." : "Chưa có transcript nào. Bắt đầu ghi âm để xem transcript trực tiếp."}
            enableAutoScroll={isSessionActive}
            availableParticipants={participants.map(p => p.name)}
            onSpeakerCorrection={correctSpeaker}
          />
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
                <span>Phiên bản mới nhất: #{evaluationData.statistics.latestChunk}</span>
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

            {/* Competency Tabs */}
            {Object.keys(evaluationData.competencySummaries).length > 0 ? (
              <TooltipProvider>
                <Tabs defaultValue={Object.keys(evaluationData.competencySummaries)[0]} className="w-full">
                  <TabsList className="w-full flex flex-wrap h-auto gap-1 mb-4">
                    {Object.entries(evaluationData.competencySummaries).map(([competencyId, summary]) => (
                      <TabsTrigger
                        key={competencyId}
                        value={competencyId}
                        className="flex-1 min-w-fit text-xs sm:text-sm"
                      >
                        {summary.competency.name}
                        <Badge className="ml-2 text-xs" variant="secondary">
                          {summary.overall.averageScore.toFixed(1)}
                        </Badge>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {Object.entries(evaluationData.competencySummaries).map(([competencyId, summary]) => {
                    // Get all evidence for this competency from evaluations
                    const competencyEvaluations = evaluationData.evaluations.filter(
                      e => e.competency.id === competencyId
                    )

                    return (
                      <TabsContent key={competencyId} value={competencyId}>
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-gray-900">{summary.competency.name}</h3>
                            <div className="text-xs text-gray-500">
                              {summary.overall.totalEvaluations} đánh giá
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {participants.map(participant => {
                              const participantSummary = summary.participants[participant.id]
                              if (!participantSummary) return null

                              const trendDisplay = getTrendDisplay(participantSummary.trend)

                              // Get evidence for this participant in this competency
                              const participantEvidence = competencyEvaluations
                                .filter(e => e.participant?.id === participant.id)
                                .flatMap(e => e.evidence)

                              const participantRationale = competencyEvaluations
                                .filter(e => e.participant?.id === participant.id)
                                .map(e => e.rationale)
                                .filter(Boolean)

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
                                      {/* Evidence tooltip */}
                                      {participantEvidence.length > 0 && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                              <Info className="h-4 w-4 text-blue-500" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent
                                            side="left"
                                            className="max-w-sm bg-white text-gray-900 border shadow-lg p-3"
                                          >
                                            <div className="space-y-2">
                                              {participantRationale.length > 0 && (
                                                <div>
                                                  <p className="font-medium text-xs mb-1">Nhận xét:</p>
                                                  <p className="text-xs text-gray-700">
                                                    {participantRationale[participantRationale.length - 1]}
                                                  </p>
                                                </div>
                                              )}
                                              <div>
                                                <p className="font-medium text-xs mb-1">
                                                  Bằng chứng ({participantEvidence.length}):
                                                </p>
                                                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                                                  {participantEvidence.slice(0, 5).map((evidence, index) => (
                                                    <li key={index} className="line-clamp-2">
                                                      &quot;{evidence}&quot;
                                                    </li>
                                                  ))}
                                                  {participantEvidence.length > 5 && (
                                                    <li className="text-gray-500 italic">
                                                      +{participantEvidence.length - 5} bằng chứng khác
                                                    </li>
                                                  )}
                                                </ul>
                                              </div>
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
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
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Điểm trung bình nhóm: <strong>{summary.overall.averageScore.toFixed(1)}/5</strong></span>
                              <span>Tổng bằng chứng: <strong>{summary.overall.evidenceCount}</strong></span>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    )
                  })}
                </Tabs>
              </TooltipProvider>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-2">📊</div>
                <p className="font-medium">Chưa có dữ liệu đánh giá</p>
                <p className="text-xs mt-1">Hệ thống sẽ tự động đánh giá sau khi có đủ nội dung thảo luận</p>
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