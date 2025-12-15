'use server'

import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  assessmentSessions,
  assessmentParticipants,
  jobTemplates,
  assessmentSessionStatusEnum,
  assessmentRoleCodeEnum,
  type AssessmentSessionStatus
} from '@/db/schema'
import { eq, and, count } from 'drizzle-orm'

// Validation schemas
const createAssessmentSessionSchema = z.object({
  name: z.string().min(2, 'Tên phiên đánh giá không được dưới 2 ký tự').max(100, 'Tên phiên đánh giá không được vượt quá 100 ký tự'),
  jobTemplateId: z.string().optional(),
  participants: z.array(
    z.object({
      name: z.string().min(2, 'Tên thí sinh không được dưới 2 ký tự'),
      email: z.string().email('Email không hợp lệ'),
      roleCode: z.enum(assessmentRoleCodeEnum, { errorMap: () => ({ message: 'Vai trò không hợp lệ' }) }),
      roleName: z.string().min(1, 'Tên vai trò không được để trống')
    })
  ).min(1, 'Phải có ít nhất 1 thí sinh').max(5, 'Không được vượt quá 5 thí sinh')
}).refine(
  (data) => {
    const roleCodes = data.participants.map(p => p.roleCode)
    const uniqueRoles = new Set(roleCodes)
    return uniqueRoles.size === roleCodes.length
  },
  {
    message: 'Mỗi thí sinh phải có vai trò khác nhau (A, B, C, D, E)',
    path: ['participants']
  }
).refine(
  (data) => {
    const emails = data.participants.map(p => p.email.toLowerCase())
    const uniqueEmails = new Set(emails)
    return uniqueEmails.size === emails.length
  },
  {
    message: 'Email của các thí sinh không được trùng nhau',
    path: ['participants']
  }
)

const updateAssessmentSessionSchema = z.object({
  id: z.string().min(1, 'ID phiên đánh giá không hợp lệ'),
  name: z.string().min(2, 'Tên phiên đánh giá không được dưới 2 ký tự').max(100, 'Tên phiên đánh giá không được vượt quá 100 ký tự'),
  status: z.enum(assessmentSessionStatusEnum, { errorMap: () => ({ message: 'Trạng thái không hợp lệ' }) })
})

const deleteAssessmentSessionSchema = z.object({
  id: z.string().min(1, 'ID phiên đánh giá không hợp lệ')
})

export type AssessmentSessionResult =
  | { success: true; message: string; sessionId?: string }
  | { success: false; error: string; field?: string }

export async function createAssessmentSession(formData: FormData): Promise<AssessmentSessionResult> {
  try {
    const user = await requireAuth()

    // Parse participants from form data
    const participantsData: any[] = []
    let participantIndex = 0

    while (formData.get(`participants[${participantIndex}][name]`)) {
      participantsData.push({
        name: formData.get(`participants[${participantIndex}][name]`),
        email: formData.get(`participants[${participantIndex}][email]`),
        roleCode: formData.get(`participants[${participantIndex}][roleCode]`),
        roleName: formData.get(`participants[${participantIndex}][roleName]`)
      })
      participantIndex++
    }

    const result = createAssessmentSessionSchema.safeParse({
      name: formData.get('name'),
      jobTemplateId: formData.get('jobTemplateId'),
      participants: participantsData
    })

    if (!result.success) {
      const firstError = result.error.errors[0]
      return {
        success: false,
        error: firstError?.message || 'Dữ liệu không hợp lệ',
        field: firstError?.path?.[0] as string
      }
    }

    const data = result.data

    // Check if job template exists and belongs to organization (if provided)
    // "default" means no template selected (use standard Assessment Center framework)
    let jobTemplate = null
    const jobTemplateId = data.jobTemplateId && data.jobTemplateId !== 'default' ? data.jobTemplateId : null
    if (jobTemplateId) {
      const jobTemplateResult = await db
        .select()
        .from(jobTemplates)
        .where(
          and(
            eq(jobTemplates.id, jobTemplateId),
            eq(jobTemplates.organizationId, user.organizationId)
          )
        )
        .limit(1)

      if (!jobTemplateResult[0]) {
        return {
          success: false,
          error: 'Mẫu công việc không tồn tại hoặc bạn không có quyền truy cập'
        }
      }
      jobTemplate = jobTemplateResult[0]
    }

    // Create session and participants in a transaction
    const session = await db.transaction(async (tx) => {
      // Create assessment session
      const [newSession] = await tx
        .insert(assessmentSessions)
        .values({
          organizationId: user.organizationId,
          name: data.name,
          jobTemplateId: jobTemplateId,
          status: 'created'
        })
        .returning()

      if (!newSession) {
        throw new Error('Không thể tạo phiên đánh giá')
      }

      // Create participants
      const participantValues = data.participants.map((participant, index) => ({
        sessionId: newSession.id,
        name: participant.name,
        email: participant.email.toLowerCase(),
        roleCode: participant.roleCode,
        roleName: participant.roleName,
        speakerLabel: `Speaker ${index + 1}`, // For transcript mapping
        tbeiStatus: 'pending' as const,
        hipoStatus: 'pending' as const,
        quizStatus: 'pending' as const
      }))

      await tx
        .insert(assessmentParticipants)
        .values(participantValues)

      return newSession
    })

    return {
      success: true,
      message: `Phiên đánh giá "${data.name}" với ${data.participants.length} thí sinh đã được tạo thành công`,
      sessionId: session.id
    }

  } catch (error) {
    console.error('Error creating assessment session:', error)
    return {
      success: false,
      error: 'Đã xảy ra lỗi khi tạo phiên đánh giá. Vui lòng thử lại.'
    }
  }
}

export async function updateAssessmentSession(formData: FormData): Promise<AssessmentSessionResult> {
  try {
    const user = await requireAuth()

    const result = updateAssessmentSessionSchema.safeParse({
      id: formData.get('id'),
      name: formData.get('name'),
      status: formData.get('status')
    })

    if (!result.success) {
      const firstError = result.error.errors[0]
      return {
        success: false,
        error: firstError?.message || 'Dữ liệu không hợp lệ',
        field: firstError?.path?.[0] as string
      }
    }

    const data = result.data

    // Check if session exists and belongs to organization
    const existingSession = await db
      .select()
      .from(assessmentSessions)
      .where(
        and(
          eq(assessmentSessions.id, data.id),
          eq(assessmentSessions.organizationId, user.organizationId)
        )
      )
      .limit(1)

    if (!existingSession[0]) {
      return {
        success: false,
        error: 'Phiên đánh giá không tồn tại hoặc bạn không có quyền truy cập'
      }
    }

    // Update session
    const updatedData: Partial<typeof assessmentSessions.$inferInsert> = {
      name: data.name,
      status: data.status as AssessmentSessionStatus
    }

    // Set completion time if status is completed
    if (data.status === 'completed') {
      updatedData.completedAt = new Date()
    }

    const [updatedSession] = await db
      .update(assessmentSessions)
      .set(updatedData)
      .where(eq(assessmentSessions.id, data.id))
      .returning()

    if (!updatedSession) {
      return {
        success: false,
        error: 'Không thể cập nhật phiên đánh giá. Vui lòng thử lại.'
      }
    }

    return {
      success: true,
      message: `Phiên đánh giá "${data.name}" đã được cập nhật thành công`
    }

  } catch (error) {
    console.error('Error updating assessment session:', error)
    return {
      success: false,
      error: 'Đã xảy ra lỗi khi cập nhật phiên đánh giá. Vui lòng thử lại.'
    }
  }
}

export async function deleteAssessmentSession(formData: FormData): Promise<AssessmentSessionResult> {
  try {
    const user = await requireAuth()

    const result = deleteAssessmentSessionSchema.safeParse({
      id: formData.get('id')
    })

    if (!result.success) {
      return {
        success: false,
        error: 'ID phiên đánh giá không hợp lệ'
      }
    }

    const { id } = result.data

    // Check if session exists and belongs to organization
    const existingSession = await db
      .select({
        id: assessmentSessions.id,
        name: assessmentSessions.name,
        status: assessmentSessions.status
      })
      .from(assessmentSessions)
      .where(
        and(
          eq(assessmentSessions.id, id),
          eq(assessmentSessions.organizationId, user.organizationId)
        )
      )
      .limit(1)

    if (!existingSession[0]) {
      return {
        success: false,
        error: 'Phiên đánh giá không tồn tại hoặc bạn không có quyền truy cập'
      }
    }

    const session = existingSession[0]

    // Check if session can be deleted (only if it's in created status)
    if (session.status !== 'created') {
      return {
        success: false,
        error: 'Chỉ có thể xóa phiên đánh giá ở trạng thái "Đã tạo". Phiên này đã bắt đầu hoặc hoàn thành.'
      }
    }

    // Check if there are any evaluations or responses (additional safety check)
    const [participantCount] = await db
      .select({ count: count() })
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.sessionId, id))

    // Delete session (CASCADE will delete related participants, transcripts, etc.)
    await db
      .delete(assessmentSessions)
      .where(eq(assessmentSessions.id, id))

    return {
      success: true,
      message: `Phiên đánh giá "${session.name}" và ${participantCount.count || 0} thí sinh đã được xóa thành công`
    }

  } catch (error) {
    console.error('Error deleting assessment session:', error)
    return {
      success: false,
      error: 'Đã xảy ra lỗi khi xóa phiên đánh giá. Vui lòng thử lại.'
    }
  }
}

// Helper function to get assessment session statistics
export async function getAssessmentSessionStats(organizationId: string) {
  try {
    const [totalCount, createdCount, inProgressCount, completedCount] = await Promise.all([
      db.select({ count: count() })
        .from(assessmentSessions)
        .where(eq(assessmentSessions.organizationId, organizationId)),

      db.select({ count: count() })
        .from(assessmentSessions)
        .where(
          and(
            eq(assessmentSessions.organizationId, organizationId),
            eq(assessmentSessions.status, 'created')
          )
        ),

      db.select({ count: count() })
        .from(assessmentSessions)
        .where(
          and(
            eq(assessmentSessions.organizationId, organizationId),
            eq(assessmentSessions.status, 'case_study_in_progress')
          )
        ),

      db.select({ count: count() })
        .from(assessmentSessions)
        .where(
          and(
            eq(assessmentSessions.organizationId, organizationId),
            eq(assessmentSessions.status, 'completed')
          )
        )
    ])

    return {
      total: totalCount[0]?.count || 0,
      created: createdCount[0]?.count || 0,
      inProgress: inProgressCount[0]?.count || 0,
      completed: completedCount[0]?.count || 0
    }
  } catch (error) {
    console.error('Error getting assessment session stats:', error)
    return {
      total: 0,
      created: 0,
      inProgress: 0,
      completed: 0
    }
  }
}