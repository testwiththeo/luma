import { readFile, stat } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { Hono } from 'hono';
import { z } from 'zod';
import type { DatabaseHandle } from '@luma/database';
import { checkDatabase, createRepositories } from '@luma/database';
import {
  createBoard,
  createTask,
  getBoard,
  archiveTask,
  moveTask,
  restoreTask,
  updateColumn,
  updateTask,
  type AppRepositories,
} from '@luma/application';
import { requestId, errorHandler } from './middleware/error.js';
import { TASK_TYPES, prioritySchema, taskTypeSchema, titleSchema } from '@luma/contracts';

export interface AppDeps {
  db: DatabaseHandle;
  repos?: AppRepositories;
  staticRoot?: string;
}
const createBoardSchema = z.object({
  title: titleSchema,
  description: z.string().nullable().optional(),
});
const createTaskSchema = z.object({
  boardId: z.string().min(1),
  columnId: z.string().min(1),
  title: titleSchema,
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  taskType: z.enum(TASK_TYPES).optional(),
});
const moveTaskSchema = z.object({
  targetColumnId: z.string().min(1),
  beforeTaskId: z.string().min(1).nullable().optional(),
  afterTaskId: z.string().min(1).nullable().optional(),
  expectedVersion: z.number().int().nonnegative(),
  confirmWipOverflow: z.boolean().optional(),
});
const updateTaskSchema = z
  .object({
    title: titleSchema.optional(),
    description: z.string().nullable().optional(),
    priority: prioritySchema.optional(),
    taskType: taskTypeSchema.optional(),
    dueDate: z.number().int().nonnegative().nullable().optional(),
    expectedVersion: z.number().int().nonnegative(),
  })
  .refine((body) => Object.keys(body).length > 0, 'At least one task field is required.');
const taskLifecycleSchema = z.object({ expectedVersion: z.number().int().nonnegative() });
const updateColumnSchema = z
  .object({
    name: z.string().max(100).optional(),
    wipLimit: z.number().int().nonnegative().nullable().optional(),
    beforeColumnId: z.string().min(1).nullable().optional(),
    afterColumnId: z.string().min(1).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'At least one column field is required.');
const id = () => crypto.randomUUID();
const now = () => Date.now();

export function createApp(deps: AppDeps) {
  const app = new Hono();
  const repos = deps.repos ?? createRepositories(deps.db);
  app.use('*', requestId);
  app.onError(errorHandler);
  const health = app.get('/health', (c) => {
    const dbReady = checkDatabase(deps.db);
    return c.json({ status: dbReady ? 'ok' : 'degraded', db: dbReady }, dbReady ? 200 : 503);
  });
  const v1 = new Hono();
  v1.get('/', (c) => c.json({ api: 'luma', version: 1 }));
  v1.get('/boards/:boardId', (c) => c.json(getBoard(repos, c.req.param('boardId'))));
  v1.post('/boards', async (c) => {
    const body = createBoardSchema.parse(await c.req.json());
    return c.json(createBoard(repos, body, { id, now }), 201);
  });
  v1.post('/tasks', async (c) => {
    const body = createTaskSchema.parse(await c.req.json());
    return c.json(createTask(repos, body, { id, now }), 201);
  });
  v1.post('/tasks/:taskId/move', async (c) => {
    const body = moveTaskSchema.parse(await c.req.json());
    return c.json(moveTask(repos, { ...body, taskId: c.req.param('taskId') }, { now }));
  });
  v1.patch('/columns/:columnId', async (c) => {
    const body = updateColumnSchema.parse(await c.req.json());
    return c.json(updateColumn(repos, { ...body, columnId: c.req.param('columnId') }, { now }));
  });
  v1.patch('/tasks/:taskId', async (c) => {
    const body = updateTaskSchema.parse(await c.req.json());
    return c.json(updateTask(repos, { ...body, taskId: c.req.param('taskId') }, { now }));
  });
  v1.post('/tasks/:taskId/archive', async (c) => {
    const body = taskLifecycleSchema.parse(await c.req.json());
    return c.json(archiveTask(repos, { ...body, taskId: c.req.param('taskId') }, { now }));
  });
  v1.post('/tasks/:taskId/restore', async (c) => {
    const body = taskLifecycleSchema.parse(await c.req.json());
    return c.json(restoreTask(repos, { ...body, taskId: c.req.param('taskId') }, { now }));
  });
  app.route('/api/v1', v1);
  if (deps.staticRoot) {
    app.get('*', async (c) => {
      if (c.req.path.startsWith('/api/')) return c.notFound();
      const requested = decodeURIComponent(c.req.path);
      const candidate = normalize(
        join(deps.staticRoot!, requested === '/' ? 'index.html' : requested),
      );
      const root = normalize(deps.staticRoot!);
      if (!candidate.startsWith(`${root}/`) && candidate !== root) return c.notFound();
      try {
        const info = await stat(candidate);
        const file = info.isDirectory() ? join(candidate, 'index.html') : candidate;
        return new Response(await readFile(file), {
          headers: { 'Content-Type': contentType(file) },
        });
      } catch {
        if (!requested.includes('.')) {
          const index = join(root, 'index.html');
          return new Response(await readFile(index), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        return c.notFound();
      }
    });
  }
  return { app, routes: health };
}
function contentType(file: string): string {
  const extension = file.slice(file.lastIndexOf('.')).toLowerCase();
  return (
    {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.ico': 'image/x-icon',
      '.woff2': 'font/woff2',
    }[extension] ?? 'application/octet-stream'
  );
}

export type AppType = ReturnType<typeof createApp>['routes'];
