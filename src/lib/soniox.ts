/**
 * Soniox API Client for Vietnamese Speech-to-Text
 * Based on the technical reference documentation
 */

import { Readable } from 'stream'

interface SonioxConfig {
  apiKey: string
  model?: string
  language?: string[]
  enableSpeakerDiarization?: boolean
  enablePunctuation?: boolean
  includeNonSpeech?: boolean
}

interface SonioxWord {
  text: string
  start: number
  duration: number
  speaker?: string
}

interface SonioxResult {
  text: string
  words: SonioxWord[]
  speakers?: {
    [speakerId: string]: {
      text: string
      duration: number
      segments: Array<{ start: number; duration: number; text: string }>
    }
  }
  confidence?: number
  processingTime?: number
}

interface SonioxTranscribeResponse {
  result?: {
    final?: boolean
    alternatives?: Array<{
      transcript?: string
      confidence?: number
      words?: Array<{
        word?: string
        start_time?: number
        duration?: number
        speaker_id?: string
      }>
    }>
  }
  error?: {
    code?: number
    message?: string
  }
}

export class SonioxClient {
  private apiKey: string
  private config: SonioxConfig

  constructor(config: SonioxConfig) {
    this.apiKey = config.apiKey
    this.config = {
      model: 'vi_v1', // Vietnamese model
      language: ['vi', 'en'], // Vietnamese with English fallback
      enableSpeakerDiarization: true,
      enablePunctuation: true,
      includeNonSpeech: false,
      ...config
    }
  }

  /**
   * Transcribe audio file with Vietnamese speech recognition
   */
  async transcribeAudio(audioBuffer: Buffer, options?: Partial<SonioxConfig>): Promise<SonioxResult> {
    try {

      const config = { ...this.config, ...options }

      // Prepare request payload
      const requestPayload = {
        model: config.model,
        language: config.language,
        enable_speaker_diarization: config.enableSpeakerDiarization,
        enable_punctuation: config.enablePunctuation,
        include_non_speech: config.includeNonSpeech,
        audio_format: 'wav', // We'll convert to WAV format
      }

      const formData = new FormData()

      // Add configuration
      formData.append('config', JSON.stringify(requestPayload))

      // Add audio file
      const audioArrayBuffer = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer
      const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/wav' })
      formData.append('audio', audioBlob, 'interview_audio.wav')

      console.log('📤 Sending audio to Soniox API for Vietnamese transcription...')

      const response = await fetch('https://api.soniox.com/transcribe-async', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Soniox API error: ${response.status} - ${errorText}`)
      }

      const result: SonioxTranscribeResponse = await response.json()

      if (result.error) {
        throw new Error(`Soniox transcription error: ${result.error.message}`)
      }

      return this.parseTranscriptionResult(result)

    } catch (error) {
      console.error('❌ Soniox transcription failed:', error)
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Transcribe audio stream (for real-time processing)
   */
  async transcribeStream(audioStream: ReadableStream): Promise<SonioxResult> {
    // Implementation for streaming transcription
    // This would be used for real-time transcription during interviews
    throw new Error('Streaming transcription not implemented yet')
  }

  /**
   * Parse Soniox API response into structured result
   */
  private parseTranscriptionResult(response: SonioxTranscribeResponse): SonioxResult {
    if (!response.result?.alternatives || response.result.alternatives.length === 0) {
      return {
        text: '',
        words: [],
        confidence: 0,
      }
    }

    const primary = response.result.alternatives[0]
    const text = primary.transcript || ''
    const confidence = primary.confidence || 0

    // Parse words with timing and speaker information
    const words: SonioxWord[] = (primary.words || []).map(word => ({
      text: word.word || '',
      start: word.start_time || 0,
      duration: word.duration || 0,
      speaker: word.speaker_id || undefined,
    }))

    // Group by speakers if diarization is enabled
    const speakers: { [speakerId: string]: any } = {}
    if (this.config.enableSpeakerDiarization) {
      words.forEach(word => {
        if (word.speaker) {
          if (!speakers[word.speaker]) {
            speakers[word.speaker] = {
              text: '',
              duration: 0,
              segments: []
            }
          }
          speakers[word.speaker].text += word.text + ' '
          speakers[word.speaker].duration += word.duration
        }
      })
    }

    return {
      text: text.trim(),
      words,
      speakers: Object.keys(speakers).length > 0 ? speakers : undefined,
      confidence,
    }
  }

  /**
   * Get transcription status for async jobs
   */
  async getTranscriptionStatus(jobId: string): Promise<any> {
    try {
      const response = await fetch(`https://api.soniox.com/transcribe-async/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('❌ Failed to check transcription status:', error)
      throw error
    }
  }
}

/**
 * Create Soniox client instance with environment configuration
 */
export function createSonioxClient(): SonioxClient {
  const apiKey = process.env.SONIOX_API_KEY

  if (!apiKey) {
    throw new Error('SONIOX_API_KEY environment variable is required')
  }

  return new SonioxClient({
    apiKey,
    model: 'vi_v1', // Vietnamese model
    language: ['vi', 'en'], // Vietnamese primary, English fallback
    enableSpeakerDiarization: true, // Detect multiple speakers
    enablePunctuation: true, // Add punctuation
    includeNonSpeech: false, // Exclude filler sounds
  })
}

/**
 * Extract audio from video buffer (simplified - in production use FFmpeg)
 */
export async function extractAudioFromVideo(videoBuffer: Buffer): Promise<Buffer> {
  // In a real implementation, you would use FFmpeg to extract audio
  // For now, we'll assume the video is already in a compatible format
  // or use a WebRTC audio-only recording

  console.log('🎵 Extracting audio from video buffer...')

  // Placeholder: In production, use FFmpeg or similar
  // For now, return the buffer as-is (assuming it's audio-compatible)
  return videoBuffer
}

/**
 * Convert various audio formats to WAV (Soniox preferred format)
 */
export async function convertToWav(audioBuffer: Buffer): Promise<Buffer> {
  // In production, use FFmpeg to convert to WAV format
  console.log('🔄 Converting audio to WAV format...')

  // Placeholder implementation
  return audioBuffer
}

/**
 * Estimate transcription cost based on audio duration
 */
export function estimateTranscriptionCost(durationSeconds: number): {
  estimatedCost: number
  currency: string
  billingMinutes: number
} {
  // Soniox typically bills per minute with minimum billing units
  const billingMinutes = Math.ceil(durationSeconds / 60)
  const costPerMinute = 0.01 // Example rate - check actual Soniox pricing

  return {
    estimatedCost: billingMinutes * costPerMinute,
    currency: 'USD',
    billingMinutes,
  }
}