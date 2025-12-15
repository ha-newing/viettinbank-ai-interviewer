import { db } from '@/lib/db'
import { users, userSessions, organizations, emailVerifications } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Session management
export const SESSION_COOKIE_NAME = 'vb-session'
export const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

export interface AuthUser {
  id: string
  email: string
  organizationId: string
  organizationName: string
  organizationDomain: string
  isAdmin: boolean
  lastLoginAt?: Date | null
}

/**
 * Get current authenticated user from session cookie
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!sessionToken) {
      return null
    }

    // Find valid session
    const sessionResult = await db
      .select({
        user: users,
        organization: organizations,
        session: userSessions,
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .innerJoin(organizations, eq(users.organizationId, organizations.id))
      .where(
        and(
          eq(userSessions.sessionToken, sessionToken),
          // Check session hasn't expired
          // Note: expiresAt is stored as timestamp, so we compare with current timestamp
        )
      )
      .limit(1)

    const session = sessionResult[0]
    if (!session || session.session.expiresAt < new Date()) {
      // Session expired or not found, clean up
      if (session?.session.id) {
        await db.delete(userSessions).where(eq(userSessions.id, session.session.id))
      }
      return null
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, session.user.id))

    return {
      id: session.user.id,
      email: session.user.email,
      organizationId: session.organization.id,
      organizationName: session.organization.name,
      organizationDomain: session.organization.domain,
      isAdmin: session.user.isAdmin,
      lastLoginAt: session.user.lastLoginAt,
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Create a new user session
 */
export async function createUserSession(userId: string): Promise<string> {
  const sessionToken = nanoid(32)
  const expiresAt = new Date(Date.now() + SESSION_DURATION)

  await db.insert(userSessions).values({
    userId,
    sessionToken,
    expiresAt,
  })

  // Set cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    expires: expiresAt,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })

  return sessionToken
}

/**
 * Logout user by removing session
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (sessionToken) {
    // Remove session from database
    await db.delete(userSessions).where(eq(userSessions.sessionToken, sessionToken))

    // Clear cookie
    cookieStore.delete(SESSION_COOKIE_NAME)
  }
}

/**
 * Extract domain from email address
 */
export function extractDomainFromEmail(email: string): string {
  // Allow domains with or without dots (for localhost, etc.)
  const emailRegex = /^[^\s@]+@[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format')
  }

  const parts = email.split('@')
  if (parts.length !== 2 || parts[1].length === 0) {
    throw new Error('Invalid email format')
  }

  const domain = parts[1].toLowerCase()

  // Check for personal email domains
  const personalDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com']
  if (personalDomains.includes(domain)) {
    throw new Error('Personal email domains are not allowed')
  }

  return domain
}

/**
 * Check if organization exists by domain
 */
export async function findOrganizationByDomain(domain: string) {
  const result = await db
    .select()
    .from(organizations)
    .where(eq(organizations.domain, domain.toLowerCase()))
    .limit(1)

  return result[0] || null
}

/**
 * Generate secure email verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Create email verification record
 */
export async function createEmailVerification({
  email,
  organizationId,
  isNewOrganization,
}: {
  email: string
  organizationId?: string
  isNewOrganization: boolean
}) {
  const token = generateVerificationToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  const verification = await db
    .insert(emailVerifications)
    .values({
      email,
      token,
      organizationId,
      isNewOrganization,
      expiresAt,
    })
    .returning()

  return verification[0]
}

/**
 * Verify email token and get verification record
 */
export async function verifyEmailToken(token: string) {
  const result = await db
    .select()
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.token, token),
        // Check not expired and not already verified
      )
    )
    .limit(1)

  const verification = result[0]
  if (!verification) {
    return null
  }

  // Convert database timestamps to Date objects for comparison
  const expiresAt = new Date(verification.expiresAt)
  const verifiedAt = verification.verifiedAt ? new Date(verification.verifiedAt) : null

  // Check if expired or already verified
  if (expiresAt < new Date() || verifiedAt) {
    return null
  }

  return {
    ...verification,
    expiresAt,
    verifiedAt
  }
}

/**
 * Mark email verification as completed
 */
export async function markEmailVerified(verificationId: string) {
  await db
    .update(emailVerifications)
    .set({ verifiedAt: new Date() })
    .where(eq(emailVerifications.id, verificationId))
}

/**
 * Create new organization
 */
export async function createOrganization({
  domain,
  name,
  packageTier = 'startup' as const,
}: {
  domain: string
  name: string
  packageTier?: 'startup' | 'growth' | 'enterprise'
}) {
  const organization = await db
    .insert(organizations)
    .values({
      domain: domain.toLowerCase(),
      name,
      packageTier,
      interviewQuota: packageTier === 'startup' ? 100 : packageTier === 'growth' ? 500 : 999999,
    })
    .returning()

  return organization[0]
}

/**
 * Create new user
 */
export async function createUser({
  email,
  organizationId,
  isAdmin = false,
}: {
  email: string
  organizationId: string
  isAdmin?: boolean
}) {
  const user = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      organizationId,
      isAdmin,
    })
    .returning()

  return user[0]
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)

  return result[0] || null
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }
  return user
}

/**
 * Require admin access
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (!user.isAdmin) {
    throw new Error('Admin access required')
  }
  return user
}