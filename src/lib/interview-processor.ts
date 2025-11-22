/**
 * Interview Response Processing System
 * Handles video upload, audio extraction, and transcription workflow
 */

import { db } from '@/lib/db'
import { interviews, interviewResponses, interviewQuestions, type Recommendation } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { createSonioxClient, extractAudioFromVideo, convertToWav, estimateTranscriptionCost } from '@/lib/soniox'
import { createAIScoringEngine, formatScoresForStorage, type QuestionResponse } from '@/lib/ai-scoring-engine'
import { nanoid } from 'nanoid'

export interface ProcessVideoRequest {
  interviewId: string
  questionId: string
  videoBlob: Blob
  questionOrder: number
  attemptNumber?: number
}

export interface ProcessingResult {
  success: boolean
  responseId?: string
  transcript?: string
  confidence?: number
  duration?: number
  error?: string
  estimatedCost?: number
}

export interface TranscriptionJob {
  id: string
  interviewId: string
  questionId: string
  responseId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  error?: string
}

/**
 * Main processor for interview video responses
 */
export class InterviewProcessor {
  private sonioxClient
  private aiScoringEngine
  private processingQueue: Map<string, TranscriptionJob> = new Map()

  constructor() {
    this.sonioxClient = createSonioxClient()
    this.aiScoringEngine = createAIScoringEngine()
  }

  /**
   * Process a single video response
   */
  async processVideoResponse(request: ProcessVideoRequest): Promise<ProcessingResult> {
    try {
      console.log(`🎬 Processing video response for interview ${request.interviewId}, question ${request.questionOrder}`)

      // Validate interview exists
      const interview = await db
        .select()
        .from(interviews)
        .where(eq(interviews.id, request.interviewId))
        .limit(1)

      if (!interview[0]) {
        return {
          success: false,
          error: 'Interview không tồn tại'
        }
      }

      // Convert video blob to buffer
      const videoBuffer = Buffer.from(await request.videoBlob.arrayBuffer())
      const videoDuration = await this.estimateVideoDuration(videoBuffer)

      console.log(`⏱️ Video duration: ${videoDuration} seconds`)

      // Create interview response record first
      const responseId = nanoid()
      const interviewResponse = await db
        .insert(interviewResponses)
        .values({
          id: responseId,
          interviewId: request.interviewId,
          questionId: request.questionId,
          questionOrder: request.questionOrder,
          responseDuration: Math.round(videoDuration),
          attemptNumber: request.attemptNumber || 1,
          recordingStartedAt: new Date(),
          recordingEndedAt: new Date(),
        })
        .returning()

      if (!interviewResponse[0]) {
        return {
          success: false,
          error: 'Không thể tạo bản ghi response'
        }
      }

      // Start async transcription process
      const transcriptionResult = await this.transcribeVideo(videoBuffer, {
        interviewId: request.interviewId,
        responseId: responseId,
        questionId: request.questionId,
      })

      // Update response with transcription
      if (transcriptionResult.success && transcriptionResult.transcript) {
        await db
          .update(interviewResponses)
          .set({
            responseTranscript: transcriptionResult.transcript,
            // Store transcription confidence and other metadata in JSON
            responseScores: {
              transcription_confidence: transcriptionResult.confidence,
              processing_duration: transcriptionResult.duration,
            } as any
          })
          .where(eq(interviewResponses.id, responseId))
      }

      return {
        success: true,
        responseId: responseId,
        transcript: transcriptionResult.transcript,
        confidence: transcriptionResult.confidence,
        duration: videoDuration,
        estimatedCost: transcriptionResult.estimatedCost,
      }

    } catch (error) {
      console.error('❌ Video processing failed:', error)
      return {
        success: false,
        error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Transcribe video using Soniox API
   */
  private async transcribeVideo(
    videoBuffer: Buffer,
    metadata: { interviewId: string; responseId: string; questionId: string }
  ): Promise<{
    success: boolean
    transcript?: string
    confidence?: number
    duration?: number
    estimatedCost?: number
    error?: string
  }> {
    try {
      console.log('🎵 Starting video transcription process...')

      // Extract audio from video
      const audioBuffer = await extractAudioFromVideo(videoBuffer)
      console.log(`🔊 Extracted audio buffer: ${audioBuffer.length} bytes`)

      // Convert to WAV format for Soniox
      const wavBuffer = await convertToWav(audioBuffer)

      // Estimate duration and cost
      const estimatedDuration = await this.estimateAudioDuration(wavBuffer)
      const costEstimate = estimateTranscriptionCost(estimatedDuration)

      console.log(`💰 Estimated transcription cost: $${costEstimate.estimatedCost} for ${costEstimate.billingMinutes} minutes`)

      // Transcribe with Soniox
      console.log('🎯 Sending to Soniox for Vietnamese transcription...')
      const transcriptionResult = await this.sonioxClient.transcribeAudio(wavBuffer, {
        enableSpeakerDiarization: true,
        enablePunctuation: true,
        language: ['vi', 'en'], // Vietnamese primary, English fallback
      })

      console.log(`✅ Transcription completed: ${transcriptionResult.text.length} characters`)

      return {
        success: true,
        transcript: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        duration: estimatedDuration,
        estimatedCost: costEstimate.estimatedCost,
      }

    } catch (error) {
      console.error('❌ Transcription failed:', error)
      return {
        success: false,
        error: `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Process multiple responses in batch
   */
  async processBatchResponses(requests: ProcessVideoRequest[]): Promise<ProcessingResult[]> {
    console.log(`📦 Processing batch of ${requests.length} video responses`)

    const results: ProcessingResult[] = []

    // Process sequentially to avoid overwhelming the API
    for (const request of requests) {
      try {
        const result = await this.processVideoResponse(request)
        results.push(result)

        // Add delay between requests to respect API rate limits
        await this.delay(1000)
      } catch (error) {
        results.push({
          success: false,
          error: `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    return results
  }

  /**
   * Mark interview as completed after all responses are processed
   */
  async finalizeInterview(interviewId: string): Promise<boolean> {
    try {
      console.log(`🏁 Finalizing interview ${interviewId}`)

      // Check if all responses have transcripts
      const responses = await db
        .select()
        .from(interviewResponses)
        .where(eq(interviewResponses.interviewId, interviewId))

      const transcribedResponses = responses.filter(r => r.responseTranscript && r.responseTranscript.trim().length > 0)
      const completionRate = transcribedResponses.length / responses.length

      console.log(`📊 Interview completion rate: ${Math.round(completionRate * 100)}% (${transcribedResponses.length}/${responses.length} responses transcribed)`)

      // Create full transcript by combining all responses
      const fullTranscript = transcribedResponses
        .sort((a, b) => a.questionOrder - b.questionOrder)
        .map(r => `Q${r.questionOrder}: ${r.responseTranscript}`)
        .join('\n\n')

      // Update interview status with transcript
      await db
        .update(interviews)
        .set({
          status: 'completed',
          completedAt: new Date(),
          transcript: fullTranscript
        })
        .where(eq(interviews.id, interviewId))

      // Trigger AI evaluation if transcription is complete
      if (completionRate >= 0.8) { // Allow evaluation even if some responses failed
        console.log(`🧠 Starting AI evaluation for interview ${interviewId}...`)
        await this.performAIEvaluation(interviewId)
      } else {
        console.log(`⚠️ Skipping AI evaluation - insufficient transcription completion (${Math.round(completionRate * 100)}%)`)
      }

      // Mark processing as completed
      await db
        .update(interviews)
        .set({
          processingCompletedAt: new Date(),
        })
        .where(eq(interviews.id, interviewId))

      return true

    } catch (error) {
      console.error('❌ Failed to finalize interview:', error)
      return false
    }
  }

  /**
   * Perform AI evaluation on completed interview
   */
  async performAIEvaluation(interviewId: string): Promise<boolean> {
    try {
      console.log(`🧠 Starting AI evaluation for interview ${interviewId}`)

      // Get interview responses and questions
      const responsesWithQuestions = await db
        .select({
          response: interviewResponses,
          question: interviewQuestions
        })
        .from(interviewResponses)
        .leftJoin(interviewQuestions, eq(interviewResponses.questionId, interviewQuestions.id))
        .where(eq(interviewResponses.interviewId, interviewId))
        .orderBy(interviewResponses.questionOrder)

      // Filter only responses with transcripts
      const validResponses = responsesWithQuestions.filter(r =>
        r.response.responseTranscript &&
        r.response.responseTranscript.trim().length > 0 &&
        r.question?.questionText
      )

      if (validResponses.length === 0) {
        console.log(`⚠️ No valid responses found for AI evaluation`)
        return false
      }

      // Convert to QuestionResponse format
      const questionResponses: QuestionResponse[] = validResponses.map(r => ({
        question_text: r.question!.questionText,
        response_transcript: r.response.responseTranscript!,
        question_order: r.response.questionOrder,
        response_duration: r.response.responseDuration || undefined
      }))

      console.log(`📝 Evaluating ${questionResponses.length} responses...`)

      // Perform AI evaluation
      const evaluation = await this.aiScoringEngine.evaluateInterview(interviewId, questionResponses)

      // Format scores for database storage
      const formattedScores = formatScoresForStorage(evaluation)

      // Update interview with AI scores
      await db
        .update(interviews)
        .set({
          overallScore: formattedScores.overall_score,
          recommendation: formattedScores.recommendation as Recommendation,
          aiScores: formattedScores.ai_scores,
        })
        .where(eq(interviews.id, interviewId))

      console.log(`✅ AI evaluation completed: ${evaluation.overall_score}/100 (${evaluation.recommendation})`)

      return true

    } catch (error) {
      console.error('❌ AI evaluation failed:', error)

      // Update interview to indicate AI evaluation failed
      await db
        .update(interviews)
        .set({
          recommendation: 'CONSIDER' as Recommendation,
          aiScores: JSON.stringify({
            error: 'AI evaluation failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
          })
        })
        .where(eq(interviews.id, interviewId))

      return false
    }
  }

  /**
   * Get processing status for an interview
   */
  async getProcessingStatus(interviewId: string): Promise<{
    totalResponses: number
    processedResponses: number
    transcribedResponses: number
    completionPercentage: number
    status: 'pending' | 'processing' | 'completed' | 'failed'
  }> {
    const responses = await db
      .select()
      .from(interviewResponses)
      .where(eq(interviewResponses.interviewId, interviewId))

    const transcribedResponses = responses.filter(r => r.responseTranscript && r.responseTranscript.trim().length > 0)
    const completionPercentage = responses.length > 0 ? (transcribedResponses.length / responses.length) * 100 : 0

    let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending'
    if (completionPercentage === 100) {
      status = 'completed'
    } else if (transcribedResponses.length > 0) {
      status = 'processing'
    }

    return {
      totalResponses: responses.length,
      processedResponses: responses.length,
      transcribedResponses: transcribedResponses.length,
      completionPercentage: Math.round(completionPercentage),
      status,
    }
  }

  /**
   * Helper methods
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async estimateVideoDuration(videoBuffer: Buffer): Promise<number> {
    // In production, use FFmpeg to get actual video duration
    // For now, estimate based on file size (rough approximation)
    const estimatedDuration = Math.max(30, Math.min(300, videoBuffer.length / 100000))
    return estimatedDuration
  }

  private async estimateAudioDuration(audioBuffer: Buffer): Promise<number> {
    // In production, analyze audio file header for duration
    // For now, estimate based on buffer size
    const estimatedDuration = Math.max(30, audioBuffer.length / 32000) // Rough estimate for 16kHz audio
    return estimatedDuration
  }
}

/**
 * Lazy-initialized global processor instance
 */
let interviewProcessorInstance: InterviewProcessor | null = null

export function getInterviewProcessor(): InterviewProcessor {
  if (!interviewProcessorInstance) {
    interviewProcessorInstance = new InterviewProcessor()
  }
  return interviewProcessorInstance
}

/**
 * Convenience function to process a single video response
 */
export async function processVideoResponse(request: ProcessVideoRequest): Promise<ProcessingResult> {
  return await getInterviewProcessor().processVideoResponse(request)
}

/**
 * Process interview completion and trigger transcription
 */
export async function processInterviewCompletion(interviewId: string): Promise<boolean> {
  try {
    console.log(`🎬 Starting processing for completed interview: ${interviewId}`)

    // Update interview status to processing
    await db
      .update(interviews)
      .set({
        processingStartedAt: new Date(),
      })
      .where(eq(interviews.id, interviewId))

    // Finalize and create transcript
    const success = await getInterviewProcessor().finalizeInterview(interviewId)

    if (success) {
      console.log(`✅ Interview ${interviewId} processing completed successfully`)
    } else {
      console.log(`❌ Interview ${interviewId} processing failed`)
    }

    return success

  } catch (error) {
    console.error('❌ Interview completion processing failed:', error)
    return false
  }
}

/**
 * Manually trigger AI evaluation for an existing interview
 */
export async function triggerAIEvaluation(interviewId: string): Promise<boolean> {
  try {
    console.log(`🧠 Manually triggering AI evaluation for interview: ${interviewId}`)

    // Check if interview exists and is completed
    const interview = await db
      .select()
      .from(interviews)
      .where(eq(interviews.id, interviewId))
      .limit(1)

    if (!interview[0]) {
      console.error(`❌ Interview ${interviewId} not found`)
      return false
    }

    if (interview[0].status !== 'completed') {
      console.error(`❌ Interview ${interviewId} is not completed (status: ${interview[0].status})`)
      return false
    }

    // Perform AI evaluation
    const success = await getInterviewProcessor().performAIEvaluation(interviewId)

    if (success) {
      console.log(`✅ AI evaluation completed for interview ${interviewId}`)
    } else {
      console.log(`❌ AI evaluation failed for interview ${interviewId}`)
    }

    return success

  } catch (error) {
    console.error('❌ Manual AI evaluation failed:', error)
    return false
  }
}

/**
 * Batch process AI evaluation for multiple interviews
 */
export async function batchProcessAIEvaluation(interviewIds: string[]): Promise<{
  successful: string[]
  failed: string[]
}> {
  const results = {
    successful: [] as string[],
    failed: [] as string[]
  }

  console.log(`📦 Starting batch AI evaluation for ${interviewIds.length} interviews`)

  for (const interviewId of interviewIds) {
    try {
      const success = await triggerAIEvaluation(interviewId)
      if (success) {
        results.successful.push(interviewId)
      } else {
        results.failed.push(interviewId)
      }

      // Add delay between evaluations to avoid overwhelming OpenAI API
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (error) {
      console.error(`❌ Batch evaluation failed for interview ${interviewId}:`, error)
      results.failed.push(interviewId)
    }
  }

  console.log(`✅ Batch evaluation completed: ${results.successful.length} successful, ${results.failed.length} failed`)
  return results
}