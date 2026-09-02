import { sql } from 'drizzle-orm';
import { check, sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Schema conventions (SOFTWARE_ARCHITECTURE §9.2):
 * - Text IDs (UUIDv7/ULID).
 * - Timestamps stored as integer epoch milliseconds (UTC).
 * - Nullable completion/archival timestamps instead of booleans.
 * - CHECK constraints for enums and non-negative WIP limits.
 * - Numeric `version` for optimistic concurrency.
 */

export const boards = sqliteTable('boards', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  version: integer('version').notNull().default(1),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  archivedAt: integer('archived_at'),
});

export const columns = sqliteTable(
  'columns',
  {
    id: text('id').primaryKey(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    // Immutable internal status type; display name is separate.
    statusType: text('status_type', {
      enum: ['inbox', 'ready', 'in_progress', 'blocked', 'done'],
    }).notNull(),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    // null = unlimited; >= 0 otherwise (0 closes column to unconfirmed inbound).
    wipLimit: integer('wip_limit'),
    version: integer('version').notNull().default(1),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => ({
    boardStatusUnique: uniqueIndex('columns_board_status_unique').on(t.boardId, t.statusType),
    boardPositionUnique: uniqueIndex('columns_board_position_unique').on(t.boardId, t.position),
    boardIdx: index('columns_board_idx').on(t.boardId),
    statusTypeCheck: check(
      'columns_status_type_check',
      sql`${t.statusType} IN ('inbox', 'ready', 'in_progress', 'blocked', 'done')`,
    ),
    positionCheck: check('columns_position_check', sql`${t.position} >= 0`),
    wipLimitCheck: check(
      'columns_wip_limit_check',
      sql`${t.wipLimit} IS NULL OR ${t.wipLimit} >= 0`,
    ),
  }),
);

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    columnId: text('column_id')
      .notNull()
      .references(() => columns.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] })
      .notNull()
      .default('medium'),
    taskType: text('task_type').notNull().default('general'),
    position: integer('position').notNull(),
    dueDate: integer('due_date'),
    isFocus: integer('is_focus', { mode: 'boolean' }).notNull().default(false),
    notes: text('notes'),
    version: integer('version').notNull().default(1),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    completedAt: integer('completed_at'),
    archivedAt: integer('archived_at'),
  },
  (t) => ({
    columnPositionUnique: uniqueIndex('tasks_column_position_unique').on(t.columnId, t.position),
    boardIdx: index('tasks_board_idx').on(t.boardId),
    columnIdx: index('tasks_column_idx').on(t.columnId),
    dueIdx: index('tasks_due_idx').on(t.dueDate),
    completedIdx: index('tasks_completed_idx').on(t.completedAt),
    focusIdx: index('tasks_focus_idx').on(t.boardId, t.isFocus),
    priorityCheck: check(
      'tasks_priority_check',
      sql`${t.priority} IN ('low', 'medium', 'high', 'urgent')`,
    ),
    taskTypeCheck: check(
      'tasks_task_type_check',
      sql`${t.taskType} IN ('general', 'test_design', 'test_execution', 'exploratory', 'bug_investigation', 'bug_verification', 'test_automation', 'regression', 'documentation')`,
    ),
    positionCheck: check('tasks_position_check', sql`${t.position} >= 0`),
  }),
);

export const boardsRelations = { columns, tasks };

// A convenient re-export for the migration meta table default check.
export const _schemaVersion = sql`1`;
