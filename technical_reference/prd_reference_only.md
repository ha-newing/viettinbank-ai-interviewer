# Strategy Development App - PRD

## Overview
A collaborative strategy development app that guides teams through a structured 10-step strategic planning process based on the Alibaba Business School methodology.

## Authentication & Company Setup

### Login
- **Magic link authentication** via email
- **No personal emails** (gmail, outlook, yahoo, etc.) - business domains only
- Magic link expires in **7 days**
- Session lasts **30 days** before re-auth
- On first login with new domain → create company
- On login with existing domain → join that company automatically

### Company
- Company is identified by email domain (subdomains like `sales.acme.com` → `acme.com`)
- **No invitation system** for now - anyone with matching domain auto-joins
- **First user becomes admin** - can delete strategies, manage users later
- Company name = domain (e.g., "acme.com")
- On company creation, use **Claude web search** to research the company - proceed with empty context if search fails

## Core Features

### Strategy List Page
- Landing page after login: `/strategies`
- List all strategies belonging to the company
- Create new strategy button
- Each strategy shows: title, created_by, last_modified, completion (x/10 steps)
- **PDF export** for entire strategy (latest version of each component)
  - Option to include evaluation feedback
  - **Button grayed out** until all 10 components have content
  - Rendered markdown (no custom branding)

### Strategy Creation
- **Title required** on creation
- Strategies with 0 components shown in list (incomplete state visible)

### Strategy Components
Based on `strategy_development_guide.json` - **10 steps in fixed order**:

1. Mission, Vision & Values (MVV)
2. External Analysis (May Do)
3. Internal Analysis (Can Do)
4. Strategic Choice (Should Do)
5. Strategy Statement (Who, What, How)
6. Business Plan (One-Year)
7. Must-Win Battles (MWBs)
8. Organization Strategy
9. People Strategy
10. Execution & Review

Each component has from the template:
- **Title** (step name)
- **Description** (context, what it is, why it matters)
- **Instructions** (how to develop, what good looks like, what to keep in mind)
- **Evaluation criteria** (quality questions, success indicators)

### Strategy Editor

#### Layout
- **Full-screen editor** - maximize writing space
- **One component at a time** - wizard/stepper navigation
- **Collapsible sidebar** with description + instructions for guidance
- Step indicator showing progress through 10 steps
- **No enforcement of sequential completion** - can jump to any step
- Steps without content shown as incomplete in indicator

#### Editor
- **Lightweight WYSIWYG markdown editor** with live preview
- **Manual save button** + auto-save on navigation (step change, leave page)
- Always shows latest version by default

#### Version History
- **Dropdown selector** showing versions: `ha@newing.vn - 3 minutes ago`
- Each save creates a new version (concurrent edits both preserved)
- Restore = creates new version (preserves full history)
- No version limit - keep all
- Shows created_by and created_at for each version

### AI Evaluation

#### Per-Component Evaluation
- "Evaluate" button on each component
- Uses **OpenAI gpt-4o-mini, temperature 1**
- AI context includes:
  - Company research (from domain lookup at signup)
  - The evaluation criteria from template (quality_questions, success_indicators)
  - User's written content for that component
  - Previous components' content for context

#### Feedback Format
- Specific feedback to improve
- Questions to think about
- Challenge assumptions in the written content

#### Evaluation History
- Save all past evaluations per component
- View in **collapsible side panel** (can hide and continue working)
- **Minimum 100 characters** to request evaluation
- Allow parallel evaluations (no rate limiting for now)
- **Toast notification** while evaluating in background
- Show error with retry on API failure

### Collaboration

#### Multi-user Editing
- Multiple team members can work on same strategy
- Version history handles concurrent edits
- See who edited what

#### Inline Comments (if good library exists)
- **Google Docs-style highlighting and commenting** on markdown preview
- Thread discussions on specific text selections
- Resolve/unresolve comments
- *Note: Implement only if suitable library found (e.g., Tiptap with comments extension)*

## Pages Structure

```
/login                    - Magic link request
/auth/callback           - Magic link verification
/strategies              - List all company strategies
/strategies/new          - Create new strategy
/strategies/[id]         - View/edit strategy (component stepper)
/strategies/[id]/export  - PDF export
```

## Data Model (High-level)

### Company
- id, domain, name, ai_context (from web search), created_at

### User
- id, email, company_id, created_at

### Strategy
- id, company_id, title, created_by, created_at, updated_at, deleted_at (soft delete)
- Only creator or admin can delete

### StrategyVersion
- id, strategy_id, component_index (1-10), content (markdown), created_by, created_at

### Evaluation
- id, strategy_version_id, feedback (AI response), created_at

### Comment (optional)
- id, strategy_version_id, user_id, text_selection, comment_text, resolved, created_at

## Non-Goals (for now)
- No status workflow (draft/approved/etc.)
- No custom evaluation criteria
- No invitation system
- No personal email accounts
- No public sharing/links
- No real-time collaboration indicators (who's online)
- No new version notifications
- No full-text search (title search only)
- No strategy duplication

## Technical Details
- **Markdown sanitization** - strip dangerous HTML/scripts
- **No max content length** per component
- **Network errors** - show error message (no offline queue)
- Concurrent edits create separate versions (acceptable to have older content become latest - history preserved)

## Technical Notes
- Stack: Next.js 15, SQLite + Drizzle, Tailwind + shadcn/ui
- See CLAUDE.md for state management approach
- Mobile-first, works on dark/light themes

## UI/UX Specifications

### Design System
- **Theme**: shadcn/ui with custom brand colors (TBD)
- **Typography**: System fonts, clear hierarchy
- **Spacing**: Consistent 4px grid
- **Dark/Light**: Full support, respects system preference

### Packages
- **Markdown Editor**: Tiptap (extensible, comment support possible)
- **PDF Export**: @react-pdf/renderer
- **Icons**: Lucide React (shadcn default)

### Page Layouts

#### Login Page (`/login`)
```
┌─────────────────────────────────┐
│         [Logo/Brand]            │
│                                 │
│   Enter your work email         │
│   ┌───────────────────────┐     │
│   │ email@company.com     │     │
│   └───────────────────────┘     │
│   [Send Magic Link]             │
│                                 │
│   ⚠️ Personal emails not        │
│   accepted (gmail, etc.)        │
└─────────────────────────────────┘
```

#### Strategy List Page (`/strategies`)
```
┌──────────────────────────────────────────────┐
│ Header: Logo | Company Domain | User Menu ▾  │
├──────────────────────────────────────────────┤
│ "Strategies"                [+ New Strategy] │
│ ┌──────────────────────────────────────────┐ │
│ │ 🔍 Search by title...                    │ │
│ └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ 2025 Growth Strategy                     │ │
│ │ ha@newing.vn · 3 days ago                │ │
│ │ ████████░░ 8/10                          │ │
│ │                    [👁] [📄▾] [🗑]        │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Q1 Planning                              │ │
│ │ john@company.com · 1 week ago            │ │
│ │ ██░░░░░░░░ 2/10                          │ │
│ │                    [👁] [📄░] [🗑]        │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ [Empty state: "No strategies yet. Create     │
│  your first strategy to get started."]       │
└──────────────────────────────────────────────┘

Icons: 👁 View, 📄 Export (grayed if incomplete), 🗑 Delete
```

#### Strategy Editor - Desktop (`/strategies/[id]/[step_id]`)
```
┌────────────────────────────────────────────────────────────────┐
│ [← Back to list]  Strategy Title Here    [Save] [Version ▾]   │
├────────────────────────────────────────────────────────────────┤
│ Step Navigation (horizontal, scrollable)                       │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ...   │
│ │1 ✓│ │2 ✓│ │3 •│ │4  │ │5  │ │6  │ │7  │ │8  │        │
│ │MVV │ │Ext │ │Int │ │Cho │ │Sta │ │Bus │ │MWB │ │Org │        │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘        │
├─────────────────────────────────┬──────────────────────────────┤
│                                 │ [Guide] [Eval]    [Collapse→]│
│   MARKDOWN EDITOR               ├──────────────────────────────┤
│   ┌─────────────────────────┐   │ ▼ What is this step?         │
│   │ Toolbar: B I U | H1 H2  │   │ ────────────────────────     │
│   │ | • | 1. | Link | ...   │   │ Assessment of your org's     │
│   ├─────────────────────────┤   │ core competencies using      │
│   │                         │   │ VRIN framework...            │
│   │ [User's content here]   │   │                              │
│   │                         │   │ Why it matters:              │
│   │ Full height, WYSIWYG    │   │ Many strategies fail...      │
│   │                         │   ├──────────────────────────────┤
│   │                         │   │ ▶ How to develop             │
│   │                         │   ├──────────────────────────────┤
│   │                         │   │ ▶ What good looks like       │
│   │                         │   ├──────────────────────────────┤
│   │                         │   │ ▶ Keep in mind               │
│   │                         │   ├──────────────────────────────┤
│   │                         │   │ ▶ Quality questions          │
│   │                         │   │                              │
│   │                         │   │ [🤖 Evaluate]                │
│   └─────────────────────────┘   └──────────────────────────────┘
└────────────────────────────────────────────────────────────────┘

Step states: ✓ completed (has content), • current, empty = no content
Guide panel: ~350px width, collapsible to icon strip
Tabs: [Guide] shows template, [Eval] shows evaluation history
```

#### Strategy Editor - Mobile (`/strategies/[id]/[step_id]`)
```
┌─────────────────────────┐
│ [←]  Title       [Save] │
├─────────────────────────┤
│ Step 3/10: Internal ▾   │  ← Dropdown selector
├─────────────────────────┤
│ [Editor] [Guide] [Eval] │  ← Tab bar
├─────────────────────────┤
│                         │
│   Selected tab shows    │
│   full screen           │
│                         │
│   Editor = WYSIWYG      │
│   Guide = template info │
│   Eval = AI feedback    │
│                         │
└─────────────────────────┘
```

#### Evaluation Panel (when Eval tab/panel active)
```
┌──────────────────────────────────┐
│ Evaluation History        [Hide] │
│ ┌──────────────────────────────┐ │
│ │ ▾ Latest · 2 hours ago       │ │  ← Dropdown to select
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ 💡 Feedback                      │
│ Your mission statement is clear  │
│ but could be more specific...    │
│                                  │
│ ❓ Questions to Consider         │
│ • Have you tested this with...   │
│ • What would competitors say...  │
│                                  │
│ ⚡ Assumptions Challenged        │
│ • You assume market will grow... │
│ • The timeline seems optimistic  │
└──────────────────────────────────┘
```

#### Version Dropdown
```
┌─────────────────────────────────┐
│ Version ▾                       │
├─────────────────────────────────┤
│ ● ha@newing.vn · 2 min ago      │  ← Current
│   ha@newing.vn · 1 hour ago     │
│   john@co.com · 3 hours ago     │
│   ha@newing.vn · yesterday      │
│   ...                           │
│ ─────────────────────────────── │
│ [Restore Selected]              │
└─────────────────────────────────┘
```

#### PDF Export Modal
```
┌─────────────────────────────────┐
│ Export to PDF              [X]  │
├─────────────────────────────────┤
│ Include:                        │
│ ☑ All 10 components             │
│ ☐ Evaluation feedback           │
│                                 │
│ [Cancel]         [Download PDF] │
└─────────────────────────────────┘
```

#### Create Strategy Modal
```
┌─────────────────────────────────┐
│ New Strategy               [X]  │
├─────────────────────────────────┤
│ Title *                         │
│ ┌─────────────────────────────┐ │
│ │ 2025 Growth Strategy        │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Cancel]              [Create]  │
└─────────────────────────────────┘
```

### Components Structure
```
/components
  /ui/                    # shadcn/ui primitives
  /layout/
    Header.tsx            # App header with nav
    PageContainer.tsx     # Consistent padding/width
  /auth/
    LoginForm.tsx
    MagicLinkSent.tsx
  /strategy/
    StrategyCard.tsx      # List item card
    StrategyList.tsx      # Grid/list of cards
    CreateStrategyModal.tsx
    ExportPdfModal.tsx
    DeleteConfirmModal.tsx
  /editor/
    StrategyEditor.tsx    # Main editor page component
    StepStepper.tsx       # Desktop horizontal steps
    StepDropdown.tsx      # Mobile step selector
    MarkdownEditor.tsx    # Tiptap wrapper
    EditorToolbar.tsx
    VersionDropdown.tsx
    SaveButton.tsx
  /guide/
    GuidePanel.tsx        # Container with tabs
    GuideContent.tsx      # Template info display
    GuideSection.tsx      # Collapsible accordion item
  /evaluation/
    EvaluateButton.tsx
    EvaluationContent.tsx # Displays AI feedback
    EvaluationHistory.tsx # Version selector for evals
```

### Interactions & States

#### Loading States
- Strategy list: Skeleton cards
- Editor: Skeleton for content area
- Evaluation: Spinner + "Evaluating..." toast
- Save: Button shows spinner, disabled

#### Empty States
- No strategies: Illustration + "Create your first strategy"
- No content in step: Placeholder text in editor
- No evaluations: "Click Evaluate to get AI feedback"

#### Error States
- Network error on save: Toast with retry
- Evaluation failed: Toast with retry option
- Invalid email: Inline form error

#### Toasts
- Save success: "Saved" (auto-dismiss 2s)
- Evaluation started: "Evaluating..." (persistent until done)
- Evaluation complete: "Evaluation ready" (auto-dismiss 3s)
- Error: Red toast with message + action

### Responsive Breakpoints
- Mobile: < 768px (single column, tabs)
- Desktop: >= 768px (side panels)

### Keyboard Shortcuts (nice-to-have)
- `Cmd/Ctrl + S`: Save
- `Cmd/Ctrl + E`: Evaluate
- `Cmd/Ctrl + [/]`: Previous/next step


# AI feature
add 2 buttons to this header of the step, to the right\
One is to Speech-to-text, which when click and active, use soniox (key in .env), guide in @soniox.md but need search to update to use stt v3 and get temporary key, language hint en vi, speaker 
diarization on, end pointing off; when active append the live transcription to the end of current text (note the management of final and non final.\
Another is AI Write, which takes the raw current text, along with the instructions in the json to rewrite, instruct OpenAI to NOT invent anything but just rewrite what's in there in the expected 
format, can leave questions for areas that are not clear, do not make up\
any question? 
peech-to-Text & AI Write Buttons

     1. API Routes

     - POST /api/soniox/temp-key - Get temporary Soniox API key
     - POST /api/ai/rewrite - AI rewrite with OpenAI gpt-4o-mini

     2. Soniox STT Implementation

     - Use @soniox/speech-to-text-web SDK (browser WebSocket)
     - Model: stt-rt-v3
     - Config: language_hints: ["en", "vi"], speaker diarization on, endpoint detection off
     - Live streaming: append final tokens to editor, show non-final as preview
     - Backend creates temp key, frontend connects directly to Soniox

     3. AI Write Implementation

     - Takes current editor content + step instructions from JSON
     - Prompt: Rewrite in expected format, NO invention, leave questions for unclear areas
     - Insert rewritten content ABOVE current content (separated by divider)

     4. UI Changes

     - Add two icon buttons to step header (right side)
     - Mic button: toggles STT (red when active)
     - Wand/sparkles button: AI Write (loading state while processing)

     5. Package

     - Install @soniox/speech-to-text-web

     6. Environment

     - SONIOX_API_KEY in .env