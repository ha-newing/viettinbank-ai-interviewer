/**
 * Mock utilities for external services and APIs
 */

import { jest } from '@jest/globals'

/**
 * OpenAI API response type
 */
export interface OpenAICompletionResponse {
  choices: Array<{
    message: {
      content: string | null
    }
  }>
}

/**
 * Mock OpenAI API responses
 */
export function mockOpenAIAPI() {
  const mockCompletion: OpenAICompletionResponse = {
    choices: [{
      message: {
        content: JSON.stringify({
          score: 75,
          level: 'Good',
          analysis: 'Ứng viên thể hiện tốt trong lĩnh vực này.',
          strengths: ['Kinh nghiệm tốt', 'Giao tiếp rõ ràng'],
          areas_for_improvement: ['Cần cải thiện kỹ năng kỹ thuật'],
          reasoning: 'Đánh giá dựa trên nội dung trả lời và cách trình bày.'
        })
      }
    }]
  }

  return {
    chat: {
      completions: {
        create: jest.fn(() => Promise.resolve(mockCompletion))
      }
    }
  }
}

export type OpenAIAPI = ReturnType<typeof mockOpenAIAPI>

/**
 * Mock overall summary response from OpenAI
 */
export function mockOpenAISummaryResponse() {
  return JSON.stringify({
    overall_summary: 'Ứng viên có tiềm năng tốt cho vị trí Senior Java Developer.',
    recommendation: 'CONSIDER',
    recommendation_reasoning: 'Cần đánh giá thêm ở vòng phỏng vấn trực tiếp.',
    key_strengths: [
      'Kinh nghiệm ngành ngân hàng',
      'Kỹ năng giao tiếp tốt'
    ],
    key_concerns: [
      'Thiếu kinh nghiệm về microservices',
      'Cần cải thiện kỹ năng leadership'
    ],
    next_steps: [
      'Phỏng vấn kỹ thuật chi tiết',
      'Đánh giá kỹ năng team management'
    ]
  })
}

/**
 * SendGrid API response type
 */
export interface SendGridResponse {
  statusCode: number
  body: string
  headers: Record<string, string>
}

/**
 * Mock SendGrid email service
 */
export function mockSendGridAPI() {
  const mockResponse: SendGridResponse[] = [{
    statusCode: 202,
    body: '',
    headers: {}
  }]

  return {
    send: jest.fn(() => Promise.resolve(mockResponse))
  }
}

export type SendGridAPI = ReturnType<typeof mockSendGridAPI>

/**
 * Soniox transcription response type
 */
export interface SonioxWord {
  word: string
  start_time: number
  end_time: number
  confidence: number
}

export interface SonioxTranscriptionResponse {
  transcript: string
  confidence: number
  words: SonioxWord[]
}

/**
 * Mock Soniox speech-to-text API
 */
export function mockSonioxAPI() {
  const mockResponse: SonioxTranscriptionResponse = {
    transcript: 'Xin chào, tôi tên là Nguyễn Văn A. Tôi có 3 năm kinh nghiệm làm việc trong ngành tài chính ngân hàng.',
    confidence: 0.95,
    words: [
      { word: 'Xin', start_time: 0.0, end_time: 0.5, confidence: 0.98 },
      { word: 'chào', start_time: 0.5, end_time: 1.0, confidence: 0.97 }
    ]
  }

  return {
    transcribe: jest.fn(() => Promise.resolve(mockResponse))
  }
}

export type SonioxAPI = ReturnType<typeof mockSonioxAPI>

/**
 * Mock Response interface
 */
interface MockResponse {
  ok: boolean
  status: number
  statusText: string
  headers: Headers
  redirected: boolean
  type: ResponseType
  url: string
  body: ReadableStream<Uint8Array> | null
  bodyUsed: boolean
  json: () => Promise<any>
  text: () => Promise<string>
  blob: () => Promise<Blob>
  arrayBuffer: () => Promise<ArrayBuffer>
  formData: () => Promise<FormData>
  clone: () => MockResponse
}

/**
 * Mock fetch for API calls
 */
export function mockFetch() {
  function createMockResponse(data: any, status = 200, ok = true): MockResponse {
    return {
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      headers: new Headers(),
      redirected: false,
      type: 'basic' as ResponseType,
      url: 'http://localhost',
      body: null,
      bodyUsed: false,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      blob: () => Promise.resolve(new Blob()),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      formData: () => Promise.resolve(new FormData()),
      clone: () => createMockResponse(data, status, ok)
    }
  }

  return jest.fn((input: RequestInfo | URL, init?: RequestInit): Promise<MockResponse> => {
    const url = typeof input === 'string' ? input : input.toString()

    // Mock successful responses based on URL patterns
    if (url.includes('/api/interview/submit-response')) {
      return Promise.resolve(createMockResponse({
        success: true,
        message: 'Response submitted successfully'
      }))
    }

    if (url.includes('/api/interview/evaluate')) {
      return Promise.resolve(createMockResponse({
        success: true,
        evaluation: {
          overall_score: 78,
          recommendation: 'CONSIDER',
          processing_time_ms: 2500
        }
      }))
    }

    // Default mock response
    return Promise.resolve(createMockResponse({ success: true }))
  })
}

/**
 * File upload response types
 */
export interface VideoUploadResponse {
  url: string
  size: number
  duration: number
}

export interface DeleteVideoResponse {
  success: boolean
}

/**
 * Mock file upload functionality
 */
export function mockFileUpload() {
  return {
    uploadVideo: jest.fn(() => Promise.resolve({
      url: 'https://example.com/video/test-video.mp4',
      size: 1024000,
      duration: 120
    })),
    deleteVideo: jest.fn(() => Promise.resolve({
      success: true
    }))
  }
}

export type FileUploadAPI = ReturnType<typeof mockFileUpload>

/**
 * Media processing response types
 */
export interface AudioExtractionResponse {
  audioUrl: string
  duration: number
}

export interface VideoCompressionResponse {
  compressedUrl: string
  originalSize: number
  compressedSize: number
}

/**
 * Mock video/audio processing
 */
export function mockMediaProcessing() {
  return {
    extractAudio: jest.fn(() => Promise.resolve({
      audioUrl: 'https://example.com/audio/test-audio.wav',
      duration: 120
    })),
    compressVideo: jest.fn(() => Promise.resolve({
      compressedUrl: 'https://example.com/video/compressed.mp4',
      originalSize: 10240000,
      compressedSize: 5120000
    }))
  }
}

export type MediaProcessingAPI = ReturnType<typeof mockMediaProcessing>

/**
 * Mock environment variables for testing
 */
export function mockEnvironmentVariables() {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: 'test-openai-key',
      SENDGRID_API_KEY: 'test-sendgrid-key',
      SONIOX_API_KEY: 'test-soniox-key',
      DATABASE_URL: ':memory:',
      NEXTAUTH_SECRET: 'test-secret'
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })
}

/**
 * Mock WebRTC MediaRecorder for browser testing
 */
export function mockMediaRecorder() {
  const mockMediaRecorder = {
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    state: 'inactive',
    mimeType: 'video/mp4',
    ondataavailable: null,
    onerror: null,
    onpause: null,
    onresume: null,
    onstart: null,
    onstop: null
  }

  // Mock getUserMedia
  const mockStream = {
    getTracks: () => [{
      stop: jest.fn(),
      kind: 'video',
      enabled: true
    }],
    getVideoTracks: () => [{
      stop: jest.fn(),
      kind: 'video',
      enabled: true
    }],
    getAudioTracks: () => [{
      stop: jest.fn(),
      kind: 'audio',
      enabled: true
    }]
  }
  const mockGetUserMedia = jest.fn(() => Promise.resolve(mockStream))

  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: mockGetUserMedia
    }
  })

  Object.defineProperty(global, 'MediaRecorder', {
    writable: true,
    value: jest.fn().mockImplementation(() => mockMediaRecorder)
  })

  return {
    mediaRecorder: mockMediaRecorder,
    getUserMedia: mockGetUserMedia
  }
}

/**
 * Common mocks interface
 */
export interface CommonMocks {
  openAI: OpenAIAPI
  sendGrid: SendGridAPI
  soniox: SonioxAPI
  fileUpload: FileUploadAPI
  mediaProcessing: MediaProcessingAPI
}

/**
 * Setup common mocks for all tests
 */
export function setupCommonMocks(): CommonMocks {
  // Mock console to reduce test output
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'info').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})

  // Mock fetch
  Object.defineProperty(global, 'fetch', {
    value: mockFetch(),
    writable: true
  })

  return {
    openAI: mockOpenAIAPI(),
    sendGrid: mockSendGridAPI(),
    soniox: mockSonioxAPI(),
    fileUpload: mockFileUpload(),
    mediaProcessing: mockMediaProcessing()
  }
}