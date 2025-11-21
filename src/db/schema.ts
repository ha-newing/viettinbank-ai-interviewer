import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

// Enums for type safety as specified in CLAUDE.md
export const interviewStatusEnum = ['pending', 'in_progress', 'completed', 'expired'] as const
export const recommendationEnum = ['PROCEED', 'REJECT', 'REVIEW'] as const
export const packageTierEnum = ['startup', 'growth', 'enterprise'] as const
export const candidateStatusEnum = ['all', 'screened', 'selected', 'rejected', 'waiting'] as const

export type InterviewStatus = typeof interviewStatusEnum[number]
export type Recommendation = typeof recommendationEnum[number]
export type PackageTier = typeof packageTierEnum[number]
export type CandidateStatus = typeof candidateStatusEnum[number]

// Organizations Table - Based on PRD specifications
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  domain: text('domain').notNull().unique(), // Company domain for email validation
  name: text('name').notNull(),
  packageTier: text('package_tier').$type<PackageTier>().notNull().default('startup'),
  interviewQuota: integer('interview_quota').notNull().default(100),
  interviewsUsed: integer('interviews_used').notNull().default(0),
  subscriptionExpiresAt: integer('subscription_expires_at'), // Unix timestamp
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// Users Table - Authentication and role management
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  email: text('email').notNull().unique(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// Job Templates - Interview job configurations
export const jobTemplates = sqliteTable('job_templates', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), // Job title (Vietnamese/English)
  description: text('description'),
  interviewDuration: integer('interview_duration').notNull().default(15), // minutes
  // Evaluation criteria weights (must total 100%)
  impressionWeight: integer('impression_weight').notNull().default(20), // Tạo Ấn Tượng
  taskPerformanceWeight: integer('task_performance_weight').notNull().default(25), // Hiệu Suất Nhiệm Vụ
  logicalThinkingWeight: integer('logical_thinking_weight').notNull().default(20), // Tư Duy Logic
  researchAbilityWeight: integer('research_ability_weight').notNull().default(15), // Khả Năng Nghiên Cứu
  communicationWeight: integer('communication_weight').notNull().default(20), // Giao Tiếp
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
})

// Interview Questions - Predefined questions for job templates
export const interviewQuestions = sqliteTable('interview_questions', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  jobTemplateId: text('job_template_id')
    .references(() => jobTemplates.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(), // Vietnamese question
  questionTextEn: text('question_text_en'), // English translation
  questionOrder: integer('question_order').notNull(),
  timeLimit: integer('time_limit').notNull().default(120), // seconds
  category: text('category'), // Which scoring dimension this targets
  isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// Interviews Table - Main interview sessions
export const interviews = sqliteTable('interviews', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  jobTemplateId: text('job_template_id')
    .references(() => jobTemplates.id, { onDelete: 'set null' }),

  // Candidate information
  candidateEmail: text('candidate_email').notNull(),
  candidateName: text('candidate_name').notNull(),
  candidatePhone: text('candidate_phone'),

  // Interview status and metadata
  status: text('status').$type<InterviewStatus>().notNull().default('pending'),
  interviewLinkToken: text('interview_link_token').notNull().unique(), // UUID for candidate access
  interviewLinkExpiresAt: integer('interview_link_expires_at', { mode: 'timestamp' }).notNull(),

  // Scoring and results
  overallScore: integer('overall_score'), // 0-100 percentage
  recommendation: text('recommendation').$type<Recommendation>(),

  // AI Analysis Results - stored as JSON
  aiScores: text('ai_scores', { mode: 'json' }).$type<{
    impression: { score: number; percentage: number; notes: string }
    taskPerformance: { score: number; percentage: number; notes: string }
    logicalThinking: { score: number; percentage: number; notes: string }
    researchAbility: { score: number; percentage: number; notes: string }
    communication: { score: number; percentage: number; notes: string }
  }>(),

  // Processing metadata
  transcript: text('transcript'), // Full interview transcript
  processingStartedAt: integer('processing_started_at', { mode: 'timestamp' }),
  processingCompletedAt: integer('processing_completed_at', { mode: 'timestamp' }),

  // Timestamps
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
})

// Interview Responses - Individual question responses with video/audio
export const interviewResponses = sqliteTable('interview_responses', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  interviewId: text('interview_id')
    .notNull()
    .references(() => interviews.id, { onDelete: 'cascade' }),
  questionId: text('question_id')
    .references(() => interviewQuestions.id, { onDelete: 'set null' }),

  // Response content
  questionOrder: integer('question_order').notNull(),
  responseVideoUrl: text('response_video_url'), // S3/storage URL
  responseTranscript: text('response_transcript'),
  responseDuration: integer('response_duration'), // seconds

  // Individual response scoring
  responseScores: text('response_scores', { mode: 'json' }).$type<{
    impression?: number
    taskPerformance?: number
    logicalThinking?: number
    researchAbility?: number
    communication?: number
  }>(),

  // Metadata
  attemptNumber: integer('attempt_number').notNull().default(1), // max 2 retries
  recordingStartedAt: integer('recording_started_at', { mode: 'timestamp' }),
  recordingEndedAt: integer('recording_ended_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// Email Verification - For authentication flow
export const emailVerifications = sqliteTable('email_verifications', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' }),
  isNewOrganization: integer('is_new_organization', { mode: 'boolean' }).notNull().default(false),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  verifiedAt: integer('verified_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// User Sessions - Session management
export const userSessions = sqliteTable('user_sessions', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// Candidate Status Tracking - For dashboard organization
export const candidateStatuses = sqliteTable('candidate_statuses', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  interviewId: text('interview_id')
    .notNull()
    .references(() => interviews.id, { onDelete: 'cascade' }),
  status: text('status').$type<CandidateStatus>().notNull().default('all'),
  updatedBy: text('updated_by')
    .notNull()
    .references(() => users.id),
  notes: text('notes'),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})