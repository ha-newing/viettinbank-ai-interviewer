'use client'

import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface DeleteButtonProps {
  sessionId: string
  sessionName: string
}

export default function DeleteButton({ sessionId, sessionName }: DeleteButtonProps) {
  const handleDelete = (e: React.FormEvent) => {
    if (!confirm(`Xóa phiên "${sessionName}"? Hành động này không thể hoàn tác.`)) {
      e.preventDefault()
    }
  }

  return (
    <form action="/dashboard/assessment-sessions/delete" method="post" className="inline" onSubmit={handleDelete}>
      <input type="hidden" name="id" value={sessionId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  )
}