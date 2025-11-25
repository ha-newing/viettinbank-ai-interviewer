#!/usr/bin/env node

/**
 * Audio extraction script for AI interview system video analysis
 * Extracts audio from the interview demo video for transcription analysis
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const VIDEO_PATH = "/Users/ha/projects/viettinbank-ai-interviewer/7232043183395.mp4";
const OUTPUT_DIR = "/Users/ha/projects/viettinbank-ai-interviewer/requirement_analysis";
const AUDIO_OUTPUT = path.join(OUTPUT_DIR, "interview_demo_audio.wav");

async function extractAudio() {
    console.log("🎵 Starting audio extraction from video...");
    console.log(`Input: ${VIDEO_PATH}`);
    console.log(`Output: ${AUDIO_OUTPUT}`);

    try {
        // Check if input video exists
        if (!fs.existsSync(VIDEO_PATH)) {
            throw new Error(`Video file not found: ${VIDEO_PATH}`);
        }

        // Ensure output directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Extract audio with high quality
        // Using WAV format for better compatibility with transcription services
        // -vn: disable video stream
        // -acodec pcm_s16le: use PCM 16-bit little-endian (uncompressed)
        // -ar 16000: set sample rate to 16kHz (optimal for speech recognition)
        // -ac 1: mono audio (reduces file size while maintaining speech quality)
        const ffmpegCommand = [
            'ffmpeg',
            '-i', `"${VIDEO_PATH}"`,
            '-vn',                    // No video
            '-acodec', 'pcm_s16le',   // PCM 16-bit for best quality
            '-ar', '16000',           // 16kHz sample rate (optimal for speech)
            '-ac', '1',               // Mono
            '-y',                     // Overwrite output
            `"${AUDIO_OUTPUT}"`
        ].join(' ');

        console.log(`Executing: ${ffmpegCommand}`);

        const { stdout, stderr } = await execAsync(ffmpegCommand);

        if (stderr && stderr.includes('error')) {
            throw new Error(`FFmpeg error: ${stderr}`);
        }

        // Check if output file was created
        if (!fs.existsSync(AUDIO_OUTPUT)) {
            throw new Error("Audio extraction failed - output file not created");
        }

        const stats = fs.statSync(AUDIO_OUTPUT);
        console.log(`✅ Audio extraction completed successfully!`);
        console.log(`📁 Output file: ${AUDIO_OUTPUT}`);
        console.log(`📏 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`🎵 Format: WAV, 16kHz, mono, PCM 16-bit`);
        console.log(`⏱️  Ready for transcription with Soniox API`);

        return AUDIO_OUTPUT;

    } catch (error) {
        console.error("❌ Audio extraction failed:", error.message);
        throw error;
    }
}

// Run extraction if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    extractAudio()
        .then(outputPath => {
            console.log("\n🎉 Audio extraction completed successfully!");
            console.log(`📁 Audio file ready at: ${outputPath}`);
        })
        .catch(error => {
            console.error("\n💥 Audio extraction failed:", error.message);
            process.exit(1);
        });
}

export { extractAudio, AUDIO_OUTPUT };