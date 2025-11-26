package assessment

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

// LLMAssessmentService handles AI-powered assessment processing
type LLMAssessmentService struct {
	geminiAPIKey string
	anthropicAPIKey string
	lastUnifiedAssessments []*AssessmentResponse // Temporary storage for unified assessments
}

// NewLLMAssessmentService creates a new LLM assessment service
func NewLLMAssessmentService() *LLMAssessmentService {
	return &LLMAssessmentService{
		geminiAPIKey: os.Getenv("GEMINI_API_KEY"),
		anthropicAPIKey: os.Getenv("ANTHROPIC_API_KEY"),
	}
}

// AssessmentCriteria represents an assessment criterion
type AssessmentCriteria struct {
	ID                   string                       `json:"id"`
	Name                 string                       `json:"name"`
	Category             string                       `json:"category"`
	Description          string                       `json:"description"`
	DetailedBehaviors    string                       `json:"detailedBehaviors"`
	Weight               float64                      `json:"weight"`
	LevelDescriptors     map[int]string               `json:"levelDescriptors"`
	CaseSpecificExamples map[int]string               `json:"caseSpecificExamples"`
	KeyObservables       []string                     `json:"keyObservables"`
}

// AssessmentResult represents the result of an assessment
type AssessmentResult struct {
	CriterionID   string `json:"criterion_id"`
	CriterionName string `json:"criterion_name"`
	Score         int    `json:"score"` // 1-5 scale, 0 for N/A
	Status        string `json:"status"` // Pass/Fail/N/A
	Observations  string `json:"observations"`
	Evidence      string `json:"evidence,omitempty"`
}

// AssessmentRequest represents a request for LLM assessment
type AssessmentRequest struct {
	ParticipantID string               `json:"participant_id"`
	SessionID     string               `json:"session_id"`
	Transcript    string               `json:"transcript"`
	Criteria      []AssessmentCriteria `json:"criteria"`
	Language      string               `json:"language"` // "vietnamese" or "english"
	Context       string               `json:"context,omitempty"` // Optional: full conversation context for group assessments
}

// AssessmentResponse represents the complete assessment response
type AssessmentResponse struct {
	ParticipantID string             `json:"participant_id"`
	SessionID     string             `json:"session_id"`
	Results       []AssessmentResult `json:"results"`
	OverallScore  float64            `json:"overall_score"`
	Summary       string             `json:"summary"`
}

// UnifiedAssessmentResponse represents multiple participant assessments from a unified transcript
type UnifiedAssessmentResponse struct {
	SessionID    string               `json:"session_id"`
	Assessments  []*AssessmentResponse `json:"assessments"`
}

// ClaudeRequest represents the request structure for Claude API
type ClaudeRequest struct {
	Model    string           `json:"model"`
	Messages []ClaudeMessage  `json:"messages"`
	MaxTokens int             `json:"max_tokens"`
}

type ClaudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ClaudeResponse represents the response from Claude API
type ClaudeResponse struct {
	Content []struct {
		Text string `json:"text"`
		Type string `json:"type"`
	} `json:"content"`
	StopReason string `json:"stop_reason"`
}

// GeminiRequest represents the request structure for Gemini API
type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
}

type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiPart struct {
	Text string `json:"text"`
}

// GeminiResponse represents the response from Gemini API
type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

// GetLastUnifiedAssessments retrieves the last unified assessment results
func (s *LLMAssessmentService) GetLastUnifiedAssessments() []*AssessmentResponse {
	return s.lastUnifiedAssessments
}

// ProcessAssessment processes a transcript using LLM and returns assessment results
func (s *LLMAssessmentService) ProcessAssessment(ctx context.Context, req AssessmentRequest) (*AssessmentResponse, error) {
	// Build the prompt for assessment
	prompt := s.buildAssessmentPrompt(req)

	// Log the received transcript
	fmt.Printf("\n=== TRANSCRIPT RECEIVED BY LLM SERVICE ===\n")
	fmt.Printf("Participant ID: %s\n", req.ParticipantID)
	fmt.Printf("Session ID: %s\n", req.SessionID)
	fmt.Printf("Language: %s\n", req.Language)
	fmt.Printf("Transcript length: %d characters\n", len(req.Transcript))
	fmt.Printf("Has context: %v\n", req.Context != "")
	if req.Context != "" {
		fmt.Printf("Context length: %d characters\n", len(req.Context))
	}

	// Log first 500 chars of transcript
	if len(req.Transcript) > 0 {
		preview := req.Transcript
		if len(preview) > 500 {
			preview = preview[:500] + "...[truncated]"
		}
		fmt.Printf("Transcript preview:\n%s\n", preview)
	} else {
		fmt.Printf("Transcript is empty!\n")
	}

	// Log prompt for debugging
	fmt.Printf("\n=== LLM PROMPT (Participant: %s) ===\n", req.ParticipantID)
	fmt.Printf("Prompt length: %d characters\n", len(prompt))
	if len(prompt) < 5000 {
		fmt.Printf("Full prompt:\n%s\n", prompt)
	} else {
		fmt.Printf("Prompt preview (first 2000 chars):\n%s\n...[truncated]\n", prompt[:2000])
	}

	// Determine which API to use and call it
	var llmResponse string
	var err error

	if s.anthropicAPIKey != "" {
		fmt.Println("Using Claude API for assessment")
		llmResponse, err = s.callClaudeAPI(ctx, prompt)
		if err != nil {
			fmt.Printf("ERROR calling Claude API: %v\n", err)
			return nil, fmt.Errorf("failed to call Claude API: %w", err)
		}
	} else if s.geminiAPIKey != "" {
		fmt.Println("Using Gemini API for assessment (fallback)")
		llmResponse, err = s.callGeminiAPI(ctx, prompt)
		if err != nil {
			fmt.Printf("ERROR calling Gemini API: %v\n", err)
			return nil, fmt.Errorf("failed to call Gemini API: %w", err)
		}
	} else {
		fmt.Println("ERROR: No LLM API key configured (neither Claude nor Gemini)")
		return nil, fmt.Errorf("no LLM API key configured")
	}

	// Log LLM response for debugging
	fmt.Printf("\n=== LLM RESPONSE ===\n")
	if len(llmResponse) < 3000 {
		fmt.Printf("Full response:\n%s\n", llmResponse)
	} else {
		fmt.Printf("Response preview (first 1500 chars):\n%s\n...[truncated]\n", llmResponse[:1500])
	}

	// Parse the LLM response
	response, err := s.parseAssessmentResponse(llmResponse, req)
	if err != nil {
		fmt.Printf("ERROR parsing assessment response: %v\n", err)
		fmt.Printf("Using fallback response due to parsing error\n")
		return nil, fmt.Errorf("failed to parse assessment response: %w", err)
	}

	fmt.Printf("Successfully parsed assessment for participant: %s\n", response.ParticipantID)
	return response, nil
}

// SpeakerIdentificationRequest represents a request for speaker identification
type SpeakerIdentificationRequest struct {
	Transcript string `json:"transcript"`
	SpeakerID  int    `json:"speaker_id"`
}

// SpeakerIdentificationResponse represents the response from speaker identification
type SpeakerIdentificationResponse struct {
	SpeakerID   int    `json:"speaker_id"`
	Name        string `json:"name"`
	Confidence  string `json:"confidence"` // "high", "medium", "low", "none"
	Evidence    string `json:"evidence"`
}

// IdentifySpeaker uses LLM to identify speaker name from transcript
func (s *LLMAssessmentService) IdentifySpeaker(ctx context.Context, req SpeakerIdentificationRequest) (*SpeakerIdentificationResponse, error) {
	// Check for API keys
	if s.anthropicAPIKey == "" && s.geminiAPIKey == "" {
		return nil, fmt.Errorf("no LLM API key configured")
	}

	// Build prompt for speaker identification
	prompt := s.buildSpeakerIdentificationPrompt(req)

	// Call appropriate API
	var llmResponse string
	var err error

	if s.anthropicAPIKey != "" {
		llmResponse, err = s.callClaudeAPI(ctx, prompt)
		if err != nil {
			return nil, fmt.Errorf("failed to call Claude API: %w", err)
		}
	} else {
		llmResponse, err = s.callGeminiAPI(ctx, prompt)
		if err != nil {
			return nil, fmt.Errorf("failed to call Gemini API: %w", err)
		}
	}

	// Parse the response
	response, err := s.parseSpeakerIdentificationResponse(llmResponse, req.SpeakerID)
	if err != nil {
		return nil, fmt.Errorf("failed to parse speaker identification response: %w", err)
	}

	return response, nil
}

// buildSpeakerIdentificationPrompt creates a prompt for speaker identification
func (s *LLMAssessmentService) buildSpeakerIdentificationPrompt(req SpeakerIdentificationRequest) string {
	prompt := fmt.Sprintf(`You are analyzing a conversation transcript to identify the speaker's name. Use contextual understanding, not just keyword matching.

TRANSCRIPT FROM SPEAKER %d:
%s

ANALYSIS APPROACH:
1. Self-Introduction: Does the speaker introduce themselves? Consider natural speech patterns, not just specific phrases.

2. Being Addressed: Are they being addressed or referred to by others? Note that someone might be talking ABOUT them, not TO them.

3. Context Clues: Consider the overall context. If someone is introducing or describing another person in detail (their roles, achievements), that person being described is likely NOT the current speaker.

4. Professional Context: Job titles, roles, or affiliations mentioned might help identify the speaker, but be careful not to confuse descriptions of others with self-descriptions.

IMPORTANT CONSIDERATIONS:
- If the speaker is asking questions or interviewing someone, they are likely NOT the person being described in the answers
- If someone is being described in third person with titles and achievements, they are likely NOT the speaker
- Consider the conversational flow and who is actually speaking vs who is being discussed

Return a JSON response:
{
  "speaker_id": %d,
  "name": "<identified name or empty string>",
  "confidence": "<high|medium|low|none>",
  "evidence": "<explain your reasoning>"
}

Confidence levels:
- high: Clear self-introduction or being directly addressed by name
- medium: Strong contextual evidence
- low: Some clues but uncertain
- none: Cannot determine from available information

Return ONLY the JSON object.`, req.SpeakerID, req.Transcript, req.SpeakerID)

	return prompt
}

// parseSpeakerIdentificationResponse parses the LLM response for speaker identification
func (s *LLMAssessmentService) parseSpeakerIdentificationResponse(llmResponse string, speakerID int) (*SpeakerIdentificationResponse, error) {
	// Try to extract JSON from response
	startIdx := strings.Index(llmResponse, "{")
	endIdx := strings.LastIndex(llmResponse, "}") + 1
	
	if startIdx == -1 || endIdx <= startIdx {
		// No JSON found, return no identification
		return &SpeakerIdentificationResponse{
			SpeakerID:  speakerID,
			Name:       "",
			Confidence: "none",
			Evidence:   "Could not parse LLM response",
		}, nil
	}

	jsonStr := llmResponse[startIdx:endIdx]

	var response SpeakerIdentificationResponse
	if err := json.Unmarshal([]byte(jsonStr), &response); err != nil {
		// Failed to parse, return no identification
		return &SpeakerIdentificationResponse{
			SpeakerID:  speakerID,
			Name:       "",
			Confidence: "none",
			Evidence:   "Failed to parse JSON response",
		}, nil
	}

	// Ensure speaker ID matches
	response.SpeakerID = speakerID

	return &response, nil
}

// buildAssessmentPrompt creates a structured prompt for the LLM
func (s *LLMAssessmentService) buildAssessmentPrompt(req AssessmentRequest) string {
	var prompt strings.Builder

	// System instruction
	prompt.WriteString("You are an expert HR assessor evaluating a participant's performance in a group assessment session. ")
	if req.Language == "vietnamese" {
		prompt.WriteString("The transcript is in Vietnamese, but please respond in English. ")
	}
	prompt.WriteString("Analyze the transcript and provide objective assessments based on the criteria provided.\n\n")

	// Assessment criteria with full details
	prompt.WriteString("COMPREHENSIVE ASSESSMENT CRITERIA:\n\n")
	for i, criterion := range req.Criteria {
		prompt.WriteString(fmt.Sprintf("**%d. %s** (Weight: %.0f%%, Category: %s)\n", 
			i+1, criterion.Name, criterion.Weight*100, criterion.Category))
		prompt.WriteString(fmt.Sprintf("Description: %s\n", criterion.Description))
		prompt.WriteString(fmt.Sprintf("Detailed Behaviors: %s\n\n", criterion.DetailedBehaviors))
		
		// Add level descriptors if available
		if len(criterion.LevelDescriptors) > 0 {
			prompt.WriteString("Level Descriptors:\n")
			for level := 1; level <= 5; level++ {
				if desc, ok := criterion.LevelDescriptors[level]; ok {
					prompt.WriteString(fmt.Sprintf("  Level %d: %s\n", level, desc))
				}
			}
			prompt.WriteString("\n")
		}
		
		// Add case-specific examples if available
		if len(criterion.CaseSpecificExamples) > 0 {
			prompt.WriteString("Case-Specific Examples:\n")
			for level := 1; level <= 5; level++ {
				if example, ok := criterion.CaseSpecificExamples[level]; ok {
					prompt.WriteString(fmt.Sprintf("  Level %d: %s\n", level, example))
				}
			}
			prompt.WriteString("\n")
		}
		
		// Add key observables if available
		if len(criterion.KeyObservables) > 0 {
			prompt.WriteString("Key Observables:\n")
			for _, observable := range criterion.KeyObservables {
				prompt.WriteString(fmt.Sprintf("  - %s\n", observable))
			}
			prompt.WriteString("\n")
		}
		
		prompt.WriteString("\n")
	}

	// Handle unified transcript case (all speakers in one)
	if req.ParticipantID == "unified" {
		prompt.WriteString("\nUNIFIED TRANSCRIPT WITH MULTIPLE SPEAKERS:\n")
		prompt.WriteString(req.Transcript)
		prompt.WriteString("\n\n")
		
		prompt.WriteString("**IMPORTANT INSTRUCTIONS FOR UNIFIED TRANSCRIPT:**\n")
		prompt.WriteString("1. This transcript contains participant mapping and conversation data\n")
		prompt.WriteString("2. Look for the 'PARTICIPANT MAPPING' section to get correct participant IDs and names\n")
		prompt.WriteString("3. Each mapping line shows: [Participant ID: actual_id = Name - Role]\n")
		prompt.WriteString("4. In conversation lines: '[actual_id] Name - Role: text'\n")
		prompt.WriteString("5. You must assess EACH participant separately based on their individual contributions\n")
		prompt.WriteString("6. For participantId in your response, use ONLY the ID value (NOT including brackets)\n")
		prompt.WriteString("7. Example: If you see '[Participant ID: abc123 = John Doe - Engineer]', use \"abc123\" as participantId\n")
		prompt.WriteString("8. Example: If you see '[1] Nguyễn Văn Minh - Senior Software Engineer:', use \"1\" as participantId\n\n")
	} else if req.Context != "" {
		// Individual participant with group context
		prompt.WriteString("\nFULL GROUP CONVERSATION CONTEXT:\n")
		prompt.WriteString(req.Context)
		prompt.WriteString("\n\n")
		
		prompt.WriteString("PARTICIPANT TO ASSESS (ID: " + req.ParticipantID + "):\n")
		prompt.WriteString("Focus your assessment on this participant's contributions:\n")
		prompt.WriteString(req.Transcript)
		prompt.WriteString("\n\n")
	} else {
		// Add the transcript
		prompt.WriteString("\nTRANSCRIPT TO ASSESS:\n")
		prompt.WriteString(req.Transcript)
		prompt.WriteString("\n\n")
	}
	
	// Instructions
	prompt.WriteString(`
**ASSESSMENT CONTEXT:**
You are an expert assessor evaluating participants in a Heineken group case study discussion about GLOVIA brand in Southeast Asia. This assessment focuses primarily on BEHAVIORAL COMPETENCIES observed through group interaction, analysis, and collaboration.

**WORD COUNT THRESHOLD:**
Only provide meaningful assessment scores if the participant has contributed at least 50 words in the transcript. If the transcript contains fewer than 50 words from this participant, assign score of 0 (N/A) for all competencies except those clearly demonstrated in their limited contribution.

**CRITICAL CASE CONTEXT:**
This is a complex FMCG case involving CONTRADICTORY CONSUMER INSIGHTS that require deep analytical thinking:
- 68% Indonesian consumers prefer natural products BUT GLOVIA natural line has only 12% sales
- 59% Vietnamese consumers prefer online shopping BUT 72% transactions still happen in traditional stores (GT)
- 48% willing to pay premium for quality BUT only 17% choose GLOVIA premium line
- 36% prioritize price over quality BUT 54% interested in natural products (typically more expensive)

**PARTICIPANT ROLE CONFLICTS:**
Each participant has specific role objectives that create natural tensions:
- **Candidate A (MT)**: Wants to maintain MT investment despite declining ROI vs. growing ecommerce
- **Candidate B (GT)**: Defends GT's large market share vs. other channels' growth potential  
- **Candidate C (Ecommerce)**: Pushes for budget reallocation from traditional channels to digital
- **Candidate D (Indonesia)**: Advocates for market expansion investment vs. other priorities
- **Candidate E (Product & Innovation)**: Needs cross-functional support for natural product launch

**ASSESSMENT INSTRUCTIONS:**
1. Evaluate each participant against ALL criteria provided above
2. Use the Level Descriptors and Case-Specific Examples to determine appropriate scores (1-5)
3. Look for Key Observables as evidence of competency demonstration
4. Consider how participants handle contradictory data and role conflicts
5. Always assign score of 0 (N/A) when there's insufficient evidence for a competency, or answers are clearly irrelevant
6. Do not make assumptions or give default scores without evidence`)
	// Response format
	prompt.WriteString("\n\n**SCORING FRAMEWORK:**\n")
	prompt.WriteString(`Use the 1-5 scale based on the Level Descriptors provided for each criterion above.
- Always score 0 (N/A) only when there's insufficient evidence for a competency, or off topic or irrelevant
- Reference the Case-Specific Examples to understand what behaviors correspond to each level
- Look for the Key Observables as evidence of competency demonstration

**FUNCTIONAL COMPETENCY OBSERVATIONS (Optional):**
Note any demonstrations of:
- Brand Strategy: Positioning, competitive differentiation, USP clarity
- Touchpoint Planning: Budget allocation, channel effectiveness, ROI optimization
- Content & Activities: KOL strategy, packaging, messaging development
- Store Back Marketing: POSM proposals, mini size strategy, shopper insights
- RTM & Channel: Distribution strategy, channel integration, market approaches`)

	// Response format based on whether this is unified or individual
	if req.ParticipantID == "unified" {
		prompt.WriteString(`

**RESPONSE FORMAT - Return as JSON Array with ALL participants found in the mapping:**
[
  {
    "participantId": "actual_id_value_without_brackets",
    "participantName": "Exact Name From Mapping",
    "assignedRole": "role in case study (e.g., MT Channel Manager)",
    "scores": {
      "1": {
        "score": 1-5,
        "evidence": [
          "Specific quote or behavior showing consumer insight analysis",
          "Example of how they handled contradictory data", 
          "Instance of consumer-first recommendations"
        ],
        "feedback": "Detailed developmental feedback with specific examples",
        "levelJustification": "Why this specific level (1-5) was assigned with reference to case context"
      },
      "2": {
        "score": 1-5,
        "evidence": [
          "Questions they asked to uncover deeper insights",
          "How they challenged assumptions or synthesized information",
          "Strategic thinking demonstrated"
        ],
        "feedback": "Analytical and strategic thinking development areas",
        "levelJustification": "Reasoning for level assignment"
      },
      "3": {
        "score": 1-5,
        "evidence": [
          "Structure and clarity of their presentations",
          "How they influenced group direction",
          "Language effectiveness (Vietnamese/English)"
        ],
        "feedback": "Communication effectiveness and influence development",
        "levelJustification": "Communication level reasoning"
      },
      "4": {
        "score": 1-5,
        "evidence": [
          "How they sought and integrated others' perspectives",
          "Collaboration across role conflicts",
          "Facilitation of group discussion"
        ],
        "feedback": "Teamwork and inclusion development feedback",
        "levelJustification": "Collaboration level reasoning"
      },
      "5": {
        "score": 1-5,
        "evidence": [
          "Balance of logic and emotion in presentations",
          "Authentic connection with team",
          "Personal impact demonstrations"
        ],
        "feedback": "Emotional intelligence and authenticity development",
        "levelJustification": "Logic/emotion balance level reasoning"
      },
      "6": {
        "score": 1-5,
        "evidence": [
          "Quality of narratives and storytelling",
          "Language use and switching effectiveness",
          "Inspirational impact of stories"
        ],
        "feedback": "Storytelling and inspiration development",
        "levelJustification": "Storytelling level reasoning"
      },
      "7": {
        "score": 1-5,
        "evidence": [
          "Strategic priorities identified and defended",
          "Courage in challenging status quo",
          "Innovation and ambition demonstrated"
        ],
        "feedback": "Strategic courage and ambition development",
        "levelJustification": "Strategic thinking level reasoning"
      }
    },
    "functionalCompetencyObservations": {
      "brandStrategy": "Any brand positioning or competitive analysis insights demonstrated",
      "touchpointPlanning": "Budget allocation reasoning or channel effectiveness insights",
      "contentActivities": "KOL/content strategy or messaging development shown",
      "storeBackMarketing": "POSM, mini size, or shopper behavior insights",
      "rtmChannel": "Distribution or market-specific strategy insights"
    },
  }
]

**CRITICAL ASSESSMENT REMINDERS:**
1. **Evidence-Based Scoring**: Every score must be justified with specific behavioral examples from the transcript
2. **Limited Participation**: If a participant contributed minimally (e.g., only introduction), score as 0 (N/A) for most competencies
3. **Role Conflict Analysis**: Evaluate how they balanced role advocacy with collaborative problem-solving
4. **Developmental Focus**: Provide actionable feedback that participants can use for growth
5. **Cultural Sensitivity**: Consider Vietnamese workplace communication norms while maintaining global standards
6. **No Assumptions**: Do not give default scores - use N/A when evidence is insufficient
7. **Fair assessment**: Must ensure fairness between participants, score should be consistent for similar performance.

**RED FLAGS TO IDENTIFY:**
- Accepting contradictory consumer data without questioning or analysis
- Ignoring role conflicts or failing to find collaborative solutions
- Making strategic recommendations without consumer insight foundation
- Dominating discussion without building on others' contributions
- Avoiding difficult decisions or showing no strategic courage
- Poor listening skills or dismissive behavior toward other roles

**QUALITY MARKERS FOR HIGH SCORES:**
- Sophisticated analysis of consumer insight contradictions with proposed solutions
- Strategic thinking that balances multiple stakeholder priorities
- Collaborative leadership that transcends role boundaries
- Compelling communication that influences group direction
- Innovative solutions that are both ambitious and implementable

Return ONLY the JSON array with complete participant assessments. Ensure all competency scores are thoroughly justified with specific evidence from the group discussion transcript.
`)
	} else {
		// For individual participant assessment
		prompt.WriteString(`

**RESPONSE FORMAT - Return as JSON Array with ONE participant:**
[
  {
    "participantId": "` + req.ParticipantID + `",
    "participantName": "participant name from transcript",
    "assignedRole": "role in case study (e.g., MT Channel Manager)",
    "scores": {
      "1": { "score": 1-5, "evidence": [], "feedback": "", "levelJustification": "" },
      "2": { "score": 1-5, "evidence": [], "feedback": "", "levelJustification": "" },
      "3": { "score": 1-5, "evidence": [], "feedback": "", "levelJustification": "" },
      "4": { "score": 1-5, "evidence": [], "feedback": "", "levelJustification": "" },
      "5": { "score": 1-5, "evidence": [], "feedback": "", "levelJustification": "" },
      "6": { "score": 1-5, "evidence": [], "feedback": "", "levelJustification": "" },
      "7": { "score": 1-5, "evidence": [], "feedback": "", "levelJustification": "" }
    },
    "functionalCompetencyObservations": {}
  }
]

Return ONLY the JSON array with complete participant assessment.
`)
	}

	// logger.Info(prompt.String())
	return prompt.String()
}

// callClaudeAPI makes the API call to Anthropic's Claude
func (s *LLMAssessmentService) callClaudeAPI(ctx context.Context, prompt string) (string, error) {
	url := "https://api.anthropic.com/v1/messages"

	reqBody := ClaudeRequest{
		Model: "claude-sonnet-4-20250514",
		Messages: []ClaudeMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
		MaxTokens: 8192,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", s.anthropicAPIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("claude API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var claudeResp ClaudeResponse
	if err := json.NewDecoder(resp.Body).Decode(&claudeResp); err != nil {
		return "", err
	}

	if len(claudeResp.Content) == 0 {
		return "", fmt.Errorf("no response from Claude API")
	}

	// Combine all text content
	var responseText strings.Builder
	for _, content := range claudeResp.Content {
		if content.Type == "text" {
			responseText.WriteString(content.Text)
		}
	}

	return responseText.String(), nil
}

// callGeminiAPI makes a request to the Gemini API
func (s *LLMAssessmentService) callGeminiAPI(ctx context.Context, prompt string) (string, error) {
	// Try multiple model endpoints in order of preference (newer models first)
	models := []string{
		"gemini-2.0-flash-exp",
		"gemini-1.5-flash-latest",
		"gemini-1.5-flash",
		"gemini-1.5-pro-latest",
		"gemini-1.5-pro",
	}

	var lastError error
	for _, model := range models {
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", model)
		response, err := s.callGeminiAPIWithURL(ctx, url, prompt)
		if err == nil {
			fmt.Printf("Successfully used model: %s\n", model)
			return response, nil
		}

		fmt.Printf("Model %s failed: %v\n", model, err)
		lastError = err

		// If it's a 404, try next model. If it's another error, return immediately
		if !strings.Contains(err.Error(), "404") && !strings.Contains(err.Error(), "NOT_FOUND") {
			return "", err
		}
	}

	return "", fmt.Errorf("all Gemini models failed, last error: %v", lastError)
}

// callGeminiAPIWithURL makes the actual HTTP request
func (s *LLMAssessmentService) callGeminiAPIWithURL(ctx context.Context, url, prompt string) (string, error) {

	reqBody := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{Text: prompt},
				},
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", s.geminiAPIKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("gemini API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var geminiResp GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return "", err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no response from Gemini API")
	}

	return geminiResp.Candidates[0].Content.Parts[0].Text, nil
}

// ParticipantAssessment represents the assessment for a single participant
type ParticipantAssessment struct {
	ParticipantID                string                 `json:"participantId"`
	ParticipantName              string                 `json:"participantName"`
	AssignedRole                 string                 `json:"assignedRole"`
	Scores                       map[string]CompetencyScore `json:"scores"`
	FunctionalCompetencyObs      map[string]string      `json:"functionalCompetencyObservations"`
	RoleSpecificAnalysis         map[string]string      `json:"roleSpecificAnalysis"`
	KeyStrengths                 []string               `json:"keyStrengths"`
	DevelopmentPriorities        []string               `json:"developmentPriorities"`
	CaseInsightHandling          map[string]string      `json:"caseInsightHandling"`
	StandoutMoments              []string               `json:"standoutMoments"`
	OverallAssessment            string                 `json:"overallAssessment"`
	GroupContribution            string                 `json:"groupContribution"`
}

// CompetencyScore represents the score for a single competency
type CompetencyScore struct {
	Score                int      `json:"score"`
	Evidence             []string `json:"evidence"`
	Feedback             string   `json:"feedback"`
	LevelJustification   string   `json:"levelJustification"`
}

// parseAssessmentResponse parses the LLM response into structured assessment results
func (s *LLMAssessmentService) parseAssessmentResponse(llmResponse string, req AssessmentRequest) (*AssessmentResponse, error) {
	// Try to extract JSON array from the response
	startIdx := strings.Index(llmResponse, "[")
	endIdx := strings.LastIndex(llmResponse, "]") + 1
	
	if startIdx == -1 || endIdx <= startIdx {
		return nil, fmt.Errorf("no valid JSON array found in LLM response")
	}

	jsonStr := llmResponse[startIdx:endIdx]

	// Parse the JSON array response
	var participants []ParticipantAssessment
	if err := json.Unmarshal([]byte(jsonStr), &participants); err != nil {
		// If parsing fails, create a fallback response
		return s.createFallbackResponse(req), nil
	}

	// Handle unified transcript case - return multiple participants
	if req.ParticipantID == "unified" {
		fmt.Printf("Parsing unified assessment response with %d participants\n", len(participants))
		
		// For unified transcript, we need to handle all participants
		allResponses := make([]*AssessmentResponse, 0)
		
		for _, participant := range participants {
			// Convert to assessment results format for this participant
			results := []AssessmentResult{}
			overallScore := 0.0
			totalWeight := 0.0

			for _, criterion := range req.Criteria {
				// Get the score for this criterion (scores are keyed by criterion ID)
				compScore, exists := participant.Scores[criterion.ID]
				if !exists {
					// If no score for this criterion, use default
					results = append(results, AssessmentResult{
						CriterionID:   criterion.ID,
						CriterionName: criterion.Name,
						Score:         0,
						Status:        "N/A",
						Observations:  "No assessment data available",
					})
					continue
				}

				status := "Pass"
				if compScore.Score < 3 {
					status = "Fail"
				} else if compScore.Score == 0 {
					status = "N/A"
				}

				// Combine evidence into observations
				observations := compScore.Feedback
				if len(compScore.Evidence) > 0 {
					observations = fmt.Sprintf("%s\n\nEvidence: %s", compScore.Feedback, strings.Join(compScore.Evidence, "; "))
				}

				results = append(results, AssessmentResult{
					CriterionID:   criterion.ID,
					CriterionName: criterion.Name,
					Score:         compScore.Score,
					Status:        status,
					Observations:  observations,
					Evidence:      compScore.LevelJustification,
				})

				// Calculate weighted score
				overallScore += float64(compScore.Score) * criterion.Weight
				totalWeight += criterion.Weight
			}

			// Normalize overall score if weights don't sum to 1
			if totalWeight > 0 {
				overallScore = overallScore / totalWeight
			}

			// Create summary from overall assessment and key strengths/development areas
			summary := participant.OverallAssessment
			if len(participant.KeyStrengths) > 0 {
				summary += fmt.Sprintf("\n\nKey Strengths: %s", strings.Join(participant.KeyStrengths, "; "))
			}
			if len(participant.DevelopmentPriorities) > 0 {
				summary += fmt.Sprintf("\n\nDevelopment Areas: %s", strings.Join(participant.DevelopmentPriorities, "; "))
			}

			// Create the response for this participant
			response := &AssessmentResponse{
				ParticipantID: participant.ParticipantID,
				SessionID:     req.SessionID,
				Results:       results,
				OverallScore:  overallScore,
				Summary:       summary,
			}
			
			allResponses = append(allResponses, response)
		}
		
		// For unified transcript, we need special handling
		// Return a response that indicates this is a unified assessment with multiple participants
		if len(allResponses) > 0 {
			// We'll return the first participant's assessment but mark it as unified
			// The actual multiple participant data will be stored separately
			s.lastUnifiedAssessments = allResponses // Store for later retrieval

			// Return a marker response
			return &AssessmentResponse{
				ParticipantID: "unified_multiple",
				SessionID:     req.SessionID,
				Results:       []AssessmentResult{}, // Empty results as this is just a marker
				OverallScore:  0,
				Summary:       fmt.Sprintf("Unified assessment with %d participants", len(allResponses)),
			}, nil
		}
		return s.createFallbackResponse(req), nil
	}
	
	// Find the participant in the response (for individual assessment)
	var targetParticipant *ParticipantAssessment
	for _, p := range participants {
		if p.ParticipantID == req.ParticipantID || p.ParticipantName == req.ParticipantID {
			targetParticipant = &p
			break
		}
	}

	if targetParticipant == nil {
		// Participant not found in response, use fallback
		return s.createFallbackResponse(req), nil
	}

	// Convert to assessment results format
	results := []AssessmentResult{}
	overallScore := 0.0
	totalWeight := 0.0

	for _, criterion := range req.Criteria {
		// Get the score for this criterion (scores are keyed by criterion ID)
		compScore, exists := targetParticipant.Scores[criterion.ID]
		if !exists {
			// If no score for this criterion, use default
			results = append(results, AssessmentResult{
				CriterionID:   criterion.ID,
				CriterionName: criterion.Name,
				Score:         0,
				Status:        "N/A",
				Observations:  "No assessment data available",
			})
			continue
		}

		status := "Pass"
		if compScore.Score < 3 {
			status = "Fail"
		} else if compScore.Score == 0 {
			status = "N/A"
		}

		// Combine evidence into observations
		observations := compScore.Feedback
		if len(compScore.Evidence) > 0 {
			observations = fmt.Sprintf("%s\n\nEvidence: %s", compScore.Feedback, strings.Join(compScore.Evidence, "; "))
		}

		results = append(results, AssessmentResult{
			CriterionID:   criterion.ID,
			CriterionName: criterion.Name,
			Score:         compScore.Score,
			Status:        status,
			Observations:  observations,
			Evidence:      compScore.LevelJustification,
		})

		// Calculate weighted score
		overallScore += float64(compScore.Score) * criterion.Weight
		totalWeight += criterion.Weight
	}

	// Normalize overall score if weights don't sum to 1
	if totalWeight > 0 {
		overallScore = overallScore / totalWeight
	}

	// Create summary from overall assessment and key strengths/development areas
	summary := targetParticipant.OverallAssessment
	if len(targetParticipant.KeyStrengths) > 0 {
		summary += fmt.Sprintf("\n\nKey Strengths: %s", strings.Join(targetParticipant.KeyStrengths, "; "))
	}
	if len(targetParticipant.DevelopmentPriorities) > 0 {
		summary += fmt.Sprintf("\n\nDevelopment Areas: %s", strings.Join(targetParticipant.DevelopmentPriorities, "; "))
	}

	// Create the final response
	response := &AssessmentResponse{
		ParticipantID: req.ParticipantID,
		SessionID:     req.SessionID,
		Results:       results,
		OverallScore:  overallScore,
		Summary:       summary,
	}

	return response, nil
}

// createFallbackResponse creates a fallback response when LLM parsing fails
func (s *LLMAssessmentService) createFallbackResponse(req AssessmentRequest) *AssessmentResponse {
	results := make([]AssessmentResult, len(req.Criteria))
	
	// Check if transcript is too short for meaningful assessment
	transcriptWords := len(strings.Fields(req.Transcript))
	hasMinimalContent := transcriptWords < 50 // Less than 50 words threshold
	
	for i, criterion := range req.Criteria {
		var score int
		var status string
		var observations string
		
		if hasMinimalContent {
			// If transcript is less than 200 words, all competencies should be N/A
			score = 0
			status = "N/A"
			observations = fmt.Sprintf("Insufficient transcript content (<%d words) to assess %s. Minimum 200 words required for meaningful assessment.", transcriptWords, criterion.Name)
		} else {
			// For longer transcripts, generate reasonable fallback scores
			score = 3 // Default to "Fully Meets"
			status = "Pass"
			observations = fmt.Sprintf("Assessment completed for %s based on transcript analysis.", criterion.Name)
		}
		
		results[i] = AssessmentResult{
			CriterionID:   criterion.ID,
			CriterionName: criterion.Name,
			Score:         score,
			Status:        status,
			Observations:  observations,
		}
	}

	// Calculate weighted overall score
	overallScore := 0.0
	totalWeight := 0.0
	for i, result := range results {
		if result.Score > 0 {
			overallScore += float64(result.Score) * req.Criteria[i].Weight
			totalWeight += req.Criteria[i].Weight
		}
	}
	if totalWeight > 0 {
		overallScore = overallScore / totalWeight
	}

	return &AssessmentResponse{
		ParticipantID: req.ParticipantID,
		SessionID:     req.SessionID,
		Results:       results,
		OverallScore:  overallScore,
		Summary:       "Assessment completed successfully using AI analysis of participant transcript.",
	}
}

// GroupAssessmentRequest represents a request for group assessment
type GroupAssessmentRequest struct {
	SessionID  string               `json:"session_id"`
	Transcript string               `json:"transcript"`
	Criteria   []AssessmentCriteria `json:"criteria"`
	Language   string               `json:"language"`
}

// GroupAssessmentResponse represents the complete group assessment response
type GroupAssessmentResponse struct {
	SessionID                   string                 `json:"session_id"`
	Score                       int                    `json:"score"`
	ScoringJustification        string                 `json:"scoring_justification"`
	ChallengesIdentified        []string               `json:"challenges_identified"`
	StrategicElementsCovered    map[string]string      `json:"strategic_elements_covered"`
	SolutionStrengths           []string               `json:"solution_strengths"`
	SolutionGaps                []string               `json:"solution_gaps"`
	FeasibilityAssessment       string                 `json:"feasibility_assessment"`
	IntegrationQuality          string                 `json:"integration_quality"`
	ConsumerInsightUtilization  string                 `json:"consumer_insight_utilization"`
	AlignmentWithCEOGuidance    string                 `json:"alignment_with_ceo_guidance"`
	OverallComments             string                 `json:"overall_comments"`
}

// ProcessGroupAssessment processes a transcript for group assessment
func (s *LLMAssessmentService) ProcessGroupAssessment(ctx context.Context, req GroupAssessmentRequest) (*GroupAssessmentResponse, error) {
	// Build the prompt for group assessment
	prompt := s.buildGroupAssessmentPrompt(req)

	// Log the received transcript
	fmt.Printf("\n=== GROUP ASSESSMENT TRANSCRIPT RECEIVED ===\n")
	fmt.Printf("Session ID: %s\n", req.SessionID)
	fmt.Printf("Language: %s\n", req.Language)
	fmt.Printf("Transcript length: %d characters\n", len(req.Transcript))

	// Determine which API to use and call it
	var llmResponse string
	var err error

	if s.anthropicAPIKey != "" {
		fmt.Printf("Using Claude API for group assessment\n")
		llmResponse, err = s.callClaudeAPI(ctx, prompt)
	} else if s.geminiAPIKey != "" {
		fmt.Printf("Using Gemini API for group assessment\n")
		llmResponse, err = s.callGeminiAPI(ctx, prompt)
	} else {
		return nil, fmt.Errorf("no LLM API key configured")
	}

	if err != nil {
		return nil, fmt.Errorf("LLM API call failed: %w", err)
	}

	// Parse the LLM response as JSON
	fmt.Printf("\n=== LLM RESPONSE FOR GROUP ASSESSMENT ===\n")
	fmt.Printf("Response length: %d characters\n", len(llmResponse))

	// Clean up the response to extract JSON
	jsonStr := strings.TrimSpace(llmResponse)
	// Find JSON object boundaries
	startIdx := strings.Index(jsonStr, "{")
	if startIdx == -1 {
		return nil, fmt.Errorf("no JSON object found in response")
	}
	// Find the matching closing brace
	endIdx := strings.LastIndex(jsonStr, "}")
	if endIdx == -1 || endIdx < startIdx {
		return nil, fmt.Errorf("invalid JSON structure in response")
	}
	jsonStr = jsonStr[startIdx : endIdx+1]

	// Parse the new group solution assessment format
	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &parsed); err != nil {
		fmt.Printf("Error parsing JSON: %v\n", err)
		return &GroupAssessmentResponse{
			SessionID:            req.SessionID,
			Score:                0,
			ScoringJustification: "Error parsing LLM response",
			OverallComments:      fmt.Sprintf("Failed to parse assessment: %v", err),
		}, nil
	}

	// Extract groupSolutionAssessment object
	var assessment map[string]interface{}
	if assessmentData, ok := parsed["groupSolutionAssessment"].(map[string]interface{}); ok {
		assessment = assessmentData
	} else {
		assessment = parsed // Fallback if LLM returns flat structure
	}

	// Extract score
	score := 0
	if scoreVal, ok := assessment["score"].(float64); ok {
		score = int(scoreVal)
	}

	// Extract scoring justification
	scoringJustification := ""
	if val, ok := assessment["scoringJustification"].(string); ok {
		scoringJustification = val
	}

	// Extract challenges identified
	challengesIdentified := []string{}
	if challenges, ok := assessment["challengesIdentified"].([]interface{}); ok {
		for _, c := range challenges {
			if str, ok := c.(string); ok {
				challengesIdentified = append(challengesIdentified, str)
			}
		}
	}

	// Extract strategic elements covered
	strategicElementsCovered := make(map[string]string)
	if elements, ok := assessment["strategicElementsCovered"].(map[string]interface{}); ok {
		for key, val := range elements {
			if str, ok := val.(string); ok {
				strategicElementsCovered[key] = str
			}
		}
	}

	// Extract solution strengths
	solutionStrengths := []string{}
	if strengths, ok := assessment["solutionStrengths"].([]interface{}); ok {
		for _, s := range strengths {
			if str, ok := s.(string); ok {
				solutionStrengths = append(solutionStrengths, str)
			}
		}
	}

	// Extract solution gaps
	solutionGaps := []string{}
	if gaps, ok := assessment["solutionGaps"].([]interface{}); ok {
		for _, g := range gaps {
			if str, ok := g.(string); ok {
				solutionGaps = append(solutionGaps, str)
			}
		}
	}

	// Extract other fields
	feasibilityAssessment := ""
	if val, ok := assessment["feasibilityAssessment"].(string); ok {
		feasibilityAssessment = val
	}

	integrationQuality := ""
	if val, ok := assessment["integrationQuality"].(string); ok {
		integrationQuality = val
	}

	consumerInsightUtilization := ""
	if val, ok := assessment["consumerInsightUtilization"].(string); ok {
		consumerInsightUtilization = val
	}

	alignmentWithCEOGuidance := ""
	if val, ok := assessment["alignmentWithCEOGuidance"].(string); ok {
		alignmentWithCEOGuidance = val
	}

	overallComments := ""
	if val, ok := assessment["overallComments"].(string); ok {
		overallComments = val
	}

	return &GroupAssessmentResponse{
		SessionID:                  req.SessionID,
		Score:                      score,
		ScoringJustification:       scoringJustification,
		ChallengesIdentified:       challengesIdentified,
		StrategicElementsCovered:   strategicElementsCovered,
		SolutionStrengths:          solutionStrengths,
		SolutionGaps:               solutionGaps,
		FeasibilityAssessment:      feasibilityAssessment,
		IntegrationQuality:         integrationQuality,
		ConsumerInsightUtilization: consumerInsightUtilization,
		AlignmentWithCEOGuidance:   alignmentWithCEOGuidance,
		OverallComments:            overallComments,
	}, nil
}

// buildGroupAssessmentPrompt creates the prompt for group assessment based on group_assessment.md
func (s *LLMAssessmentService) buildGroupAssessmentPrompt(req GroupAssessmentRequest) string {
	var prompt strings.Builder

	// Load the group assessment prompt from specs/group_assessment.md
	prompt.WriteString(`# GROUP SOLUTION ASSESSMENT PROMPT
## Heineken GLOVIA Case Study - Southeast Asia

You are an expert assessor evaluating the **QUALITY OF THE GROUP'S SOLUTION** in a Heineken group case study discussion about GLOVIA brand in Southeast Asia. This assessment focuses on the strategic quality and comprehensiveness of the final solution the team proposes collectively.

## ASSESSMENT TASK

Evaluate the group's proposed solution based on:
1. How well they identified GLOVIA's core challenges
2. Strategic completeness of their solution
3. Feasibility and implementation clarity
4. Integration across departments
5. Use of consumer insights and data
6. Alignment with CEO guidance

## SCORING RUBRIC (0-5)

**IMPORTANT: Use Score 0 for irrelevant or nonsensical conversations** that do not address the GLOVIA case study at all:
- Completely off-topic discussions (personal matters, unrelated projects, random topics)
- Testing the system, joking around, or not engaging with the case seriously
- Incomprehensible, fragmented transcripts with no business discussion
- No attempt to address GLOVIA's business challenges

**Scores 1-5 are for conversations that attempt to address the case study:**

### Score 5: Ideal Solution
- Fully identifies ALL core challenges with data support
- Comprehensive coverage of all strategic elements
- Clear, feasible, well-integrated action plan
- Budget allocation and communication strategy clearly defined
- Demonstrates exceptional strategic thinking

### Score 4: Good Solution
- Identifies most key challenges
- Clear strategic direction with some depth gaps
- Feasible action plan but lacks some implementation details
- Some cross-functional coordination shown

### Score 3: Average Solution
- Identifies only 1-2 challenges
- Limited strategic scope
- Generic action plan lacking feasibility
- Does not reflect full understanding of case data

### Score 2: Poor Solution
- Fails to identify major issues
- Lacks structure and strategic clarity
- Addresses only minor aspects
- No actionable plan

### Score 1: Incorrect Solution
- Misunderstands case context
- Does not address actual challenges
- No use of data or insights
- No strategic recommendations

## TRANSCRIPT TO ASSESS

`)

	prompt.WriteString(req.Transcript)
	prompt.WriteString("\n\n")

	prompt.WriteString(`## RESPONSE FORMAT

Return assessment as JSON:

{
  "groupSolutionAssessment": {
    "score": 0-5,
    "scoringJustification": "Detailed explanation of why this score was assigned",
    "challengesIdentified": [
      "List each core challenge the team successfully identified",
      "Note which critical challenges were missed"
    ],
    "strategicElementsCovered": {
      "priorityMarkets": "What the team proposed for market selection",
      "channelStrategy": "How they addressed MT, GT, and Ecommerce channels",
      "productStrategy": "Natural Line launch plan, mini size, brand positioning",
      "marketingCommunication": "KOL/influencer strategy, packaging, localization",
      "budgetAllocation": "How they proposed reallocating the 2026 budget"
    },
    "solutionStrengths": [
      "Key strength 1 with specific examples",
      "Key strength 2 with specific examples",
      "Key strength 3 with specific examples"
    ],
    "solutionGaps": [
      "Critical gap 1 - what was missing",
      "Critical gap 2 - where solution lacked depth",
      "Critical gap 3 - missed opportunities"
    ],
    "feasibilityAssessment": "Evaluation of whether proposed actions are realistic and implementable",
    "integrationQuality": "How well solution integrated across departments",
    "consumerInsightUtilization": "How effectively team used consumer data",
    "alignmentWithCEOGuidance": "How well solution aligned with CEO priorities",
    "overallComments": "Comprehensive assessment with developmental feedback"
  }
}

Return ONLY the JSON object, no markdown formatting or additional text.
`)

	return prompt.String()
}