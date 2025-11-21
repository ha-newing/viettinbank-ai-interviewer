# VietinBank AI Interview System - PRD

## Overview
A Vietnamese-first AI-powered video interview platform for automated candidate screening with real-time assessment, multi-dimensional scoring, and detailed reporting. Specifically designed for mass recruitment (100-500+ candidates per cycle) with package-based pricing.

---

## Authentication & Organization Setup

### Login
- **Email-based authentication** with verification code
- **Corporate domain validation** - no personal emails (gmail, yahoo, etc.)
- **Session duration**: 8 hours active, 7 days remember-me
- On first login from new domain → create organization
- On subsequent logins from same domain → join existing organization

### Organization
- Organization identified by email domain (`hr@vietinbank.com.vn` → `vietinbank.com.vn`)
- **First user becomes admin** - can manage users, configure scoring, delete candidates
- Organization name = domain name initially (editable by admin)
- **Package limits enforced** - interview quota based on subscription tier

---

## Core Features

### Candidate Management Dashboard

Landing page after login: `/dashboard`

#### Candidate Tabs (Based on Demo Analysis)
- **TẤT CẢ** (All) - shows total count in parentheses
- **SÀNG LỌC** (Screened) - candidates with completed interviews
- **ĐÃ CHỌN** (Selected) - marked for next round
- **ĐÃ TỪ CHỐI** (Rejected) - marked as not suitable
- **ĐÁNH SÁCH CHỜ** (Waiting List) - deferred decisions

#### Candidate List View
Each candidate row shows:
- **Profile photo** (if available) or initials circle
- **Full name** in Vietnamese format (HỌ VÀ TÊN)
- **Email address** (clickable mailto link)
- **Phone number** with Vietnamese +84 format
- **AI Score** as circular progress indicator (0-100%)
  - Green: 80-100% (excellent)
  - Blue: 60-79% (good)
  - Yellow: 40-59% (average)
  - Red: 0-39% (poor)
- **Status badge** with Vietnamese labels
- **Action buttons**: ✓ (Select), ✗ (Reject), 📄 (Report), ⋯ (More)

#### Candidate Actions
- **Bulk operations** - select multiple candidates for batch status updates
- **Filter by score range** - slider for 0-100%
- **Search** - real-time search by name, email, phone
- **Sort options** - score (high/low), date (newest/oldest), name (A-Z)
- **Export to Excel** - filtered candidate list with scores

### Interview Management

#### Interview Setup
URL pattern: `/interview/setup/{job-id}`

**Job Configuration:**
- **Job title** (required, Vietnamese/English)
- **Interview duration** - dropdown: 10, 15, 20, 30 minutes
- **Question set** - select from templates or custom
- **Evaluation criteria weights**:
  - Tạo Ấn Tượng (Impression): 0-40%
  - Hiệu Suất Nhiệm Vụ (Task Performance): 0-40%
  - Tư Duy Logic (Logical Thinking): 0-40%
  - Khả Năng Nghiên Cứu (Research Ability): 0-40%
  - Giao Tiếp (Communication): 0-40%
  - **Total must equal 100%**

**Candidate Invitation:**
- **Bulk email upload** - CSV with columns: Email, Họ và Tên, Điện Thoại
- **Email template** in Vietnamese with:
  - Interview link with UUID: `interview.neufast.com/candidate/{uuid}`
  - **Link expires in 7 days**
  - Technical requirements (camera, microphone, stable internet)
  - Expected duration and question count
- **Automatic reminders** - 24 hours and 2 hours before expiry

#### Candidate Interview Experience
URL: `/candidate/{interview-uuid}`

**Pre-Interview Checks:**
- **System compatibility test** - camera, microphone, browser
- **Connection speed test** - minimum 1 Mbps upload required
- **Practice question** - allows one practice recording (30 seconds max)
- **Vietnamese instructions** with option to switch to English
- **Terms acceptance** - video recording and AI analysis consent

**Interview Interface:**
- **Question display** - Vietnamese text with option for English translation
- **Video recording area** - 640x480 minimum resolution
- **Recording controls** - Start, Stop, Re-record (max 2 retries per question)
- **Progress indicator** - Question X of Y, Time remaining
- **Technical issues button** - contact support chat
- **Auto-save** recordings every 30 seconds

**Post-Interview:**
- **Completion confirmation** with reference number
- **Next steps email** - when to expect results
- **Feedback survey link** (optional)

### AI Assessment Engine

#### Real-Time Processing
URL: `/api/assess/{interview-uuid}`

**Transcription (Soniox Integration):**
- **Model**: `stt-rt-v3` for Vietnamese
- **Language hints**: `["vi", "en"]`
- **Speaker diarization**: enabled to distinguish candidate vs system
- **Confidence threshold**: minimum 0.7 for scoring
- **Context keywords**: job-specific terms loaded from job template

**Scoring Algorithm:**
Each dimension scored 0-10, then converted to 0-100% scale:

1. **Tạo Ấn Tượng (Impression Creation)**
   - **Face detection**: eye contact estimation, facial expression analysis
   - **Voice quality**: clarity, pace, tone variation
   - **Professional appearance**: automated background/clothing assessment
   - **Engagement score**: based on response energy and enthusiasm markers

2. **Hiệu Suất Nhiệm Vụ (Task Performance)**
   - **Content relevance**: keyword matching to job requirements
   - **Example quality**: specific vs. generic examples provided
   - **Achievement indicators**: quantifiable results mentioned
   - **Industry knowledge**: sector-specific terminology usage

3. **Tư Duy Logic (Logical Thinking)**
   - **Structured responses**: clear beginning, middle, end
   - **Cause-effect reasoning**: logical connections between ideas
   - **Problem-solving approach**: systematic vs. random thinking
   - **Evidence-based arguments**: facts vs. opinions ratio

4. **Khả Năng Nghiên Cứu (Research Ability)**
   - **Curiosity indicators**: questions about company/role
   - **Information sources**: mentions of research methods
   - **Learning orientation**: growth mindset indicators
   - **Knowledge depth**: beyond surface-level understanding

5. **Giao Tiếp (Communication Skills)**
   - **Language proficiency**: grammar, vocabulary richness (Vietnamese/English)
   - **Clarity**: message comprehension ease
   - **Active listening**: responses that build on questions
   - **Cultural appropriateness**: Vietnamese business communication norms

#### Scoring Output
```json
{
  "overall_score": 75,
  "dimensions": {
    "impression": {"score": 8.2, "percentage": 82, "notes": "Tự tin, giọng nói rõ ràng"},
    "task_performance": {"score": 7.1, "percentage": 71, "notes": "Ví dụ cụ thể tốt"},
    "logical_thinking": {"score": 6.8, "percentage": 68, "notes": "Cần cải thiện cấu trúc"},
    "research_ability": {"score": 7.5, "percentage": 75, "notes": "Thể hiện sự tìm hiểu"},
    "communication": {"score": 8.0, "percentage": 80, "notes": "Giao tiếp tự nhiên"}
  },
  "transcript": "Tôi có 3 năm kinh nghiệm...",
  "red_flags": ["Thiếu ví dụ cụ thể về leadership"],
  "strengths": ["Kinh nghiệm ngành ngân hàng", "Thái độ tích cực"],
  "recommendation": "PROCEED" | "REJECT" | "REVIEW"
}
```

### Advanced Reporting

#### Individual Candidate Report
URL: `/candidate/{id}/report`

**Report Structure:**
1. **Executive Summary** (Missing from current system - major gap identified)
   - **Overall recommendation**: Strongly Recommend / Recommend / Consider / Do Not Recommend
   - **Key strengths** (top 3)
   - **Key concerns** (top 3)
   - **Best fit roles** based on scoring profile

2. **Detailed Assessment**
   - **Score breakdown** with visual charts
   - **Transcript excerpts** supporting each score
   - **Behavioral indicators** observed during interview
   - **Industry-specific evaluation** (banking sector keywords for VietinBank)

3. **Next Steps Recommendations** (Missing from current system)
   - **Interview focus areas** for round 2
   - **Specific questions to ask** based on gaps identified
   - **Reference check priorities**
   - **Skills assessment recommendations**

**Export Options:**
- **PDF with VietinBank branding** (whitelabeled)
- **Excel summary** for spreadsheet analysis
- **API JSON** for ATS integration

#### Aggregate Analytics
URL: `/analytics/dashboard`

**Recruitment Pipeline Metrics:**
- **Funnel visualization**: Applications → Screened → Selected → Hired
- **Average scores by dimension** across all candidates
- **Time-to-screen metrics** before/after AI implementation
- **Cost per candidate** based on package usage

**AI Performance Analytics:**
- **Scoring distribution** - bell curve of candidate scores
- **Bias detection** - scoring patterns by demographic indicators (when available)
- **False positive/negative tracking** - when AI recommended candidates fail/succeed in later rounds
- **Model accuracy trends** - improvement over time

---

## Technical Specification

### Video Processing Pipeline

**Recording Requirements:**
- **Video codec**: H.264, max 1080p, min 720p
- **Audio codec**: AAC, 48kHz sample rate, stereo
- **Maximum file size**: 500MB per interview
- **Compression**: Automatic optimization to <100MB for storage

**Real-time Processing:**
```javascript
const videoConfig = {
  video: {
    width: { ideal: 1280, min: 720 },
    height: { ideal: 720, min: 480 },
    frameRate: { ideal: 30, min: 15 }
  },
  audio: {
    sampleRate: 48000,
    channelCount: 2,
    echoCancellation: true,
    noiseSuppression: true
  }
}
```

### Database Schema

**Organizations Table:**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  domain VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  package_tier VARCHAR(20) NOT NULL, -- 'startup', 'growth', 'enterprise'
  interview_quota INTEGER NOT NULL,
  interviews_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  subscription_expires_at TIMESTAMP
);
```

**Interviews Table:**
```sql
CREATE TABLE interviews (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  candidate_email VARCHAR(255) NOT NULL,
  candidate_name VARCHAR(255) NOT NULL,
  candidate_phone VARCHAR(20),
  job_title VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'expired'
  video_url VARCHAR(500),
  transcript TEXT,
  ai_scores JSONB, -- scores for each dimension
  overall_score INTEGER, -- 0-100
  recommendation VARCHAR(20), -- 'PROCEED', 'REJECT', 'REVIEW'
  interview_link_expires_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Interview_Questions Table:**
```sql
CREATE TABLE interview_questions (
  id UUID PRIMARY KEY,
  interview_id UUID REFERENCES interviews(id),
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  response_video_url VARCHAR(500),
  response_transcript TEXT,
  response_score JSONB -- per-dimension scores for this question
);
```

### API Endpoints

**Interview Management:**
```typescript
POST /api/interviews/bulk-create
{
  job_title: string,
  candidates: Array<{email: string, name: string, phone?: string}>,
  expiry_days: number, // max 30
  evaluation_weights: {
    impression: number, // 0-100
    task_performance: number,
    logical_thinking: number,
    research_ability: number,
    communication: number
  }
}

GET /api/interviews/{interview_id}/status
Response: {
  status: 'pending' | 'in_progress' | 'completed',
  completion_percentage: number,
  current_question: number,
  total_questions: number
}

POST /api/interviews/{interview_id}/complete
{
  final_scores: object,
  recommendation: string,
  processing_time_ms: number
}
```

**Candidate Experience:**
```typescript
GET /api/candidate/{interview_uuid}
Response: {
  candidate_name: string,
  job_title: string,
  questions: Array<{id: string, text: string, time_limit: number}>,
  technical_requirements: object,
  expires_at: string
}

POST /api/candidate/{interview_uuid}/upload-response
{
  question_id: string,
  video_blob: File,
  attempt_number: number // max 2 retries
}
```

### Soniox Integration

**Configuration:**
```javascript
const sonioxConfig = {
  api_key: process.env.SONIOX_API_KEY,
  model: "stt-rt-v3",
  language_hints: ["vi", "en"],
  enable_speaker_diarization: true,
  enable_language_identification: true,
  context: `
    VietinBank, ngân hàng, tài chính, khách hàng, dịch vụ,
    tuyển dụng, phỏng vấn, ứng viên, kinh nghiệm làm việc,
    kỹ năng giao tiếp, làm việc nhóm, giải quyết vấn đề
  `
};
```

**Processing Flow:**
1. Upload video to S3/equivalent storage
2. Extract audio track using FFmpeg
3. Submit to Soniox async transcription API
4. Poll for completion (max 5 minutes)
5. Process transcript through AI scoring engine
6. Store results in database
7. Send completion email to candidate and HR

---

## UI/UX Specification

### Design System
- **Primary colors**: VietinBank brand colors (red #DA291C, blue #004B9C)
- **Fonts**: Inter for English, Source Sans Pro for Vietnamese
- **Icons**: Heroicons for consistency
- **Spacing**: 4px grid system
- **Breakpoints**: Mobile <768px, Desktop ≥768px

### Page Layouts

#### Dashboard Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] VietinBank AI Interview    [Settings ⚙] [Profile] [Logout] │
├─────────────────────────────────────────────────────────────────┤
│ Dashboard > Tuyển Dụng Java Developer                         │
│                                           [+ Tạo phỏng vấn mới] │
├─────────────────────────────────────────────────────────────────┤
│ Filters: [All Status ▾] [Score Range ▾] [Date ▾]    🔍 Search    │
├─────────────────────────────────────────────────────────────────┤
│ Tabs: [TẤT CẢ (125)] [SÀNG LỌC (89)] [ĐÃ CHỌN (23)] [...]      │
├─────────────────────────────────────────────────────────────────┤
│ ☑ [📷] Nguyễn Văn An           an.nguyen@gmail.com      [82%] ✓✗📄│
│ ☑ [TH] Trần Thị Hồng          hong.tran@yahoo.com      [67%] ✓✗📄│
│ ☑ [LQ] Lê Minh Quang          quang.le@outlook.com     [45%] ✓✗📄│
├─────────────────────────────────────────────────────────────────┤
│ Selected: 0      [Bulk Actions ▾]      Page 1 of 13  [< 1 2 >] │
└─────────────────────────────────────────────────────────────────┘
```

#### Interview Report Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ [← Back to Dashboard]  Nguyễn Văn An - Java Developer          │
├─────────────────────────────────────────────────────────────────┤
│ Executive Summary                                    [Export PDF] │
│ ┌─ ⭐ KẾT QUẢ: RECOMMEND (82/100 điểm) ──────────────────────────┐│
│ │ ✅ Điểm mạnh: Kinh nghiệm Java 5+ năm, giao tiếp tốt         ││
│ │ ⚠️ Cần cải thiện: Kiến thức về microservices                 ││
│ │ 🎯 Phù hợp: Senior Java Developer role                      ││
│ └─────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ Detailed Scores                                   [🎥 Watch Video] │
│ ┌─ Tạo Ấn Tượng ────────────────── 85% ████████▌ │ Excellent   ┐│
│ │ "Tự tin, giọng nói rõ ràng, trang phục chỉn chu"            ││
│ ├─ Hiệu Suất Nhiệm Vụ ──────────── 78% ███████▊ │ Good        ┤│
│ │ "Ví dụ cụ thể về projects, thiếu metrics"                   ││
│ ├─ Tư Duy Logic ────────────────── 82% ████████▏ │ Excellent   ┤│
│ │ "Suy nghĩ có hệ thống, giải quyết vấn đề từng bước"         ││
│ └─ [Continue for all dimensions] ─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

#### Mobile Candidate Interview Interface
```
┌─────────────────────────┐
│ [≡] VietinBank Interview│
├─────────────────────────┤
│ Question 3/5 - 10:30 left│
├─────────────────────────┤
│ "Hãy kể về một dự án    │
│ thành công mà bạn đã    │
│ tham gia. Vai trò của   │
│ bạn là gì?"             │
├─────────────────────────┤
│ ┌───────────────────────┐ │
│ │   [Video Preview]     │ │
│ │     [●] 00:45        │ │
│ │  [⏹ Stop] [⏸ Pause]   │ │
│ └───────────────────────┘ │
├─────────────────────────┤
│ [🎤 Re-record] [➡ Next] │
│ Tries left: 1/2         │
└─────────────────────────┘
```

---

## Business Logic & Rules

### Package Management
**Startup Package** (≤100 interviews/month):
- Interview quota: 100
- Basic AI scoring (all 5 dimensions)
- Standard report templates
- Email support
- **Price**: $300/month

**Growth Package** (≤500 interviews/month):
- Interview quota: 500
- Advanced analytics dashboard
- Custom scoring weights
- White-label PDF reports
- Priority support + training
- **Price**: $800/month

**Enterprise Package** (unlimited):
- Unlimited interviews
- Custom AI model training
- API access for ATS integration
- Dedicated account manager
- **Price**: Custom (starts $2000/month)

### Interview Limits & Validation
- **Maximum interview duration**: 30 minutes
- **Question limit**: 10 questions max per interview
- **Retry limit**: 2 retries per question
- **Link expiry**: 7 days from creation, not extendable
- **Video file size limit**: 500MB total per interview
- **Concurrent interviews**: 50 per organization max

### Scoring Rules
- **Minimum response length**: 30 seconds for scoring
- **Language detection**: Auto-switch Vietnamese/English mid-response
- **Score calculation**: Weighted average across all questions
- **Confidence threshold**: Scores below 70% confidence flagged for human review
- **Recommendation thresholds**:
  - PROCEED: 75%+ overall score
  - REVIEW: 50-74% overall score
  - REJECT: <50% overall score

### Data Retention
- **Video recordings**: 90 days (automatic deletion)
- **Transcripts and scores**: 1 year
- **Aggregate analytics**: 3 years
- **Candidate PII**: Deleted 90 days after rejection, 1 year after hiring
- **GDPR compliance**: Right to deletion within 30 days

---

## Integration Requirements

### ATS Integration (Phase 2)
**Supported Systems**: Workday, SuccessFactors, BambooHR
**API Endpoints**:
```typescript
POST /api/webhook/candidate-complete
{
  ats_candidate_id: string,
  interview_results: {
    overall_score: number,
    recommendation: string,
    detailed_scores: object,
    transcript_summary: string
  }
}
```

### Email Integration
**Provider**: SendGrid for transactional emails
**Templates**:
- Interview invitation (Vietnamese/English)
- Interview reminder (24h, 2h before expiry)
- Interview completion confirmation
- Results notification to HR

### Calendar Integration (Future)
**Microsoft Graph API** for Outlook calendar
**Google Calendar API** for Google Workspace
- Schedule follow-up interviews automatically
- Block interviewer calendars during AI screening periods

---

## Non-Goals (v1.0)

### Not Building
- **Multi-round interview management** - only first-round screening
- **Live interview features** - recorded responses only
- **Interview scheduling** - candidates self-serve via link
- **Custom question builder** - predefined question sets only
- **Advanced video editing** - basic recording/replay only
- **Mobile app** - web-based responsive interface only
- **Integration with payroll systems** - ATS integration sufficient
- **Advanced reporting** - standard reports only, no custom dashboards
- **Multi-language beyond Vietnamese/English** - these two languages only
- **AI model customization** - standard model for all customers
- **Real-time collaboration** - single-user report viewing
- **Candidate feedback collection** - one-way assessment only

### Explicitly Not Supported
- **Interview coaching for candidates** - assessment tool only
- **Background checks** - separate service requirement
- **Skills testing** - behavioral assessment only
- **Personality assessments** - job-relevant competencies only
- **Bias mitigation guarantees** - monitoring only, not prevention
- **WCAG AAA accessibility** - AA level sufficient
- **Offline functionality** - internet required
- **Interview downloads** - cloud storage only
- **Custom AI training** - standard model for all customers

---

## Success Metrics & KPIs

### Product Metrics
- **Interview completion rate**: >85% of started interviews completed
- **AI processing time**: <2 minutes from video upload to scored results
- **User satisfaction (NPS)**: >40 for HR users, >0 for candidates
- **System uptime**: 99.5% excluding scheduled maintenance

### Business Metrics
- **Customer acquisition**: 10 organizations in first 6 months
- **Interview volume**: 1000 interviews processed in first quarter
- **Revenue targets**: $50k ARR by month 6, $200k by month 12
- **Customer retention**: >80% annual retention rate

### AI Performance Metrics
- **Scoring consistency**: <15% variance in scores for similar responses
- **False positive rate**: <20% (AI recommended candidates who fail round 2)
- **Processing accuracy**: >95% successful transcription and scoring
- **Bias detection**: Monthly audits showing <10% score variance by gender/age when controlling for response quality

---

## Technical Architecture

### Infrastructure
**Cloud Provider**: AWS (Vietnam region when available, Singapore otherwise)
**CDN**: CloudFlare for video delivery and DDoS protection
**Database**: PostgreSQL 14+ with Redis for caching
**File Storage**: S3 for video files with lifecycle management
**Monitoring**: DataDog for APM, Sentry for error tracking

### Security Requirements
**Data encryption**: AES-256 for data at rest, TLS 1.3 for data in transit
**Authentication**: JWT tokens with 8-hour expiry, refresh token rotation
**Authorization**: Role-based access control (Admin, HR Manager, Recruiter)
**Audit logging**: All candidate data access logged with user, timestamp, action
**Penetration testing**: Quarterly security audits

### Performance Requirements
- **API response time**: 95th percentile <500ms for dashboard queries
- **Video upload**: Support concurrent uploads, progress indicators
- **Database queries**: Complex reports must complete within 10 seconds
- **Auto-scaling**: Handle 5x traffic spikes without degradation
- **Backup strategy**: Daily database backups with 30-day retention

---

This PRD provides the specific, actionable detail needed for development while addressing the gaps identified in the current system through the Vietnamese demo analysis.