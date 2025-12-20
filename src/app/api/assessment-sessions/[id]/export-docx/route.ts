'use server'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  assessmentSessions,
  assessmentParticipants,
  caseStudyEvaluations,
  caseStudyTranscriptVersions,
  caseStudyTranscripts,
  tbeiResponses,
  hipoAssessments,
  quizResponses
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  PageOrientation
} from 'docx'

/**
 * Generate DOCX report for an assessment session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: sessionId } = await params

    // Verify session belongs to user's organization
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
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
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

        const validCaseStudyScores = caseStudyResults.filter(e => e.countTowardOverall && e.score)
        const caseStudyAvg = validCaseStudyScores.length > 0
          ? validCaseStudyScores.reduce((sum, e) => sum + (e.score || 0), 0) / validCaseStudyScores.length
          : 0

        // TBEI Results
        const tbeiResults = await db
          .select()
          .from(tbeiResponses)
          .where(eq(tbeiResponses.participantId, participant.id))

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

        // Calculate overall score
        const scores: number[] = []
        if (caseStudyAvg > 0) scores.push(caseStudyAvg * 20)
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
            responses: tbeiResults.map(r => ({
              id: r.id,
              questionId: r.questionId,
              transcript: r.transcript,
              audioUrl: r.audioUrl ?? undefined,
              durationSeconds: r.durationSeconds ?? undefined
            })),
            average: tbeiAvg,
            completed: participant.tbeiStatus === 'completed'
          },
          hipo: { data: hipoResults[0] || null, completed: participant.hipoStatus === 'completed' },
          quiz: { data: quizResults[0] || null, percentage: quizPercentage, completed: participant.quizStatus === 'completed' },
          overallScore,
          allComplete: participant.tbeiStatus === 'completed' &&
            participant.hipoStatus === 'completed' &&
            participant.quizStatus === 'completed'
        }
      })
    )

    // Calculate session metrics
    const completedCount = participantResults.filter(p => p.allComplete).length
    const avgOverallScore = participantResults.length > 0
      ? participantResults.reduce((sum, p) => sum + p.overallScore, 0) / participantResults.length
      : 0

    // Build the DOCX document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT
            }
          }
        },
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: 'BÁO CÁO ASSESSMENT CENTER',
                bold: true,
                size: 32
              })
            ],
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),

          // Session name
          new Paragraph({
            children: [
              new TextRun({
                text: session[0].name,
                size: 28
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),

          // Export date
          new Paragraph({
            children: [
              new TextRun({
                text: `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`,
                size: 22,
                color: '666666'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),

          // Session Summary Header
          new Paragraph({
            children: [
              new TextRun({
                text: 'TỔNG QUAN PHIÊN ĐÁNH GIÁ',
                bold: true,
                size: 26
              })
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),

          // Session summary table
          createSummaryTable(participants.length, completedCount, avgOverallScore, session[0].status),

          // Participant Results Header
          new Paragraph({
            children: [
              new TextRun({
                text: 'KẾT QUẢ TỪNG THÍ SINH',
                bold: true,
                size: 26
              })
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),

          // Results table
          createResultsTable(participantResults),

          // Case Study transcript
          new Paragraph({
            children: [
              new TextRun({
                text: 'TRANSCRIPT CASE STUDY',
                bold: true,
                size: 26
              })
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: hasCaseStudyTranscript
                  ? 'Bản ghi mới nhất của thảo luận nhóm (đã bao gồm phân tách người nói).'
                  : 'Chưa có transcript case study.',
                size: 20,
                color: '444444'
              })
            ],
            spacing: { after: 200 }
          }),
          ...(hasCaseStudyTranscript ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: caseStudyTranscriptText,
                  size: 20
                })
              ]
            }),
            ...(caseStudySpeakerMapping ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Gán người nói: ' + Object.entries(caseStudySpeakerMapping)
                      .map(([speaker, name]) => `${speaker}: ${name}`)
                      .join('; '),
                    size: 18,
                    color: '666666'
                  })
                ]
              })
            ] : [])
          ] : []),

          // Detailed Results Header
          new Paragraph({
            children: [
              new TextRun({
                text: 'CHI TIẾT TỪNG THÍ SINH',
                bold: true,
                size: 26
              })
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),

          // Detailed participant sections
          ...participantResults.flatMap(result => createParticipantDetailSection(result))
        ]
      }]
    })

    // Generate the document buffer
    const buffer = await Packer.toBuffer(doc)

    // Return the document as a download
    const fileName = `${session[0].name.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.docx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': buffer.byteLength.toString()
      }
    })

  } catch (error) {
    console.error('Error generating DOCX report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

// Helper to create summary table
function createSummaryTable(totalParticipants: number, completed: number, avgScore: number, status: string): Table {
  const statusLabel = status === 'completed' ? 'Hoàn thành' :
    status === 'tbei_in_progress' ? 'Đang phỏng vấn' :
      status === 'case_study_completed' ? 'Case Study xong' : 'Đang tiến hành'

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createTableCell('Tổng thí sinh', true),
          createTableCell('Hoàn thành', true),
          createTableCell('Điểm TB', true),
          createTableCell('Trạng thái', true)
        ]
      }),
      new TableRow({
        children: [
          createTableCell(totalParticipants.toString()),
          createTableCell(completed.toString()),
          createTableCell(`${Math.round(avgScore)}%`),
          createTableCell(statusLabel)
        ]
      })
    ]
  })
}

// Helper to create results table
function createResultsTable(participantResults: Array<{
  participant: { roleCode: string; name: string; roleName: string };
  caseStudy: { average: number; completed: boolean; hasTranscript: boolean };
  tbei: { average: number; completed: boolean };
  hipo: { data: { totalScore: number | null } | null; completed: boolean };
  quiz: { percentage: number; completed: boolean };
  overallScore: number;
  allComplete: boolean;
}>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Header row
      new TableRow({
        children: [
          createTableCell('Thí sinh', true),
          createTableCell('Case Study', true),
          createTableCell('TBEI', true),
          createTableCell('HiPo', true),
          createTableCell('Quiz', true),
          createTableCell('Tổng điểm', true),
          createTableCell('Trạng thái', true)
        ]
      }),
      // Data rows
      ...participantResults.map(result =>
        new TableRow({
          children: [
            createTableCell(`${result.participant.roleCode} - ${result.participant.name}`),
            createTableCell(
              result.caseStudy.hasTranscript
                ? (result.caseStudy.average > 0 ? `${result.caseStudy.average.toFixed(1)}/5` : 'Đã ghi âm')
                : '-'
            ),
            createTableCell(result.tbei.completed ? `${result.tbei.average.toFixed(1)}/5` : '-'),
            createTableCell(result.hipo.completed && result.hipo.data?.totalScore ? `${result.hipo.data.totalScore}/100` : '-'),
            createTableCell(result.quiz.completed ? `${Math.round(result.quiz.percentage)}%` : '-'),
            createTableCell(`${Math.round(result.overallScore)}%`),
            createTableCell(result.allComplete ? 'Hoàn thành' : 'Đang tiến hành')
          ]
        })
      )
    ]
  })
}

// Helper to create a table cell
function createTableCell(text: string, isHeader: boolean = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: isHeader,
            size: isHeader ? 22 : 20
          })
        ],
        alignment: AlignmentType.CENTER
      })
    ],
    shading: isHeader ? {
      fill: 'E6E6E6',
      type: ShadingType.SOLID,
      color: 'E6E6E6'
    } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
    }
  })
}

// Helper to create detailed participant section
function createParticipantDetailSection(result: {
  participant: { roleCode: string; name: string; roleName: string };
  caseStudy: {
    average: number;
    completed: boolean;
    hasTranscript: boolean;
    transcript?: string | null;
    speakerMapping?: Record<string, string> | null;
    evaluations: Array<{ competencyId: string; score: number | null }>;
  };
  tbei: {
    average: number;
    completed: boolean;
    responses: Array<{
      id?: string;
      questionId?: string;
      transcript?: string;
      audioUrl?: string;
      durationSeconds?: number;
    }>;
  };
  hipo: { data: { totalScore: number | null; abilityScore: number | null; aspirationScore: number | null; engagementScore: number | null; integratedScore: number | null } | null; completed: boolean };
  quiz: { percentage: number; completed: boolean; data: { score: number | null; totalQuestions: number | null; timeSpentSeconds: number | null } | null };
  overallScore: number;
}): Paragraph[] {
  const paragraphs: Paragraph[] = [
    // Participant header
    new Paragraph({
      children: [
        new TextRun({
          text: `${result.participant.roleCode} - ${result.participant.name}`,
          bold: true,
          size: 24
        })
      ],
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 300, after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Vị trí: ${result.participant.roleName} | Tổng điểm: ${Math.round(result.overallScore)}%`,
          size: 20,
          color: '666666'
        })
      ],
      spacing: { after: 200 }
    }),

    // Case Study
    new Paragraph({
      children: [
        new TextRun({ text: 'Case Study: ', bold: true, size: 20 }),
        new TextRun({
          text: result.caseStudy.hasTranscript
            ? (result.caseStudy.average > 0
              ? `${result.caseStudy.average.toFixed(1)}/5 (${result.caseStudy.evaluations.length} đánh giá)`
              : 'Đã ghi âm (chưa chấm điểm)')
            : 'Chưa có dữ liệu',
          size: 20
        })
      ]
    }),

    // TBEI
    new Paragraph({
      children: [
        new TextRun({ text: 'TBEI Interview: ', bold: true, size: 20 }),
        new TextRun({
          text: result.tbei.completed
            ? `${result.tbei.average.toFixed(1)}/5 (${result.tbei.responses.length} câu trả lời)`
            : 'Chưa hoàn thành',
          size: 20
        })
      ]
    }),

    // HiPo
    new Paragraph({
      children: [
        new TextRun({ text: 'HiPo Assessment: ', bold: true, size: 20 }),
        new TextRun({
          text: result.hipo.completed && result.hipo.data?.totalScore
            ? `${result.hipo.data.totalScore}/100`
            : 'Chưa hoàn thành',
          size: 20
        })
      ]
    })
  ]

  // HiPo breakdown if available
  if (result.hipo.completed && result.hipo.data) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `   • Năng lực: ${result.hipo.data.abilityScore}/25 | Khát vọng: ${result.hipo.data.aspirationScore}/25 | Gắn kết: ${result.hipo.data.engagementScore}/25 | Tích hợp: ${result.hipo.data.integratedScore}/25`,
            size: 18,
            color: '666666'
          })
        ]
      })
    )
  }

  // Case study transcript snippet
  if (result.caseStudy.hasTranscript && result.caseStudy.transcript) {
    const snippet = result.caseStudy.transcript.length > 500
      ? `${result.caseStudy.transcript.slice(0, 500)}...`
      : result.caseStudy.transcript

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `   • Trích đoạn Case Study: ${snippet}`,
            size: 18,
            color: '666666'
          })
        ]
      })
    )

    if (result.caseStudy.speakerMapping) {
      const mappingText = Object.entries(result.caseStudy.speakerMapping)
        .map(([speaker, name]) => `${speaker}: ${name}`)
        .join('; ')
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `   • Gán người nói: ${mappingText}`,
              size: 18,
              color: '666666'
            })
          ]
        })
      )
    }
  }

  // TBEI responses detail
  if (result.tbei.responses.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '   • Trả lời TBEI:',
            size: 18,
            color: '666666'
          })
        ]
      })
    )

    result.tbei.responses.forEach((response, idx) => {
      const snippet = response.transcript && response.transcript.length > 400
        ? `${response.transcript.slice(0, 400)}...`
        : response.transcript || ''

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `      ${idx + 1}. ${response.questionId || 'Câu hỏi'}: ${snippet}`,
              size: 18
            })
          ],
          spacing: { after: 50 }
        })
      )

      if (response.audioUrl) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `         Nghe lại: ${response.audioUrl}`,
                size: 16,
                color: '4444AA'
              })
            ],
            spacing: { after: 100 }
          })
        )
      }
    })
  }

  // Quiz
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Knowledge Quiz: ', bold: true, size: 20 }),
        new TextRun({
          text: result.quiz.completed && result.quiz.data
            ? `${result.quiz.data.score}/${result.quiz.data.totalQuestions} câu đúng (${Math.round(result.quiz.percentage)}%)${result.quiz.data.timeSpentSeconds ? ` - ${Math.floor(result.quiz.data.timeSpentSeconds / 60)} phút` : ''}`
            : 'Chưa hoàn thành',
          size: 20
        })
      ],
      spacing: { after: 300 }
    })
  )

  return paragraphs
}
