import OpenAI from 'openai'
import { db } from '@/lib/db'
import { tbeiResponses, assessmentParticipants } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Singleton OpenAI client with lazy initialization
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  return openaiClient
}

// TBEI Competency frameworks from specs
const COMPETENCY_FRAMEWORKS = {
  digital_transformation: {
    title: 'Chuyển đổi Số (Digital Transformation)',
    description: 'Phó GĐ hiểu chiến lược số, chọn đúng công nghệ, triển khai trong đơn vị',
    behavioralIndicators: [
      {
        code: 'HV1',
        description: 'Hiểu biết rõ về chương trình chuyển đổi số của NH và chuyển hóa vào mục tiêu, KH hành động của đơn vị/phòng ban phụ trách'
      },
      {
        code: 'HV2',
        description: 'Ứng dụng hiệu quả các công nghệ số, AI mới để lắng nghe, thấu hiểu khách hàng, nâng cao trải nghiệm và sự hài lòng của khách hàng'
      }
    ],
    scoringCriteria: {
      1: 'Ít phân biệt khi chọn công nghệ; có thể đầu tư quá nhiều vào xu hướng nhất thời hoặc bỏ qua cải tiến quan trọng',
      2: 'Bỏ lỡ cơ hội đảm bảo mọi người được đào tạo về cách sử dụng và giá trị của công nghệ',
      3: 'Xác định công nghệ có khả năng tạo tác động lâu dài; tránh đầu tư vào xu hướng hoặc lựa chọn kém khả thi',
      4: 'Thiết lập phương pháp đào tạo để đảm bảo mọi người hiểu và sử dụng công nghệ phù hợp',
      5: 'Thể hiện sự hiểu biết sâu sắc về công nghệ hỗ trợ mục tiêu nhóm; loại bỏ xu hướng nhất thời để tập trung vào công cụ mạnh mẽ và đổi mới'
    }
  },
  talent_development: {
    title: 'Phát triển Đội ngũ (Talent Development)',
    description: 'Nhận diện tiềm năng, kế cận, coaching, tạo cơ hội phát triển trong đơn vị',
    behavioralIndicators: [
      {
        code: 'HV1',
        description: 'Nhận diện được tiềm năng và khoảng trống năng lực của đội ngũ và đào tạo, phát triển cán bộ bằng đa dạng các phương pháp đào tạo'
      },
      {
        code: 'HV2',
        description: 'Chủ động trao đổi, tìm hiểu nhu cầu phát triển của các cán bộ, đặc biệt là cán bộ tiềm năng trong đơn vị/ phòng ban phụ trách để tạo điều kiện cho cán bộ phát huy thế mạnh và có cơ hội phát triển nghề nghiệp phù hợp'
      },
      {
        code: 'HV3',
        description: 'Khuyến khích và thực hiện trao quyền phù hợp trên cơ sở hiểu rõ năng lực của cán bộ và kiểm soát rủi ro'
      }
    ],
    scoringCriteria: {
      1: 'Ít nỗ lực xác định người kế nhiệm cho các vai trò quan trọng',
      2: 'Ít chú trọng đến phát triển con người; tập trung vào kết quả hàng ngày mà không tạo đủ cơ hội học tập',
      3: 'Xác định người kế nhiệm cho các vai trò quan trọng trong nhóm',
      4: 'Nhấn mạnh tầm quan trọng của việc học, khuyến khích mọi người phát triển kỹ năng mới và tạo cơ hội phát triển sự nghiệp',
      5: 'Hướng đến tương lai và xây dựng kế hoạch kế nhiệm dài hạn cho tất cả các vai trò quan trọng'
    }
  }
}

interface TbeiEvaluationResult {
  competencyId: string
  score: number
  level: 'needs_improvement' | 'meets_requirements' | 'exceeds_requirements'
  rationale: string
  behavioralIndicators: string[]
  starAnalysis: {
    situation: { present: boolean; quality: 'poor' | 'adequate' | 'good' | 'excellent' }
    task: { present: boolean; quality: 'poor' | 'adequate' | 'good' | 'excellent' }
    action: { present: boolean; quality: 'poor' | 'adequate' | 'good' | 'excellent' }
    result: { present: boolean; quality: 'poor' | 'adequate' | 'good' | 'excellent' }
  }
  evidence: string[]
  developmentSuggestions: string[]
}

/**
 * Evaluate a single TBEI response using AI analysis
 */
export async function evaluateTbeiResponse(
  responseId: string
): Promise<TbeiEvaluationResult> {
  try {
    // Get the TBEI response from database
    const response = await db
      .select()
      .from(tbeiResponses)
      .where(eq(tbeiResponses.id, responseId))
      .limit(1)

    if (!response[0]) {
      throw new Error(`TBEI response not found: ${responseId}`)
    }

    const tbeiResponse = response[0]
    const competency = COMPETENCY_FRAMEWORKS[tbeiResponse.competencyId as keyof typeof COMPETENCY_FRAMEWORKS]

    if (!competency) {
      throw new Error(`Invalid competency: ${tbeiResponse.competencyId}`)
    }

    // Prepare the evaluation prompt
    const prompt = `
You are an expert HR assessor evaluating a TBEI (Targeted Behavioral Event Interview) response for VietinBank's Assessment Center.

COMPETENCY BEING EVALUATED:
${competency.title}
Description: ${competency.description}

BEHAVIORAL INDICATORS:
${competency.behavioralIndicators.map(bi => `- ${bi.code}: ${bi.description}`).join('\n')}

SCORING CRITERIA (1-5 scale):
${Object.entries(competency.scoringCriteria).map(([score, criteria]) => `${score}: ${criteria}`).join('\n')}

CANDIDATE RESPONSE:
Question ID: ${tbeiResponse.questionId}
Selected Question Index: ${tbeiResponse.selectedQuestionIndex}
Transcript: ${tbeiResponse.transcript}
Duration: ${tbeiResponse.durationSeconds} seconds

STRUCTURED RESPONSE DATA:
${tbeiResponse.evaluation ? JSON.stringify(JSON.parse(tbeiResponse.evaluation).structuredResponse || {}, null, 2) : 'Not provided'}

Please evaluate this response and provide a JSON object with the following structure:
{
  "score": number (1-5),
  "level": "needs_improvement" | "meets_requirements" | "exceeds_requirements",
  "rationale": "Detailed explanation of the score",
  "behavioralIndicators": ["array of behavioral indicator codes that were demonstrated"],
  "starAnalysis": {
    "situation": {"present": boolean, "quality": "poor|adequate|good|excellent"},
    "task": {"present": boolean, "quality": "poor|adequate|good|excellent"},
    "action": {"present": boolean, "quality": "poor|adequate|good|excellent"},
    "result": {"present": boolean, "quality": "poor|adequate|good|excellent"}
  },
  "evidence": ["array of specific quotes or examples from the response"],
  "developmentSuggestions": ["array of specific suggestions for improvement"]
}

EVALUATION GUIDELINES:
1. Score 1-2: Needs Improvement - Weak examples, vague responses, missing STAR elements
2. Score 3: Meets Requirements - Adequate examples, some behavioral indicators present
3. Score 4-5: Exceeds Requirements - Strong examples, clear behavioral indicators, complete STAR format

Focus on:
- Specificity and concreteness of the example
- Presence and quality of STAR (Situation-Task-Action-Result) elements
- Demonstration of behavioral indicators
- Impact and results achieved
- Leadership and decision-making capabilities
`

    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert HR assessor specializing in competency-based interviews for banking leadership positions. Provide accurate, fair, and constructive evaluations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 1,
      response_format: { type: 'json_object' }
    })

    const evaluationText = completion.choices[0]?.message?.content
    if (!evaluationText) {
      throw new Error('No evaluation received from AI')
    }

    const evaluation: TbeiEvaluationResult = JSON.parse(evaluationText)

    // Add competencyId to the result
    evaluation.competencyId = tbeiResponse.competencyId

    // Update the TBEI response with the evaluation
    await db
      .update(tbeiResponses)
      .set({
        evaluation: JSON.stringify({
          ...JSON.parse(tbeiResponse.evaluation || '{}'),
          aiEvaluation: evaluation,
          evaluatedAt: new Date().toISOString()
        })
      })
      .where(eq(tbeiResponses.id, responseId))

    return evaluation

  } catch (error) {
    console.error('Error evaluating TBEI response:', error)
    throw error
  }
}

/**
 * Evaluate all TBEI responses for a participant
 */
export async function evaluateParticipantTbeiResponses(
  participantId: string
): Promise<TbeiEvaluationResult[]> {
  try {
    // Get all TBEI responses for the participant
    const responses = await db
      .select()
      .from(tbeiResponses)
      .where(eq(tbeiResponses.participantId, participantId))

    const evaluations: TbeiEvaluationResult[] = []

    for (const response of responses) {
      try {
        const evaluation = await evaluateTbeiResponse(response.id)
        evaluations.push(evaluation)
      } catch (error) {
        console.error(`Error evaluating response ${response.id}:`, error)
        // Continue with other responses even if one fails
      }
    }

    return evaluations

  } catch (error) {
    console.error('Error evaluating participant TBEI responses:', error)
    throw error
  }
}

/**
 * Calculate overall TBEI assessment score for a participant
 */
export async function calculateTbeiOverallScore(
  participantId: string
): Promise<{
  overallScore: number
  competencyScores: Record<string, number>
  evaluations: TbeiEvaluationResult[]
  recommendation: 'strong_candidate' | 'suitable_candidate' | 'needs_development'
}> {
  try {
    const evaluations = await evaluateParticipantTbeiResponses(participantId)

    if (evaluations.length === 0) {
      throw new Error('No TBEI evaluations found for participant')
    }

    // Calculate competency scores
    const competencyScores: Record<string, number> = {}
    evaluations.forEach(evaluation => {
      competencyScores[evaluation.competencyId] = evaluation.score
    })

    // Calculate overall score (average of competency scores)
    const scores = Object.values(competencyScores)
    const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length

    // Determine recommendation based on overall score
    let recommendation: 'strong_candidate' | 'suitable_candidate' | 'needs_development'
    if (overallScore >= 4.0) {
      recommendation = 'strong_candidate'
    } else if (overallScore >= 3.0) {
      recommendation = 'suitable_candidate'
    } else {
      recommendation = 'needs_development'
    }

    return {
      overallScore: Math.round(overallScore * 100) / 100, // Round to 2 decimal places
      competencyScores,
      evaluations,
      recommendation
    }

  } catch (error) {
    console.error('Error calculating TBEI overall score:', error)
    throw error
  }
}

/**
 * Get TBEI evaluation summary for dashboard display
 */
export async function getTbeiEvaluationSummary(participantId: string) {
  try {
    const participant = await db
      .select()
      .from(assessmentParticipants)
      .where(eq(assessmentParticipants.id, participantId))
      .limit(1)

    if (!participant[0]) {
      throw new Error('Participant not found')
    }

    const responses = await db
      .select()
      .from(tbeiResponses)
      .where(eq(tbeiResponses.participantId, participantId))

    const evaluatedResponses = responses.filter(r => {
      try {
        const evaluation = JSON.parse(r.evaluation || '{}')
        return evaluation.aiEvaluation !== undefined
      } catch {
        return false
      }
    })

    return {
      participant: participant[0],
      totalResponses: responses.length,
      evaluatedResponses: evaluatedResponses.length,
      responses: evaluatedResponses.map(r => ({
        id: r.id,
        competencyId: r.competencyId,
        questionId: r.questionId,
        evaluation: JSON.parse(r.evaluation || '{}').aiEvaluation
      }))
    }

  } catch (error) {
    console.error('Error getting TBEI evaluation summary:', error)
    throw error
  }
}