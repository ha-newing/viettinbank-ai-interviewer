/**
 * Tests for the type-safe mock functions
 */

import {
  mockOpenAIAPI,
  mockSendGridAPI,
  mockSonioxAPI,
  mockFileUpload,
  mockMediaProcessing,
  setupCommonMocks
} from './mocks'

describe('Type-Safe Mock Functions', () => {
  describe('OpenAI Mock', () => {
    it('should create properly typed OpenAI API mock', async () => {
      const openAI = mockOpenAIAPI()

      expect(openAI).toHaveProperty('chat')
      expect(openAI.chat).toHaveProperty('completions')
      expect(openAI.chat.completions).toHaveProperty('create')

      const result = await openAI.chat.completions.create()
      expect(result).toHaveProperty('choices')
      expect(result.choices).toHaveLength(1)
      expect(result.choices[0]).toHaveProperty('message')
    })
  })

  describe('SendGrid Mock', () => {
    it('should create properly typed SendGrid API mock', async () => {
      const sendGrid = mockSendGridAPI()

      expect(sendGrid).toHaveProperty('send')

      const result = await sendGrid.send()
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toHaveProperty('statusCode', 202)
    })
  })

  describe('Soniox Mock', () => {
    it('should create properly typed Soniox API mock', async () => {
      const soniox = mockSonioxAPI()

      expect(soniox).toHaveProperty('transcribe')

      const result = await soniox.transcribe()
      expect(result).toHaveProperty('transcript')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('words')
      expect(result.transcript).toContain('Xin chào')
    })
  })

  describe('File Upload Mock', () => {
    it('should create properly typed file upload mock', async () => {
      const fileUpload = mockFileUpload()

      expect(fileUpload).toHaveProperty('uploadVideo')
      expect(fileUpload).toHaveProperty('deleteVideo')

      const uploadResult = await fileUpload.uploadVideo()
      expect(uploadResult).toHaveProperty('url')
      expect(uploadResult).toHaveProperty('size')
      expect(uploadResult).toHaveProperty('duration')

      const deleteResult = await fileUpload.deleteVideo()
      expect(deleteResult).toHaveProperty('success', true)
    })
  })

  describe('Media Processing Mock', () => {
    it('should create properly typed media processing mock', async () => {
      const mediaProcessing = mockMediaProcessing()

      expect(mediaProcessing).toHaveProperty('extractAudio')
      expect(mediaProcessing).toHaveProperty('compressVideo')

      const audioResult = await mediaProcessing.extractAudio()
      expect(audioResult).toHaveProperty('audioUrl')
      expect(audioResult).toHaveProperty('duration')

      const videoResult = await mediaProcessing.compressVideo()
      expect(videoResult).toHaveProperty('compressedUrl')
      expect(videoResult).toHaveProperty('originalSize')
      expect(videoResult).toHaveProperty('compressedSize')
    })
  })

  describe('Setup Common Mocks', () => {
    it('should setup all common mocks without errors', () => {
      const mocks = setupCommonMocks()

      expect(mocks).toHaveProperty('openAI')
      expect(mocks).toHaveProperty('sendGrid')
      expect(mocks).toHaveProperty('soniox')
      expect(mocks).toHaveProperty('fileUpload')
      expect(mocks).toHaveProperty('mediaProcessing')

      // Verify global.fetch was mocked
      expect(global.fetch).toBeDefined()
    })

    it('should have working fetch mock', async () => {
      setupCommonMocks()

      const response = await fetch('/api/interview/submit-response')
      expect(response).toHaveProperty('ok', true)
      expect(response).toHaveProperty('status', 200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
    })
  })
})