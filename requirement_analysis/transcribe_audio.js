#!/usr/bin/env node

/**
 * Audio transcription script for AI interview system analysis
 * Uses Soniox API to transcribe the extracted audio with speaker diarization
 * Based on the async transcription examples in technical_reference/soniox.md
 */

import fs from "fs";
import process from "process";
import path from "path";

const SONIOX_API_BASE_URL = "https://api.soniox.com";
const AUDIO_PATH = "/Users/ha/projects/viettinbank-ai-interviewer/requirement_analysis/interview_demo_audio.wav";
const OUTPUT_PATH = "/Users/ha/projects/viettinbank-ai-interviewer/requirement_analysis/transcription.json";

// Get Soniox STT config optimized for interview analysis
function getConfig(audioUrl, fileId) {
  const config = {
    // Use the best async model
    model: "stt-async-preview",

    // Set language hints for English and Vietnamese as specified
    language_hints: ["en", "vi"],

    // Enable language identification for multilingual support
    enable_language_identification: true,

    // Enable speaker diarization to identify different speakers (interviewer vs candidate)
    enable_speaker_diarization: true,

    // Set context for AI interview terminology to improve accuracy
    context: `
      AI interview system, artificial intelligence, candidate assessment,
      interview questions, video conferencing, recruitment technology,
      VietinBank, banking interview, technical assessment, behavioral questions,
      machine learning, natural language processing, automated screening,
      candidate evaluation, interview platform, HR technology, talent acquisition
    `,

    // Optional identifier to track this request
    client_reference_id: "viettinbank_ai_interview_demo_analysis",

    // Audio source
    audio_url: audioUrl,
    file_id: fileId,
  };

  return config;
}

// Adds Soniox API_KEY to each request
async function apiFetch(endpoint, { method = "GET", body, headers = {} } = {}) {
  const apiKey = process.env.SONIOX_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing SONIOX_API_KEY.\n" +
        "1. Get your API key at https://console.soniox.com\n" +
        "2. Set SONIOX_API_KEY in your .env file",
    );
  }

  const res = await fetch(`${SONIOX_API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...headers,
    },
    body,
  });

  if (!res.ok) {
    const msg = await res.text();
    console.log(msg);
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${msg}`);
  }

  return method !== "DELETE" ? res.json() : null;
}

async function uploadAudio(audioPath) {
  console.log("📤 Starting file upload...");

  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(audioPath)]), path.basename(audioPath));

  const res = await apiFetch("/v1/files", {
    method: "POST",
    body: form,
  });

  console.log(`✅ File uploaded. ID: ${res.id}`);
  return res.id;
}

async function createTranscription(config) {
  console.log("🎤 Creating transcription job...");
  const res = await apiFetch("/v1/transcriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  console.log(`✅ Transcription job created. ID: ${res.id}`);
  return res.id;
}

async function waitUntilCompleted(transcriptionId) {
  console.log("⏳ Waiting for transcription to complete...");
  let attempts = 0;
  const maxAttempts = 120; // 2 minutes max wait time

  while (attempts < maxAttempts) {
    const res = await apiFetch(`/v1/transcriptions/${transcriptionId}`);

    console.log(`  Status: ${res.status} (attempt ${attempts + 1}/${maxAttempts})`);

    if (res.status === "completed") {
      console.log("✅ Transcription completed!");
      return;
    }

    if (res.status === "error") {
      throw new Error(`Transcription failed: ${res.error_message}`);
    }

    attempts++;
    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error("Transcription timed out");
}

async function getTranscription(transcriptionId) {
  console.log("📜 Retrieving transcription results...");
  return apiFetch(`/v1/transcriptions/${transcriptionId}/transcript`);
}

async function deleteTranscription(transcriptionId) {
  await apiFetch(`/v1/transcriptions/${transcriptionId}`, { method: "DELETE" });
  console.log("🗑️ Transcription deleted from server");
}

async function deleteFile(fileId) {
  await apiFetch(`/v1/files/${fileId}`, { method: "DELETE" });
  console.log("🗑️ Audio file deleted from server");
}

// Convert tokens into a readable transcript with speaker and language info
function renderTokens(finalTokens) {
  const textParts = [];
  let currentSpeaker = null;
  let currentLanguage = null;

  // Process all tokens in order
  for (const token of finalTokens) {
    let { text } = token;
    const speaker = token.speaker;
    const language = token.language;

    // Speaker changed -> add a speaker tag
    if (speaker !== undefined && speaker !== currentSpeaker) {
      if (currentSpeaker !== null) textParts.push("\n\n");
      currentSpeaker = speaker;
      currentLanguage = null; // Reset language on speaker changes
      textParts.push(`Speaker ${currentSpeaker}:`);
    }

    // Language changed -> add a language tag
    if (language !== undefined && language !== currentLanguage) {
      currentLanguage = language;
      textParts.push(`\n[${currentLanguage}] `);
      text = text.trimStart();
    }

    textParts.push(text);
  }
  return textParts.join("");
}

async function transcribeAudioFile(audioPath) {
  let fileId = null;

  console.log("🎵 Starting AI interview demo audio transcription...");
  console.log(`📁 Input: ${audioPath}`);

  try {
    // Check if audio file exists
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    const stats = fs.statSync(audioPath);
    console.log(`📏 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // Upload audio file
    fileId = await uploadAudio(audioPath);

    // Create transcription job
    const config = getConfig(null, fileId);
    const transcriptionId = await createTranscription(config);

    // Wait for completion
    await waitUntilCompleted(transcriptionId);

    // Get results
    const result = await getTranscription(transcriptionId);

    // Render readable transcript
    const transcript = renderTokens(result.tokens);

    // Save both raw results and formatted transcript
    const output = {
      metadata: {
        source_video: "/Users/ha/projects/viettinbank-ai-interviewer/7232043183395.mp4",
        audio_file: audioPath,
        transcription_date: new Date().toISOString(),
        model: "stt-async-preview",
        language_hints: ["en", "vi"],
        features: {
          speaker_diarization: true,
          language_identification: true,
          context_aware: true
        },
        file_size_mb: (stats.size / 1024 / 1024).toFixed(2),
        duration_seconds: Math.round(result.tokens.length > 0 ? result.tokens[result.tokens.length - 1].end_time : 0)
      },
      transcript: transcript,
      raw_tokens: result.tokens,
      statistics: {
        total_tokens: result.tokens.length,
        speakers_detected: [...new Set(result.tokens.map(t => t.speaker).filter(Boolean))],
        languages_detected: [...new Set(result.tokens.map(t => t.language).filter(Boolean))]
      }
    };

    // Save to file
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

    console.log("\n📜 TRANSCRIPT:");
    console.log("=" .repeat(80));
    console.log(transcript);
    console.log("=" .repeat(80));

    console.log(`\n📊 STATISTICS:`);
    console.log(`  🎯 Total tokens: ${output.statistics.total_tokens}`);
    console.log(`  👥 Speakers: ${output.statistics.speakers_detected.join(', ')}`);
    console.log(`  🌍 Languages: ${output.statistics.languages_detected.join(', ')}`);
    console.log(`  ⏱️  Duration: ${output.metadata.duration_seconds} seconds`);

    console.log(`\n💾 Full results saved to: ${OUTPUT_PATH}`);

    // Clean up server files
    await deleteTranscription(transcriptionId);
    if (fileId) await deleteFile(fileId);

    return output;

  } catch (error) {
    console.error("❌ Transcription failed:", error.message);

    // Try to clean up on error
    if (fileId) {
      try {
        await deleteFile(fileId);
      } catch (cleanupError) {
        console.error("⚠️ Failed to cleanup uploaded file:", cleanupError.message);
      }
    }

    throw error;
  }
}

// Run transcription if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  transcribeAudioFile(AUDIO_PATH)
    .then(result => {
      console.log("\n🎉 Transcription completed successfully!");
      console.log(`📁 Results saved to: ${OUTPUT_PATH}`);
    })
    .catch(error => {
      console.error("\n💥 Transcription failed:", error.message);
      process.exit(1);
    });
}

export { transcribeAudioFile, OUTPUT_PATH };