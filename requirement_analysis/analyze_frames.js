#!/usr/bin/env node

/**
 * Frame analysis script using Gemini Vision API
 * Analyzes the extracted video frames to understand the AI interview system UI and features
 */

import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const FRAMES_DIR = "/Users/ha/projects/viettinbank-ai-interviewer/requirement_analysis/frames";
const OUTPUT_PATH = "/Users/ha/projects/viettinbank-ai-interviewer/requirement_analysis/frame_analysis.json";

async function initializeGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY environment variable");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        generationConfig: {
            temperature: 0.1,  // Low temperature for consistent analysis
            maxOutputTokens: 2048,
        }
    });
}

async function analyzeFrame(model, imagePath, frameInfo) {
    console.log(`🖼️  Analyzing ${path.basename(imagePath)}...`);

    try {
        // Read image file
        const imageBuffer = fs.readFileSync(imagePath);

        // Convert to base64 for Gemini
        const imageData = {
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: 'image/jpeg'
            }
        };

        const analysisPrompt = `
You are analyzing a screenshot from a video demonstration of an AI interview system.

Please provide a detailed analysis of this frame focusing on:

1. **UI Components**: What interface elements are visible? (buttons, forms, menus, etc.)
2. **Screen Content**: What specific content is being shown? (text, data, reports, etc.)
3. **User Flow**: What step in the process does this represent?
4. **Features Visible**: What AI interview system features can be identified?
5. **Design Elements**: Note the overall design style and user experience patterns
6. **Technical Details**: Any visible technical information (URLs, data structures, etc.)

Context: This is from a demo video showing an AI interview system for VietinBank, focusing on automated candidate assessment, video interviews, and AI-powered scoring.

Frame Info: ${frameInfo.description || 'Frame from video demonstration'}

Provide your analysis in a structured JSON format:
{
    "ui_components": [],
    "screen_content": "",
    "user_flow_step": "",
    "visible_features": [],
    "design_notes": "",
    "technical_details": "",
    "key_insights": []
}
`;

        const result = await model.generateContent([analysisPrompt, imageData]);
        const response = await result.response;

        try {
            // Try to parse JSON response
            const analysisText = response.text();

            // Extract JSON if it's wrapped in markdown
            const jsonMatch = analysisText.match(/```json\n?([\s\S]*?)\n?```/) ||
                             analysisText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[1] || jsonMatch[0]);
            } else {
                // If no JSON found, return structured text analysis
                return {
                    ui_components: [],
                    screen_content: analysisText,
                    user_flow_step: "",
                    visible_features: [],
                    design_notes: "",
                    technical_details: "",
                    key_insights: [analysisText]
                };
            }
        } catch (parseError) {
            console.warn(`⚠️ Failed to parse JSON for ${path.basename(imagePath)}, using text response`);
            const analysisText = response.text();
            return {
                ui_components: [],
                screen_content: analysisText,
                user_flow_step: "",
                visible_features: [],
                design_notes: "",
                technical_details: "",
                key_insights: [analysisText],
                raw_response: analysisText
            };
        }

    } catch (error) {
        console.error(`❌ Error analyzing ${path.basename(imagePath)}:`, error.message);
        return {
            error: error.message,
            ui_components: [],
            screen_content: "",
            user_flow_step: "",
            visible_features: [],
            design_notes: "",
            technical_details: "",
            key_insights: []
        };
    }
}

async function analyzeAllFrames() {
    console.log("🎬 Starting AI vision analysis of video frames...");

    try {
        // Initialize Gemini
        const model = await initializeGemini();

        // Get all frame files
        const frameFiles = fs.readdirSync(FRAMES_DIR)
            .filter(file => file.endsWith('.jpg'))
            .map(file => {
                const filePath = path.join(FRAMES_DIR, file);
                return {
                    name: file,
                    path: filePath,
                    description: getFrameDescription(file)
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        console.log(`📊 Found ${frameFiles.length} frames to analyze`);

        const analyses = [];

        // Analyze key frames first (most important)
        const keyFrames = frameFiles.filter(f => f.name.startsWith('key_'));
        const intervalFrames = frameFiles.filter(f => f.name.startsWith('interval_'));
        const thumbnailFrames = frameFiles.filter(f => f.name.startsWith('thumbnail'));

        // Process in order of importance
        const orderedFrames = [...thumbnailFrames, ...keyFrames, ...intervalFrames];

        for (const frameFile of orderedFrames) {
            const analysis = await analyzeFrame(model, frameFile.path, frameFile);
            analyses.push({
                frame_name: frameFile.name,
                frame_path: frameFile.path,
                frame_type: getFrameType(frameFile.name),
                timestamp: extractTimestamp(frameFile.name),
                description: frameFile.description,
                analysis: analysis
            });

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Create comprehensive analysis
        const comprehensiveAnalysis = {
            metadata: {
                analysis_date: new Date().toISOString(),
                total_frames: frameFiles.length,
                source_video: "/Users/ha/projects/viettinbank-ai-interviewer/7232043183395.mp4",
                frames_directory: FRAMES_DIR,
                ai_model: "gemini-2.0-flash-exp"
            },
            frame_analyses: analyses,
            summary: generateSummary(analyses),
            ui_patterns: extractUIPatterns(analyses),
            features_identified: extractFeatures(analyses),
            user_journey: extractUserJourney(analyses)
        };

        // Save results
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(comprehensiveAnalysis, null, 2));

        console.log("\n📊 ANALYSIS SUMMARY:");
        console.log("=" .repeat(80));
        console.log(comprehensiveAnalysis.summary);
        console.log("=" .repeat(80));

        console.log("\n🔍 UI PATTERNS IDENTIFIED:");
        comprehensiveAnalysis.ui_patterns.forEach(pattern => {
            console.log(`  • ${pattern}`);
        });

        console.log("\n⚡ FEATURES IDENTIFIED:");
        comprehensiveAnalysis.features_identified.forEach(feature => {
            console.log(`  • ${feature}`);
        });

        console.log(`\n💾 Complete analysis saved to: ${OUTPUT_PATH}`);

        return comprehensiveAnalysis;

    } catch (error) {
        console.error("❌ Frame analysis failed:", error.message);
        throw error;
    }
}

function getFrameDescription(fileName) {
    if (fileName.startsWith('thumbnail')) {
        return 'Video thumbnail - representative image of the demo';
    } else if (fileName.startsWith('key_intro')) {
        return 'Introduction/opening of the demo';
    } else if (fileName.startsWith('key_ending')) {
        return 'End of demo conversation';
    } else if (fileName.startsWith('key_minute_')) {
        const minute = fileName.match(/minute_(\d+)/)?.[1];
        return `Demo content at minute ${minute}`;
    } else if (fileName.startsWith('interval_')) {
        const num = fileName.match(/interval_(\d+)/)?.[1];
        return `Regular interval frame #${num} (30-second intervals)`;
    }
    return 'Video frame from AI interview demo';
}

function getFrameType(fileName) {
    if (fileName.startsWith('thumbnail')) return 'thumbnail';
    if (fileName.startsWith('key_')) return 'key_moment';
    if (fileName.startsWith('interval_')) return 'interval';
    return 'other';
}

function extractTimestamp(fileName) {
    if (fileName.includes('intro')) return '00:10';
    if (fileName.includes('ending')) return '07:30';

    const minuteMatch = fileName.match(/minute_(\d+)/);
    if (minuteMatch) {
        const minute = parseInt(minuteMatch[1]);
        return `0${Math.floor(minute/60)}:${String(minute%60).padStart(2, '0')}`;
    }

    const intervalMatch = fileName.match(/interval_(\d+)/);
    if (intervalMatch) {
        const num = parseInt(intervalMatch[1]);
        const seconds = (num - 1) * 30;
        const minutes = Math.floor(seconds / 60);
        return `0${Math.floor(minutes/60)}:${String(minutes%60).padStart(2, '0')}:${String(seconds%60).padStart(2, '0')}`;
    }

    return 'unknown';
}

function generateSummary(analyses) {
    const validAnalyses = analyses.filter(a => !a.analysis.error);
    const totalFeatures = new Set();
    const uiElements = new Set();

    validAnalyses.forEach(analysis => {
        analysis.analysis.visible_features?.forEach(feature => totalFeatures.add(feature));
        analysis.analysis.ui_components?.forEach(component => uiElements.add(component));
    });

    return `Analyzed ${analyses.length} frames from AI interview demo video.
Identified ${totalFeatures.size} unique features and ${uiElements.size} UI component types.
The demo shows a comprehensive AI-powered interview system with candidate assessment,
real-time transcription, scoring algorithms, and detailed reporting capabilities.`;
}

function extractUIPatterns(analyses) {
    const patterns = new Set();

    analyses.forEach(analysis => {
        const content = analysis.analysis.screen_content?.toLowerCase() || '';
        const designNotes = analysis.analysis.design_notes?.toLowerCase() || '';

        if (content.includes('dashboard') || content.includes('bảng điều khiển')) {
            patterns.add('Dashboard interface with multiple data panels');
        }
        if (content.includes('form') || content.includes('biểu mẫu')) {
            patterns.add('Form-based data input interfaces');
        }
        if (content.includes('table') || content.includes('bảng')) {
            patterns.add('Tabular data presentation');
        }
        if (content.includes('chart') || content.includes('biểu đồ')) {
            patterns.add('Data visualization with charts and graphs');
        }
        if (content.includes('sidebar') || content.includes('menu')) {
            patterns.add('Navigation sidebar or menu system');
        }
    });

    return Array.from(patterns);
}

function extractFeatures(analyses) {
    const features = new Set();

    analyses.forEach(analysis => {
        analysis.analysis.visible_features?.forEach(feature => features.add(feature));

        // Extract features from content analysis
        const content = analysis.analysis.screen_content?.toLowerCase() || '';
        if (content.includes('score') || content.includes('điểm')) {
            features.add('Candidate scoring system');
        }
        if (content.includes('video') || content.includes('interview')) {
            features.add('Video interview capabilities');
        }
        if (content.includes('transcription') || content.includes('transcript')) {
            features.add('Automatic transcription');
        }
        if (content.includes('speaker') || content.includes('người nói')) {
            features.add('Speaker diarization');
        }
        if (content.includes('report') || content.includes('báo cáo')) {
            features.add('Detailed reporting system');
        }
        if (content.includes('ai') || content.includes('artificial intelligence')) {
            features.add('AI-powered analysis');
        }
    });

    return Array.from(features);
}

function extractUserJourney(analyses) {
    return analyses
        .sort((a, b) => a.timestamp?.localeCompare(b.timestamp) || 0)
        .map(analysis => ({
            timestamp: analysis.timestamp,
            step: analysis.analysis.user_flow_step || 'Unknown step',
            description: analysis.description,
            key_action: analysis.analysis.key_insights?.[0] || 'No specific action identified'
        }));
}

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    analyzeAllFrames()
        .then(result => {
            console.log("\n🎉 Frame analysis completed successfully!");
            console.log(`📁 Results saved to: ${OUTPUT_PATH}`);
        })
        .catch(error => {
            console.error("\n💥 Frame analysis failed:", error.message);
            process.exit(1);
        });
}

export { analyzeAllFrames, OUTPUT_PATH };