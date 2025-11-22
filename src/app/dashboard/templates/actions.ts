'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { jobTemplates, interviewQuestions } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// Validation schemas
const createTemplateSchema = z.object({
  title: z.string().min(2, 'Tên template phải có ít nhất 2 ký tự'),
  description: z.string().optional(),
  interviewDuration: z.coerce.number().min(5, 'Thời gian phỏng vấn ít nhất 5 phút').max(180, 'Thời gian phỏng vấn tối đa 180 phút'),
  impressionWeight: z.coerce.number().min(0, 'Tỷ trọng phải >= 0').max(100, 'Tỷ trọng phải <= 100'),
  taskPerformanceWeight: z.coerce.number().min(0, 'Tỷ trọng phải >= 0').max(100, 'Tỷ trọng phải <= 100'),
  logicalThinkingWeight: z.coerce.number().min(0, 'Tỷ trọng phải >= 0').max(100, 'Tỷ trọng phải <= 100'),
  researchAbilityWeight: z.coerce.number().min(0, 'Tỷ trọng phải >= 0').max(100, 'Tỷ trọng phải <= 100'),
  communicationWeight: z.coerce.number().min(0, 'Tỷ trọng phải >= 0').max(100, 'Tỷ trọng phải <= 100'),
}).refine(
  (data) => {
    const total = data.impressionWeight + data.taskPerformanceWeight +
                  data.logicalThinkingWeight + data.researchAbilityWeight + data.communicationWeight;
    return total === 100;
  },
  {
    message: 'Tổng tỷ trọng các tiêu chí phải bằng 100%',
    path: ['impressionWeight']
  }
)

const updateTemplateSchema = z.object({
  id: z.string().min(1, 'ID không hợp lệ'),
  title: z.string().min(2, 'Tên template phải có ít nhất 2 ký tự'),
  description: z.string().optional(),
  interviewDuration: z.coerce.number().min(5, 'Thời gian phỏng vấn ít nhất 5 phút').max(180, 'Thời gian phỏng vấn tối đa 180 phút'),
  impressionWeight: z.coerce.number().min(0, 'Tỷ trọng phải >= 0').max(100, 'Tỷ trọng phải <= 100'),
  taskPerformanceWeight: z.coerce.number().min(0, 'Tỷ trọng phải >= 0').max(100, 'Tỷ trọng phải <= 100'),
  logicalThinkingWeight: z.coerce.number().min(0, 'Tỷ trọng phải >= 0').max(100, 'Tỷ trọng phải <= 100'),
  researchAbilityWeight: z.coerce.number().min(0, 'Tỷ trọng phải >= 0').max(100, 'Tỷ trọng phải <= 100'),
  communicationWeight: z.coerce.number().min(0, 'Tỷ trọng phải >= 0').max(100, 'Tỷ trọng phải <= 100'),
  isActive: z.coerce.boolean().optional(),
}).refine(
  (data) => {
    const total = data.impressionWeight + data.taskPerformanceWeight +
                  data.logicalThinkingWeight + data.researchAbilityWeight + data.communicationWeight;
    return total === 100;
  },
  {
    message: 'Tổng tỷ trọng các tiêu chí phải bằng 100%',
    path: ['impressionWeight']
  }
)

const deleteTemplateSchema = z.object({
  id: z.string().min(1, 'ID không hợp lệ'),
})

export type TemplateResult =
  | { success: true; message: string; templateId?: string }
  | { success: false; error: string; field?: string }

/**
 * Create a new job template
 */
export async function createTemplate(formData: FormData): Promise<TemplateResult> {
  try {
    // Require authentication
    const user = await requireAuth()

    const result = createTemplateSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      interviewDuration: formData.get('interviewDuration'),
      impressionWeight: formData.get('impressionWeight'),
      taskPerformanceWeight: formData.get('taskPerformanceWeight'),
      logicalThinkingWeight: formData.get('logicalThinkingWeight'),
      researchAbilityWeight: formData.get('researchAbilityWeight'),
      communicationWeight: formData.get('communicationWeight'),
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

    // Create the template
    const template = await db
      .insert(jobTemplates)
      .values({
        organizationId: user.organizationId,
        title: data.title,
        description: data.description,
        interviewDuration: data.interviewDuration,
        impressionWeight: data.impressionWeight,
        taskPerformanceWeight: data.taskPerformanceWeight,
        logicalThinkingWeight: data.logicalThinkingWeight,
        researchAbilityWeight: data.researchAbilityWeight,
        communicationWeight: data.communicationWeight,
        createdBy: user.id,
      })
      .returning()

    if (!template[0]) {
      return {
        success: false,
        error: 'Không thể tạo template. Vui lòng thử lại.'
      }
    }

    return {
      success: true,
      message: `Template "${data.title}" đã được tạo thành công`,
      templateId: template[0].id
    }

  } catch (error) {
    console.error('Error creating template:', error)
    return {
      success: false,
      error: 'Đã xảy ra lỗi khi tạo template. Vui lòng thử lại.'
    }
  }
}

/**
 * Update an existing job template
 */
export async function updateTemplate(formData: FormData): Promise<TemplateResult> {
  try {
    // Require authentication
    const user = await requireAuth()

    const result = updateTemplateSchema.safeParse({
      id: formData.get('id'),
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      interviewDuration: formData.get('interviewDuration'),
      impressionWeight: formData.get('impressionWeight'),
      taskPerformanceWeight: formData.get('taskPerformanceWeight'),
      logicalThinkingWeight: formData.get('logicalThinkingWeight'),
      researchAbilityWeight: formData.get('researchAbilityWeight'),
      communicationWeight: formData.get('communicationWeight'),
      isActive: formData.get('isActive') === 'true',
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

    // Check if template exists and belongs to user's organization
    const existingTemplate = await db
      .select()
      .from(jobTemplates)
      .where(
        and(
          eq(jobTemplates.id, data.id),
          eq(jobTemplates.organizationId, user.organizationId)
        )
      )
      .limit(1)

    if (!existingTemplate[0]) {
      return {
        success: false,
        error: 'Template không tồn tại hoặc bạn không có quyền truy cập'
      }
    }

    // Update the template
    const updatedTemplate = await db
      .update(jobTemplates)
      .set({
        title: data.title,
        description: data.description,
        interviewDuration: data.interviewDuration,
        impressionWeight: data.impressionWeight,
        taskPerformanceWeight: data.taskPerformanceWeight,
        logicalThinkingWeight: data.logicalThinkingWeight,
        researchAbilityWeight: data.researchAbilityWeight,
        communicationWeight: data.communicationWeight,
        isActive: data.isActive,
      })
      .where(
        and(
          eq(jobTemplates.id, data.id),
          eq(jobTemplates.organizationId, user.organizationId)
        )
      )
      .returning()

    if (!updatedTemplate[0]) {
      return {
        success: false,
        error: 'Không thể cập nhật template. Vui lòng thử lại.'
      }
    }

    return {
      success: true,
      message: `Template "${data.title}" đã được cập nhật thành công`,
      templateId: data.id
    }

  } catch (error) {
    console.error('Error updating template:', error)
    return {
      success: false,
      error: 'Đã xảy ra lỗi khi cập nhật template. Vui lòng thử lại.'
    }
  }
}

/**
 * Delete a job template
 */
export async function deleteTemplate(formData: FormData): Promise<TemplateResult> {
  try {
    // Require authentication
    const user = await requireAuth()

    const result = deleteTemplateSchema.safeParse({
      id: formData.get('id'),
    })

    if (!result.success) {
      return {
        success: false,
        error: 'ID template không hợp lệ'
      }
    }

    const { id } = result.data

    // Check if template exists and belongs to user's organization
    const existingTemplate = await db
      .select()
      .from(jobTemplates)
      .where(
        and(
          eq(jobTemplates.id, id),
          eq(jobTemplates.organizationId, user.organizationId)
        )
      )
      .limit(1)

    if (!existingTemplate[0]) {
      return {
        success: false,
        error: 'Template không tồn tại hoặc bạn không có quyền truy cập'
      }
    }

    // Delete the template (cascade will handle related questions)
    const deletedTemplate = await db
      .delete(jobTemplates)
      .where(
        and(
          eq(jobTemplates.id, id),
          eq(jobTemplates.organizationId, user.organizationId)
        )
      )
      .returning()

    if (!deletedTemplate[0]) {
      return {
        success: false,
        error: 'Không thể xóa template. Vui lòng thử lại.'
      }
    }

    return {
      success: true,
      message: `Template "${existingTemplate[0].title}" đã được xóa thành công`
    }

  } catch (error) {
    console.error('Error deleting template:', error)
    return {
      success: false,
      error: 'Đã xảy ra lỗi khi xóa template. Vui lòng thử lại.'
    }
  }
}

/**
 * Duplicate a job template
 */
export async function duplicateTemplate(formData: FormData): Promise<TemplateResult> {
  try {
    // Require authentication
    const user = await requireAuth()

    const templateId = formData.get('id') as string

    if (!templateId) {
      return {
        success: false,
        error: 'ID template không hợp lệ'
      }
    }

    // Get the original template
    const originalTemplate = await db
      .select()
      .from(jobTemplates)
      .where(
        and(
          eq(jobTemplates.id, templateId),
          eq(jobTemplates.organizationId, user.organizationId)
        )
      )
      .limit(1)

    if (!originalTemplate[0]) {
      return {
        success: false,
        error: 'Template không tồn tại hoặc bạn không có quyền truy cập'
      }
    }

    const original = originalTemplate[0]

    // Create duplicate template
    const duplicateTemplate = await db
      .insert(jobTemplates)
      .values({
        organizationId: user.organizationId,
        title: `${original.title} (Copy)`,
        description: original.description,
        interviewDuration: original.interviewDuration,
        impressionWeight: original.impressionWeight,
        taskPerformanceWeight: original.taskPerformanceWeight,
        logicalThinkingWeight: original.logicalThinkingWeight,
        researchAbilityWeight: original.researchAbilityWeight,
        communicationWeight: original.communicationWeight,
        createdBy: user.id,
      })
      .returning()

    if (!duplicateTemplate[0]) {
      return {
        success: false,
        error: 'Không thể tạo bản sao template. Vui lòng thử lại.'
      }
    }

    // Get and duplicate related questions
    const originalQuestions = await db
      .select()
      .from(interviewQuestions)
      .where(eq(interviewQuestions.jobTemplateId, templateId))

    if (originalQuestions.length > 0) {
      await db
        .insert(interviewQuestions)
        .values(
          originalQuestions.map((question) => ({
            jobTemplateId: duplicateTemplate[0].id,
            questionText: question.questionText,
            questionTextEn: question.questionTextEn,
            questionOrder: question.questionOrder,
            timeLimit: question.timeLimit,
            category: question.category,
            isRequired: question.isRequired,
          }))
        )
    }

    return {
      success: true,
      message: `Đã tạo bản sao template "${original.title}" thành công`,
      templateId: duplicateTemplate[0].id
    }

  } catch (error) {
    console.error('Error duplicating template:', error)
    return {
      success: false,
      error: 'Đã xảy ra lỗi khi tạo bản sao template. Vui lòng thử lại.'
    }
  }
}