package assessment

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	assessmentService "newing.vn/competency/backend/internal/service/assessment"
)

// SonioxHandler handles Soniox speech-to-text integration
type SonioxHandler struct{
	llmService *assessmentService.LLMAssessmentService
	// In-memory store for latest assessment results
	assessmentResults sync.Map // key: sessionID_participantID, value: *AssessmentResponse
}

// NewSonioxHandler creates a new Soniox handler
func NewSonioxHandler() *SonioxHandler {
	return &SonioxHandler{
		llmService: assessmentService.NewLLMAssessmentService(),
	}
}

// getComprehensiveAssessmentCriteria returns the full assessment criteria with all details
func getComprehensiveAssessmentCriteria() []assessmentService.AssessmentCriteria {
	return []assessmentService.AssessmentCriteria{
		{
			ID:                "1",
			Name:              "Think Consumers First",
			Category:          "Shape (Judgement)",
			Description:       "Generates and implements ideas that improve services and experiences of consumers and customers",
			DetailedBehaviors: "Analyzes contradictory consumer insights, integrates multiple data sources to understand customer behavior, creates iterative approaches to consumer understanding",
			Weight:            0.20,
			LevelDescriptors: map[int]string{
				1: "Can gather data but cannot link consumer insights to business implications - only lists statistics without connecting them",
				2: "Collect & analyze customer data with basic understanding - identifies clear problems but limited synthesis",
				3: "Analyze customer & market trends data to improve business operations - explains contradictions and connects insights to strategy",
				4: "Analyze customer + competitor data to make strategic recommendations - integrates internal and competitive analysis",
				5: "Integrate all data and create an iterative approach to understanding changing consumer needs - proposes frameworks for continuous adaptation",
			},
			CaseSpecificExamples: map[int]string{
				1: "Only mentions \"68% prefer natural products\" without connecting to why GLOVIA natural line has low sales",
				2: "Recognizes that MT sales are declining and ecommerce growing, proposes basic solutions like increasing ecommerce investment",
				3: "Analyzes contradictions like consumers wanting natural products but prioritizing price, explains why this creates barriers",
				4: "Integrates GLOVIA data with competitor analysis, recognizes brand is \"caught between cheap and premium\" with unclear USP",
				5: "Proposes comprehensive framework combining consumer trends, competitive analysis, and continuous feedback loops for evolving strategy",
			},
			KeyObservables: []string{
				"Addresses contradictory consumer insights (68% prefer natural but sales low)",
				"Questions gaps between stated preferences and actual behavior",
				"Uses consumer data to challenge existing channel strategies",
				"Makes recommendations grounded in consumer understanding",
				"Connects consumer insights to business strategy",
			},
		},
		{
			ID:                "2",
			Name:              "Be CURIOUS - Judgement",
			Category:          "Shape (Judgement)",
			Description:       "Asks 'why' to uncover deeper insights and challenge assumptions. Applies data, balances short-term actions with long-term impact",
			DetailedBehaviors: "Synthesizes varying information into coherent perspective, asks probing questions, challenges assumptions, sets long-term strategies aligned with existing practices",
			Weight:            0.20,
			LevelDescriptors: map[int]string{
				1: "Cannot pull together varying information into a coherent perspective - proposes disconnected actions without logic",
				2: "Basic understanding of presented information, trends, and patterns - understands some issues but misses strategic priorities",
				3: "Formulates a strategy based on own analysis with clear reasoning for why actions are needed",
				4: "Communicates overall strategy and breaks it down into actionable parts with specific steps and budgets",
				5: "Sets long-term strategies by aligning existing practices with future market needs and macro trends",
			},
			CaseSpecificExamples: map[int]string{
				1: "Suggests \"increase promotions\" and \"advertise more\" without explaining connections or priorities",
				2: "Understands GLOVIA needs new growth strategy but proposes department-specific goals without integration",
				3: "Proposes clear strategy like focusing on Indonesia and ecommerce with specific reasoning about market size and growth",
				4: "Breaks strategy into specific actions: launch natural products Q2/2026, partner with Indonesian KOLs based on Shopee Live conversion rates",
				5: "Proposes strategy that anticipates future trends like sustainability, personalization, addresses macro changes in SEA market",
			},
			KeyObservables: []string{
				"Asks \"why\" questions about data contradictions and performance gaps",
				"Challenges budget allocation assumptions with ROI data",
				"Synthesizes insights from multiple channels and markets",
				"Questions existing strategies based on performance evidence",
				"Balances short-term tactics with long-term strategic vision",
			},
		},
		{
			ID:                "3",
			Name:              "Communicate with Clarity & Impact",
			Category:          "Connect",
			Description:       "Champion a culture of belonging through clear, impactful communication that influences decisions",
			DetailedBehaviors: "Structures ideas logically, adapts communication style to audience, uses data to support arguments, influences through compelling presentation",
			Weight:            0.15,
			LevelDescriptors: map[int]string{
				1: "Communication is unclear or disorganized - ideas lack structure, fails to convey main points effectively",
				2: "Messages are inconsistent/not convincing - attempts to present but arguments are interrupted or lack clear data support",
				3: "Ideas are structured and understandable - presents proposals with clear structure (problem → data → solution)",
				4: "Adapts communication style to context and audience effectively - adjusts approach for different stakeholders",
				5: "Communicates with precision and influence - drives team understanding and consensus, inspires action",
			},
			CaseSpecificExamples: map[int]string{
				1: "Rambling presentation about channel issues without clear points or recommendations",
				2: "Says \"need to invest in ecommerce\" but doesn't explain why or how with supporting data",
				3: "Structured presentation showing MT declining, ecommerce growing, therefore recommending budget reallocation with rationale",
				4: "Tailors message about financial benefits when speaking to CFO, brand vision when speaking to CEO",
				5: "Inspires team consensus on strategy, resolves disagreements, drives group to unified action plan",
			},
			KeyObservables: []string{
				"Presents arguments in logical, structured manner with clear flow",
				"Uses specific data points and evidence to support recommendations",
				"Influences group direction through compelling, persuasive presentation",
				"Adapts communication style for different stakeholders and contexts",
				"Uses both Vietnamese and English effectively during discussion",
			},
		},
		{
			ID:                "4",
			Name:              "Actively Seeks & Includes Perspectives",
			Category:          "Connect",
			Description:       "Actively seeks and includes perspectives from others to build collaborative solutions",
			DetailedBehaviors: "Engages teammates for input, integrates diverse viewpoints, facilitates inclusive discussion, resolves conflicts and builds consensus",
			Weight:            0.15,
			LevelDescriptors: map[int]string{
				1: "Ignores input from teammates - works in isolation, only focuses on own department/channel priorities",
				2: "Limited integration of different perspectives - listens occasionally but maintains personal assumptions",
				3: "Engages with teammates to gather input - actively asks for opinions and tries to connect different viewpoints",
				4: "Seeks diverse viewpoints, facilitates discussion - proactively encourages different opinions, helps resolve conflicts",
				5: "Demonstrates deep curiosity and openness - elevates group thinking by synthesizing multiple perspectives into unified strategy",
			},
			CaseSpecificExamples: map[int]string{
				1: "MT manager only focuses on MT issues, ignores ecommerce growth or Indonesia opportunities mentioned by teammates",
				2: "GT manager says \"if we ignore GT, we lose market share base\" but doesn't deeply integrate other channels into GT strategy",
				3: "Indonesia manager actively coordinates with channels, seeks feedback on how to launch natural products effectively",
				4: "Proactively mediates between MT budget concerns and ecommerce growth needs, finds optimal budget allocation",
				5: "Leads team beyond departmental barriers to create integrated strategy connecting MT restructuring, GT recognition, ecommerce digital campaigns, Indonesia expansion, and natural product launch into unified brand story",
			},
			KeyObservables: []string{
				"Actively listens to others and builds on their ideas",
				"Seeks input from different roles/channels before making decisions",
				"Facilitates inclusive discussions where all voices are heard",
				"Helps resolve conflicts between competing priorities",
				"Shows respect for different expertise areas and viewpoints",
			},
		},
		{
			ID:                "5",
			Name:              "Shows Logic and Emotion & Authenticity",
			Category:          "Connect",
			Description:       "Balances logical reasoning with emotional intelligence and authentic personal connection",
			DetailedBehaviors: "Uses both data-driven logic and emotional storytelling, builds genuine connections, demonstrates personal passion while maintaining professionalism",
			Weight:            0.10,
			LevelDescriptors: map[int]string{
				1: "Lacks emotional awareness or logical reasoning - focuses only on dry data or only emotions without evidence",
				2: "Shows either logic or emotion, but not both effectively - has genuine belief but lacks compelling data integration",
				3: "Builds connection with team and assessors - presents proposals with both passion and solid data foundation",
				4: "Emotional intelligence and structured thinking - strategically uses both logic and emotion to influence others",
				5: "Deep personal impact - seamlessly integrates logic, emotion and authenticity to inspire and create lasting influence",
			},
			CaseSpecificExamples: map[int]string{
				1: "Only presents ROI numbers without connecting to consumer aspirations, or only talks about brand emotions without data",
				2: "Shows belief in MT as \"brand trust channel\" or ecommerce potential but doesn't combine with strong data arguments",
				3: "Presents natural product potential with genuine passion plus supporting consumer trend data",
				4: "Tells brief story about young consumers seeking sustainable products (emotion) then presents ecommerce growth data (logic) to persuade team",
				5: "Becomes thought leader who paints comprehensive vision of GLOVIA's future with natural products, connecting business value and social impact, creating strong commitment from entire team",
			},
			KeyObservables: []string{
				"Balances data-driven arguments with emotional storytelling",
				"Shows genuine passion and authenticity in presentations",
				"Creates personal connections while maintaining professionalism",
				"Uses emotion strategically to enhance logical arguments",
				"Demonstrates authentic care for consumer and brand success",
			},
		},
		{
			ID:                "6",
			Name:              "Inspire Others Through Storytelling",
			Category:          "Connect",
			Description:       "Uses compelling narratives and strong storytelling to influence and inspire, using both Vietnamese and English effectively",
			DetailedBehaviors: "Creates engaging narratives, uses relevant examples and analogies, seamlessly switches between languages for maximum impact",
			Weight:            0.10,
			LevelDescriptors: map[int]string{
				1: "Poor storytelling, struggles with language - presents data points in disconnected way without narrative thread",
				2: "Basic storytelling with limited emotional or persuasive impact - attempts narrative but lacks compelling highlights",
				3: "Tells relevant and clear stories - creates structured narrative about GLOVIA challenges and opportunities",
				4: "Storytelling is engaging and influential - uses compelling examples, smooth language switching for enhanced impact",
				5: "Masterful storytelling that inspires and persuades - creates unforgettable narrative integrating all elements into powerful message",
			},
			CaseSpecificExamples: map[int]string{
				1: "Lists data points about declining MT sales without creating coherent story or message",
				2: "Tells basic sequence of events but misses emotional highlights or strong message about solutions",
				3: "Creates clear story about consumer journey seeking natural products and how GLOVIA will meet this need",
				4: "Uses specific consumer examples or competitor success stories to illustrate points, skillful Vietnamese/English use",
				5: "Master storyteller who creates comprehensive, memorable narrative about GLOVIA's future, integrating data, trends, competition, and vision into inspiring message",
			},
			KeyObservables: []string{
				"Creates compelling narratives rather than just listing facts",
				"Uses relevant examples, analogies, or case studies effectively",
				"Seamlessly uses both Vietnamese and English for maximum impact",
				"Tells stories that connect emotionally with audience",
				"Creates memorable narratives that inspire action",
			},
		},
		{
			ID:                "7",
			Name:              "Play to Win - Courage & Ambition",
			Category:          "Deliver",
			Description:       "Focuses on critical objectives, solves challenges, demonstrates courage to stretch in new ways for team success",
			DetailedBehaviors: "Shows strategic thinking, takes calculated risks, demonstrates ambition for growth, proposes innovative solutions",
			Weight:            0.10,
			LevelDescriptors: map[int]string{
				1: "Lacks focus or strategic thinking, vague or impractical suggestions - doesn't identify core problems or proposes generic solutions",
				2: "Misses critical priorities - recognizes some issues but overlooks key strategic directions from leadership",
				3: "Stays focused and proposes relevant solutions - identifies main challenges and suggests practical, feasible solutions",
				4: "Demonstrates strategic thinking and solutions are actionable - makes clear priority decisions with specific, implementable plans",
				5: "Proposes innovative, realistic solutions - breakthrough ideas that reflect deep industry understanding and proactive mindset",
			},
			CaseSpecificExamples: map[int]string{
				1: "Doesn't identify GLOVIA core issues like \"weak brand recognition\" or \"unclear USP\", suggests vague \"need to do better\"",
				2: "Recognizes some problems like packaging but misses strategic priorities like CEO's focus on \"investment efficiency\" and \"1-2 priority markets\"",
				3: "Identifies core challenges like \"MT sales declining, ecommerce growing\" and \"natural product trend\", proposes feasible solutions",
				4: "Makes clear priority choices (Indonesia and ecommerce per CEO guidance), proposes specific actionable plans with budgets and timelines",
				5: "Proposes breakthrough innovations like \"smart packaging with QR codes\", \"GLOVIA Natural Zones\" in key supermarkets, anticipates industry future",
			},
			KeyObservables: []string{
				"Identifies and focuses on most critical business challenges",
				"Shows courage to challenge existing approaches with better alternatives",
				"Demonstrates strategic ambition for market growth and expansion",
				"Proposes bold but realistic solutions that stretch current capabilities",
				"Takes calculated risks to drive breakthrough results",
			},
		},
	}
}

// getGroupAssessmentCriteria returns the group assessment criteria
func getGroupAssessmentCriteria() []assessmentService.AssessmentCriteria {
	return []assessmentService.AssessmentCriteria{
		{
			ID:                "group_1",
			Name:              "Collective Consumer-Centric Thinking",
			Category:          "Group Dynamics",
			Description:       "How well the group collectively analyzes contradictory consumer insights and integrates multiple data sources to create consumer-first strategies",
			DetailedBehaviors: "Group collectively addresses contradictory consumer insights, questions gaps between preferences and behavior, builds on each other's insights",
			Weight:            0.25,
			LevelDescriptors: map[int]string{
				1: "Group cannot connect consumer insights to business implications - discussions remain surface-level with disconnected data points",
				2: "Group collects and discusses consumer data with basic understanding but limited synthesis across members",
				3: "Group analyzes contradictions collectively and connects insights to strategy through collaborative discussion",
				4: "Group integrates consumer + competitor data through cross-functional dialogue to make strategic recommendations",
				5: "Group creates an iterative, comprehensive framework demonstrating sophisticated collective understanding of evolving consumer needs",
			},
			KeyObservables: []string{
				"Does the group collectively address contradictory consumer insights",
				"How does the team question gaps between stated preferences and actual behavior together",
				"Do members build on each other's consumer insights to create richer understanding",
				"Are consumer insights used to challenge and improve channel strategies collectively",
				"Does the final recommendation reflect deep, integrated consumer understanding",
			},
		},
		{
			ID:                "group_2",
			Name:              "Collaborative Analytical Thinking & Strategic Synthesis",
			Category:          "Group Dynamics",
			Description:       "How effectively the group synthesizes varying information, asks probing questions collectively, and develops coherent long-term strategies",
			DetailedBehaviors: "Group synthesizes information, asks why questions collectively, challenges assumptions together, balances short and long-term thinking",
			Weight:            0.25,
			LevelDescriptors: map[int]string{
				1: "Group cannot synthesize information into coherent perspective - proposals are disconnected without unified logic",
				2: "Group shows basic understanding of issues but misses strategic priorities in collective discussion",
				3: "Group formulates strategy through collaborative analysis with clear collective reasoning",
				4: "Group communicates unified strategy and breaks it down into actionable parts with cross-functional alignment",
				5: "Group sets visionary long-term strategies by collectively aligning current practices with future market needs",
			},
			KeyObservables: []string{
				"Does the group ask why questions about data contradictions collaboratively",
				"How does the team challenge budget allocation assumptions together using ROI data",
				"Is there effective synthesis of insights from multiple channels and markets",
				"Does the group balance short-term tactics with long-term strategic vision",
				"Are strategic priorities debated and aligned effectively",
			},
		},
		{
			ID:                "group_3",
			Name:              "Communication Effectiveness & Group Dynamics",
			Category:          "Group Dynamics",
			Description:       "Quality of group dialogue, turn-taking, building on ideas, and overall communication flow during discussion",
			DetailedBehaviors: "Members listen actively, take turns effectively, build on each other's points, maintain structured dialogue with clear flow",
			Weight:            0.20,
			LevelDescriptors: map[int]string{
				1: "Poor communication flow - members talk over each other, ideas are fragmented, no clear dialogue structure",
				2: "Basic communication with interruptions - some attempts to build on ideas but inconsistent engagement",
				3: "Structured group dialogue - members take turns effectively, build on each other's points with clear flow",
				4: "Adaptive communication - group adjusts discussion style based on topic complexity, effective facilitation emerges",
				5: "Exceptional group communication - seamless dialogue with natural leadership rotation, powerful collective influence",
			},
			KeyObservables: []string{
				"Do members listen actively and build on each other's contributions",
				"Is there balanced participation or does one person dominate",
				"How effectively does the group use both Vietnamese and English",
				"Does the group maintain focus and structured dialogue",
				"Are ideas integrated or presented in isolation",
			},
		},
		{
			ID:                "group_4",
			Name:              "Collaborative Problem-Solving & Conflict Resolution",
			Category:          "Group Dynamics",
			Description:       "How the group navigates role conflicts, integrates diverse viewpoints, and reaches consensus on competing priorities",
			DetailedBehaviors: "Group navigates role conflicts, discusses trade-offs, seeks win-win solutions, facilitates productive debate, builds consensus",
			Weight:            0.15,
			LevelDescriptors: map[int]string{
				1: "Group avoids conflicts or members work in silos defending only their own interests",
				2: "Limited conflict resolution - acknowledges tensions but doesn't effectively resolve competing priorities",
				3: "Engages with conflicts constructively - discusses trade-offs and seeks win-win solutions",
				4: "Effectively resolves conflicts - facilitates productive debate leading to consensus on resource allocation",
				5: "Transforms conflicts into opportunities - uses tension between roles to generate innovative integrated solutions",
			},
			KeyObservables: []string{
				"How does the group handle MT vs Ecommerce budget allocation conflict",
				"Are role conflicts acknowledged and addressed productively",
				"Does the group find creative solutions that satisfy multiple stakeholders",
				"Is there evidence of compromise and consensus-building",
				"Do members help each other resolve disagreements",
			},
		},
		{
			ID:                "group_5",
			Name:              "Team Energy, Authenticity & Collective Passion",
			Category:          "Group Dynamics",
			Description:       "The group's overall energy level, genuine engagement, and collective passion for solving the case",
			DetailedBehaviors: "Group shows genuine excitement, positive emotional energy, authentic care, creates inspiring atmosphere, demonstrates collective investment",
			Weight:            0.10,
			LevelDescriptors: map[int]string{
				1: "Low energy, mechanical discussion - members seem disengaged or going through motions",
				2: "Inconsistent energy - some moments of engagement but overall flat affect",
				3: "Good team energy - members are engaged, authentic, and show genuine interest in the challenge",
				4: "High energy with emotional connection - group demonstrates collective passion balanced with professionalism",
				5: "Exceptional collective passion - team is deeply invested, creates inspiring atmosphere with authentic connections",
			},
			KeyObservables: []string{
				"Does the group show genuine excitement about solving challenges",
				"Is there positive emotional energy in the room",
				"Do members demonstrate authentic care for the brand and consumers",
				"Is the discussion engaging and dynamic or flat and routine",
				"Does the team create an inspiring collaborative atmosphere",
			},
		},
		{
			ID:                "group_6",
			Name:              "Decision-Making Quality & Strategic Courage",
			Category:          "Group Dynamics",
			Description:       "The group's ability to make clear priority decisions, demonstrate strategic ambition, and show courage in recommendations",
			DetailedBehaviors: "Group makes clear priority decisions, shows strategic courage, proposes bold but realistic recommendations with clear rationale",
			Weight:            0.05,
			LevelDescriptors: map[int]string{
				1: "Group avoids making clear decisions - recommendations are vague or try to do everything",
				2: "Makes some decisions but misses critical strategic priorities",
				3: "Makes clear, practical decisions aligned with strategic direction",
				4: "Demonstrates strategic courage - makes bold but realistic priority choices with clear rationale",
				5: "Proposes breakthrough innovations showing deep industry understanding and collective ambition",
			},
			KeyObservables: []string{
				"Does the group make clear priority choices",
				"Are decisions aligned with strategic guidance on investment efficiency",
				"Does the group show courage to challenge status quo with better alternatives",
				"Are recommendations ambitious yet implementable",
				"Does the final strategy reflect calculated risks for breakthrough results",
			},
		},
	}
}

// SonioxTempKeyRequest represents the request to create a temporary API key
type SonioxTempKeyRequest struct {
	UsageLimitSeconds int `json:"usage_limit_seconds"`
}

// SonioxTempKeyResponse represents the response from Soniox temporary key creation
type SonioxTempKeyResponse struct {
	APIKey string `json:"api_key"`
	ExpiresAt string `json:"expires_at"`
}

// GetTemporaryKey creates a temporary Soniox API key for the session
func (h *SonioxHandler) GetTemporaryKey(c *gin.Context) {
	// Check if this is a candidate request (has X-Candidate-Token header)
	candidateToken := c.GetHeader("X-Candidate-Token")
	if candidateToken != "" {
		// TODO: Validate candidate token here
		// For now, just allow if token exists
		log.Printf("Soniox key request from candidate with token")
	} else {
		// Otherwise, auth middleware should have validated JWT
		// Check if user exists in context (set by auth middleware)
		if _, exists := c.Get("user"); !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			return
		}
	}

	// Get session ID from URL params (route uses :id)
	sessionID := c.Param("id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id is required"})
		return
	}

	// Validate session ID is a valid UUID (allow "test" for demo)
	if sessionID != "test" {
		if _, err := uuid.Parse(sessionID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session_id format"})
			return
		}
	}

	// Get Soniox API key from environment
	sonioxAPIKey := os.Getenv("SONIOX_API_KEY")
	if sonioxAPIKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Soniox API key not configured"})
		return
	}

	// Create temporary key request (valid for 2 hours = 7200 seconds)
	tempKeyReq := SonioxTempKeyRequest{
		UsageLimitSeconds: 7200,
	}

	reqBody, err := json.Marshal(tempKeyReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal request"})
		return
	}

	// Create proper request body for Soniox API
	reqBodyMap := map[string]interface{}{
		"usage_type":         "transcribe_websocket",
		"expires_in_seconds": 3600, // 1 hour
	}

	reqBody, err = json.Marshal(reqBodyMap)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal request"})
		return
	}

	// Make request to Soniox API
	req, err := http.NewRequest("POST", "https://api.soniox.com/v1/auth/temporary-api-key", bytes.NewBuffer(reqBody))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+sonioxAPIKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to call Soniox API"})
		return
	}
	defer resp.Body.Close()

	// Check for success status codes (200 OK or 201 Created)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		// Read error response for debugging
		var errorBody map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errorBody)
		fmt.Printf("Soniox API error - Status: %d, Body: %+v\n", resp.StatusCode, errorBody)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Soniox API returned error: %d", resp.StatusCode),
			"details": errorBody,
		})
		return
	}

	var sonioxResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&sonioxResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode Soniox response"})
		return
	}

	// Extract api_key from response
	apiKey, ok := sonioxResp["api_key"].(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid response format from Soniox"})
		return
	}

	// Return the temporary key
	c.JSON(http.StatusOK, gin.H{
		"apiKey":     apiKey,
		"sessionId":  sessionID,
	})
}

// TranscriptSyncRequest represents a transcript sync request
type TranscriptSyncRequest struct {
	ParticipantID string `json:"participant_id" binding:"required"`
	Transcript    string `json:"transcript" binding:"required"`
	SessionID     string `json:"session_id" binding:"required"`
	Timestamp     int64  `json:"timestamp"`
}

// ConsolidatedTranscriptParticipant represents a participant in the consolidated transcript
type ConsolidatedTranscriptParticipant struct {
	ParticipantID   string `json:"participant_id"`
	ParticipantName string `json:"participant_name"`
	Role            string `json:"role"`
	Transcript      string `json:"transcript"`
}

// ParticipantMapping represents the mapping between participant IDs and their info
type ParticipantMapping struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Role       string `json:"role"`
	Department string `json:"department"`
}

// ConsolidatedTranscriptSyncRequest represents a consolidated transcript sync request
type ConsolidatedTranscriptSyncRequest struct {
	SessionID           string                              `json:"session_id" binding:"required"`
	Conversation        []ConsolidatedTranscriptParticipant `json:"conversation" binding:"required"`
	ParticipantMapping  []ParticipantMapping               `json:"participant_mapping"`
	Timestamp           int64                               `json:"timestamp"`
}

// SyncTranscript receives and processes transcript data from frontend
func (h *SonioxHandler) SyncTranscript(c *gin.Context) {
	var req TranscriptSyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate session ID (allow "test" for demo)
	if req.SessionID != "test" {
		if _, err := uuid.Parse(req.SessionID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session_id format"})
			return
		}
	}

	// For demo, allow numeric participant IDs
	// In production, this should be UUID

	// TODO: Store transcript in database
	// For demo purposes, we'll just log it and return success
	fmt.Printf("Received transcript for session %s, participant %s: %s\n", 
		req.SessionID, req.ParticipantID, req.Transcript)

	// Trigger background assessment processing
	go h.processAssessmentInBackground(req.SessionID, req.ParticipantID, req.Transcript)

	// Return success
	c.JSON(http.StatusOK, gin.H{
		"status": "received",
		"message": "Transcript received and assessment processing started",
	})
}

// ProcessAssessmentRequest represents a request to process assessment
type ProcessAssessmentRequest struct {
	ParticipantID string `json:"participant_id" binding:"required"`
	SessionID     string `json:"session_id" binding:"required"`
	Transcript    string `json:"transcript" binding:"required"`
	Language      string `json:"language"`
}

// ProcessAssessment processes a transcript using LLM and returns assessment results
func (h *SonioxHandler) ProcessAssessment(c *gin.Context) {
	var req ProcessAssessmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate session ID (allow "test" for demo)
	if req.SessionID != "test" {
		if _, err := uuid.Parse(req.SessionID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session_id format"})
			return
		}
	}

	// For demo, allow numeric participant IDs
	// In production, this should be UUID
	if req.SessionID != "test" {
		if _, err := uuid.Parse(req.ParticipantID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid participant_id format"})
			return
		}
	}

	// Default language
	if req.Language == "" {
		req.Language = "vietnamese"
	}

	// Use comprehensive assessment criteria
	criteria := getComprehensiveAssessmentCriteria()

	// Create assessment request
	assessmentReq := assessmentService.AssessmentRequest{
		ParticipantID: req.ParticipantID,
		SessionID:     req.SessionID,
		Transcript:    req.Transcript,
		Criteria:      criteria,
		Language:      req.Language,
	}

	// Process assessment using LLM service
	result, err := h.llmService.ProcessAssessment(c.Request.Context(), assessmentReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to process assessment",
			"details": err.Error(),
		})
		return
	}

	// Return the assessment results
	c.JSON(http.StatusOK, result)
}

// processAssessmentInBackground processes assessment in background and stores result
func (h *SonioxHandler) processAssessmentInBackground(sessionID, participantID, transcript string) {
	fmt.Printf("Starting background assessment processing for session %s, participant %s\n", sessionID, participantID)
	
	// Use comprehensive assessment criteria
	criteria := getComprehensiveAssessmentCriteria()

	// Create assessment request
	assessmentReq := assessmentService.AssessmentRequest{
		ParticipantID: participantID,
		SessionID:     sessionID,
		Transcript:    transcript,
		Criteria:      criteria,
		Language:      "vietnamese",
	}

	// Process assessment using LLM service
	result, err := h.llmService.ProcessAssessment(context.Background(), assessmentReq)
	if err != nil {
		fmt.Printf("Error processing assessment in background: %v\n", err)
		return
	}

	// Store result in memory
	key := fmt.Sprintf("%s_%s", sessionID, participantID)
	h.assessmentResults.Store(key, result)
	
	fmt.Printf("Assessment processing completed and stored for session %s, participant %s\n", sessionID, participantID)
}

// GetAssessmentResults retrieves the latest assessment results for polling
func (h *SonioxHandler) GetAssessmentResults(c *gin.Context) {
	sessionID := c.Param("id")
	participantID := c.Param("participantId")
	
	if sessionID == "" || participantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id and participant_id are required"})
		return
	}

	// Validate session ID (allow "test" for demo)
	if sessionID != "test" {
		if _, err := uuid.Parse(sessionID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session_id format"})
			return
		}
	}

	key := fmt.Sprintf("%s_%s", sessionID, participantID)
	if result, ok := h.assessmentResults.Load(key); ok {
		if assessmentResult, ok := result.(*assessmentService.AssessmentResponse); ok {
			c.JSON(http.StatusOK, assessmentResult)
			return
		}
	}

	// No results found yet
	c.JSON(http.StatusNotFound, gin.H{
		"error": "Assessment results not ready yet",
		"status": "processing",
	})
}

// IdentifySpeakerRequest represents the request for speaker identification
type IdentifySpeakerRequest struct {
	Transcript string `json:"transcript" binding:"required"`
	SpeakerID  int    `json:"speaker_id" binding:"required"`
}

// IdentifySpeaker uses LLM to identify speaker name from transcript
func (h *SonioxHandler) IdentifySpeaker(c *gin.Context) {
	var req IdentifySpeakerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	// Call LLM service to identify speaker
	identificationReq := assessmentService.SpeakerIdentificationRequest{
		Transcript: req.Transcript,
		SpeakerID:  req.SpeakerID,
	}

	response, err := h.llmService.IdentifySpeaker(ctx, identificationReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to identify speaker: %v", err),
		})
		return
	}

	// Return the identification result
	c.JSON(http.StatusOK, gin.H{
		"speaker_id":  response.SpeakerID,
		"name":        response.Name,
		"confidence":  response.Confidence,
		"evidence":    response.Evidence,
	})
}

// SyncConsolidatedTranscript receives and processes consolidated transcript data from frontend
func (h *SonioxHandler) SyncConsolidatedTranscript(c *gin.Context) {
	var req ConsolidatedTranscriptSyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate session ID (allow "test" for demo)
	if req.SessionID != "test" {
		if _, err := uuid.Parse(req.SessionID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session_id format"})
			return
		}
	}

	// Log received transcript
	fmt.Printf("Received consolidated transcript for session %s with %d participants\n", 
		req.SessionID, len(req.Conversation))

	// Process assessment for each participant in background
	go h.processConsolidatedAssessmentInBackground(req.SessionID, req.Conversation, req.ParticipantMapping)

	// Return success
	c.JSON(http.StatusOK, gin.H{
		"status": "received",
		"message": "Consolidated transcript received and assessment processing started",
		"participants": len(req.Conversation),
	})
}

// processConsolidatedAssessmentInBackground processes assessment for all participants
func (h *SonioxHandler) processConsolidatedAssessmentInBackground(sessionID string, conversation []ConsolidatedTranscriptParticipant, participantMapping []ParticipantMapping) {
	fmt.Printf("\n=== CONSOLIDATED ASSESSMENT PROCESSING ===\n")
	fmt.Printf("Session ID: %s\n", sessionID)
	fmt.Printf("Number of participants: %d\n", len(conversation))
	
	// Log each participant's data
	for i, participant := range conversation {
		fmt.Printf("\nParticipant %d:\n", i+1)
		fmt.Printf("  ID: %s\n", participant.ParticipantID)
		fmt.Printf("  Name: %s\n", participant.ParticipantName)
		fmt.Printf("  Role: %s\n", participant.Role)
		fmt.Printf("  Transcript length: %d chars\n", len(participant.Transcript))
		if len(participant.Transcript) > 0 {
			preview := participant.Transcript
			if len(preview) > 200 {
				preview = preview[:200] + "..."
			}
			fmt.Printf("  Transcript preview: %s\n", preview)
		}
	}
	
	// Use comprehensive assessment criteria
	criteria := getComprehensiveAssessmentCriteria()

	// Build full conversation context
	var fullConversation string
	for _, participant := range conversation {
		fullConversation += fmt.Sprintf("\n[%s - %s]:\n%s\n", participant.ParticipantName, participant.Role, participant.Transcript)
	}
	
	fmt.Printf("\nFull conversation context length: %d chars\n", len(fullConversation))

	// Process assessment for each participant
	results := make([]map[string]interface{}, 0)
	
	// Special handling for unified transcript
	if len(conversation) == 1 && conversation[0].ParticipantID == "unified" {
		fmt.Printf("Processing unified transcript with all speakers\n")
		
		// Process the unified transcript once
		assessmentReq := assessmentService.AssessmentRequest{
			ParticipantID: "unified",
			SessionID:     sessionID,
			Transcript:    conversation[0].Transcript,
			Criteria:      criteria,
			Language:      "vietnamese",
			Context:       "", // No separate context needed for unified
		}

		// Process assessment using LLM service - this will return assessments for all speakers
		result, err := h.llmService.ProcessAssessment(context.Background(), assessmentReq)
		if err != nil {
			fmt.Printf("Error processing unified assessment: %v\n", err)
			return
		}

		// Check if this is a unified assessment with multiple participants
		if result.ParticipantID == "unified_multiple" {
			// Get all the individual participant assessments
			allAssessments := h.llmService.GetLastUnifiedAssessments()

			fmt.Printf("Got %d participant assessments from unified transcript\n", len(allAssessments))

			// Store each participant's assessment individually
			for _, participantAssessment := range allAssessments {
				// Store with participant-specific key
				key := fmt.Sprintf("%s_%s", sessionID, participantAssessment.ParticipantID)
				h.assessmentResults.Store(key, participantAssessment)

				// Add to results
				results = append(results, map[string]interface{}{
					"participant_id": participantAssessment.ParticipantID,
					"participant_name": participantAssessment.ParticipantID, // Name should be extracted from the assessment
					"results": participantAssessment.Results,
				})

				fmt.Printf("Stored assessment for participant: %s\n", participantAssessment.ParticipantID)
			}
		} else {
			// Fallback to single result (shouldn't happen with unified transcript)
			key := fmt.Sprintf("%s_unified", sessionID)
			h.assessmentResults.Store(key, result)

			results = append(results, map[string]interface{}{
				"participant_id": "unified",
				"participant_name": "All Speakers",
				"results": result.Results,
			})
		}
		
		fmt.Printf("Unified assessment completed for session %s\n", sessionID)
	} else {
		// Process individual participants
		for _, participant := range conversation {
			// Create assessment request with full context
			assessmentReq := assessmentService.AssessmentRequest{
				ParticipantID: participant.ParticipantID,
				SessionID:     sessionID,
				Transcript:    participant.Transcript,
				Criteria:      criteria,
				Language:      "vietnamese",
				Context:       fullConversation, // Add full conversation as context
			}

			// Process assessment using LLM service
			result, err := h.llmService.ProcessAssessment(context.Background(), assessmentReq)
			if err != nil {
				fmt.Printf("Error processing assessment for participant %s: %v\n", participant.ParticipantID, err)
				continue
			}

			// Store individual result
			key := fmt.Sprintf("%s_%s", sessionID, participant.ParticipantID)
			h.assessmentResults.Store(key, result)
			
			// Add to consolidated results
			results = append(results, map[string]interface{}{
				"participant_id": participant.ParticipantID,
				"participant_name": participant.ParticipantName,
				"results": result.Results,
			})
			
			fmt.Printf("Assessment completed for participant %s\n", participant.ParticipantName)
		}
	}

	// Process group assessment using the full conversation transcript
	fmt.Printf("Processing group assessment for session %s\n", sessionID)
	groupCriteria := getGroupAssessmentCriteria()
	groupAssessmentReq := assessmentService.GroupAssessmentRequest{
		SessionID:  sessionID,
		Transcript: fullConversation,
		Criteria:   groupCriteria,
		Language:   "vietnamese",
	}

	groupResult, err := h.llmService.ProcessGroupAssessment(context.Background(), groupAssessmentReq)
	if err != nil {
		fmt.Printf("Error processing group assessment: %v\n", err)
		groupResult = nil // Continue without group assessment if it fails
	} else {
		fmt.Printf("Group assessment completed for session %s\n", sessionID)
		// Store group assessment
		groupKey := fmt.Sprintf("%s_group", sessionID)
		h.assessmentResults.Store(groupKey, groupResult)
	}

	// Store consolidated results
	consolidatedKey := fmt.Sprintf("%s_consolidated", sessionID)

	// If we have unified assessments, mark them properly
	consolidatedData := map[string]interface{}{
		"session_id": sessionID,
		"assessments": results,
		"group_assessment": groupResult,
		"timestamp": time.Now().Unix(),
	}

	// Mark if this is from a unified transcript with individual participants
	if len(results) > 0 {
		// results is already []map[string]interface{}, no need to cast
		firstResult := results[0]
		if pid, ok := firstResult["participant_id"].(string); ok && pid != "unified" {
			consolidatedData["type"] = "unified_individual"
		}
	}

	h.assessmentResults.Store(consolidatedKey, consolidatedData)
	
	fmt.Printf("Consolidated assessment processing completed for session %s\n", sessionID)
}

// GetConsolidatedAssessmentResults retrieves consolidated assessment results for all participants
func (h *SonioxHandler) GetConsolidatedAssessmentResults(c *gin.Context) {
	sessionID := c.Param("id")
	
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id is required"})
		return
	}

	// Validate session ID (allow "test" for demo)
	if sessionID != "test" {
		if _, err := uuid.Parse(sessionID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session_id format"})
			return
		}
	}

	// Try to get consolidated results first
	consolidatedKey := fmt.Sprintf("%s_consolidated", sessionID)
	if result, ok := h.assessmentResults.Load(consolidatedKey); ok {
		c.JSON(http.StatusOK, result)
		return
	}

	// If no consolidated results, try to build from individual results
	results := make([]map[string]interface{}, 0)
	foundAny := false
	
	// Iterate through stored results to find matching session
	h.assessmentResults.Range(func(key, value interface{}) bool {
		keyStr := key.(string)
		if len(keyStr) > len(sessionID) && keyStr[:len(sessionID)] == sessionID && keyStr != consolidatedKey {
			if assessmentResult, ok := value.(*assessmentService.AssessmentResponse); ok {
				results = append(results, map[string]interface{}{
					"participant_id": assessmentResult.ParticipantID,
					"results": assessmentResult.Results,
				})
				foundAny = true
			}
		}
		return true
	})

	if foundAny {
		c.JSON(http.StatusOK, gin.H{
			"session_id": sessionID,
			"assessments": results,
		})
		return
	}

	// No results found yet
	c.JSON(http.StatusNotFound, gin.H{
		"error": "Assessment results not ready yet",
		"status": "processing",
	})
}

// SubmitAsyncTranscriptionRequest represents a request to start async transcription
type SubmitAsyncTranscriptionRequest struct {
	SessionID         string         `json:"session_id" binding:"required"`
	SpeakerMapping    map[int]string `json:"speaker_mapping"`    // Manual speaker corrections
	ManualCorrections map[int]string `json:"manual_corrections"` // Track which speakers were manually corrected
}

// SubmitAsyncTranscription submits audio file for async transcription with Soniox
func (h *SonioxHandler) SubmitAsyncTranscription(c *gin.Context) {
	sessionID := c.PostForm("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id is required"})
		return
	}

	// Get audio file from multipart form
	file, err := c.FormFile("audio")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "audio file is required"})
		return
	}

	// Parse speaker mapping JSON if provided
	speakerMappingJSON := c.PostForm("speaker_mapping")
	speakerMapping := make(map[int]string)
	if speakerMappingJSON != "" {
		// JSON keys are always strings, so unmarshal to map[string]string first
		var tempMapping map[string]string
		if err := json.Unmarshal([]byte(speakerMappingJSON), &tempMapping); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid speaker_mapping format"})
			return
		}
		// Convert string keys to int keys
		for key, value := range tempMapping {
			var speakerID int
			if _, err := fmt.Sscanf(key, "%d", &speakerID); err == nil {
				speakerMapping[speakerID] = value
			}
		}
	}

	// Parse manual corrections JSON if provided
	manualCorrectionsJSON := c.PostForm("manual_corrections")
	manualCorrections := make(map[int]string)
	if manualCorrectionsJSON != "" {
		// JSON keys are always strings, so unmarshal to map[string]string first
		var tempCorrections map[string]string
		if err := json.Unmarshal([]byte(manualCorrectionsJSON), &tempCorrections); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid manual_corrections format"})
			return
		}
		// Convert string keys to int keys
		for key, value := range tempCorrections {
			var speakerID int
			if _, err := fmt.Sscanf(key, "%d", &speakerID); err == nil {
				manualCorrections[speakerID] = value
			}
		}
	}

	// Open the uploaded file
	audioFile, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open audio file"})
		return
	}
	defer audioFile.Close()

	// Read file contents
	audioData, err := io.ReadAll(audioFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read audio file"})
		return
	}

	// Submit to Soniox async API
	sonioxAPIKey := os.Getenv("SONIOX_API_KEY")
	if sonioxAPIKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Soniox API key not configured"})
		return
	}

	// Step 1: Upload audio file to Soniox
	log.Printf("Step 1: Uploading audio file to Soniox: size=%d bytes", len(audioData))
	var fileUploadBody bytes.Buffer
	fileWriter := multipart.NewWriter(&fileUploadBody)

	filePart, err := fileWriter.CreateFormFile("file", file.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create file upload form"})
		return
	}
	filePart.Write(audioData)
	fileWriter.Close()

	uploadReq, err := http.NewRequest("POST", "https://api.soniox.com/v1/files", &fileUploadBody)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create upload request"})
		return
	}
	uploadReq.Header.Set("Content-Type", fileWriter.FormDataContentType())
	uploadReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", sonioxAPIKey))

	client := &http.Client{Timeout: 60 * time.Second}
	uploadResp, err := client.Do(uploadReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("file upload error: %v", err)})
		return
	}
	defer uploadResp.Body.Close()

	uploadRespBody, err := io.ReadAll(uploadResp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read upload response"})
		return
	}

	if uploadResp.StatusCode != http.StatusOK && uploadResp.StatusCode != http.StatusCreated {
		log.Printf("Soniox file upload error: Status %d, Body: %s", uploadResp.StatusCode, string(uploadRespBody))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Soniox file upload error",
			"status":  uploadResp.StatusCode,
			"details": string(uploadRespBody),
		})
		return
	}

	var uploadResult struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(uploadRespBody, &uploadResult); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse upload response"})
		return
	}

	log.Printf("File uploaded successfully: file_id=%s", uploadResult.ID)

	// Step 2: Create transcription with uploaded file
	log.Printf("Step 2: Creating transcription with file_id=%s", uploadResult.ID)
	transcriptionReq := map[string]interface{}{
		"model":                      "stt-async-preview-v1",
		"file_id":                    uploadResult.ID,
		"enable_speaker_diarization": true,
		"language_hints":             []string{"en", "vi"},
		"context":                    "GLOVIA, Heineken, MT, GT, ecommerce, assessment center",
	}

	transcriptionJSON, err := json.Marshal(transcriptionReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create transcription request"})
		return
	}

	createReq, err := http.NewRequest("POST", "https://api.soniox.com/v1/transcriptions", bytes.NewBuffer(transcriptionJSON))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create transcription request"})
		return
	}
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", sonioxAPIKey))

	createResp, err := client.Do(createReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("transcription creation error: %v", err)})
		return
	}
	defer createResp.Body.Close()

	createRespBody, err := io.ReadAll(createResp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read transcription response"})
		return
	}

	if createResp.StatusCode != http.StatusOK && createResp.StatusCode != http.StatusCreated {
		log.Printf("Soniox transcription creation error: Status %d, Body: %s", createResp.StatusCode, string(createRespBody))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Soniox transcription creation error",
			"status":  createResp.StatusCode,
			"details": string(createRespBody),
		})
		return
	}

	// Parse response to get transcription ID
	var sonioxResp struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(createRespBody, &sonioxResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse transcription response"})
		return
	}

	// Store transcription ID and speaker mapping for later retrieval
	h.assessmentResults.Store(fmt.Sprintf("%s_async_id", sessionID), sonioxResp.ID)
	h.assessmentResults.Store(fmt.Sprintf("%s_file_id", sessionID), uploadResult.ID)
	if len(speakerMapping) > 0 {
		h.assessmentResults.Store(fmt.Sprintf("%s_speaker_mapping", sessionID), speakerMapping)
	}
	if len(manualCorrections) > 0 {
		h.assessmentResults.Store(fmt.Sprintf("%s_manual_corrections", sessionID), manualCorrections)
	}

	log.Printf("Async transcription submitted for session %s, transcription_id: %s, file_id: %s", sessionID, sonioxResp.ID, uploadResult.ID)

	c.JSON(http.StatusOK, gin.H{
		"transcription_id": sonioxResp.ID,
		"file_id":          uploadResult.ID,
		"status":           "processing",
	})
}

// GetAsyncTranscriptionStatus polls Soniox for async transcription results
func (h *SonioxHandler) GetAsyncTranscriptionStatus(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id is required"})
		return
	}

	// Get transcription ID
	transcriptionIDKey := fmt.Sprintf("%s_async_id", sessionID)
	value, ok := h.assessmentResults.Load(transcriptionIDKey)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "no async transcription found for this session"})
		return
	}

	transcriptionID := value.(string)

	// Poll Soniox for results
	sonioxAPIKey := os.Getenv("SONIOX_API_KEY")
	if sonioxAPIKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Soniox API key not configured"})
		return
	}

	// Check transcription status
	statusReq, err := http.NewRequest("GET", fmt.Sprintf("https://api.soniox.com/v1/transcriptions/%s", transcriptionID), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create request"})
		return
	}
	statusReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", sonioxAPIKey))

	client := &http.Client{Timeout: 10 * time.Second}
	statusResp, err := client.Do(statusReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Soniox API error: %v", err)})
		return
	}
	defer statusResp.Body.Close()

	statusBody, err := io.ReadAll(statusResp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read status response"})
		return
	}

	var statusResult struct {
		Status       string `json:"status"`
		ErrorMessage string `json:"error_message,omitempty"`
	}
	if err := json.Unmarshal(statusBody, &statusResult); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse status response"})
		return
	}

	// If not completed yet, return status
	if statusResult.Status != "completed" {
		if statusResult.Status == "error" {
			c.JSON(http.StatusOK, gin.H{
				"status":        "error",
				"error_message": statusResult.ErrorMessage,
			})
			return
		}
		c.JSON(http.StatusAccepted, gin.H{
			"status":           statusResult.Status,
			"transcription_id": transcriptionID,
		})
		return
	}

	// Fetch the actual transcript
	log.Printf("Transcription completed, fetching transcript for ID: %s", transcriptionID)
	transcriptReq, err := http.NewRequest("GET", fmt.Sprintf("https://api.soniox.com/v1/transcriptions/%s/transcript", transcriptionID), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create transcript request"})
		return
	}
	transcriptReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", sonioxAPIKey))

	transcriptResp, err := client.Do(transcriptReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("transcript fetch error: %v", err)})
		return
	}
	defer transcriptResp.Body.Close()

	transcriptBody, err := io.ReadAll(transcriptResp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read transcript"})
		return
	}

	// The response has tokens array directly at root level
	var transcriptResult struct {
		ID     string `json:"id"`
		Text   string `json:"text"`
		Tokens []struct {
			Text          string  `json:"text"`
			StartMs       int     `json:"start_ms"`
			EndMs         int     `json:"end_ms"`
			Confidence    float64 `json:"confidence"`
			Speaker       string  `json:"speaker,omitempty"`
			Language      string  `json:"language,omitempty"`
			IsAudioEvent  *bool   `json:"is_audio_event,omitempty"`
		} `json:"tokens"`
	}
	if err := json.Unmarshal(transcriptBody, &transcriptResult); err != nil {
		log.Printf("Failed to parse transcript. Error: %v, Response (first 500 chars): %s", err, string(transcriptBody[:min(500, len(transcriptBody))]))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":    "failed to parse transcript",
			"details":  err.Error(),
			"response": string(transcriptBody[:min(200, len(transcriptBody))]),
		})
		return
	}

	// Load speaker mapping and manual corrections
	speakerMappingValue, _ := h.assessmentResults.Load(fmt.Sprintf("%s_speaker_mapping", sessionID))
	manualCorrectionsValue, _ := h.assessmentResults.Load(fmt.Sprintf("%s_manual_corrections", sessionID))

	speakerMapping := make(map[int]string)
	if speakerMappingValue != nil {
		speakerMapping = speakerMappingValue.(map[int]string)
	}

	manualCorrections := make(map[int]string)
	if manualCorrectionsValue != nil {
		manualCorrections = manualCorrectionsValue.(map[int]string)
	}

	// Process tokens into segments with speaker names
	type Segment struct {
		Speaker   int     `json:"speaker"`
		Name      string  `json:"name"`
		Text      string  `json:"text"`
		StartTime float64 `json:"start_time"`
		EndTime   float64 `json:"end_time"`
	}

	segments := []Segment{}
	var currentSegment *Segment

	for _, token := range transcriptResult.Tokens {
		// Skip audio events
		if token.IsAudioEvent != nil && *token.IsAudioEvent {
			continue
		}

		// Parse speaker ID from speaker string (e.g., "1" -> 1)
		speakerID := 0
		if token.Speaker != "" {
			fmt.Sscanf(token.Speaker, "%d", &speakerID)
		}

		// Apply manual corrections first, then fall back to auto-identified names
		speakerName := fmt.Sprintf("Speaker %d", speakerID)
		if name, ok := manualCorrections[speakerID]; ok {
			speakerName = name
		} else if name, ok := speakerMapping[speakerID]; ok {
			speakerName = name
		}

		// Create new segment when speaker changes or first token
		if currentSegment == nil || currentSegment.Speaker != speakerID {
			if currentSegment != nil {
				segments = append(segments, *currentSegment)
			}
			currentSegment = &Segment{
				Speaker:   speakerID,
				Name:      speakerName,
				Text:      token.Text,
				StartTime: float64(token.StartMs) / 1000.0,
				EndTime:   float64(token.EndMs) / 1000.0,
			}
		} else {
			// Append to current segment
			currentSegment.Text += token.Text
			currentSegment.EndTime = float64(token.EndMs) / 1000.0
		}
	}

	if currentSegment != nil {
		segments = append(segments, *currentSegment)
	}

	log.Printf("Async transcription completed for session %s: %d segments", sessionID, len(segments))

	// Return completed transcription
	c.JSON(http.StatusOK, gin.H{
		"status":           "completed",
		"transcription_id": transcriptionID,
		"segments":         segments,
	})
}
