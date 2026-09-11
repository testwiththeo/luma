# Luma Product Requirements Document

**Product:** Luma  
**Tagline:** _See your work clearly._  
**Status:** Draft for MVP implementation  
**Version:** 1.0  
**Last updated:** 22 September 2026  
**Audience:** Product, design, engineering, QA, maintainers, and open-source contributors

---

## 1. Executive summary

Luma is an open-source, self-hosted personal Kanban board designed to help software quality assurance professionals and individual software engineers understand what they are doing, focus on the right work, expose blockers, and communicate progress.

Testing and engineering work is often fragmented across issue trackers, chat, notes, test tools, and memory. Generic task boards show status but frequently fail to preserve enough context for interrupted QA work, enforce healthy work-in-progress limits, or create useful daily updates. Luma provides a fast personal workflow with QA-aware metadata while remaining useful for other individual contributors.

The MVP is a single-user modular web application. It runs through Docker, stores data in SQLite, requires no external cloud service, and sends no telemetry by default.

---

## 2. Product vision

> Give individuals a calm, trustworthy place to decide what matters now, finish work before starting more, retain context through interruptions, and make progress visible.

Luma should become a personal execution layer alongside organizational systems such as Jira, GitHub, or test-management software. It is not intended to replace those systems in the MVP.

### 2.1 Name philosophy

**Luma** suggests light and clarity. The product “illuminates” priority, active work, blockers, and completed work through a simple visual flow.

---

## 3. Problem statement

SQA professionals and software engineers frequently handle planned work, interruptions, investigation, defects, test execution, automation, reviews, and dependencies at the same time. Work is distributed across multiple systems and often represented only as broad tickets. As a result, users:

- Cannot quickly answer what they should work on next.
- Start too much work and finish too little.
- Lose context after meetings, support requests, or priority changes.
- Fail to record why a task is blocked or who can unblock it.
- Cannot easily distinguish progress from activity.
- Spend time reconstructing daily or stand-up updates.
- Struggle to show QA work that is invisible inside feature tickets.
- Maintain personal task systems that become more work than the work itself.

### 3.1 QA-specific pain points

- Test design, execution, regression, exploratory testing, defect investigation, verification, and automation compete for attention.
- Failed tests may be caused by product defects, test defects, test data, environment instability, or flaky tests.
- Testing depends on builds, environments, permissions, requirements, and fixes owned by other people.
- Evidence and reproduction context become detached from the task.
- Repeated regression work is difficult to summarize as meaningful progress.
- Users cannot easily see which testing work remains before they feel confident about a release.

### 3.2 Product opportunity

Luma can provide more value than a generic board by combining:

1. Fast capture with low maintenance overhead.
2. Explicit limits on active work.
3. A small “Today Focus” commitment.
4. Structured blockers and their duration.
5. Optional QA context on relevant tasks.
6. Automatic daily progress summaries.
7. Private, portable, self-hosted data.

---

## 4. Goals and non-goals

### 4.1 MVP goals

- Let a user capture a task in less than five seconds.
- Let a user identify current work, next work, and blockers in less than ten seconds.
- Provide a clear personal Kanban workflow with persistent ordering.
- Encourage finishing through configurable work-in-progress limits.
- Limit Today Focus to no more than three tasks per board.
- Preserve enough context to resume interrupted QA or engineering work.
- Record blockers, dependencies, and resolution history.
- Generate a useful daily progress summary without manual reconstruction.
- Support keyboard, pointer, and touch interaction for core workflows.
- Be simple to run and maintain through Docker Compose.
- Give users complete data export, import, backup, and deletion control.

### 4.2 Non-goals for MVP

- Team project management or workload allocation.
- Multi-user collaboration, comments, mentions, or notifications.
- Organizational permissions, roles, or workspaces.
- Sprint planning, estimation, velocity, or capacity planning.
- Replacement for Jira, Linear, GitHub Issues, or test-management systems.
- Third-party synchronization or integrations.
- Native mobile or desktop applications.
- True offline-first synchronization.
- AI-generated tasks, priorities, or summaries.
- Real-time multiplayer updates.
- Advanced analytics or customizable dashboards.
- Public cloud hosting operated by the project.
- Application-level authentication in the first self-hosted release.

---

## 5. Product principles

1. **Clarity over configuration** — the current state and next action should be understandable at a glance.
2. **Finish before starting** — the product should encourage small WIP and completion.
3. **Fast to maintain** — tracking work must not become a second job.
4. **Visible progress** — completed work and incremental checklist progress must be easy to see.
5. **Context survives interruption** — a task should contain enough information to resume it.
6. **QA-aware, not QA-exclusive** — QA support is optional and does not complicate general tasks.
7. **Server-authoritative rules** — the client may preview outcomes, but the API protects invariants.
8. **Accessible by default** — primary workflows must not depend on drag-and-drop or color alone.
9. **Private and portable** — no required external service and no telemetry by default.
10. **Simple before scalable** — use a modular monolith and avoid premature infrastructure.

---

## 6. Target users and personas

### 6.1 Primary persona: Maya, SQA individual contributor

**Context:** Maya handles exploratory testing, regression, bug verification, test automation, and release support. Her organization uses Jira, but Jira tickets are too broad to manage her personal execution.

**Needs:**

- Break work into actionable personal tasks.
- Know which three tasks matter today.
- Capture environment, build, expected result, actual result, and evidence.
- Record whether she is waiting for a build, access, clarification, or a fix.
- Resume investigation after an interruption.
- Produce a stand-up update in seconds.

**Pain:** Her work is split across Jira, chat, notes, and memory. She frequently carries too many active tasks and spends time reconstructing status.

### 6.2 Secondary persona: Daniel, software engineer

**Context:** Daniel balances feature implementation, code review, debugging, operational requests, and meetings.

**Needs:**

- Capture incoming tasks without abandoning current work.
- Keep active work limited.
- Preserve debugging context.
- See overdue and blocked work.
- Summarize completed, active, and next work.

### 6.3 Tertiary persona: Open-source maintainer

**Context:** A maintainer installs Luma on a personal server and may contribute fixes.

**Needs:**

- One-command installation and documented upgrades.
- Persistent data and reliable backup/restore.
- Understandable TypeScript modules and tests.
- No mandatory external accounts or cloud services.

---

## 7. Jobs to be done

| ID      | Situation                             | Motivation                                      | Expected outcome                                         |
| ------- | ------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| JTBD-01 | When I begin my day                   | I want to see priorities and unfinished work    | I can choose up to three focus tasks confidently         |
| JTBD-02 | When new work arrives                 | I want to capture it without changing context   | The work is safely stored in Inbox within seconds        |
| JTBD-03 | When I start a task                   | I want to move it into active work              | Everyone—including future me—can see what is in progress |
| JTBD-04 | When I have too much active work      | I want a visible WIP warning                    | I reconsider starting another task                       |
| JTBD-05 | When work cannot continue             | I want to record the reason and dependency      | I know how and when to follow up                         |
| JTBD-06 | When testing or investigating         | I want relevant technical context in one place  | I can resume without rebuilding context                  |
| JTBD-07 | When I complete part of a larger task | I want to mark checklist progress               | Progress is visible before the whole task is done        |
| JTBD-08 | When returning after an interruption  | I want the latest notes, checklist, and history | I can continue quickly                                   |
| JTBD-09 | When preparing a daily update         | I want an automatic summary                     | I can copy an accurate Markdown report                   |
| JTBD-10 | When self-hosting or leaving Luma     | I want control of my data                       | I can export, import, back up, or delete it              |

---

## 8. Scope and release priorities

Requirements use MoSCoW priority:

- **Must:** required for MVP release.
- **Should:** high value; include if it does not threaten MVP quality.
- **Could:** post-MVP candidate.
- **Won’t:** explicitly excluded from MVP.

### 8.1 MVP feature map

| Capability                            | Priority         |
| ------------------------------------- | ---------------- |
| Board and column management           | Must             |
| Task CRUD, archive, and restore       | Must             |
| Card movement and ordering            | Must             |
| Priority, due date, labels, task type | Must             |
| Today Focus                           | Must             |
| WIP limits and overflow confirmation  | Must             |
| Blocker management and duration       | Must             |
| Checklist progress                    | Must             |
| QA metadata and evidence URLs         | Must             |
| Search and filters                    | Must             |
| Daily Markdown summary                | Must             |
| Activity history                      | Must             |
| JSON export and import                | Must             |
| Docker self-hosting and persistence   | Must             |
| Local file attachments                | Could (post-MVP) |
| Sample board/onboarding hints         | Should           |
| Saved filters                         | Could            |
| External integrations                 | Won’t            |
| Authentication and collaboration      | Won’t            |

---

## 9. Domain language and default workflow

### 9.1 Default columns

A new board contains these columns in order:

1. **Inbox** — captured but not yet prioritized.
2. **Ready** — understood and ready to start.
3. **In Progress** — actively being worked on.
4. **Blocked** — unable to continue.
5. **Done** — completed.

Column display names, order, and WIP limits are configurable. An MVP board contains exactly five columns, one for each immutable internal status type: `inbox`, `ready`, `in_progress`, `blocked`, and `done`. Users cannot add or delete columns in the MVP. This constraint keeps completion, blocker, summary, and restore behavior deterministic; custom columns are a post-MVP candidate.

### 9.2 Priority levels

`Low`, `Medium`, `High`, and `Urgent`. The default is `Medium`.

### 9.3 Task types

- General task
- Test design
- Test execution
- Exploratory testing
- Bug investigation
- Bug verification
- Test automation
- Regression
- Documentation

### 9.4 Blocker categories

- Environment
- Test data
- Requirement
- Dependency
- Access or permission
- Waiting for fix
- Waiting for review
- Other

---

## 10. Epics, user stories, and acceptance criteria

### Epic E1 — Onboarding and board management

#### US-001 — Create a board

**As a** user, **I want** to create a board, **so that** I have a dedicated place for my workflow.  
**Priority:** Must

**Acceptance criteria:**

```gherkin
Scenario: Create a valid board
  Given I am on the board list
  When I create a board named "QA Work"
  Then the board is saved
  And it contains Inbox, Ready, In Progress, Blocked, and Done in that order
  And the board opens automatically

Scenario: Reject an empty name
  When I submit a board name containing only whitespace
  Then the board is not created
  And an accessible validation message is displayed
```

#### US-002 — Edit or archive a board

**As a** user, **I want** to edit or archive a board, **so that** my workspace stays relevant without accidental data loss.  
**Priority:** Must

**Acceptance criteria:**

- The user can edit the board name and description.
- Archiving requires confirmation and does not delete contained data.
- Archived boards are hidden from the active list and can be restored.
- A board can be permanently deleted only after it is archived and the user explicitly confirms its name; deletion cascades to all board-owned records.

#### US-003 — Configure columns

**As a** user, **I want** to rename and reorder the five workflow columns and set WIP limits, **so that** the board matches my personal workflow.  
**Priority:** Must

**Acceptance criteria:**

- Display names and order persist after refresh.
- A WIP limit is either unset (unlimited) or a non-negative integer. A limit of `0` closes the column to unconfirmed inbound moves.
- Internal status types remain unchanged when display names or order change.
- Users cannot add or delete columns in the MVP.
- All five internal status types remain present exactly once.

---

### Epic E2 — Task capture and management

#### US-004 — Quick-capture a task

**As a** user, **I want** to create a task with only a title, **so that** I can capture incoming work without losing focus.  
**Priority:** Must

**Acceptance criteria:**

```gherkin
Scenario: Quick-add from the board
  Given a board is open
  When I enter a non-empty title in quick add and submit
  Then a task is created in the selected column
  And the card appears without a full-page reload
  And the input is ready for another task

Scenario: Default quick capture
  Given no target column is selected
  When I create a task
  Then it is added to Inbox
```

- The primary flow requires no field other than title.
- Median task creation should be achievable in under five seconds.
- A documented keyboard shortcut opens or focuses quick capture.

#### US-005 — View and edit task details

**As a** user, **I want** to edit task details, **so that** the card contains the context needed to complete the work.  
**Priority:** Must

A task supports:

- Title (required)
- Description (optional)
- Priority
- Due date (optional)
- Labels
- Task type
- Checklist
- Notes
- QA metadata when relevant
- Created, updated, completed, and archived timestamps

**Acceptance criteria:**

- Saved changes are visible immediately and persist after refresh.
- Whitespace-only titles are rejected.
- Descriptions and notes are rendered safely; executable HTML is never accepted.
- Stale updates return a conflict instead of silently overwriting newer changes.
- The user receives a recovery action after a failed save.
- The user can create a board label with a required unique name and optional color, rename it, and delete it. Deleting a label removes its task associations but never deletes tasks.
- Label identity and text, not color alone, communicate the label.

#### US-006 — Archive and restore a task

**As a** user, **I want** to archive completed or irrelevant tasks, **so that** the active board stays uncluttered while history remains available.  
**Priority:** Must

**Acceptance criteria:**

- Archived tasks leave active columns but remain retrievable.
- Restoring returns a task to its previous column. A task archived while blocked returns to Inbox because its blocker is resolved during archive.
- Archive and restore events appear in activity history.
- Archive is distinct from permanent deletion.

---

### Epic E3 — Flow, movement, and ordering

#### US-007 — Move a task between columns

**As a** user, **I want** to move a task as its state changes, **so that** the board reflects reality.  
**Priority:** Must

**Acceptance criteria:**

```gherkin
Scenario: Successful move
  Given a task is in Ready
  When I move it to In Progress
  Then the card appears in In Progress at the selected position
  And the position persists after refresh
  And a status-change activity is recorded

Scenario: Failed optimistic move
  Given the task is optimistically shown in In Progress
  When the server rejects the move
  Then the task returns to its prior column and position
  And I see an actionable error message
```

- Movement is available by pointer, touch, keyboard, and a non-drag menu/action.
- The server commits the column change, ordering changes, status side effects, and activity in one transaction.
- Moving to Done sets `completedAt`.
- Moving out of Done clears `completedAt`.

#### US-008 — Reorder tasks

**As a** user, **I want** to reorder tasks within a column, **so that** their visible sequence matches my intended execution order.  
**Priority:** Must

**Acceptance criteria:**

- The new order persists after refresh.
- Two cards cannot occupy the same durable position.
- Rebalancing positions does not alter the visible order.
- Reordering works with keyboard controls.

#### US-009 — Enforce work-in-progress awareness

**As a** user, **I want** a warning when a move exceeds a column’s WIP limit, **so that** I consciously decide whether to start more work.  
**Priority:** Must

**Acceptance criteria:**

```gherkin
Scenario: Reach the limit
  Given In Progress has a WIP limit of 3 and contains 2 tasks
  When I move one task into In Progress
  Then the column displays 3/3
  And it shows a non-color-only warning state

Scenario: Exceed the limit
  Given In Progress contains 3 tasks and has a limit of 3
  When I attempt to move another task into it
  Then Luma requests explicit confirmation
  And the task is not moved until I confirm

Scenario: Confirm overflow
  When I confirm the overflow
  Then the move succeeds
  And the column displays 4/3
```

- WIP is a conscious override, not a permanent hard block.
- Archived tasks do not count toward WIP.
- The server, not only the client, validates overflow confirmation.
- The same confirmation rule applies to any operation that increases the number of tasks in a limited column: cross-column move, direct creation, restore, or unblock.
- Same-column reorder and edits that do not change column count never require WIP confirmation.
- The server rechecks the latest count inside the transaction; a stale record version still returns a conflict even when overflow was confirmed.

---

### Epic E4 — Focus and prioritization

#### US-010 — Set Today Focus

**As a** user, **I want** to select up to three focus tasks, **so that** I know what matters today.  
**Priority:** Must

**Acceptance criteria:**

- A board can have zero to three active Today Focus tasks.
- A fourth task cannot be selected unless one is removed or replaced.
- Focus tasks are clearly visible at the top of or adjacent to the board.
- Completing or archiving a focus task automatically clears its focus flag and frees a slot.
- Moving a formerly completed task out of Done does not restore its old focus flag.
- Today Focus is a current commitment list, not a dated historical record; it does not reset automatically at midnight. The user changes it deliberately.
- Focus changes are recorded in activity history.
- The rule is enforced atomically by the server.

#### US-011 — Prioritize and sort tasks

**As a** user, **I want** to assign priority and view tasks in useful orders, **so that** I can make deliberate decisions.  
**Priority:** Must

**Acceptance criteria:**

- The user can assign Low, Medium, High, or Urgent priority.
- The board supports manual order and temporary views by priority, due date, and creation date.
- A temporary sort does not silently overwrite manual order.
- Priority is represented by text or icon as well as color.

#### US-012 — Identify overdue work

**As a** user, **I want** overdue tasks to be visible, **so that** I can reassess or act on them.  
**Priority:** Must

**Acceptance criteria:**

- A non-completed task is overdue when its due date is earlier than the user’s current local date.
- Completed and archived tasks are not presented as active overdue work.
- Overdue state is not communicated through color alone.

---

### Epic E5 — Blocker management

#### US-013 — Block a task

**As a** user, **I want** to record why work is blocked, **so that** I know what must happen before it can continue.  
**Priority:** Must

A blocker supports category, reason, dependency/person or team, follow-up date, start time, resolution time, and resolution note.

**Acceptance criteria:**

```gherkin
Scenario: Block a task
  Given a task is In Progress
  When I move it to Blocked
  Then I am prompted for a required reason and category
  And one active blocker is created
  And blocked duration begins
  And the task is visibly identified as blocked

Scenario: Prevent duplicate active blockers
  Given a task already has an unresolved blocker
  When another block action is requested
  Then Luma rejects the duplicate active blocker
```

- A task has at most one unresolved blocker.
- Blocked duration uses the server-recorded start time.
- Moving directly into Blocked and submitting blocker information is one consistent operation.
- The generic move command rejects transitions into or out of Blocked. The UI uses the block or unblock command for those transitions, including drag-and-drop, so blocker side effects cannot be bypassed.

#### US-014 — Resolve a blocker

**As a** user, **I want** to resolve a blocker and record the outcome, **so that** the dependency history is preserved.  
**Priority:** Must

**Acceptance criteria:**

- Resolution records `resolvedAt` and an optional resolution note.
- The task moves to a selected non-Blocked column, defaulting to In Progress.
- Prior blocker records remain in history.
- Duration stops increasing after resolution.
- Unblocking and movement are committed atomically.

#### US-015 — Follow up on blocked work

**As a** user, **I want** to filter blockers and see follow-up dates and age, **so that** blocked work does not disappear.  
**Priority:** Must

**Acceptance criteria:**

- Active blockers show elapsed duration in a human-readable form.
- Blocked tasks can be filtered by category and follow-up status.
- A follow-up date in the past is identified accessibly.

---

### Epic E6 — QA context and execution progress

#### US-016 — Add QA metadata

**As an** SQA professional, **I want** to attach testing context to a task, **so that** I can execute or resume work accurately.  
**Priority:** Must

Optional QA fields:

- Environment
- Build or version
- Browser
- Operating system
- Device
- Test-data reference
- Related requirement URL
- Related issue URL
- Expected result
- Actual result
- Evidence URLs

**Acceptance criteria:**

- QA fields are optional and progressively disclosed for relevant task types.
- General tasks remain visually simple.
- URLs must use allowed protocols and render safely.
- QA metadata is searchable and included in complete JSON exports.
- Empty optional values are not displayed as noise on the card.

#### US-017 — Manage a checklist

**As a** user, **I want** a checklist inside a task, **so that** incremental progress is visible.  
**Priority:** Must

**Acceptance criteria:**

- Items can be created, edited, reordered, checked, unchecked, and removed.
- The card displays completed and total counts, such as `3/5`.
- Checking every item does not automatically mark the task Done.
- Checklist completion times are recorded.
- Empty checklist items are rejected.

#### US-018 — Attach local evidence

**As an** SQA professional, **I want** to attach evidence to a task, **so that** screenshots or logs remain connected to the work.  
**Priority:** Could (post-MVP)

Local binary uploads are not part of the MVP. MVP users may store evidence as validated URLs. If attachments are implemented later, they must satisfy these acceptance criteria:

- Allowed file types and maximum sizes are configurable and documented.
- The server validates size and type and stores generated file names outside the web root.
- Attachment metadata appears on the task.
- Deleting a task or attachment follows a documented cleanup policy.
- Export and backup behavior includes binary content through a documented archive format.

---

### Epic E7 — Search and filtering

#### US-019 — Search tasks

**As a** user, **I want** to search my work, **so that** I can find context quickly.  
**Priority:** Must

**Acceptance criteria:**

- Search matches title, description, notes, labels, and QA metadata.
- Search is scoped to the active board by default.
- Matching results update without a full-page reload.
- Search input is debounced or otherwise avoids unnecessary requests.
- No-result state offers a clear way to reset the query.

#### US-020 — Filter tasks

**As a** user, **I want** to filter the board, **so that** I can focus on relevant work.  
**Priority:** Must

Filters include priority, task type, label, blocked status/category, due/overdue state, completed status, and Today Focus.

**Acceptance criteria:**

- Multiple filters can be combined.
- Active filters are visible and individually removable.
- All filters can be cleared with one action.
- Filter state is represented in route search parameters and survives refresh/share within the same instance.
- Filtering does not mutate stored board order.

---

### Epic E8 — Daily summary and history

#### US-021 — Generate a daily summary

**As a** user, **I want** an automatic daily summary, **so that** I can report progress without reconstructing my day.  
**Priority:** Must

The summary contains:

- Tasks completed today in the configured effective time zone
- Tasks currently in progress
- Active blocked tasks and reasons
- Current Today Focus tasks
- Currently active overdue tasks
- Up to three “Next” items from Ready, preserving manual order

**Acceptance criteria:**

```gherkin
Scenario: Generate today's summary
  Given tasks were completed today and other tasks are currently active or blocked
  When I open Daily Summary
  Then Completed contains tasks whose completedAt falls on today in the effective time zone
  And all other sections reflect current state at generation time
  And the heading displays today in the effective time zone

Scenario: Copy as Markdown
  When I choose Copy Markdown
  Then valid Markdown is copied to the clipboard
  And I receive accessible success feedback
```

- MVP summaries are generated only for the current local date; historical reconstruction is out of scope because Luma does not store full board snapshots.
- The effective time zone is the browser-resolved IANA time zone unless the user has selected a valid IANA time zone in local settings. The browser zone is shown in the summary UI.
- Sections always appear in this order: Completed, In Progress, Blocked, Focus, Overdue, Next. Empty sections display `- None`.
- Tasks inside a section preserve manual board order, except Completed which is ordered by `completedAt` descending.
- Generating a summary does not send data to an external service.

Example:

```md
## Daily Update — 22 September 2026

### Completed

- Verified login redirect fix

### In Progress

- Automate payment API tests

### Blocked

- Mobile regression — waiting for Android build

### Next

- Explore refund edge cases
```

#### US-022 — Review task activity

**As a** user, **I want** to see important task changes, **so that** I understand how the work evolved.  
**Priority:** Must

Activity records include creation, status movement, priority change, block/unblock, checklist completion, Today Focus change, completion, archive, and restore.

**Acceptance criteria:**

- History is ordered newest first and displayed in task detail.
- Every event has an action, timestamp, and useful metadata.
- Routine text edits do not need field-level audit diffs in the MVP.
- Activity history is included in full export.

---

### Epic E9 — Data portability and recovery

#### US-023 — Export a board

**As a** user, **I want** to export a board, **so that** I own and can back up my data.  
**Priority:** Must

**Acceptance criteria:**

- Export produces UTF-8 JSON with a documented schema version.
- It contains the board, columns, tasks, labels, checklists, blockers, QA metadata, and activity. MVP exports contain no local binary attachments because uploads are out of scope.
- Export does not expose server file paths or secrets.
- The file name includes a safe board name and export date.
- Export is deterministic enough to diagnose differences, apart from generated metadata.

#### US-024 — Import a Luma board

**As a** user, **I want** to import a valid Luma export, **so that** I can restore or move my board.  
**Priority:** Must

**Acceptance criteria:**

```gherkin
Scenario: Valid import
  Given I select a supported Luma export
  When validation succeeds and I confirm import
  Then the complete board is imported in one transaction
  And the existing data remains intact

Scenario: Invalid import
  Given a file has invalid JSON, an unsupported schema version, or invalid references
  When I attempt import
  Then no records are committed
  And I receive a useful validation error without a stack trace
```

- Import size is limited and documented.
- IDs are remapped when needed to avoid collisions.
- The user previews the board name and item counts before committing.
- Import is all-or-nothing.

#### US-025 — Back up and restore a deployment

**As a** self-hosting user, **I want** documented backup and restore procedures, **so that** I can recover from host failure.  
**Priority:** Must

**Acceptance criteria:**

- The documented full-volume backup procedure first stops Luma, then copies the SQLite database and any managed file directory as one consistent snapshot.
- A separate online database-only backup may be documented, but it is not a complete file backup.
- Restore instructions identify the supported application/schema version and require integrity verification before normal use.
- Data persists after normal container restart and application upgrade.

---

### Epic E10 — Self-hosting and operability

#### US-026 — Run Luma with Docker Compose

**As a** self-hosting user, **I want** to start Luma with one documented command, **so that** installation is straightforward.  
**Priority:** Must

**Acceptance criteria:**

- `docker compose up -d` starts a production-ready application after configuration.
- One application container serves the SPA and same-origin `/api/v1` where practical.
- SQLite and attachments use a persistent volume.
- The port and data path are documented and configurable.
- No external database, queue, cache, or cloud account is required.

#### US-027 — Observe application health

**As an** operator, **I want** a health endpoint and useful logs, **so that** I can detect problems.  
**Priority:** Must

**Acceptance criteria:**

- `GET /health` reports whether the process can serve requests and access required storage.
- Logs are structured, do not expose task content by default, and include request IDs for failures.
- The process handles graceful shutdown.
- Failed migrations prevent the application from accepting traffic.

---

## 11. Functional requirements catalogue

| ID     | Requirement                                                                                       | Priority         | Related stories    |
| ------ | ------------------------------------------------------------------------------------------------- | ---------------- | ------------------ |
| FR-001 | Create, edit, archive, restore, and permanently delete archived boards with explicit confirmation | Must             | US-001–003         |
| FR-002 | Create default workflow columns for each new board                                                | Must             | US-001             |
| FR-003 | Rename, reorder, and configure WIP limits for exactly five fixed-status columns                   | Must             | US-003             |
| FR-004 | Create, view, edit, archive, and restore tasks                                                    | Must             | US-004–006         |
| FR-005 | Move and reorder tasks transactionally                                                            | Must             | US-007–008         |
| FR-006 | Set/clear completion timestamp based on Done transitions                                          | Must             | US-007             |
| FR-007 | Warn and require confirmation for WIP overflow                                                    | Must             | US-009             |
| FR-008 | Enforce at most three active Today Focus tasks per board                                          | Must             | US-010             |
| FR-009 | Support priority, due date, board-label CRUD and assignment, task types, and manual order         | Must             | US-005, US-011–012 |
| FR-010 | Create and resolve one active blocker per task                                                    | Must             | US-013–015         |
| FR-011 | Calculate active and resolved blocker duration                                                    | Must             | US-013–015         |
| FR-012 | Store optional QA metadata and evidence URLs                                                      | Must             | US-016             |
| FR-013 | Manage and summarize checklist progress                                                           | Must             | US-017             |
| FR-014 | Store validated local attachments                                                                 | Could (post-MVP) | US-018             |
| FR-015 | Search indexed task content and metadata                                                          | Must             | US-019             |
| FR-016 | Combine visible, removable board filters                                                          | Must             | US-020             |
| FR-017 | Generate and copy date-aware Markdown summaries                                                   | Must             | US-021             |
| FR-018 | Record and display important task activity                                                        | Must             | US-022             |
| FR-019 | Export complete board data with schema version                                                    | Must             | US-023             |
| FR-020 | Validate and transactionally import board data                                                    | Must             | US-024             |
| FR-021 | Provide persistence, backup, and restoration guidance                                             | Must             | US-025–026         |
| FR-022 | Provide health checks, request IDs, and safe logs                                                 | Must             | US-027             |

---

## 12. Business rules and invariants

| ID     | Rule                                                                                                                                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-001 | Board and task titles must contain at least one non-whitespace character.                                                                                                                                      |
| BR-002 | Every MVP board contains exactly one column for each internal status type; columns cannot be added or deleted.                                                                                                 |
| BR-003 | A board may have at most three active Today Focus tasks.                                                                                                                                                       |
| BR-004 | Completing or archiving a task clears its focus flag; focus does not auto-reset or auto-restore.                                                                                                               |
| BR-005 | Any operation that increases a limited column’s task count—move, create, restore, or unblock—requires explicit confirmation when the resulting count exceeds the limit; same-column reorder never requires it. |
| BR-006 | WIP counts all non-archived tasks in the target column, including Done and Blocked; unset is unlimited and zero requires confirmation for every inbound move.                                                  |
| BR-007 | Moving a task to Done sets `completedAt`; moving it out clears `completedAt`.                                                                                                                                  |
| BR-008 | A task may have at most one unresolved blocker.                                                                                                                                                                |
| BR-009 | Entering Blocked requires category and reason and creates an active blocker; leaving Blocked resolves it in the same transaction.                                                                              |
| BR-010 | Task positions are unique within a column and preserve deterministic order.                                                                                                                                    |
| BR-011 | A stale record version must not silently overwrite a newer version.                                                                                                                                            |
| BR-012 | Checklist completion does not automatically complete its parent task.                                                                                                                                          |
| BR-013 | Import must be validated completely before any imported records commit.                                                                                                                                        |
| BR-014 | All timestamps are stored in UTC and rendered in the user’s selected/browser time zone.                                                                                                                        |
| BR-015 | Archived records are excluded from normal active views unless explicitly requested.                                                                                                                            |
| BR-016 | Creating directly in Done sets `completedAt`; creating directly in Blocked requires blocker category and reason.                                                                                               |
| BR-017 | Archiving a blocked task resolves its blocker with a system resolution note; restore returns it to Inbox with no active blocker.                                                                               |
| BR-018 | Moving Blocked directly to Done resolves the blocker and sets `completedAt` atomically.                                                                                                                        |
| BR-019 | Restoring any task whose prior destination is unavailable returns it to Inbox; under the fixed-column MVP this is a defensive rule.                                                                            |
| BR-020 | Every state-changing command revalidates record version and all invariants relevant to that command inside the transaction, including current WIP when target-column count increases.                          |
| BR-021 | Generic task movement rejects transitions into or out of Blocked; only block/unblock commands may perform them and their required side effects.                                                                |
| BR-022 | Label names are unique per board after trimming and case normalization; deleting a label removes associations, not tasks.                                                                                      |

---

## 13. Information architecture and navigation

### 13.1 Primary routes

- `/` — active board list or last-opened board redirect
- `/boards` — active and archived boards
- `/boards/:boardId` — Kanban board
- `/boards/:boardId/summary` — daily summary
- `/boards/:boardId/settings` — board, columns, import/export settings
- Task detail is a route-aware modal or panel so refresh/back navigation behaves predictably.

### 13.2 Board screen regions

1. App/board header
2. Search and filters
3. Today Focus area
4. Horizontally scrollable Kanban columns
5. Quick-capture controls
6. Task detail dialog/panel
7. Accessible live announcements and notifications

### 13.3 Empty states

- No boards: explain value and offer “Create board.”
- Empty Inbox/column: offer quick add without clutter.
- No search results: show active query/filter and reset action.
- Empty summary section: use a consistent empty representation.
- No archived items: avoid dead-end controls.

---

## 14. Data requirements

Primary records are Board, Column, Task, Checklist Item, Label, Task Label, Blocker, QA Metadata, Attachment, and Activity.

### 14.1 Required metadata

All mutable aggregate records include:

- Stable ID (UUIDv7 or ULID)
- Created timestamp
- Updated timestamp
- Numeric version for optimistic concurrency where relevant

### 14.2 Retention and deletion

- Archive is the default reversible removal mechanism.
- Permanent deletion must be deliberate and documented.
- Deleting a board must cascade or safely remove owned records according to database constraints.
- If post-MVP attachments are implemented, orphaned files must not remain indefinitely.
- Activity may be removed with its owning task/board during permanent deletion.

### 14.3 Import/export schema

- Every export includes `schemaVersion` and `exportedAt`.
- Backward-compatible readers may be added for older supported versions.
- Unknown future versions are rejected safely.
- Internal file-system paths, environment variables, and logs are never exported.

---

## 15. Non-functional requirements

### 15.1 Performance

| ID      | Requirement                                                                                                             |
| ------- | ----------------------------------------------------------------------------------------------------------------------- |
| NFR-P01 | Initial application load should complete within 2 seconds on typical local hardware for a board with up to 1,000 tasks. |
| NFR-P02 | Local interaction feedback should appear within 100 ms.                                                                 |
| NFR-P03 | Typical API mutations should complete within 500 ms under normal single-user load.                                      |
| NFR-P04 | Search should return within 300 ms for 10,000 tasks.                                                                    |
| NFR-P05 | History/archive endpoints must support pagination as data grows.                                                        |

Search uses Unicode-normalized, case-insensitive substring matching across active tasks on the current board. Archived tasks are excluded unless the archived view is explicitly active. Results preserve board order and are capped or paginated by the API when necessary. The 300 ms target is measured after warm-up on a documented baseline of 2 CPU cores and 2 GB RAM with 10,000 representative tasks; the implementation may use SQLite FTS if measurement shows it is needed.

### 15.2 Accessibility

- Target WCAG 2.2 AA for primary workflows.
- All primary actions are keyboard operable.
- Drag-and-drop has keyboard and non-drag alternatives.
- Focus order and visible focus indicators are predictable.
- Card movement is announced through an ARIA live region.
- Dialogs trap focus and restore it to the trigger.
- Status, priority, warning, and blocker information never rely only on color.
- Controls have accessible names; errors are programmatically associated with fields.
- Touch targets are appropriately sized.

### 15.3 Security

- Validate every API path, query, header used by the app, and body at runtime with Zod or equivalent.
- Escape or sanitize user-authored rich content and prevent stored/reflected XSS.
- Permit only safe URL protocols.
- Validate attachment size and type; use generated storage names outside the public asset directory.
- Use same-origin deployment and appropriate security headers.
- Do not expose stack traces, SQL, or internal paths in production responses.
- Apply dependency scanning and keep lockfiles committed.
- Because MVP has no authentication, documentation must warn users not to expose Luma directly to the public internet and should describe reverse-proxy access protection.

### 15.4 Reliability and integrity

- Enable SQLite foreign keys, WAL mode, and a bounded busy timeout.
- Apply migrations before accepting traffic; fail startup safely when a migration fails.
- Use transactions for moves, reorders, block/unblock, imports, and multi-record deletion.
- Failed optimistic UI updates restore the last confirmed state.
- Use record versions to reject stale updates from multiple tabs.
- Handle termination signals and close the HTTP server/database gracefully.
- Document backup and restore before the first stable release.

### 15.5 Privacy

- No telemetry or analytics by default.
- No task content is sent to third parties.
- Logs avoid task descriptions, notes, QA evidence, and other content by default.
- Any future telemetry is opt-in and documented field by field.
- Users can permanently delete an archived board after typing or otherwise explicitly confirming its name; the operation cascades to all board-owned records. Task-level permanent deletion is not required for MVP.

### 15.6 Compatibility

- Support the latest two stable major versions of Chrome/Chromium, Firefox, and Safari where practical.
- Provide a responsive experience from tablet widths upward; phones must remain functional, though native mobile optimization is not an MVP objective.
- Production runs on a documented active Node.js LTS release in the container.

### 15.7 Maintainability and contributor experience

- TypeScript strict mode is enabled.
- Domain code has no imports from React, Hono, Drizzle, or SQLite.
- Route handlers contain no SQL or core business rules.
- Schema changes use reviewed Drizzle migrations.
- Public setup, architecture, testing, and contribution instructions are maintained.
- Formatting, linting, type checking, unit tests, integration tests, and E2E smoke tests run in CI.

### 15.8 Observability

- Every request receives or generates a request ID.
- Logs use structured levels and timestamps.
- Expected domain errors are not logged as crashes.
- `/health` distinguishes readiness from a process that is merely running where practical.
- No external observability service is required.

---

## 16. Approved technical constraints

The product must be implemented consistently with `SOFTWARE_ARCHITECTURE.md`:

```text
React + Vite
TanStack Router + TanStack Query
React Hook Form
Hono on Node.js
Hono RPC + Zod
Drizzle ORM + SQLite
dnd-kit
Tailwind CSS + shadcn/ui/Radix UI
Vitest + React Testing Library + Playwright
pnpm workspaces + Docker Compose
```

### 16.1 Architecture rules

- Use a modular monolith with one repository and one deployable application container where practical.
- Serve the SPA and `/api/v1` from the same origin in production.
- Keep presentation, API, application, domain, and infrastructure boundaries explicit.
- Keep database operations out of route handlers.
- Do not add Redux/Zustand unless a measured requirement cannot be met with Router, Query, forms, and local state.
- Do not add Redis, queues, GraphQL, microservices, Kubernetes, SSR, or edge deployment for MVP.
- SQLite is the source of truth; the browser cache is not.

---

## 17. API-level requirements

- Base API path is `/api/v1`; health is `/health`.
- Hono RPC provides internal TypeScript inference.
- Runtime validation is mandatory regardless of inferred types.
- Successful mutations return authoritative current representations or versions needed for cache convergence.
- Errors use stable codes and the following shape:

```json
{
  "error": {
    "code": "WIP_LIMIT_EXCEEDED",
    "message": "The In Progress column has reached its WIP limit.",
    "details": {
      "limit": 3,
      "current": 3
    },
    "requestId": "req_01K..."
  }
}
```

Expected mapping:

- `400` malformed or invalid input
- `404` resource not found
- `409` WIP confirmation/stale-state conflict
- `413` import or attachment too large
- `422` input violates a domain rule
- `500` unexpected server error

OpenAPI publication is deferred until external clients or integrations are in scope.

The API contract must cover every Must workflow, including board archive/restore/delete; fixed-column update/reorder; task archive/restore; movement with expected version and WIP confirmation; Today Focus; checklist; labels; QA metadata; blocker transitions; activity pagination; search/filter parameters; current-day summary with IANA time zone; and JSON import/export. The exact URI design may evolve, but no Must behavior may exist only as untyped client-side logic.

---

## 18. Analytics and success measures

MVP sends no analytics externally. During research or an opt-in local evaluation, success may be measured through user interviews, usability tests, or locally computed metrics.

### 18.1 Product outcomes

| Metric                                    |                     MVP target |
| ----------------------------------------- | -----------------------------: |
| Time from first launch to first task      |               Under 60 seconds |
| Median quick-capture time                 |                Under 5 seconds |
| Time to identify active work and blockers |               Under 10 seconds |
| Weekly users returning on at least 3 days | 60% in a recruited beta cohort |
| Active users using Today Focus            |                            40% |
| Active users generating a summary weekly  |                            30% |
| User-reported mutation failure rate       |                       Under 1% |
| Confirmed data-loss defects               |                              0 |

### 18.2 Open-source health indicators

- Successful documented Docker installations
- Issue response and resolution time
- Number of unique contributors
- Release frequency and upgrade success
- Backup/restore reports
- Accessibility defects in primary workflows

GitHub stars may indicate awareness but are not a product-outcome metric.

---

## 19. Testing and quality requirements

### 19.1 Unit tests

Must cover:

- WIP validation and explicit overflow
- Today Focus maximum
- Completion transitions
- Single active blocker invariant and duration
- Card position calculation and rebalancing
- Daily summary date/time-zone rules
- Import schema and reference validation
- Overdue calculation

### 19.2 Integration tests

Must cover:

- Board and default column creation
- Task create/update with version conflicts
- Transactional move and reorder
- Block/unblock transitions
- Export followed by re-import
- Invalid import rollback
- SQLite constraints and migration behavior
- Attachment validation when included

### 19.3 Component tests

Must cover:

- Quick add and validation
- Task detail form
- WIP warning/confirmation
- Today Focus limit feedback
- Blocker form
- Filter visibility and reset
- Accessible keyboard move controls
- Optimistic rollback feedback

### 19.4 End-to-end release scenarios

1. Start Luma and create a board.
2. Quick-add and edit a task.
3. Move and reorder tasks, then refresh.
4. Reach and explicitly exceed a WIP limit.
5. Select three focus tasks and reject a fourth.
6. Block, follow up, and resolve a task.
7. Add QA metadata and checklist progress.
8. Search and apply combined filters.
9. Generate and copy a daily summary.
10. Export and import a board.
11. Restart the container and verify persistence.
12. Complete the primary workflow using only a keyboard.

### 19.5 Definition of done for each story

A story is done when:

- Acceptance criteria pass.
- Server-side validation and authorization assumptions are handled.
- Domain rules have unit tests.
- API/data behavior has integration tests where applicable.
- Critical user flow has component or E2E coverage.
- Loading, empty, error, and retry states are designed and implemented.
- Keyboard and screen-reader behavior has been considered.
- Documentation and migrations are updated.
- No known critical/high-severity defect remains.

---

## 20. Delivery plan

### Phase 0 — Foundation

- pnpm monorepo, strict TypeScript, lint/format/type-check
- React/Vite shell and Hono server
- Typed API contract and runtime validation
- Drizzle/SQLite migration foundation
- Docker Compose, health endpoint, CI smoke test

**Exit:** The client calls a typed endpoint, migration runs, and data survives restart.

### Phase 1 — Core board

- Board and column management
- Task CRUD, archive, and restore
- Drag, keyboard movement, and persistent ordering
- Priority, due date, labels, and task type
- Responsive and accessible board shell

**Exit:** A user can run the complete basic Kanban loop reliably.

### Phase 2 — Focus and QA workflow

- WIP limits
- Today Focus
- Blockers and duration
- Checklist
- QA metadata
- Search and filters
- Optional local attachments if quality permits

**Exit:** The primary SQA use cases work without external tools for personal tracking.

### Phase 3 — Reflection and portability

- Daily summary and Markdown copy
- Activity history
- JSON export/import
- Backup/restore guide
- Production hardening and contributor documentation

**Exit:** Users can report progress, own their data, and operate Luma safely.

### Phase 4 — Beta validation

- Recruit 8–12 SQA/software engineering users
- Observe first-run and daily-use workflows
- Measure capture, status comprehension, and summary utility
- Fix high-impact usability, accessibility, and reliability issues

**Exit:** Evidence shows the board reduces tracking effort and improves clarity.

---

## 21. Risks, assumptions, and mitigations

| Risk/assumption                                        | Impact     | Mitigation or validation                                                                    |
| ------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------- |
| Users do not want another board to maintain            | High       | Optimize quick capture; test daily usage; avoid mandatory fields                            |
| QA metadata makes the interface feel heavy             | High       | Progressive disclosure based on task type                                                   |
| Personal board duplicates Jira/Linear                  | High       | Position as execution layer; validate future one-way capture needs before integrations      |
| Drag-and-drop harms accessibility                      | High       | Keyboard and menu alternatives; live announcements; E2E keyboard tests                      |
| No authentication leads to unsafe public exposure      | High       | Clear warning, bind/config docs, reverse-proxy guidance; add auth only after scope decision |
| SQLite write contention across tabs                    | Medium     | WAL, busy timeout, short transactions, record versions                                      |
| Imports corrupt existing data                          | High       | Full validation, size limits, preview, and one transaction                                  |
| Attachments complicate backups and security            | Medium     | Keep as Should; use allowlist, limits, generated names, documented backup behavior          |
| Hono ecosystem is younger than Express                 | Low/Medium | Run on Node.js LTS, keep domain framework-independent, pin/test upgrades                    |
| Luma name conflicts with an existing product/trademark | High       | Perform repository, package, domain, and trademark checks before public launch              |

---

## 22. Discovery and validation plan

Before or during MVP implementation, interview 8–12 SQA professionals and software engineers.

### Questions

- Where do you track personal work today?
- Which tools do you check during a normal day?
- What interrupts you and what context is hardest to recover?
- How do you decide what to work on next?
- How many tasks are typically active at once?
- What causes testing to become blocked?
- Which QA work is invisible in team tools?
- What information must remain with a test or defect investigation?
- How do you prepare daily or stand-up updates?
- What would make a personal board too expensive to maintain?
- Would you self-host it, and what installation barrier is acceptable?

### Hypotheses

- H1: A maximum of three focus tasks improves perceived clarity.
- H2: Structured blockers are more valuable than another custom status.
- H3: QA metadata is useful only when progressively disclosed.
- H4: Automatic summaries create a repeat-use habit.
- H5: Quick capture must require only a title.
- H6: Data ownership and self-hosting matter to early open-source adopters.

### Usability tasks

- Capture an unexpected request without leaving current work.
- Resume a blocked regression task and explain its dependency.
- Move a task using only the keyboard.
- Find all urgent, blocked test-execution tasks.
- Prepare a daily update and copy it to chat.
- Export a board and explain how it could be restored.

---

## 23. Traceability matrix

| Product outcome             | Stories                    | Functional requirements | Verification                                   |
| --------------------------- | -------------------------- | ----------------------- | ---------------------------------------------- |
| Capture work quickly        | US-004                     | FR-004                  | Timed usability test, component/E2E            |
| See current and next work   | US-007, US-010–012         | FR-005–009              | Usability test, E2E                            |
| Limit work in progress      | US-009                     | FR-007                  | Unit, integration, E2E                         |
| Preserve QA context         | US-016–018                 | FR-012–014              | Component, integration                         |
| Expose and resolve blockers | US-013–015                 | FR-010–011              | Unit, integration, E2E                         |
| Communicate progress        | US-021–022                 | FR-017–018              | Unit and E2E                                   |
| Find work quickly           | US-019–020                 | FR-015–016              | Performance and E2E                            |
| Own and recover data        | US-023–026                 | FR-019–021              | Import/export round-trip, restart/restore test |
| Operate safely              | US-027                     | FR-022                  | Health/log/deployment tests                    |
| Use core flow accessibly    | US-004, US-007–010, US-021 | Cross-cutting           | Keyboard E2E and accessibility audit           |

---

## 24. Resolved decisions and remaining launch checks

The following product decisions are resolved for MVP:

1. Blocker category and reason are both required.
2. The board has exactly five columns; display names, order, and WIP limits are configurable, but columns cannot be added or deleted.
3. Today Focus is a persistent current list that changes only through user action or automatic clearing on completion/archive.
4. Daily Summary covers today only; current-state sections are not historical snapshots.
5. The default In Progress WIP limit is `3`; all other columns are unlimited.
6. Local binary attachments are deferred; evidence URLs are included in MVP.
7. Permanent board deletion is available only for archived boards and requires explicit name confirmation.
8. JSON export contains all MVP board records but no binary files.

Remaining launch checks—not product-behavior decisions—are:

- Verify the supported browser matrix against automated and manual tests.
- Complete project, package, domain, and trademark availability checks for the Luma name.
- Record the baseline hardware and dataset used for published performance results.

---

## 25. MVP release criteria

Luma MVP is ready when a user can:

1. Start the application through documented Docker Compose commands.
2. Create and configure a board with the default workflow.
3. Create, edit, archive, restore, move, and reorder tasks.
4. Use priority, due date, labels, type, checklist, and QA metadata.
5. Select no more than three Today Focus tasks.
6. Configure, reach, and explicitly exceed WIP limits.
7. Record, age, follow up, and resolve blockers.
8. Search and combine visible filters.
9. Generate and copy a date-correct Markdown daily summary.
10. Review important task activity.
11. Export and transactionally import a complete board.
12. Restart the container without losing data.
13. Complete the primary board workflow using a keyboard.
14. Recover from failed optimistic updates without inconsistent UI state.
15. Follow documented backup and restore procedures.

Additionally:

- All Must requirements are implemented or explicitly waived with rationale.
- Critical E2E scenarios pass in CI.
- There are no known critical/high-severity security or data-loss defects.
- The deployment warning about absent authentication is prominent.
- Architecture and contributor documentation match the implementation.

---

## 26. Future candidates after validation

- GitHub, GitLab, Jira, or Linear task capture/linking
- PWA installation and offline support
- Recurring tasks
- Saved views and filters
- Cycle-time, blocked-time, and throughput insights
- Templates for regression, exploratory testing, and bug verification
- Browser extension or global quick capture
- Native authentication and multiple users/workspaces
- PostgreSQL for validated collaboration/concurrency needs
- OpenAPI for third-party clients
- Optional AI-assisted summaries only with explicit privacy controls

These items are not commitments. They require discovery evidence and a new scope decision.

---

## Appendix A — Daily summary example

```md
## Daily Update — 22 September 2026

### Completed

- Verified login redirect fix
- Finished checkout regression

### In Progress

- Automate payment API tests

### Blocked

- Mobile regression — waiting for Android build (1 day)

### Focus

- Automate payment API tests
- Explore refund edge cases

### Overdue

- Update release test report

### Next

- Run exploratory testing on refund flow
```

## Appendix B — Related documents

- [`SOFTWARE_ARCHITECTURE.md`](./SOFTWARE_ARCHITECTURE.md) — implementation architecture and technical decisions
- `README.md` — installation and project overview (to be created)
- `CONTRIBUTING.md` — contributor workflow (to be created)
- `SECURITY.md` — vulnerability reporting and deployment guidance (to be created)
