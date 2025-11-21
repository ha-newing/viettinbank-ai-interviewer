# VietinBank AI Interview System - Product Requirements Document (PRD)

## Executive Summary

Based on comprehensive analysis of a 7-minute demo video (via audio transcription and visual interface examination), this PRD outlines requirements for a Vietnamese-language AI-powered interview system designed for automated candidate screening and assessment. The system targets organizations conducting mass recruitment with intelligent video interview analysis, real-time scoring, and detailed candidate reporting.

---

## 1. Product Overview

### 1.1 Product Vision
Create an AI-powered interview platform that automates the first-round candidate screening process through video interviews, providing real-time scoring, detailed analysis, and comprehensive reporting to streamline recruitment for Vietnamese organizations.

### 1.2 Product Mission
Enable HR teams to efficiently screen large volumes of candidates using AI-driven assessment while maintaining consistent evaluation standards and reducing time-to-hire.

### 1.3 Success Metrics
- Reduce first-round screening time by 80%
- Process 100-500 candidates efficiently per recruitment cycle
- Achieve 90%+ accuracy in candidate scoring consistency
- Support Vietnamese and English language interviews

---

## 2. Target Market & User Personas

### 2.1 Primary Market
**Mass Recruitment Organizations**
- Companies hiring 100-500 candidates regularly
- Banking sector (VietinBank primary customer)
- Large corporations with high-volume recruitment needs
- Organizations requiring standardized candidate evaluation

### 2.2 Secondary Market
**Medium-sized Companies**
- 60-100 employee organizations looking to scale
- Growing companies expanding their workforce
- Organizations seeking to standardize their interview process

### 2.3 User Personas

**HR Manager (Primary User)**
- Manages recruitment pipeline
- Reviews AI-generated candidate assessments
- Makes final hiring decisions based on AI recommendations
- Generates reports for stakeholders

**Recruiter (Secondary User)**
- Sets up interview sessions
- Monitors candidate progress
- Manages candidate communication
- Reviews individual candidate performance

**System Administrator (Supporting User)**
- Configures evaluation criteria
- Manages user access and permissions
- Oversees system performance and analytics

---

## 3. Core Features & Functionality

### 3.1 Video Interview Management

**3.1.1 Interview Setup**
- Create interview sessions with customizable questions
- Support multiple interview templates (role-specific, behavioral, technical)
- Generate unique interview links for candidates
- Schedule and send automated interview invitations
- Configure interview duration and question timing

**3.1.2 Candidate Experience**
- Web-based video interview interface (no download required)
- Clear instructions in Vietnamese and English
- Real-time video recording with quality optimization
- Progressive question delivery system
- Technical support chat integration

**3.1.3 Interview Monitoring**
- Real-time interview status tracking
- Live interview monitoring capabilities (optional)
- Automatic session recording and storage
- Connection quality monitoring and troubleshooting

### 3.2 AI-Powered Assessment Engine

**3.2.1 Multi-Dimensional Scoring**
The system evaluates candidates across several key dimensions:

1. **Tạo Ấn Tượng (Impression Creation)** - 10-point scale
   - Facial expressions and demeanor
   - Voice quality and clarity
   - Professional presentation
   - Eye contact and engagement

2. **Hiệu Suất Nhiệm Vụ (Task Performance)** - 10-point scale
   - Response relevance and quality
   - Problem-solving approach
   - Technical knowledge demonstration
   - Specific role competencies

3. **Tư Duy Logic (Logical Thinking)** - 10-point scale
   - Reasoning and analytical skills
   - Structured response organization
   - Critical thinking demonstration
   - Decision-making process

4. **Khả Năng Nghiên Cứu (Research Ability)** - 10-point scale
   - Curiosity and exploration mindset
   - Information gathering approach
   - Learning orientation
   - Knowledge acquisition skills

5. **Khả Năng Giao Tiếp (Communication Skills)** - 10-point scale
   - Language proficiency (Vietnamese/English)
   - Articulation and clarity
   - Listening and response quality
   - Non-verbal communication

**3.2.2 Real-time Transcription & Analysis**
- Automatic speech-to-text with Vietnamese and English support
- Speaker diarization (candidate vs. interviewer identification)
- Sentiment analysis of responses
- Keyword and phrase extraction for role-specific terms
- Real-time confidence scoring during interview

**3.2.3 Intelligent Scoring Algorithm**
- Machine learning-based evaluation engine
- Context-aware scoring (industry, role, seniority level)
- Bias detection and mitigation mechanisms
- Continuous learning from HR feedback
- Customizable scoring weights per dimension

### 3.3 Candidate Management Dashboard

**3.3.1 Candidate Pipeline Overview**
- Comprehensive candidate status tracking with tabs:
  - TẤT CẢ (All Candidates)
  - SÀNG LỌC (Screened)
  - ĐÃ CHỌN (Selected)
  - ĐÃ TỪ CHỐI (Rejected)
  - ĐÁNH SÁCH CHỜ (Waiting List)

**3.3.2 Candidate Profiles**
- Personal information management
- Interview history and scores
- Video recordings with timestamps
- Assessment transcripts and analysis
- Action buttons: Select, Reject, Schedule Next Round

**3.3.3 Batch Operations**
- Multi-candidate selection and actions
- Bulk status updates
- Mass email notifications
- Export capabilities for external systems

### 3.4 Advanced Reporting & Analytics

**3.4.1 Individual Candidate Reports**
- Comprehensive assessment summary
- Detailed scoring breakdown by dimension
- Qualitative analysis with specific feedback
- Strengths and improvement areas identification
- Recommendation for next steps (hire/reject/additional screening)

**3.4.2 Aggregate Analytics**
- Recruitment pipeline analytics
- Candidate quality trends over time
- Interviewer performance consistency
- AI accuracy and bias monitoring
- ROI and efficiency metrics

**3.4.3 Exportable Reports**
- PDF candidate assessment reports
- Excel/CSV data exports for analysis
- Integration-ready API data feeds
- Customizable report templates

---

## 4. Technical Requirements

### 4.1 Architecture Overview
- **Frontend**: Web-based responsive application (React.js/Vue.js)
- **Backend**: Scalable microservices architecture (Node.js/Python)
- **Database**: Distributed database system (PostgreSQL + Redis)
- **AI/ML**: TensorFlow/PyTorch for scoring algorithms
- **Video Processing**: WebRTC for real-time video, FFmpeg for processing
- **Speech Recognition**: Soniox API for Vietnamese STT with speaker diarization

### 4.2 Performance Requirements
- **Video Quality**: Support up to 1080p video recording
- **Latency**: <2 second response time for real-time scoring
- **Concurrent Users**: Support 100+ simultaneous interviews
- **Availability**: 99.5% uptime SLA
- **Scalability**: Auto-scaling for demand spikes

### 4.3 Integration Requirements
- **ATS Integration**: APIs for major Applicant Tracking Systems
- **HRIS Integration**: Employee management system connectivity
- **Calendar Integration**: Google Calendar, Outlook scheduling
- **Communication**: Email/SMS notification systems
- **Single Sign-On**: OAuth 2.0, SAML support

### 4.4 Security & Compliance
- **Data Protection**: End-to-end encryption for video/audio
- **Privacy Compliance**: GDPR-compliant data handling
- **Access Control**: Role-based permissions and audit logs
- **Video Storage**: Secure cloud storage with retention policies
- **Compliance**: SOC 2 Type II certification target

### 4.5 Multilingual Support
- **Primary Languages**: Vietnamese (native), English
- **UI Localization**: Complete Vietnamese interface
- **Speech Recognition**: Native Vietnamese STT with high accuracy
- **Content**: Interview questions and analysis in Vietnamese

---

## 5. User Experience (UX) Design

### 5.1 Design Principles
- **Vietnamese-First**: Native Vietnamese language support throughout
- **Simplicity**: Intuitive interface requiring minimal training
- **Accessibility**: WCAG 2.1 AA compliance for diverse users
- **Mobile-Responsive**: Optimized for desktop and tablet use
- **Professional**: Clean, corporate design suitable for HR environment

### 5.2 Key User Flows

**5.2.1 Candidate Interview Flow**
1. Receive interview invitation email
2. Click link to access interview platform
3. System check (camera, microphone, connection)
4. Review interview instructions
5. Complete video interview questions
6. Submit interview and receive confirmation
7. Automated thank you and next steps communication

**5.2.2 HR Review Flow**
1. Access candidate dashboard
2. Filter/search candidates by status
3. Review individual candidate scores and analysis
4. Watch interview recordings with AI annotations
5. Make hiring decision (select/reject/schedule next round)
6. Generate and export candidate reports
7. Communicate decisions to candidates

### 5.3 Interface Components
- **Responsive Dashboard**: Cards-based layout for candidate overview
- **Video Player**: Custom player with transcript overlay
- **Scoring Visualization**: Circular progress indicators and charts
- **Action Buttons**: Consistent iconography (✓ select, ✗ reject, 📄 report)
- **Filter System**: Advanced filtering by score, status, date ranges

---

## 6. Business Model & Pricing

### 6.1 Pricing Strategy
Based on analysis, the system uses **package-based pricing** with the following structure:

**Tier 1: Startup (60-100 employees)**
- Up to 50 video interviews/month
- Basic AI scoring (5 dimensions)
- Standard reporting
- Email support
- Price: Estimated $200-400/month

**Tier 2: Growth (100-300 employees)**
- Up to 200 video interviews/month
- Advanced AI scoring + custom criteria
- Detailed analytics and reporting
- Priority support + training
- Price: Estimated $500-1000/month

**Tier 3: Enterprise (300+ employees)**
- Unlimited video interviews
- White-label options
- API access and integrations
- Dedicated customer success manager
- Custom pricing based on volume

### 6.2 Revenue Streams
1. **Subscription Revenue**: Monthly/annual recurring subscription fees
2. **Setup Fees**: One-time implementation and customization
3. **Professional Services**: Training, consulting, custom development
4. **Enterprise Licensing**: On-premise deployment options

---

## 7. Implementation Roadmap

### Phase 1: MVP (Months 1-4)
- Core video interview functionality
- Basic AI scoring engine (Vietnamese STT)
- Simple candidate dashboard
- Essential reporting features
- Vietnamese language support

### Phase 2: Enhanced Features (Months 5-8)
- Advanced AI scoring algorithms
- Comprehensive reporting and analytics
- Integration APIs (basic ATS connectivity)
- Mobile-responsive improvements
- Multi-role interview templates

### Phase 3: Enterprise Features (Months 9-12)
- Advanced integrations (HRIS, calendar, SSO)
- Custom scoring criteria configuration
- White-label options
- Advanced analytics and AI insights
- Scale optimization for high-volume usage

### Phase 4: Market Expansion (Months 13-18)
- Additional language support
- Industry-specific templates
- Predictive analytics features
- Advanced AI capabilities (emotion detection, bias mitigation)
- International market entry

---

## 8. Risk Assessment & Mitigation

### 8.1 Technical Risks
**Risk**: AI scoring accuracy and bias concerns
**Mitigation**: Continuous model training, bias detection algorithms, human oversight options

**Risk**: Video quality and connectivity issues
**Mitigation**: Adaptive bitrate streaming, offline backup options, technical support

**Risk**: Scalability challenges during peak usage
**Mitigation**: Cloud-native architecture, auto-scaling, performance monitoring

### 8.2 Market Risks
**Risk**: Competition from established HR tech companies
**Mitigation**: Focus on Vietnamese market specialization, superior AI accuracy

**Risk**: Regulatory changes in AI hiring practices
**Mitigation**: Compliance monitoring, transparent AI decision-making, human oversight

**Risk**: Customer adoption resistance
**Mitigation**: Comprehensive training, gradual rollout, ROI demonstration

### 8.3 Business Risks
**Risk**: High customer acquisition costs
**Mitigation**: Partner channel development, referral programs, content marketing

**Risk**: Customer churn due to complexity
**Mitigation**: User experience focus, customer success programs, regular feedback

---

## 9. Success Metrics & KPIs

### 9.1 Product Metrics
- **User Adoption**: Monthly active recruiters, interview volume
- **Technical Performance**: System uptime, video quality scores, response times
- **AI Accuracy**: Scoring consistency, false positive/negative rates
- **User Satisfaction**: NPS scores, support ticket volume, feature usage

### 9.2 Business Metrics
- **Revenue Growth**: MRR growth, customer LTV, churn rates
- **Market Penetration**: Customer acquisition, market share in Vietnamese HR tech
- **Operational Efficiency**: Customer acquisition cost, time to value
- **Customer Success**: Customer retention, expansion revenue, referral rates

### 9.3 Customer Impact Metrics
- **Time Savings**: Reduction in screening time per candidate
- **Quality Improvement**: Hire success rates, candidate satisfaction
- **Cost Reduction**: Cost per hire reduction, process efficiency gains
- **Scalability**: Volume of candidates processed, peak capacity handling

---

## 10. Appendices

### Appendix A: Technical Analysis Summary
- **Source Video**: 7-minute demo analysis (7232043183395.mp4)
- **Transcription**: Complete Vietnamese conversation with Soniox API
- **Visual Analysis**: UI screenshots showing candidate management and scoring interfaces
- **Technology Stack**: Web-based platform with sophisticated AI scoring

### Appendix B: Competitive Landscape
- Primary competitors: International HR tech platforms (HireVue, Pymetrics)
- Competitive advantage: Vietnamese language specialization, local market focus
- Market opportunity: Underserved Vietnamese HR technology market

### Appendix C: Compliance Requirements
- Vietnamese labor law compliance for hiring practices
- Data privacy regulations (Vietnam and international)
- AI fairness and non-discrimination requirements
- Video recording and storage regulations

---

**Document Version**: 1.0
**Created**: November 21, 2024
**Based on**: Video demo analysis (AI transcription + visual interface examination)
**Target Audience**: Product Development Team, Stakeholders, Engineering Team

---

*This PRD serves as the foundation for developing a comprehensive AI interview system tailored for the Vietnamese market, with particular focus on VietinBank's requirements and similar enterprise customers seeking automated candidate screening solutions.*