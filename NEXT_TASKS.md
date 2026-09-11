# Luma — Next Tasks

**Document status:** Proposed implementation backlog  
**Based on:** current implementation assessment, `PRODUCT_REQUIREMENTS.md`, and `SOFTWARE_ARCHITECTURE.md`  
**Current milestone:** Phase 0 stabilization → Phase 1 core Kanban flow

## Objective

Turn the existing foundation spike into a reliable core Kanban loop:

> Create a task → prioritize it → move/reorder it safely → persist it → recover correctly from errors.

Do not begin QA metadata, blockers, daily summaries, import/export, or collaboration until this loop is complete.

---

## Priority 0 — Stabilize the existing vertical slice

### Task 0.1 — Make the repository quality gate green

**Why**

Formatting currently causes the full quality gate to fail, preventing a trustworthy CI baseline.

**Implementation**

- Run Prettier across all repository files and commit the resulting formatting changes.
- Remove unnecessary `eslint-disable` directives that produce unused-suppression warnings.
- Add or confirm root-level scripts for:
  - `format:check`
  - `format:write`
  - `lint`
  - `typecheck`
  - `test`
  - `build`
  - `check` (runs all required quality checks)

**Acceptance criteria**

- [ ] `pnpm format:check` exits with code `0`.
- [ ] `pnpm lint` exits with code `0` and no warnings.
- [ ] `pnpm typecheck` exits with code `0`.
- [ ] `pnpm test` exits with code `0`.
- [ ] `pnpm build` exits with code `0`.
- [ ] `pnpm check` provides a single successful local quality gate.

---

### Task 0.2 — Correct API error semantics

**Why**

Expected user mistakes are currently surfaced as generic HTTP 500 errors. A missing record, invalid payload, or invalid board/column pairing is a client-resolvable error, not an internal server failure.

**User story**

> As a Luma user, when an action cannot be completed, I want a clear actionable error so that I know what to correct without losing my work.

**Implementation**

- Define application/domain error types, at minimum:
  - `ValidationError`
  - `NotFoundError`
  - `ConflictError`
  - `WipLimitExceededError` or `WipConfirmationRequiredError` (for the next milestone)
- Add centralized Hono error mapping.
- Convert Zod request-validation failures to the documented error response.
- Convert missing board, column, and task conditions to `NotFoundError`.
- Convert a column belonging to a different board into `ValidationError` or `ConflictError`.
- Ensure every error response includes the request ID.
- Update existing API tests that currently assert `500` for client errors.

**HTTP contract**

```json
{
  "error": {
    "code": "COLUMN_NOT_IN_BOARD",
    "message": "The selected column does not belong to this board.",
    "details": {}
  },
  "requestId": "req_..."
}
```

**Status mapping**

| Condition                               |                             HTTP status |
| --------------------------------------- | --------------------------------------: |
| Invalid body, parameter, or query value |                                     400 |
| Board, column, or task does not exist   |                                     404 |
| Stale version or conflicting update     |                                     409 |
| WIP confirmation required               | 409 or 422 (choose one and document it) |
| Unexpected server failure               |                                     500 |

**Acceptance criteria**

- [ ] Invalid request bodies return `400`, not `500`.
- [ ] Missing board/column/task returns `404`, not `500`.
- [ ] Cross-board column selection returns a documented client error, not `500`.
- [ ] Error responses follow the shared error schema and contain a request ID.
- [ ] Unexpected errors are logged once with the request ID and return no stack trace to clients.
- [ ] API tests cover every status mapping above.

---

### Task 0.3 — Enforce database invariants

**Why**

Drizzle/TypeScript types do not protect SQLite from invalid direct writes or future repository regressions. Schema comments must match actual database constraints.

**Implementation**

- Add a forward-only Drizzle migration; never edit an applied migration.
- Add SQLite `CHECK` constraints where supported for:
  - non-negative `wip_limit`
  - valid task priority values
  - valid task type values
  - valid internal column status values
  - non-negative task positions
- Ensure SQLite foreign keys are enabled for each connection.
- Enforce board/column consistency in task create and move transactions.
- Add indexes for board/column/position task queries.
- Update schema documentation to reflect only constraints that actually exist.

**Acceptance criteria**

- [ ] SQLite rejects a negative WIP limit.
- [ ] SQLite rejects unsupported priority, task type, and column status values.
- [ ] A task cannot be created or moved into a column from another board.
- [ ] Foreign-key behavior is covered by database integration tests.
- [ ] The new migration applies successfully to a fresh database and an existing development database.

---

## Priority 1 — Complete the core board workflow

### Task 1.1 — Implement task movement and ordering as a server-side use case

**Why**

Task positions are currently assigned as `0, 1, 2...`, which contradicts the sparse ordering policy and does not support reliable insertion between cards.

**User story**

> As a user, I want to move a task to another workflow column and place it at a specific position so that my board reflects the order in which I plan to work.

**Implementation**

- Create a framework-independent `moveTask` application use case.
- Accept task ID, target column ID, target position context, and expected task version.
- Use the domain ordering policy (`positionBetween`) to assign sparse positions.
- Rebalance positions transactionally when no numeric gap remains.
- Validate board/column ownership in the same transaction.
- Update task `column_id`, `position`, `updated_at`, and version atomically.
- Record an activity event for the move if the activity table is introduced now; otherwise leave an explicit extension point and do not fake history in the UI.
- Expose a typed API endpoint, for example `POST /api/tasks/:taskId/move`.

**Ordering rules**

- New tasks added to an empty column receive position `1024`.
- A task added at the end receives `lastPosition + 1024`.
- A task inserted between two cards uses a value strictly between their positions.
- If no valid value exists between neighbors, rebalance every card in that column as `1024, 2048, 3072...` in one transaction, then retry.
- Lists are always rendered by ascending `position`, with task ID as a deterministic tie-breaker.

**Acceptance criteria**

- [ ] A task can move between two columns through the API.
- [ ] A task can move to the beginning, middle, or end of a column.
- [ ] Positions use the sparse ordering scheme.
- [ ] Rebalance preserves visual order and is transactional.
- [ ] An invalid target column does not modify any task.
- [ ] A stale task version returns `409` without overwriting newer changes.
- [ ] Movement persists after API restart and browser refresh.
- [ ] Unit and integration tests cover the above cases.

---

### Task 1.2 — Implement column configuration and WIP persistence

**User story**

> As a user, I want to configure column names and WIP limits so that my board reflects my personal workflow and helps me avoid too much active work.

**Scope**

- Rename a column.
- Reorder columns.
- Set or clear a WIP limit.
- Preserve internal status semantics for the five required default workflow statuses.

**Rules**

- A board always retains exactly one column for each internal default status: Inbox, Ready, In Progress, Blocked, and Done.
- Users may rename the display label but may not delete these required columns in the MVP.
- WIP limits must be a whole number greater than or equal to zero; `null` means no limit.
- WIP count excludes archived tasks.
- A WIP limit is advisory at first: overflow requires confirmation during a move, but does not permanently block the user.

**Acceptance criteria**

- [ ] Column name and WIP limit edits persist after refresh.
- [ ] Negative and non-integer WIP inputs are rejected.
- [ ] Column reorder persists and renders correctly.
- [ ] The board renders a count such as `2 / 3` when a limit exists.
- [ ] Required default columns cannot be deleted in the MVP.

---

### Task 1.3 — Wire WIP rules into task movement

**User story**

> As a user, when moving work into a full column, I want a clear warning and an explicit choice so that I remain aware of overcommitment.

**Implementation**

- Invoke the existing WIP domain policy from `moveTask`.
- Return a structured confirmation-required response when a move would exceed the limit and confirmation is absent.
- Accept an explicit `confirmWipOverflow: true` retry.
- Display the warning and confirmation choice in the UI.

**Acceptance criteria**

- [ ] A move within the limit succeeds normally.
- [ ] A move exceeding the limit does not change server state without confirmation.
- [ ] The API response identifies the current count and limit.
- [ ] A confirmed overflow move succeeds and is visibly marked as over limit.
- [ ] Keyboard users can read and operate the confirmation UI.

---

### Task 1.4 — Complete basic task management

**User story**

> As a user, I want to edit and archive tasks so that the board contains accurate, current work without losing historical context.

**Scope**

- Edit title, description, priority, task type, and due date.
- Archive and restore tasks.
- Display priority and due-date state on cards.
- Keep task edits separate from movement semantics.

**Acceptance criteria**

- [ ] A task title is required and has server-side validation.
- [ ] Users can edit the listed fields from a task detail view.
- [ ] Archived tasks disappear from active board counts and lists.
- [ ] Restored tasks return to their prior column and position where valid.
- [ ] Overdue state is calculated against the user-visible calendar date and does not depend only on color.
- [ ] All changes persist after refresh.

---

## Priority 2 — Establish a maintainable frontend and delivery baseline

### Task 2.1 — Refactor the web spike into feature modules and React Query

**Why**

The current single `main.tsx` component is suitable only for a spike. The board will need separate query, mutation, error, accessibility, and optimistic-update behavior.

**Implementation**

- Move handwritten API calls and types to a shared contracts/API client package.
- Adopt TanStack Query for board reads and all mutations.
- Split UI into focused modules, for example:

```text
apps/web/src/
├── app/
├── features/
│   ├── boards/
│   ├── columns/
│   └── tasks/
├── components/
├── lib/
└── routes/
```

- Implement optimistic updates only for operations with reliable rollback support (starting with task movement).
- On mutation failure, restore the prior cached board state and show an accessible error notification.

**Acceptance criteria**

- [ ] Board data is loaded and mutated through TanStack Query.
- [ ] The UI does not duplicate API request/response types locally.
- [ ] Failed optimistic moves restore the exact prior visual state.
- [ ] Feature modules have focused tests.
- [ ] UI loading, empty, and error states are accessible.

---

### Task 2.2 — Add keyboard-first card movement, then drag and drop

**User story**

> As a keyboard user, I want to move and reorder tasks without a pointer so that I can manage the board accessibly.

**Implementation order**

1. Ship explicit keyboard controls (for example, Move left/right/up/down or a Move menu).
2. Add dnd-kit pointer/touch drag-and-drop after server movement is stable.
3. Ensure both mechanisms call the same move mutation and respect WIP confirmation.

**Acceptance criteria**

- [ ] A keyboard-only user can select a card and move it to another column.
- [ ] A keyboard-only user can reorder a card within its column.
- [ ] Focus remains predictable after a successful or failed move.
- [ ] Pointer/touch drag-and-drop works once introduced.
- [ ] Status, WIP warning, and errors are not communicated by color alone.

---

### Task 2.3 — Add self-hosted delivery essentials

**Implementation**

- Add a production Dockerfile.
- Add `docker-compose.yml` with a persistent SQLite volume mounted at the documented data path.
- Serve the built React application from the deployed application runtime.
- Add a health-check endpoint to Compose.
- Run migrations safely before accepting requests.
- Add GitHub Actions for `pnpm check` and production build.
- Create README documentation for local setup, Docker installation, upgrades, backup, restore, and environment variables.

**Acceptance criteria**

- [ ] `docker compose up -d` starts Luma successfully.
- [ ] Board data survives container recreation when the volume is retained.
- [ ] Health checks pass after startup and migrations.
- [ ] CI runs format, lint, typecheck, test, and build on pull requests.
- [ ] README provides copy-pasteable install, backup, and restore commands.
- [ ] No external service, analytics, or account is required for the MVP.

---

## Explicitly deferred work

Do **not** add these features until Priority 0 and Priority 1 are complete and reviewed:

- Today Focus
- Blockers
- Checklists
- Labels
- QA metadata and attachments
- Search and filters
- Activity history
- Daily summaries
- JSON import/export
- Authentication or multi-user support
- Third-party integrations
- Offline synchronization

---

## Suggested pull-request sequence

1. `chore/quality-gate` — formatting, lint cleanup, root scripts.
2. `feat/api-errors` — typed application errors, Zod mapping, contract tests.
3. `feat/db-invariants` — forward migration and database constraint tests.
4. `feat/task-move-ordering` — transactional move/reorder use case and API.
5. `feat/column-wip-config` — column settings and persisted limits.
6. `feat/wip-confirmation` — enforce advisory WIP policy in move flow.
7. `feat/task-detail-lifecycle` — edit/archive/restore task APIs and UI.
8. `refactor/web-query-modules` — TanStack Query, shared API types, feature boundaries.
9. `feat/accessible-task-movement` — keyboard movement followed by dnd-kit.
10. `chore/docker-ci-docs` — Compose, CI, README, backup/restore docs.

Each pull request should include tests for its changed business rules and update this document if a product/architecture decision changes.

---

## Milestone exit criteria — Core Kanban Alpha

The current milestone is complete when all statements below are true:

- [ ] The full quality gate is green locally and in CI.
- [ ] Expected client mistakes return documented 4xx responses, never generic 500s.
- [ ] The database itself enforces the documented basic invariants.
- [ ] Users can create, edit, archive, restore, move, and reorder tasks.
- [ ] Column labels, ordering, and WIP limits are configurable and persistent.
- [ ] WIP overflow requires an explicit, accessible confirmation.
- [ ] Task order is safe, deterministic, transactional, and persists across restarts.
- [ ] Keyboard users can execute the primary task movement workflow.
- [ ] Luma runs through Docker Compose with persistent SQLite storage.
- [ ] A new contributor can run checks and start the app using the README.

## Next task to start

Start with **Task 0.1 — Make the repository quality gate green**. It is isolated, low-risk, and establishes a clean baseline before behavior-changing work begins.
