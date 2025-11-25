'use client'

import { useState, useTransition } from 'react'
import { ParticipantProgressMonitor } from './ParticipantProgressMonitor'
import { refreshParticipantData } from '@/app/dashboard/assessment-sessions/[id]/monitoring-actions'
import { useRouter } from 'next/navigation'

interface ParticipantProgress {
  id: string
  name: string
  email: string
  roleCode: string
  roleName: string
  interviewToken: string | null
  tbeiStatus: 'pending' | 'in_progress' | 'completed'
  hipoStatus: 'pending' | 'in_progress' | 'completed'
  quizStatus: 'pending' | 'in_progress' | 'completed'
  emailSentAt: string | null
  // Additional progress data
  tbeiProgress?: {
    competenciesCompleted: number
    totalCompetencies: number
    lastActivity?: string
    evaluationStatus?: 'pending' | 'in_progress' | 'completed'
  }
  hipoProgress?: {
    sectionsCompleted: number
    totalSections: number
    score?: number
    lastActivity?: string
  }
  quizProgress?: {
    questionsAnswered: number
    totalQuestions: number
    score?: number
    timeRemaining?: number
    lastActivity?: string
  }
}

interface Props {
  sessionId: string
  initialParticipants: ParticipantProgress[]
}

export function ParticipantProgressMonitorWrapper({ sessionId, initialParticipants }: Props) {
  const [participants, setParticipants] = useState(initialParticipants)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const refreshedData = await refreshParticipantData(sessionId)
        setParticipants(refreshedData)
        // Also refresh the page data
        router.refresh()
      } catch (error) {
        console.error('Error refreshing participant data:', error)
        // Fallback to page refresh
        router.refresh()
      }
    })
  }

  return (
    <ParticipantProgressMonitor
      sessionId={sessionId}
      participants={participants}
      onRefresh={handleRefresh}
      refreshing={isPending}
    />
  )
}