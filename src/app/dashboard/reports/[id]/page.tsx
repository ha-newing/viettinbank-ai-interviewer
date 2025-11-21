/**
 * Individual Candidate Report Page
 * Displays comprehensive analysis of interview performance
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getCandidateReport } from './actions'
import { CandidateReportView } from '@/components/reports/CandidateReportView'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface ReportPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

async function CandidateReportContent({ interviewId }: { interviewId: string }) {
  const result = await getCandidateReport(interviewId)

  if (!result.success || !result.data) {
    notFound()
  }

  return <CandidateReportView data={result.data} />
}

function ReportLoadingSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="text-right space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Score Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-28" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimension Scores Skeleton */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary Skeleton */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function CandidateReportPage({ params }: ReportPageProps) {
  const { id: interviewId } = await params

  return (
    <Suspense fallback={<ReportLoadingSkeleton />}>
      <CandidateReportContent interviewId={interviewId} />
    </Suspense>
  )
}