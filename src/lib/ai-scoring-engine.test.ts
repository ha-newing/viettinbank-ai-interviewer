/**
 * Unit tests for AI scoring engine
 */

import { AIScoringEngine, createAIScoringEngine, formatScoresForStorage } from './ai-scoring-engine'
import { mockOpenAIAPI, mockOpenAISummaryResponse, setupCommonMocks } from '@/test/mocks'
import { createAIEvaluationResult } from '@/test/factories'

// Mock the OpenAI module
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 75,
                level: 'Good',
                analysis: 'Test analysis',
                strengths: ['Good communication'],
                areas_for_improvement: ['Technical skills'],
                reasoning: 'Based on response quality'
              })
            }
          }]
        })
      }
    }
  }))
})

// Mock the evaluation framework
jest.mock('./evaluation-framework', () => ({
  loadEvaluationFramework: jest.fn().mockReturnValue({
    name: 'VietinBank AI Interview Evaluation Framework',
    version: '1.0.0'
  }),
  getAllEvaluationDimensions: jest.fn().mockReturnValue({
    impression: {
      name: 'Tạo Ấn Tượng',
      weight: 20,
      description: 'Khả năng tạo ấn tượng tích cực'
    },
    taskPerformance: {
      name: 'Hiệu Suất Nhiệm Vụ',
      weight: 25,
      description: 'Hiệu suất thực hiện nhiệm vụ'
    },
    logicalThinking: {
      name: 'Tư Duy Logic',
      weight: 20,
      description: 'Khả năng tư duy logic và phân tích'
    },
    researchAbility: {
      name: 'Khả Năng Nghiên Cứu',
      weight: 15,
      description: 'Khả năng nghiên cứu và học hỏi'
    },
    communication: {
      name: 'Giao Tiếp',
      weight: 20,
      description: 'Kỹ năng giao tiếp'
    }
  }),
  calculateOverallScore: jest.fn().mockReturnValue(78),
  generateEvaluationPrompt: jest.fn().mockReturnValue('Test evaluation prompt'),
  generateOverallSummaryPrompt: jest.fn().mockReturnValue('Test summary prompt'),
  validateDimensionScores: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  getScoreLevel: jest.fn().mockImplementation((dimension, score) => {
    if (score >= 80) return 'Excellent'
    if (score >= 70) return 'Good'
    if (score >= 60) return 'Average'
    return 'Poor'
  })
}))

describe('AIScoringEngine', () => {
  let mocks: ReturnType<typeof setupCommonMocks>

  beforeEach(() => {
    mocks = setupCommonMocks()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with API key', () => {
      const engine = new AIScoringEngine('test-api-key')
      expect(engine).toBeInstanceOf(AIScoringEngine)
    })

    it('should use environment API key when not provided', () => {
      process.env.OPENAI_API_KEY = 'env-api-key'
      const engine = new AIScoringEngine()
      expect(engine).toBeInstanceOf(AIScoringEngine)
    })

    it('should throw error when no API key available', () => {
      delete process.env.OPENAI_API_KEY
      expect(() => new AIScoringEngine()).toThrow('OpenAI API key is required')
    })

    it('should default to GPT-4 model', () => {
      const engine = new AIScoringEngine('test-key')
      expect(engine).toBeInstanceOf(AIScoringEngine)
    })

    it('should accept custom model', () => {
      const engine = new AIScoringEngine('test-key', 'gpt-3.5-turbo')
      expect(engine).toBeInstanceOf(AIScoringEngine)
    })
  })

  describe('evaluateInterview', () => {
    let engine: AIScoringEngine
    const mockResponses = [
      {
        question_text: 'Hãy giới thiệu về bản thân.',
        response_transcript: 'Xin chào, tôi tên là Nguyễn Văn A. Tôi có 3 năm kinh nghiệm trong ngành tài chính.',
        question_order: 1,
        response_duration: 45
      },
      {
        question_text: 'Kể về một dự án thành công.',
        response_transcript: 'Tôi đã tham gia dự án nâng cấp hệ thống core banking tại ngân hàng ABC.',
        question_order: 2,
        response_duration: 60
      }
    ]

    beforeEach(() => {
      engine = new AIScoringEngine('test-key')

      // Mock OpenAI responses
      const mockOpenAI = mocks.openAI
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 85,
                level: 'Excellent',
                analysis: 'Ứng viên thể hiện tự tin và chuyên nghiệp.',
                strengths: ['Tự tin', 'Kinh nghiệm tốt'],
                areas_for_improvement: ['Cải thiện ngôn ngữ cơ thể'],
                reasoning: 'Đánh giá dựa trên cách trình bày.'
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 75,
                level: 'Good',
                analysis: 'Ứng viên có kinh nghiệm thực tế tốt.',
                strengths: ['Kinh nghiệm dự án', 'Hiểu biết kỹ thuật'],
                areas_for_improvement: ['Thêm số liệu cụ thể'],
                reasoning: 'Có ví dụ cụ thể nhưng thiếu metrics.'
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 80,
                level: 'Good',
                analysis: 'Tư duy có hệ thống.',
                strengths: ['Suy nghĩ logic', 'Phân tích tốt'],
                areas_for_improvement: ['Cải thiện tốc độ phản ứng'],
                reasoning: 'Phương pháp tiếp cận có logic.'
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 70,
                level: 'Good',
                analysis: 'Thể hiện khả năng tìm hiểu.',
                strengths: ['Chủ động học hỏi', 'Tìm hiểu sâu'],
                areas_for_improvement: ['Mở rộng nguồn thông tin'],
                reasoning: 'Có thái độ học hỏi tích cực.'
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 82,
                level: 'Excellent',
                analysis: 'Giao tiếp rõ ràng và hiệu quả.',
                strengths: ['Ngôn ngữ rõ ràng', 'Lắng nghe tốt'],
                areas_for_improvement: ['Cải thiện kỹ năng thuyết trình'],
                reasoning: 'Giao tiếp hiệu quả trong tiếng Việt.'
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: mockOpenAISummaryResponse()
            }
          }]
        })
    })

    it('should evaluate complete interview successfully', async () => {
      const result = await engine.evaluateInterview('test-interview-id', mockResponses)

      expect(result).toMatchObject({
        interview_id: 'test-interview-id',
        overall_score: 78,
        recommendation: 'CONSIDER',
        ai_model_used: 'gpt-4'
      })

      expect(result.dimension_scores).toHaveLength(5)
      expect(result.key_strengths).toBeInstanceOf(Array)
      expect(result.key_concerns).toBeInstanceOf(Array)
      expect(result.next_steps).toBeInstanceOf(Array)
      expect(result.processing_time_ms).toBeGreaterThan(0)
      expect(result.evaluation_timestamp).toBeInstanceOf(Date)
    })

    it('should handle empty responses gracefully', async () => {
      const emptyResponses: any[] = []

      await expect(
        engine.evaluateInterview('test-interview-id', emptyResponses)
      ).resolves.toBeDefined()
    })

    it('should handle single response', async () => {
      const singleResponse = [mockResponses[0]]

      const result = await engine.evaluateInterview('test-interview-id', singleResponse)

      expect(result).toMatchObject({
        interview_id: 'test-interview-id',
        overall_score: 78
      })
    })

    it('should handle AI API errors gracefully', async () => {
      const mockOpenAI = mocks.openAI
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'))

      await expect(
        engine.evaluateInterview('test-interview-id', mockResponses)
      ).rejects.toThrow('AI evaluation failed: API Error')
    })

    it('should handle invalid JSON responses from AI', async () => {
      const mockOpenAI = mocks.openAI
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      })

      await expect(
        engine.evaluateInterview('test-interview-id', mockResponses)
      ).rejects.toThrow('AI evaluation failed')
    })

    it('should validate dimension scores', async () => {
      // Mock validation failure
      const evaluationFramework = await import('./evaluation-framework')
      ;(evaluationFramework.validateDimensionScores as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Score out of range']
      })

      await expect(
        engine.evaluateInterview('test-interview-id', mockResponses)
      ).rejects.toThrow('Invalid dimension scores: Score out of range')
    })

    it('should ensure scores are within valid range', async () => {
      const mockOpenAI = mocks.openAI
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              score: 150, // Invalid score > 100
              level: 'Excellent',
              analysis: 'Test analysis',
              strengths: [],
              areas_for_improvement: [],
              reasoning: 'Test reasoning'
            })
          }
        }]
      })

      const result = await engine.evaluateInterview('test-interview-id', mockResponses)

      // Score should be capped at 100
      result.dimension_scores.forEach(dimension => {
        expect(dimension.score).toBeLessThanOrEqual(100)
        expect(dimension.score).toBeGreaterThanOrEqual(0)
      })
    })

    it('should combine multiple question responses into transcript', async () => {
      const evaluationFramework = await import('./evaluation-framework')
      const generatePromptSpy = evaluationFramework.generateEvaluationPrompt as jest.Mock

      await engine.evaluateInterview('test-interview-id', mockResponses)

      // Should call generateEvaluationPrompt with combined transcript
      expect(generatePromptSpy).toHaveBeenCalled()
      const callArgs = generatePromptSpy.mock.calls[0]
      const transcript = callArgs[1]

      expect(transcript).toContain('Câu hỏi 1')
      expect(transcript).toContain('Câu hỏi 2')
      expect(transcript).toContain('Nguyễn Văn A')
      expect(transcript).toContain('dự án nâng cấp hệ thống')
    })
  })

  describe('testEvaluation', () => {
    let engine: AIScoringEngine

    beforeEach(() => {
      engine = new AIScoringEngine('test-key')
    })

    it('should run test evaluation successfully', async () => {
      await expect(engine.testEvaluation()).resolves.toBeUndefined()
    })

    it('should handle test evaluation errors', async () => {
      const mockOpenAI = mocks.openAI
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Test API Error'))

      await expect(engine.testEvaluation()).rejects.toThrow('Test API Error')
    })
  })

  describe('createAIScoringEngine', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-env-key'
      process.env.OPENAI_MODEL = 'gpt-3.5-turbo'
    })

    it('should create engine with environment configuration', () => {
      const engine = createAIScoringEngine()
      expect(engine).toBeInstanceOf(AIScoringEngine)
    })

    it('should use default model when not specified', () => {
      delete process.env.OPENAI_MODEL
      const engine = createAIScoringEngine()
      expect(engine).toBeInstanceOf(AIScoringEngine)
    })

    it('should throw error when API key not in environment', () => {
      delete process.env.OPENAI_API_KEY
      expect(() => createAIScoringEngine()).toThrow('OPENAI_API_KEY environment variable is required')
    })
  })

  describe('formatScoresForStorage', () => {
    it('should format evaluation result for database storage', () => {
      const evaluation = createAIEvaluationResult({
        overall_score: 85,
        recommendation: 'RECOMMEND'
      })

      const formatted = formatScoresForStorage(evaluation)

      expect(formatted).toMatchObject({
        overall_score: 85,
        recommendation: 'RECOMMEND'
      })

      expect(formatted.ai_scores).toMatchObject({
        dimension_scores: evaluation.dimension_scores,
        overall_summary: evaluation.overall_summary,
        key_strengths: evaluation.key_strengths,
        key_concerns: evaluation.key_concerns,
        next_steps: evaluation.next_steps,
        processing_time_ms: evaluation.processing_time_ms,
        ai_model_used: evaluation.ai_model_used,
        evaluation_timestamp: evaluation.evaluation_timestamp
      })
    })

    it('should handle all recommendation types', () => {
      const recommendations = ['RECOMMEND', 'CONSIDER', 'NOT_RECOMMEND'] as const

      recommendations.forEach(recommendation => {
        const evaluation = createAIEvaluationResult({ recommendation })
        const formatted = formatScoresForStorage(evaluation)

        expect(formatted.recommendation).toBe(recommendation)
      })
    })

    it('should preserve all dimension scores', () => {
      const evaluation = createAIEvaluationResult()
      const formatted = formatScoresForStorage(evaluation)

      expect(formatted.ai_scores.dimension_scores).toHaveLength(evaluation.dimension_scores.length)

      evaluation.dimension_scores.forEach((dimension, index) => {
        expect(formatted.ai_scores.dimension_scores[index]).toMatchObject({
          dimension: dimension.dimension,
          score: dimension.score,
          level: dimension.level,
          analysis: dimension.analysis
        })
      })
    })

    it('should include metadata fields', () => {
      const evaluation = createAIEvaluationResult({
        processing_time_ms: 2500,
        ai_model_used: 'gpt-4'
      })

      const formatted = formatScoresForStorage(evaluation)

      expect(formatted.ai_scores).toMatchObject({
        processing_time_ms: 2500,
        ai_model_used: 'gpt-4',
        evaluation_timestamp: evaluation.evaluation_timestamp
      })
    })
  })

  describe('Error Handling', () => {
    let engine: AIScoringEngine

    beforeEach(() => {
      engine = new AIScoringEngine('test-key')
    })

    it('should handle API rate limiting', async () => {
      const mockOpenAI = mocks.openAI
      mockOpenAI.chat.completions.create.mockRejectedValue({
        error: { code: 'rate_limit_exceeded' }
      })

      const responses = [{
        question_text: 'Test question',
        response_transcript: 'Test response',
        question_order: 1
      }]

      await expect(
        engine.evaluateInterview('test-id', responses)
      ).rejects.toThrow('AI evaluation failed')
    })

    it('should handle incomplete AI responses', async () => {
      const mockOpenAI = mocks.openAI
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              score: 75,
              // Missing required fields
            })
          }
        }]
      })

      const responses = [{
        question_text: 'Test question',
        response_transcript: 'Test response',
        question_order: 1
      }]

      await expect(
        engine.evaluateInterview('test-id', responses)
      ).rejects.toThrow('AI evaluation failed')
    })

    it('should handle network timeouts', async () => {
      const mockOpenAI = mocks.openAI
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Network timeout'))

      const responses = [{
        question_text: 'Test question',
        response_transcript: 'Test response',
        question_order: 1
      }]

      await expect(
        engine.evaluateInterview('test-id', responses)
      ).rejects.toThrow('AI evaluation failed: Network timeout')
    })

    it('should provide fallback summary on AI failure', async () => {
      const mockOpenAI = mocks.openAI

      // Mock successful dimension evaluation but failed summary
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 75,
                level: 'Good',
                analysis: 'Test analysis',
                strengths: ['Test strength'],
                areas_for_improvement: ['Test improvement'],
                reasoning: 'Test reasoning'
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 75,
                level: 'Good',
                analysis: 'Test analysis',
                strengths: ['Test strength'],
                areas_for_improvement: ['Test improvement'],
                reasoning: 'Test reasoning'
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 75,
                level: 'Good',
                analysis: 'Test analysis',
                strengths: ['Test strength'],
                areas_for_improvement: ['Test improvement'],
                reasoning: 'Test reasoning'
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 75,
                level: 'Good',
                analysis: 'Test analysis',
                strengths: ['Test strength'],
                areas_for_improvement: ['Test improvement'],
                reasoning: 'Test reasoning'
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 75,
                level: 'Good',
                analysis: 'Test analysis',
                strengths: ['Test strength'],
                areas_for_improvement: ['Test improvement'],
                reasoning: 'Test reasoning'
              })
            }
          }]
        })
        .mockRejectedValueOnce(new Error('Summary generation failed'))

      const responses = [{
        question_text: 'Test question',
        response_transcript: 'Test response',
        question_order: 1
      }]

      const result = await engine.evaluateInterview('test-id', responses)

      expect(result.overall_summary).toBe('Đánh giá tự động gặp lỗi. Cần đánh giá thủ công.')
      expect(result.recommendation).toBe('CONSIDER')
      expect(result.key_concerns).toContain('Cần đánh giá thủ công')
    })
  })
})