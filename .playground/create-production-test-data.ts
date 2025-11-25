import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import {
  organizations,
  users,
  assessmentSessions,
  assessmentParticipants,
  caseStudyTranscripts,
  caseStudyEvaluations,
  tbeiResponses,
  hipoAssessments,
  quizResponses
} from '../src/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

// Connect to production database
// This will create test data directly in production for API testing
async function createProductionTestData() {
  console.log('🚀 Creating test data directly in production...')

  try {
    // Connect to production SQLite database
    // Note: This assumes the production DB is accessible as a file
    const sqliteDb = new Database('./data/app.db') // Adjust path as needed
    const db = drizzle(sqliteDb)

    console.log('📊 Connected to production database')

    // Get existing organization (first one for testing)
    const existingOrg = await db.select().from(organizations).limit(1)
    if (!existingOrg[0]) {
      throw new Error('No organization found in production.')
    }

    const orgId = existingOrg[0].id
    console.log('📋 Using organization:', existingOrg[0].name, `(${orgId})`)

    // Get existing user for this organization
    const existingUser = await db.select().from(users).where(eq(users.organizationId, orgId)).limit(1)
    if (!existingUser[0]) {
      throw new Error('No user found for this organization.')
    }

    const userId = existingUser[0].id
    console.log('👤 Using user:', existingUser[0].email, `(${userId})`)

    // 1. Create Assessment Session
    const sessionId = nanoid()
    await db.insert(assessmentSessions).values({
      id: sessionId,
      name: 'API Test Assessment Center - VietinBank Leadership',
      organizationId: orgId,
      status: 'created',
      createdAt: new Date(),
    })
    console.log('✅ Created assessment session:', sessionId)

    // 2. Create Assessment Participants
    const participants = [
      {
        id: nanoid(),
        sessionId,
        name: 'Nguyễn Văn An',
        email: 'nguyen.van.an@test.viettinbank.com',
        roleCode: 'A' as const,
        roleName: 'Trưởng phòng Tín dụng',
        speakerLabel: 'Speaker 1',
        interviewToken: `interview_${nanoid(32)}`,
        tbeiStatus: 'pending' as const,
        hipoStatus: 'pending' as const,
        quizStatus: 'pending' as const,
      },
      {
        id: nanoid(),
        sessionId,
        name: 'Trần Thị Bình',
        email: 'tran.thi.binh@test.viettinbank.com',
        roleCode: 'B' as const,
        roleName: 'Phó phòng Khách hàng doanh nghiệp',
        speakerLabel: 'Speaker 2',
        interviewToken: `interview_${nanoid(32)}`,
        tbeiStatus: 'pending' as const,
        hipoStatus: 'pending' as const,
        quizStatus: 'pending' as const,
      },
      {
        id: nanoid(),
        sessionId,
        name: 'Lê Minh Cường',
        email: 'le.minh.cuong@test.viettinbank.com',
        roleCode: 'C' as const,
        roleName: 'Chuyên viên Phân tích rủi ro',
        speakerLabel: 'Speaker 3',
        interviewToken: `interview_${nanoid(32)}`,
        tbeiStatus: 'pending' as const,
        hipoStatus: 'pending' as const,
        quizStatus: 'pending' as const,
      }
    ]

    await db.insert(assessmentParticipants).values(participants)
    console.log('✅ Created 3 participants')

    console.log('🎉 Production test data created successfully!')
    console.log('📊 Details:')
    console.log(`   - Session ID: ${sessionId}`)
    console.log(`   - Participants: ${participants.length}`)
    console.log(`   - Organization: ${existingOrg[0].name}`)
    console.log('🔗 Test URLs:')
    console.log(`   - Session: https://viettinbank-ai-interviewer.fly.dev/dashboard/assessment-sessions/${sessionId}`)
    console.log(`   - Results API: https://viettinbank-ai-interviewer.fly.dev/api/assessment-sessions/${sessionId}/results`)

    // Close database connection
    sqliteDb.close()

    return {
      sessionId,
      participants,
      organizationId: orgId
    }

  } catch (error) {
    console.error('❌ Error creating production test data:', error)
    throw error
  }
}

// Export for use
export { createProductionTestData }

// Run if called directly
if (require.main === module) {
  createProductionTestData()
    .then((result) => {
      console.log('✅ Production test data creation completed:', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Production test data creation failed:', error)
      process.exit(1)
    })
}