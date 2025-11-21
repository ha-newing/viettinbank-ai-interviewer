import { NextRequest, NextResponse } from 'next/server'
import { submitVideoResponse } from '@/app/interview/[token]/actions'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const result = await submitVideoResponse(formData)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

  } catch (error) {
    console.error('API error in submit-response:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}