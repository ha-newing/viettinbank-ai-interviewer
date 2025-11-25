'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Edit2, Check, X } from 'lucide-react'
import type { SpeakerSegment } from '@/hooks/useSpeakerDiarization'

interface SpeakerDiarizedTranscriptProps {
  segments: SpeakerSegment[]
  speakerMapping: Map<number, string>
  placeholder?: string
  enableAutoScroll?: boolean
  availableParticipants?: string[]
  onSpeakerCorrection?: (speakerId: number, newName: string) => void
  className?: string
}

interface EditingState {
  speakerId: number | null
  newName: string
}

export default function SpeakerDiarizedTranscript({
  segments,
  speakerMapping,
  placeholder = "No transcript available yet.",
  enableAutoScroll = false,
  availableParticipants = [],
  onSpeakerCorrection,
  className = ""
}: SpeakerDiarizedTranscriptProps) {
  const [editingState, setEditingState] = useState<EditingState>({
    speakerId: null,
    newName: ''
  })

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const shouldScrollRef = useRef(enableAutoScroll)

  // Update scroll behavior when auto-scroll changes
  useEffect(() => {
    shouldScrollRef.current = enableAutoScroll
  }, [enableAutoScroll])

  // Auto-scroll to bottom when new segments arrive (if enabled)
  useEffect(() => {
    if (shouldScrollRef.current && scrollContainerRef.current && segments.length > 0) {
      const container = scrollContainerRef.current
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100

      if (isNearBottom) {
        setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          })
        }, 100)
      }
    }
  }, [segments])

  // Get speaker colors (consistent across sessions)
  const getSpeakerColor = (speakerId: number) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-300',
      'bg-green-100 text-green-800 border-green-300',
      'bg-purple-100 text-purple-800 border-purple-300',
      'bg-orange-100 text-orange-800 border-orange-300',
      'bg-pink-100 text-pink-800 border-pink-300',
      'bg-indigo-100 text-indigo-800 border-indigo-300',
      'bg-yellow-100 text-yellow-800 border-yellow-300',
      'bg-red-100 text-red-800 border-red-300'
    ]
    return colors[speakerId % colors.length]
  }

  // Format timestamp
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Start editing a speaker name
  const startEditing = (speakerId: number, currentName: string) => {
    setEditingState({
      speakerId,
      newName: currentName
    })
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingState({
      speakerId: null,
      newName: ''
    })
  }

  // Save speaker correction
  const saveCorrection = () => {
    if (editingState.speakerId !== null && editingState.newName.trim()) {
      if (onSpeakerCorrection) {
        onSpeakerCorrection(editingState.speakerId, editingState.newName.trim())
      }
      cancelEditing()
    }
  }

  // Handle keyboard shortcuts in editing mode
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveCorrection()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  // Group consecutive segments by speaker for better readability
  const groupedSegments = segments.reduce<Array<{
    speaker: number
    segments: SpeakerSegment[]
    startTime: number
    endTime: number
  }>>((acc, segment) => {
    const lastGroup = acc[acc.length - 1]

    if (lastGroup && lastGroup.speaker === segment.speaker) {
      // Extend existing group
      lastGroup.segments.push(segment)
      lastGroup.endTime = segment.endMs
    } else {
      // Create new group
      acc.push({
        speaker: segment.speaker,
        segments: [segment],
        startTime: segment.startMs,
        endTime: segment.endMs
      })
    }

    return acc
  }, [])

  if (segments.length === 0) {
    return (
      <div className={`p-8 text-center text-gray-500 ${className}`}>
        <div className="mb-2">🎙️</div>
        <p>{placeholder}</p>
      </div>
    )
  }

  return (
    <div
      ref={scrollContainerRef}
      className={`space-y-4 max-h-96 overflow-y-auto ${className}`}
    >
      {groupedSegments.map((group, groupIndex) => {
        const speakerName = speakerMapping.get(group.speaker) || `Speaker ${group.speaker}`
        const isEditing = editingState.speakerId === group.speaker
        const combinedText = group.segments.map(s => s.text).join(' ').trim()

        if (!combinedText) return null

        return (
          <Card key={`${group.speaker}-${groupIndex}`} className="border-l-4 border-l-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {/* Speaker Badge/Editor */}
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      {availableParticipants.length > 0 ? (
                        <Select
                          value={editingState.newName}
                          onValueChange={(value) => setEditingState(prev => ({ ...prev, newName: value }))}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select participant" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableParticipants.map(participant => (
                              <SelectItem key={participant} value={participant}>
                                {participant}
                              </SelectItem>
                            ))}
                            <SelectItem value="Other">Other...</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <input
                          type="text"
                          value={editingState.newName}
                          onChange={(e) => setEditingState(prev => ({ ...prev, newName: e.target.value }))}
                          onKeyPress={handleKeyPress}
                          className="px-2 py-1 border rounded text-sm"
                          placeholder="Speaker name"
                          autoFocus
                        />
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={saveCorrection}
                        disabled={!editingState.newName.trim()}
                      >
                        <Check className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditing}
                      >
                        <X className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={`border cursor-pointer hover:opacity-80 transition-opacity ${getSpeakerColor(group.speaker)}`}
                        onClick={() => startEditing(group.speaker, speakerName)}
                      >
                        {speakerName}
                        <Edit2 className="h-3 w-3 ml-1 opacity-60" />
                      </Badge>

                      <span className="text-xs text-gray-500">
                        {formatTime(group.startTime)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Segment Count */}
                {group.segments.length > 1 && (
                  <Badge variant="outline" className="text-xs">
                    {group.segments.length} segments
                  </Badge>
                )}
              </div>

              {/* Transcript Text */}
              <div className="text-sm text-gray-800 leading-relaxed">
                {combinedText}
              </div>

              {/* Duration Info */}
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>
                  Duration: {Math.round((group.endTime - group.startTime) / 1000)}s
                </span>
                <span>
                  {group.segments.reduce((acc, seg) => acc + seg.tokens.length, 0)} tokens
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Auto-scroll indicator */}
      {enableAutoScroll && (
        <div className="flex justify-center py-2">
          <Badge variant="outline" className="text-xs text-gray-500 animate-pulse">
            Live transcription - Auto-scrolling
          </Badge>
        </div>
      )}
    </div>
  )
}