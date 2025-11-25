import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useClient } from '../contexts/ClientContext';
import { assessmentAPI } from '../services/assessment-api';
import { 
  Card, 
  Button, 
  Badge, 
  Table,
  Tab,
  Nav,
  Alert,
  ProgressBar,
  Breadcrumb
} from 'react-bootstrap';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Volume2,
  CheckCircle,
  AlertTriangle,
  FileText,
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  Upload,
  Send
} from 'lucide-react';
import type { Token } from '@soniox/speech-to-text-web';
import useSpeakerDiarization from '../hooks/useSpeakerDiarization';
import useAudioRecorder from '../hooks/useAudioRecorder';
import getSonioxApiKey from '../utils/getSonioxApiKey';
import SpeakerDiarizedTranscript from '../components/SpeakerDiarizedTranscript';
import AssessmentTable from '../components/AssessmentTable';
import AudioChannelSelector from '../components/AudioChannelSelector';
import type { AudioDeviceInfo } from '../types/audio';
import { assessmentCriteria } from '../config/assessmentCriteria';


interface Participant {
  id: number;
  name: string;
  role: string;
  department: string;
  selectedDeviceId: string | null;
  audioLevel: number;
  isConnected: boolean;
  transcript: string;
  tokens: Token[];
  assessmentResults: any[] | null;
}

// Remove mock participants - will be fetched from API
/* const mockParticipants: Participant[] = [
  {
    id: 1,
    name: 'Nguyễn Văn Minh',
    role: 'Senior Software Engineer',
    department: 'Technology',
    audioChannel: null,
    audioLevel: 0,
    isConnected: false,
    transcript: '',
    tokens: [],
    assessmentResults: null
  },
  {
    id: 2,
    name: 'Trần Thị Lan',
    role: 'Product Manager',
    department: 'Product',
    audioChannel: null,
    audioLevel: 0,
    isConnected: false,
    transcript: '',
    tokens: [],
    assessmentResults: null
  },
  {
    id: 3,
    name: 'Lê Hoàng Khôi',
    role: 'UX Designer',
    department: 'Design',
    audioChannel: null,
    audioLevel: 0,
    isConnected: false,
    transcript: '',
    tokens: [],
    assessmentResults: null
  },
  {
    id: 4,
    name: 'Phạm Thị Hương',
    role: 'Business Analyst',
    department: 'Operations',
    audioChannel: null,
    audioLevel: 0,
    isConnected: false,
    transcript: '',
    tokens: [],
    assessmentResults: null
  }
]; */

// Assessment criteria are now imported from config

const AssessmentSession: React.FC = () => {
  const { id, sessionId, clientSlug } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useClient();
  const { t } = useTranslation();
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [groupAssessment, setGroupAssessment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<'setup' | 'starting' | 'recording' | 'ready' | 'paused' | 'completed'>('setup');
  const [activeMainTab, setActiveMainTab] = useState<string>('transcript');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  const [participantTableCollapsed, setParticipantTableCollapsed] = useState(false);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const participantsRef = useRef<Participant[]>([]);
  
  const [speakerSegments, setSpeakerSegments] = useState<any[]>([]);
  const [speakerMapping, setSpeakerMapping] = useState<Map<number, string>>(new Map());
  const speakerSegmentsRef = useRef<any[]>([]);
  const speakerMappingRef = useRef<Map<number, string>>(new Map());

  // Async transcription state
  const [asyncTranscriptionStatus, setAsyncTranscriptionStatus] = useState<'idle' | 'submitting' | 'processing' | 'completed' | 'error'>('idle');
  const [asyncTranscriptionProgress, setAsyncTranscriptionProgress] = useState(0);
  const manualCorrectionsRef = useRef<Record<string, string>>({});
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);

  // JSON upload state
  const [uploadedTranscription, setUploadedTranscription] = useState<any | null>(null);
  const [isUploadMode, setIsUploadMode] = useState(false);

  // Audio recorder for async transcription
  const {
    startRecording,
    stopRecording
  } = useAudioRecorder({});

  // Speaker diarization integration
  const {
    startTranscription,
    stopTranscription,
    isSessionActive,
    error: transcriptionError,
    correctSpeaker
  } = useSpeakerDiarization({
    getApiKey: getSonioxApiKey,
    sessionId: sessionId!,
    onTranscriptUpdate: (segments, mapping) => {
      // Store the segments and mapping for display
      setSpeakerSegments(segments);
      setSpeakerMapping(mapping);
      // Also update refs for async access
      speakerSegmentsRef.current = segments;
      speakerMappingRef.current = mapping;
      console.log(`[Transcript Update] ${segments.length} segments, ${mapping.size} speakers identified`);
    },
    onSessionStarted: () => {
      console.log('Speaker diarization session started');
      setSessionStatus('recording');
      setSessionDuration(0);
      setParticipantTableCollapsed(true); // Auto-collapse when recording starts
    },
    onSessionFinished: () => {
      console.log('Speaker diarization session finished');
      // Send final consolidated transcript to server
      syncConsolidatedTranscriptToServer();
    }
  });
  
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const basePath = isAdmin ? '/admin' : `/client/${clientSlug}`;

  useEffect(() => {
    if (id) {
      fetchAssessmentData();
    }
  }, [id]);

  // Keep participantsRef updated with latest participants
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  const fetchAssessmentData = async () => {
    if (!id) return;
    
    setLoading(true);
    
    // For demo/test sessions, use mock data
    if (id === 'test' || sessionId === 'test') {
      // Mock participants for demo
      const mockParticipants: Participant[] = [
        {
          id: 1,
          name: 'Nguyễn Văn Minh',
          role: 'Quản lý Kênh MT (Modern Trade Manager)',
          department: 'Trade Marketing',
          selectedDeviceId: null,
          audioLevel: 0,
          isConnected: false,
          transcript: '',
          tokens: [],
          assessmentResults: null
        },
        {
          id: 2,
          name: 'Trần Thị Lan',
          role: 'Quản lý Kênh GT (General Trade Manager)',
          department: 'Trade Marketing',
          selectedDeviceId: null,
          audioLevel: 0,
          isConnected: false,
          transcript: '',
          tokens: [],
          assessmentResults: null
        },
        {
          id: 3,
          name: 'Lê Hoàng Khôi',
          role: 'Quản lý Ecommerce & Digital (Ecommerce & Digital Manager)',
          department: 'Digital Marketing',
          selectedDeviceId: null,
          audioLevel: 0,
          isConnected: false,
          transcript: '',
          tokens: [],
          assessmentResults: null
        },
        {
          id: 4,
          name: 'Phạm Thị Hương',
          role: 'Quản lý Thị trường Indonesia (Indonesia Market Manager)',
          department: 'Market Development',
          selectedDeviceId: null,
          audioLevel: 0,
          isConnected: false,
          transcript: '',
          tokens: [],
          assessmentResults: null
        }
      ];
      
      setParticipants(mockParticipants);
      setLoading(false);
      return;
    }
    
    try {
      const assessment = await assessmentAPI.get(id);
      
      // Transform participants from assessment metadata
      const fetchedParticipants: Participant[] = assessment.metadata?.participants?.map((p: any, index: number) => ({
        id: index + 1,
        name: p.name || `Participant ${index + 1}`,
        role: p.role || 'Employee',
        department: p.department || 'Unknown',
        selectedDeviceId: null,
        audioLevel: 0,
        isConnected: false,
        transcript: '',
        tokens: [],
        assessmentResults: null
      })) || [];
      
      setParticipants(fetchedParticipants);
    } catch (error) {
      console.error('Failed to fetch assessment data:', error);
    }
    
    setLoading(false);
  };

  // Mock session data
  const session = {
    id: sessionId,
    name: 'Group Assessment Session - Strategic Planning',
    assessmentName: 'Q4 2025 Leadership Assessment Center',
    type: 'Group Exercise',
    duration: 90, // minutes
    language: 'vietnamese'
  };

  // Timer effect
  useEffect(() => {
    if (sessionStatus === 'recording') {
      sessionTimerRef.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    }

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [sessionStatus]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Request audio permissions
  const requestAudioPermission = async () => {
    try {
      console.log('Requesting audio permission...');
      
      // Simple permission request first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      setAudioPermissionGranted(true);
      setSessionStatus('setup');
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please ensure microphone permissions are granted.');
      return false;
    }
  };


  // Handle device selection (only one device for all participants)
  const handleDeviceSelection = async (
    _selection: string, 
    deviceInfo: AudioDeviceInfo
  ) => {
    try {
      // Get audio stream for the selected device
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceInfo.deviceId },
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Store the stream
      if (audioStreamRef.current) {
        // Stop previous stream
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      audioStreamRef.current = stream;

      // Update all participants to use this device
      setParticipants(prev => prev.map(p => ({ 
        ...p, 
        selectedDeviceId: deviceInfo.deviceId,
        isConnected: true
      })));

      console.log(`Device ${deviceInfo.label} selected for session`);
    } catch (error) {
      console.error(`Error setting up device:`, error);
    }
  };

  // Initialize and check audio permission on component mount
  useEffect(() => {
    const checkAudioPermission = async () => {
      try {
        // Try to check permission status using Permissions API (if available)
        if ('permissions' in navigator) {
          try {
            const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            if (permission.state === 'granted') {
              setAudioPermissionGranted(true);
              console.log('Microphone permission already granted (via Permissions API)');
            }
          } catch (e) {
            // Permissions API might not support microphone query in some browsers
            console.log('Permissions API check failed, falling back to device enumeration');
          }
        }
        
        // Enumerate devices to check labels
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        // If we have audio inputs with labels, we have permission
        if (audioInputs.length > 0 && audioInputs[0].label !== '') {
          setAudioPermissionGranted(true);
          console.log('Audio permission detected via device labels');
        }
        
        setSessionStatus('setup');
      } catch (error) {
        console.error('Error checking audio permission:', error);
        setSessionStatus('setup');
      }
    };
    
    checkAudioPermission();
    
    // Cleanup on unmount
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Test audio level using the selected audio stream
  const testAudioLevel = async () => {
    if (!audioStreamRef.current) {
      console.error('No audio stream selected');
      return;
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    const source = audioContext.createMediaStreamSource(audioStreamRef.current);
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const interval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const level = Math.min(100, (average / 128) * 100);
      
      // Update all participants with same level (since we have single audio source)
      setParticipants(prev => prev.map(p => ({ ...p, audioLevel: level })));
    }, 100);
    
    // Stop after 3 seconds
    setTimeout(() => {
      clearInterval(interval);
      source.disconnect();
      setParticipants(prev => prev.map(p => ({ ...p, audioLevel: 0 })));
    }, 3000);
  };

  // Check if a device has been selected
  const deviceSelected = participants.length > 0 && participants[0].selectedDeviceId !== null;

  // Handler for speaker correction that tracks manual corrections
  const handleSpeakerCorrection = (speakerId: number, newName: string) => {
    // Store manual correction for async transcription
    manualCorrectionsRef.current[`Speaker ${speakerId}`] = newName;
    console.log(`Manual correction: Speaker ${speakerId} -> ${newName}`);

    // Update local speaker mapping immediately (for upload mode)
    const newMapping = new Map(speakerMapping);
    newMapping.set(speakerId, newName);
    setSpeakerMapping(newMapping);
    speakerMappingRef.current = newMapping;

    // Also call the hook's correctSpeaker for live transcription mode
    correctSpeaker(speakerId, newName);
  };

  // Handle JSON file upload
  const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        console.log('Uploaded Soniox transcription:', json);

        // Process the Soniox tokens into speaker segments
        const segments = processSONIOXTokens(json.tokens || []);
        console.log(`Processed ${segments.length} speaker segments`);

        // Set the segments and create initial speaker mapping
        setSpeakerSegments(segments);
        speakerSegmentsRef.current = segments;

        // Create initial speaker mapping (Speaker 1, Speaker 2, etc.)
        const mapping = new Map<number, string>();
        segments.forEach(seg => {
          if (!mapping.has(seg.speaker)) {
            mapping.set(seg.speaker, `Speaker ${seg.speaker}`);
          }
        });
        setSpeakerMapping(mapping);
        speakerMappingRef.current = mapping;

        setUploadedTranscription(json);
        setIsUploadMode(true);
        setActiveMainTab('transcript');

        alert(`Transcription loaded successfully! Found ${mapping.size} speakers.`);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Invalid JSON file. Please upload a valid Soniox transcription file.');
      }
    };
    reader.readAsText(file);
  };

  // Process Soniox tokens into speaker segments
  const processSONIOXTokens = (tokens: any[]): any[] => {
    if (!tokens || tokens.length === 0) return [];

    const segments: any[] = [];
    let currentSegment: any = null;

    tokens.forEach((token) => {
      const speakerId = parseInt(token.speaker);

      if (!currentSegment || currentSegment.speaker !== speakerId) {
        // Start new segment
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          speaker: speakerId,
          text: token.text || '',
          startMs: token.start_ms,
          endMs: token.end_ms,
          tokens: [token]
        };
      } else {
        // Continue current segment
        currentSegment.text += token.text || '';
        currentSegment.endMs = token.end_ms;
        currentSegment.tokens.push(token);
      }
    });

    // Push last segment
    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments;
  };

  // Manual assessment trigger for uploaded transcription
  const triggerManualAssessment = async () => {
    if (!uploadedTranscription || !sessionId) {
      alert('No transcription uploaded or session ID missing.');
      return;
    }

    try {
      console.log('Triggering manual assessment...');

      // Build unified chronological transcript from segments
      const unifiedTranscript = speakerSegmentsRef.current.map(segment => {
        const speakerName = speakerMappingRef.current.get(segment.speaker) || `Speaker ${segment.speaker}`;
        return `[${speakerName}]: ${segment.text}`;
      }).join('\n');

      const consolidatedConversation = [{
        participant_id: 'unified',
        participant_name: 'All Speakers',
        role: 'Group',
        transcript: unifiedTranscript
      }];

      console.log('Sending manual assessment request...');
      const response = await fetch('/api/v1/sessions/consolidated-transcript-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          conversation: consolidatedConversation,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`Assessment failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Assessment triggered:', result);

      // Poll for assessment results
      setTimeout(() => {
        pollForConsolidatedAssessmentResults(sessionId);
      }, 5000);

      // Switch to assessment tab
      setActiveMainTab('assessment');
      alert('Assessment started! Results will appear shortly.');
    } catch (error) {
      console.error('Error triggering assessment:', error);
      alert('Failed to trigger assessment. Please try again.');
    }
  };

  // Start session using Soniox SDK
  const startSession = async () => {
    if (!deviceSelected || !audioPermissionGranted || !audioStreamRef.current) return;

    try {
      console.log('Starting session with Soniox...');
      setSessionStatus('starting'); // Show starting state

      // Clear any old transcript data from previous sessions
      console.log('Clearing old transcript data...');
      setParticipants(prev => prev.map(p => ({
        ...p,
        transcript: '',
        tokens: [],
        assessmentResults: null
      })));

      // Update the participants ref as well
      participantsRef.current = participantsRef.current.map(p => ({
        ...p,
        transcript: '',
        tokens: [],
        assessmentResults: null
      }));

      // Clear manual corrections for new session
      manualCorrectionsRef.current = {};

      // Clear async transcription state
      setAsyncTranscriptionStatus('idle');
      setAsyncTranscriptionProgress(0);

      // Start audio recording for async transcription
      await startRecording();
      console.log('Audio recording started for async transcription');

      // Start Soniox transcription with speaker diarization
      await startTranscription(audioStreamRef.current!);

      // Start periodic consolidated transcript sync (every 30 seconds as per specs)
      syncIntervalRef.current = setInterval(() => {
        console.log('Performing periodic consolidated transcript sync...');
        syncConsolidatedTranscriptToServer();
      }, 30000);
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session. Please check audio permissions and try again.');
    }
  };

  // Pause session
  const pauseSession = () => {
    // Soniox SDK doesn't support pause, so we'll just stop
    stopTranscription();
    setSessionStatus('paused');
  };

  // Resume session  
  const resumeSession = () => {
    // For resume, we start a new transcription
    startSession();
  };

  // Sync consolidated transcript to server (non-blocking)
  const syncConsolidatedTranscriptToServer = () => {
    // Use setTimeout to make it fully async and non-blocking
    setTimeout(async () => {
      try {
        // Use refs to get the latest speaker segments and mapping
        const currentSegments = speakerSegmentsRef.current;
        const currentMapping = speakerMappingRef.current;

        console.log(`[SYNC] Checking segments: ${currentSegments.length} segments available`);

        // Build consolidated conversation from speaker segments
        if (!currentSegments || currentSegments.length === 0) {
          console.log('[SYNC] No transcripts to sync');
          return;
        }

        // Create a unified chronological transcript with speaker identification
        // This preserves the conversation flow for proper group assessment
        const unifiedTranscript = currentSegments.map(segment => {
          const speakerName = currentMapping.get(segment.speaker) || `Speaker ${segment.speaker}`;
          return `[${speakerName}]: ${segment.text}`;
        }).join('\n');

        console.log(`[SYNC] Unified chronological transcript length: ${unifiedTranscript.length} chars`);

        // For group assessment, send ONE unified chronological transcript
        // not separate transcripts per speaker
        const consolidatedConversation = [{
          participant_id: 'unified',
          participant_name: 'All Speakers',
          role: 'Group',
          transcript: unifiedTranscript
        }];

        console.log(`[SYNC] Sending unified chronological transcript for session ${sessionId}`);
        
        const response = await fetch('/api/v1/sessions/consolidated-transcript-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            session_id: sessionId,
            conversation: consolidatedConversation,
            timestamp: Date.now()
          })
        });
        
        if (!response.ok) {
          console.warn(`[SYNC] Failed: ${response.status}`);
        } else {
          const result = await response.json();
          console.log(`[SYNC] Success:`, result);
          
          // Schedule assessment results polling
          if (sessionId && result.assessments) {
            // Update all participants with their assessment results
            setParticipants(prev => prev.map(p => {
              const assessment = result.assessments.find((a: any) => 
                a.participant_id === p.id.toString() || a.participant_id === p.id
              );
              return assessment ? { ...p, assessmentResults: assessment.results } : p;
            }));
            
            // Don't auto-switch to assessment tab - let user control navigation
            // setActiveMainTab('assessment');
          } else if (sessionId) {
            // Poll for results after 10 seconds
            setTimeout(() => {
              pollForConsolidatedAssessmentResults(sessionId);
            }, 10000);
          }
        }
      } catch (error) {
        console.error(`[SYNC] Error:`, error);
        // Don't interrupt the session, just log the error
      }
    }, 0); // Execute on next tick to avoid blocking
  };
  
  // Legacy sync for individual participant (removed - using consolidated sync now)
  /*const syncTranscriptToServer = (participantId: string, transcript: string) => {
    // Use setTimeout to make it fully async and non-blocking
    setTimeout(async () => {
      try {
        console.log(`[SYNC] Sending transcript for participant ${participantId}, session ${sessionId}, length: ${transcript.length}`);
        
        const response = await fetch('/api/v1/sessions/transcript-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            participant_id: participantId,
            session_id: sessionId,
            transcript: transcript,
            timestamp: Date.now()
          })
        });
        
        if (!response.ok) {
          console.warn(`[SYNC] Failed for participant ${participantId}: ${response.status}`);
        } else {
          const result = await response.json();
          console.log(`[SYNC] Success for participant ${participantId}:`, result);
          
          // Schedule assessment polling 10 seconds after transcript sync
          if (sessionId) {
            setTimeout(() => {
              pollForAssessmentResults(parseInt(participantId), sessionId);
            }, 10000); // 10 seconds delay
          }
        }
      } catch (error) {
        console.error(`[SYNC] Error for participant ${participantId}:`, error);
        // Don't interrupt the session, just log the error
      }
    }, 0); // Execute on next tick to avoid blocking
  };*/

  // Stop session
  const stopSession = async () => {
    console.log('Stopping session...');

    // Stop Soniox transcription
    stopTranscription();

    // Clear transcript sync interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    // Send final consolidated transcript to server
    syncConsolidatedTranscriptToServer();

    // Stop audio recording and submit for async transcription
    try {
      console.log('Stopping audio recording...');
      const recordedAudio = await stopRecording();

      if (recordedAudio && recordedAudio.blob) {
        console.log(`Audio recording stopped. Duration: ${recordedAudio.duration}ms, Size: ${recordedAudio.blob.size} bytes`);

        // Store the audio blob for later download
        setRecordedAudioBlob(recordedAudio.blob);

        // Submit for async transcription
        await submitAsyncTranscription(recordedAudio.blob);
      } else {
        console.warn('No audio recorded or recording failed');
      }
    } catch (error) {
      console.error('Error stopping recording or submitting async transcription:', error);
    }

    setSessionStatus('completed');
  };

  // Submit audio for async transcription
  const submitAsyncTranscription = async (audioBlob: Blob) => {
    if (!sessionId) {
      console.error('No session ID available for async transcription');
      return;
    }

    try {
      setAsyncTranscriptionStatus('submitting');
      console.log('Submitting audio for async transcription...');

      // Prepare form data
      const formData = new FormData();
      formData.append('session_id', sessionId);

      // Determine file extension from MIME type
      let fileExtension = 'webm';
      if (audioBlob.type.includes('mp4')) {
        fileExtension = 'm4a';
      } else if (audioBlob.type.includes('ogg')) {
        fileExtension = 'ogg';
      } else if (audioBlob.type.includes('webm')) {
        fileExtension = 'webm';
      }
      const filename = `session-audio.${fileExtension}`;

      // Log audio blob details
      console.log('Audio blob details:', {
        size: audioBlob.size,
        type: audioBlob.type,
        filename: filename
      });

      formData.append('audio', audioBlob, filename);

      // Convert speaker mapping to speaker_mapping format (map[int]string expected by backend)
      const speakerMappingObj: Record<number, string> = {};
      speakerMappingRef.current.forEach((name, speakerId) => {
        speakerMappingObj[speakerId] = name;
      });
      const speakerMappingJSON = JSON.stringify(speakerMappingObj);
      console.log('Speaker mapping JSON:', speakerMappingJSON);
      formData.append('speaker_mapping', speakerMappingJSON);

      // Add manual corrections (map[int]string expected by backend)
      // Convert from Record<string, string> with "Speaker X" keys to Record<number, string> with numeric keys
      const manualCorrectionsObj: Record<number, string> = {};
      Object.entries(manualCorrectionsRef.current).forEach(([key, value]) => {
        // Extract speaker ID from "Speaker X" format
        const match = key.match(/Speaker (\d+)/);
        if (match) {
          const speakerId = parseInt(match[1], 10);
          manualCorrectionsObj[speakerId] = value;
        }
      });
      const manualCorrectionsJSON = JSON.stringify(manualCorrectionsObj);
      console.log('Manual corrections JSON:', manualCorrectionsJSON);
      formData.append('manual_corrections', manualCorrectionsJSON);

      // Submit to backend
      const response = await fetch(`/api/v1/sessions/${sessionId}/async-transcription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to submit async transcription: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Async transcription submitted:', result);

      setAsyncTranscriptionStatus('processing');

      // Start polling for results
      pollForAsyncTranscription();
    } catch (error) {
      console.error('Error submitting async transcription:', error);
      setAsyncTranscriptionStatus('error');
    }
  };

  // Poll for async transcription results
  const pollForAsyncTranscription = async () => {
    if (!sessionId) return;

    const maxAttempts = 30; // Poll for 5 minutes (30 attempts × 10 seconds)
    let attempts = 0;

    const poll = async () => {
      attempts++;
      setAsyncTranscriptionProgress(Math.min((attempts / maxAttempts) * 90, 90)); // Progress up to 90%

      console.log(`Polling async transcription (attempt ${attempts}/${maxAttempts})...`);

      try {
        const response = await fetch(`/api/v1/sessions/${sessionId}/async-transcription/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Async transcription result received:', result);

          if (result.status === 'completed' && result.segments) {
            // Update transcript with improved results
            setSpeakerSegments(result.segments);
            setAsyncTranscriptionProgress(100);
            setAsyncTranscriptionStatus('completed');

            // Sync improved transcript to backend for re-assessment
            await syncImprovedTranscript(result.segments);
          } else if (result.status === 'error') {
            console.error('Async transcription failed:', result.error);
            setAsyncTranscriptionStatus('error');
          } else if (attempts < maxAttempts) {
            // Still processing, continue polling
            setTimeout(poll, 10000);
          } else {
            console.warn('Polling timeout for async transcription');
            setAsyncTranscriptionStatus('error');
          }
        } else if (response.status === 404 || response.status === 202) {
          // Not ready yet, continue polling
          if (attempts < maxAttempts) {
            setTimeout(poll, 10000);
          } else {
            console.warn('Polling timeout for async transcription');
            setAsyncTranscriptionStatus('error');
          }
        } else {
          throw new Error(`Polling failed: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error polling async transcription:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Retry on error
        } else {
          setAsyncTranscriptionStatus('error');
        }
      }
    };

    // Start polling
    poll();
  };

  // Sync improved transcript to backend for re-assessment
  const syncImprovedTranscript = async (segments: any[]) => {
    if (!sessionId) return;

    try {
      console.log('Syncing improved transcript for re-assessment...');

      // Build unified transcript from segments
      let unifiedTranscript = '';
      for (const seg of segments) {
        unifiedTranscript += `[${seg.name}]: ${seg.text}\n`;
      }

      // Format for backend consolidated transcript API
      const conversation = [{
        participant_id: 'unified',
        participant_name: 'All Speakers',
        role: 'Group',
        transcript: unifiedTranscript
      }];

      // Sync consolidated transcript
      const response = await fetch('/api/v1/sessions/consolidated-transcript-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          conversation: conversation
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to sync improved transcript: ${response.statusText}`);
      }

      console.log('Improved transcript synced successfully');

      // Trigger re-assessment with improved transcript
      pollForConsolidatedAssessmentResults(sessionId);
    } catch (error) {
      console.error('Error syncing improved transcript:', error);
    }
  };

  // Poll for consolidated assessment results
  const pollForConsolidatedAssessmentResults = async (sessionId: string) => {
    console.log(`Starting to poll for consolidated assessment results for session ${sessionId}...`);
    
    const maxAttempts = 6; // Poll for 1 minute (6 attempts × 10 seconds)
    let attempts = 0;
    
    const poll = async () => {
      attempts++;
      console.log(`Polling attempt ${attempts} for session ${sessionId}`);
      
      try {
        const response = await fetch(`/api/v1/sessions/${sessionId}/consolidated-assessment`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`Consolidated assessment results received:`, result);
          
          // Update all participants with their assessment results
          if (result.assessments && Array.isArray(result.assessments)) {
            console.log('Received consolidated assessment results:', result);
            setParticipants(prev => prev.map(p => {
              const assessment = result.assessments.find((a: any) =>
                a.participant_id === p.id.toString() || a.participant_id === p.id
              );
              if (assessment) {
                console.log(`Setting assessment for participant ${p.name}:`, assessment.results);
              }
              return assessment ? { ...p, assessmentResults: assessment.results } : p;
            }));

            // Extract and set group assessment if available
            if (result.group_assessment) {
              console.log('Setting group assessment:', result.group_assessment);
              setGroupAssessment(result.group_assessment);
            }

            // Don't auto-switch to assessment tab - let user control navigation
            // setActiveMainTab('assessment');
          }
          return;
        } else if (response.status === 404) {
          // Results not ready yet, continue polling if we haven't exceeded max attempts
          if (attempts < maxAttempts) {
            console.log(`Assessment not ready, will retry in 10 seconds...`);
            setTimeout(poll, 10000); // Poll again in 10 seconds
          } else {
            console.log(`Polling timeout after ${maxAttempts} attempts`);
          }
        } else {
          console.error(`Error polling for assessment:`, response.status);
        }
      } catch (error) {
        console.error(`Error polling for consolidated assessment results:`, error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Retry on error
        }
      }
    };
    
    // Start polling
    poll();
  };
  
  // Legacy poll for individual assessment results (removed - using consolidated polling now)  
  /*const pollForAssessmentResults = async (participantId: number, sessionId: string) => {
    console.log(`Starting to poll for assessment results for participant ${participantId}...`);
    
    const maxAttempts = 6; // Poll for 1 minute (6 attempts × 10 seconds)
    let attempts = 0;
    
    const poll = async () => {
      attempts++;
      console.log(`Polling attempt ${attempts} for participant ${participantId}`);
      
      try {
        const response = await fetch(`/api/v1/sessions/${sessionId}/participants/${participantId}/assessment`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        
        if (response.ok) {
          const assessmentResult = await response.json();
          console.log(`Assessment results received for participant ${participantId}:`, assessmentResult);
          
          // Update participant with assessment results
          setParticipants(prev => prev.map(p => 
            p.id === participantId 
              ? { ...p, assessmentResults: assessmentResult.results || [assessmentResult] }
              : p
          ));
          
          // Don't auto-switch to assessment tab - let user control navigation
          // setActiveMainTab('assessment');
          return;
        } else if (response.status === 404) {
          // Results not ready yet, continue polling if we haven't exceeded max attempts
          if (attempts < maxAttempts) {
            console.log(`Assessment not ready for participant ${participantId}, will retry in 10 seconds...`);
            setTimeout(poll, 10000); // Poll again in 10 seconds
          } else {
            console.log(`Polling timeout for participant ${participantId} after ${maxAttempts} attempts`);
          }
        } else {
          console.error(`Error polling for participant ${participantId}:`, response.status);
        }
      } catch (error) {
        console.error(`Error polling for assessment results for participant ${participantId}:`, error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Retry on error
        }
      }
    };
    
    // Start polling
    poll();
  };*/



  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item onClick={() => navigate(`${basePath}/assessments`)}>
          {t('nav.assessments')}
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate(`${basePath}/assessments/${id}`)}>
          {session.assessmentName}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{session.name}</Breadcrumb.Item>
      </Breadcrumb>

      {/* Header */}
      <div className="page-header mb-4">
        <div className="d-flex align-items-center gap-3">
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={() => navigate(`${basePath}/assessments/${id}`)}
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-grow-1">
            <h2 className="mb-1">{session.name}</h2>
            <div className="d-flex gap-3 align-items-center">
              <Badge bg={
                isSessionActive ? 'success' :
                sessionStatus === 'paused' ? 'warning' :
                sessionStatus === 'completed' ? 'secondary' : 'info'
              }>
                {isSessionActive ? 'Recording' :
                 sessionStatus === 'paused' ? 'Paused' :
                 sessionStatus === 'completed' ? 'Completed' : 
                 sessionStatus === 'ready' ? 'Ready' : 'Setting Up'}
              </Badge>
              <span className="text-muted">{session.type}</span>
              <span className="text-muted">•</span>
              <span className="text-muted">{session.duration} minutes</span>
              <span className="text-muted">•</span>
              <span className="text-muted">Duration: {formatDuration(sessionDuration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Session Management */}
      <Card className="mb-4">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <h5 className="mb-0">Session Management</h5>
              <Button
                variant="link"
                size="sm"
                onClick={() => setParticipantTableCollapsed(!participantTableCollapsed)}
                className="p-0"
              >
                {participantTableCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </Button>
            </div>
            <div className="d-flex gap-2">
              {/* JSON Upload Button */}
              <label className="btn btn-outline-primary btn-sm mb-0" style={{ cursor: 'pointer' }} title="Upload Transcription JSON">
                <Upload size={16} />
                <input
                  type="file"
                  accept=".json"
                  onChange={handleJsonUpload}
                  style={{ display: 'none' }}
                />
              </label>
              {sessionStatus === 'setup' && (
                <Button 
                  variant="success" 
                  onClick={startSession}
                  disabled={!deviceSelected || !audioPermissionGranted}
                  title={!audioPermissionGranted ? "Grant audio permission first" : !deviceSelected ? "Select an audio device" : "Start recording session"}
                >
                  <Play size={16} className="me-2" />
                  Start Session
                </Button>
              )}
              {sessionStatus === 'starting' && (
                <Button variant="secondary" disabled>
                  <Activity size={16} className="me-2" />
                  Connecting...
                </Button>
              )}
              {sessionStatus === 'recording' && (
                <>
                  <Button variant="warning" onClick={pauseSession}>
                    <Pause size={16} className="me-2" />
                    Pause
                  </Button>
                  <Button variant="danger" onClick={stopSession}>
                    <Square size={16} className="me-2" />
                    Stop
                  </Button>
                </>
              )}
              {sessionStatus === 'paused' && (
                <>
                  <Button variant="success" onClick={resumeSession}>
                    <Play size={16} className="me-2" />
                    Resume
                  </Button>
                  <Button variant="danger" onClick={stopSession}>
                    <Square size={16} className="me-2" />
                    Stop
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card.Header>
        {!participantTableCollapsed && (
          <Card.Body>
            <div className="mb-3">
              <h6>Audio Source</h6>
              <div className="d-flex align-items-center gap-3">
                <div style={{ maxWidth: '400px', flex: 1 }}>
                  <AudioChannelSelector
                    value={participants[0]?.selectedDeviceId || null}
                    onChange={handleDeviceSelection}
                    disabled={sessionStatus === 'recording' || sessionStatus === 'paused'}
                    isRecording={sessionStatus === 'recording'}
                  />
                </div>
                <div className="d-flex align-items-center gap-2">
                  {participants[0]?.selectedDeviceId && (
                    <>
                      <ProgressBar 
                        now={participants[0]?.audioLevel || 0} 
                        variant={(participants[0]?.audioLevel || 0) > 70 ? 'success' : (participants[0]?.audioLevel || 0) > 30 ? 'warning' : 'info'}
                        style={{ width: '100px', height: '10px' }}
                      />
                      <small>{Math.round(participants[0]?.audioLevel || 0)}%</small>
                    </>
                  )}
                </div>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={testAudioLevel}
                  disabled={!deviceSelected || sessionStatus === 'recording'}
                >
                  <Volume2 size={14} className="me-1" />
                  Test Audio
                </Button>
              </div>
            </div>
            
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Participants ({participants.length})</h6>
              {(sessionStatus === 'setup' || sessionStatus === 'ready') && (
                <small className="text-muted">
                  <Info size={14} className="me-1" />
                  Click on any field to edit. Changes will be locked when session starts.
                </small>
              )}
            </div>
            <Table size="sm" className="mb-0" hover={sessionStatus === 'setup' || sessionStatus === 'ready'}>
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant, index) => (
                    <tr key={participant.id}>
                      <td>
                        {(sessionStatus === 'setup' || sessionStatus === 'ready') ? (
                          <input
                            type="text"
                            value={participant.name}
                            onChange={(e) => {
                              const updatedParticipants = [...participants];
                              updatedParticipants[index] = { ...participant, name: e.target.value };
                              setParticipants(updatedParticipants);
                            }}
                            className="form-control form-control-sm border-0 p-1 fw-bold"
                            style={{
                              background: 'transparent',
                              borderBottom: '1px dashed #dee2e6',
                              borderRadius: 0
                            }}
                            onFocus={(e) => e.target.style.borderBottom = '1px solid #0d6efd'}
                            onBlur={(e) => e.target.style.borderBottom = '1px dashed #dee2e6'}
                          />
                        ) : (
                          <strong>{participant.name}</strong>
                        )}
                      </td>
                      <td>
                        {(sessionStatus === 'setup' || sessionStatus === 'ready') ? (
                          <input
                            type="text"
                            value={participant.role}
                            onChange={(e) => {
                              const updatedParticipants = [...participants];
                              updatedParticipants[index] = { ...participant, role: e.target.value };
                              setParticipants(updatedParticipants);
                            }}
                            className="form-control form-control-sm border-0 p-1"
                            style={{
                              background: 'transparent',
                              borderBottom: '1px dashed #dee2e6',
                              borderRadius: 0
                            }}
                            onFocus={(e) => e.target.style.borderBottom = '1px solid #0d6efd'}
                            onBlur={(e) => e.target.style.borderBottom = '1px dashed #dee2e6'}
                          />
                        ) : (
                          participant.role
                        )}
                      </td>
                      <td>
                        {(sessionStatus === 'setup' || sessionStatus === 'ready') ? (
                          <input
                            type="text"
                            value={participant.department}
                            onChange={(e) => {
                              const updatedParticipants = [...participants];
                              updatedParticipants[index] = { ...participant, department: e.target.value };
                              setParticipants(updatedParticipants);
                            }}
                            className="form-control form-control-sm border-0 p-1"
                            style={{
                              background: 'transparent',
                              borderBottom: '1px dashed #dee2e6',
                              borderRadius: 0
                            }}
                            onFocus={(e) => e.target.style.borderBottom = '1px solid #0d6efd'}
                            onBlur={(e) => e.target.style.borderBottom = '1px dashed #dee2e6'}
                          />
                        ) : (
                          participant.department
                        )}
                      </td>
                      <td>
                        {participant.isConnected ? (
                          <CheckCircle size={16} className="text-success" />
                        ) : (
                          <AlertTriangle size={16} className="text-muted" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            
            {!audioPermissionGranted && (
              <Alert variant="warning" className="mt-3">
                <AlertTriangle size={20} className="me-2" />
                Audio permission required. Please grant microphone access to start the session.
                <Button 
                  variant="outline-warning" 
                  size="sm" 
                  className="ms-2"
                  onClick={requestAudioPermission}
                >
                  Request Permission
                </Button>
              </Alert>
            )}
            
            {transcriptionError && (
              <Alert variant="danger" className="mt-3">
                <AlertTriangle size={20} className="me-2" />
                Transcription error: {transcriptionError.message}
              </Alert>
            )}
          </Card.Body>
        )}
        {participantTableCollapsed && sessionStatus === 'recording' && (
          <Card.Body className="py-2">
            <div className="d-flex align-items-center gap-2">
              <Activity size={16} className="text-success" />
              <span className="text-muted">Recording in progress - {participants.length} participant(s)</span>
            </div>
          </Card.Body>
        )}
      </Card>

      {/* Live Assessment */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">Live Assessment</h5>
        </Card.Header>
        <Card.Body>
          <Tab.Container activeKey={activeMainTab} onSelect={(k) => k && setActiveMainTab(k)}>
            <Nav variant="tabs" className="mb-3">
              <Nav.Item>
                <Nav.Link eventKey="transcript">
                  <FileText size={16} className="me-2" />
                  Transcript
                  {sessionStatus === 'recording' && (
                    <Activity size={14} className="ms-2 text-success" />
                  )}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="assessment">
                  <CheckCircle size={16} className="me-2" />
                  Assessment
                  {participants.some(p => p.assessmentResults && p.assessmentResults.length > 0) && (
                    <Badge bg="success" className="ms-2">
                      {participants.filter(p => p.assessmentResults && p.assessmentResults.length > 0).length}
                    </Badge>
                  )}
                </Nav.Link>
              </Nav.Item>
            </Nav>

            <Tab.Content>
              {/* Consolidated Transcript Tab */}
              <Tab.Pane eventKey="transcript">
                <Card>
                  <Card.Header className="bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">Multi-Participant Conversation</h6>
                      <div className="d-flex gap-2 align-items-center">
                        {isUploadMode && speakerSegments.length > 0 && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={triggerManualAssessment}
                          >
                            <Send size={16} className="me-2" />
                            Assess Now
                          </Button>
                        )}
                        {participants.map((p, index) => (
                          <Badge
                            key={p.id}
                            style={{
                              backgroundColor: ['#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#20c997', '#fd7e14', '#e83e8c'][index % 8],
                              color: 'white'
                            }}
                          >
                            {p.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Card.Header>
                  <Card.Body style={{ height: '500px', overflow: 'auto' }}>
                    <SpeakerDiarizedTranscript
                      segments={speakerSegments}
                      speakerMapping={speakerMapping}
                      placeholder={isUploadMode ? "Upload a Soniox transcription JSON file to begin." : "No transcript available yet. Start the session to begin transcription."}
                      enableAutoScroll={isSessionActive}
                      availableParticipants={participants.map(p => p.name)}
                      onSpeakerCorrection={handleSpeakerCorrection}
                    />
                  </Card.Body>
                </Card>

                {isSessionActive && (
                  <Alert variant="info" className="mt-3">
                    <Activity size={16} className="me-2" />
                    Live transcription in progress. Consolidated transcript will be sent to server every 30 seconds for AI assessment processing.
                  </Alert>
                )}

                {/* Async Transcription Status */}
                {asyncTranscriptionStatus !== 'idle' && (
                  <Alert
                    variant={asyncTranscriptionStatus === 'completed' ? 'success' : asyncTranscriptionStatus === 'error' ? 'danger' : 'info'}
                    className="mt-3"
                  >
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        {asyncTranscriptionStatus === 'submitting' && (
                          <>
                            <Activity size={16} className="me-2" />
                            Submitting audio for enhanced transcription...
                          </>
                        )}
                        {asyncTranscriptionStatus === 'processing' && (
                          <>
                            <Activity size={16} className="me-2" />
                            Processing enhanced transcription with improved speaker diarization...
                          </>
                        )}
                        {asyncTranscriptionStatus === 'completed' && (
                          <>
                            <CheckCircle size={16} className="me-2" />
                            Enhanced transcription completed! Transcript updated with improved accuracy.
                          </>
                        )}
                        {asyncTranscriptionStatus === 'error' && (
                          <>
                            <AlertTriangle size={16} className="me-2" />
                            Enhanced transcription failed. Using live transcription results.
                          </>
                        )}
                      </div>
                      {asyncTranscriptionStatus === 'processing' && (
                        <div style={{ minWidth: '200px' }}>
                          <ProgressBar now={asyncTranscriptionProgress} label={`${Math.round(asyncTranscriptionProgress)}%`} />
                        </div>
                      )}
                    </div>
                  </Alert>
                )}
              </Tab.Pane>

              {/* Assessment Table Tab */}
              <Tab.Pane eventKey="assessment">
                <Card>
                  <Card.Header className="bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">Assessment Results Matrix</h6>
                      <div>
                        {participants.every(p => p.assessmentResults && p.assessmentResults.length > 0) ? (
                          <>
                            <CheckCircle size={20} className="text-success me-2" />
                            <span className="text-success">All Assessments Complete</span>
                          </>
                        ) : participants.some(p => p.assessmentResults && p.assessmentResults.length > 0) ? (
                          <>
                            <Activity size={20} className="text-warning me-2" />
                            <span className="text-warning">Partial Results Available</span>
                          </>
                        ) : participants.some(p => p.transcript) ? (
                          <>
                            <Clock size={20} className="text-info me-2" />
                            <span className="text-info">Processing Transcripts</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={20} className="text-muted me-2" />
                            <span className="text-muted">Waiting for Data</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <AssessmentTable
                      participants={participants}
                      criteria={assessmentCriteria}
                      groupAssessment={groupAssessment}
                      sessionId={sessionId}
                      audioBlob={recordedAudioBlob}
                    />
                  </Card.Body>
                </Card>
                
                {!participants.some(p => p.assessmentResults && p.assessmentResults.length > 0) && (
                  <Alert variant="info" className="mt-3">
                    <Info size={16} className="me-2" />
                    Assessment results will appear here after the AI processes the conversation transcript. The system evaluates each participant individually based on their contributions to the discussion.
                  </Alert>
                )}
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AssessmentSession;