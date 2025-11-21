import { NextRequest, NextResponse } from 'next/server'
import { getInterviewStatus } from '@/app/interview/[token]/actions'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Interview ID is required'
      }, { status: 400 })
    }

    const result = await getInterviewStatus(id)

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
      }, { status: 404 })
    }

  } catch (error) {
    console.error('API error in interview status:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}