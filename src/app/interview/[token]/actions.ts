'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import { interviews, interviewResponses } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { processVideoResponse, processInterviewCompletion } from '@/lib/interview-processor'
import { redirect } from 'next/navigation'

export type InterviewActionResult =
  | { success: true; message: string; data?: any }
  | { success: false; error: string }

/**
 * Submit a single video response
 */
export async function submitVideoResponse(formData: FormData): Promise<InterviewActionResult> {
  try {
    const interviewId = formData.get('interviewId') as string
    const questionId = formData.get('questionId') as string
    const questionOrder = parseInt(formData.get('questionOrder') as string)
    const videoFile = formData.get('videoFile') as File

    if (!interviewId || !questionId || !videoFile) {
      return {
        success: false,
        error: 'Thiếu thông tin cần thiết'
      }
    }

    // Validate interview exists
    const interview = await db
      .select()
      .from(interviews)
      .where(eq(interviews.id, interviewId))
      .limit(1)

    if (!interview[0]) {
      return {
        success: false,
        error: 'Phỏng vấn không tồn tại'
      }
    }

    // Check interview hasn't expired
    if (interview[0].interviewLinkExpiresAt < new Date()) {
      return {
        success: false,
        error: 'Phỏng vấn đã hết hạn'
      }
    }

    // Convert file to blob
    const videoBlob = new Blob([await videoFile.arrayBuffer()], { type: videoFile.type })

    console.log(`📤 Submitting video response: ${videoFile.name} (${videoFile.size} bytes)`)

    // Process video response
    const result = await processVideoResponse({
      interviewId,
      questionId,
      videoBlob,
      questionOrder,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Không thể xử lý video'
      }
    }

    return {
      success: true,
      message: 'Video đã được gửi và đang được xử lý',
      data: {
        responseId: result.responseId,
        transcript: result.transcript,
        confidence: result.confidence,
        duration: result.duration,
      }
    }

  } catch (error) {
    console.error('Error submitting video response:', error)
    return {
      success: false,
      error: 'Lỗi khi gửi video. Vui lòng thử lại.'
    }
  }
}

/**
 * Submit complete interview with all responses
 */
export async function submitCompleteInterview(formData: FormData): Promise<InterviewActionResult> {
  try {
    const interviewId = formData.get('interviewId') as string
    const token = formData.get('token') as string

    if (!interviewId || !token) {
      return {
        success: false,
        error: 'Thiếu thông tin cần thiết'
      }
    }

    // Validate interview
    const interview = await db
      .select()
      .from(interviews)
      .where(eq(interviews.id, interviewId))
      .limit(1)

    if (!interview[0] || interview[0].interviewLinkToken !== token) {
      return {
        success: false,
        error: 'Phỏng vấn không hợp lệ'
      }
    }

    // Check if already completed
    if (interview[0].status === 'completed') {
      redirect(`/interview/${token}/complete`)
    }

    // Update interview status to in_progress if not already
    if (interview[0].status === 'pending') {
      await db
        .update(interviews)
        .set({
          status: 'in_progress',
          startedAt: new Date(),
        })
        .where(eq(interviews.id, interviewId))
    }

    // Process interview completion (this will trigger transcription)
    const processingSuccess = await processInterviewCompletion(interviewId)

    if (!processingSuccess) {
      return {
        success: false,
        error: 'Lỗi khi xử lý phỏng vấn. Vui lòng thử lại.'
      }
    }

    return {
      success: true,
      message: 'Phỏng vấn đã hoàn thành và đang được xử lý'
    }

  } catch (error) {
    console.error('Error submitting complete interview:', error)
    return {
      success: false,
      error: 'Lỗi khi hoàn thành phỏng vấn. Vui lòng thử lại.'
    }
  }
}

/**
 * Start interview (update status from pending to in_progress)
 */
export async function startInterview(formData: FormData): Promise<InterviewActionResult> {
  try {
    const interviewId = formData.get('interviewId') as string
    const token = formData.get('token') as string

    if (!interviewId || !token) {
      return {
        success: false,
        error: 'Thiếu thông tin cần thiết'
      }
    }

    // Validate interview
    const interview = await db
      .select()
      .from(interviews)
      .where(eq(interviews.id, interviewId))
      .limit(1)

    if (!interview[0] || interview[0].interviewLinkToken !== token) {
      return {
        success: false,
        error: 'Phỏng vấn không hợp lệ'
      }
    }

    // Check not already started
    if (interview[0].status !== 'pending') {
      return {
        success: false,
        error: 'Phỏng vấn đã được bắt đầu hoặc hoàn thành'
      }
    }

    // Update status
    await db
      .update(interviews)
      .set({
        status: 'in_progress',
        startedAt: new Date(),
      })
      .where(eq(interviews.id, interviewId))

    return {
      success: true,
      message: 'Phỏng vấn đã bắt đầu'
    }

  } catch (error) {
    console.error('Error starting interview:', error)
    return {
      success: false,
      error: 'Lỗi khi bắt đầu phỏng vấn. Vui lòng thử lại.'
    }
  }
}

/**
 * Get interview processing status
 */
export async function getInterviewStatus(interviewId: string): Promise<InterviewActionResult> {
  try {
    const interview = await db
      .select()
      .from(interviews)
      .where(eq(interviews.id, interviewId))
      .limit(1)

    if (!interview[0]) {
      return {
        success: false,
        error: 'Phỏng vấn không tồn tại'
      }
    }

    const responses = await db
      .select()
      .from(interviewResponses)
      .where(eq(interviewResponses.interviewId, interviewId))

    const transcribedResponses = responses.filter(r => r.responseTranscript)
    const completionPercentage = responses.length > 0 ? (transcribedResponses.length / responses.length) * 100 : 0

    return {
      success: true,
      message: 'Trạng thái phỏng vấn',
      data: {
        status: interview[0].status,
        startedAt: interview[0].startedAt,
        completedAt: interview[0].completedAt,
        processingStartedAt: interview[0].processingStartedAt,
        processingCompletedAt: interview[0].processingCompletedAt,
        totalResponses: responses.length,
        transcribedResponses: transcribedResponses.length,
        completionPercentage: Math.round(completionPercentage),
        overallScore: interview[0].overallScore,
        recommendation: interview[0].recommendation,
      }
    }

  } catch (error) {
    console.error('Error getting interview status:', error)
    return {
      success: false,
      error: 'Lỗi khi lấy trạng thái phỏng vấn'
    }
  }
}

/**
 * Save interview response (without video processing for quick saves)
 */
export async function saveInterviewResponse(formData: FormData): Promise<InterviewActionResult> {
  try {
    const interviewId = formData.get('interviewId') as string
    const questionId = formData.get('questionId') as string
    const questionOrder = parseInt(formData.get('questionOrder') as string)
    const duration = parseInt(formData.get('duration') as string)

    if (!interviewId || !questionId || isNaN(questionOrder)) {
      return {
        success: false,
        error: 'Thiếu thông tin cần thiết'
      }
    }

    // Save response without video processing (for progress tracking)
    const response = await db
      .insert(interviewResponses)
      .values({
        interviewId,
        questionId,
        questionOrder,
        responseDuration: duration || 0,
        recordingStartedAt: new Date(),
        recordingEndedAt: new Date(),
      })
      .returning()

    return {
      success: true,
      message: 'Phản hồi đã được lưu',
      data: {
        responseId: response[0]?.id
      }
    }

  } catch (error) {
    console.error('Error saving interview response:', error)
    return {
      success: false,
      error: 'Lỗi khi lưu phản hồi'
    }
  }
}