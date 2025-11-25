import { useState, useCallback, useRef, useEffect } from "react";
import {
  SonioxClient,
  type ErrorStatus,
  type RecorderState,
  type Token,
  isActiveState,
} from "@soniox/speech-to-text-web";

export interface SpeakerSegment {
  speaker: number;
  text: string;
  startTime: number;
  endTime: number;
  tokens: Token[];
}

interface UseSpeakerDiarizationOptions {
  getApiKey: (sessionId: string) => Promise<string>;
  sessionId: string;
  onTranscriptUpdate?: (segments: SpeakerSegment[], speakerMapping: Map<number, string>) => void;
  onSessionStarted?: () => void;
  onSessionFinished?: () => void;
}

export default function useSpeakerDiarization({
  getApiKey,
  sessionId,
  onTranscriptUpdate,
  onSessionStarted,
  onSessionFinished,
}: UseSpeakerDiarizationOptions) {
  const [state, setState] = useState<RecorderState>('Init');
  const [segments, setSegments] = useState<SpeakerSegment[]>([]);
  const [speakerMapping, setSpeakerMapping] = useState<Map<number, string>>(new Map());
  const [error, setError] = useState<{ status: ErrorStatus; message: string; errorCode: number | undefined } | null>(null);
  
  const clientRef = useRef<SonioxClient | null>(null);
  const keepAliveRef = useRef<NodeJS.Timeout | null>(null);
  const allTokensRef = useRef<Token[]>([]);
  const identificationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastIdentificationTimeRef = useRef<number>(0);
  const identificationInProgressRef = useRef<boolean>(false);
  const speakerMappingRef = useRef<Map<number, string>>(new Map());
  const identificationHistoryRef = useRef<Map<number, string[]>>(new Map()); // Track identification history
  const confirmedSpeakersRef = useRef<Set<number>>(new Set()); // Track confirmed speakers
  const sessionStartTimeRef = useRef<number>(0);
  const manualCorrectionsRef = useRef<Map<number, string>>(new Map()); // Track manual corrections

  // Initialize client
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new SonioxClient({
        apiKey: () => getApiKey(sessionId),
      });
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.cancel();
        clientRef.current = null;
      }
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
      }
      if (identificationIntervalRef.current) {
        clearInterval(identificationIntervalRef.current);
        identificationIntervalRef.current = null;
      }
    };
  }, [sessionId, getApiKey]);

  // Process tokens to create speaker segments
  const processTokensIntoSegments = useCallback((tokens: Token[]): SpeakerSegment[] => {
    const newSegments: SpeakerSegment[] = [];
    let currentSegment: SpeakerSegment | null = null;

    tokens.forEach((token) => {
      // Get speaker from token - Soniox provides speaker info in the token
      // Note: Soniox returns speaker as a string, so we need to parse it
      const speaker = parseInt((token as any).speaker || "0", 10);
      
      // Skip tokens without a valid speaker (speaker 0) or empty tokens
      if (speaker === 0 || !token.text || token.text.trim() === '' || 
          token.text === '<end>' || token.text === '<start>') {
        return;
      }
      
      if (!currentSegment || currentSegment.speaker !== speaker) {
        // Start new segment
        if (currentSegment) {
          newSegments.push(currentSegment);
        }
        currentSegment = {
          speaker,
          text: token.text,
          startTime: token.start_ms || 0,
          endTime: (token.start_ms || 0) + 100, // Default duration if not available
          tokens: [token],
        };
      } else {
        // Continue current segment
        currentSegment.text += token.text;
        currentSegment.endTime = (token.start_ms || 0) + 100; // Update end time
        currentSegment.tokens.push(token);
      }
    });

    if (currentSegment) {
      newSegments.push(currentSegment);
    }

    return newSegments;
  }, []);

  // Identify speakers from transcript content using LLM
  const identifySpeakersFromTranscript = useCallback(async (segments: SpeakerSegment[], existingMapping: Map<number, string>): Promise<Map<number, string>> => {
    // Start with existing mapping and apply manual corrections
    const mapping = new Map(existingMapping);
    
    // Apply manual corrections first (these take precedence)
    manualCorrectionsRef.current.forEach((name, speakerId) => {
      mapping.set(speakerId, name);
    });
    const speakerFirstAppearance = new Map<number, number>();
    const identificationAttempts = new Map<number, number>(); // Track attempts per speaker
    
    // Track when each speaker first appears
    segments.forEach((segment, index) => {
      if (!speakerFirstAppearance.has(segment.speaker)) {
        speakerFirstAppearance.set(segment.speaker, index);
      }
    });

    // Get unique speakers from segments
    const uniqueSpeakers = new Set(segments.map(s => s.speaker));
    
    // Get the auth token from localStorage (same as used elsewhere in the app)
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('No authentication token found for speaker identification');
      // Still assign generic labels
      const unidentifiedSpeakers = Array.from(speakerFirstAppearance.keys())
        .filter(speaker => !mapping.has(speaker))
        .sort((a, b) => speakerFirstAppearance.get(a)! - speakerFirstAppearance.get(b)!);

      unidentifiedSpeakers.forEach((speaker) => {
        mapping.set(speaker, `Speaker ${speaker}`);
      });
      return mapping;
    }
    
    // Try to identify each speaker using LLM (only unidentified ones)
    for (const speakerNum of uniqueSpeakers) {
      // Skip if manually corrected
      if (manualCorrectionsRef.current.has(speakerNum)) {
        continue;
      }
      
      // Skip if already identified with a real name
      const existingName = mapping.get(speakerNum);
      if (existingName && !existingName.startsWith('Speaker ')) {
        continue;
      }

      // Get all text from this speaker (up to first 1000 chars for efficiency)
      const speakerSegments = segments.filter(s => s.speaker === speakerNum);
      const speakerText = speakerSegments
        .map(s => s.text)
        .join(' ')
        .substring(0, 1000); // Limit text length for API call
      
      if (speakerText.trim().length < 30) {
        // Too little text to identify reliably
        continue;
      }

      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
        
        // Include manual corrections as context for better identification
        const manualContext = Array.from(manualCorrectionsRef.current.entries())
          .map(([id, name]) => `Speaker ${id} has been confirmed as ${name}`)
          .join('. ');
        
        const requestBody = {
          transcript: speakerText,
          speaker_id: speakerNum,
          manual_corrections: manualContext || undefined,
        };
        console.log('Sending speaker identification request:', requestBody);
        
        const response = await fetch(`${API_BASE_URL}/sessions/identify-speaker`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.name && result.confidence !== 'none') {
            mapping.set(speakerNum, result.name);
            console.log(`Identified Speaker ${speakerNum} as ${result.name} (confidence: ${result.confidence})`);
            console.log(`Evidence: ${result.evidence}`);
          }
        } else if (response.status === 401) {
          console.error('Authentication failed for speaker identification');
          break; // Stop trying if unauthorized
        } else if (response.status === 400) {
          const errorText = await response.text();
          console.error('Bad request for speaker identification:', errorText);
          console.error('Request body was:', requestBody);
        }
      } catch (error) {
        console.error(`Failed to identify speaker ${speakerNum}:`, error);
      }
      
      // Track identification attempt
      identificationAttempts.set(speakerNum, (identificationAttempts.get(speakerNum) || 0) + 1);
    }

    // For any unidentified speakers, assign generic labels
    const unidentifiedSpeakers = Array.from(speakerFirstAppearance.keys())
      .filter(speaker => !mapping.has(speaker) || mapping.get(speaker)?.startsWith('Speaker '))
      .sort((a, b) => speakerFirstAppearance.get(a)! - speakerFirstAppearance.get(b)!);

    unidentifiedSpeakers.forEach((speaker) => {
      if (!mapping.has(speaker)) {
        mapping.set(speaker, `Speaker ${speaker}`);
      }
    });

    return mapping;
  }, []);

  // Periodic re-identification for unidentified speakers
  useEffect(() => {
    if (state === 'Running' && segments.length > 0) {
      // Set up periodic identification (every 30 seconds)
      identificationIntervalRef.current = setInterval(() => {
        // Find unidentified speakers
        const unidentifiedSpeakers = Array.from(new Set(segments.map(s => s.speaker)))
          .filter(speaker => {
            const name = speakerMappingRef.current.get(speaker);
            return !name || name.startsWith('Speaker ');
          });

        if (unidentifiedSpeakers.length > 0) {
          console.log(`Re-attempting identification for ${unidentifiedSpeakers.length} unidentified speakers`);
          
          // Re-attempt identification
          identifySpeakersFromTranscript(segments, speakerMappingRef.current).then((newMapping) => {
            // Check if we identified any new speakers
            let newIdentifications = false;
            unidentifiedSpeakers.forEach(speaker => {
              const oldName = speakerMappingRef.current.get(speaker);
              const newName = newMapping.get(speaker);
              if (newName && !newName.startsWith('Speaker ') && oldName !== newName) {
                newIdentifications = true;
                console.log(`Successfully identified Speaker ${speaker} as ${newName}`);
              }
            });

            if (newIdentifications) {
              setSpeakerMapping(newMapping);
              speakerMappingRef.current = newMapping; // Keep ref in sync
              onTranscriptUpdate?.(segments, newMapping);
            }
          });
        }
      }, 10000); // Every 10 seconds

      return () => {
        if (identificationIntervalRef.current) {
          clearInterval(identificationIntervalRef.current);
          identificationIntervalRef.current = null;
        }
      };
    }
  }, [state, segments, speakerMapping, identifySpeakersFromTranscript, onTranscriptUpdate]);

  // Start transcription with speaker diarization
  const startTranscription = useCallback(async (audioStream: MediaStream) => {
    if (!clientRef.current) {
      console.error('Soniox client not initialized');
      return;
    }

    try {
      await clientRef.current.start({
        model: "stt-rt-preview-v2",
        languageHints: ['vi', 'en'], // Vietnamese and English
        enableLanguageIdentification: true,
        enableSpeakerDiarization: true, // Enable speaker diarization
        // Speaker diarization is enabled by default settings
        enableEndpointDetection: true,
        stream: audioStream,

        onStarted: () => {
          console.log('Transcription with speaker diarization started');
          setState('Running');
          onSessionStarted?.();
        },

        onFinished: () => {
          console.log('Transcription finished');
          setState('Finished');
          
          if (keepAliveRef.current) {
            clearInterval(keepAliveRef.current);
            keepAliveRef.current = null;
          }
          
          onSessionFinished?.();
        },

        onError: (status: ErrorStatus, message: string, errorCode: number | undefined) => {
          console.error('Transcription error:', { status, message, errorCode });
          setState('Error');
          setError({ status, message, errorCode });
        },

        onStateChange: ({ newState }) => {
          setState(newState);
        },

        onPartialResult: (result) => {
          // Collect all tokens
          const newFinalTokens: Token[] = [];
          const newNonFinalTokens: Token[] = [];

          for (const token of result.tokens) {
            if (token.is_final) {
              newFinalTokens.push(token);
            } else {
              newNonFinalTokens.push(token);
            }
          }

          // Update all tokens
          const existingFinalTokens = allTokensRef.current.filter(t => t.is_final);
          const allFinalTokens = [...existingFinalTokens, ...newFinalTokens];
          const allTokens = [...allFinalTokens, ...newNonFinalTokens];
          allTokensRef.current = allTokens;

          // Process tokens into speaker segments
          const newSegments = processTokensIntoSegments(allTokens);
          setSegments(newSegments);

          // Don't attempt identification until we have 30 seconds of context
          const now = Date.now();
          if (sessionStartTimeRef.current === 0) {
            sessionStartTimeRef.current = now;
          }
          
          const sessionDuration = (now - sessionStartTimeRef.current) / 1000; // in seconds
          const timeSinceLastIdentification = now - lastIdentificationTimeRef.current;
          
          // Only identify after 30 seconds and then every 30 seconds
          if (sessionDuration >= 30 && timeSinceLastIdentification > 30000 && !identificationInProgressRef.current) {
            lastIdentificationTimeRef.current = now;
            identificationInProgressRef.current = true;
            
            // Try to identify speakers from the transcript asynchronously
            identifySpeakersFromTranscript(newSegments, speakerMappingRef.current).then((newMapping) => {
              // Update identification history for consensus
              newMapping.forEach((name, speakerId) => {
                if (!name.startsWith('Speaker ')) {
                  const history = identificationHistoryRef.current.get(speakerId) || [];
                  history.push(name);
                  // Keep only last 3 identifications
                  if (history.length > 3) history.shift();
                  identificationHistoryRef.current.set(speakerId, history);
                  
                  // Check for consensus (3 identical identifications)
                  if (history.length >= 3 && history.every(h => h === name)) {
                    if (!confirmedSpeakersRef.current.has(speakerId)) {
                      confirmedSpeakersRef.current.add(speakerId);
                      console.log(`Speaker ${speakerId} confirmed as ${name} (consensus reached)`);
                    }
                  }
                }
              });
              
              setSpeakerMapping(newMapping);
              speakerMappingRef.current = newMapping; // Keep ref in sync
              identificationInProgressRef.current = false;
              // Notify about update with new mapping
              onTranscriptUpdate?.(newSegments, newMapping);
            }).catch((error) => {
              console.error('Error identifying speakers:', error);
              identificationInProgressRef.current = false;
            });
          } else {
            // Just update with current mapping from ref
            onTranscriptUpdate?.(newSegments, speakerMappingRef.current);
          }
        },

        // Note: onFinalResult is not available in current SDK version
        // Final results are handled through onPartialResult with is_final tokens
      });

      // Keep-alive interval
      keepAliveRef.current = setInterval(() => {
        console.log('Keep-alive ping for Soniox connection');
      }, 30000); // Every 30 seconds

    } catch (error) {
      console.error('Failed to start transcription:', error);
      setState('Error');
      setError({
        status: 'InternalError' as ErrorStatus,
        message: error instanceof Error ? error.message : 'Unknown error',
        errorCode: undefined
      });
    }
  }, [processTokensIntoSegments, identifySpeakersFromTranscript, onSessionStarted, onSessionFinished, onTranscriptUpdate]);

  // Stop transcription
  const stopTranscription = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stop();
    }
    
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  // Handle manual speaker correction
  const correctSpeaker = useCallback((speakerId: number, newName: string) => {
    console.log(`Manual correction: Speaker ${speakerId} corrected to ${newName}`);
    
    // Store manual correction
    if (newName.startsWith('Speaker ')) {
      // Reset to automatic identification
      manualCorrectionsRef.current.delete(speakerId);
      confirmedSpeakersRef.current.delete(speakerId);
    } else {
      manualCorrectionsRef.current.set(speakerId, newName);
      confirmedSpeakersRef.current.add(speakerId);
    }
    
    // Update mapping immediately
    const newMapping = new Map(speakerMappingRef.current);
    newMapping.set(speakerId, newName);
    setSpeakerMapping(newMapping);
    speakerMappingRef.current = newMapping;
    
    // Notify about update
    if (segments.length > 0) {
      onTranscriptUpdate?.(segments, newMapping);
    }
    
    // Note: Manual speaker corrections are stored locally only
    // The corrected names will be included when we send the consolidated transcript for assessment
    console.log(`Speaker ${speakerId} corrected to "${newName}" (stored locally)`);

    // No need to call backend API here - corrections are applied when sending consolidated transcript
  }, [segments, onTranscriptUpdate, sessionId]);
  
  // Check if session is active
  const isSessionActive = isActiveState(state);

  return {
    startTranscription,
    stopTranscription,
    isSessionActive,
    state,
    segments,
    speakerMapping,
    error,
    correctSpeaker,
  };
}