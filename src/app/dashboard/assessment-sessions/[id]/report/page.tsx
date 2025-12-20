/**
 * Assessment Session Report Page
 * Comprehensive report showing all participant results across 4 phases
 */

import { db } from '@/lib/db'
import {
  assessmentSessions,
  assessmentParticipants,
  caseStudyEvaluations,
  caseStudyTranscripts,
  caseStudyTranscriptVersions,
  tbeiResponses,
  hipoAssessments,
  quizResponses
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Download,
  Users,
  CheckCircle,
  Clock,
  Award,
  Brain,
  MessageSquare,
  FileText,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import ReportActions from './PrintButton'

export const dynamic = 'force-dynamic'

interface ReportPageProps {
  params: Promise<{ id: string }>
}

// Helper to get score color
function getScoreColor(score: number, max: number = 5): string {
  const percentage = (score / max) * 100
  if (percentage >= 80) return 'text-green-600'
  if (percentage >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

function getScoreBadgeVariant(score: number, max: number = 5): 'default' | 'secondary' | 'destructive' {
  const percentage = (score / max) * 100
  if (percentage >= 80) return 'default'
  if (percentage >= 60) return 'secondary'
  return 'destructive'
}

export default async function AssessmentReportPage({ params }: ReportPageProps) {
  const user = await requireAuth()
  const resolvedParams = await params
  const sessionId = resolvedParams.id

  // Fetch session
  const session = await db
    .select()
    .from(assessmentSessions)
    .where(
      and(
        eq(assessmentSessions.id, sessionId),
        eq(assessmentSessions.organizationId, user.organizationId)
      )
    )
    .limit(1)

  if (!session[0]) {
    notFound()
  }

  // Fetch participants
  const participants = await db
    .select()
    .from(assessmentParticipants)
    .where(eq(assessmentParticipants.sessionId, sessionId))
    .orderBy(assessmentParticipants.roleCode)

  // Latest case study transcript (consolidated)
  const latestTranscriptVersion = await db
    .select()
    .from(caseStudyTranscriptVersions)
    .where(eq(caseStudyTranscriptVersions.sessionId, sessionId))
    .orderBy(desc(caseStudyTranscriptVersions.version))
    .limit(1)

  const latestLegacyTranscript = await db
    .select()
    .from(caseStudyTranscripts)
    .where(eq(caseStudyTranscripts.sessionId, sessionId))
    .orderBy(desc(caseStudyTranscripts.sequenceNumber))
    .limit(1)

  const caseStudyTranscriptText =
    latestTranscriptVersion[0]?.fullTranscript ||
    latestLegacyTranscript[0]?.consolidatedTranscript ||
    ''

  const caseStudySpeakerMapping = (() => {
    const mapping = latestTranscriptVersion[0]?.speakerMapping || latestLegacyTranscript[0]?.speakerMapping
    if (!mapping) return null
    try {
      return JSON.parse(mapping) as Record<string, string>
    } catch {
      return null
    }
  })()

  const hasCaseStudyTranscript = !!caseStudyTranscriptText

  // Fetch all results for each participant
  const participantResults = await Promise.all(
    participants.map(async (participant) => {
      // Case Study Results
      const caseStudyResults = await db
        .select()
        .from(caseStudyEvaluations)
        .where(
          and(
            eq(caseStudyEvaluations.sessionId, sessionId),
            eq(caseStudyEvaluations.participantId, participant.id)
          )
        )

      // Calculate case study average
      const validCaseStudyScores = caseStudyResults.filter(e => e.countTowardOverall && e.score)
      const caseStudyAvg = validCaseStudyScores.length > 0
        ? validCaseStudyScores.reduce((sum, e) => sum + (e.score || 0), 0) / validCaseStudyScores.length
        : 0

      // TBEI Results
      const tbeiResults = await db
        .select()
        .from(tbeiResponses)
        .where(eq(tbeiResponses.participantId, participant.id))

      // Calculate TBEI average
      const tbeiScores = tbeiResults
        .map(r => {
          try {
            const eval_ = r.evaluation ? JSON.parse(r.evaluation) : null
            return eval_?.aiEvaluation?.score || eval_?.score || 0
          } catch {
            return 0
          }
        })
        .filter(s => s > 0)
      const tbeiAvg = tbeiScores.length > 0
        ? tbeiScores.reduce((sum, s) => sum + s, 0) / tbeiScores.length
        : 0

      // HiPo Results
      const hipoResults = await db
        .select()
        .from(hipoAssessments)
        .where(eq(hipoAssessments.participantId, participant.id))
        .limit(1)

      // Quiz Results
      const quizResults = await db
        .select()
        .from(quizResponses)
        .where(eq(quizResponses.participantId, participant.id))
        .limit(1)

      const quizPercentage = quizResults[0]?.score && quizResults[0]?.totalQuestions
        ? (quizResults[0].score / quizResults[0].totalQuestions) * 100
        : 0

      // Calculate overall score (weighted average)
      const scores: number[] = []
      if (caseStudyAvg > 0) scores.push(caseStudyAvg * 20) // Convert 1-5 to percentage
      if (tbeiAvg > 0) scores.push(tbeiAvg * 20)
      if (hipoResults[0]?.totalScore) scores.push(hipoResults[0].totalScore)
      if (quizPercentage > 0) scores.push(quizPercentage)

      const overallScore = scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0

      return {
        participant,
        caseStudy: {
          evaluations: caseStudyResults,
          average: caseStudyAvg,
          completed: validCaseStudyScores.length > 0 || hasCaseStudyTranscript,
          hasTranscript: hasCaseStudyTranscript,
          transcript: caseStudyTranscriptText,
          speakerMapping: caseStudySpeakerMapping
        },
        tbei: {
          responses: tbeiResults,
          average: tbeiAvg,
          completed: participant.tbeiStatus === 'completed'
        },
        hipo: {
          data: hipoResults[0] || null,
          completed: participant.hipoStatus === 'completed'
        },
        quiz: {
          data: quizResults[0] || null,
          percentage: quizPercentage,
          completed: participant.quizStatus === 'completed'
        },
        overallScore,
        allComplete: participant.tbeiStatus === 'completed' &&
          participant.hipoStatus === 'completed' &&
          participant.quizStatus === 'completed'
      }
    })
  )

  // Calculate session-level metrics
  const completedCount = participantResults.filter(p => p.allComplete).length
  const avgOverallScore = participantResults.length > 0
    ? participantResults.reduce((sum, p) => sum + p.overallScore, 0) / participantResults.length
    : 0

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/assessment-sessions/${sessionId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Báo cáo Assessment Center</h1>
            <p className="text-gray-600">{session[0].name}</p>
          </div>
        </div>
        <ReportActions sessionId={sessionId} />
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Báo cáo Assessment Center</h1>
        <p className="text-gray-600">{session[0].name}</p>
        <p className="text-sm text-gray-500">Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
      </div>

      {/* Session Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2 text-yellow-600" />
            Tổng quan phiên đánh giá
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{participants.length}</div>
              <div className="text-sm text-gray-600">Tổng thí sinh</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{completedCount}</div>
              <div className="text-sm text-gray-600">Hoàn thành</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {Math.round(avgOverallScore)}%
              </div>
              <div className="text-sm text-gray-600">Điểm TB</div>
            </div>
            <div className="text-center">
              <Badge variant={session[0].status === 'completed' ? 'default' : 'secondary'}>
                {session[0].status === 'completed' ? 'Hoàn thành' :
                  session[0].status === 'tbei_in_progress' ? 'Đang phỏng vấn' :
                    session[0].status === 'case_study_completed' ? 'Case Study xong' : 'Đang tiến hành'}
              </Badge>
              <div className="text-sm text-gray-600 mt-1">Trạng thái</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Case Study Transcript */}
      {hasCaseStudyTranscript && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
              Transcript Case Study (mới nhất)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600">
              Đã ghi âm thảo luận nhóm. Dưới đây là transcript đầy đủ để xem lại mà không cần nghe lại bản ghi.
            </div>
            <div className="border rounded p-3 bg-gray-50 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm">
              {caseStudyTranscriptText}
            </div>
            {caseStudySpeakerMapping && (
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Gán người nói:</span>{' '}
                {Object.entries(caseStudySpeakerMapping).map(([speaker, name]) => (
                  <span key={speaker} className="inline-block mr-2 mt-1 px-2 py-1 bg-gray-100 rounded">
                    {speaker}: {name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Participant Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Kết quả từng thí sinh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Thí sinh</th>
                  <th className="text-center p-3 font-medium">Case Study</th>
                  <th className="text-center p-3 font-medium">TBEI</th>
                  <th className="text-center p-3 font-medium">HiPo</th>
                  <th className="text-center p-3 font-medium">Quiz</th>
                  <th className="text-center p-3 font-medium">Tổng điểm</th>
                  <th className="text-center p-3 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {participantResults.map((result) => (
                  <tr key={result.participant.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-blue-600 text-sm">
                            {result.participant.roleCode}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{result.participant.name}</div>
                          <div className="text-xs text-gray-500">{result.participant.roleName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center p-3">
                      {result.caseStudy.hasTranscript ? (
                        result.caseStudy.average > 0 ? (
                          <span className={getScoreColor(result.caseStudy.average)}>
                            {result.caseStudy.average.toFixed(1)}/5
                          </span>
                        ) : (
                          <Badge variant="secondary">Đã ghi âm</Badge>
                        )
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-center p-3">
                      {result.tbei.completed ? (
                        <span className={getScoreColor(result.tbei.average)}>
                          {result.tbei.average.toFixed(1)}/5
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-center p-3">
                      {result.hipo.completed && result.hipo.data ? (
                        <span className={getScoreColor(result.hipo.data.totalScore || 0, 100)}>
                          {result.hipo.data.totalScore}/100
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-center p-3">
                      {result.quiz.completed && result.quiz.data ? (
                        <span className={getScoreColor(result.quiz.percentage, 100)}>
                          {Math.round(result.quiz.percentage)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-center p-3">
                      <Badge variant={getScoreBadgeVariant(result.overallScore, 100)}>
                        {Math.round(result.overallScore)}%
                      </Badge>
                    </td>
                    <td className="text-center p-3">
                      {result.allComplete ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results for Each Participant */}
      {participantResults.map((result) => (
        <Card key={result.participant.id} className="break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="font-bold text-blue-600">{result.participant.roleCode}</span>
                </div>
                <div>
                  <div>{result.participant.name}</div>
                  <div className="text-sm font-normal text-gray-500">{result.participant.roleName}</div>
                </div>
              </div>
              <Badge variant={getScoreBadgeVariant(result.overallScore, 100)} className="text-lg px-3 py-1">
                {Math.round(result.overallScore)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Phase Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Case Study */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
                    <span className="font-medium">Case Study</span>
                  </div>
                  {result.caseStudy.hasTranscript ? (
                    result.caseStudy.average > 0 ? (
                      <Badge variant="default">{result.caseStudy.average.toFixed(1)}/5</Badge>
                    ) : (
                      <Badge variant="secondary">Đã ghi âm</Badge>
                    )
                  ) : (
                    <Badge variant="secondary">Chưa có</Badge>
                  )}
                </div>
                {result.caseStudy.average > 0 && (
                  <Progress value={(result.caseStudy.average / 5) * 100} className="h-2" />
                )}
                {result.caseStudy.evaluations.length > 0 && (
                  <div className="mt-3 text-xs text-gray-600">
                    {result.caseStudy.evaluations.length} đánh giá năng lực
                  </div>
                )}
                {result.caseStudy.hasTranscript && (
                  <div className="mt-3 text-xs text-gray-700 space-y-1">
                    <div className="font-medium text-gray-800">Tóm tắt transcript</div>
                    <p className="whitespace-pre-wrap line-clamp-3">
                      {result.caseStudy.transcript}
                    </p>
                  </div>
                )}
              </div>

              {/* TBEI */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Brain className="h-4 w-4 mr-2 text-purple-600" />
                    <span className="font-medium">TBEI Interview</span>
                  </div>
                  {result.tbei.completed ? (
                    <Badge variant="default">{result.tbei.average.toFixed(1)}/5</Badge>
                  ) : (
                    <Badge variant="secondary">Chưa hoàn thành</Badge>
                  )}
                </div>
                {result.tbei.completed && (
                  <Progress value={(result.tbei.average / 5) * 100} className="h-2" />
                )}
                {result.tbei.responses.length > 0 && (
                  <div className="mt-3 text-xs text-gray-600">
                    {result.tbei.responses.length} câu trả lời
                  </div>
                )}
              </div>

              {/* HiPo */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                    <span className="font-medium">HiPo Assessment</span>
                  </div>
                  {result.hipo.completed && result.hipo.data ? (
                    <Badge variant="default">{result.hipo.data.totalScore}/100</Badge>
                  ) : (
                    <Badge variant="secondary">Chưa hoàn thành</Badge>
                  )}
                </div>
                {result.hipo.completed && result.hipo.data && (
                  <>
                    <Progress value={result.hipo.data.totalScore || 0} className="h-2" />
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Năng lực:</span>{' '}
                        <span className="font-medium">{result.hipo.data.abilityScore}/25</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Khát vọng:</span>{' '}
                        <span className="font-medium">{result.hipo.data.aspirationScore}/25</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Gắn kết:</span>{' '}
                        <span className="font-medium">{result.hipo.data.engagementScore}/25</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tích hợp:</span>{' '}
                        <span className="font-medium">{result.hipo.data.integratedScore}/25</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Quiz */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-orange-600" />
                    <span className="font-medium">Knowledge Quiz</span>
                  </div>
                  {result.quiz.completed && result.quiz.data ? (
                    <Badge variant="default">{Math.round(result.quiz.percentage)}%</Badge>
                  ) : (
                    <Badge variant="secondary">Chưa hoàn thành</Badge>
                  )}
                </div>
                {result.quiz.completed && result.quiz.data && (
                  <>
                    <Progress value={result.quiz.percentage} className="h-2" />
                    <div className="mt-3 text-xs text-gray-600">
                      {result.quiz.data.score}/{result.quiz.data.totalQuestions} câu đúng
                      {result.quiz.data.timeSpentSeconds && (
                        <span className="ml-2">
                          ({Math.floor(result.quiz.data.timeSpentSeconds / 60)} phút)
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {result.tbei.responses.length > 0 && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Brain className="h-4 w-4 mr-2 text-purple-600" />
                    <span className="font-medium">Câu trả lời TBEI</span>
                  </div>
                  <span className="text-xs text-gray-500">{result.tbei.responses.length} câu hỏi</span>
                </div>
                <div className="space-y-3">
                  {result.tbei.responses.map((response, index) => (
                    <div key={response.id ?? index} className="text-sm border-t border-gray-100 pt-2 first:border-t-0 first:pt-0">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Câu hỏi {response.questionId}</span>
                        {response.durationSeconds && <span>{response.durationSeconds}s</span>}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-gray-800">{response.transcript}</p>
                      {response.audioUrl && (
                        <a
                          href={response.audioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Nghe lại bản ghi
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
