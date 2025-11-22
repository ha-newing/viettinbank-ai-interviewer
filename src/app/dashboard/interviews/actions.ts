'use server'

import { z } from 'zod'
import { nanoid } from 'nanoid'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { interviews, jobTemplates, organizations } from '@/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { sendEmail } from '@/lib/email'

// Validation schemas
const singleInterviewSchema = z.object({
  candidateName: z.string().min(2, 'Tên ứng viên phải có ít nhất 2 ký tự'),
  candidateEmail: z.string().email('Email không hợp lệ'),
  candidatePhone: z.string().optional(),
  jobTemplateId: z.string().min(1, 'Vui lòng chọn job template'),
  notes: z.string().optional(),
})

export type InterviewResult =
  | { success: true; message: string; interviewId?: string }
  | { success: false; error: string }

/**
 * Create a single interview
 */
export async function createSingleInterview(formData: FormData): Promise<InterviewResult> {
  try {
    // Require authentication
    const user = await requireAuth()

    const result = singleInterviewSchema.safeParse({
      candidateName: formData.get('candidateName'),
      candidateEmail: formData.get('candidateEmail'),
      candidatePhone: formData.get('candidatePhone') || undefined,
      jobTemplateId: formData.get('jobTemplateId'),
      notes: formData.get('notes') || undefined,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error.errors[0]?.message || 'Dữ liệu không hợp lệ'
      }
    }

    const { candidateName, candidateEmail, candidatePhone, jobTemplateId, notes } = result.data

    // Check if job template exists and belongs to user's organization
    const jobTemplate = await db
      .select()
      .from(jobTemplates)
      .where(
        and(
          eq(jobTemplates.id, jobTemplateId),
          eq(jobTemplates.organizationId, user.organizationId)
        )
      )
      .limit(1)

    if (!jobTemplate[0]) {
      return {
        success: false,
        error: 'Job template không tồn tại hoặc bạn không có quyền truy cập'
      }
    }

    // Check organization quota
    const [organizationData, currentUsage] = await Promise.all([
      db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId))
        .limit(1),
      db
        .select({ count: count() })
        .from(interviews)
        .where(eq(interviews.organizationId, user.organizationId))
    ])

    const organization = organizationData[0]
    const usedInterviews = currentUsage[0]?.count || 0

    if (usedInterviews >= organization.interviewQuota) {
      return {
        success: false,
        error: `Đã đạt giới hạn quota (${organization.interviewQuota} phỏng vấn). Vui lòng nâng cấp gói.`
      }
    }

    // Generate unique interview link token
    const interviewLinkToken = nanoid(32)
    const linkExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create interview
    const interview = await db
      .insert(interviews)
      .values({
        organizationId: user.organizationId,
        jobTemplateId,
        candidateEmail,
        candidateName,
        candidatePhone,
        status: 'pending',
        interviewLinkToken,
        interviewLinkExpiresAt: linkExpiresAt,
        createdBy: user.id,
      })
      .returning()

    if (!interview[0]) {
      return {
        success: false,
        error: 'Không thể tạo phỏng vấn. Vui lòng thử lại.'
      }
    }

    // Send interview invitation email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const interviewUrl = `${baseUrl}/interview/${interviewLinkToken}`

    const emailContent = {
      to: candidateEmail,
      subject: `Lời mời phỏng vấn AI - ${jobTemplate[0].title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Lời mời phỏng vấn AI</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #1e40af;">VietinBank AI Interviewer</h1>
              <h2>Lời mời phỏng vấn</h2>
            </div>
            <div class="content">
              <p>Xin chào <strong>${candidateName}</strong>,</p>
              <p>Bạn được mời tham gia phỏng vấn AI cho vị trí <strong>${jobTemplate[0].title}</strong> tại <strong>${user.organizationName}</strong>.</p>

              <div style="margin: 20px 0; padding: 15px; background: white; border-radius: 6px;">
                <h3 style="margin: 0 0 10px 0;">Thông tin phỏng vấn:</h3>
                <ul style="margin: 0;">
                  <li>Vị trí: ${jobTemplate[0].title}</li>
                  <li>Thời gian: ${jobTemplate[0].interviewDuration} phút</li>
                  <li>Hạn cuối: ${linkExpiresAt.toLocaleDateString('vi-VN')}</li>
                  <li>Tổ chức: ${user.organizationName}</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${interviewUrl}" class="button">Bắt đầu phỏng vấn</a>
              </div>

              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong>Lưu ý quan trọng:</strong>
                <ul style="margin: 10px 0 0 0; font-size: 14px;">
                  <li>Chuẩn bị webcam và microphone</li>
                  <li>Tìm nơi yên tĩnh, ánh sáng tốt</li>
                  <li>Link phỏng vấn có thời hạn ${linkExpiresAt.toLocaleDateString('vi-VN')}</li>
                  <li>Phỏng vấn được thực hiện bằng tiếng Việt</li>
                </ul>
              </div>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
              Email được gửi từ hệ thống VietinBank AI Interviewer
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Lời mời phỏng vấn AI - ${jobTemplate[0].title}

        Xin chào ${candidateName},

        Bạn được mời tham gia phỏng vấn AI cho vị trí ${jobTemplate[0].title} tại ${user.organizationName}.

        Thông tin phỏng vấn:
        - Vị trí: ${jobTemplate[0].title}
        - Thời gian: ${jobTemplate[0].interviewDuration} phút
        - Hạn cuối: ${linkExpiresAt.toLocaleDateString('vi-VN')}

        Link phỏng vấn: ${interviewUrl}

        Lưu ý: Chuẩn bị webcam, microphone và tìm nơi yên tĩnh cho phỏng vấn.
      `
    }

    const emailSent = await sendEmail({
      to: candidateEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    // Update organization interview usage
    await db
      .update(organizations)
      .set({ interviewsUsed: usedInterviews + 1 })
      .where(eq(organizations.id, user.organizationId))

    return {
      success: true,
      message: `Phỏng vấn cho ${candidateName} đã được tạo và email mời đã được gửi đến ${candidateEmail}`,
      interviewId: interview[0].id
    }

  } catch (error) {
    console.error('Error creating interview:', error)
    return {
      success: false,
      error: 'Đã xảy ra lỗi khi tạo phỏng vấn. Vui lòng thử lại.'
    }
  }
}

/**
 * Create bulk interviews from CSV upload
 */
export async function createBulkInterviews(formData: FormData): Promise<InterviewResult> {
  try {
    // Require authentication
    const user = await requireAuth()

    const jobTemplateId = formData.get('jobTemplateId') as string
    const csvFile = formData.get('csvFile') as File

    if (!jobTemplateId) {
      return { success: false, error: 'Vui lòng chọn job template' }
    }

    if (!csvFile || csvFile.size === 0) {
      return { success: false, error: 'Vui lòng upload file CSV' }
    }

    // Check file size (max 10MB)
    if (csvFile.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File quá lớn. Kích thước tối đa 10MB.' }
    }

    // Check file type
    if (!csvFile.name.match(/\.(csv|xlsx|xls)$/i)) {
      return { success: false, error: 'Chỉ hỗ trợ file CSV, XLSX hoặc XLS' }
    }

    // Check if job template exists
    const jobTemplate = await db
      .select()
      .from(jobTemplates)
      .where(
        and(
          eq(jobTemplates.id, jobTemplateId),
          eq(jobTemplates.organizationId, user.organizationId)
        )
      )
      .limit(1)

    if (!jobTemplate[0]) {
      return {
        success: false,
        error: 'Job template không tồn tại hoặc bạn không có quyền truy cập'
      }
    }

    // Parse CSV file
    const csvText = await csvFile.text()
    const lines = csvText.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return { success: false, error: 'File CSV phải có ít nhất 1 dòng dữ liệu (ngoài header)' }
    }

    // Parse candidates
    const candidates: Array<{ name: string; email: string; phone?: string }> = []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim()
      if (!line) continue

      const [name, email, phone] = line.split(',').map(s => s.trim())

      if (!name || !email) {
        errors.push(`Dòng ${i + 1}: Thiếu tên hoặc email`)
        continue
      }

      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Dòng ${i + 1}: Email không hợp lệ (${email})`)
        continue
      }

      candidates.push({ name, email, phone })
    }

    if (candidates.length === 0) {
      return { success: false, error: 'Không có ứng viên hợp lệ nào trong file' }
    }

    if (candidates.length > 100) {
      return { success: false, error: 'Tối đa 100 ứng viên mỗi lần upload' }
    }

    // Check organization quota
    const [organizationData, currentUsage] = await Promise.all([
      db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId))
        .limit(1),
      db
        .select({ count: count() })
        .from(interviews)
        .where(eq(interviews.organizationId, user.organizationId))
    ])

    const organization = organizationData[0]
    const usedInterviews = currentUsage[0]?.count || 0
    const remainingQuota = organization.interviewQuota - usedInterviews

    if (candidates.length > remainingQuota) {
      return {
        success: false,
        error: `Không đủ quota. Cần ${candidates.length} phỏng vấn nhưng chỉ còn ${remainingQuota} quota.`
      }
    }

    // Create interviews in batch
    const createdInterviews = []
    const emailErrors = []

    for (const candidate of candidates) {
      try {
        // Generate unique token
        const interviewLinkToken = nanoid(32)
        const linkExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

        // Create interview
        const interview = await db
          .insert(interviews)
          .values({
            organizationId: user.organizationId,
            jobTemplateId,
            candidateEmail: candidate.email,
            candidateName: candidate.name,
            candidatePhone: candidate.phone,
            status: 'pending',
            interviewLinkToken,
            interviewLinkExpiresAt: linkExpiresAt,
            createdBy: user.id,
          })
          .returning()

        if (interview[0]) {
          createdInterviews.push(interview[0])

          // Send email invitation (continue even if email fails)
          try {
            // Use simplified email sending for bulk
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            const interviewUrl = `${baseUrl}/interview/${interviewLinkToken}`

            // TODO: Send bulk email (for now, just log)
            console.log(`Email invitation should be sent to ${candidate.email}: ${interviewUrl}`)

          } catch (emailError) {
            console.error(`Failed to send email to ${candidate.email}:`, emailError)
            emailErrors.push(candidate.email)
          }
        }
      } catch (createError) {
        console.error(`Failed to create interview for ${candidate.email}:`, createError)
        errors.push(`Không thể tạo phỏng vấn cho ${candidate.name} (${candidate.email})`)
      }
    }

    // Update organization usage
    if (createdInterviews.length > 0) {
      await db
        .update(organizations)
        .set({ interviewsUsed: usedInterviews + createdInterviews.length })
        .where(eq(organizations.id, user.organizationId))
    }

    let message = `Đã tạo thành công ${createdInterviews.length} phỏng vấn từ ${candidates.length} ứng viên.`

    if (emailErrors.length > 0) {
      message += ` Lưu ý: Không thể gửi email đến ${emailErrors.length} ứng viên.`
    }

    if (errors.length > 0) {
      message += ` Có ${errors.length} lỗi: ${errors.slice(0, 3).join(', ')}`
      if (errors.length > 3) {
        message += ` và ${errors.length - 3} lỗi khác.`
      }
    }

    if (createdInterviews.length > 0) {
      return {
        success: true,
        message,
      }
    } else {
      return {
        success: false,
        error: message
      }
    }

  } catch (error) {
    console.error('Error creating bulk interviews:', error)
    return {
      success: false,
      error: 'Đã xảy ra lỗi khi xử lý file. Vui lòng thử lại.'
    }
  }
}

/**
 * Resend interview invitation email
 */
export async function resendInterviewEmail(formData: FormData): Promise<InterviewResult> {
  try {
    // Require authentication
    const user = await requireAuth()

    const interviewId = formData.get('interviewId') as string

    if (!interviewId) {
      return {
        success: false,
        error: 'ID phỏng vấn không hợp lệ'
      }
    }

    // Get interview by ID and ensure it belongs to user's organization
    const interview = await db
      .select({
        id: interviews.id,
        candidateName: interviews.candidateName,
        candidateEmail: interviews.candidateEmail,
        jobTemplateId: interviews.jobTemplateId,
        interviewLinkToken: interviews.interviewLinkToken,
        interviewLinkExpiresAt: interviews.interviewLinkExpiresAt,
        status: interviews.status,
        organizationId: interviews.organizationId
      })
      .from(interviews)
      .where(
        and(
          eq(interviews.id, interviewId),
          eq(interviews.organizationId, user.organizationId)
        )
      )
      .limit(1)

    if (!interview[0]) {
      return {
        success: false,
        error: 'Phỏng vấn không tồn tại hoặc bạn không có quyền truy cập'
      }
    }

    const interviewData = interview[0]

    // Check if interview is still valid (not completed and not expired)
    if (interviewData.status === 'completed') {
      return {
        success: false,
        error: 'Không thể gửi lại email cho phỏng vấn đã hoàn thành'
      }
    }

    if (interviewData.interviewLinkExpiresAt && new Date() > interviewData.interviewLinkExpiresAt) {
      return {
        success: false,
        error: 'Liên kết phỏng vấn đã hết hạn. Vui lòng tạo phỏng vấn mới.'
      }
    }

    // Get job template information
    const jobTemplate = await db
      .select()
      .from(jobTemplates)
      .where(eq(jobTemplates.id, interviewData.jobTemplateId))
      .limit(1)

    if (!jobTemplate[0]) {
      return {
        success: false,
        error: 'Template phỏng vấn không tồn tại'
      }
    }

    // Construct interview URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const interviewUrl = `${baseUrl}/interview/${interviewData.interviewLinkToken}`

    // Send interview invitation email
    const emailContent = {
      to: interviewData.candidateEmail,
      subject: `[Gửi lại] Lời mời phỏng vấn AI - ${jobTemplate[0].title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Lời mời phỏng vấn AI</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #1e40af;">VietinBank AI Interviewer</h1>
              <h2>Lời mời phỏng vấn (Gửi lại)</h2>
            </div>
            <div class="content">
              <p>Xin chào <strong>${interviewData.candidateName}</strong>,</p>
              <p>Đây là email gửi lại lời mời tham gia phỏng vấn AI cho vị trí <strong>${jobTemplate[0].title}</strong> tại <strong>${user.organizationName}</strong>.</p>

              <div style="margin: 20px 0; padding: 15px; background: white; border-radius: 6px;">
                <h3 style="margin: 0 0 10px 0;">Thông tin phỏng vấn:</h3>
                <ul style="margin: 0;">
                  <li>Vị trí: ${jobTemplate[0].title}</li>
                  <li>Thời gian: ${jobTemplate[0].interviewDuration} phút</li>
                  <li>Hạn cuối: ${interviewData.interviewLinkExpiresAt?.toLocaleDateString('vi-VN')}</li>
                  <li>Tổ chức: ${user.organizationName}</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${interviewUrl}" class="button">Bắt đầu phỏng vấn</a>
              </div>

              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong>Lưu ý quan trọng:</strong>
                <ul style="margin: 10px 0 0 0; font-size: 14px;">
                  <li>Chuẩn bị webcam và microphone</li>
                  <li>Tìm nơi yên tĩnh, ánh sáng tốt</li>
                  <li>Link phỏng vấn có thời hạn ${interviewData.interviewLinkExpiresAt?.toLocaleDateString('vi-VN')}</li>
                  <li>Phỏng vấn được thực hiện bằng tiếng Việt</li>
                </ul>
              </div>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
              Email được gửi từ hệ thống VietinBank AI Interviewer
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        [Gửi lại] Lời mời phỏng vấn AI - ${jobTemplate[0].title}

        Xin chào ${interviewData.candidateName},

        Đây là email gửi lại lời mời tham gia phỏng vấn AI cho vị trí ${jobTemplate[0].title} tại ${user.organizationName}.

        Thông tin phỏng vấn:
        - Vị trí: ${jobTemplate[0].title}
        - Thời gian: ${jobTemplate[0].interviewDuration} phút
        - Hạn cuối: ${interviewData.interviewLinkExpiresAt?.toLocaleDateString('vi-VN')}

        Link phỏng vấn: ${interviewUrl}

        Lưu ý: Chuẩn bị webcam, microphone và tìm nơi yên tĩnh cho phỏng vấn.
      `
    }

    const emailSent = await sendEmail({
      to: interviewData.candidateEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    return {
      success: true,
      message: `Email mời phỏng vấn đã được gửi lại cho ${interviewData.candidateName} (${interviewData.candidateEmail})`,
    }

  } catch (error) {
    console.error('Error resending interview email:', error)
    return {
      success: false,
      error: 'Đã xảy ra lỗi khi gửi lại email. Vui lòng thử lại.'
    }
  }
}