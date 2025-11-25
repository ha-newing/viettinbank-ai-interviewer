import { createAssessmentSession } from '../src/app/dashboard/assessment-sessions/actions'
import { db } from '../src/lib/db'
import { assessmentParticipants } from '../src/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Test the complete Assessment Center flow using actual application APIs
 * This simulates real user interactions through the dashboard and participant interfaces
 */
async function testAssessmentCenterFlow() {
  console.log('🎯 Testing Assessment Center complete flow using real application APIs...')

  try {
    // Step 1: Create Assessment Session using the actual server action
    console.log('\n1️⃣ Creating Assessment Session via Dashboard Form...')

    const formData = new FormData()
    formData.append('name', 'Test Assessment Center - VietinBank Leadership Program')
    formData.append('jobTemplateId', '') // No job template

    // Add 3 participants with different roles
    formData.append('participants[0][name]', 'Nguyễn Văn An')
    formData.append('participants[0][email]', 'nguyen.van.an@viettinbank.com.vn')
    formData.append('participants[0][roleCode]', 'A')
    formData.append('participants[0][roleName]', 'Corporate Banking')

    formData.append('participants[1][name]', 'Trần Thị Bình')
    formData.append('participants[1][email]', 'tran.thi.binh@viettinbank.com.vn')
    formData.append('participants[1][roleCode]', 'B')
    formData.append('participants[1][roleName]', 'Retail Banking')

    formData.append('participants[2][name]', 'Lê Minh Cường')
    formData.append('participants[2][email]', 'le.minh.cuong@viettinbank.com.vn')
    formData.append('participants[2][roleCode]', 'C')
    formData.append('participants[2][roleName]', 'Risk Management')

    const sessionResult = await createAssessmentSession(formData)

    if (!sessionResult.success) {
      throw new Error(`Session creation failed: ${sessionResult.error}`)
    }

    console.log('✅ Session created successfully:', sessionResult.message)
    console.log('📝 Session ID:', sessionResult.sessionId)

    // Step 2: Get participant details for API testing
    console.log('\n2️⃣ Retrieving participant details...')

    const participants = await db.select()
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.sessionId, sessionResult.sessionId!))

    if (participants.length === 0) {
      throw new Error('No participants found for the created session')
    }

    console.log('✅ Retrieved participants:', participants.map(p => ({ id: p.id, name: p.name, email: p.email, roleCode: p.roleCode })))

    // Return session and participant data for API testing
    return {
      success: true,
      sessionId: sessionResult.sessionId!,
      participants: participants.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        roleCode: p.roleCode,
        roleName: p.roleName,
        interviewToken: p.interviewToken
      })),
      apiTestUrls: {
        session: `https://viettinbank-ai-interviewer.fly.dev/dashboard/assessment-sessions/${sessionResult.sessionId}`,
        results: `https://viettinbank-ai-interviewer.fly.dev/api/assessment-sessions/${sessionResult.sessionId}/results`,
        updateStatus: 'https://viettinbank-ai-interviewer.fly.dev/api/case-study/update-status',
        caseStudyTranscript: 'https://viettinbank-ai-interviewer.fly.dev/api/case-study/transcript-chunk',
        tbeiSubmit: 'https://viettinbank-ai-interviewer.fly.dev/api/interview/tbei/submit-response',
        hipoSubmit: 'https://viettinbank-ai-interviewer.fly.dev/api/interview/hipo/submit-assessment',
        quizSubmit: 'https://viettinbank-ai-interviewer.fly.dev/api/interview/quiz/submit-answers'
      }
    }

  } catch (error) {
    console.error('❌ Error in assessment center flow test:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Export for use
export { testAssessmentCenterFlow }

// Run if called directly
if (require.main === module) {
  testAssessmentCenterFlow()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 Assessment Center session created successfully!')
        console.log('📊 Ready for API testing with:')
        console.log('   - Session ID:', result.sessionId)
        console.log('   - Participants:', result.participants.length)
        console.log('\n🔗 Test URLs:')
        Object.entries(result.apiTestUrls).forEach(([name, url]) => {
          console.log(`   - ${name}: ${url}`)
        })
        console.log('\n💡 Next steps:')
        console.log('   1. Test Case Study workflow APIs')
        console.log('   2. Test TBEI submission API')
        console.log('   3. Test HiPo assessment API')
        console.log('   4. Test Knowledge Quiz API')
        console.log('   5. Test Results aggregation API')
      } else {
        console.log('\n❌ Assessment Center flow test failed:', result.error)
      }
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('❌ Critical error:', error)
      process.exit(1)
    })
}