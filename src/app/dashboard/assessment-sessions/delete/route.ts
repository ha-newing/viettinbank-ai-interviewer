import { redirect } from 'next/navigation'
import { deleteAssessmentSession } from '../actions'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const result = await deleteAssessmentSession(formData)

    if (result.success) {
      redirect('/dashboard/assessment-sessions?deleted=true')
    } else {
      redirect(`/dashboard/assessment-sessions?error=${encodeURIComponent(result.error)}`)
    }
  } catch (error) {
    console.error('Error in delete route:', error)
    redirect('/dashboard/assessment-sessions?error=' + encodeURIComponent('Đã xảy ra lỗi khi xóa phiên đánh giá'))
  }
}