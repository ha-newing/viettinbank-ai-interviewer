import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { users, userSessions, emailVerifications } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { SESSION_COOKIE_NAME, SESSION_DURATION } from '@/lib/auth'

/**
 * Get the base URL for redirects, accounting for proxy headers
 */
function getBaseUrl(request: NextRequest): string {
  // First try the forwarded headers (for production behind proxy)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  // Fallback to NEXT_PUBLIC_APP_URL env variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // Last resort: use request.url (works for local dev)
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

/**
 * Handle email verification via GET request (magic link)
 * This route can set cookies because it's a Route Handler
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')
  const baseUrl = getBaseUrl(request)

  if (!token) {
    return NextResponse.redirect(new URL('/auth/verify?error=missing_token', baseUrl))
  }

  try {
    // Verify the token
    const verificationResult = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.token, token))
      .limit(1)

    const verification = verificationResult[0]
    if (!verification) {
      return NextResponse.redirect(new URL('/auth/verify?error=invalid_token', baseUrl))
    }

    // Check if expired or already verified
    const expiresAt = new Date(verification.expiresAt)
    const verifiedAt = verification.verifiedAt ? new Date(verification.verifiedAt) : null

    if (expiresAt < new Date() || verifiedAt) {
      return NextResponse.redirect(new URL('/auth/verify?error=expired_token', baseUrl))
    }

    // Handle new organization signup - redirect to create organization page
    if (verification.isNewOrganization) {
      return NextResponse.redirect(
        new URL(`/auth/create-organization?token=${token}&email=${encodeURIComponent(verification.email)}`, baseUrl)
      )
    }

    // Existing organization login
    if (!verification.organizationId) {
      return NextResponse.redirect(new URL('/auth/verify?error=invalid_organization', baseUrl))
    }

    // Mark verification as completed
    await db
      .update(emailVerifications)
      .set({ verifiedAt: new Date() })
      .where(eq(emailVerifications.id, verification.id))

    // Find or create user
    const existingUserResult = await db
      .select()
      .from(users)
      .where(eq(users.email, verification.email.toLowerCase()))
      .limit(1)

    let user = existingUserResult[0]

    if (!user) {
      // Create new user for existing organization
      const newUserResult = await db
        .insert(users)
        .values({
          email: verification.email.toLowerCase(),
          organizationId: verification.organizationId,
          isAdmin: false,
        })
        .returning()
      user = newUserResult[0]
    }

    // Create session
    const sessionToken = nanoid(32)
    const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION)

    await db.insert(userSessions).values({
      userId: user.id,
      sessionToken,
      expiresAt: sessionExpiresAt,
    })

    // Create redirect response and set cookie on it
    const redirectUrl = new URL('/dashboard/assessment-sessions', baseUrl)
    const response = NextResponse.redirect(redirectUrl)

    // Set cookie directly on the response to ensure it's included in the redirect
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      expires: sessionExpiresAt,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error verifying email:', error)
    return NextResponse.redirect(new URL('/auth/verify?error=server_error', baseUrl))
  }
}
