/**
 * Test data factories for creating consistent test data
 */

import { nanoid } from 'nanoid'
import type {
  PackageTier,
  InterviewStatus,
  CandidateStatus,
  Recommendation
} from '@/db/schema'

/**
 * Create organization test data
 */
export function createOrganizationData(overrides?: Partial<{
  id: string
  domain: string
  name: string
  packageTier: PackageTier
  interviewQuota: number
  interviewsUsed: number
}>) {
  const uniqueId = nanoid(8)
  const baseData = {
    id: nanoid(),
    domain: `test-${uniqueId}.com`,
    name: `Test Organization ${uniqueId}`,
    packageTier: 'startup' as PackageTier,
    interviewQuota: 100,
    interviewsUsed: 0,
    subscriptionExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }

  // Normalize domain to lowercase for consistency
  if (baseData.domain) {
    baseData.domain = baseData.domain.toLowerCase()
  }

  return baseData
}

/**
 * Create user test data
 */
export function createUserData(overrides?: Partial<{
  id: string
  email: string
  organizationId: string
  isAdmin: boolean
}>) {
  const uniqueId = nanoid(8)
  const baseData = {
    id: nanoid(),
    email: `user-${uniqueId}@test.com`,
    organizationId: nanoid(),
    isAdmin: false,
    lastLoginAt: null,
    createdAt: new Date(),
    ...overrides
  }

  // Normalize email to lowercase for consistency
  if (baseData.email) {
    baseData.email = baseData.email.toLowerCase()
  }

  return baseData
}

/**
 * Create job template test data
 */
export function createJobTemplateData(overrides?: Partial<{
  id: string
  organizationId: string
  title: string
  description: string
  interviewDuration: number
  impressionWeight: number
  taskPerformanceWeight: number
  logicalThinkingWeight: number
  researchAbilityWeight: number
  communicationWeight: number
  createdBy: string
}>) {
  return {
    id: nanoid(),
    organizationId: nanoid(),
    title: 'Senior Java Developer',
    description: 'Senior Java Developer position at VietinBank',
    interviewDuration: 20,
    impressionWeight: 20,
    taskPerformanceWeight: 25,
    logicalThinkingWeight: 20,
    researchAbilityWeight: 15,
    communicationWeight: 20,
    isActive: true,
    createdAt: new Date(),
    createdBy: nanoid(),
    ...overrides
  }
}

/**
 * Create interview test data
 */
export function createInterviewData(overrides?: Partial<{
  id: string
  organizationId: string
  jobTemplateId: string
  candidateEmail: string
  candidateName: string
  candidatePhone: string
  status: InterviewStatus
  candidateStatus: CandidateStatus
  interviewLinkToken: string
  overallScore: number
  recommendation: Recommendation
  aiScores: any
  transcript: string
  createdBy: string
}>) {
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + 7) // 7 days from now

  return {
    id: nanoid(),
    organizationId: nanoid(),
    jobTemplateId: nanoid(),
    candidateEmail: 'nguyen.van.a@example.com',
    candidateName: 'Nguyễn Văn A',
    candidatePhone: '+84901234567',
    status: 'pending' as InterviewStatus,
    candidateStatus: 'screened' as CandidateStatus,
    interviewLinkToken: nanoid(),
    interviewLinkExpiresAt: expiryDate,
    overallScore: null,
    recommendation: null,
    aiScores: null,
    transcript: null,
    processingStartedAt: null,
    processingCompletedAt: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    createdBy: nanoid(),
    ...overrides
  }
}

/**
 * Create interview question test data
 */
export function createInterviewQuestionData(overrides?: Partial<{
  id: string
  jobTemplateId: string
  questionText: string
  questionTextEn: string
  questionOrder: number
  timeLimit: number
  category: string
}>) {
  return {
    id: nanoid(),
    jobTemplateId: nanoid(),
    questionText: 'Hãy giới thiệu về bản thân và kinh nghiệm làm việc của bạn.',
    questionTextEn: 'Please introduce yourself and your work experience.',
    questionOrder: 1,
    timeLimit: 120,
    category: 'impression',
    isRequired: true,
    createdAt: new Date(),
    ...overrides
  }
}

/**
 * Create interview response test data
 */
export function createInterviewResponseData(overrides?: Partial<{
  id: string
  interviewId: string
  questionId: string
  questionOrder: number
  responseVideoUrl: string
  responseTranscript: string
  responseDuration: number
  responseScores: any
  attemptNumber: number
}>) {
  return {
    id: nanoid(),
    interviewId: nanoid(),
    questionId: nanoid(),
    questionOrder: 1,
    responseVideoUrl: 'https://example.com/video/response1.mp4',
    responseTranscript: 'Xin chào, tôi tên là Nguyễn Văn A. Tôi có 3 năm kinh nghiệm làm việc trong ngành tài chính ngân hàng...',
    responseDuration: 45,
    responseScores: {
      impression: 8.5,
      taskPerformance: 7.2,
      logicalThinking: 8.0,
      researchAbility: 6.8,
      communication: 8.2
    },
    attemptNumber: 1,
    recordingStartedAt: null,
    recordingEndedAt: null,
    createdAt: new Date(),
    ...overrides
  }
}

/**
 * Create email verification test data
 */
export function createEmailVerificationData(overrides?: Partial<{
  id: string
  email: string
  token: string
  organizationId: string
  isNewOrganization: boolean
  verifiedAt: Date
}>) {
  const expiryDate = new Date()
  expiryDate.setHours(expiryDate.getHours() + 24) // 24 hours from now

  return {
    id: nanoid(),
    email: 'test.user@vietinbank.com.vn',
    token: nanoid(),
    organizationId: nanoid(),
    isNewOrganization: false,
    expiresAt: expiryDate,
    verifiedAt: null,
    createdAt: new Date(),
    ...overrides
  }
}

/**
 * Create user session test data
 */
export function createUserSessionData(overrides?: Partial<{
  id: string
  userId: string
  sessionToken: string
}>) {
  const expiryDate = new Date()
  expiryDate.setHours(expiryDate.getHours() + 8) // 8 hours from now

  return {
    id: nanoid(),
    userId: nanoid(),
    sessionToken: nanoid(),
    expiresAt: expiryDate,
    createdAt: new Date(),
    ...overrides
  }
}

/**
 * Create candidate status test data
 */
export function createCandidateStatusData(overrides?: Partial<{
  id: string
  interviewId: string
  status: CandidateStatus
  updatedBy: string
  notes: string
}>) {
  return {
    id: nanoid(),
    interviewId: nanoid(),
    status: 'screened' as CandidateStatus,
    updatedBy: nanoid(),
    notes: null,
    updatedAt: new Date(),
    ...overrides
  }
}

/**
 * Create complete AI evaluation result
 */
export function createAIEvaluationResult(overrides?: Partial<{
  overall_score: number
  recommendation: Recommendation
  dimension_scores: any[]
}>) {
  return {
    interview_id: nanoid(),
    overall_score: 78,
    dimension_scores: [
      {
        dimension: 'impression',
        score: 85,
        level: 'Excellent',
        analysis: 'Ứng viên thể hiện tự tin, trang phục chỉn chu và giao tiếp tự nhiên.',
        strengths: ['Tự tin trong giao tiếp', 'Trang phục phù hợp'],
        areas_for_improvement: ['Có thể cải thiện ngôn ngữ cơ thể'],
        reasoning: 'Điểm ấn tượng tốt dựa trên phong thái và cách trình bày.'
      },
      {
        dimension: 'taskPerformance',
        score: 72,
        level: 'Good',
        analysis: 'Ứng viên đưa ra ví dụ cụ thể từ kinh nghiệm làm việc.',
        strengths: ['Có ví dụ thực tế từ dự án', 'Hiểu rõ yêu cầu công việc'],
        areas_for_improvement: ['Cần thêm số liệu cụ thể về thành tích'],
        reasoning: 'Thể hiện kiến thức chuyên môn tốt nhưng thiếu metrics.'
      }
    ],
    overall_summary: 'Ứng viên có nền tảng tốt cho vị trí Senior Java Developer với kinh nghiệm ngành ngân hàng.',
    recommendation: 'CONSIDER' as Recommendation,
    recommendation_reasoning: 'Ứng viên có tiềm năng nhưng cần đánh giá thêm ở vòng phỏng vấn trực tiếp.',
    key_strengths: [
      'Kinh nghiệm ngành ngân hàng',
      'Kỹ năng giao tiếp tốt',
      'Hiểu rõ yêu cầu công việc'
    ],
    key_concerns: [
      'Thiếu số liệu cụ thể về thành tích',
      'Cần đánh giá thêm kỹ năng leadership'
    ],
    next_steps: [
      'Phỏng vấn trực tiếp về kỹ năng kỹ thuật',
      'Đánh giá thêm về kinh nghiệm quản lý dự án',
      'Kiểm tra references từ công ty cũ'
    ],
    processing_time_ms: 2500,
    ai_model_used: 'gpt-4',
    evaluation_timestamp: new Date(),
    ...overrides
  }
}