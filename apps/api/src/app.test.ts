import { describe, it, expect, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabase, runMigrations } from '@luma/database';
import { createApp } from './app.js';

let dir: string | undefined;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

function freshApp() {
  dir = mkdtempSync(join(tmpdir(), 'luma-api-'));
  const url = `file:${join(dir, 'luma.db')}`;
  runMigrations(url);
  const db = createDatabase(url);
  const { app } = createApp({ db });
  return { app, db };
}

describe('GET /health', () => {
  it('reports ok when the database is reachable', async () => {
    const { app, db } = freshApp();
    try {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string; db: boolean };
      expect(body.status).toBe('ok');
      expect(body.db).toBe(true);
      expect(res.headers.get('x-request-id')).toBeTruthy();
    } finally {
      db.close();
    }
  });
});

describe('static web serving', () => {
  it('serves the built frontend when configured', async () => {
    dir = mkdtempSync(join(tmpdir(), 'luma-static-'));
    const staticRoot = join(dir, 'web');
    mkdirSync(staticRoot);
    writeFileSync(join(staticRoot, 'index.html'), '<!doctype html><title>Luma</title>');
    const url = `file:${join(dir, 'luma.db')}`;
    runMigrations(url);
    const db = createDatabase(url);
    const { app } = createApp({ db, staticRoot });
    try {
      const response = await app.request('/');
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      await expect(response.text()).resolves.toContain('<title>Luma</title>');
    } finally {
      db.close();
    }
  });
});

describe('GET /api/v1/', () => {
  it('returns the API descriptor', async () => {
    const { app, db } = freshApp();
    try {
      const res = await app.request('/api/v1');
      expect(res.status).toBe(200);
      const body = (await res.json()) as { api: string; version: number };
      expect(body.api).toBe('luma');
      expect(body.version).toBe(1);
    } finally {
      db.close();
    }
  });
});

describe('API error contract', () => {
  it('returns a validation error for an invalid request body', async () => {
    const { app, db } = freshApp();
    try {
      const response = await app.request('/api/v1/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_validation' },
        body: JSON.stringify({ title: '   ' }),
      });

      expect(response.status).toBe(400);
      expect(response.headers.get('x-request-id')).toBe('req_validation');
      await expect(response.json()).resolves.toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          requestId: 'req_validation',
          details: { issues: expect.any(Array) },
        },
      });
    } finally {
      db.close();
    }
  });

  it('returns not found errors for missing boards and columns', async () => {
    const { app, db } = freshApp();
    try {
      const missingBoard = await app.request('/api/v1/boards/missing-board');
      expect(missingBoard.status).toBe(404);
      await expect(missingBoard.json()).resolves.toMatchObject({
        error: { code: 'NOT_FOUND', message: 'Board not found.', requestId: expect.any(String) },
      });

      const createBoardResponse = await app.request('/api/v1/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Board with missing column' }),
      });
      const board = (await createBoardResponse.json()) as { id: string };
      const missingColumn = await app.request('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: board.id,
          columnId: 'missing-column',
          title: 'Task without a column',
        }),
      });
      expect(missingColumn.status).toBe(404);
      await expect(missingColumn.json()).resolves.toMatchObject({
        error: { code: 'NOT_FOUND', message: 'Column not found.', requestId: expect.any(String) },
      });
    } finally {
      db.close();
    }
  });
});

describe('board and task flow', () => {
  it('creates a board with five default columns and adds a task', async () => {
    const { app, db } = freshApp();
    try {
      const createBoardResponse = await app.request('/api/v1/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Launch plan', description: 'Ship the first version.' }),
      });
      expect(createBoardResponse.status).toBe(201);
      const board = (await createBoardResponse.json()) as {
        id: string;
        columns: Array<{ id: string; statusType: string; tasks: unknown[] }>;
      };
      expect(board.columns).toHaveLength(5);
      expect(board.columns.map((column) => column.statusType)).toEqual([
        'inbox',
        'ready',
        'in_progress',
        'blocked',
        'done',
      ]);

      const inbox = board.columns[0];
      const createTaskResponse = await app.request('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: board.id,
          columnId: inbox.id,
          title: 'Write release notes',
          priority: 'high',
        }),
      });
      expect(createTaskResponse.status).toBe(201);
      const task = (await createTaskResponse.json()) as {
        id: string;
        title: string;
        priority: string;
        position: number;
      };
      expect(task.title).toBe('Write release notes');
      expect(task.priority).toBe('high');
      expect(task.position).toBe(1024);

      const getBoardResponse = await app.request(`/api/v1/boards/${board.id}`);
      expect(getBoardResponse.status).toBe(200);
      const reloaded = (await getBoardResponse.json()) as {
        columns: Array<{
          tasks: Array<{
            id: string;
            title: string;
            priority: string;
            taskType: string;
            position: number;
            boardId: string;
            columnId: string;
          }>;
        }>;
      };
      expect(reloaded.columns[0].tasks).toHaveLength(1);
      expect(reloaded.columns[0].tasks[0]).toMatchObject({
        id: task.id,
        title: 'Write release notes',
        priority: 'high',
        taskType: 'general',
        position: 1024,
        boardId: board.id,
        columnId: inbox.id,
      });
    } finally {
      db.close();
    }
  });

  it('moves tasks to the beginning, middle, and another column with sparse positions', async () => {
    const { app, db } = freshApp();
    try {
      const boardResponse = await app.request('/api/v1/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Ordering board' }),
      });
      const board = (await boardResponse.json()) as {
        id: string;
        columns: Array<{ id: string; statusType: string }>;
      };
      const inbox = board.columns.find((column) => column.statusType === 'inbox')!;
      const ready = board.columns.find((column) => column.statusType === 'ready')!;
      const tasks = [] as Array<{ id: string; version: number; position: number }>;

      for (const title of ['One', 'Two', 'Three', 'Four']) {
        const response = await app.request('/api/v1/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ boardId: board.id, columnId: inbox.id, title }),
        });
        expect(response.status).toBe(201);
        tasks.push((await response.json()) as (typeof tasks)[number]);
      }
      expect(tasks.map((task) => task.position)).toEqual([1024, 2048, 3072, 4096]);

      const middle = await app.request(`/api/v1/tasks/${tasks[3].id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetColumnId: inbox.id,
          beforeTaskId: tasks[0].id,
          afterTaskId: tasks[1].id,
          expectedVersion: tasks[3].version,
        }),
      });
      expect(middle.status).toBe(200);
      const middleTask = (await middle.json()) as { version: number; position: number };
      expect(middleTask.position).toBe(1536);
      expect(middleTask.version).toBe(2);

      const beginning = await app.request(`/api/v1/tasks/${tasks[0].id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetColumnId: inbox.id,
          afterTaskId: tasks[3].id,
          expectedVersion: tasks[0].version,
        }),
      });
      expect(beginning.status).toBe(200);
      expect(((await beginning.json()) as { position: number }).position).toBe(768);

      const crossColumn = await app.request(`/api/v1/tasks/${tasks[2].id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetColumnId: ready.id,
          expectedVersion: tasks[2].version,
        }),
      });
      expect(crossColumn.status).toBe(200);
      expect(((await crossColumn.json()) as { columnId: string; position: number }).position).toBe(
        1024,
      );

      const stale = await app.request(`/api/v1/tasks/${tasks[3].id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetColumnId: ready.id,
          expectedVersion: tasks[3].version,
        }),
      });
      expect(stale.status).toBe(409);
      await expect(stale.json()).resolves.toMatchObject({
        error: { code: 'STALE_VERSION', requestId: expect.any(String) },
      });

      const reloaded = await app.request(`/api/v1/boards/${board.id}`);
      const persisted = (await reloaded.json()) as {
        columns: Array<{ id: string; tasks: Array<{ id: string; position: number }> }>;
      };
      const persistedReady = persisted.columns.find((column) => column.id === ready.id)!;
      expect(persistedReady.tasks.map((task) => task.id)).toEqual([tasks[2].id]);
    } finally {
      db.close();
    }
  });

  it('rebalances a dense column without losing order', async () => {
    const { app, db } = freshApp();
    try {
      const boardResponse = await app.request('/api/v1/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Rebalance board' }),
      });
      const board = (await boardResponse.json()) as {
        id: string;
        columns: Array<{ id: string; statusType: string }>;
      };
      const inbox = board.columns.find((column) => column.statusType === 'inbox')!;
      const created = [] as Array<{ id: string; version: number }>;
      for (const title of ['First', 'Second', 'Third']) {
        const response = await app.request('/api/v1/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ boardId: board.id, columnId: inbox.id, title }),
        });
        created.push((await response.json()) as (typeof created)[number]);
      }
      const statement = db.sqlite.prepare('UPDATE tasks SET position = ? WHERE id = ?');
      statement.run(1024, created[0].id);
      statement.run(1025, created[1].id);
      statement.run(1026, created[2].id);

      const response = await app.request(`/api/v1/tasks/${created[2].id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetColumnId: inbox.id,
          beforeTaskId: created[0].id,
          afterTaskId: created[1].id,
          expectedVersion: created[2].version,
        }),
      });
      expect(response.status).toBe(200);

      const reloaded = await app.request(`/api/v1/boards/${board.id}`);
      const result = (await reloaded.json()) as {
        columns: Array<{ id: string; tasks: Array<{ id: string; position: number }> }>;
      };
      const tasks = result.columns.find((column) => column.id === inbox.id)!.tasks;
      expect(tasks.map((task) => task.id)).toEqual([created[0].id, created[2].id, created[1].id]);
      expect(tasks.map((task) => task.position)).toEqual([1024, 2048, 3072]);
    } finally {
      db.close();
    }
  });

  it('edits, archives, and restores a task', async () => {
    const { app, db } = freshApp();
    try {
      const boardResponse = await app.request('/api/v1/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Lifecycle board' }),
      });
      const board = (await boardResponse.json()) as {
        id: string;
        columns: Array<{ id: string; statusType: string }>;
      };
      const inbox = board.columns.find((column) => column.statusType === 'inbox')!;
      const createdResponse = await app.request('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: board.id, columnId: inbox.id, title: 'Original task' }),
      });
      const created = (await createdResponse.json()) as {
        id: string;
        version: number;
        position: number;
      };

      const editedResponse = await app.request(`/api/v1/tasks/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated task',
          description: 'Detailed context',
          priority: 'urgent',
          taskType: 'bug_investigation',
          dueDate: 1_800_000_000_000,
          expectedVersion: created.version,
        }),
      });
      expect(editedResponse.status).toBe(200);
      const edited = (await editedResponse.json()) as {
        version: number;
        title: string;
        priority: string;
        taskType: string;
        dueDate: number;
      };
      expect(edited).toMatchObject({
        version: 2,
        title: 'Updated task',
        priority: 'urgent',
        taskType: 'bug_investigation',
        dueDate: 1_800_000_000_000,
      });

      const archivedResponse = await app.request(`/api/v1/tasks/${created.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: edited.version }),
      });
      expect(archivedResponse.status).toBe(200);
      const archived = (await archivedResponse.json()) as { version: number; archivedAt: number };
      expect(archived.version).toBe(3);
      expect(archived.archivedAt).toEqual(expect.any(Number));

      const hiddenBoard = (await (await app.request(`/api/v1/boards/${board.id}`)).json()) as {
        columns: Array<{ tasks: Array<{ id: string }> }>;
      };
      expect(hiddenBoard.columns.flatMap((column) => column.tasks)).toHaveLength(0);

      const restoredResponse = await app.request(`/api/v1/tasks/${created.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: archived.version }),
      });
      expect(restoredResponse.status).toBe(200);
      const restored = (await restoredResponse.json()) as {
        version: number;
        archivedAt: number | null;
        position: number;
      };
      expect(restored).toMatchObject({ version: 4, archivedAt: null, position: created.position });

      const invalidTitle = await app.request(`/api/v1/tasks/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '   ', expectedVersion: restored.version }),
      });
      expect(invalidTitle.status).toBe(400);

      const stale = await app.request(`/api/v1/tasks/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Stale update', expectedVersion: created.version }),
      });
      expect(stale.status).toBe(409);
    } finally {
      db.close();
    }
  });

  it('requires confirmation before exceeding a WIP limit', async () => {
    const { app, db } = freshApp();
    try {
      const boardResponse = await app.request('/api/v1/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'WIP board' }),
      });
      const board = (await boardResponse.json()) as {
        id: string;
        columns: Array<{ id: string; statusType: string }>;
      };
      const inbox = board.columns.find((column) => column.statusType === 'inbox')!;
      const ready = board.columns.find((column) => column.statusType === 'ready')!;
      await app.request(`/api/v1/columns/${ready.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wipLimit: 1 }),
      });
      const existing = await app.request('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: board.id, columnId: ready.id, title: 'Existing work' }),
      });
      expect(existing.status).toBe(201);
      const incoming = await app.request('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: board.id, columnId: inbox.id, title: 'Incoming work' }),
      });
      const task = (await incoming.json()) as { id: string; version: number };

      const rejected = await app.request(`/api/v1/tasks/${task.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetColumnId: ready.id, expectedVersion: task.version }),
      });
      expect(rejected.status).toBe(409);
      await expect(rejected.json()).resolves.toMatchObject({
        error: {
          code: 'WIP_CONFIRMATION_REQUIRED',
          details: { current: 1, limit: 1 },
          requestId: expect.any(String),
        },
      });

      const unchanged = (await (await app.request(`/api/v1/boards/${board.id}`)).json()) as {
        columns: Array<{ id: string; tasks: Array<{ id: string }> }>;
      };
      expect(unchanged.columns.find((column) => column.id === inbox.id)!.tasks).toHaveLength(1);
      expect(unchanged.columns.find((column) => column.id === ready.id)!.tasks).toHaveLength(1);

      const confirmed = await app.request(`/api/v1/tasks/${task.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetColumnId: ready.id,
          expectedVersion: task.version,
          confirmWipOverflow: true,
        }),
      });
      expect(confirmed.status).toBe(200);

      const finalBoard = (await (await app.request(`/api/v1/boards/${board.id}`)).json()) as {
        columns: Array<{ id: string; tasks: Array<{ id: string }> }>;
      };
      expect(finalBoard.columns.find((column) => column.id === inbox.id)!.tasks).toHaveLength(0);
      expect(finalBoard.columns.find((column) => column.id === ready.id)!.tasks).toHaveLength(2);
    } finally {
      db.close();
    }
  });

  it('persists column names, WIP limits, and column order', async () => {
    const { app, db } = freshApp();
    try {
      const boardResponse = await app.request('/api/v1/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Column settings board' }),
      });
      const board = (await boardResponse.json()) as {
        id: string;
        columns: Array<{ id: string; name: string; statusType: string }>;
      };
      const inbox = board.columns.find((column) => column.statusType === 'inbox')!;
      const done = board.columns.find((column) => column.statusType === 'done')!;

      const updated = await app.request(`/api/v1/columns/${inbox.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Capture', wipLimit: 3, beforeColumnId: done.id }),
      });
      expect(updated.status).toBe(200);
      await expect(updated.json()).resolves.toMatchObject({
        id: inbox.id,
        name: 'Capture',
        wipLimit: 3,
        position: 4,
      });

      const invalid = await app.request(`/api/v1/columns/${inbox.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wipLimit: -1 }),
      });
      expect(invalid.status).toBe(400);

      const reloaded = await app.request(`/api/v1/boards/${board.id}`);
      const result = (await reloaded.json()) as {
        columns: Array<{ id: string; name: string; wipLimit: number | null; position: number }>;
      };
      expect(result.columns.map((column) => column.id)).toEqual([
        board.columns[1].id,
        board.columns[2].id,
        board.columns[3].id,
        done.id,
        inbox.id,
      ]);
      expect(result.columns.at(-1)).toMatchObject({ name: 'Capture', wipLimit: 3, position: 4 });
    } finally {
      db.close();
    }
  });

  it('rejects a task when the column belongs to another board', async () => {
    const { app, db } = freshApp();
    try {
      const first = await app.request('/api/v1/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'First board' }),
      });
      const second = await app.request('/api/v1/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Second board' }),
      });
      const firstBoard = (await first.json()) as { id: string; columns: Array<{ id: string }> };
      const secondBoard = (await second.json()) as { id: string };

      const response = await app.request('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: secondBoard.id,
          columnId: firstBoard.columns[0].id,
          title: 'Invalid task',
        }),
      });
      expect(response.status).toBe(400);
      expect(response.headers.get('x-request-id')).toBeTruthy();
      await expect(response.json()).resolves.toMatchObject({
        error: {
          code: 'COLUMN_NOT_IN_BOARD',
          message: 'The selected column does not belong to this board.',
          requestId: expect.any(String),
        },
      });
    } finally {
      db.close();
    }
  });
});
