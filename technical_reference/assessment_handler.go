package assessment

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"newing.vn/competency/backend/internal/api/middleware"
	"newing.vn/competency/backend/internal/domain/models"
	"newing.vn/competency/backend/internal/repository/interfaces"
	"newing.vn/competency/backend/internal/service"
)

// Handler handles assessment-related HTTP requests
type Handler struct {
	assessmentService   *service.AssessmentService
	statisticsService   *service.AssessmentStatisticsService
}

// NewHandler creates a new assessment handler
func NewHandler(assessmentService *service.AssessmentService, statisticsService *service.AssessmentStatisticsService) *Handler {
	return &Handler{
		assessmentService: assessmentService,
		statisticsService: statisticsService,
	}
}

// ListAssessments handles GET /api/v1/assessments
func (h *Handler) ListAssessments(c *gin.Context) {
	clientID := middleware.GetClientID(c)
	
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	employeeIDStr := c.Query("employee_id")
	assessmentTypeStr := c.Query("assessment_type")
	statusStr := c.Query("status")
	conductedByIDStr := c.Query("conducted_by_id")
	competencyProfileIDStr := c.Query("competency_profile_id")
	search := c.Query("search")
	
	// Build filter
	filter := interfaces.AssessmentFilter{
		ClientID: clientID,
		Search:   search,
	}
	
	if employeeIDStr != "" {
		if employeeID, err := uuid.Parse(employeeIDStr); err == nil {
			filter.EmployeeID = &employeeID
		}
	}
	
	if assessmentTypeStr != "" {
		assessmentType := models.AssessmentType(assessmentTypeStr)
		filter.AssessmentType = &assessmentType
	}
	
	if statusStr != "" {
		status := models.AssessmentStatus(statusStr)
		filter.Status = &status
	}
	
	if conductedByIDStr != "" {
		if conductedByID, err := uuid.Parse(conductedByIDStr); err == nil {
			filter.ConductedByID = &conductedByID
		}
	}
	
	if competencyProfileIDStr != "" {
		if competencyProfileID, err := uuid.Parse(competencyProfileIDStr); err == nil {
			filter.CompetencyProfileID = &competencyProfileID
		}
	}
	
	// Build pagination
	offset := (page - 1) * limit
	pagination := interfaces.Pagination{
		Offset: offset,
		Limit:  limit,
	}
	
	assessments, total, err := h.assessmentService.ListAssessments(c.Request.Context(), clientID, filter, pagination)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data": assessments,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetAssessment handles GET /api/v1/assessments/:id
func (h *Handler) GetAssessment(c *gin.Context) {
	clientID := middleware.GetClientID(c)
	
	assessmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assessment ID"})
		return
	}
	
	assessment, err := h.assessmentService.GetAssessment(c.Request.Context(), clientID, assessmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, assessment)
}

// CreateAssessment handles POST /api/v1/assessments
func (h *Handler) CreateAssessment(c *gin.Context) {
	clientID := middleware.GetClientID(c)
	userID := middleware.GetCurrentUserID(c)
	
	var input service.AssessmentServiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	assessment, err := h.assessmentService.CreateAssessment(c.Request.Context(), clientID, userID, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, assessment)
}

// UpdateAssessment handles PUT /api/v1/assessments/:id
func (h *Handler) UpdateAssessment(c *gin.Context) {
	clientID := middleware.GetClientID(c)
	userID := middleware.GetCurrentUserID(c)
	
	assessmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assessment ID"})
		return
	}
	
	var input service.AssessmentServiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	assessment, err := h.assessmentService.UpdateAssessment(c.Request.Context(), clientID, userID, assessmentID, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, assessment)
}

// DeleteAssessment handles DELETE /api/v1/assessments/:id
func (h *Handler) DeleteAssessment(c *gin.Context) {
	clientID := middleware.GetClientID(c)
	userID := middleware.GetCurrentUserID(c)
	
	assessmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assessment ID"})
		return
	}
	
	if err := h.assessmentService.DeleteAssessment(c.Request.Context(), clientID, userID, assessmentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusNoContent, nil)
}

// StartAssessment handles POST /api/v1/assessments/:id/start
func (h *Handler) StartAssessment(c *gin.Context) {
	clientID := middleware.GetClientID(c)
	userID := middleware.GetCurrentUserID(c)
	
	assessmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assessment ID"})
		return
	}
	
	if err := h.assessmentService.StartAssessment(c.Request.Context(), clientID, userID, assessmentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Assessment started successfully"})
}

// CompleteAssessment handles POST /api/v1/assessments/:id/complete
func (h *Handler) CompleteAssessment(c *gin.Context) {
	clientID := middleware.GetClientID(c)
	userID := middleware.GetCurrentUserID(c)
	
	assessmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assessment ID"})
		return
	}
	
	if err := h.assessmentService.CompleteAssessment(c.Request.Context(), clientID, userID, assessmentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Assessment completed successfully"})
}

// SubmitAssessmentResponse handles POST /api/v1/assessments/:id/responses
func (h *Handler) SubmitAssessmentResponse(c *gin.Context) {
	clientID := middleware.GetClientID(c)
	userID := middleware.GetCurrentUserID(c)
	
	assessmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assessment ID"})
		return
	}
	
	var input struct {
		Responses []service.AssessmentResponseInput `json:"responses" binding:"required,min=1"`
	}
	
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if err := h.assessmentService.SubmitAssessmentResponse(c.Request.Context(), clientID, userID, assessmentID, input.Responses); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Responses submitted successfully"})
}

// CreateFeedbackRequests handles POST /api/v1/assessments/:id/feedback-requests
func (h *Handler) CreateFeedbackRequests(c *gin.Context) {
	clientID := middleware.GetClientID(c)
	userID := middleware.GetCurrentUserID(c)
	
	assessmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assessment ID"})
		return
	}
	
	var input struct {
		Requests []service.FeedbackRequestInput `json:"requests" binding:"required,min=1"`
	}
	
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if err := h.assessmentService.CreateFeedbackRequests(c.Request.Context(), clientID, userID, assessmentID, input.Requests); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{"message": "Feedback requests created successfully"})
}

// GetAssessmentStatistics handles GET /api/v1/analytics/assessment-statistics
func (h *Handler) GetAssessmentStatistics(c *gin.Context) {
	clientID := middleware.GetClientID(c)
	
	stats, err := h.statisticsService.GetStatistics(c.Request.Context(), clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, stats)
}

// GetEmployeeAssessments handles GET /api/v1/employees/:id/assessments
func (h *Handler) GetEmployeeAssessments(c *gin.Context) {
	clientID := middleware.GetClientID(c)
	
	employeeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee ID"})
		return
	}
	
	// Parse pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	
	filter := interfaces.AssessmentFilter{
		ClientID:   clientID,
		EmployeeID: &employeeID,
	}
	
	offset := (page - 1) * limit
	pagination := interfaces.Pagination{
		Offset: offset,
		Limit:  limit,
	}
	
	assessments, total, err := h.assessmentService.ListAssessments(c.Request.Context(), clientID, filter, pagination)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data": assessments,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetPendingAssessments handles GET /api/v1/assessments/pending
func (h *Handler) GetPendingAssessments(c *gin.Context) {
	clientID := middleware.GetClientID(c)
	
	// Parse pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	offset := (page - 1) * limit
	pagination := interfaces.Pagination{
		Offset: offset,
		Limit:  limit,
	}
	
	// Use assessment repo directly for pending assessments
	// This is a simplified approach - in production you might want a dedicated service method
	status := models.AssessmentStatusPending
	filter := interfaces.AssessmentFilter{
		ClientID: clientID,
		Status:   &status,
	}
	
	assessments, total, err := h.assessmentService.ListAssessments(c.Request.Context(), clientID, filter, pagination)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data": assessments,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}