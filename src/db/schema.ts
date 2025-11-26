import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

// Enums for type safety as specified in CLAUDE.md
export const interviewStatusEnum = ['pending', 'in_progress', 'completed', 'expired'] as const
export const recommendationEnum = ['RECOMMEND', 'CONSIDER', 'NOT_RECOMMEND'] as const
export const packageTierEnum = ['startup', 'growth', 'enterprise'] as const
export const candidateStatusEnum = ['all', 'screened', 'selected', 'rejected', 'waiting'] as const

// Assessment Center enums (from specs_competency.md)
export const assessmentSessionStatusEnum = ['created', 'case_study_in_progress', 'case_study_completed', 'tbei_in_progress', 'completed'] as const
export const assessmentRoleCodeEnum = ['A', 'B', 'C', 'D', 'E'] as const
export const assessmentStatusEnum = ['pending', 'in_progress', 'completed'] as const
export const competencyLevelEnum = ['needs_improvement', 'meets_requirements', 'exceeds_requirements'] as const
export const evidenceStrengthEnum = ['strong', 'moderate', 'weak', 'insufficient'] as const
export const hipoClassificationEnum = ['excellent', 'good', 'average', 'needs_attention'] as const

export type InterviewStatus = typeof interviewStatusEnum[number]
export type Recommendation = typeof recommendationEnum[number]
export type PackageTier = typeof packageTierEnum[number]
export type CandidateStatus = typeof candidateStatusEnum[number]

// Assessment Center types
export type AssessmentSessionStatus = typeof assessmentSessionStatusEnum[number]
export type AssessmentRoleCode = typeof assessmentRoleCodeEnum[number]
export type AssessmentStatus = typeof assessmentStatusEnum[number]
export type CompetencyLevel = typeof competencyLevelEnum[number]
export type EvidenceStrength = typeof evidenceStrengthEnum[number]
export type HipoClassification = typeof hipoClassificationEnum[number]

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
  candidateStatus: text('candidate_status').$type<CandidateStatus>().notNull().default('screened'),
  interviewLinkToken: text('interview_link_token').notNull().unique(), // UUID for candidate access
  interviewLinkExpiresAt: integer('interview_link_expires_at', { mode: 'timestamp' }).notNull(),

  // Scoring and results
  overallScore: integer('overall_score'), // 0-100 percentage
  recommendation: text('recommendation').$type<Recommendation>(),

  // AI Analysis Results - stored as JSON (flexible structure to accommodate different evaluation frameworks)
  aiScores: text('ai_scores', { mode: 'json' }).$type<any>(),

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

// ===== ASSESSMENT CENTER TABLES (from specs_competency.md) =====

// Assessment Sessions - Group sessions for Assessment Center
export const assessmentSessions = sqliteTable('assessment_sessions', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  jobTemplateId: text('job_template_id')
    .references(() => jobTemplates.id, { onDelete: 'set null' }),
  status: text('status').$type<AssessmentSessionStatus>().notNull().default('created'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
})

// Assessment Participants - Participants in each Assessment Center session
export const assessmentParticipants = sqliteTable('assessment_participants', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  sessionId: text('session_id')
    .notNull()
    .references(() => assessmentSessions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  roleCode: text('role_code').$type<AssessmentRoleCode>().notNull(), // A, B, C, D, E
  roleName: text('role_name').notNull(),
  speakerLabel: text('speaker_label'), // For Phase 1 transcript mapping (Speaker 1, Speaker 2, etc.)
  interviewToken: text('interview_token').unique(), // For Phase 2 individual access
  tbeiStatus: text('tbei_status').$type<AssessmentStatus>().notNull().default('pending'),
  hipoStatus: text('hipo_status').$type<AssessmentStatus>().notNull().default('pending'),
  quizStatus: text('quiz_status').$type<AssessmentStatus>().notNull().default('pending'),
  emailSentAt: integer('email_sent_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// Case Study Transcript Versions - Simplified versioned full transcript storage
export const caseStudyTranscriptVersions = sqliteTable('case_study_transcript_versions', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  sessionId: text('session_id')
    .notNull()
    .references(() => assessmentSessions.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(), // 1, 2, 3... incrementing versions
  fullTranscript: text('full_transcript').notNull(), // Complete consolidated transcript
  speakerMapping: text('speaker_mapping'), // JSON: {"Speaker 1": "participant_id", "Speaker 2": "participant_id"}
  totalDurationSeconds: integer('total_duration_seconds'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// Legacy Case Study Transcripts - Keep for backward compatibility during migration
export const caseStudyTranscripts = sqliteTable('case_study_transcripts', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  sessionId: text('session_id')
    .notNull()
    .references(() => assessmentSessions.id, { onDelete: 'cascade' }),
  sequenceNumber: integer('sequence_number').notNull(), // 1, 2, 3... for each 60-second chunk
  rawTranscript: text('raw_transcript').notNull(),
  consolidatedTranscript: text('consolidated_transcript').notNull(), // With participant names mapped
  speakerMapping: text('speaker_mapping'), // JSON: {"Speaker 1": "participant_id", "Speaker 2": "participant_id"}
  durationSeconds: integer('duration_seconds'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// Case Study Evaluations - Competency scores from group discussion analysis
export const caseStudyEvaluations = sqliteTable('case_study_evaluations', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  sessionId: text('session_id')
    .notNull()
    .references(() => assessmentSessions.id, { onDelete: 'cascade' }),
  participantId: text('participant_id')
    .notNull()
    .references(() => assessmentParticipants.id, { onDelete: 'cascade' }),
  transcriptId: text('transcript_id')
    .notNull()
    .references(() => caseStudyTranscripts.id, { onDelete: 'cascade' }),
  competencyId: text('competency_id').notNull(), // strategic_thinking, innovation, risk_balance, digital_transformation
  score: integer('score'), // 1-5 or null if insufficient evidence
  level: text('level').$type<CompetencyLevel>(), // needs_improvement, meets_requirements, exceeds_requirements
  rationale: text('rationale'),
  evidence: text('evidence'), // JSON array of evidence quotes
  evidenceStrength: text('evidence_strength').$type<EvidenceStrength>().notNull().default('insufficient'),
  countTowardOverall: integer('count_toward_overall', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// TBEI Responses - Targeted Behavioral Event Interview responses
export const tbeiResponses = sqliteTable('tbei_responses', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  participantId: text('participant_id')
    .notNull()
    .references(() => assessmentParticipants.id, { onDelete: 'cascade' }),
  competencyId: text('competency_id').notNull(), // digital_transformation, talent_development
  questionId: text('question_id').notNull(), // DT_Q1, DT_Q2, TD_Q1, etc.
  selectedQuestionIndex: integer('selected_question_index'), // Which of 3 questions they chose (0, 1, 2)
  transcript: text('transcript').notNull(),
  audioUrl: text('audio_url'),
  durationSeconds: integer('duration_seconds'),
  evaluation: text('evaluation'), // JSON: {score, rationale, evidence, star_analysis, behavioral_indicators}
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// HiPo Assessments - Self-assessment questionnaire responses
export const hipoAssessments = sqliteTable('hipo_assessments', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  participantId: text('participant_id')
    .notNull()
    .references(() => assessmentParticipants.id, { onDelete: 'cascade' }),
  abilityScore: integer('ability_score'), // 5-25 (sum of Q1-Q5)
  aspirationScore: integer('aspiration_score'), // 5-25 (sum of Q6-Q10)
  engagementScore: integer('engagement_score'), // 5-25 (sum of Q11-Q15)
  integratedScore: integer('integrated_score'), // 5-25 (sum of Q16-Q20)
  totalScore: integer('total_score'), // 20-100 (sum of all sections)
  responses: text('responses'), // JSON: {"Q1": 4, "Q2": 5, ..., "Q20": 3}
  openResponse1: text('open_response1'), // Q21 answer
  openResponse2: text('open_response2'), // Q22 answer
  abilityClassification: text('ability_classification').$type<HipoClassification>(),
  aspirationClassification: text('aspiration_classification').$type<HipoClassification>(),
  engagementClassification: text('engagement_classification').$type<HipoClassification>(),
  integratedClassification: text('integrated_classification').$type<HipoClassification>(),
  completedAt: integer('completed_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// Quiz Responses - Multiple choice quiz answers and scoring
export const quizResponses = sqliteTable('quiz_responses', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  participantId: text('participant_id')
    .notNull()
    .references(() => assessmentParticipants.id, { onDelete: 'cascade' }),
  answers: text('answers'), // JSON: {questionId: selectedOption}
  score: integer('score'),
  totalQuestions: integer('total_questions'),
  timeSpentSeconds: integer('time_spent_seconds'),
  completedAt: integer('completed_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})