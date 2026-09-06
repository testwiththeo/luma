import type { Priority, TaskType } from '@luma/contracts';

export type Task = {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: Priority;
  taskType: TaskType;
  position: number;
  dueDate: number | null;
  isFocus: boolean;
  notes: string | null;
  version: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  archivedAt: number | null;
};

export type Column = {
  id: string;
  boardId: string;
  name: string;
  statusType: string;
  position: number;
  wipLimit: number | null;
  version: number;
  tasks: Task[];
};

export type Board = {
  id: string;
  title: string;
  description: string | null;
  version: number;
  columns: Column[];
};

export type CreateTaskInput = {
  boardId: string;
  columnId: string;
  title: string;
};

export type UpdateColumnInput = {
  name?: string;
  wipLimit?: number | null;
  beforeColumnId?: string | null;
  afterColumnId?: string | null;
};

export type MoveTaskInput = {
  targetColumnId: string;
  beforeTaskId?: string | null;
  afterTaskId?: string | null;
  expectedVersion: number;
  confirmWipOverflow?: boolean;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;

  constructor(
    status: number,
    message: string,
    error?: {
      code?: string;
      details?: Record<string, unknown>;
      requestId?: string;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = error?.code;
    this.details = error?.details;
    this.requestId = error?.requestId;
  }
}

const API = '/api/v1';

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        error?: {
          code?: string;
          message?: string;
          details?: Record<string, unknown>;
          requestId?: string;
        };
      }
    | T
    | null;
  if (!response.ok) {
    const error =
      payload && typeof payload === 'object' && 'error' in payload ? payload.error : undefined;
    throw new ApiError(
      response.status,
      error?.message ?? `Request failed (${response.status})`,
      error,
    );
  }
  return payload as T;
}

export const getBoard = (boardId: string) => request<Board>(`/boards/${boardId}`);

export async function getOrCreateBoard(): Promise<Board> {
  const saved = localStorage.getItem('luma-board-id');
  if (saved) return getBoard(saved);
  const board = await request<Board>('/boards', {
    method: 'POST',
    body: JSON.stringify({
      title: 'My Luma Board',
      description: 'A focused workspace for getting things done.',
    }),
  });
  localStorage.setItem('luma-board-id', board.id);
  return board;
}

export const createTask = (input: CreateTaskInput) =>
  request<Task>('/tasks', { method: 'POST', body: JSON.stringify(input) });

export const updateColumn = (columnId: string, input: UpdateColumnInput) =>
  request<Column>(`/columns/${columnId}`, { method: 'PATCH', body: JSON.stringify(input) });

export const moveTask = (taskId: string, input: MoveTaskInput) =>
  request<Task>(`/tasks/${taskId}/move`, { method: 'POST', body: JSON.stringify(input) });

export const updateTask = (taskId: string, input: Record<string, unknown>) =>
  request<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(input) });

export const archiveTask = (taskId: string, expectedVersion: number) =>
  request<Task>(`/tasks/${taskId}/archive`, {
    method: 'POST',
    body: JSON.stringify({ expectedVersion }),
  });

export const restoreTask = (taskId: string, expectedVersion: number) =>
  request<Task>(`/tasks/${taskId}/restore`, {
    method: 'POST',
    body: JSON.stringify({ expectedVersion }),
  });
