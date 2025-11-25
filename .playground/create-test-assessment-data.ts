import { db } from '../src/lib/db'
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

async function createTestAssessmentData() {
  console.log('🚀 Creating test Assessment Center data...')

  try {
    // Get existing organization (first one for testing)
    const existingOrg = await db.select().from(organizations).limit(1)
    if (!existingOrg[0]) {
      throw new Error('No organization found. Please create one first.')
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
      name: 'Test Assessment Center - Leadership Development',
      organizationId: orgId,
      status: 'created',
      createdAt: new Date(),
    })
    console.log('✅ Created assessment session:', sessionId)

    // 2. Create Assessment Participants (5 participants)
    const participants = [
      {
        id: nanoid(),
        sessionId,
        name: 'Nguyễn Văn An',
        email: 'nguyen.van.an@example.com',
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
        email: 'tran.thi.binh@example.com',
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
        email: 'le.minh.cuong@example.com',
        roleCode: 'C' as const,
        roleName: 'Chuyên viên Phân tích rủi ro',
        speakerLabel: 'Speaker 3',
        interviewToken: `interview_${nanoid(32)}`,
        tbeiStatus: 'pending' as const,
        hipoStatus: 'pending' as const,
        quizStatus: 'pending' as const,
      },
      {
        id: nanoid(),
        sessionId,
        name: 'Phạm Thu Dương',
        email: 'pham.thu.duong@example.com',
        roleCode: 'D' as const,
        roleName: 'Trưởng nhóm Ngân hàng số',
        speakerLabel: 'Speaker 4',
        interviewToken: `interview_${nanoid(32)}`,
        tbeiStatus: 'pending' as const,
        hipoStatus: 'pending' as const,
        quizStatus: 'pending' as const,
      },
      {
        id: nanoid(),
        sessionId,
        name: 'Hoàng Văn Em',
        email: 'hoang.van.em@example.com',
        roleCode: 'E' as const,
        roleName: 'Chuyên viên Quan hệ khách hàng',
        speakerLabel: 'Speaker 5',
        interviewToken: `interview_${nanoid(32)}`,
        tbeiStatus: 'pending' as const,
        hipoStatus: 'pending' as const,
        quizStatus: 'pending' as const,
      }
    ]

    await db.insert(assessmentParticipants).values(participants)
    console.log('✅ Created 5 participants')

    // 3. Create Case Study Transcripts (3 chunks of group discussion)
    const transcripts = [
      {
        id: nanoid(),
        sessionId,
        sequenceNumber: 1,
        rawTranscript: 'Speaker 1: Tôi nghĩ chúng ta nên tập trung vào chuyển đổi số để tăng hiệu quả hoạt động. Speaker 2: Đúng vậy, nhưng chúng ta cũng cần cân bằng với quản lý rủi ro. Speaker 3: Tôi đồng ý với cả hai quan điểm.',
        consolidatedTranscript: 'Nguyễn Văn An: Tôi nghĩ chúng ta nên tập trung vào chuyển đổi số để tăng hiệu quả hoạt động. Trần Thị Bình: Đúng vậy, nhưng chúng ta cũng cần cân bằng với quản lý rủi ro. Lê Minh Cường: Tôi đồng ý với cả hai quan điểm.',
        speakerMapping: JSON.stringify({
          "Speaker 1": participants[0].id,
          "Speaker 2": participants[1].id,
          "Speaker 3": participants[2].id
        }),
        durationSeconds: 60
      },
      {
        id: nanoid(),
        sessionId,
        sequenceNumber: 2,
        rawTranscript: 'Speaker 4: Về mặt đổi mới, tôi đề xuất chúng ta phát triển sản phẩm tài chính mới cho thị trường trẻ. Speaker 5: Ý tưởng hay! Chúng ta có thể kết hợp với fintech để tạo ra trải nghiệm khách hàng tốt hơn. Speaker 1: Cần đánh giá kỹ khả năng tài chính và rủi ro của dự án này.',
        consolidatedTranscript: 'Phạm Thu Dương: Về mặt đổi mới, tôi đề xuất chúng ta phát triển sản phẩm tài chính mới cho thị trường trẻ. Hoàng Văn Em: Ý tưởng hay! Chúng ta có thể kết hợp với fintech để tạo ra trải nghiệm khách hàng tốt hơn. Nguyễn Văn An: Cần đánh giá kỹ khả năng tài chính và rủi ro của dự án này.',
        speakerMapping: JSON.stringify({
          "Speaker 4": participants[3].id,
          "Speaker 5": participants[4].id,
          "Speaker 1": participants[0].id
        }),
        durationSeconds: 60
      },
      {
        id: nanoid(),
        sessionId,
        sequenceNumber: 3,
        rawTranscript: 'Speaker 2: Chúng ta cần xây dựng chiến lược rõ ràng. Speaker 3: Đồng ý, và cần có timeline cụ thể để thực hiện. Speaker 4: Tôi sẽ phụ trách phần công nghệ và số hóa. Speaker 5: Còn tôi sẽ đảm nhận phần quan hệ khách hàng.',
        consolidatedTranscript: 'Trần Thị Bình: Chúng ta cần xây dựng chiến lược rõ ràng. Lê Minh Cường: Đồng ý, và cần có timeline cụ thể để thực hiện. Phạm Thu Dương: Tôi sẽ phụ trách phần công nghệ và số hóa. Hoàng Văn Em: Còn tôi sẽ đảm nhận phần quan hệ khách hàng.',
        speakerMapping: JSON.stringify({
          "Speaker 2": participants[1].id,
          "Speaker 3": participants[2].id,
          "Speaker 4": participants[3].id,
          "Speaker 5": participants[4].id
        }),
        durationSeconds: 60
      }
    ]

    await db.insert(caseStudyTranscripts).values(transcripts)
    console.log('✅ Created 3 case study transcript chunks')

    // 4. Create Case Study Evaluations (competency scoring for each participant)
    const competencies = ['strategic_thinking', 'innovation', 'risk_balance', 'digital_transformation']
    const evaluations = []

    for (const participant of participants) {
      for (let i = 0; i < competencies.length; i++) {
        const transcriptId = transcripts[i % transcripts.length].id
        evaluations.push({
          id: nanoid(),
          sessionId,
          participantId: participant.id,
          transcriptId,
          competencyId: competencies[i],
          score: Math.floor(Math.random() * 3) + 3, // 3-5 score
          level: ['meets_requirements', 'exceeds_requirements'][Math.floor(Math.random() * 2)] as const,
          rationale: `${participant.name} đã thể hiện năng lực ${competencies[i]} tốt thông qua các phát biểu và đóng góp trong thảo luận nhóm.`,
          evidence: JSON.stringify([`Phát biểu của ${participant.name} về ${competencies[i]}`]),
          evidenceStrength: ['strong', 'moderate'][Math.floor(Math.random() * 2)] as const,
          countTowardOverall: true
        })
      }
    }

    await db.insert(caseStudyEvaluations).values(evaluations)
    console.log('✅ Created case study evaluations for all participants')

    // 5. Create TBEI Responses (behavioral interview)
    const tbeiData = []
    const competencyQuestions = [
      { competencyId: 'digital_transformation', questionId: 'DT_Q1' },
      { competencyId: 'talent_development', questionId: 'TD_Q1' }
    ]

    for (const participant of participants) {
      for (const comp of competencyQuestions) {
        tbeiData.push({
          id: nanoid(),
          participantId: participant.id,
          competencyId: comp.competencyId,
          questionId: comp.questionId,
          selectedQuestionIndex: 0,
          transcript: `Tôi là ${participant.name}. Về ${comp.competencyId}, tôi đã có kinh nghiệm thực hiện dự án chuyển đổi số tại ngân hàng. Chúng tôi đã áp dụng STAR method để phân tích tình huống, nhiệm vụ, hành động và kết quả đạt được. Dự án đã thành công với việc tăng 30% hiệu quả hoạt động.`,
          audioUrl: `https://storage.example.com/tbei/${participant.id}_${comp.questionId}.mp3`,
          durationSeconds: 180,
          evaluation: JSON.stringify({
            score: Math.floor(Math.random() * 2) + 4, // 4-5 score
            rationale: `${participant.name} đã trả lời rất tốt với cấu trúc STAR rõ ràng và kết quả cụ thể.`,
            star_analysis: {
              situation: 'Rõ ràng và cụ thể',
              task: 'Được mô tả chi tiết',
              action: 'Hành động phù hợp và hiệu quả',
              result: 'Kết quả đo lường được'
            },
            behavioral_indicators: [`Thể hiện năng lực ${comp.competencyId} tốt`, 'Có kinh nghiệm thực tế']
          })
        })
      }
    }

    await db.insert(tbeiResponses).values(tbeiData)
    console.log('✅ Created TBEI responses for all participants')

    // 6. Create HiPo Assessments (self-assessment questionnaire)
    const hipoData = []

    for (const participant of participants) {
      const responses = {}
      // Generate random responses for Q1-Q20 (scale 1-5)
      for (let i = 1; i <= 20; i++) {
        responses[`Q${i}`] = Math.floor(Math.random() * 2) + 4 // 4-5 responses
      }

      const abilityScore = Object.keys(responses).slice(0, 5).reduce((sum, q) => sum + responses[q], 0)
      const aspirationScore = Object.keys(responses).slice(5, 10).reduce((sum, q) => sum + responses[q], 0)
      const engagementScore = Object.keys(responses).slice(10, 15).reduce((sum, q) => sum + responses[q], 0)
      const integratedScore = Object.keys(responses).slice(15, 20).reduce((sum, q) => sum + responses[q], 0)

      hipoData.push({
        id: nanoid(),
        participantId: participant.id,
        abilityScore,
        aspirationScore,
        engagementScore,
        integratedScore,
        totalScore: abilityScore + aspirationScore + engagementScore + integratedScore,
        responses: JSON.stringify(responses),
        openResponse1: `Tôi có thể đóng góp vào tổ chức thông qua kinh nghiệm và kỹ năng chuyên môn của mình trong lĩnh vực ${participant.roleName}.`,
        openResponse2: `Mục tiêu nghề nghiệp của tôi là phát triển thành một lãnh đạo có thể tạo ra những đổi mới tích cực cho ngân hàng.`,
        abilityClassification: 'excellent' as const,
        aspirationClassification: 'good' as const,
        engagementClassification: 'excellent' as const,
        integratedClassification: 'good' as const,
        completedAt: new Date()
      })
    }

    await db.insert(hipoAssessments).values(hipoData)
    console.log('✅ Created HiPo assessments for all participants')

    // 7. Create Quiz Responses (knowledge assessment)
    const quizData = []

    for (const participant of participants) {
      // Generate quiz answers using the new 18 questions
      const answers = {
        'BR_001': ['A', 'B'][Math.floor(Math.random() * 2)],
        'BR_002': ['C', 'D'][Math.floor(Math.random() * 2)],
        'BR_003': ['A', 'B'][Math.floor(Math.random() * 2)],
        'PS_001': ['B', 'C'][Math.floor(Math.random() * 2)],
        'PS_002': ['A', 'B'][Math.floor(Math.random() * 2)],
        'PS_003': ['B', 'C'][Math.floor(Math.random() * 2)],
        'RM_001': ['C', 'D'][Math.floor(Math.random() * 2)],
        'RM_002': ['B', 'C'][Math.floor(Math.random() * 2)],
        'RM_003': ['C', 'D'][Math.floor(Math.random() * 2)],
        'CS_001': ['A', 'B'][Math.floor(Math.random() * 2)],
        'CS_002': ['B', 'C'][Math.floor(Math.random() * 2)],
        'CS_003': ['A', 'B'][Math.floor(Math.random() * 2)],
        'DB_001': ['A', 'B'][Math.floor(Math.random() * 2)],
        'DB_002': ['B', 'C'][Math.floor(Math.random() * 2)],
        'DB_003': ['A', 'B'][Math.floor(Math.random() * 2)],
        'DB_004': ['A', 'B'][Math.floor(Math.random() * 2)],
        'DB_005': ['B', 'C'][Math.floor(Math.random() * 2)],
        'EXTRA': ['A', 'B'][Math.floor(Math.random() * 2)] // 18th question
      }

      // Calculate score (correct answers based on the actual quiz)
      const correctAnswers = {
        'BR_001': 'B', 'BR_002': 'C', 'BR_003': 'A',
        'PS_001': 'C', 'PS_002': 'B', 'PS_003': 'C',
        'RM_001': 'C', 'RM_002': 'C', 'RM_003': 'D',
        'CS_001': 'B', 'CS_002': 'C', 'CS_003': 'A',
        'DB_001': 'B', 'DB_002': 'C', 'DB_003': 'B',
        'DB_004': 'A', 'DB_005': 'B', 'EXTRA': 'A'
      }

      const score = Object.keys(answers).reduce((correct, questionId) => {
        return correct + (answers[questionId] === correctAnswers[questionId] ? 1 : 0)
      }, 0)

      quizData.push({
        id: nanoid(),
        participantId: participant.id,
        answers: JSON.stringify(answers),
        score,
        totalQuestions: 18,
        timeSpentSeconds: Math.floor(Math.random() * 300) + 600, // 10-15 minutes
        completedAt: new Date()
      })
    }

    await db.insert(quizResponses).values(quizData)
    console.log('✅ Created quiz responses for all participants')

    console.log('🎉 Test Assessment Center data created successfully!')
    console.log('📊 Summary:')
    console.log(`   - Session ID: ${sessionId}`)
    console.log(`   - Participants: ${participants.length}`)
    console.log(`   - Transcripts: ${transcripts.length}`)
    console.log(`   - Evaluations: ${evaluations.length}`)
    console.log(`   - TBEI Responses: ${tbeiData.length}`)
    console.log(`   - HiPo Assessments: ${hipoData.length}`)
    console.log(`   - Quiz Responses: ${quizData.length}`)

    return {
      sessionId,
      participants,
      organizationId: orgId
    }

  } catch (error) {
    console.error('❌ Error creating test data:', error)
    throw error
  }
}

// Export for use
export { createTestAssessmentData }

// Run if called directly
if (require.main === module) {
  createTestAssessmentData()
    .then((result) => {
      console.log('✅ Test data creation completed:', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Test data creation failed:', error)
      process.exit(1)
    })
}