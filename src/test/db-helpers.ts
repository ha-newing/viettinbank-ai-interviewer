/**
 * Database test helpers for common database operations in tests
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import { SQLiteTable } from 'drizzle-orm/sqlite-core'
import Database from 'better-sqlite3'
import * as schema from '@/db/schema'
import {
  createOrganizationData,
  createUserData,
  createJobTemplateData,
  createInterviewData,
  createInterviewQuestionData,
  createInterviewResponseData,
  createEmailVerificationData,
  createUserSessionData,
  createCandidateStatusData
} from './factories'

export type TestDatabase = ReturnType<typeof drizzle<typeof schema>>

/**
 * Create a test database instance
 */
export function createTestDatabase(): TestDatabase {
  const sqlite = new Database(':memory:')
  return drizzle(sqlite, { schema })
}

/**
 * Seed database with test organization and admin user
 */
export async function seedBasicTestData(db: TestDatabase) {
  // Create test organization
  const orgData = createOrganizationData({
    domain: 'vietinbank.com.vn',
    name: 'VietinBank Test'
  })
  const [organization] = await db.insert(schema.organizations).values(orgData).returning()

  // Create admin user
  const adminData = createUserData({
    email: 'admin@vietinbank.com.vn',
    organizationId: organization.id,
    isAdmin: true
  })
  const [adminUser] = await db.insert(schema.users).values(adminData).returning()

  // Create regular user
  const userData = createUserData({
    email: 'user@vietinbank.com.vn',
    organizationId: organization.id,
    isAdmin: false
  })
  const [regularUser] = await db.insert(schema.users).values(userData).returning()

  return {
    organization,
    adminUser,
    regularUser
  }
}

/**
 * Seed database with job template and questions
 */
export async function seedJobTemplateWithQuestions(
  db: TestDatabase,
  organizationId: string,
  createdBy: string
) {
  // Create job template
  const jobTemplateData = createJobTemplateData({
    organizationId,
    createdBy,
    title: 'Senior Java Developer',
    interviewDuration: 20
  })
  const [jobTemplate] = await db.insert(schema.jobTemplates).values(jobTemplateData).returning()

  // Create interview questions
  const questions = [
    createInterviewQuestionData({
      jobTemplateId: jobTemplate.id,
      questionText: 'Hãy giới thiệu về bản thân và kinh nghiệm làm việc của bạn.',
      questionTextEn: 'Please introduce yourself and your work experience.',
      questionOrder: 1,
      category: 'impression'
    }),
    createInterviewQuestionData({
      jobTemplateId: jobTemplate.id,
      questionText: 'Kể về một dự án thành công mà bạn đã tham gia và vai trò của bạn trong dự án đó.',
      questionTextEn: 'Tell me about a successful project you participated in and your role.',
      questionOrder: 2,
      category: 'taskPerformance'
    }),
    createInterviewQuestionData({
      jobTemplateId: jobTemplate.id,
      questionText: 'Bạn sẽ xử lý như thế nào khi gặp phải một vấn đề kỹ thuật phức tạp?',
      questionTextEn: 'How would you handle a complex technical problem?',
      questionOrder: 3,
      category: 'logicalThinking'
    })
  ]

  const insertedQuestions = await db.insert(schema.interviewQuestions).values(questions).returning()

  return {
    jobTemplate,
    questions: insertedQuestions
  }
}

/**
 * Seed database with complete interview data including responses
 */
export async function seedCompleteInterview(
  db: TestDatabase,
  organizationId: string,
  jobTemplateId: string,
  createdBy: string
) {
  // Create interview
  const interviewData = createInterviewData({
    organizationId,
    jobTemplateId,
    createdBy,
    candidateEmail: 'nguyen.van.a@example.com',
    candidateName: 'Nguyễn Văn A',
    status: 'completed'
  })
  const [interview] = await db.insert(schema.interviews).values(interviewData).returning()

  // Get questions for this job template
  const questions = await db.query.interviewQuestions.findMany({
    where: (q, { eq }) => eq(q.jobTemplateId, jobTemplateId)
  })

  // Create responses for each question
  const responses = questions.map(question =>
    createInterviewResponseData({
      interviewId: interview.id,
      questionId: question.id,
      questionOrder: question.questionOrder,
      responseTranscript: `Trả lời cho câu hỏi ${question.questionOrder}: ${question.questionText}. Đây là một câu trả lời mẫu cho mục đích testing.`
    })
  )

  const insertedResponses = await db.insert(schema.interviewResponses).values(responses).returning()

  return {
    interview,
    responses: insertedResponses
  }
}

/**
 * Clean all data from database tables
 */
export async function cleanDatabase(db: TestDatabase) {
  await db.delete(schema.candidateStatuses)
  await db.delete(schema.interviewResponses)
  await db.delete(schema.interviews)
  await db.delete(schema.interviewQuestions)
  await db.delete(schema.jobTemplates)
  await db.delete(schema.userSessions)
  await db.delete(schema.emailVerifications)
  await db.delete(schema.users)
  await db.delete(schema.organizations)
}

/**
 * Generic function to get count of records in any table
 */
export async function getTableCount<T extends keyof typeof schema>(
  db: TestDatabase,
  tableName: T
) {
  const table = schema[tableName] as SQLiteTable<any>
  const result = await db.select().from(table)
  return result.length
}

/**
 * Get count of records in organizations table
 */
export async function getOrganizationCount(db: TestDatabase) {
  return getTableCount(db, 'organizations')
}

/**
 * Get count of records in users table
 */
export async function getUserCount(db: TestDatabase) {
  const result = await db.select().from(schema.users)
  return result.length
}

/**
 * Verify interview scoring weights total 100%
 */
export function validateScoringWeights(weights: {
  impressionWeight: number
  taskPerformanceWeight: number
  logicalThinkingWeight: number
  researchAbilityWeight: number
  communicationWeight: number
}) {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
  return total === 100
}

/**
 * Create valid scoring weights that total 100%
 */
export function createValidScoringWeights() {
  return {
    impressionWeight: 20,
    taskPerformanceWeight: 25,
    logicalThinkingWeight: 20,
    researchAbilityWeight: 15,
    communicationWeight: 20
  }
}