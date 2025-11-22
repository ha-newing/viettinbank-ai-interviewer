/**
 * Unit tests for database schema and basic CRUD operations
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'
import * as schema from './schema'
import {
  createTestDatabase,
  seedBasicTestData,
  cleanDatabase,
  validateScoringWeights,
  createValidScoringWeights
} from '@/test/db-helpers'
import {
  createOrganizationData,
  createUserData,
  createJobTemplateData,
  createInterviewData,
  createInterviewQuestionData,
  createInterviewResponseData,
  createEmailVerificationData,
  createUserSessionData
} from '@/test/factories'

describe('Database Schema', () => {
  let db: ReturnType<typeof createTestDatabase>

  beforeEach(async () => {
    db = createTestDatabase()
    // Note: In a real test, you'd run migrations here
    // For now, we'll work with the schema directly
  })

  afterEach(async () => {
    await cleanDatabase(db)
  })

  describe('Organizations Table', () => {
    it('should create organization with valid data', async () => {
      const orgData = createOrganizationData({
        domain: 'vietinbank.com.vn',
        name: 'VietinBank Test'
      })

      const [created] = await db.insert(schema.organizations).values(orgData).returning()

      expect(created).toMatchObject({
        domain: 'vietinbank.com.vn',
        name: 'VietinBank Test',
        packageTier: 'startup',
        interviewQuota: 100,
        interviewsUsed: 0
      })
      expect(created.id).toBeDefined()
      expect(created.createdAt).toBeInstanceOf(Date)
    })

    it('should enforce unique domain constraint', async () => {
      const orgData1 = createOrganizationData({ domain: 'duplicate.com' })
      const orgData2 = createOrganizationData({ domain: 'duplicate.com' })

      await db.insert(schema.organizations).values(orgData1)

      await expect(
        db.insert(schema.organizations).values(orgData2)
      ).rejects.toThrow()
    })

    it('should default to startup package tier', async () => {
      const orgData = createOrganizationData()
      delete orgData.packageTier

      const [created] = await db.insert(schema.organizations).values(orgData).returning()

      expect(created.packageTier).toBe('startup')
    })

    it('should accept all valid package tiers', async () => {
      const tiers = ['startup', 'growth', 'enterprise'] as const

      for (const tier of tiers) {
        const orgData = createOrganizationData({
          domain: `${tier}-test.com`,
          packageTier: tier
        })

        const [created] = await db.insert(schema.organizations).values(orgData).returning()
        expect(created.packageTier).toBe(tier)
      }
    })
  })

  describe('Users Table', () => {
    it('should create user with valid organization reference', async () => {
      const { organization } = await seedBasicTestData(db)

      const userData = createUserData({
        email: 'newuser@vietinbank.com.vn',
        organizationId: organization.id,
        isAdmin: false
      })

      const [created] = await db.insert(schema.users).values(userData).returning()

      expect(created).toMatchObject({
        email: 'newuser@vietinbank.com.vn',
        organizationId: organization.id,
        isAdmin: false
      })
      expect(created.id).toBeDefined()
      expect(created.createdAt).toBeInstanceOf(Date)
    })

    it('should enforce unique email constraint', async () => {
      const { organization } = await seedBasicTestData(db)

      const userData1 = createUserData({
        email: 'duplicate@vietinbank.com.vn',
        organizationId: organization.id
      })
      const userData2 = createUserData({
        email: 'duplicate@vietinbank.com.vn',
        organizationId: organization.id
      })

      await db.insert(schema.users).values(userData1)

      await expect(
        db.insert(schema.users).values(userData2)
      ).rejects.toThrow()
    })

    it('should cascade delete when organization is deleted', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      // Verify user exists
      const usersBefore = await db.query.users.findMany()
      expect(usersBefore.length).toBeGreaterThan(0)

      // Delete organization
      await db.delete(schema.organizations).where(eq(schema.organizations.id, organization.id))

      // Verify users are deleted
      const usersAfter = await db.query.users.findMany()
      expect(usersAfter).toHaveLength(0)
    })
  })

  describe('Job Templates Table', () => {
    it('should create job template with valid scoring weights', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)
      const weights = createValidScoringWeights()

      const jobData = createJobTemplateData({
        organizationId: organization.id,
        createdBy: adminUser.id,
        title: 'Senior Java Developer',
        ...weights
      })

      const [created] = await db.insert(schema.jobTemplates).values(jobData).returning()

      expect(created).toMatchObject({
        title: 'Senior Java Developer',
        organizationId: organization.id,
        createdBy: adminUser.id,
        ...weights
      })

      // Verify scoring weights total 100%
      const totalWeight =
        created.impressionWeight +
        created.taskPerformanceWeight +
        created.logicalThinkingWeight +
        created.researchAbilityWeight +
        created.communicationWeight

      expect(totalWeight).toBe(100)
    })

    it('should validate scoring weights helper function', () => {
      const validWeights = createValidScoringWeights()
      expect(validateScoringWeights(validWeights)).toBe(true)

      const invalidWeights = {
        impressionWeight: 25,
        taskPerformanceWeight: 25,
        logicalThinkingWeight: 25,
        researchAbilityWeight: 25,
        communicationWeight: 25
      }
      expect(validateScoringWeights(invalidWeights)).toBe(false)
    })

    it('should default to active status', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const jobData = createJobTemplateData({
        organizationId: organization.id,
        createdBy: adminUser.id
      })
      delete jobData.isActive

      const [created] = await db.insert(schema.jobTemplates).values(jobData).returning()

      expect(created.isActive).toBe(true)
    })
  })

  describe('Interviews Table', () => {
    it('should create interview with valid references', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const jobData = createJobTemplateData({
        organizationId: organization.id,
        createdBy: adminUser.id
      })
      const [jobTemplate] = await db.insert(schema.jobTemplates).values(jobData).returning()

      const interviewData = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: jobTemplate.id,
        createdBy: adminUser.id,
        candidateEmail: 'candidate@example.com',
        candidateName: 'Nguyễn Văn Test'
      })

      const [created] = await db.insert(schema.interviews).values(interviewData).returning()

      expect(created).toMatchObject({
        organizationId: organization.id,
        jobTemplateId: jobTemplate.id,
        candidateEmail: 'candidate@example.com',
        candidateName: 'Nguyễn Văn Test',
        status: 'pending',
        candidateStatus: 'screened'
      })
      expect(created.interviewLinkToken).toBeDefined()
      expect(created.interviewLinkExpiresAt).toBeInstanceOf(Date)
    })

    it('should enforce unique interview link token', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const duplicateToken = 'duplicate-token-123'

      const interview1 = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: null, // No job template needed for this test
        createdBy: adminUser.id,
        interviewLinkToken: duplicateToken
      })

      const interview2 = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: null, // No job template needed for this test
        createdBy: adminUser.id,
        interviewLinkToken: duplicateToken
      })

      await db.insert(schema.interviews).values(interview1)

      await expect(
        db.insert(schema.interviews).values(interview2)
      ).rejects.toThrow()
    })

    it('should accept valid interview statuses', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)
      const statuses = ['pending', 'in_progress', 'completed', 'expired'] as const

      for (const status of statuses) {
        const interviewData = createInterviewData({
          organizationId: organization.id,
          jobTemplateId: null, // No job template needed for this test
          createdBy: adminUser.id,
          candidateEmail: `${status}@example.com`,
          status
        })

        const [created] = await db.insert(schema.interviews).values(interviewData).returning()
        expect(created.status).toBe(status)
      }
    })

    it('should accept valid candidate statuses', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)
      const candidateStatuses = ['all', 'screened', 'selected', 'rejected', 'waiting'] as const

      for (const candidateStatus of candidateStatuses) {
        const interviewData = createInterviewData({
          organizationId: organization.id,
          jobTemplateId: null, // No job template needed for this test
          createdBy: adminUser.id,
          candidateEmail: `${candidateStatus}@example.com`,
          candidateStatus
        })

        const [created] = await db.insert(schema.interviews).values(interviewData).returning()
        expect(created.candidateStatus).toBe(candidateStatus)
      }
    })

    it('should accept valid recommendation values', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)
      const recommendations = ['RECOMMEND', 'CONSIDER', 'NOT_RECOMMEND'] as const

      for (const recommendation of recommendations) {
        const interviewData = createInterviewData({
          organizationId: organization.id,
          jobTemplateId: null, // No job template needed for this test
          createdBy: adminUser.id,
          candidateEmail: `${recommendation.toLowerCase()}@example.com`,
          recommendation,
          overallScore: 75
        })

        const [created] = await db.insert(schema.interviews).values(interviewData).returning()
        expect(created.recommendation).toBe(recommendation)
      }
    })
  })

  describe('Interview Questions Table', () => {
    it('should create question with valid job template reference', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const jobData = createJobTemplateData({
        organizationId: organization.id,
        createdBy: adminUser.id
      })
      const [jobTemplate] = await db.insert(schema.jobTemplates).values(jobData).returning()

      const questionData = createInterviewQuestionData({
        jobTemplateId: jobTemplate.id,
        questionText: 'Câu hỏi test',
        questionOrder: 1
      })

      const [created] = await db.insert(schema.interviewQuestions).values(questionData).returning()

      expect(created).toMatchObject({
        jobTemplateId: jobTemplate.id,
        questionText: 'Câu hỏi test',
        questionOrder: 1,
        timeLimit: 120,
        isRequired: true
      })
    })

    it('should cascade delete when job template is deleted', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const jobData = createJobTemplateData({
        organizationId: organization.id,
        createdBy: adminUser.id
      })
      const [jobTemplate] = await db.insert(schema.jobTemplates).values(jobData).returning()

      const questionData = createInterviewQuestionData({
        jobTemplateId: jobTemplate.id
      })
      await db.insert(schema.interviewQuestions).values(questionData)

      // Verify question exists
      const questionsBefore = await db.query.interviewQuestions.findMany()
      expect(questionsBefore.length).toBe(1)

      // Delete job template
      await db.delete(schema.jobTemplates).where(eq(schema.jobTemplates.id, jobTemplate.id))

      // Verify questions are deleted
      const questionsAfter = await db.query.interviewQuestions.findMany()
      expect(questionsAfter).toHaveLength(0)
    })
  })

  describe('Interview Responses Table', () => {
    it('should create response with valid interview reference', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const interviewData = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: null, // No job template needed for this test
        createdBy: adminUser.id
      })
      const [interview] = await db.insert(schema.interviews).values(interviewData).returning()

      const responseData = createInterviewResponseData({
        interviewId: interview.id,
        questionId: null, // No question needed for this test
        questionOrder: 1,
        responseTranscript: 'Trả lời test'
      })

      const [created] = await db.insert(schema.interviewResponses).values(responseData).returning()

      expect(created).toMatchObject({
        interviewId: interview.id,
        questionOrder: 1,
        responseTranscript: 'Trả lời test',
        attemptNumber: 1
      })
    })

    it('should store response scores as JSON', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const interviewData = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: null, // No job template needed for this test
        createdBy: adminUser.id
      })
      const [interview] = await db.insert(schema.interviews).values(interviewData).returning()

      const scores = {
        impression: 8.5,
        taskPerformance: 7.2,
        logicalThinking: 8.0,
        researchAbility: 6.8,
        communication: 8.2
      }

      const responseData = createInterviewResponseData({
        interviewId: interview.id,
        questionId: null, // No question needed for this test
        responseScores: scores
      })

      const [created] = await db.insert(schema.interviewResponses).values(responseData).returning()

      expect(created.responseScores).toEqual(scores)
    })

    it('should cascade delete when interview is deleted', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const interviewData = createInterviewData({
        organizationId: organization.id,
        jobTemplateId: null, // No job template needed for this test
        createdBy: adminUser.id
      })
      const [interview] = await db.insert(schema.interviews).values(interviewData).returning()

      const responseData = createInterviewResponseData({
        interviewId: interview.id,
        questionId: null // No question needed for this test
      })
      await db.insert(schema.interviewResponses).values(responseData)

      // Verify response exists
      const responsesBefore = await db.query.interviewResponses.findMany()
      expect(responsesBefore.length).toBe(1)

      // Delete interview
      await db.delete(schema.interviews).where(eq(schema.interviews.id, interview.id))

      // Verify responses are deleted
      const responsesAfter = await db.query.interviewResponses.findMany()
      expect(responsesAfter).toHaveLength(0)
    })
  })

  describe('Email Verification Table', () => {
    it('should create email verification with expiry', async () => {
      const { organization } = await seedBasicTestData(db)

      const verificationData = createEmailVerificationData({
        email: 'test@vietinbank.com.vn',
        organizationId: organization.id,
        isNewOrganization: false
      })

      const [created] = await db.insert(schema.emailVerifications).values(verificationData).returning()

      expect(created).toMatchObject({
        email: 'test@vietinbank.com.vn',
        organizationId: organization.id,
        isNewOrganization: false
      })
      expect(created.token).toBeDefined()
      expect(created.expiresAt).toBeInstanceOf(Date)
      expect(created.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should enforce unique token constraint', async () => {
      const duplicateToken = 'duplicate-token-123'

      const verification1 = createEmailVerificationData({
        token: duplicateToken,
        organizationId: null, // No organization needed for this test
        email: 'user1@test.com'
      })

      const verification2 = createEmailVerificationData({
        token: duplicateToken,
        organizationId: null, // No organization needed for this test
        email: 'user2@test.com'
      })

      await db.insert(schema.emailVerifications).values(verification1)

      await expect(
        db.insert(schema.emailVerifications).values(verification2)
      ).rejects.toThrow()
    })
  })

  describe('User Sessions Table', () => {
    it('should create session with valid user reference', async () => {
      const { adminUser } = await seedBasicTestData(db)

      const sessionData = createUserSessionData({
        userId: adminUser.id
      })

      const [created] = await db.insert(schema.userSessions).values(sessionData).returning()

      expect(created).toMatchObject({
        userId: adminUser.id
      })
      expect(created.sessionToken).toBeDefined()
      expect(created.expiresAt).toBeInstanceOf(Date)
      expect(created.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should enforce unique session token constraint', async () => {
      const { adminUser } = await seedBasicTestData(db)
      const duplicateToken = 'duplicate-session-token-123'

      const session1 = createUserSessionData({
        userId: adminUser.id,
        sessionToken: duplicateToken
      })

      const session2 = createUserSessionData({
        userId: adminUser.id,
        sessionToken: duplicateToken
      })

      await db.insert(schema.userSessions).values(session1)

      await expect(
        db.insert(schema.userSessions).values(session2)
      ).rejects.toThrow()
    })

    it('should cascade delete when user is deleted', async () => {
      const { organization, adminUser } = await seedBasicTestData(db)

      const sessionData = createUserSessionData({
        userId: adminUser.id
      })
      await db.insert(schema.userSessions).values(sessionData)

      // Verify session exists
      const sessionsBefore = await db.query.userSessions.findMany()
      expect(sessionsBefore.length).toBe(1)

      // Delete user
      await db.delete(schema.users).where(eq(schema.users.id, adminUser.id))

      // Verify sessions are deleted
      const sessionsAfter = await db.query.userSessions.findMany()
      expect(sessionsAfter).toHaveLength(0)
    })
  })
})