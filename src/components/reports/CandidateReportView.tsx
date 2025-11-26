/**
 * Candidate Report View Component
 * Displays comprehensive interview analysis and AI scoring results
 */

'use client'

import { CandidateReportData } from '@/app/dashboard/reports/[id]/actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  Clock,
  Download,
  FileText,
  Mail,
  Phone,
  Star,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  User,
  Briefcase
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface CandidateReportViewProps {
  data: CandidateReportData
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 80) return 'default'
  if (score >= 60) return 'secondary'
  return 'destructive'
}

function getRecommendationBadge(recommendation: string | null) {
  switch (recommendation) {
    case 'RECOMMEND':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Khuyến nghị tuyển dụng
      </Badge>
    case 'CONSIDER':
      return <Badge variant="secondary">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Cân nhắc
      </Badge>
    case 'NOT_RECOMMEND':
      return <Badge variant="destructive">
        <TrendingDown className="w-3 h-3 mr-1" />
        Không khuyến nghị
      </Badge>
    default:
      return <Badge variant="outline">Chưa đánh giá</Badge>
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return 'N/A'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function CandidateReportView({ data }: CandidateReportViewProps) {
  const { interview, jobTemplate, aiEvaluation, responses, evaluationDimensions } = data

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <CardTitle className="text-2xl">{interview.candidateName}</CardTitle>
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Mail className="w-4 h-4" />
                  <span>{interview.candidateEmail}</span>
                </div>
                {interview.candidatePhone && (
                  <div className="flex items-center space-x-1">
                    <Phone className="w-4 h-4" />
                    <span>{interview.candidatePhone}</span>
                  </div>
                )}
              </div>
              {jobTemplate && (
                <div className="flex items-center space-x-1 text-sm">
                  <Briefcase className="w-4 h-4" />
                  <span className="font-medium">{jobTemplate.title}</span>
                </div>
              )}
            </div>
            <div className="text-right space-y-2">
              {getRecommendationBadge(interview.recommendation)}
              <div className="text-sm text-muted-foreground">
                ID: {interview.id.slice(-8)}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-muted-foreground">Trạng thái</div>
              <Badge variant={interview.status === 'completed' ? 'default' : 'secondary'}>
                {interview.status === 'completed' ? 'Hoàn thành' :
                 interview.status === 'in_progress' ? 'Đang thực hiện' :
                 'Chờ thực hiện'}
              </Badge>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Ngày tạo</div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(interview.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
            {interview.completedAt && (
              <div>
                <div className="font-medium text-muted-foreground">Hoàn thành</div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(new Date(interview.completedAt), {
                      addSuffix: true,
                      locale: vi
                    })}
                  </span>
                </div>
              </div>
            )}
            <div>
              <div className="font-medium text-muted-foreground">Số câu trả lời</div>
              <div>{responses.length} câu hỏi</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Score Section */}
      {interview.overallScore !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-5 h-5" />
              <span>Điểm tổng quan</span>
            </CardTitle>
            <CardDescription>
              Đánh giá tổng thể dựa trên 5 tiêu chí chính
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(interview.overallScore)}`}>
                  {interview.overallScore}/100
                </div>
                <div className="text-sm text-muted-foreground mt-1">Điểm tổng</div>
              </div>
              <div className="text-center">
                {getRecommendationBadge(interview.recommendation)}
                <div className="text-sm text-muted-foreground mt-2">Khuyến nghị</div>
              </div>
              <div className="text-center">
                {interview.processingCompletedAt && (
                  <>
                    <div className="text-sm font-medium">
                      {aiEvaluation?.ai_model_used || 'GPT-5-mini'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      AI đánh giá {formatDistanceToNow(new Date(interview.processingCompletedAt), {
                        addSuffix: true,
                        locale: vi
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="evaluation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="evaluation">Đánh giá AI</TabsTrigger>
          <TabsTrigger value="responses">Câu trả lời</TabsTrigger>
          <TabsTrigger value="transcript">Bản ghi</TabsTrigger>
          <TabsTrigger value="actions">Hành động</TabsTrigger>
        </TabsList>

        {/* AI Evaluation Tab */}
        <TabsContent value="evaluation" className="space-y-6">
          {aiEvaluation ? (
            <>
              {/* Dimension Scores */}
              {aiEvaluation.dimension_scores && (
                <Card>
                  <CardHeader>
                    <CardTitle>Điểm theo tiêu chí</CardTitle>
                    <CardDescription>
                      Chi tiết đánh giá theo 5 tiêu chí của VietinBank
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {aiEvaluation.dimension_scores.map((dimension, index) => {
                      const dimensionInfo = evaluationDimensions[dimension.dimension]
                      return (
                        <div key={index} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                              {dimensionInfo?.name || dimension.dimension}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <Badge variant={getScoreBadgeVariant(dimension.score)}>
                                {dimension.level}
                              </Badge>
                              <span className={`font-bold ${getScoreColor(dimension.score)}`}>
                                {dimension.score}/100
                              </span>
                            </div>
                          </div>
                          <Progress value={dimension.score} className="h-2" />
                          <div className="text-sm text-muted-foreground">
                            {dimension.analysis}
                          </div>

                          {dimension.strengths.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-green-600 flex items-center space-x-1">
                                <TrendingUp className="w-3 h-3" />
                                <span>Điểm mạnh</span>
                              </div>
                              <ul className="text-xs space-y-1 ml-4">
                                {dimension.strengths.map((strength, idx) => (
                                  <li key={idx} className="flex items-start space-x-1">
                                    <span className="text-green-500">•</span>
                                    <span>{strength}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {dimension.areas_for_improvement.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-orange-600 flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Cần cải thiện</span>
                              </div>
                              <ul className="text-xs space-y-1 ml-4">
                                {dimension.areas_for_improvement.map((improvement, idx) => (
                                  <li key={idx} className="flex items-start space-x-1">
                                    <span className="text-orange-500">•</span>
                                    <span>{improvement}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Overall Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Tóm tắt tổng thể</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose max-w-none">
                    <p className="text-sm leading-relaxed">
                      {aiEvaluation.overall_summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiEvaluation.key_strengths.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-green-600 flex items-center space-x-1">
                          <TrendingUp className="w-4 h-4" />
                          <span>Điểm mạnh chính</span>
                        </h4>
                        <ul className="text-sm space-y-1">
                          {aiEvaluation.key_strengths.map((strength, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiEvaluation.key_concerns.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-orange-600 flex items-center space-x-1">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Mối quan tâm</span>
                        </h4>
                        <ul className="text-sm space-y-1">
                          {aiEvaluation.key_concerns.map((concern, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                              <span>{concern}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {aiEvaluation.next_steps.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center space-x-1">
                        <FileText className="w-4 h-4" />
                        <span>Bước tiếp theo</span>
                      </h4>
                      <ul className="text-sm space-y-1">
                        {aiEvaluation.next_steps.map((step, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <span className="font-bold text-blue-500">{idx + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">Chưa có đánh giá AI</h3>
                <p className="text-sm text-muted-foreground">
                  Phỏng vấn này chưa được xử lý bởi AI hoặc đang trong quá trình xử lý.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Responses Tab */}
        <TabsContent value="responses" className="space-y-4">
          {responses.map((response) => (
            <Card key={response.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">
                    Câu hỏi {response.questionOrder}
                  </CardTitle>
                  {response.responseDuration && (
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDuration(response.responseDuration)}
                    </Badge>
                  )}
                </div>
                <CardDescription className="font-medium">
                  {response.questionText}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {response.responseTranscript ? (
                  <div className="prose max-w-none">
                    <p className="text-sm leading-relaxed bg-muted/50 p-4 rounded-lg">
                      {response.responseTranscript}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Chưa có bản ghi cho câu trả lời này</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript">
          <Card>
            <CardHeader>
              <CardTitle>Bản ghi đầy đủ</CardTitle>
              <CardDescription>
                Toàn bộ nội dung phỏng vấn được ghi lại
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interview.transcript ? (
                <div className="prose max-w-none">
                  <pre className="text-sm leading-relaxed bg-muted/50 p-6 rounded-lg whitespace-pre-wrap">
                    {interview.transcript}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Chưa có bản ghi cho phỏng vấn này</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hành động</CardTitle>
              <CardDescription>
                Các hành động có thể thực hiện với báo cáo này
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Tải báo cáo PDF
                </Button>
                <Button variant="outline" disabled>
                  <Mail className="w-4 h-4 mr-2" />
                  Gửi kết quả qua email
                </Button>
              </div>
              <Separator />
              <div className="text-sm text-muted-foreground">
                <p><strong>Lưu ý:</strong> Các tính năng bổ sung sẽ được triển khai trong phiên bản tiếp theo.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}