import { redirect } from 'next/navigation'
import { resendInterviewEmail } from '../actions'

export async function POST(request: Request) {
  try {
    // Get form data from the request
    const formData = await request.formData()

    // Call the resend email action
    const result = await resendInterviewEmail(formData)

    if (result.success) {
      // Redirect to dashboard with success message
      redirect('/dashboard?email_sent=true')
    } else {
      // Redirect back with error
      redirect(`/dashboard?error=${encodeURIComponent(result.error)}`)
    }
  } catch (error) {
    console.error('Resend email route error:', error)
    // Redirect to dashboard with generic error
    redirect('/dashboard?error=email_send_failed')
  }
}