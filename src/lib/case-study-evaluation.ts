import OpenAI from 'openai'
import yaml from 'js-yaml'
import { readFileSync } from 'fs'
import path from 'path'

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

// Load evaluation framework
const frameworkPath = path.join(process.cwd(), 'src/config/evaluation-framework-vietinbank.yaml')
let evaluationFramework: any = null

try {
  const frameworkContent = readFileSync(frameworkPath, 'utf8')
  evaluationFramework = yaml.load(frameworkContent)
} catch (error) {
  console.error('Error loading evaluation framework:', error)
}

// Case study competency evaluation interface
export interface CaseStudyEvaluation {
  participantId: string
  competencyId: string
  score: number // 1-5 scale
  level: 'needs_improvement' | 'meets_requirements' | 'exceeds_requirements'
  rationale: string
  evidence: string[]
  evidenceStrength: 'strong' | 'moderate' | 'weak' | 'insufficient'
  confidenceScore: number // 0-1
  behavioralIndicators: string[] // HV1, HV2, HV3 codes observed
}

export interface CompetencyEvaluationRequest {
  transcriptChunk: string
  participants: Array<{
    id: string
    name: string
    roleCode: string
    roleName: string
  }>
  competencyId: string
  chunkSequence: number
  sessionContext: {
    sessionId: string
    sessionName: string
    totalDuration: number
    caseStudyScenario: string
  }
}

export interface CompetencyEvaluationResponse {
  success: boolean
  evaluations: CaseStudyEvaluation[]
  metadata: {
    processedAt: string
    competencyId: string
    chunkSequence: number
    totalWords: number
    processingTimeMs: number
  }
  error?: string
}

/**
 * Evaluate a transcript chunk for specific competency demonstration
 */
export async function evaluateTranscriptChunk(
  request: CompetencyEvaluationRequest
): Promise<CompetencyEvaluationResponse> {
  const startTime = Date.now()

  try {
    if (!evaluationFramework) {
      throw new Error('Evaluation framework not loaded')
    }

    const competency = evaluationFramework.competencies[request.competencyId]
    if (!competency) {
      throw new Error(`Competency ${request.competencyId} not found in framework`)
    }

    // Build evaluation prompt
    const prompt = buildEvaluationPrompt(request, competency)

    // Call OpenAI for evaluation
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert HR assessor for VietinBank, specialized in evaluating leadership competencies through case study discussions. Analyze transcript segments and provide detailed competency evaluations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 1, // Low temperature for consistent evaluation
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('Empty response from OpenAI')
    }

    // Parse the JSON response
    const evaluationResult = JSON.parse(responseText)

    // Validate and transform the response
    const evaluations = validateAndTransformEvaluations(
      evaluationResult,
      request.participants,
      request.competencyId
    )

    return {
      success: true,
      evaluations,
      metadata: {
        processedAt: new Date().toISOString(),
        competencyId: request.competencyId,
        chunkSequence: request.chunkSequence,
        totalWords: countWords(request.transcriptChunk),
        processingTimeMs: Date.now() - startTime
      }
    }

  } catch (error) {
    console.error('Error evaluating transcript chunk:', error)
    return {
      success: false,
      evaluations: [],
      metadata: {
        processedAt: new Date().toISOString(),
        competencyId: request.competencyId,
        chunkSequence: request.chunkSequence,
        totalWords: countWords(request.transcriptChunk),
        processingTimeMs: Date.now() - startTime
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Build the evaluation prompt for OpenAI
 */
function buildEvaluationPrompt(
  request: CompetencyEvaluationRequest,
  competency: any
): string {
  const { transcriptChunk, participants, competencyId, sessionContext } = request

  return `
# VietinBank Assessment Center - Case Study Evaluation

## Context
- **Session**: ${sessionContext.sessionName}
- **Scenario**: VietinBank Eastern Saigon branch case study (NPL 2.4%, NPS 32)
- **Duration**: 120-minute group discussion
- **Chunk**: Sequence #${request.chunkSequence} from ongoing discussion

## Participants
${participants.map(p => `- **${p.roleCode} (${p.name})**: ${p.roleName}`).join('\n')}

## Competency to Evaluate: ${competency.name}
**Definition**: ${competency.description}

### Behavioral Indicators:
${competency.behavioral_indicators.map((indicator: any, index: number) =>
  `**${indicator.code}**: ${indicator.description}`
).join('\n\n')}

### Scoring Rubric (1-5 scale):
- **1-2 (Needs Improvement)**: ${competency.scoring_rubric.needs_improvement.description || 'Limited demonstration of competency'}
- **3 (Meets Requirements)**: ${competency.scoring_rubric.meets_requirements.description || 'Adequate demonstration of competency'}
- **4-5 (Exceeds Requirements)**: ${competency.scoring_rubric.exceeds_requirements.description || 'Strong demonstration of competency'}

## Transcript to Analyze
\`\`\`
${transcriptChunk}
\`\`\`

## Evaluation Instructions

Analyze this transcript segment for demonstrations of **${competency.name}** by each participant. Look for:

1. **Behavioral Evidence**: Specific statements, questions, or contributions that align with the behavioral indicators
2. **Quality Assessment**: Depth, insight, and strategic thinking demonstrated
3. **Role Context**: How each participant's contributions fit their assigned role
4. **Competency Level**: Score based on the quality and depth of demonstration

## Response Format (JSON)

Return a JSON object with evaluations for each participant:

\`\`\`json
{
  "evaluations": [
    {
      "participantId": "participant_id",
      "participantName": "Name",
      "roleCode": "A/B/C/D/E",
      "score": 1-5,
      "level": "needs_improvement|meets_requirements|exceeds_requirements",
      "rationale": "Detailed explanation of scoring rationale in Vietnamese",
      "evidence": [
        "Direct quote 1 showing competency demonstration",
        "Direct quote 2 showing specific behavior"
      ],
      "evidenceStrength": "strong|moderate|weak|insufficient",
      "confidenceScore": 0.0-1.0,
      "behavioralIndicators": ["HV1", "HV2"],
      "roleRelevance": "How this relates to their assigned role"
    }
  ],
  "chunkSummary": "Brief summary of key competency demonstrations in this segment",
  "overallObservations": "General insights about group dynamics and competency patterns"
}
\`\`\`

## Evaluation Guidelines

- **Score 0**: If no evidence of competency demonstration in this chunk
- **Score 1-2**: Basic or limited demonstration with weak evidence
- **Score 3**: Clear demonstration meeting expectations
- **Score 4-5**: Exceptional demonstration exceeding expectations
- **Evidence**: Use direct quotes from transcript as evidence
- **Vietnamese**: Provide rationale in Vietnamese for cultural context
- **Role Context**: Consider how competency relates to their banking role
- **Confidence**: Rate your confidence in the evaluation (0.0-1.0)

Focus on **quality over quantity** - a brief but insightful contribution may score higher than lengthy but shallow discussion.
`
}

/**
 * Validate and transform OpenAI response to our interface
 */
function validateAndTransformEvaluations(
  aiResponse: any,
  participants: CompetencyEvaluationRequest['participants'],
  competencyId: string
): CaseStudyEvaluation[] {
  const evaluations: CaseStudyEvaluation[] = []

  if (!aiResponse.evaluations || !Array.isArray(aiResponse.evaluations)) {
    return evaluations
  }

  for (const evaluation of aiResponse.evaluations) {
    // Find participant
    const participant = participants.find(p =>
      p.id === evaluation.participantId ||
      p.name === evaluation.participantName ||
      p.roleCode === evaluation.roleCode
    )

    if (!participant) {
      continue // Skip if participant not found
    }

    // Validate score
    const score = Math.max(1, Math.min(5, parseInt(evaluation.score) || 1))

    // Determine level based on score
    let level: CaseStudyEvaluation['level'] = 'needs_improvement'
    if (score >= 4) {
      level = 'exceeds_requirements'
    } else if (score === 3) {
      level = 'meets_requirements'
    }

    // Validate evidence array
    const evidence = Array.isArray(evaluation.evidence)
      ? evaluation.evidence.filter((e: any) => typeof e === 'string' && e.trim().length > 0)
      : []

    // Determine evidence strength
    let evidenceStrength: CaseStudyEvaluation['evidenceStrength'] = 'insufficient'
    if (evidence.length >= 2 && score >= 4) {
      evidenceStrength = 'strong'
    } else if (evidence.length >= 1 && score >= 3) {
      evidenceStrength = 'moderate'
    } else if (evidence.length >= 1) {
      evidenceStrength = 'weak'
    }

    evaluations.push({
      participantId: participant.id,
      competencyId,
      score,
      level,
      rationale: evaluation.rationale || 'Không có đánh giá cụ thể trong đoạn này',
      evidence,
      evidenceStrength,
      confidenceScore: Math.max(0, Math.min(1, parseFloat(evaluation.confidenceScore) || 0.5)),
      behavioralIndicators: Array.isArray(evaluation.behavioralIndicators)
        ? evaluation.behavioralIndicators.filter((bi: any) => typeof bi === 'string')
        : []
    })
  }

  return evaluations
}

/**
 * Evaluate all relevant competencies for a transcript chunk
 */
export async function evaluateAllCompetencies(
  request: Omit<CompetencyEvaluationRequest, 'competencyId'>
): Promise<Record<string, CompetencyEvaluationResponse>> {
  // Case study evaluates these competencies
  const caseStudyCompetencies = [
    'strategic_thinking',
    'innovation',
    'risk_balance',
    'digital_transformation'
  ]

  const results: Record<string, CompetencyEvaluationResponse> = {}

  // Process competencies in parallel for faster evaluation
  const evaluationPromises = caseStudyCompetencies.map(async (competencyId) => {
    const result = await evaluateTranscriptChunk({
      ...request,
      competencyId
    })
    return { competencyId, result }
  })

  const evaluationResults = await Promise.all(evaluationPromises)

  for (const { competencyId, result } of evaluationResults) {
    results[competencyId] = result
  }

  return results
}

/**
 * Count words in a text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).length
}

/**
 * Get competency information from framework
 */
export function getCompetencyInfo(competencyId: string) {
  if (!evaluationFramework) {
    return null
  }
  return evaluationFramework.competencies[competencyId] || null
}

/**
 * Get all case study competencies
 */
export function getCaseStudyCompetencies() {
  return [
    'strategic_thinking',
    'innovation',
    'risk_balance',
    'digital_transformation'
  ]
}