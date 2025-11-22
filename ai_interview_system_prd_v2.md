# VietinBank AI Interview System - PRD

## Overview
A Vietnamese-first AI-powered video interview platform for automated candidate screening with real-time assessment, multi-dimensional scoring, and detailed reporting. Specifically designed for mass recruitment (100-500+ candidates per cycle) with package-based pricing.

---

## 📚 Table of Contents

### 🎯 **Planning & Requirements**
| Section | Description | Status | Lines |
|---------|-------------|--------|-------|
| **User Stories & Acceptance Criteria** | 13 detailed user stories covering all personas and workflows | ✅ Complete | 114-315 |
| **Job Template & Question Set Management** | Template CRUD, question builder, library management (CRITICAL GAP FIXED) | ✅ Complete | 318-489 |
| **Authentication & Organization Setup** | Corporate domain validation, auto-organization creation | ✅ Implemented | 493-527 |
| **Core Features Overview** | Candidate management, interview setup, AI assessment | ✅ Implemented | 529-574 |

### 🎥 **Interview System**
| Section | Description | Status | Lines |
|---------|-------------|--------|-------|
| **Candidate Management Dashboard** | Vietnamese UI with tabs, filtering, bulk operations | ✅ Implemented | 250-310 |
| **Interview Management** | Job configuration, bulk CSV upload, email invitations | ✅ Implemented | 312-385 |
| **Candidate Interview Experience** | Mobile-first recording interface with AI feedback | ✅ Implemented | 387-450 |
| **AI Assessment Engine** | 5-dimensional Vietnamese scoring with Soniox integration | ✅ Implemented | 452-520 |

### 📊 **Reporting & Analytics**
| Section | Description | Status | Lines |
|---------|-------------|--------|-------|
| **Advanced Reporting** | Executive summaries + recommendations (addresses demo gaps) | ✅ Implemented | 522-580 |
| **Individual Candidate Reports** | Detailed scoring, transcript analysis, next steps | ✅ Implemented | 582-620 |
| **Aggregate Analytics** | Pipeline metrics, AI performance tracking, bias detection | ✅ Implemented | 622-670 |

### 🎨 **UI/UX & Design**
| Section | Description | Status | Lines |
|---------|-------------|--------|-------|
| **Mobile-First Design Requirements** | Touch optimization, gesture navigation (CLAUDE.md Rule #12) | ✅ Implemented | 672-720 |
| **Design System** | VietinBank branding, Vietnamese fonts, responsive breakpoints | ✅ Implemented | 722-750 |
| **Page Layouts** | Dashboard, interview interface, mobile candidate experience | ✅ Implemented | 752-800 |

### 💼 **Business Logic**
| Section | Description | Status | Lines |
|---------|-------------|--------|-------|
| **Package Management** | 4-tier pricing including new Small Business package | ✅ Complete | 802-850 |
| **Interview Limits & Validation** | Technical constraints, retry limits, expiry rules | ✅ Implemented | 852-880 |
| **Scoring Rules** | AI confidence thresholds, recommendation logic | ✅ Implemented | 882-910 |
| **Data Retention** | GDPR compliance, automated deletion policies | ✅ Implemented | 912-940 |

### ⚠️ **Advanced Error Handling**
| Section | Description | Status | Lines |
|---------|-------------|--------|-------|
| **Edge Cases & Error Handling** | 20+ production scenarios with detailed handling procedures | ✅ Complete | 942-1050 |
| **Package Management Edge Cases** | Quota overages, downgrades, payment failures | ✅ Complete | 950-980 |
| **Technical Failure Scenarios** | Video upload failures, AI processing errors, network issues | ✅ Complete | 982-1020 |
| **Compliance & Security** | GDPR requests, data transfer, disaster recovery | ✅ Complete | 1022-1050 |

### 🔧 **Technical Implementation**
| Section | Description | Status | Lines |
|---------|-------------|--------|-------|
| **Video Processing Pipeline** | WebRTC recording, compression, audio extraction | ✅ Implemented | 1239-1255 |
| **Video Storage & File Management** | File naming, organization, lifecycle, metadata tracking | ✅ Complete | 1256-1296 |
| **Admin Video Retrieval & Playback** | HR dashboard video access, player controls, bulk operations | ✅ Complete | 1298-1375 |
| **Candidate Video Recording Journey** | Step-by-step recording flow, preview, upload, error handling | ✅ Complete | 1377-1472 |
| **Reviewer Video Analysis Workflow** | Multi-reviewer system, annotations, consensus, collaboration | ✅ Complete | 1474-1603 |
| **Video Quality Controls** | Adaptive quality, auto-adjustment, compression, validation | ✅ Complete | 1605-1699 |
| **Database Schema** | SQLite + Drizzle ORM with proper enums (no raw SQL) | ✅ Implemented | 582-650 |
| **API Endpoints** | Server Actions, interview management, candidate experience | ✅ Implemented | 652-700 |
| **Soniox Integration** | Vietnamese STT configuration, real-time processing | ✅ Implemented | 702-750 |

### 🏗️ **Architecture & Infrastructure**
| Section | Description | Status | Lines |
|---------|-------------|--------|-------|
| **Technical Architecture** | Next.js 15 + Server-first + Mobile optimization | ✅ Implemented | 1701-1876 |
| **State Management** | Server Components, Server Actions, TanStack Query hierarchy | ✅ Implemented | 1715-1760 |
| **Security Implementation** | Authentication, encryption, GDPR compliance | ✅ Implemented | 1834-1848 |
| **Performance & Deployment** | Optimization strategies, scalability, single-file deployment | ✅ Implemented | 1849-1876 |

### 🔗 **Integrations & Future**
| Section | Description | Status | Lines |
|---------|-------------|--------|-------|
| **ATS Integration** | Workday, SuccessFactors, BambooHR webhooks | 🔄 Phase 2 | 1878-1900 |
| **Email Integration** | SendGrid templates, Vietnamese/English notifications | ✅ Implemented | 1902-1920 |
| **Calendar Integration** | Microsoft Graph, Google Calendar APIs | 📅 Future | 1922-1940 |

### 🚫 **Scope & Constraints**
| Section | Description | Status | Lines |
|---------|-------------|--------|-------|
| **Non-Goals (v1.0)** | Features explicitly not being built in first version | ✅ Complete | 1942-1970 |
| **Success Metrics & KPIs** | Performance targets, business goals, AI accuracy metrics | ✅ Complete | 1972-2010 |

---

### 🔍 **Quick Navigation Guide**
- **📱 Mobile Features**: Lines 672-720, 1109-1123
- **🎥 Video System (NEW!)**: Lines 1239-1699 (complete video recording, storage & review workflows)
  - **Video Storage**: Lines 1256-1296 (file naming, organization, lifecycle)
  - **Admin Video Access**: Lines 1298-1375 (HR dashboard, player, bulk operations)
  - **Candidate Recording**: Lines 1377-1472 (step-by-step flow, preview, upload)
  - **Multi-Reviewer Analysis**: Lines 1474-1603 (collaboration, annotations, consensus)
  - **Quality Controls**: Lines 1605-1699 (adaptive quality, compression, validation)
- **📋 Job Template Management (NEW!)**: Lines 318-489 (CRITICAL GAP FIXED)
  - **Template CRUD**: Lines 328-389 (create, edit, delete templates)
  - **Question Builder**: Lines 351-370 (drag-and-drop question sets)
  - **Template Library**: Lines 372-389 (organize, duplicate, analytics)
  - **UX/UI Interfaces**: Lines 393-489 (complete template management workflows)
- **🤖 AI & Vietnamese Language**: Lines 452-520, 1701-1733
- **🏢 Business Packages**: Lines 802-850 (includes new Small Business tier)
- **⚠️ Error Handling**: Lines 942-1050 (comprehensive edge cases)
- **💾 Database Schema**: Lines 582-650 (SQLite + Drizzle, no raw SQL)
- **🔐 Security & Compliance**: Lines 1834-1848, 1022-1050
- **🎯 Demo Gap Solutions**: Lines 522-580 (executive summary + recommendations)

### 📊 **Implementation Status Legend**
- ✅ **Implemented**: Feature is coded and working in current codebase
- ✅ **Complete**: Specification is fully defined and ready for development
- 🔄 **Phase 2**: Planned for next development cycle
- 📅 **Future**: Nice-to-have for later versions

---

## User Stories & Acceptance Criteria

### Persona Definitions

**👤 HR Manager (Primary User)**
- Conducts 50-200 interviews per recruitment cycle
- Needs quick candidate assessment and ranking
- Values detailed reports for decision making
- Vietnamese-speaking, mobile-heavy usage

**👤 HR Admin (Organization Setup)**
- First user from company domain
- Manages organization settings and user access
- Configures interview templates and scoring weights
- Controls package usage and billing

**👤 Candidate (Interviewee)**
- Job applicant taking AI interview
- May use mobile device exclusively
- Needs clear instructions in Vietnamese
- Prefers simple, intuitive interface

**👤 Executive/Hiring Manager (Report Consumer)**
- Reviews final reports and recommendations
- Needs executive summaries for quick decisions
- Values data-driven hiring insights
- Limited time for detailed analysis

### Core User Stories

#### 🔐 Authentication & Organization Setup

**US-001: Corporate Domain Authentication**
```
As an HR professional
I want to log in using my corporate email
So that I can access interview management for my organization

Acceptance Criteria:
✅ GIVEN I have a corporate email address (not gmail/yahoo)
✅ WHEN I enter my email for login
✅ THEN I receive a verification code via email
✅ AND I can complete login with the verification code
✅ AND my session lasts 8 hours (remember-me: 7 days)

✅ GIVEN I'm the first user from my company domain
✅ WHEN I complete email verification
✅ THEN I automatically become organization admin
✅ AND an organization is created using my email domain
```

**US-002: Organization Management**
```
As an HR Admin
I want to manage organization settings and users
So that I can control access and configure interview processes

Acceptance Criteria:
✅ GIVEN I am an organization admin
✅ WHEN I access organization settings
✅ THEN I can edit organization name and details
✅ AND I can view package usage and limits
✅ AND I can manage user access levels
✅ AND I can configure default interview templates
```

#### 📋 Interview Management

**US-003: Bulk Interview Creation**
```
As an HR Manager
I want to create interviews for multiple candidates at once
So that I can efficiently handle mass recruitment

Acceptance Criteria:
✅ GIVEN I have a CSV file with candidate information
✅ WHEN I upload the file with columns: Email, Họ và Tên, Điện Thoại
✅ THEN the system validates all email addresses
✅ AND creates individual interview sessions for each candidate
✅ AND sends Vietnamese email invitations with 7-day expiry links
✅ AND I can track invitation status for each candidate
```

**US-004: Interview Configuration**
```
As an HR Admin
I want to configure interview templates and scoring weights
So that interviews align with job requirements

Acceptance Criteria:
✅ GIVEN I'm setting up a new interview template
✅ WHEN I configure evaluation criteria weights
✅ THEN the total must equal exactly 100%
✅ AND I can set weights for: Tạo Ấn Tượng, Hiệu Suất Nhiệm Vụ,
    Tư Duy Logic, Khả Năng Nghiên Cứu, Giao Tiếp
✅ AND I can select interview duration (10, 15, 20, 30 minutes)
✅ AND I can choose question sets appropriate for the role
```

#### 🎥 Candidate Interview Experience

**US-005: Mobile Interview Completion**
```
As a Candidate
I want to complete my interview on my mobile phone
So that I can interview anywhere with convenience

Acceptance Criteria:
✅ GIVEN I receive an interview link on my mobile device
✅ WHEN I access the interview URL
✅ THEN I see Vietnamese instructions with English option
✅ AND the interface is optimized for touch interaction
✅ AND I can complete system compatibility tests (camera, mic)
✅ AND I can practice recording before the real interview
✅ AND I can re-record responses up to 2 times per question
```

**US-006: Interview Technical Reliability**
```
As a Candidate
I want the interview system to handle technical issues gracefully
So that technical problems don't affect my interview performance

Acceptance Criteria:
✅ GIVEN technical issues occur during my interview
✅ WHEN my internet connection is slow or unstable
✅ THEN my responses are auto-saved every 30 seconds
✅ AND I can resume from where I left off
✅ AND I see clear error messages in Vietnamese
✅ AND I have access to technical support chat
```

#### 📊 AI Assessment & Reporting

**US-007: Executive Summary Generation**
```
As an HR Manager
I want AI-generated executive summaries for each candidate
So that I can make quick hiring decisions with confidence

Acceptance Criteria:
✅ GIVEN a candidate completes their interview
✅ WHEN the AI assessment is complete
✅ THEN I receive an executive summary with:
✅ - Clear hiring recommendation (RECOMMEND/CONSIDER/NOT_RECOMMEND)
✅ - Top 3 strengths with supporting evidence
✅ - Top 3 concerns with improvement suggestions
✅ - Best-fit role recommendations
✅ - Cultural fit assessment for Vietnamese workplace
```

**US-008: Detailed Assessment Reports**
```
As an HR Manager
I want detailed scoring breakdowns for each candidate
So that I can understand the reasoning behind AI recommendations

Acceptance Criteria:
✅ GIVEN I'm viewing a candidate report
✅ WHEN I access the detailed assessment
✅ THEN I can see scores for all 5 evaluation dimensions
✅ AND transcript excerpts supporting each score
✅ AND specific behavioral indicators observed
✅ AND next steps recommendations for round 2 interviews
✅ AND the report is available in PDF format with company branding
```

#### 📈 Dashboard & Analytics

**US-009: Candidate Management Dashboard**
```
As an HR Manager
I want to manage all candidates in a central dashboard
So that I can efficiently track and organize the recruitment process

Acceptance Criteria:
✅ GIVEN I have multiple interview candidates
✅ WHEN I access the dashboard
✅ THEN I see candidates organized by status tabs:
    TẤT CẢ, SÀNG LỌC, ĐÃ CHỌN, ĐÃ TỪ CHỐI, ĐÁNH SÁCH CHỜ
✅ AND I can filter by score range (0-100%)
✅ AND I can search by name, email, phone in real-time
✅ AND I can perform bulk status updates
✅ AND I can export filtered lists to Excel
```

**US-010: Mobile Dashboard Access**
```
As an HR Manager
I want to access candidate information on my mobile device
So that I can review candidates and make decisions on the go

Acceptance Criteria:
✅ GIVEN I'm using a mobile device
✅ WHEN I access the dashboard
✅ THEN I see a mobile-optimized interface
✅ AND I can swipe between candidate status tabs
✅ AND I can tap to view candidate details
✅ AND I can approve/reject candidates with large touch targets
✅ AND the interface works smoothly in portrait orientation
```

---

## Job Template & Question Set Management

### ❌ **CRITICAL GAP IDENTIFIED: Missing from Original PRD**

The codebase shows comprehensive job template schema and usage, but the PRD lacked complete specifications for template CRUD operations. This section addresses that gap.

### Job Template CRUD User Stories

#### 🏢 **Template Management**

**US-011: Create Job Template**
```
As an HR Admin
I want to create custom job templates for different positions
So that interviews are standardized and aligned with role requirements

Acceptance Criteria:
✅ GIVEN I'm an HR admin
✅ WHEN I access the template management section
✅ THEN I can create a new job template
✅ AND I can set job title (Vietnamese/English)
✅ AND I can add job description and requirements
✅ AND I can configure interview duration (10, 15, 20, 30 minutes)
✅ AND I can set evaluation criteria weights (must total 100%):
    - Tạo Ấn Tượng (Impression): 0-40%
    - Hiệu Suất Nhiệm Vụ (Task Performance): 0-40%
    - Tư Duy Logic (Logical Thinking): 0-40%
    - Khả Năng Nghiên Cứu (Research Ability): 0-40%
    - Giao Tiếp (Communication): 0-40%
✅ AND I can assign questions from the question library
✅ AND I can preview the candidate experience
```

**US-012: Question Set Builder**
```
As an HR Admin
I want to build custom question sets for different job types
So that candidates are evaluated on relevant competencies

Acceptance Criteria:
✅ GIVEN I'm creating/editing a job template
✅ WHEN I access the question builder
✅ THEN I can browse questions by category:
    - Tạo Ấn Tượng (Introduction, confidence, presentation)
    - Hiệu Suất Nhiệm Vụ (Experience, achievements, examples)
    - Tư Duy Logic (Problem-solving, analytical thinking)
    - Khả Năng Nghiên Cứu (Learning, curiosity, research skills)
    - Giao Tiếp (Communication, language skills)
✅ AND I can add/remove questions with drag-and-drop
✅ AND I can set question order and time limits
✅ AND I can preview questions in Vietnamese and English
✅ AND I can save as template for reuse
```

**US-013: Template Library Management**
```
As an HR Admin
I want to manage our organization's template library
So that HR team can reuse and maintain consistent interview standards

Acceptance Criteria:
✅ GIVEN I have created multiple job templates
✅ WHEN I access the template library
✅ THEN I can see all templates organized by:
    - Department (IT, Finance, Marketing, etc.)
    - Seniority Level (Junior, Mid, Senior, Manager)
    - Creation Date and Usage Statistics
✅ AND I can duplicate existing templates for quick setup
✅ AND I can archive/deactivate outdated templates
✅ AND I can track template performance (average scores, completion rates)
✅ AND I can export templates for backup/sharing
```

### Job Template Management UI/UX

#### **Template Library Dashboard**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Job Template Library                    [+ Tạo template mới] │
├─────────────────────────────────────────────────────────────────┤
│ 🔍 Search templates  [Dept ▾] [Level ▾] [Status ▾] [Sort ▾]     │
├─────────────────────────────────────────────────────────────────┤
│ 📊 Quick Stats:                                                │
│ • Total Templates: 12  • Active: 10  • This Month: 45 interviews│
├─────────────────────────────────────────────────────────────────┤
│ ┌─ IT Department ─────────────────────────────────────────────┐ │
│ │ 💻 Java Developer (Senior)        📊 8.2 avg • 23 used    │ │
│ │ 15 min • 5 questions • Updated: Nov 15                    │ │
│ │ [👁️ View] [✏️ Edit] [📋 Duplicate] [📊 Analytics]         │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ 💻 Frontend Developer (Mid)       📊 7.8 avg • 18 used    │ │
│ │ 20 min • 6 questions • Updated: Nov 10                    │ │
│ │ [👁️ View] [✏️ Edit] [📋 Duplicate] [📊 Analytics]         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Finance Department ───────────────────────────────────────┐ │
│ │ 💰 Financial Analyst (Junior)     📊 7.5 avg • 12 used    │ │
│ │ 15 min • 4 questions • Updated: Nov 12                    │ │
│ │ [👁️ View] [✏️ Edit] [📋 Duplicate] [📊 Analytics]         │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### **Template Creation/Edit Interface**
```
┌─────────────────────────────────────────────────────────────────┐
│ ✏️ Edit Template: Java Developer (Senior)      [💾 Save Draft] │
│                                                [✅ Publish]    │
├─────────────────────────────────────────────────────────────────┤
│ 📋 Basic Information                                            │
│ ┌─ Job Title (VN): [Lập trình viên Java Senior            ] ─┐ │
│ │ Job Title (EN): [Senior Java Developer                   ] │ │
│ │ Department:     [IT ▾]  Seniority: [Senior ▾]           │ │
│ │ Duration:       [15 minutes ▾]                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ ⚖️ Evaluation Criteria Weights (Must Total 100%)              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Tạo Ấn Tượng:        [████████░░] 20% [+/-]              │ │
│ │ Hiệu Suất Nhiệm Vụ:  [████████████████░░] 35% [+/-]      │ │
│ │ Tư Duy Logic:        [██████████░░] 25% [+/-]            │ │
│ │ Khả Năng Nghiên Cứu: [████░░] 10% [+/-]                  │ │
│ │ Giao Tiếp:          [████░░] 10% [+/-]                   │ │
│ │                                          Total: 100% ✅   │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 📝 Question Set Builder (5/10 questions)                       │
│ ┌─ Question Library ────┐ ┌─ Selected Questions ─────────────┐ │
│ │ 🔍 Search questions   │ │ 1. [Tạo Ấn Tượng] Giới thiệu   │ │
│ │                       │ │    bản thân và kinh nghiệm     │ │
│ │ 📂 Categories:        │ │    ⏱️ 2 min • [Edit] [Remove]   │ │
│ │ □ Tạo Ấn Tượng (25)  │ │                                 │ │
│ │ ☑ Hiệu Suất NV (40)  │ │ 2. [Hiệu Suất] Dự án thành    │ │
│ │ □ Tư Duy Logic (30)   │ │    công với Java/Spring        │ │
│ │ □ Nghiên Cứu (20)    │ │    ⏱️ 3 min • [Edit] [Remove]   │ │
│ │ □ Giao Tiếp (35)     │ │                                 │ │
│ │                       │ │ [+ Add Question] [🎯 AI Suggest] │ │
│ │ [+ New Question]      │ └─────────────────────────────────┘ │
│ └───────────────────────┘                                     │ │
├─────────────────────────────────────────────────────────────────┤
│ 👀 Preview & Testing                                           │
│ [📱 Mobile Preview] [🖥️ Desktop Preview] [🎬 Record Test]       │
└─────────────────────────────────────────────────────────────────┘
```

#### **Question Library Management**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📚 Question Library                     [+ Thêm câu hỏi mới]   │
├─────────────────────────────────────────────────────────────────┤
│ 🔍 [Search questions...] [Category ▾] [Language ▾] [Sort ▾]     │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Tạo Ấn Tượng (25 questions) ──────────────────────────────┐ │
│ │ 💼 "Giới thiệu bản thân và kinh nghiệm làm việc"          │ │
│ │ 🌏 EN: "Introduce yourself and your work experience"       │ │
│ │ ⏱️ 2 min • Used in 12 templates • ⭐ 4.8/5.0             │ │
│ │ [👁️ Preview] [✏️ Edit] [📋 Duplicate] [📊 Performance]     │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ 🎯 "Tại sao bạn quan tâm đến vị trí này?"                  │ │
│ │ 🌏 EN: "Why are you interested in this position?"          │ │
│ │ ⏱️ 2 min • Used in 8 templates • ⭐ 4.6/5.0              │ │
│ │ [👁️ Preview] [✏️ Edit] [📋 Duplicate] [📊 Performance]     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Hiệu Suất Nhiệm Vụ (40 questions) ────────────────────────┐ │
│ │ 🚀 "Kể về dự án thành công nhất mà bạn đã thực hiện"       │ │
│ │ 🌏 EN: "Tell me about your most successful project"        │ │
│ │ ⏱️ 3 min • Used in 15 templates • ⭐ 4.9/5.0             │ │
│ │ [👁️ Preview] [✏️ Edit] [📋 Duplicate] [📊 Performance]     │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

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

1. **✅ IMPLEMENTED - AI-Generated Executive Summary**

   **Addresses Demo Gap**: *"Có một cái trang tổng quan kết luận không?"* (Customer request for executive summary)

   **Recommendation Engine Logic:**
   - **RECOMMEND**: 75%+ overall score + no critical red flags
   - **CONSIDER**: 50-74% overall score + manageable concerns
   - **NOT_RECOMMEND**: <50% overall score OR major red flags detected

   **Executive Summary Components:**
   - **One-sentence hiring recommendation** with confidence level
   - **Key strengths** (top 3) with supporting evidence from transcript
   - **Key concerns** (top 3) with specific improvement suggestions
   - **Best fit roles** based on scoring profile and strengths
   - **Cultural fit assessment** for Vietnamese business environment

2. **✅ IMPLEMENTED - Detailed Assessment**
   - **5-Dimensional scoring breakdown** with visual charts
   - **Transcript excerpts** supporting each score with timestamps
   - **Behavioral indicators** observed during interview
   - **Industry-specific evaluation** using banking sector keywords
   - **Response quality analysis** per question with reasoning
   - **Communication effectiveness** in Vietnamese and English

3. **✅ IMPLEMENTED - Next Steps Recommendations**

   **Addresses Demo Gap**: *"Nó không có recommend đúng không?"* (Customer request for recommendations)

   - **Interview focus areas** for round 2 based on weak dimensions
   - **Specific questions to ask** targeting identified skill gaps
   - **Reference check priorities** based on claims made in interview
   - **Skills assessment recommendations** for technical validation
   - **Onboarding considerations** if candidate is hired

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

**✅ IMPLEMENTED - Drizzle ORM with SQLite**

The system uses **SQLite with Drizzle ORM** for simple deployment and follows type-safe patterns:

```typescript
// Enums for type safety (CLAUDE.md Rule #5)
export const interviewStatusEnum = ['pending', 'in_progress', 'completed', 'expired'] as const
export const recommendationEnum = ['RECOMMEND', 'CONSIDER', 'NOT_RECOMMEND'] as const
export const packageTierEnum = ['startup', 'growth', 'enterprise'] as const
export const candidateStatusEnum = ['all', 'screened', 'selected', 'rejected', 'waiting'] as const

// Organizations Table - Drizzle Schema
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  domain: text('domain').notNull().unique(),
  name: text('name').notNull(),
  packageTier: text('package_tier').$type<PackageTier>().notNull().default('startup'),
  interviewQuota: integer('interview_quota').notNull().default(100),
  interviewsUsed: integer('interviews_used').notNull().default(0),
  subscriptionExpiresAt: integer('subscription_expires_at'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Interviews Table - Full implementation with AI scoring
export const interviews = sqliteTable('interviews', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  jobTemplateId: text('job_template_id').references(() => jobTemplates.id),
  candidateEmail: text('candidate_email').notNull(),
  candidateName: text('candidate_name').notNull(),
  candidatePhone: text('candidate_phone'),
  status: text('status').$type<InterviewStatus>().notNull().default('pending'),
  interviewLinkToken: text('interview_link_token').notNull().unique(),
  interviewLinkExpiresAt: integer('interview_link_expires_at', { mode: 'timestamp' }).notNull(),
  overallScore: integer('overall_score'), // 0-100
  recommendation: text('recommendation').$type<Recommendation>(),
  aiScores: text('ai_scores', { mode: 'json' }).$type<any>(), // Flexible JSON structure
  transcript: text('transcript'),
  processingCompletedAt: integer('processing_completed_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Interview Responses - Individual question responses with video/scoring
export const interviewResponses = sqliteTable('interview_responses', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  interviewId: text('interview_id').notNull().references(() => interviews.id),
  questionId: text('question_id').references(() => interviewQuestions.id),
  questionOrder: integer('question_order').notNull(),
  responseVideoUrl: text('response_video_url'), // Storage URL
  responseTranscript: text('response_transcript'),
  responseDuration: integer('response_duration'), // seconds
  responseScores: text('response_scores', { mode: 'json' }).$type<DimensionScores>(),
  attemptNumber: integer('attempt_number').notNull().default(1), // max 2 retries
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})
```

**Key Implementation Details:**
- **No Raw SQL** - All database operations use Drizzle ORM (CLAUDE.md Rule #4)
- **Type-Safe Enums** - Status fields use const assertions, not string literals (CLAUDE.md Rule #5)
- **Auto-migrations** - Schema changes generate migration files automatically
- **Single File Deployment** - SQLite database file for easy deployment

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

### Mobile-First Design Requirements

**🚨 CRITICAL: Mobile-First Approach (CLAUDE.md Rule #12)**

The system is designed **mobile-first** for the Vietnamese market where mobile usage dominates:

#### Mobile Design Principles
- **Touch-optimized interfaces** - Minimum 44px touch targets
- **Portrait orientation primary** - Optimized for vertical mobile screens
- **Gesture navigation** - Swipe, tap, long-press interactions
- **Thumb-friendly controls** - Key actions within thumb reach zones
- **Progressive enhancement** - Core functionality works on mobile, enhanced on desktop

### Design System
- **Primary colors**: VietinBank brand colors (red #DA291C, blue #004B9C)
- **Fonts**: Inter for English, Source Sans Pro for Vietnamese
- **Icons**: Heroicons for consistency
- **Spacing**: 4px grid system (optimized for mobile touch)
- **Breakpoints**:
  - **Mobile**: <768px (PRIMARY)
  - **Tablet**: 768px-1024px
  - **Desktop**: ≥1024px (enhanced experience)

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

**✅ IMPLEMENTED - Touch-Optimized Mobile Experience**

```
┌─────────────────────────────┐
│ [≡] VietinBank AI Interview │ ← Touch menu
├─────────────────────────────┤
│ Câu hỏi 3/5 • 10:30 còn lại │ ← Progress indicator
├─────────────────────────────┤
│ "Hãy kể về một dự án thành  │
│ công mà bạn đã tham gia.    │ ← Large, readable text
│ Vai trò của bạn là gì?"     │
│                             │
│ 🎯 Tập trung vào: Kỹ năng  │ ← Hint for candidate
│    lãnh đạo và teamwork     │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │    📹 Video Preview     │ │ ← Full-width video
│ │       [●] 00:45        │ │
│ │                        │ │
│ │   👤 Face detection ✓   │ │ ← AI feedback
│ │   🎤 Audio clear ✓      │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ ┌─────────┐  ┌─────────────┐│
│ │🎤 Thu lại│  │  ➡ Tiếp    ││ ← Large touch targets
│ │   1/2   │  │   theo      ││
│ └─────────┘  └─────────────┘│
├─────────────────────────────┤
│ 💡 Mẹo: Nhìn vào camera và │ ← Helpful tips
│ nói rõ ràng trong 2 phút   │
└─────────────────────────────┘
```

**Mobile-Specific Features:**
- **Large touch targets** (minimum 44px) for all interactive elements
- **Swipe gestures** - Swipe left/right between questions
- **Voice feedback** - Audio cues for recording status
- **Auto-rotation lock** - Portrait mode enforced during recording
- **Battery optimization** - Efficient video encoding for mobile devices
- **Offline handling** - Queue responses when connection is poor

---

## Business Logic & Rules

### Package Management

**🆕 Small Business Package** (≤50 interviews/month):

**Addresses Demo Gap**: *"60-70 người... có thể sẽ tăng lên 100 người"* (Small company cost concerns)

- Interview quota: 50
- Essential AI scoring (all 5 dimensions)
- Basic executive summary reports
- Standard email templates (Vietnamese/English)
- Email support (48-hour response)
- **Price**: $150/month
- **Target**: Companies 50-100 employees with moderate hiring needs

**Startup Package** (≤100 interviews/month):
- Interview quota: 100
- Full AI scoring with detailed analysis
- Executive summary + recommendations
- Standard report templates
- Email support (24-hour response)
- **Price**: $300/month
- **Target**: Growing companies 100-250 employees

**Growth Package** (≤500 interviews/month):
- Interview quota: 500
- Advanced analytics dashboard
- Custom scoring weights configuration
- White-label PDF reports with company branding
- Priority support + training sessions
- **Price**: $800/month
- **Target**: Medium enterprises 250-1000 employees

**Enterprise Package** (unlimited):
- Unlimited interviews
- Custom AI model training for industry-specific terms
- API access for ATS integration
- Dedicated account manager
- Custom reporting and analytics
- **Price**: Custom (starts $2000/month)
- **Target**: Large enterprises 1000+ employees

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

### Edge Cases & Error Handling

#### Package Management Edge Cases

**Quota Overage Scenarios:**
```
WHEN organization exceeds interview quota
THEN new interview creation is blocked
AND admin receives email notification at 90% usage
AND admin sees prominent quota warning in dashboard
AND system provides upgrade options with pricing
AND existing interviews continue to process normally
```

**Package Downgrade:**
```
WHEN organization downgrades to lower package tier
THEN quota is immediately reduced to new package limit
AND no new interviews can be created until under quota
AND existing interviews continue processing
AND historical data remains accessible (read-only)
AND admin can upgrade again to restore full functionality
```

**Payment Failure:**
```
WHEN subscription payment fails
THEN organization has 7-day grace period
AND admin receives email notifications on days 1, 3, 5, 7
AND on day 7, interview creation is suspended
AND data remains preserved for 30 days
AND immediate restoration upon successful payment
```

#### Organization & Authentication Edge Cases

**Domain Ownership Disputes:**
```
WHEN multiple organizations claim same domain
THEN first verified organization takes precedence
AND subsequent attempts receive "domain already claimed" error
AND provide support contact for ownership verification
AND manual resolution process via support tickets
```

**Simultaneous First-User Registration:**
```
WHEN multiple users from new domain register simultaneously
THEN first successful email verification becomes admin
AND subsequent users join as regular users
AND race condition prevented by database unique constraints
AND clear admin assignment notification sent
```

**Corporate Domain Changes:**
```
WHEN company changes domain (merger/rebranding)
THEN admin can request domain migration via support
AND historical data migrated to new domain
AND old domain access revoked after confirmation
AND all users re-verify with new domain emails
```

#### Interview & Video Processing Edge Cases

**Video Upload Failures:**
```
WHEN candidate video upload fails (network/size/format issues)
THEN auto-retry with exponential backoff (3 attempts)
AND fallback to lower quality compression
AND candidate sees progress indicator with retry option
AND manual upload alternative provided
AND support chat automatically triggered after 3 failures
```

**Large File Handling:**
```
WHEN video exceeds 500MB limit
THEN automatic compression attempted
AND candidate notified of compression processing
AND interview continues with compressed version
AND original quality preserved if storage permits
AND quality indicator shown in HR dashboard
```

**AI Processing Failures:**

**Transcription Failures:**
```
WHEN Soniox transcription fails
THEN auto-retry up to 3 times with different quality settings
AND fallback to basic transcription service
AND manual review queue for human transcription
AND interview marked for "human review required"
AND HR notified of processing delay via email
```

**AI Scoring Failures:**
```
WHEN AI scoring engine fails or returns low confidence (<70%)
THEN interview marked for manual review
AND partial scores displayed with confidence indicators
AND admin can trigger re-processing
AND human reviewer can override AI scores
AND failure logged for system improvement
```

#### Candidate Experience Edge Cases

**Technical Compatibility Issues:**
```
WHEN candidate device fails compatibility tests
THEN specific guidance provided for each failure type:
- Camera access denied: Browser permission instructions
- Microphone issues: Device-specific troubleshooting
- Low bandwidth: Mobile data vs WiFi guidance
- Unsupported browser: Browser update/alternative suggestions
AND phone/video call support option provided
AND interview rescheduling without penalty
```

**Interview Link Sharing/Security:**
```
WHEN interview link is shared or accessed from different devices
THEN allow access from up to 3 different IPs/devices
AND require device verification via SMS for new devices
AND log all access attempts for security audit
AND HR can view access log in dashboard
AND suspicious activity triggers security review
```

**Mid-Interview Technical Failures:**
```
WHEN candidate experiences technical failure mid-interview
THEN auto-save every 30 seconds preserves progress
AND candidate can resume from last saved question
AND total time limit extends by failure duration
AND technical support chat automatically offered
AND interview validity flagged for HR consideration
```

#### Data & Compliance Edge Cases

**GDPR Data Deletion Requests:**
```
WHEN candidate requests data deletion
THEN verify identity via email verification
AND provide data export before deletion (required by GDPR)
AND permanently delete within 30 days
AND notify organization of anonymized data removal
AND maintain deletion audit log for compliance
```

**Cross-Border Data Transfer:**
```
WHEN organization in different country from candidate
THEN display data transfer notification
AND obtain explicit consent for cross-border processing
AND comply with both countries' data protection laws
AND provide local data residency options where possible
```

**System Outages & Disaster Recovery:**
```
WHEN system experiences outage during active interviews
THEN candidate progress automatically saved
AND interview links extended by outage duration
AND email notifications sent about service restoration
AND full recovery process documented and tested
AND SLA credits provided for extended outages (>4 hours)
```

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

### ✅ IMPLEMENTED - Next.js 15 + Server-First Architecture

**Frontend Framework**: Next.js 15 with App Router (server-first approach)
**Database**: SQLite with Drizzle ORM (single file deployment)
**Styling**: Tailwind CSS + shadcn/ui components
**State Management**: Server-first with Server Components + Server Actions
**Authentication**: Email verification with session management
**File Storage**: Local/cloud storage for video files
**AI Integration**: OpenAI GPT-4 + Soniox Vietnamese STT

### State Management Architecture (CLAUDE.md Compliance)

**Data Fetching Hierarchy** (preferred order):
1. **Server Components** (default) - Direct database access via Drizzle
2. **Server Actions** - For mutations and form submissions
3. **TanStack Query** - Only when client-side caching needed

**Implementation Patterns:**
```typescript
// ✅ Server Component (PREFERRED for data display)
// app/dashboard/page.tsx
import { db } from '@/lib/db'
import { interviews } from '@/db/schema'

export default async function DashboardPage() {
  const allInterviews = await db.select().from(interviews)
  return <InterviewList interviews={allInterviews} />
}

// ✅ Server Action (for mutations)
// app/dashboard/interviews/actions.ts
'use server'
import { db } from '@/lib/db'
import { interviews } from '@/db/schema'
import { revalidatePath } from 'next/cache'

export async function createInterview(formData: FormData) {
  await db.insert(interviews).values({
    candidateName: formData.get('name') as string,
    // ...
  })
  revalidatePath('/dashboard')
}

// ✅ Client Component (only when needed for UI state)
'use client'
import { useState } from 'react'

export function InterviewForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Only UI state, no server data duplication
}
```

### Mobile-First Architecture

**Responsive Design Strategy:**
- **CSS Grid/Flexbox** for fluid layouts
- **Touch-first interactions** with 44px minimum targets
- **Progressive enhancement** from mobile to desktop
- **Viewport meta tags** for proper mobile scaling
- **Service Worker** for offline capabilities (future)

**Video Recording Optimization:**
- **WebRTC constraints** optimized for mobile cameras
- **Automatic quality adjustment** based on device capabilities
- **Battery usage monitoring** with recording limits
- **Portrait orientation lock** during interview recording

### Database Architecture - Drizzle ORM

**Migration Strategy:**
```bash
# Development workflow
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Apply migrations to database

# Production auto-migration (startup)
// lib/db.ts - Auto-migrate on app startup
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
migrate(db, { migrationsFolder: './src/db/migrations' })
```

**Type Safety & Constraints:**
- **Enum validation** at TypeScript level prevents invalid status values
- **Foreign key constraints** ensure data integrity
- **Unique constraints** prevent duplicate organizations/emails
- **JSON validation** for flexible AI scoring data

### Video Processing Pipeline

**Recording Flow:**
```
Mobile Camera → WebRTC → Browser Recording →
Video Preview → Candidate Confirmation → Chunked Upload →
Server Storage → File Naming → FFmpeg Processing →
Audio Extraction → Soniox Transcription → AI Scoring
```

**Technical Implementation:**
- **MediaRecorder API** for browser video recording
- **Chunked upload** with resume capability for large files
- **Automatic compression** using WebCodecs API when available
- **Fallback quality levels** for poor network conditions
- **Real-time feedback** on video quality and audio levels

### Video Storage & File Management

**File Naming Convention:**
```
Storage Structure:
/videos/
  /{organizationId}/
    /{interviewId}/
      /question-{order}-attempt-{attempt}-{timestamp}.webm

Example:
/videos/vietinbank-com-vn/iv_abc123/question-1-attempt-1-20231122143052.webm
/videos/vietinbank-com-vn/iv_abc123/question-1-attempt-2-20231122143245.webm
/videos/vietinbank-com-vn/iv_abc123/question-2-attempt-1-20231122143410.webm
```

**Storage Implementation:**
- **Local Development**: `/uploads/videos/` directory with auto-cleanup
- **Production**: Cloud storage (AWS S3/equivalent) with CDN delivery
- **File Size Limits**: 500MB per video, 2GB per complete interview
- **Retention Policy**: 90 days auto-deletion after interview completion
- **Backup Strategy**: Automated daily backups with 30-day retention

**Database Video References:**
```typescript
// interview_responses table stores video URLs
responseVideoUrl: `/videos/${organizationId}/${interviewId}/question-${order}-attempt-${attempt}-${timestamp}.webm`

// Additional metadata
{
  originalFileName: "question-1-attempt-1-20231122143052.webm",
  fileSize: 45672345, // bytes
  duration: 125, // seconds
  resolution: "1280x720",
  codec: "webm/vp8",
  uploadedAt: "2023-11-22T14:30:52Z",
  storageProvider: "local" | "s3" | "gcs",
  cdnUrl: "https://cdn.interview.vietinbank.com/videos/...",
  thumbnailUrl: "/thumbnails/iv_abc123/question-1-thumb.jpg"
}
```

### Admin Video Retrieval & Playback

**HR Dashboard Video Access:**

**1. Candidate List Video Indicators:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ☑ [📷] Nguyễn Văn An    an.nguyen@gmail.com    [82%] [🎥5] ✓✗📄│
│   └─ Questions: Q1 ✅ Q2 ✅ Q3 ✅ Q4 ❌ Q5 ✅  Total: 4/5      │
│      Click 🎥5 for video playlist, individual ✅ for single Q   │
└─────────────────────────────────────────────────────────────────┘
```

**2. Video Player Integration:**
```typescript
// Video player component with admin controls
interface AdminVideoPlayer {
  // Basic playback controls
  play: () => void
  pause: () => void
  seek: (timeSeconds: number) => void
  setSpeed: (speed: 0.5 | 1 | 1.25 | 1.5 | 2) => void

  // Admin-specific features
  addNote: (timestamp: number, note: string) => void
  flagConcern: (timestamp: number, concern: string) => void
  exportVideo: (format: 'mp4' | 'original') => void
  shareWithColleague: (email: string) => void

  // Analysis overlay
  showTranscript: boolean
  showAIScoring: boolean
  showTimestamps: boolean
}
```

**3. Video Review Workflow:**
```
HR Manager Dashboard → Candidate List → [🎥5] Click →
Video Playlist Modal → Question Selection → Video Player →
Add Notes/Flags → Save Assessment → Next Question/Candidate
```

**Video Player Interface:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 🎥 Nguyễn Văn An - Question 1: "Giới thiệu bản thân"           │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │               [Video Player Area]                           │ │
│ │                     ▶ 01:45 / 02:30                         │ │
│ │                                                             │ │
│ └───────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ [⏪] [⏯️] [⏩] [🔊] [⚙️Speed] [📝Notes] [🚩Flag] [💾Export] [📤Share] │
├─────────────────────────────────────────────────────────────────┤
│ 📋 Transcript (Auto-scroll with video):                        │
│ "Xin chào, tôi tên là Nguyễn Văn An, hiện đang làm việc..."    │
│                                                                 │
│ 📊 AI Analysis:                                                │
│ • Tạo Ấn Tượng: 8.5/10 - "Tự tin, giọng nói rõ ràng"          │
│ • Giao Tiếp: 8.2/10 - "Cấu trúc câu tốt, từ ngữ phù hợp"      │
├─────────────────────────────────────────────────────────────────┤
│ ✍️ Your Notes:                                                 │
│ [01:23] Candidate appears confident and well-prepared          │
│ [02:15] Good examples of teamwork experience                   │
│                                                                 │
│ 🚩 Flags/Concerns:                                             │
│ [None added]                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Bulk Video Operations:**
- **Video Export**: Batch download multiple candidate videos
- **Playlist Creation**: Custom playlists for interview panels
- **Sharing Permissions**: Share specific videos with hiring managers
- **Quality Controls**: Choose video quality for bandwidth optimization

### Candidate Video Recording Journey

**Detailed Recording Flow:**

**Step 1: Pre-Recording Setup**
```
1. Device Compatibility Check
   ✅ Camera access permission granted
   ✅ Microphone access permission granted
   ✅ Browser compatibility confirmed
   ✅ Internet speed test passed (>1 Mbps upload)

2. Practice Session
   → Record 30-second practice video
   → Preview playback with audio/video quality indicators
   → Option to re-record practice (unlimited)
   → "I'm ready to start" confirmation
```

**Step 2: Question Recording**
```
For Each Question (1-10):
  1. Question Display (30-second read time)
     ┌─────────────────────────────────────────┐
     │ Question 3/5 • Time limit: 2:00        │
     │                                         │
     │ "Hãy kể về một dự án thành công mà     │
     │ bạn đã tham gia. Vai trò của bạn       │
     │ là gì?"                                 │
     │                                         │
     │ 💡 Gợi ý: Tập trung vào kết quả cụ thể │
     │                                         │
     │ [🎬 Bắt đầu ghi] (Ready when you are)   │
     └─────────────────────────────────────────┘

  2. Recording Phase
     ┌─────────────────────────────────────────┐
     │ 🔴 RECORDING • 00:45 / 02:00           │
     │                                         │
     │ ┌─────────────────────────────────────┐ │
     │ │     [Live Camera Preview]            │ │
     │ │                                     │ │
     │ │ 👤 Face detected ✅                 │ │
     │ │ 🎤 Audio level: ████████░░ Good     │ │
     │ │ 💡 Look at camera, speak clearly    │ │
     │ └─────────────────────────────────────┘ │
     │                                         │
     │ [⏹️ Stop Recording]  [⏸️ Pause]        │
     └─────────────────────────────────────────┘

  3. Preview & Confirmation
     ┌─────────────────────────────────────────┐
     │ 📹 Review Your Response                 │
     │                                         │
     │ ┌─────────────────────────────────────┐ │
     │ │    [Video Playback Preview]         │ │
     │ │        ▶ 01:23 / 01:45             │ │
     │ │                                     │ │
     │ │ Quality: Good ✅                    │ │
     │ │ Audio: Clear ✅                     │ │
     │ └─────────────────────────────────────┘ │
     │                                         │
     │ [🎤 Re-record] [➡️ Submit & Continue]   │
     │ Attempts left: 1/2                     │
     └─────────────────────────────────────────┘

  4. Upload Progress
     ┌─────────────────────────────────────────┐
     │ 📤 Uploading response...                │
     │ ████████████████░░░░ 75% (15.2 MB)     │
     │                                         │
     │ ⏱️ Estimated time: 30 seconds          │
     │ 📶 Connection: Stable                   │
     │                                         │
     │ [❌ Cancel] [⏸️ Pause Upload]           │
     └─────────────────────────────────────────┘
```

**Step 3: Upload Error Handling**
```
Upload Failure Scenarios:
1. Network Interruption
   → Auto-pause upload, resume when connection restored
   → Show "Connection lost, retrying..." message
   → Resume from last uploaded chunk

2. File Too Large
   → Auto-compress video to meet size limits
   → Show "Compressing video for optimal upload..."
   → Provide quality vs. size tradeoff options

3. Server Error
   → Retry with exponential backoff (3 attempts)
   → Show "Server busy, retrying in 10 seconds..."
   → Provide "Contact Support" option after 3 failures
```

### Reviewer Video Analysis Workflow

**Multi-Reviewer Process:**

**1. Interview Assignment & Distribution**
```typescript
// Reviewer assignment system
interface InterviewReview {
  interviewId: string
  primaryReviewer: string // HR Manager who receives candidate
  secondaryReviewers: string[] // Additional stakeholders
  reviewDeadline: Date
  reviewStatus: 'pending' | 'in_progress' | 'completed'
  consensusRequired: boolean // For disagreements
}
```

**2. Reviewer Dashboard Video Queue**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Your Interview Review Queue (5 pending)                     │
├─────────────────────────────────────────────────────────────────┤
│ 🔴 HIGH PRIORITY                                               │
│ [📹] Nguyễn Văn An - Java Developer - Due: Today 6PM           │
│ Questions: 5/5 completed • Duration: 12:34 • AI Score: 82%     │
│ [▶️ Start Review] [📄 AI Report] [👥 Other Reviews: 0]         │
├─────────────────────────────────────────────────────────────────┤
│ [📹] Trần Thị Hồng - Product Manager - Due: Tomorrow           │
│ Questions: 4/5 completed • Duration: 10:15 • AI Score: 67%     │
│ [▶️ Start Review] [📄 AI Report] [👥 Other Reviews: 1]         │
└─────────────────────────────────────────────────────────────────┘
```

**3. Video Review Interface**
```
┌─────────────────────────────────────────────────────────────────┐
│ 👥 Multi-Reviewer Analysis: Nguyễn Văn An                      │
│ Java Developer • Applied: Nov 20, 2023 • Your Role: Primary    │
├─────────────────────────────────────────────────────────────────┤
│ 📹 Video Playlist (5 questions)    📊 Review Progress          │
│ ┌─ Q1: Giới thiệu bản thân ✅───┐  ┌─ Your Review: 3/5 ─────┐   │
│ │ [▶️] 2:15 • AI: 8.5/10        │  │ [████████░░] 60%       │   │
│ │ 📝 Your notes: Professional   │  │                        │   │
│ │ ⭐ Your score: 8/10           │  │ Other Reviewers:       │   │
│ ├─ Q2: Kinh nghiệm làm việc ✅──┤  │ • Manager A: 2/5       │   │
│ │ [▶️] 3:42 • AI: 7.8/10        │  │ • Tech Lead: 0/5       │   │
│ │ 📝 Your notes: Good examples  │  │                        │   │
│ │ ⭐ Your score: 8/10           │  │ Consensus: Pending     │   │
│ ├─ Q3: Thử thách lớn nhất ⏳──│  └────────────────────────┘   │
│ │ [▶️] 2:58 • AI: 6.2/10        │                              │
│ │ 📝 Add your notes...          │  🎯 Quick Actions:           │
│ │ ⭐ Score: [Select 1-10]       │  [🏃 Quick Review Mode]     │
│ └───────────────────────────────┘  [📝 Add Overall Comment]   │
└─────────────────────────────────────────────────────────────────┘
```

**4. Video Annotation & Collaboration**
```typescript
interface VideoAnnotation {
  timestamp: number // seconds from start
  reviewer: string
  type: 'note' | 'flag' | 'highlight' | 'question'
  content: string
  isPrivate: boolean // visible to all reviewers or just you
  tags: string[] // e.g., ['technical-skill', 'communication', 'red-flag']
}

// Example annotations
[
  {
    timestamp: 83, // 1:23 in video
    reviewer: "hr.manager@vietinbank.com.vn",
    type: "highlight",
    content: "Excellent example of leadership under pressure",
    isPrivate: false,
    tags: ["leadership", "strength"]
  },
  {
    timestamp: 157, // 2:37 in video
    reviewer: "tech.lead@vietinbank.com.vn",
    type: "flag",
    content: "Claims 5 years React experience but seems uncertain about hooks",
    isPrivate: false,
    tags: ["technical-concern", "verification-needed"]
  }
]
```

**5. Consensus & Decision Making**
```
Reviewer Conflict Resolution:

WHEN reviewers disagree (>20% score difference):
1. System flags interview for consensus review
2. All reviewers notified of disagreement
3. Video conference call scheduled automatically
4. Shared annotation workspace opened
5. Final consensus score recorded with reasoning

Review Weighting System:
- Primary Reviewer (HR): 40% weight
- Hiring Manager: 35% weight
- Technical Reviewer: 25% weight
- Final Score = Weighted average of all reviews
```

**6. Video Review Completion**
```
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Review Complete: Nguyễn Văn An                               │
├─────────────────────────────────────────────────────────────────┤
│ Your Overall Assessment:                                        │
│ ⭐ Final Score: 8.2/10 (vs AI: 8.2/10 ✅ Aligned)             │
│                                                                 │
│ 📝 Summary Comment:                                            │
│ "Strong candidate with excellent communication skills and      │
│ relevant experience. Some concerns about advanced technical    │
│ depth but good potential for growth. Recommend for next round."│
│                                                                 │
│ 🎯 Next Step Recommendation:                                  │
│ ○ STRONGLY RECOMMEND  ● RECOMMEND  ○ CONSIDER  ○ REJECT       │
│                                                                 │
│ 📋 Interview Focus for Round 2:                               │
│ ☑ Technical deep-dive on React/Node.js                        │
│ ☑ System design challenge                                     │
│ ☑ Team collaboration scenarios                                │
│                                                                 │
│ [📤 Submit Review] [💾 Save Draft] [🔄 Review Again]          │
└─────────────────────────────────────────────────────────────────┘
```

### Video Quality Controls & Technical Specifications

**Adaptive Quality Settings:**

**Recording Quality Tiers:**
```typescript
interface VideoQualityConfig {
  // Auto-detected based on device/connection
  tier: 'high' | 'medium' | 'low'

  high: {
    resolution: '1920x1080',
    bitrate: '2500kbps',
    frameRate: 30,
    audioBitrate: '128kbps'
  }

  medium: {
    resolution: '1280x720',
    bitrate: '1500kbps',
    frameRate: 25,
    audioBitrate: '96kbps'
  }

  low: {
    resolution: '854x480',
    bitrate: '800kbps',
    frameRate: 20,
    audioBitrate: '64kbps'
  }
}
```

**Quality Auto-Adjustment:**
```
During Recording:
1. Monitor upload bandwidth every 10 seconds
2. If bandwidth drops below threshold:
   → Auto-reduce quality to next tier
   → Show notification: "Adjusting quality for stable connection"
   → Continue recording without interruption

3. If bandwidth improves:
   → Auto-upgrade quality after 30 seconds of stable connection
   → Show notification: "Improved connection detected, enhancing quality"

Quality Indicators:
🟢 HD (High) - Excellent connection
🟡 SD (Medium) - Good connection
🔴 LD (Low) - Poor connection but stable
⚠️ Unstable - Connection issues detected
```

**Video Compression & Storage:**
```typescript
interface CompressionSettings {
  // Real-time compression during upload
  codec: 'h264' | 'vp9' | 'av1'
  targetSizeMB: number // Based on duration
  qualityPreservation: 'auto' | 'prioritize-size' | 'prioritize-quality'

  // Post-upload optimization
  generateThumbnail: boolean
  createPreviewClip: boolean // First 30 seconds
  audioNormalization: boolean
}

// Storage size optimization
const optimizeVideo = (originalSize: number, maxSize: number) => {
  if (originalSize <= maxSize) return 'no-compression'

  const compressionRatio = maxSize / originalSize
  if (compressionRatio > 0.7) return 'light-compression'
  if (compressionRatio > 0.5) return 'medium-compression'
  return 'high-compression'
}
```

**Technical Quality Validation:**
```
Pre-Upload Validation:
✅ Video duration: 30 seconds minimum, 5 minutes maximum
✅ File format: WebM, MP4, or MOV
✅ Audio present: Minimum 30dB volume level
✅ Video present: Minimum 480p resolution
✅ Face detection: At least 50% of frames with face detected
✅ File corruption: Header and metadata validation

Post-Upload Processing:
1. Virus scan with ClamAV
2. Content verification (ensure it's interview content)
3. Audio quality analysis (background noise, clarity)
4. Video stability check (excessive movement, lighting)
5. Duration validation against question time limits
```

### AI Processing Architecture

**Vietnamese Language Processing:**
```typescript
// Soniox Configuration for Vietnamese
const sonioxConfig = {
  model: 'vi_v1', // Vietnamese model
  language: ['vi', 'en'], // Vietnamese primary, English fallback
  enableSpeakerDiarization: true, // Detect candidate vs system
  enablePunctuation: true,
  context: [ // Banking/HR specific terms
    'VietinBank', 'ngân hàng', 'tài chính',
    'tuyển dụng', 'phỏng vấn', 'ứng viên'
  ]
}
```

**AI Scoring Pipeline:**
1. **Transcript Processing** - Clean and segment responses
2. **Dimension Analysis** - Score each of 5 evaluation dimensions
3. **Evidence Extraction** - Identify supporting quotes from transcript
4. **Executive Summary** - Generate hiring recommendation with reasoning
5. **Next Steps** - Provide specific recommendations for follow-up

### Security Implementation

**Authentication Flow:**
- **Email verification** with time-limited tokens
- **Session management** with 8-hour active, 7-day remember-me
- **Domain validation** prevents personal email domains
- **CSRF protection** via Next.js built-in mechanisms

**Data Protection:**
- **SQLite encryption** for sensitive data at rest
- **TLS 1.3** for all data in transit
- **Role-based access** with organization-level isolation
- **Audit logging** for all candidate data access
- **GDPR compliance** with automated data retention/deletion

### Performance Optimization

**Server-Side Optimizations:**
- **Database indexing** on frequently queried fields
- **SQL query optimization** via Drizzle prepared statements
- **Image/video optimization** with Next.js built-in features
- **Static generation** for public pages (landing, docs)

**Client-Side Optimizations:**
- **Code splitting** via Next.js automatic bundling
- **Progressive loading** for dashboard data
- **Optimistic updates** for real-time feel
- **Service Workers** for offline capability (future)

### Deployment Architecture

**Single-File Deployment:**
- **SQLite database** as single file for simple deployment
- **Next.js standalone** build for container deployment
- **Environment-based configuration** for different stages
- **Automated migrations** on application startup

**Scalability Considerations:**
- **SQLite Write-Ahead Logging** for better concurrency
- **Database connection pooling** for multiple requests
- **Horizontal scaling** via multiple app instances
- **Future migration path** to PostgreSQL when needed

---

This PRD provides the specific, actionable detail needed for development while addressing the gaps identified in the current system through the Vietnamese demo analysis.