/**
 * Integration tests for authentication server actions
 */

import { requestLogin, verifyEmail, createNewOrganization } from './actions'
import * as schema from '@/db/schema'
import {
  createTestDatabase,
  cleanDatabase,
  seedBasicTestData
} from '@/test/db-helpers'
import {
  createOrganizationData,
  createEmailVerificationData
} from '@/test/factories'
import { setupCommonMocks } from '@/test/mocks'

// Mock the database and email services
let mockDb: any
jest.mock('@/lib/db', () => ({
  get db() {
    return mockDb
  }
}))

jest.mock('@/lib/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true)
}))

describe('Authentication Server Actions - Integration Tests', () => {
  let db: ReturnType<typeof createTestDatabase>
  let mocks: ReturnType<typeof setupCommonMocks>

  beforeEach(async () => {
    db = createTestDatabase()
    mockDb = db
    mocks = setupCommonMocks()
  })

  afterEach(async () => {
    await cleanDatabase(db)
    jest.clearAllMocks()
  })

  describe('requestLogin', () => {
    it('should handle login for existing organization', async () => {
      // Setup: Create existing organization
      const { organization } = await seedBasicTestData(db)

      const formData = new FormData()
      formData.append('email', 'user@vietinbank.com.vn')

      const result = await requestLogin(formData)

      expect(result.success).toBe(true)
      expect(result.message).toContain('Email xác thực đã được gửi')

      // Verify email verification was created
      const verifications = await db.query.emailVerifications.findMany()
      expect(verifications).toHaveLength(1)
      expect(verifications[0]).toMatchObject({
        email: 'user@vietinbank.com.vn',
        organizationId: organization.id,
        isNewOrganization: false
      })

      // Verify email service was called
      const emailService = await import('@/lib/email')
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@vietinbank.com.vn',
          organizationName: organization.name,
          isNewOrganization: false
        })
      )
    })

    it('should handle login for new organization', async () => {
      const formData = new FormData()
      formData.append('email', 'firstuser@newcompany.com')

      const result = await requestLogin(formData)

      expect(result.success).toBe(true)
      expect(result.message).toContain('Chưa có tổ chức nào sử dụng domain')
      expect(result.message).toContain('newcompany.com')

      // Verify email verification was created for new organization
      const verifications = await db.query.emailVerifications.findMany()
      expect(verifications).toHaveLength(1)
      expect(verifications[0]).toMatchObject({
        email: 'firstuser@newcompany.com',
        organizationId: null,
        isNewOrganization: true
      })

      // Verify email service was called
      const emailService = await import('@/lib/email')
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'firstuser@newcompany.com',
          isNewOrganization: true
        })
      )
    })

    it('should reject invalid email format', async () => {
      const formData = new FormData()
      formData.append('email', 'invalid-email')

      const result = await requestLogin(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('email hợp lệ')
    })

    it('should reject personal email domains', async () => {
      const formData = new FormData()
      formData.append('email', 'user@gmail.com')

      const result = await requestLogin(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Personal email domains')
    })

    it('should handle email service failure', async () => {
      const { organization } = await seedBasicTestData(db)

      // Mock email service failure
      const emailService = await import('@/lib/email')
      ;(emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(false)

      const formData = new FormData()
      formData.append('email', 'user@vietinbank.com.vn')

      const result = await requestLogin(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Không thể gửi email')
    })
  })

  describe('verifyEmail', () => {
    it('should handle email verification for existing organization', async () => {
      // Setup: Create organization and email verification
      const { organization } = await seedBasicTestData(db)

      const verificationData = createEmailVerificationData({
        email: 'user@vietinbank.com.vn',
        organizationId: organization.id,
        isNewOrganization: false
      })

      const [verification] = await db.insert(schema.emailVerifications)
        .values(verificationData)
        .returning()

      const formData = new FormData()
      formData.append('token', verification.token)

      const result = await verifyEmail(formData)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Đăng nhập thành công!')

      // Verify user was created
      const users = await db.query.users.findMany({
        where: (u, { eq }) => eq(u.email, 'user@vietinbank.com.vn')
      })
      expect(users).toHaveLength(1)
      expect(users[0]).toMatchObject({
        email: 'user@vietinbank.com.vn',
        organizationId: organization.id,
        isAdmin: false
      })

      // Verify session was created
      const sessions = await db.query.userSessions.findMany({
        where: (s, { eq }) => eq(s.userId, users[0].id)
      })
      expect(sessions).toHaveLength(1)

      // Verify verification was marked as verified
      const updatedVerification = await db.query.emailVerifications.findFirst({
        where: (ev, { eq }) => eq(ev.id, verification.id)
      })
      expect(updatedVerification?.verifiedAt).toBeInstanceOf(Date)
    })

    it('should redirect to organization creation for new organization', async () => {
      const verificationData = createEmailVerificationData({
        email: 'firstuser@newcompany.com',
        organizationId: null,
        isNewOrganization: true
      })

      const [verification] = await db.insert(schema.emailVerifications)
        .values(verificationData)
        .returning()

      const formData = new FormData()
      formData.append('token', verification.token)

      // This would normally redirect, but in our test we just verify it gets called
      // The actual redirect behavior is hard to test directly
      await expect(verifyEmail(formData)).rejects.toThrow('NEXT_REDIRECT')
    })

    it('should reject invalid token', async () => {
      const formData = new FormData()
      formData.append('token', 'invalid-token')

      const result = await verifyEmail(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('không hợp lệ hoặc đã hết hạn')
    })

    it('should reject expired token', async () => {
      const expiredDate = new Date()
      expiredDate.setHours(expiredDate.getHours() - 1) // 1 hour ago

      const verificationData = createEmailVerificationData({
        email: 'user@company.com',
        expiresAt: expiredDate
      })

      const [verification] = await db.insert(schema.emailVerifications)
        .values(verificationData)
        .returning()

      const formData = new FormData()
      formData.append('token', verification.token)

      const result = await verifyEmail(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('không hợp lệ hoặc đã hết hạn')
    })

    it('should reject already verified token', async () => {
      const verificationData = createEmailVerificationData({
        email: 'user@company.com',
        verifiedAt: new Date()
      })

      const [verification] = await db.insert(schema.emailVerifications)
        .values(verificationData)
        .returning()

      const formData = new FormData()
      formData.append('token', verification.token)

      const result = await verifyEmail(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('không hợp lệ hoặc đã hết hạn')
    })
  })

  describe('createNewOrganization', () => {
    it('should create new organization and admin user', async () => {
      // Setup: Create email verification for new organization
      const verificationData = createEmailVerificationData({
        email: 'admin@newcompany.com',
        organizationId: null,
        isNewOrganization: true
      })

      const [verification] = await db.insert(schema.emailVerifications)
        .values(verificationData)
        .returning()

      const formData = new FormData()
      formData.append('email', verification.email)
      formData.append('organizationName', 'New Company Ltd')
      formData.append('token', verification.token)

      const result = await createNewOrganization(formData)

      expect(result.success).toBe(true)
      expect(result.message).toContain('Tổ chức đã được tạo thành công')

      // Verify organization was created
      const organizations = await db.query.organizations.findMany({
        where: (o, { eq }) => eq(o.domain, 'newcompany.com')
      })
      expect(organizations).toHaveLength(1)
      expect(organizations[0]).toMatchObject({
        domain: 'newcompany.com',
        name: 'New Company Ltd',
        packageTier: 'startup'
      })

      // Verify admin user was created
      const users = await db.query.users.findMany({
        where: (u, { eq }) => eq(u.email, verification.email)
      })
      expect(users).toHaveLength(1)
      expect(users[0]).toMatchObject({
        email: verification.email,
        organizationId: organizations[0].id,
        isAdmin: true
      })

      // Verify session was created
      const sessions = await db.query.userSessions.findMany({
        where: (s, { eq }) => eq(s.userId, users[0].id)
      })
      expect(sessions).toHaveLength(1)
    })

    it('should reject creation if organization already exists', async () => {
      // Setup: Create existing organization
      const existingOrg = createOrganizationData({
        domain: 'existingcompany.com'
      })
      await db.insert(schema.organizations).values(existingOrg)

      const verificationData = createEmailVerificationData({
        email: 'user@existingcompany.com',
        organizationId: null,
        isNewOrganization: true
      })

      const [verification] = await db.insert(schema.emailVerifications)
        .values(verificationData)
        .returning()

      const formData = new FormData()
      formData.append('email', verification.email)
      formData.append('organizationName', 'Existing Company')
      formData.append('token', verification.token)

      const result = await createNewOrganization(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Tổ chức cho domain này đã tồn tại')
    })

    it('should reject invalid token', async () => {
      const formData = new FormData()
      formData.append('email', 'user@newcompany.com')
      formData.append('organizationName', 'New Company')
      formData.append('token', 'invalid-token')

      const result = await createNewOrganization(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Token xác thực không hợp lệ')
    })

    it('should reject token for existing organization', async () => {
      const { organization } = await seedBasicTestData(db)

      const verificationData = createEmailVerificationData({
        email: 'user@vietinbank.com.vn',
        organizationId: organization.id,
        isNewOrganization: false // Not new organization
      })

      const [verification] = await db.insert(schema.emailVerifications)
        .values(verificationData)
        .returning()

      const formData = new FormData()
      formData.append('email', verification.email)
      formData.append('organizationName', 'Attempted New Organization')
      formData.append('token', verification.token)

      const result = await createNewOrganization(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Token xác thực không hợp lệ')
    })

    it('should validate organization name length', async () => {
      const verificationData = createEmailVerificationData({
        email: 'admin@newcompany.com',
        organizationId: null,
        isNewOrganization: true
      })

      const [verification] = await db.insert(schema.emailVerifications)
        .values(verificationData)
        .returning()

      const formData = new FormData()
      formData.append('email', verification.email)
      formData.append('organizationName', 'A') // Too short
      formData.append('token', verification.token)

      const result = await createNewOrganization(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('ít nhất 2 ký tự')
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const dbModule = await import('@/lib/db')
      Object.defineProperty(dbModule, 'db', {
        get: () => {
          throw new Error('Database connection failed')
        },
        configurable: true
      })

      const formData = new FormData()
      formData.append('email', 'user@vietinbank.com.vn')

      const result = await requestLogin(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Đã xảy ra lỗi')
    })

    it('should handle unexpected errors', async () => {
      // Force an error by providing malformed data
      const formData = new FormData()
      // No email provided

      const result = await requestLogin(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('không hợp lệ')
    })
  })

  describe('Complete Authentication Flow Integration', () => {
    it('should handle complete new organization registration flow', async () => {
      const userEmail = 'admin@newtechcorp.com'

      // Step 1: Request login for new domain
      let formData = new FormData()
      formData.append('email', userEmail)

      const loginResult = await requestLogin(formData)
      expect(loginResult.success).toBe(true)

      // Step 2: Get the verification token
      const verifications = await db.query.emailVerifications.findMany({
        where: (ev, { eq }) => eq(ev.email, userEmail)
      })
      expect(verifications).toHaveLength(1)
      const verification = verifications[0]
      expect(verification.isNewOrganization).toBe(true)

      // Step 3: Verify email token (would normally redirect)
      formData = new FormData()
      formData.append('token', verification.token)

      await expect(verifyEmail(formData)).rejects.toThrow('NEXT_REDIRECT')

      // Step 4: Create organization
      formData = new FormData()
      formData.append('email', userEmail)
      formData.append('organizationName', 'NewTech Corporation')
      formData.append('token', verification.token)

      const orgResult = await createNewOrganization(formData)
      expect(orgResult.success).toBe(true)

      // Verify final state
      const organizations = await db.query.organizations.findMany()
      expect(organizations).toHaveLength(1)
      expect(organizations[0]).toMatchObject({
        domain: 'newtechcorp.com',
        name: 'NewTech Corporation'
      })

      const users = await db.query.users.findMany()
      expect(users).toHaveLength(1)
      expect(users[0]).toMatchObject({
        email: userEmail,
        isAdmin: true
      })

      const sessions = await db.query.userSessions.findMany()
      expect(sessions).toHaveLength(1)
    })

    it('should handle complete existing organization login flow', async () => {
      // Setup: Create organization
      const { organization } = await seedBasicTestData(db)
      const userEmail = 'newuser@vietinbank.com.vn'

      // Step 1: Request login for existing domain
      let formData = new FormData()
      formData.append('email', userEmail)

      const loginResult = await requestLogin(formData)
      expect(loginResult.success).toBe(true)

      // Step 2: Get verification token
      const verifications = await db.query.emailVerifications.findMany({
        where: (ev, { eq }) => eq(ev.email, userEmail)
      })
      expect(verifications).toHaveLength(1)
      const verification = verifications[0]
      expect(verification.isNewOrganization).toBe(false)

      // Step 3: Verify email and complete login
      formData = new FormData()
      formData.append('token', verification.token)

      const verifyResult = await verifyEmail(formData)
      expect(verifyResult.success).toBe(true)

      // Verify final state
      const users = await db.query.users.findMany({
        where: (u, { eq }) => eq(u.email, userEmail)
      })
      expect(users).toHaveLength(1)
      expect(users[0]).toMatchObject({
        email: userEmail,
        organizationId: organization.id,
        isAdmin: false
      })

      const sessions = await db.query.userSessions.findMany({
        where: (s, { eq }) => eq(s.userId, users[0].id)
      })
      expect(sessions).toHaveLength(1)
    })
  })
})