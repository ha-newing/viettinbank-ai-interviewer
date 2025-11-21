/**
 * Evaluation Framework Loader - Loads Vietnamese evaluation framework from YAML
 */

import * as yaml from 'js-yaml'
import * as fs from 'fs'
import * as path from 'path'

export interface EvaluationDimension {
  name: string
  description: string
  weight: number
  scoring_levels: {
    [level: string]: {
      score_range: [number, number]
      description: string
      indicators: string[]
    }
  }
  evaluation_prompts: {
    analysis_prompt: string
    scoring_prompt: string
  }
}

export interface EvaluationFramework {
  framework_info: {
    name: string
    version: string
    language: string
    description: string
  }
  cultural_context: {
    description: string
    considerations: string[]
  }
  evaluation_dimensions: {
    [key: string]: EvaluationDimension
  }
  ai_evaluation: {
    model_requirements: string[]
    output_schema: {
      [key: string]: any
    }
    general_instructions: string[]
  }
}

let cachedFramework: EvaluationFramework | null = null

/**
 * Load the evaluation framework from YAML file
 */
export function loadEvaluationFramework(): EvaluationFramework {
  if (cachedFramework) {
    return cachedFramework
  }

  try {
    const frameworkPath = path.join(process.cwd(), 'src', 'config', 'evaluation-framework.yaml')
    const fileContent = fs.readFileSync(frameworkPath, 'utf8')
    const framework = yaml.load(fileContent) as EvaluationFramework

    if (!framework.evaluation_dimensions || !framework.framework_info) {
      throw new Error('Invalid evaluation framework structure')
    }

    cachedFramework = framework
    return framework

  } catch (error) {
    console.error('❌ Failed to load evaluation framework:', error)
    throw new Error(`Could not load evaluation framework: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get evaluation dimension by key
 */
export function getEvaluationDimension(dimensionKey: string): EvaluationDimension | null {
  const framework = loadEvaluationFramework()
  return framework.evaluation_dimensions[dimensionKey] || null
}

/**
 * Get all evaluation dimensions
 */
export function getAllEvaluationDimensions(): { [key: string]: EvaluationDimension } {
  const framework = loadEvaluationFramework()
  return framework.evaluation_dimensions
}

/**
 * Calculate weighted overall score from dimension scores
 */
export function calculateOverallScore(dimensionScores: { [dimensionKey: string]: number }): number {
  const framework = loadEvaluationFramework()
  const dimensions = framework.evaluation_dimensions

  let weightedSum = 0
  let totalWeight = 0

  Object.entries(dimensionScores).forEach(([key, score]) => {
    const dimension = dimensions[key]
    if (dimension && typeof score === 'number' && score >= 0 && score <= 100) {
      weightedSum += score * dimension.weight
      totalWeight += dimension.weight
    }
  })

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
}

/**
 * Get scoring level for a dimension score
 */
export function getScoreLevel(dimensionKey: string, score: number): string | null {
  const dimension = getEvaluationDimension(dimensionKey)
  if (!dimension) return null

  for (const [level, config] of Object.entries(dimension.scoring_levels)) {
    const [minScore, maxScore] = config.score_range
    if (score >= minScore && score <= maxScore) {
      return level
    }
  }

  return null
}

/**
 * Validate dimension scores
 */
export function validateDimensionScores(scores: { [key: string]: number }): {
  isValid: boolean
  errors: string[]
} {
  const framework = loadEvaluationFramework()
  const dimensions = framework.evaluation_dimensions
  const errors: string[] = []

  // Check if all required dimensions are present
  Object.keys(dimensions).forEach(key => {
    if (!(key in scores)) {
      errors.push(`Missing score for dimension: ${key}`)
    }
  })

  // Check if scores are within valid range
  Object.entries(scores).forEach(([key, score]) => {
    if (!(key in dimensions)) {
      errors.push(`Unknown dimension: ${key}`)
    } else if (typeof score !== 'number' || score < 0 || score > 100) {
      errors.push(`Invalid score for ${key}: must be a number between 0 and 100`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Generate evaluation prompt for AI scoring
 */
export function generateEvaluationPrompt(
  dimensionKey: string,
  transcript: string,
  questionText: string
): string {
  const dimension = getEvaluationDimension(dimensionKey)
  if (!dimension) {
    throw new Error(`Unknown evaluation dimension: ${dimensionKey}`)
  }

  const framework = loadEvaluationFramework()

  return `
${framework.cultural_context.description}

**Tiêu chí đánh giá: ${dimension.name}**
${dimension.description}

**Bối cảnh văn hóa cần cân nhắc:**
${framework.cultural_context.considerations.map(c => `- ${c}`).join('\n')}

**Câu hỏi phỏng vấn:**
"${questionText}"

**Phản hồi của ứng viên:**
"${transcript}"

**Hướng dẫn phân tích:**
${dimension.evaluation_prompts.analysis_prompt}

**Thang điểm:**
${Object.entries(dimension.scoring_levels).map(([level, config]) =>
  `- **${level}** (${config.score_range[0]}-${config.score_range[1]} điểm): ${config.description}`
).join('\n')}

**Hướng dẫn chấm điểm:**
${dimension.evaluation_prompts.scoring_prompt}

**Yêu cầu định dạng đầu ra:**
Trả lời theo định dạng JSON:
{
  "analysis": "Phân tích chi tiết về phản hồi của ứng viên",
  "score": [điểm số từ 0-100],
  "level": "[mức độ]",
  "strengths": ["điểm mạnh 1", "điểm mạnh 2"],
  "areas_for_improvement": ["điểm cần cải thiện 1", "điểm cần cải thiện 2"],
  "reasoning": "Giải thích lý do chấm điểm"
}
`
}

/**
 * Generate overall evaluation summary prompt
 */
export function generateOverallSummaryPrompt(
  dimensionResults: { [key: string]: any },
  overallScore: number
): string {
  const framework = loadEvaluationFramework()

  return `
**Tổng kết đánh giá phỏng vấn AI - VietinBank**

${framework.cultural_context.description}

**Kết quả chi tiết theo từng tiêu chí:**
${Object.entries(dimensionResults).map(([key, result]) => {
  const dimension = framework.evaluation_dimensions[key]
  return `
**${dimension?.name}**: ${result.score}/100 (${result.level})
- Điểm mạnh: ${result.strengths.join(', ')}
- Cần cải thiện: ${result.areas_for_improvement.join(', ')}
`
}).join('\n')}

**Điểm tổng kết:** ${overallScore}/100

Hãy tạo một bản tóm tắt tổng thể và đưa ra khuyến nghị tuyển dụng dựa trên:
1. Kết quả đánh giá chi tiết
2. Bối cảnh văn hóa Việt Nam
3. Tiêu chuẩn tuyển dụng của ngân hàng

**Yêu cầu định dạng đầu ra:**
{
  "overall_summary": "Tóm tắt tổng thể về ứng viên",
  "recommendation": "RECOMMEND | CONSIDER | NOT_RECOMMEND",
  "recommendation_reasoning": "Lý do khuyến nghị",
  "key_strengths": ["điểm mạnh chính 1", "điểm mạnh chính 2"],
  "key_concerns": ["mối quan tâm chính 1", "mối quan tâm chính 2"],
  "next_steps": ["bước tiếp theo 1", "bước tiếp theo 2"]
}
`
}