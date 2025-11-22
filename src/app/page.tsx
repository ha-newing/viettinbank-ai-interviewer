import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic'

export default async function Home() {
  // Check if user is already authenticated
  const user = await getCurrentUser()

  if (user) {
    // User is authenticated, redirect to dashboard
    redirect('/dashboard')
  } else {
    // User is not authenticated, redirect to login
    redirect('/auth/login')
  }
}