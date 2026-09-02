import { and, asc, eq, sql } from 'drizzle-orm';
import type { AppRepositories, BoardRecord, ColumnRecord, TaskRecord } from '@luma/domain';
import type { Priority, StatusType, TaskType } from '@luma/contracts';
import type { DatabaseHandle } from './client.js';
import { boards, columns, tasks } from './schema/index.js';

const toBoard = (row: typeof boards.$inferSelect): BoardRecord => row;
const toColumn = (row: typeof columns.$inferSelect): ColumnRecord => ({
  ...row,
  statusType: row.statusType as StatusType,
});
const toTask = (row: typeof tasks.$inferSelect): TaskRecord => ({
  ...row,
  priority: row.priority as Priority,
  taskType: row.taskType as TaskType,
});

export function createRepositories(handle: DatabaseHandle): AppRepositories {
  const boardRepo = {
    create(input: { id: string; title: string; description?: string | null; now: number }) {
      const row = handle.db
        .insert(boards)
        .values({
          id: input.id,
          title: input.title,
          description: input.description ?? null,
          version: 1,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning()
        .get();
      return toBoard(row);
    },
    get(id: string) {
      const row = handle.db.select().from(boards).where(eq(boards.id, id)).get();
      return row ? toBoard(row) : null;
    },
  };
  const columnRepo = {
    createDefaults(boardId: string, now: number) {
      const defaults: Array<{ statusType: StatusType; name: string }> = [
        { statusType: 'inbox', name: 'Inbox' },
        { statusType: 'ready', name: 'Ready' },
        { statusType: 'in_progress', name: 'In Progress' },
        { statusType: 'blocked', name: 'Blocked' },
        { statusType: 'done', name: 'Done' },
      ];
      const values = defaults.map(({ statusType, name }, position) => ({
        id: crypto.randomUUID(),
        boardId,
        statusType,
        name,
        position,
        wipLimit: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      }));
      return values.length
        ? values.map((value) => toColumn(handle.db.insert(columns).values(value).returning().get()))
        : [];
    },
    listByBoard(boardId: string) {
      return handle.db
        .select()
        .from(columns)
        .where(eq(columns.boardId, boardId))
        .orderBy(asc(columns.position))
        .all()
        .map(toColumn);
    },
    get(id: string) {
      const row = handle.db.select().from(columns).where(eq(columns.id, id)).get();
      return row ? toColumn(row) : null;
    },
    update(input: {
      id: string;
      name?: string;
      wipLimit?: number | null;
      position?: number;
      now: number;
    }) {
      const row = handle.db
        .update(columns)
        .set({
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.wipLimit === undefined ? {} : { wipLimit: input.wipLimit }),
          ...(input.position === undefined ? {} : { position: input.position }),
          updatedAt: input.now,
          version: sql`${columns.version} + 1`,
        })
        .where(eq(columns.id, input.id))
        .returning()
        .get();
      return row ? toColumn(row) : null;
    },
    setPosition(id: string, position: number) {
      handle.db.update(columns).set({ position }).where(eq(columns.id, id)).run();
    },
  };
  const taskRepo = {
    create(input: {
      id: string;
      boardId: string;
      columnId: string;
      title: string;
      description?: string | null;
      priority?: Priority;
      taskType?: TaskType;
      position: number;
      now: number;
    }) {
      const row = handle.db
        .insert(tasks)
        .values({
          id: input.id,
          boardId: input.boardId,
          columnId: input.columnId,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority ?? 'medium',
          taskType: input.taskType ?? 'general',
          position: input.position,
          dueDate: null,
          isFocus: false,
          notes: null,
          version: 1,
          createdAt: input.now,
          updatedAt: input.now,
          completedAt: null,
          archivedAt: null,
        })
        .returning()
        .get();
      return toTask(row);
    },
    get(id: string) {
      const row = handle.db.select().from(tasks).where(eq(tasks.id, id)).get();
      return row ? toTask(row) : null;
    },
    listByBoard(boardId: string) {
      return handle.db
        .select()
        .from(tasks)
        .where(eq(tasks.boardId, boardId))
        .orderBy(asc(tasks.position), asc(tasks.id))
        .all()
        .map(toTask);
    },
    updatePosition(input: {
      id: string;
      columnId: string;
      position: number;
      expectedVersion: number;
      now: number;
    }) {
      const row = handle.db
        .update(tasks)
        .set({
          columnId: input.columnId,
          position: input.position,
          updatedAt: input.now,
          version: sql`${tasks.version} + 1`,
        })
        .where(and(eq(tasks.id, input.id), eq(tasks.version, input.expectedVersion)))
        .returning()
        .get();
      return row ? toTask(row) : null;
    },
    setPosition(id: string, position: number) {
      handle.db.update(tasks).set({ position }).where(eq(tasks.id, id)).run();
    },
    update(input: {
      id: string;
      expectedVersion: number;
      title?: string;
      description?: string | null;
      priority?: Priority;
      taskType?: TaskType;
      dueDate?: number | null;
      archivedAt?: number | null;
      position?: number;
      now: number;
    }) {
      const row = handle.db
        .update(tasks)
        .set({
          ...(input.title === undefined ? {} : { title: input.title }),
          ...(input.description === undefined ? {} : { description: input.description }),
          ...(input.priority === undefined ? {} : { priority: input.priority }),
          ...(input.taskType === undefined ? {} : { taskType: input.taskType }),
          ...(input.dueDate === undefined ? {} : { dueDate: input.dueDate }),
          ...(input.archivedAt === undefined ? {} : { archivedAt: input.archivedAt }),
          ...(input.position === undefined ? {} : { position: input.position }),
          updatedAt: input.now,
          version: sql`${tasks.version} + 1`,
        })
        .where(and(eq(tasks.id, input.id), eq(tasks.version, input.expectedVersion)))
        .returning()
        .get();
      return row ? toTask(row) : null;
    },
  };
  return {
    boards: boardRepo,
    columns: columnRepo,
    tasks: taskRepo,
    withTransaction: <T>(work: () => T) => handle.sqlite.transaction(work)(),
  };
}

export { and };
