/**
 * Unit tests for interview response submission API endpoint
 */

import { POST } from './route'
import * as schema from '@/db/schema'
import {
  createTestDatabase,
  seedBasicTestData,
  seedJobTemplateWithQuestions,
  cleanDatabase
} from '@/test/db-helpers'
import {
  createInterviewData,
  createInterviewResponseData
} from '@/test/factories'
import { setupCommonMocks } from '@/test/mocks'

// Import the mocked function
import { processVideoResponse } from '@/lib/interview-processor'

// Mock the database
let mockDb: any
jest.mock('@/lib/db', () => ({
  get db() {
    return mockDb
  }
}))

// Mock file upload and processing services
jest.mock('@/lib/file-upload', () => ({
  uploadVideo: jest.fn().mockResolvedValue({
    url: 'https://example.com/video/test.mp4',
    size: 1024000
  })
}))

jest.mock('@/lib/soniox', () => ({
  transcribeAudio: jest.fn().mockResolvedValue({
    transcript: 'Xin chào, tôi tên là Nguyễn Văn A.',
    confidence: 0.95
  })
}))

// Mock the interview processor with controllable behavior
const mockProcessVideoResponse = jest.fn()
jest.mock('@/lib/interview-processor', () => ({
  processVideoResponse: jest.fn()
}))

describe('POST /api/interview/submit-response', () => {
  let db: ReturnType<typeof createTestDatabase>
  let mocks: ReturnType<typeof setupCommonMocks>

  beforeEach(async () => {
    db = createTestDatabase()
    mockDb = db
    mocks = setupCommonMocks()

    // Configure default mock behavior - actually store data to test database
    const mockedProcessVideoResponse = processVideoResponse as jest.MockedFunction<typeof processVideoResponse>
    mockedProcessVideoResponse.mockImplementation(async (request: any) => {
      const { nanoid } = await import('nanoid')
      const responseId = nanoid()

      // Check for retry limits - get existing responses for this question
      const existingResponses = await db.query.interviewResponses.findMany({
        where: (r, { and, eq }) => and(
          eq(r.interviewId, request.interviewId),
          eq(r.questionOrder, request.questionOrder)
        )
      })

      // Maximum 2 attempts per question
      if (existingResponses.length >= 2) {
        return {
          success: false,
          error: 'Đã vượt quá số lần thử lại cho phép (tối đa 2 lần)'
        }
      }

      // Check interview status in database
      const interview = await db.query.interviews.findFirst({
        where: (i, { eq }) => eq(i.id, request.interviewId)
      })

      if (!interview) {
        return {
          success: false,
          error: 'Phỏng vấn không tồn tại'
        }
      }

      if (interview.status === 'completed') {
        return {
          success: false,
          error: 'Phiên phỏng vấn không còn hoạt động'
        }
      }

      // Insert response into test database
      const insertedResponse = await db.insert(schema.interviewResponses)
        .values({
          id: responseId,
          interviewId: request.interviewId,
          questionId: request.questionId,
          questionOrder: request.questionOrder,
          responseDuration: 45,
          attemptNumber: request.attemptNumber || existingResponses.length + 1,
          responseTranscript: 'Xin chào, tôi tên là Nguyễn Văn A.',
          recordingStartedAt: new Date(),
          recordingEndedAt: new Date(),
        })
        .returning()

      return {
        success: true,
        responseId,
        transcript: 'Xin chào, tôi tên là Nguyễn Văn A.',
        confidence: 0.95,
        duration: 45
      }
    })
  })

  afterEach(async () => {
    await cleanDatabase(db)
    jest.clearAllMocks()
  })

  afterAll(() => {
    // Restore all mocks to prevent interference with other test suites
    jest.restoreAllMocks()
  })

  describe('Valid Request Handling', () => {
    let interview: any
    let question: any

    beforeEach(async () => {
      const { organization, adminUser } = await seedBasicTestData(db)
      const { jobTemplate, questions } = await seedJobTemplateWithQuestions(
        db,
        organization.id,
        adminUser.id
      )

      const interviewData = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: jobTemplate.id,
        createdBy: adminUser.id,
        status: 'in_progress'
      })

      const [createdInterview] = await db.insert(schema.interviews)
        .values(interviewData)
        .returning()

      interview = createdInterview
      question = questions[0]
    })

    it('should submit video response successfully', async () => {
      const formData = new FormData()
      formData.append('interviewId', interview.id)
      formData.append('questionId', question.id)
      formData.append('questionOrder', '1')
      formData.append('attemptNumber', '1')

      // Create mock video file
      const videoBlob = new Blob(['mock video data'], { type: 'video/mp4' })
      const videoFile = new File([videoBlob], 'response.mp4', { type: 'video/mp4' })
      formData.append('videoFile', videoFile)

      const request = new Request('http://localhost:3000/api/interview/submit-response', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result).toMatchObject({
        success: true,
        message: 'Video đã được gửi và đang được xử lý'
      })
      expect(result.data.responseId).toBeDefined()

      // Verify processVideoResponse was called with correct parameters
      const mockedProcessVideoResponse = processVideoResponse as jest.MockedFunction<typeof processVideoResponse>
      expect(mockedProcessVideoResponse).toHaveBeenCalledWith({
        interviewId: interview.id,
        questionId: question.id,
        videoBlob: expect.any(Blob),
        questionOrder: 1
      })
    })

    it('should handle retry attempts within limit', async () => {
      // Submit first attempt
      const formData1 = new FormData()
      formData1.append('interviewId', interview.id)
      formData1.append('questionId', question.id)
      formData1.append('questionOrder', '1')
      formData1.append('attemptNumber', '1')

      const videoFile1 = new File(['mock video 1'], 'response1.mp4', { type: 'video/mp4' })
      formData1.append('videoFile', videoFile1)

      const request1 = new Request('http://localhost:3000/api/interview/submit-response', {
        method: 'POST',
        body: formData1
      })

      const response1 = await POST(request1)
      expect(response1.status).toBe(200)

      // Submit retry attempt
      const formData2 = new FormData()
      formData2.append('interviewId', interview.id)
      formData2.append('questionId', question.id)
      formData2.append('questionOrder', '1')
      formData2.append('attemptNumber', '2')

      const videoFile2 = new File(['mock video 2'], 'response2.mp4', { type: 'video/mp4' })
      formData2.append('videoFile', videoFile2)

      const request2 = new Request('http://localhost:3000/api/interview/submit-response', {
        method: 'POST',
        body: formData2
      })

      const response2 = await POST(request2)
      expect(response2.status).toBe(200)

      // Verify both attempts were stored
      const responses = await db.query.interviewResponses.findMany({
        where: (r, { eq }) => eq(r.interviewId, interview.id)
      })

      expect(responses).toHaveLength(2)
      expect(responses.map(r => r.attemptNumber).sort()).toEqual([1, 2])
    })

    it('should reject attempts beyond retry limit', async () => {
      // Submit two valid attempts first
      for (let attempt = 1; attempt <= 2; attempt++) {
        const formData = new FormData()
        formData.append('interviewId', interview.id)
        formData.append('questionId', question.id)
        formData.append('questionOrder', '1')
        formData.append('attemptNumber', attempt.toString())

        const videoFile = new File([`mock video ${attempt}`], `response${attempt}.mp4`, { type: 'video/mp4' })
        formData.append('videoFile', videoFile)

        const request = new Request('http://localhost:3000/api/interview/submit-response', {
          method: 'POST',
          body: formData
        })

        await POST(request)
      }

      // Try to submit third attempt (should be rejected)
      const formData = new FormData()
      formData.append('interviewId', interview.id)
      formData.append('questionId', question.id)
      formData.append('questionOrder', '1')
      formData.append('attemptNumber', '3')

      const videoFile = new File(['mock video 3'], 'response3.mp4', { type: 'video/mp4' })
      formData.append('videoFile', videoFile)

      const request = new Request('http://localhost:3000/api/interview/submit-response', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result).toMatchObject({
        success: false,
        error: 'Đã vượt quá số lần thử lại cho phép (tối đa 2 lần)'
      })
    })

    it('should handle multiple questions in same interview', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)
      const { jobTemplate, questions } = await seedJobTemplateWithQuestions(
        db,
        organization.id,
        adminUser.id
      )

      // Submit responses for multiple questions
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]

        const formData = new FormData()
        formData.append('interviewId', interview.id)
        formData.append('questionId', question.id)
        formData.append('questionOrder', (i + 1).toString())
        formData.append('attemptNumber', '1')

        const videoFile = new File([`mock video ${i + 1}`], `response${i + 1}.mp4`, { type: 'video/mp4' })
        formData.append('videoFile', videoFile)

        const request = new Request('http://localhost:3000/api/interview/submit-response', {
          method: 'POST',
          body: formData
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
      }

      // Verify all responses were stored
      const responses = await db.query.interviewResponses.findMany({
        where: (r, { eq }) => eq(r.interviewId, interview.id)
      })

      expect(responses).toHaveLength(questions.length)
      expect(responses.map(r => r.questionOrder).sort()).toEqual(
        Array.from({ length: questions.length }, (_, i) => i + 1)
      )
    })
  })

  describe('Error Handling', () => {
    it('should reject requests with missing interview ID', async () => {
      const formData = new FormData()
      formData.append('questionId', 'question-id')
      formData.append('questionOrder', '1')
      formData.append('attemptNumber', '1')

      const videoFile = new File(['mock video'], 'response.mp4', { type: 'video/mp4' })
      formData.append('videoFile', videoFile)

      const request = new Request('http://localhost:3000/api/interview/submit-response', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result).toMatchObject({
        success: false,
        error: 'Thiếu thông tin cần thiết'
      })
    })

    it('should reject requests with missing video file', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const interviewData = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: null, // No job template needed for this test
        createdBy: adminUser.id,
        status: 'in_progress'
      })

      const [interview] = await db.insert(schema.interviews)
        .values(interviewData)
        .returning()

      const formData = new FormData()
      formData.append('interviewId', interview.id)
      formData.append('questionId', 'question-id')
      formData.append('questionOrder', '1')
      formData.append('attemptNumber', '1')
      // No video file

      const request = new Request('http://localhost:3000/api/interview/submit-response', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result).toMatchObject({
        success: false,
        error: 'Thiếu thông tin cần thiết'
      })
    })

    it('should reject requests for non-existent interview', async () => {
      const formData = new FormData()
      formData.append('interviewId', 'non-existent-interview')
      formData.append('questionId', 'question-id')
      formData.append('questionOrder', '1')
      formData.append('attemptNumber', '1')

      const videoFile = new File(['mock video'], 'response.mp4', { type: 'video/mp4' })
      formData.append('videoFile', videoFile)

      const request = new Request('http://localhost:3000/api/interview/submit-response', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result).toMatchObject({
        success: false,
        error: 'Phỏng vấn không tồn tại'
      })
    })

    it('should reject submissions for completed interviews', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const interviewData = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: null, // No job template needed for this test
        createdBy: adminUser.id,
        status: 'completed' // Interview is already completed
      })

      const [interview] = await db.insert(schema.interviews)
        .values(interviewData)
        .returning()

      const formData = new FormData()
      formData.append('interviewId', interview.id)
      formData.append('questionId', 'question-id')
      formData.append('questionOrder', '1')
      formData.append('attemptNumber', '1')

      const videoFile = new File(['mock video'], 'response.mp4', { type: 'video/mp4' })
      formData.append('videoFile', videoFile)

      const request = new Request('http://localhost:3000/api/interview/submit-response', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result).toMatchObject({
        success: false,
        error: 'Phiên phỏng vấn không còn hoạt động'
      })
    })

    it('should reject submissions for expired interviews', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const expiredDate = new Date()
      expiredDate.setDate(expiredDate.getDate() - 1) // Yesterday

      const interviewData = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: null, // No job template needed for this test
        createdBy: adminUser.id,
        status: 'expired',
        interviewLinkExpiresAt: expiredDate
      })

      const [interview] = await db.insert(schema.interviews)
        .values(interviewData)
        .returning()

      const formData = new FormData()
      formData.append('interviewId', interview.id)
      formData.append('questionId', 'question-id')
      formData.append('questionOrder', '1')
      formData.append('attemptNumber', '1')

      const videoFile = new File(['mock video'], 'response.mp4', { type: 'video/mp4' })
      formData.append('videoFile', videoFile)

      const request = new Request('http://localhost:3000/api/interview/submit-response', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('hết hạn')
      })
    })

    it('should handle file upload failures', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const interviewData = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: null, // No job template needed for this test
        createdBy: adminUser.id,
        status: 'in_progress'
      })

      const [interview] = await db.insert(schema.interviews)
        .values(interviewData)
        .returning()

      // Mock processing failure to simulate file upload error
      const mockedProcessVideoResponse = processVideoResponse as jest.MockedFunction<typeof processVideoResponse>
      mockedProcessVideoResponse.mockResolvedValueOnce({
        success: false,
        error: 'Lỗi xử lý file: File upload failed'
      })

      const formData = new FormData()
      formData.append('interviewId', interview.id)
      formData.append('questionId', 'question-id')
      formData.append('questionOrder', '1')
      formData.append('attemptNumber', '1')

      const videoFile = new File(['mock video'], 'response.mp4', { type: 'video/mp4' })
      formData.append('videoFile', videoFile)

      const request = new Request('http://localhost:3000/api/interview/submit-response', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Lỗi xử lý file')
      })
    })

    it('should handle transcription failures gracefully', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)
      const { jobTemplate, questions } = await seedJobTemplateWithQuestions(
        db,
        organization.id,
        adminUser.id
      )

      const interviewData = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: jobTemplate.id,
        createdBy: adminUser.id,
        status: 'in_progress'
      })

      const [interview] = await db.insert(schema.interviews)
        .values(interviewData)
        .returning()

      // Mock transcription failure but still store response
      const mockedProcessVideoResponse = processVideoResponse as jest.MockedFunction<typeof processVideoResponse>
      mockedProcessVideoResponse.mockImplementationOnce(async (request: any) => {
        const { nanoid } = await import('nanoid')
        const responseId = nanoid()

        // Insert response without transcript
        await db.insert(schema.interviewResponses)
          .values({
            id: responseId,
            interviewId: request.interviewId,
            questionId: request.questionId,
            questionOrder: request.questionOrder,
            responseDuration: 45,
            attemptNumber: 1,
            responseTranscript: null, // No transcript due to failure
            recordingStartedAt: new Date(),
            recordingEndedAt: new Date(),
          })
          .returning()

        return {
          success: true, // Still successful even without transcript
          responseId,
          transcript: undefined,
          confidence: undefined,
          duration: 45
        }
      })

      const formData = new FormData()
      formData.append('interviewId', interview.id)
      formData.append('questionId', questions[0].id)
      formData.append('questionOrder', '1')
      formData.append('attemptNumber', '1')

      const videoFile = new File(['mock video'], 'response.mp4', { type: 'video/mp4' })
      formData.append('videoFile', videoFile)

      const request = new Request('http://localhost:3000/api/interview/submit-response', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200) // Should still succeed
      expect(result.success).toBe(true)

      // Verify response was stored without transcript
      const responses = await db.query.interviewResponses.findMany({
        where: (r, { eq }) => eq(r.interviewId, interview.id)
      })

      expect(responses).toHaveLength(1)
      expect(responses[0].responseTranscript).toBeNull()
    })

    it('should validate file size limits', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const interviewData = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: null, // No job template needed for this test
        createdBy: adminUser.id,
        status: 'in_progress'
      })

      const [interview] = await db.insert(schema.interviews)
        .values(interviewData)
        .returning()

      // Mock file size validation error
      const mockedProcessVideoResponse = processVideoResponse as jest.MockedFunction<typeof processVideoResponse>
      mockedProcessVideoResponse.mockResolvedValueOnce({
        success: false,
        error: 'File video quá lớn (tối đa 100MB)'
      })

      const formData = new FormData()
      formData.append('interviewId', interview.id)
      formData.append('questionId', 'question-id')
      formData.append('questionOrder', '1')
      formData.append('attemptNumber', '1')

      // Create oversized file (mock)
      const largeVideoData = 'x'.repeat(500 * 1024 * 1024) // 500MB
      const largeVideoFile = new File([largeVideoData], 'large.mp4', { type: 'video/mp4' })
      formData.append('videoFile', largeVideoFile)

      const request = new Request('http://localhost:3000/api/interview/submit-response', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('quá lớn')
      })
    })

    it('should validate video file format', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const interviewData = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: null, // No job template needed for this test
        createdBy: adminUser.id,
        status: 'in_progress'
      })

      const [interview] = await db.insert(schema.interviews)
        .values(interviewData)
        .returning()

      // Mock file format validation error
      const mockedProcessVideoResponse = processVideoResponse as jest.MockedFunction<typeof processVideoResponse>
      mockedProcessVideoResponse.mockResolvedValueOnce({
        success: false,
        error: 'Định dạng video không được hỗ trợ'
      })

      const formData = new FormData()
      formData.append('interviewId', interview.id)
      formData.append('questionId', 'question-id')
      formData.append('questionOrder', '1')
      formData.append('attemptNumber', '1')

      // Create invalid file format
      const textFile = new File(['not a video'], 'text.txt', { type: 'text/plain' })
      formData.append('videoFile', textFile)

      const request = new Request('http://localhost:3000/api/interview/submit-response', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result).toMatchObject({
        success: false,
        error: expect.stringMatching(/định dạng video/i) // Case insensitive match
      })
    })
  })

  describe('Performance and Concurrency', () => {
    it('should handle concurrent submissions for different questions', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)
      const { jobTemplate, questions } = await seedJobTemplateWithQuestions(
        db,
        organization.id,
        adminUser.id
      )

      const interviewData = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: jobTemplate.id,
        createdBy: adminUser.id,
        status: 'in_progress'
      })

      const [interview] = await db.insert(schema.interviews)
        .values(interviewData)
        .returning()

      // Submit responses concurrently for different questions
      const submissions = questions.slice(0, 2).map((question, index) => {
        const formData = new FormData()
        formData.append('interviewId', interview.id)
        formData.append('questionId', question.id)
        formData.append('questionOrder', (index + 1).toString())
        formData.append('attemptNumber', '1')

        const videoFile = new File([`mock video ${index + 1}`], `response${index + 1}.mp4`, { type: 'video/mp4' })
        formData.append('videoFile', videoFile)

        const request = new Request('http://localhost:3000/api/interview/submit-response', {
          method: 'POST',
          body: formData
        })

        return POST(request)
      })

      const responses = await Promise.all(submissions)

      // All submissions should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Verify all responses were stored
      const storedResponses = await db.query.interviewResponses.findMany({
        where: (r, { eq }) => eq(r.interviewId, interview.id)
      })

      expect(storedResponses).toHaveLength(2)
    })
  })
})