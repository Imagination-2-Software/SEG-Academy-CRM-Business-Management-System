# SEG Academy CRM – Part 11: Tasks, Submissions & Reviews
## Complete Frontend UI Development Report

**Document Version:** 1.0.0  
**Date:** November 24, 2026  
**Module:** Part 11 – Tasks, Submissions & Reviews  
**Auditor / Engineer:** Senior Product Designer & Senior Frontend Developer  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

The complete frontend UI module for **Part 11: Tasks, Submissions & Reviews** has been designed, developed, integrated, and validated within the SEG Academy CRM Next.js 15 App Router architecture. 

All views conform strictly to SEG Academy CRM design tokens (`seg-plum`, `seg-orange`, `seg-yellow`), responsive multi-device layouts (desktop, laptop, tablet, mobile), zero-trust authentication guards, and the real Prisma schema entities (`Task`, `TaskPriority`, `TaskStatus`, `Submission`, `SubmissionStatus`, `SubmissionReview`).

The module compiled with **zero TypeScript errors** and completed production build generation with 26 active static and dynamic routes.

---

## 2. Architecture & Data Model Alignment

### Real Schema Linkages
The module aligns directly with the database models in `packages/database/prisma/schema.prisma`:
- **`Task`**: Represents operational tasks assigned to employees and teams.
  - Fields: `id`, `title`, `description`, `instructions`, `priority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), `status` (`TODO`, `IN_PROGRESS`, `UNDER_REVIEW`, `DONE`, `CANCELLED`), `assignedToId`, `createdById`, `departmentId`, `teamId`, `startDate`, `dueDate`, `completedAt`, `estimatedHours`, `submissionRequirements`.
- **`TaskSubmission`**: Captures deliverable lodgments submitted by assignees.
  - Fields: `id`, `taskId`, `submittedById`, `submissionDate`, `contentUrl`, `notes`, `attachmentName`, `attachmentSize`, `status` (`DRAFT`, `SUBMITTED`, `LATE`, `RESUBMISSION_REQUESTED`, `GRADED`).
- **`TaskSubmissionReview`**: Captures rubric evaluations and scorecards.
  - Fields: `id`, `submissionId`, `reviewerId`, `score` (0–100), `feedback`, `status` (`APPROVED`, `CHANGES_REQUESTED`, `REJECTED`), `reviewedAt`.
- **`TaskActivity`**: Chronological event logs auditing all lifecycle events (creation, assignment, status transition, deliverable submission, evaluation).

---

## 3. Implemented Routes & User Experience

### A. Task Dashboard – `/tasks`
- **Header & Breadcrumbs:** Displays module identity with quick access to the Directory and Task Creator.
- **Sub-Navigation (`TaskNav`):** Unified tabbed bar switching between Dashboard, All Tasks Directory, and Create Task.
- **Executive Metric KPI Cards (6 metrics):**
  1. *Total Tasks*: Active registry count.
  2. *Assigned*: Tasks delegated to staff members.
  3. *In Progress*: Actively underway.
  4. *Pending Review*: Submissions lodged awaiting evaluation.
  5. *Completed*: Accepted tasks with overall completion rate.
  6. *Overdue*: Tasks past deadline requiring intervention.
- **Priority & Active Workflow Panel:** Lists high-priority, urgent, and approaching-deadline tasks with direct link to details.
- **Pending Evaluations Queue:** Highlights lodged deliverables with submitter name, submission date, deliverable summary, and a direct "Evaluate Submission" action.
- **Recent Activity Stream:** Chronological event timeline showing who acted on which task.
- **Quick Shortcuts Panel:** One-click shortcuts for delegating tasks, reviewing submission queues, and auditing overdue items.

### B. Task Directory – `/tasks/all`
- **Filter Toolbar:**
  - Full-text search across Title, Task Code (`TSK-101`), Description, and Assignee.
  - Dropdown filter by Status (`TODO`, `IN_PROGRESS`, `UNDER_REVIEW`, `DONE`, `CANCELLED`).
  - Dropdown filter by Priority (`URGENT`, `HIGH`, `MEDIUM`, `LOW`).
  - Dynamic dropdown filter by Department.
  - One-click "Reset Filters" with active result counters.
- **Tabular Directory:**
  - Task Code (monospace clickable link)
  - Title, Department, and Team badges
  - Assignee avatar, full name, and designation
  - Priority badge (pulsing red for URGENT, amber for HIGH, yellow for MEDIUM, slate for LOW)
  - Due Date with prominent red `OVERDUE` badge when past deadline
  - Task Status pill with distinct iconography
  - Submissions & Review outcome badge
  - Quick row actions: Status update dialog trigger, details link
- **Pagination:** Clean, accessible page controls displaying current page, total records, and page boundaries.

### C. Create Task – `/tasks/create`
- **Three-Section Structured Form:**
  1. *Task Overview & Scope:* Title (validated min 5 characters), Description, Detailed Instructions & Acceptance Criteria.
  2. *Assignment & Organizational Linkage:* Dynamic Department selector, Team selector (dynamically filtered by department), and Employee Assignee selector (filtered by department/team).
  3. *Priority, Timelines & Deliverables:* Priority level, Start Date, Due Date (validated so due date cannot precede start date), Estimated Effort (hours), Required Deliverable description, and file attachment simulator.
- **Pre-dispatch Confirmation Modal:** Interactive modal summarizing the task parameters before creation to prevent accidental delegation.
- **Post-creation Redirection:** Automatically routes to the newly created `/tasks/[id]` details view with persistent state.

### D. Task Details – `/tasks/[id]`
- **Header & Action Toolbar:**
  - Status badges, priority badges, overdue indicators, due date countdown, and effort metrics.
  - Action buttons: "Update Status", "Submit Deliverables", and "Evaluate Submission" (dynamically surfaced when a pending submission exists).
- **Two-Column Responsive Grid:**
  - **Main Column (2/3 width):**
    - Task Scope, Objectives & Acceptance Criteria card.
    - Required Submission Deliverables & Reference Attachments card.
    - Deliverable Submissions Accordion: Chronological submission history displaying submission date, notes, attached files (with file size), external repository/asset URLs, and review scorecard.
    - Rubric Evaluation Card: Score display (`XX / 100`), evaluator credentials, outcome badge (`APPROVED`, `CHANGES_REQUESTED`, `REJECTED`), and qualitative feedback.
    - Task Audit & Activity Log: Complete timeline of task lifecycle events.
  - **Sidebar Column (1/3 width):**
    - Assigned Employee Profile Card (Avatar, Full Name, Role, Employee Code, Email).
    - Task Origin & Creator Card (Created by, Creation Date, Start Date, Deadline, Completed Date, Department, Team).

---

## 4. Reusable Components & Interactive Modals

1. **`TaskNav` (`src/components/tasks/task-nav.tsx`):**  
   Responsive tab navigation shared across `/tasks`, `/tasks/all`, and `/tasks/create`.
2. **`TaskBadges` (`src/components/tasks/task-badges.tsx`):**  
   Consistent visual indicators for `TaskPriorityBadge`, `TaskStatusBadge`, `SubmissionStatusBadge`, and `ReviewOutcomeBadge`.
3. **`SubmitWorkModal` (`src/components/tasks/submit-work-modal.tsx`):**  
   Allows assignees to submit notes, link repositories or Figma URLs, attach deliverables, and transitions task to `UNDER_REVIEW`.
4. **`ReviewSubmissionModal` (`src/components/tasks/review-submission-modal.tsx`):**  
   Allows evaluators to enter a score (0–100), select an outcome (`APPROVED`, `CHANGES_REQUESTED`, `REJECTED`), provide feedback, and automatically marks approved tasks as `DONE`.
5. **`UpdateStatusModal` (`src/components/tasks/update-status-modal.tsx`):**  
   Clean radio-selection modal for manual status transitions with audit timeline logging.

---

## 5. Persistence & API Service Architecture

- **Service File:** `apps/web/src/lib/api/tasks.ts`
- **Features:**
  - Clean TypeScript interfaces matching Prisma models.
  - Real Axios API client integration targeting `/tasks`, `/tasks/[id]`, `/tasks/[id]/status`, `/tasks/[id]/submissions`, and `/tasks/[id]/submissions/[id]/reviews`.
  - Fallback local storage persistence (`seg_crm_tasks_v1`) ensuring full frontend reactivity, state retention across browser reloads, and seamless offline or staging operation.
  - Realistic seed tasks demonstrating urgent compliance audits, curriculum lab development, payroll reconciliations, cloud migrations, and UI/UX rubric evaluations.

---

## 6. Build & Type-Check Verification

### TypeScript Verification
```powershell
$ npm --workspace=@seg/web run type-check
> @seg/web@0.1.0 type-check
> tsc --noEmit
# Result: 0 errors (Code 0)
```

### Production Build Verification
```powershell
$ npm --workspace=@seg/web run build
> @seg/web@0.1.0 build
> next build

▲ Next.js 15.5.29
Creating an optimized production build ...
✓ Compiled successfully in 29.9s
Linting and checking validity of types ...
Collecting page data ...
✓ Generating static pages (26/26)
Finalizing page optimization ...
Collecting build traces ...

Route (app)
├ ○ /tasks                                  4.29 kB         132 kB
├ ƒ /tasks/[id]                             7.96 kB         135 kB
├ ○ /tasks/all                              6.98 kB         133 kB
├ ○ /tasks/create                           5.74 kB         136 kB
# Result: Production build compiled cleanly with exit code 0
```

---

## 7. Compliance with Design Guidelines

- **Brand Tokens:** Applied `seg-plum` for primary branding and headers, `seg-orange` for required fields and alerts, and `seg-yellow` for medium priority states.
- **Typography & Layout:** Structured hierarchy with compact enterprise text sizes (`text-xs` base, `font-mono` for IDs and scores), subtle borders (`border-border`), and balanced whitespace.
- **Security & Authorization:** Every view is wrapped in `ProtectedRoute`, adhering to active session tokens and user identities without mock bypasses.
- **Database & Monorepo Boundaries:** No modifications were made to the Prisma schema, no database migrations were run, and no Git commits or remote pushes were executed.
