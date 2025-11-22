/**
 * Database test helpers for common database operations in tests
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
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
 * Create a test database instance with schema
 */
export function createTestDatabase(): TestDatabase {
  const sqlite = new Database(':memory:')

  // Enable foreign key constraints in SQLite
  sqlite.pragma('foreign_keys = ON')

  const db = drizzle(sqlite, { schema })

  // Create tables manually since no migrations exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      package_tier TEXT DEFAULT 'startup',
      interview_quota INTEGER DEFAULT 100,
      interviews_used INTEGER DEFAULT 0,
      subscription_expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      organization_id TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      last_login_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS job_templates (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      interview_duration INTEGER DEFAULT 15,
      impression_weight INTEGER DEFAULT 20,
      task_performance_weight INTEGER DEFAULT 25,
      logical_thinking_weight INTEGER DEFAULT 20,
      research_ability_weight INTEGER DEFAULT 15,
      communication_weight INTEGER DEFAULT 20,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER,
      created_by TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS interview_questions (
      id TEXT PRIMARY KEY,
      job_template_id TEXT,
      question_text TEXT NOT NULL,
      question_text_en TEXT,
      question_order INTEGER NOT NULL,
      time_limit INTEGER DEFAULT 120,
      category TEXT,
      is_required INTEGER DEFAULT 1,
      created_at INTEGER,
      FOREIGN KEY (job_template_id) REFERENCES job_templates(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      job_template_id TEXT,
      candidate_email TEXT NOT NULL,
      candidate_name TEXT NOT NULL,
      candidate_phone TEXT,
      status TEXT DEFAULT 'pending',
      candidate_status TEXT DEFAULT 'screened',
      interview_link_token TEXT NOT NULL UNIQUE,
      interview_link_expires_at INTEGER NOT NULL,
      overall_score INTEGER,
      recommendation TEXT,
      ai_scores TEXT,
      transcript TEXT,
      processing_started_at INTEGER,
      processing_completed_at INTEGER,
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER,
      created_by TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id),
      FOREIGN KEY (job_template_id) REFERENCES job_templates(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS interview_responses (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL,
      question_id TEXT,
      question_order INTEGER NOT NULL,
      response_video_url TEXT,
      response_transcript TEXT,
      response_duration INTEGER,
      response_scores TEXT,
      attempt_number INTEGER DEFAULT 1,
      recording_started_at INTEGER,
      recording_ended_at INTEGER,
      created_at INTEGER,
      FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES interview_questions(id)
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      organization_id TEXT,
      is_new_organization INTEGER DEFAULT 0,
      expires_at INTEGER NOT NULL,
      verified_at INTEGER,
      created_at INTEGER,
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS candidate_statuses (
      interview_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'all',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (interview_id) REFERENCES interviews(id)
    );
  `)

  return db
}

/**
 * Seed database with test organization and admin user
 */
export async function seedBasicTestData(db: TestDatabase) {
  // Generate unique suffix for this test run
  const uniqueId = Math.random().toString(36).substr(2, 8)

  // Create test organization
  const orgData = createOrganizationData({
    domain: `vietinbank-${uniqueId}.com.vn`,
    name: `VietinBank Test ${uniqueId}`
  })
  const [organization] = await db.insert(schema.organizations).values(orgData).returning()

  // Create admin user
  const adminData = createUserData({
    email: `admin-${uniqueId}@vietinbank-${uniqueId}.com.vn`,
    organizationId: organization.id,
    isAdmin: true
  })
  const [adminUser] = await db.insert(schema.users).values(adminData).returning()

  // Create regular user
  const userData = createUserData({
    email: `user-${uniqueId}@vietinbank-${uniqueId}.com.vn`,
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
  const table = schema[tableName] as any
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