#!/usr/bin/env node

/**
 * Frame extraction script for AI interview system video analysis
 * Extracts key frames and screenshots from the interview demo video for visual analysis
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const VIDEO_PATH = "/Users/ha/projects/viettinbank-ai-interviewer/7232043183395.mp4";
const OUTPUT_DIR = "/Users/ha/projects/viettinbank-ai-interviewer/requirement_analysis/frames";
const VIDEO_DURATION = 459.5; // ~7 minutes 39 seconds

async function extractFrames() {
    console.log("🖼️  Starting frame extraction from video...");
    console.log(`Input: ${VIDEO_PATH}`);
    console.log(`Output: ${OUTPUT_DIR}`);

    try {
        // Check if input video exists
        if (!fs.existsSync(VIDEO_PATH)) {
            throw new Error(`Video file not found: ${VIDEO_PATH}`);
        }

        // Ensure output directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        const extractionTasks = [
            // 1. Extract key frames at 30-second intervals for overview
            extractIntervalFrames(),

            // 2. Extract frames from specific important moments
            extractKeyMoments(),

            // 3. Extract thumbnail from beginning
            extractThumbnail(),
        ];

        await Promise.all(extractionTasks);

        console.log("✅ All frame extraction tasks completed successfully!");
        return listExtractedFrames();

    } catch (error) {
        console.error("❌ Frame extraction failed:", error.message);
        throw error;
    }
}

async function extractIntervalFrames() {
    console.log("📐 Extracting frames at 30-second intervals...");

    // Extract one frame every 30 seconds for overview
    const ffmpegCommand = [
        'ffmpeg',
        '-i', `"${VIDEO_PATH}"`,
        '-vf', 'fps=1/30',              // One frame every 30 seconds
        '-q:v', '2',                    // High quality
        '-y',                           // Overwrite
        `"${OUTPUT_DIR}/interval_%03d.jpg"`
    ].join(' ');

    const { stdout, stderr } = await execAsync(ffmpegCommand);
    console.log("✅ Interval frames extracted");
}

async function extractKeyMoments() {
    console.log("🔑 Extracting frames from key moments...");

    // Key moments to analyze (in seconds)
    const keyMoments = [
        { time: 10, name: "intro" },           // Beginning after title
        { time: 60, name: "minute_1" },       // 1 minute mark
        { time: 120, name: "minute_2" },      // 2 minute mark
        { time: 180, name: "minute_3" },      // 3 minute mark
        { time: 240, name: "minute_4" },      // 4 minute mark
        { time: 300, name: "minute_5" },      // 5 minute mark
        { time: 360, name: "minute_6" },      // 6 minute mark
        { time: 420, name: "minute_7" },      // 7 minute mark
        { time: 450, name: "ending" },        // Near the end
    ];

    for (const moment of keyMoments) {
        const timeStr = formatTime(moment.time);
        const outputFile = `"${OUTPUT_DIR}/key_${moment.name}_${timeStr.replace(':', '-')}.jpg"`;

        const ffmpegCommand = [
            'ffmpeg',
            '-ss', timeStr,
            '-i', `"${VIDEO_PATH}"`,
            '-frames:v', '1',
            '-q:v', '1',                // Highest quality for key frames
            '-y',
            outputFile
        ].join(' ');

        await execAsync(ffmpegCommand);
        console.log(`  ✓ Key frame extracted: ${moment.name} at ${timeStr}`);
    }
}

async function extractThumbnail() {
    console.log("🎬 Extracting video thumbnail...");

    // Extract thumbnail from 30 seconds in (likely past any intro/loading)
    const ffmpegCommand = [
        'ffmpeg',
        '-ss', '00:00:30',
        '-i', `"${VIDEO_PATH}"`,
        '-frames:v', '1',
        '-q:v', '1',
        '-vf', 'scale=1280:720',        // Standardize size for thumbnail
        '-y',
        `"${OUTPUT_DIR}/thumbnail.jpg"`
    ].join(' ');

    await execAsync(ffmpegCommand);
    console.log("✅ Thumbnail extracted");
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function listExtractedFrames() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        return [];
    }

    const files = fs.readdirSync(OUTPUT_DIR)
        .filter(file => file.endsWith('.jpg'))
        .map(file => {
            const filePath = path.join(OUTPUT_DIR, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                path: filePath,
                size: stats.size,
                created: stats.birthtime
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`\n📊 Extracted ${files.length} frames:`);
    files.forEach(file => {
        const sizeKB = (file.size / 1024).toFixed(1);
        console.log(`  📁 ${file.name} (${sizeKB} KB)`);
    });

    return files;
}

// Run extraction if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    extractFrames()
        .then(frames => {
            console.log("\n🎉 Frame extraction completed successfully!");
            console.log(`📁 ${frames.length} frames ready for analysis`);
            console.log(`📂 Frames directory: ${OUTPUT_DIR}`);
        })
        .catch(error => {
            console.error("\n💥 Frame extraction failed:", error.message);
            process.exit(1);
        });
}

export { extractFrames, OUTPUT_DIR as FRAMES_DIR };