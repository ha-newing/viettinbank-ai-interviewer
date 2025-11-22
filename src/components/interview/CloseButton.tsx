'use client'

import { Button } from '@/components/ui/button'

export default function CloseButton() {
  const handleClose = () => {
    window.close()
  }

  return (
    <Button
      onClick={handleClose}
      size="lg"
      className="bg-blue-600 hover:bg-blue-700"
    >
      Đóng trang
    </Button>
  )
}