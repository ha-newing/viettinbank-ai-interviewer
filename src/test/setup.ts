/**
 * Global test setup file
 */

import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.SENDGRID_API_KEY = 'test-sendgrid-key'
process.env.SONIOX_API_KEY = 'test-soniox-key'

// Mock Next.js cookies function
const mockCookieStore = {
  get: jest.fn((name: string) => ({ value: `test-${name}-value` })),
  set: jest.fn(),
  delete: jest.fn()
}

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve(mockCookieStore))
}))

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock fetch for API calls
global.fetch = jest.fn()

// Set up timezone for consistent date testing
process.env.TZ = 'Asia/Ho_Chi_Minh'

beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(() => {
  jest.restoreAllMocks()
})