import { redirect } from 'next/navigation'
import { deleteTemplate } from '../actions'

export async function POST(request: Request) {
  try {
    // Get form data from the request
    const formData = await request.formData()

    // Call the delete action
    const result = await deleteTemplate(formData)

    if (result.success) {
      // Redirect to templates list on success
      redirect('/dashboard/templates?deleted=true')
    } else {
      // Redirect back with error
      const templateId = formData.get('id')
      redirect(`/dashboard/templates/${templateId}?error=${encodeURIComponent(result.error)}`)
    }
  } catch (error) {
    console.error('Delete route error:', error)
    // Redirect to templates list with generic error
    redirect('/dashboard/templates?error=delete_failed')
  }
}