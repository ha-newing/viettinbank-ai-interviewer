'use client'

import { Button } from '@/components/ui/button'
import { Download, FileText, Printer } from 'lucide-react'
import { useState } from 'react'

interface ReportActionsProps {
  sessionId: string
}

export default function ReportActions({ sessionId }: ReportActionsProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownloadDocx = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`/api/assessment-sessions/${sessionId}/export-docx`)
      if (!response.ok) {
        throw new Error('Failed to download report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      // Get filename from Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'report.docx'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i)
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1])
        }
      }

      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading report:', error)
      alert('Không thể tải báo cáo. Vui lòng thử lại.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="h-4 w-4 mr-2" />
        In báo cáo
      </Button>
      <Button onClick={handleDownloadDocx} disabled={downloading}>
        <FileText className="h-4 w-4 mr-2" />
        {downloading ? 'Đang tải...' : 'Tải DOCX'}
      </Button>
    </div>
  )
}
