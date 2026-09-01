import type { Priority, StatusType, TaskType } from '@luma/contracts';

export interface BoardRecord {
  id: string;
  title: string;
  description: string | null;
  version: number;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}
export interface ColumnRecord {
  id: string;
  boardId: string;
  statusType: StatusType;
  name: string;
  position: number;
  wipLimit: number | null;
  version: number;
  createdAt: number;
  updatedAt: number;
}
export interface TaskRecord {
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
}
export interface BoardAggregate extends BoardRecord {
  columns: Array<ColumnRecord & { tasks: TaskRecord[] }>;
}
export interface BoardRepository {
  create(input: {
    id: string;
    title: string;
    description?: string | null;
    now: number;
  }): BoardRecord;
  get(id: string): BoardRecord | null;
}
export interface ColumnRepository {
  createDefaults(boardId: string, now: number): ColumnRecord[];
  listByBoard(boardId: string): ColumnRecord[];
  get(id: string): ColumnRecord | null;
  update(input: {
    id: string;
    name?: string;
    wipLimit?: number | null;
    position?: number;
    now: number;
  }): ColumnRecord | null;
  setPosition(id: string, position: number): void;
}
export interface TaskRepository {
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
  }): TaskRecord;
  get(id: string): TaskRecord | null;
  listByBoard(boardId: string): TaskRecord[];
  updatePosition(input: {
    id: string;
    columnId: string;
    position: number;
    expectedVersion: number;
    now: number;
  }): TaskRecord | null;
  setPosition(id: string, position: number): void;
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
  }): TaskRecord | null;
}
export interface AppRepositories {
  boards: BoardRepository;
  columns: ColumnRepository;
  tasks: TaskRepository;
  withTransaction<T>(work: () => T): T;
}
