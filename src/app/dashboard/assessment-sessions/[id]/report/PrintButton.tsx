'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function PrintButton() {
  return (
    <Button onClick={() => window.print()}>
      <Download className="h-4 w-4 mr-2" />
      In báo cáo
    </Button>
  )
}
