/**
 * Server actions for individual candidate report
 */

'use server'

import { db } from '@/lib/db'
import { interviews, interviewResponses, interviewQuestions, jobTemplates, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getAllEvaluationDimensions } from '@/lib/evaluation-framework'

export interface CandidateReportData {
  interview: {
    id: string
    candidateName: string
    candidateEmail: string
    candidatePhone: string | null
    status: string
    overallScore: number | null
    recommendation: string | null
    transcript: string | null
    startedAt: Date | null
    completedAt: Date | null
    createdAt: Date
    processingCompletedAt: Date | null
  }
  jobTemplate: {
    title: string
    description: string | null
  } | null
  aiEvaluation: {
    dimension_scores: Array<{
      dimension: string
      score: number
      level: string
      analysis: string
      strengths: string[]
      areas_for_improvement: string[]
      reasoning: string
    }>
    overall_summary: string
    key_strengths: string[]
    key_concerns: string[]
    next_steps: string[]
    processing_time_ms: number
    ai_model_used: string
    evaluation_timestamp: string
  } | null
  responses: Array<{
    id: string
    questionOrder: number
    questionText: string
    responseTranscript: string | null
    responseDuration: number | null
    recordingStartedAt: Date | null
    recordingEndedAt: Date | null
  }>
  evaluationDimensions: { [key: string]: any }
}

/**
 * Fetch comprehensive candidate report data
 */
export async function getCandidateReport(interviewId: string): Promise<{
  success: boolean
  data?: CandidateReportData
  error?: string
}> {
  try {
    // Check authentication and permissions
    const user = await requireAuth()

    // Fetch interview with related data
    const interviewData = await db
      .select({
        interview: interviews,
        jobTemplate: jobTemplates,
        creator: users
      })
      .from(interviews)
      .leftJoin(jobTemplates, eq(interviews.jobTemplateId, jobTemplates.id))
      .leftJoin(users, eq(interviews.createdBy, users.id))
      .where(eq(interviews.id, interviewId))
      .limit(1)

    if (!interviewData[0]) {
      return {
        success: false,
        error: 'Interview not found'
      }
    }

    const { interview, jobTemplate } = interviewData[0]

    // Check organization permissions
    if (interview.organizationId !== user.organizationId) {
      return {
        success: false,
        error: 'Unauthorized access to this interview'
      }
    }

    // Fetch interview responses with questions
    const responsesData = await db
      .select({
        response: interviewResponses,
        question: interviewQuestions
      })
      .from(interviewResponses)
      .leftJoin(interviewQuestions, eq(interviewResponses.questionId, interviewQuestions.id))
      .where(eq(interviewResponses.interviewId, interviewId))
      .orderBy(interviewResponses.questionOrder)

    // Parse AI evaluation results
    let aiEvaluation = null
    if (interview.aiScores) {
      try {
        aiEvaluation = typeof interview.aiScores === 'string'
          ? JSON.parse(interview.aiScores)
          : interview.aiScores
      } catch (error) {
        console.error('Failed to parse AI scores:', error)
      }
    }

    // Get evaluation dimensions for reference
    const evaluationDimensions = getAllEvaluationDimensions()

    // Format response data
    const responses = responsesData.map(({ response, question }) => ({
      id: response.id,
      questionOrder: response.questionOrder,
      questionText: question?.questionText || `Câu hỏi ${response.questionOrder}`,
      responseTranscript: response.responseTranscript,
      responseDuration: response.responseDuration,
      recordingStartedAt: response.recordingStartedAt,
      recordingEndedAt: response.recordingEndedAt,
    }))

    const reportData: CandidateReportData = {
      interview: {
        id: interview.id,
        candidateName: interview.candidateName,
        candidateEmail: interview.candidateEmail,
        candidatePhone: interview.candidatePhone,
        status: interview.status,
        overallScore: interview.overallScore,
        recommendation: interview.recommendation,
        transcript: interview.transcript,
        startedAt: interview.startedAt,
        completedAt: interview.completedAt,
        createdAt: interview.createdAt,
        processingCompletedAt: interview.processingCompletedAt,
      },
      jobTemplate: jobTemplate ? {
        title: jobTemplate.title,
        description: jobTemplate.description,
      } : null,
      aiEvaluation,
      responses,
      evaluationDimensions
    }

    return {
      success: true,
      data: reportData
    }

  } catch (error) {
    console.error('Failed to fetch candidate report:', error)
    return {
      success: false,
      error: 'Failed to load candidate report'
    }
  }
}

/**
 * Generate PDF report for candidate (placeholder for future implementation)
 */
export async function generatePDFReport(interviewId: string): Promise<{
  success: boolean
  pdfUrl?: string
  error?: string
}> {
  try {
    // TODO: Implement PDF generation using libraries like puppeteer or jsPDF
    // This would generate a downloadable PDF version of the candidate report

    return {
      success: false,
      error: 'PDF generation not yet implemented'
    }
  } catch (error) {
    console.error('Failed to generate PDF report:', error)
    return {
      success: false,
      error: 'Failed to generate PDF report'
    }
  }
}

/**
 * Update candidate status/notes (for future implementation)
 */
export async function updateCandidateStatus(
  interviewId: string,
  status: string,
  notes?: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const user = await requireAuth()

    // TODO: Implement candidate status updates
    // This would allow HR to add notes and update candidate status

    return {
      success: false,
      error: 'Status update not yet implemented'
    }
  } catch (error) {
    console.error('Failed to update candidate status:', error)
    return {
      success: false,
      error: 'Failed to update candidate status'
    }
  }
}