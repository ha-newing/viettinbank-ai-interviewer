'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
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
  logout as logoutHelper,
} from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'

// Validation schemas
const emailSchema = z.object({
  email: z.string().email('Vui lòng nhập địa chỉ email hợp lệ'),
})

const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Token không hợp lệ'),
})

const newOrganizationSchema = z.object({
  email: z.string().email('Vui lòng nhập địa chỉ email hợp lệ'),
  organizationName: z.string().min(2, 'Tên tổ chức phải có ít nhất 2 ký tự'),
  token: z.string().min(1, 'Token không hợp lệ'),
})

export type AuthResult =
  | { success: true; message: string }
  | { success: false; error: string }

/**
 * Handle initial login/signup request
 * Determines if organization exists and sends appropriate verification email
 */
export async function requestLogin(formData: FormData): Promise<AuthResult> {
  try {
    const result = emailSchema.safeParse({
      email: formData.get('email'),
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error.errors[0]?.message || 'Dữ liệu không hợp lệ'
      }
    }

    const { email } = result.data
    const domain = extractDomainFromEmail(email)

    // Check if organization exists for this domain
    const existingOrg = await findOrganizationByDomain(domain)

    if (existingOrg) {
      // Organization exists - send login verification
      const verification = await createEmailVerification({
        email,
        organizationId: existingOrg.id,
        isNewOrganization: false,
      })

      const emailSent = await sendVerificationEmail({
        email,
        token: verification.token,
        organizationName: existingOrg.name,
        isNewOrganization: false,
      })

      if (!emailSent) {
        return {
          success: false,
          error: 'Không thể gửi email xác thực. Vui lòng thử lại sau.',
        }
      }

      return {
        success: true,
        message: `Email xác thực đã được gửi đến ${email}. Vui lòng kiểm tra hộp thư và nhấn vào liên kết để đăng nhập.`,
      }
    } else {
      // No organization exists - send new organization signup
      const verification = await createEmailVerification({
        email,
        organizationId: undefined,
        isNewOrganization: true,
      })

      const emailSent = await sendVerificationEmail({
        email,
        token: verification.token,
        isNewOrganization: true,
      })

      if (!emailSent) {
        return {
          success: false,
          error: 'Không thể gửi email xác thực. Vui lòng thử lại sau.',
        }
      }

      return {
        success: true,
        message: `Chưa có tổ chức nào sử dụng domain ${domain}. Email hướng dẫn tạo tổ chức mới đã được gửi đến ${email}.`,
      }
    }
  } catch (error) {
    console.error('Error in requestLogin:', error)
    return {
      success: false,
      error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    }
  }
}

/**
 * Handle email verification for existing organization login
 */
export async function verifyEmail(formData: FormData): Promise<AuthResult> {
  try {
    const result = verifyTokenSchema.safeParse({
      token: formData.get('token'),
    })

    if (!result.success) {
      return {
        success: false,
        error: 'Token xác thực không hợp lệ'
      }
    }

    const { token } = result.data

    // Verify the token
    const verification = await verifyEmailToken(token)
    if (!verification) {
      return {
        success: false,
        error: 'Liên kết xác thực không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đăng nhập lại.',
      }
    }

    // Mark verification as completed
    await markEmailVerified(verification.id)

    if (verification.isNewOrganization) {
      // New organization signup - redirect to organization creation
      redirect(`/auth/create-organization?token=${token}&email=${encodeURIComponent(verification.email)}`)
    } else {
      // Existing organization login
      if (!verification.organizationId) {
        return {
          success: false,
          error: 'Thông tin tổ chức không hợp lệ.',
        }
      }

      // Find or create user
      let user = await findUserByEmail(verification.email)

      if (!user) {
        // Create new user for existing organization
        user = await createUser({
          email: verification.email,
          organizationId: verification.organizationId,
          isAdmin: false, // First user in domain becomes admin later if needed
        })
      }

      // Create session
      await createUserSession(user.id)

      return {
        success: true,
        message: 'Đăng nhập thành công!',
      }
    }
  } catch (error) {
    console.error('Error in verifyEmail:', error)
    return {
      success: false,
      error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    }
  }
}

/**
 * Handle new organization creation
 */
export async function createNewOrganization(formData: FormData): Promise<AuthResult> {
  try {
    const result = newOrganizationSchema.safeParse({
      email: formData.get('email'),
      organizationName: formData.get('organizationName'),
      token: formData.get('token'),
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error.errors[0]?.message || 'Dữ liệu không hợp lệ'
      }
    }

    const { email, organizationName, token } = result.data

    // Verify the token again to ensure it's valid
    const verification = await verifyEmailToken(token)
    if (!verification || !verification.isNewOrganization || verification.email !== email) {
      return {
        success: false,
        error: 'Token xác thực không hợp lệ.',
      }
    }

    const domain = extractDomainFromEmail(email)

    // Check if organization was created while we were filling the form
    const existingOrg = await findOrganizationByDomain(domain)
    if (existingOrg) {
      return {
        success: false,
        error: 'Tổ chức cho domain này đã tồn tại. Vui lòng sử dụng chức năng đăng nhập.',
      }
    }

    // Create the organization
    const organization = await createOrganization({
      domain,
      name: organizationName,
      packageTier: 'startup',
    })

    // Create the first admin user
    const user = await createUser({
      email,
      organizationId: organization.id,
      isAdmin: true, // First user becomes admin
    })

    // Create session
    await createUserSession(user.id)

    return {
      success: true,
      message: 'Tổ chức đã được tạo thành công! Chào mừng bạn đến với VietinBank AI Interviewer.',
    }
  } catch (error) {
    console.error('Error in createNewOrganization:', error)
    return {
      success: false,
      error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    }
  }
}

/**
 * Handle user logout
 */
export async function logout(): Promise<void> {
  try {
    await logoutHelper()
  } catch (error) {
    console.error('Error in logout:', error)
  }

  redirect('/auth/login')
}