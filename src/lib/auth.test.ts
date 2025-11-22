/**
 * Unit tests for authentication functions
 */

import {
  extractDomainFromEmail,
  findOrganizationByDomain,
  createEmailVerification,
  verifyEmailToken,
  markEmailVerified,
  createOrganization,
  createUser,
  findUserByEmail,
  createUserSession,
  logout
} from '@/lib/auth'
import * as schema from '@/db/schema'
import {
  createTestDatabase,
  seedBasicTestData,
  cleanDatabase
} from '@/test/db-helpers'
import {
  createOrganizationData,
  createUserData,
  createEmailVerificationData,
  createUserSessionData
} from '@/test/factories'

// Mock the database connection
jest.mock('@/lib/db', () => ({
  db: undefined // Will be set in tests
}))

describe('Authentication Functions', () => {
  let db: ReturnType<typeof createTestDatabase>

  beforeEach(async () => {
    db = createTestDatabase()

    // Mock the db export
    const dbModule = await import('@/lib/db')
    Object.defineProperty(dbModule, 'db', {
      get: () => db,
      configurable: true
    })
  })

  afterEach(async () => {
    await cleanDatabase(db)
  })

  describe('extractDomainFromEmail', () => {
    it('should extract domain from valid corporate email', () => {
      expect(extractDomainFromEmail('user@vietinbank.com.vn')).toBe('vietinbank.com.vn')
      expect(extractDomainFromEmail('admin@company.org')).toBe('company.org')
      expect(extractDomainFromEmail('test.user@sub.domain.com')).toBe('sub.domain.com')
    })

    it('should handle single level domains', () => {
      expect(extractDomainFromEmail('user@localhost')).toBe('localhost')
    })

    it('should throw error for invalid email formats', () => {
      expect(() => extractDomainFromEmail('invalid-email')).toThrow('Invalid email format')
      expect(() => extractDomainFromEmail('no-at-sign.com')).toThrow('Invalid email format')
      expect(() => extractDomainFromEmail('@no-user.com')).toThrow('Invalid email format')
      expect(() => extractDomainFromEmail('user@')).toThrow('Invalid email format')
    })

    it('should reject personal email domains', () => {
      const personalDomains = [
        'user@gmail.com',
        'user@yahoo.com',
        'user@outlook.com',
        'user@hotmail.com',
        'user@icloud.com'
      ]

      personalDomains.forEach(email => {
        expect(() => extractDomainFromEmail(email)).toThrow('Personal email domains are not allowed')
      })
    })
  })

  describe('findOrganizationByDomain', () => {
    it('should find existing organization by domain', async () => {
      const { organization } = await seedBasicTestData(db)

      const found = await findOrganizationByDomain(organization.domain)

      expect(found).toMatchObject({
        id: organization.id,
        domain: organization.domain,
        name: organization.name
      })
    })

    it('should return null for non-existent domain', async () => {
      const found = await findOrganizationByDomain('nonexistent.com')
      expect(found).toBeNull()
    })

    it('should be case insensitive', async () => {
      const orgData = createOrganizationData({ domain: 'UPPERCASE.COM' })
      await db.insert(schema.organizations).values(orgData)

      const found = await findOrganizationByDomain('uppercase.com')
      expect(found).not.toBeNull()
    })
  })

  describe('createEmailVerification', () => {
    it('should create email verification for existing organization', async () => {
      const { organization } = await seedBasicTestData(db)

      const verification = await createEmailVerification({
        email: 'test@vietinbank.com.vn',
        organizationId: organization.id,
        isNewOrganization: false
      })

      expect(verification).toMatchObject({
        email: 'test@vietinbank.com.vn',
        organizationId: organization.id,
        isNewOrganization: false
      })
      expect(verification.token).toBeDefined()
      expect(verification.token.length).toBeGreaterThan(10)
      expect(verification.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should create email verification for new organization', async () => {
      const verification = await createEmailVerification({
        email: 'neworg@newcompany.com',
        organizationId: undefined,
        isNewOrganization: true
      })

      expect(verification).toMatchObject({
        email: 'neworg@newcompany.com',
        organizationId: null,
        isNewOrganization: true
      })
      expect(verification.token).toBeDefined()
    })

    it('should set expiry time 24 hours in the future', async () => {
      const verification = await createEmailVerification({
        email: 'test@company.com',
        organizationId: undefined,
        isNewOrganization: true
      })

      const expectedExpiry = new Date()
      expectedExpiry.setHours(expectedExpiry.getHours() + 24)

      // Allow for a few seconds of difference
      const timeDiff = Math.abs(verification.expiresAt.getTime() - expectedExpiry.getTime())
      expect(timeDiff).toBeLessThan(5000) // Less than 5 seconds difference
    })
  })

  describe('verifyEmailToken', () => {
    it('should verify valid non-expired token', async () => {
      const { organization } = await seedBasicTestData(db)

      const created = await createEmailVerification({
        email: 'test@vietinbank.com.vn',
        organizationId: organization.id,
        isNewOrganization: false
      })

      const verified = await verifyEmailToken(created.token)

      expect(verified).toMatchObject({
        id: created.id,
        email: created.email,
        organizationId: created.organizationId,
        isNewOrganization: false
      })
    })

    it('should return null for non-existent token', async () => {
      const verified = await verifyEmailToken('non-existent-token')
      expect(verified).toBeNull()
    })

    it('should return null for expired token', async () => {
      const expiredDate = new Date()
      expiredDate.setHours(expiredDate.getHours() - 1) // 1 hour ago

      const verificationData = createEmailVerificationData({
        email: 'test@company.com',
        expiresAt: expiredDate
      })

      await db.insert(schema.emailVerifications).values(verificationData)

      const verified = await verifyEmailToken(verificationData.token)
      expect(verified).toBeNull()
    })

    it('should return null for already verified token', async () => {
      const verificationData = createEmailVerificationData({
        email: 'test@company.com',
        verifiedAt: new Date()
      })

      await db.insert(schema.emailVerifications).values(verificationData)

      const verified = await verifyEmailToken(verificationData.token)
      expect(verified).toBeNull()
    })
  })

  describe('markEmailVerified', () => {
    it('should mark email verification as verified', async () => {
      const verificationData = createEmailVerificationData({
        email: 'test@company.com'
      })

      const [created] = await db.insert(schema.emailVerifications).values(verificationData).returning()

      await markEmailVerified(created.id)

      const updated = await db.query.emailVerifications.findFirst({
        where: (ev, { eq }) => eq(ev.id, created.id)
      })

      expect(updated?.verifiedAt).toBeInstanceOf(Date)
      expect(updated?.verifiedAt?.getTime()).toBeGreaterThan(created.createdAt.getTime())
    })

    it('should handle marking non-existent verification', async () => {
      // Should not throw error for non-existent ID
      await expect(markEmailVerified('non-existent-id')).resolves.toBeUndefined()
    })
  })

  describe('createOrganization', () => {
    it('should create new organization with valid data', async () => {
      const organization = await createOrganization({
        domain: 'newcompany.com',
        name: 'New Company Ltd',
        packageTier: 'startup'
      })

      expect(organization).toMatchObject({
        domain: 'newcompany.com',
        name: 'New Company Ltd',
        packageTier: 'startup',
        interviewQuota: 100,
        interviewsUsed: 0
      })
      expect(organization.id).toBeDefined()
      expect(organization.createdAt).toBeInstanceOf(Date)
    })

    it('should default to startup package tier', async () => {
      const organization = await createOrganization({
        domain: 'defaultpackage.com',
        name: 'Default Package Company'
      })

      expect(organization.packageTier).toBe('startup')
    })

    it('should set correct quotas for different package tiers', async () => {
      const startupOrg = await createOrganization({
        domain: 'startup.com',
        name: 'Startup Company',
        packageTier: 'startup'
      })

      const growthOrg = await createOrganization({
        domain: 'growth.com',
        name: 'Growth Company',
        packageTier: 'growth'
      })

      const enterpriseOrg = await createOrganization({
        domain: 'enterprise.com',
        name: 'Enterprise Company',
        packageTier: 'enterprise'
      })

      expect(startupOrg.interviewQuota).toBe(100)
      expect(growthOrg.interviewQuota).toBe(500)
      expect(enterpriseOrg.interviewQuota).toBe(999999) // Unlimited represented as large number
    })
  })

  describe('createUser', () => {
    it('should create new user with valid organization reference', async () => {
      const { organization } = await seedBasicTestData(db)

      const user = await createUser({
        email: 'newuser@vietinbank.com.vn',
        organizationId: organization.id,
        isAdmin: false
      })

      expect(user).toMatchObject({
        email: 'newuser@vietinbank.com.vn',
        organizationId: organization.id,
        isAdmin: false
      })
      expect(user.id).toBeDefined()
      expect(user.createdAt).toBeInstanceOf(Date)
    })

    it('should default to non-admin user', async () => {
      const { organization } = await seedBasicTestData(db)

      const user = await createUser({
        email: 'regularuser@vietinbank.com.vn',
        organizationId: organization.id
      })

      expect(user.isAdmin).toBe(false)
    })

    it('should create admin user when specified', async () => {
      const { organization } = await seedBasicTestData(db)

      const user = await createUser({
        email: 'admin@vietinbank.com.vn',
        organizationId: organization.id,
        isAdmin: true
      })

      expect(user.isAdmin).toBe(true)
    })
  })

  describe('findUserByEmail', () => {
    it('should find existing user by email', async () => {
      const { adminUser } = await seedBasicTestData(db)

      const found = await findUserByEmail(adminUser.email)

      expect(found).toMatchObject({
        id: adminUser.id,
        email: adminUser.email,
        organizationId: adminUser.organizationId,
        isAdmin: adminUser.isAdmin
      })
    })

    it('should return null for non-existent email', async () => {
      const found = await findUserByEmail('nonexistent@company.com')
      expect(found).toBeNull()
    })

    it('should be case insensitive', async () => {
      const { adminUser } = await seedBasicTestData(db)

      const found = await findUserByEmail(adminUser.email.toUpperCase())
      expect(found).not.toBeNull()
      expect(found?.email).toBe(adminUser.email)
    })
  })

  describe('createUserSession', () => {
    it('should create session for valid user', async () => {
      const { adminUser } = await seedBasicTestData(db)

      const session = await createUserSession(adminUser.id)

      expect(session).toMatchObject({
        userId: adminUser.id
      })
      expect(session.sessionToken).toBeDefined()
      expect(session.sessionToken.length).toBeGreaterThan(10)
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should set expiry time 8 hours in the future', async () => {
      const { adminUser } = await seedBasicTestData(db)

      const session = await createUserSession(adminUser.id)

      const expectedExpiry = new Date()
      expectedExpiry.setHours(expectedExpiry.getHours() + 8)

      // Allow for a few seconds of difference
      const timeDiff = Math.abs(session.expiresAt.getTime() - expectedExpiry.getTime())
      expect(timeDiff).toBeLessThan(5000) // Less than 5 seconds difference
    })

    it('should clean up expired sessions for user', async () => {
      const { adminUser } = await seedBasicTestData(db)

      // Create an expired session
      const expiredDate = new Date()
      expiredDate.setHours(expiredDate.getHours() - 1)

      const expiredSessionData = createUserSessionData({
        userId: adminUser.id,
        expiresAt: expiredDate
      })

      await db.insert(schema.userSessions).values(expiredSessionData)

      // Create new session (should clean up expired ones)
      await createUserSession(adminUser.id)

      // Check that expired session was removed
      const sessions = await db.query.userSessions.findMany({
        where: (s, { eq }) => eq(s.userId, adminUser.id)
      })

      // Should only have the new session
      expect(sessions).toHaveLength(1)
      expect(sessions[0].expiresAt.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('logout', () => {
    // Note: This function depends on Next.js cookies which are hard to test
    // In a real implementation, you might extract the cookie logic to make it testable

    it('should be defined', () => {
      expect(logout).toBeDefined()
      expect(typeof logout).toBe('function')
    })

    // Mock test for the cookie-dependent functionality
    it('should handle logout process', async () => {
      // This would require mocking Next.js cookies
      // For now, just verify it doesn't throw
      await expect(logout()).resolves.toBeUndefined()
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete authentication flow for existing organization', async () => {
      // Setup: Create organization
      const { organization } = await seedBasicTestData(db)

      // Step 1: Create email verification
      const verification = await createEmailVerification({
        email: 'newuser@vietinbank.com.vn',
        organizationId: organization.id,
        isNewOrganization: false
      })

      expect(verification.organizationId).toBe(organization.id)

      // Step 2: Verify token
      const verified = await verifyEmailToken(verification.token)
      expect(verified).not.toBeNull()

      // Step 3: Mark as verified
      await markEmailVerified(verification.id)

      // Step 4: Create user
      const user = await createUser({
        email: verification.email,
        organizationId: organization.id,
        isAdmin: false
      })

      expect(user.email).toBe(verification.email)

      // Step 5: Create session
      const session = await createUserSession(user.id)
      expect(session.userId).toBe(user.id)
    })

    it('should handle complete authentication flow for new organization', async () => {
      const email = 'firstuser@newcompany.com'
      const domain = 'newcompany.com'

      // Step 1: Create email verification for new organization
      const verification = await createEmailVerification({
        email,
        organizationId: undefined,
        isNewOrganization: true
      })

      expect(verification.isNewOrganization).toBe(true)

      // Step 2: Verify token
      const verified = await verifyEmailToken(verification.token)
      expect(verified?.isNewOrganization).toBe(true)

      // Step 3: Create organization
      const organization = await createOrganization({
        domain,
        name: 'New Company Ltd'
      })

      expect(organization.domain).toBe(domain)

      // Step 4: Create first admin user
      const adminUser = await createUser({
        email,
        organizationId: organization.id,
        isAdmin: true
      })

      expect(adminUser.isAdmin).toBe(true)

      // Step 5: Create session
      const session = await createUserSession(adminUser.id)
      expect(session.userId).toBe(adminUser.id)
    })
  })
})