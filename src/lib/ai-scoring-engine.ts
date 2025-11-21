/**
 * AI Scoring Engine - Evaluates interview responses using Vietnamese framework
 */

import OpenAI from 'openai'
import { type Recommendation } from '@/db/schema'
import {
  loadEvaluationFramework,
  getAllEvaluationDimensions,
  calculateOverallScore,
  generateEvaluationPrompt,
  generateOverallSummaryPrompt,
  validateDimensionScores,
  getScoreLevel
} from './evaluation-framework'

export interface DimensionScore {
  dimension: string
  score: number
  level: string
  analysis: string
  strengths: string[]
  areas_for_improvement: string[]
  reasoning: string
}

export interface InterviewEvaluation {
  interview_id: string
  overall_score: number
  dimension_scores: DimensionScore[]
  overall_summary: string
  recommendation: Recommendation
  recommendation_reasoning: string
  key_strengths: string[]
  key_concerns: string[]
  next_steps: string[]
  processing_time_ms: number
  ai_model_used: string
  evaluation_timestamp: Date
}

export interface QuestionResponse {
  question_text: string
  response_transcript: string
  question_order: number
  response_duration?: number
}

export class AIScoringEngine {
  private openai: OpenAI
  private model: string

  constructor(apiKey?: string, model: string = 'gpt-4') {
    const key = apiKey || process.env.OPENAI_API_KEY
    if (!key) {
      throw new Error('OpenAI API key is required')
    }

    this.openai = new OpenAI({ apiKey: key })
    this.model = model
  }

  /**
   * Evaluate a complete interview
   */
  async evaluateInterview(
    interviewId: string,
    responses: QuestionResponse[]
  ): Promise<InterviewEvaluation> {
    const startTime = Date.now()

    try {
      console.log(`🧠 Starting AI evaluation for interview ${interviewId}...`)

      // Load evaluation framework
      const framework = loadEvaluationFramework()
      const dimensions = getAllEvaluationDimensions()

      // Combine all responses into a comprehensive transcript
      const fullTranscript = responses.map(r =>
        `Câu hỏi ${r.question_order}: ${r.question_text}\nTranh lời: ${r.response_transcript}`
      ).join('\n\n')

      console.log(`📋 Evaluating ${Object.keys(dimensions).length} dimensions...`)

      // Evaluate each dimension
      const dimensionResults: { [key: string]: DimensionScore } = {}

      for (const [dimensionKey, dimension] of Object.entries(dimensions)) {
        console.log(`🔍 Evaluating: ${dimension.name}...`)

        const dimensionScore = await this.evaluateDimension(
          dimensionKey,
          fullTranscript,
          responses
        )

        dimensionResults[dimensionKey] = dimensionScore
      }

      // Calculate overall score
      const dimensionScores = Object.fromEntries(
        Object.entries(dimensionResults).map(([key, result]) => [key, result.score])
      )

      const validation = validateDimensionScores(dimensionScores)
      if (!validation.isValid) {
        throw new Error(`Invalid dimension scores: ${validation.errors.join(', ')}`)
      }

      const overallScore = calculateOverallScore(dimensionScores)

      console.log(`📊 Overall score calculated: ${overallScore}/100`)

      // Generate overall summary and recommendation
      const overallSummary = await this.generateOverallSummary(
        dimensionResults,
        overallScore
      )

      const processingTime = Date.now() - startTime

      console.log(`✅ Interview evaluation completed in ${processingTime}ms`)

      return {
        interview_id: interviewId,
        overall_score: overallScore,
        dimension_scores: Object.values(dimensionResults),
        overall_summary: overallSummary.overall_summary,
        recommendation: overallSummary.recommendation,
        recommendation_reasoning: overallSummary.recommendation_reasoning,
        key_strengths: overallSummary.key_strengths,
        key_concerns: overallSummary.key_concerns,
        next_steps: overallSummary.next_steps,
        processing_time_ms: processingTime,
        ai_model_used: this.model,
        evaluation_timestamp: new Date()
      }

    } catch (error) {
      console.error('❌ Interview evaluation failed:', error)
      throw new Error(`AI evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Evaluate a single dimension
   */
  private async evaluateDimension(
    dimensionKey: string,
    fullTranscript: string,
    responses: QuestionResponse[]
  ): Promise<DimensionScore> {
    try {
      // Find the most relevant response for this dimension (for now, use all)
      const combinedQuestions = responses.map(r => r.question_text).join(' | ')

      const prompt = generateEvaluationPrompt(
        dimensionKey,
        fullTranscript,
        combinedQuestions
      )

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Bạn là chuyên gia đánh giá phỏng vấn AI của VietinBank. Hãy đánh giá ứng viên một cách khách quan và chính xác theo tiêu chuẩn văn hóa Việt Nam. Trả lời bằng tiếng Việt và tuân thủ định dạng JSON được yêu cầu.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent evaluation
        max_tokens: 1000
      })

      const responseText = completion.choices[0]?.message?.content
      if (!responseText) {
        throw new Error('No response from AI model')
      }

      // Parse JSON response
      let evaluation
      try {
        evaluation = JSON.parse(responseText)
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          evaluation = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('Invalid JSON response from AI model')
        }
      }

      // Validate response structure
      if (!evaluation.score || !evaluation.analysis || !evaluation.level) {
        throw new Error('Incomplete evaluation response from AI model')
      }

      // Ensure score is within valid range
      const score = Math.max(0, Math.min(100, Number(evaluation.score)))
      const level = getScoreLevel(dimensionKey, score) || evaluation.level

      return {
        dimension: dimensionKey,
        score,
        level,
        analysis: evaluation.analysis,
        strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths : [],
        areas_for_improvement: Array.isArray(evaluation.areas_for_improvement)
          ? evaluation.areas_for_improvement : [],
        reasoning: evaluation.reasoning || evaluation.analysis
      }

    } catch (error) {
      console.error(`❌ Failed to evaluate dimension ${dimensionKey}:`, error)
      throw error
    }
  }

  /**
   * Generate overall summary and recommendation
   */
  private async generateOverallSummary(
    dimensionResults: { [key: string]: DimensionScore },
    overallScore: number
  ): Promise<{
    overall_summary: string
    recommendation: Recommendation
    recommendation_reasoning: string
    key_strengths: string[]
    key_concerns: string[]
    next_steps: string[]
  }> {
    try {
      const prompt = generateOverallSummaryPrompt(dimensionResults, overallScore)

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Bạn là chuyên gia tuyển dụng của VietinBank. Hãy tạo tóm tắt tổng thể và đưa ra khuyến nghị tuyển dụng dựa trên kết quả đánh giá chi tiết. Trả lời bằng tiếng Việt và tuân thủ định dạng JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      })

      const responseText = completion.choices[0]?.message?.content
      if (!responseText) {
        throw new Error('No response from AI model for overall summary')
      }

      // Parse JSON response
      let summary
      try {
        summary = JSON.parse(responseText)
      } catch (parseError) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          summary = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('Invalid JSON response for overall summary')
        }
      }

      // Validate and set defaults
      return {
        overall_summary: summary.overall_summary || 'Không có tóm tắt',
        recommendation: (['RECOMMEND', 'CONSIDER', 'NOT_RECOMMEND'] as const).includes(summary.recommendation)
          ? (summary.recommendation as Recommendation) : 'CONSIDER' as Recommendation,
        recommendation_reasoning: summary.recommendation_reasoning || 'Cần đánh giá thêm',
        key_strengths: Array.isArray(summary.key_strengths) ? summary.key_strengths : [],
        key_concerns: Array.isArray(summary.key_concerns) ? summary.key_concerns : [],
        next_steps: Array.isArray(summary.next_steps) ? summary.next_steps : []
      }

    } catch (error) {
      console.error('❌ Failed to generate overall summary:', error)

      // Return default summary if AI fails
      return {
        overall_summary: 'Đánh giá tự động gặp lỗi. Cần đánh giá thủ công.',
        recommendation: 'CONSIDER' as Recommendation,
        recommendation_reasoning: 'Cần đánh giá thủ công do lỗi hệ thống',
        key_strengths: [],
        key_concerns: ['Cần đánh giá thủ công'],
        next_steps: ['Liên hệ team IT để kiểm tra hệ thống đánh giá']
      }
    }
  }

  /**
   * Test the evaluation framework with sample data
   */
  async testEvaluation(): Promise<void> {
    console.log('🧪 Testing AI evaluation framework...')

    const sampleResponses: QuestionResponse[] = [
      {
        question_text: 'Hãy giới thiệu về bản thân và kinh nghiệm làm việc của bạn.',
        response_transcript: 'Xin chào, tôi tên là Nguyen Van A. Tôi có 3 năm kinh nghiệm làm việc trong lĩnh vực tài chính ngân hàng. Tôi đã từng làm việc tại ngân hàng ABC với vai trò chuyên viên tín dụng. Trong quá trình làm việc, tôi đã học được nhiều kiến thức về phân tích tài chính và đánh giá rủi ro.',
        question_order: 1,
        response_duration: 45
      }
    ]

    try {
      const result = await this.evaluateInterview('test-interview', sampleResponses)
      console.log('✅ Test evaluation completed:', {
        overall_score: result.overall_score,
        recommendation: result.recommendation,
        dimensions: result.dimension_scores.length,
        processing_time: result.processing_time_ms
      })
    } catch (error) {
      console.error('❌ Test evaluation failed:', error)
      throw error
    }
  }
}

/**
 * Create AI scoring engine instance with environment configuration
 */
export function createAIScoringEngine(): AIScoringEngine {
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL || 'gpt-4'

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }

  return new AIScoringEngine(apiKey, model)
}

/**
 * Utility function to format scores for database storage
 */
export function formatScoresForStorage(evaluation: InterviewEvaluation): {
  ai_scores: any
  overall_score: number
  recommendation: string
} {
  const aiScores = {
    dimension_scores: evaluation.dimension_scores,
    overall_summary: evaluation.overall_summary,
    key_strengths: evaluation.key_strengths,
    key_concerns: evaluation.key_concerns,
    next_steps: evaluation.next_steps,
    processing_time_ms: evaluation.processing_time_ms,
    ai_model_used: evaluation.ai_model_used,
    evaluation_timestamp: evaluation.evaluation_timestamp
  }

  return {
    ai_scores: aiScores, // Return as object, not string - Drizzle will handle JSON serialization
    overall_score: evaluation.overall_score,
    recommendation: evaluation.recommendation
  }
}