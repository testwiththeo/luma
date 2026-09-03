import {
  columnNotInBoard,
  ConflictError,
  NotFoundError,
  POSITION_GAP,
  positionBetween,
  rebalance,
  requiresWipConfirmation,
  staleVersion,
  ValidationError,
  wipConfirmationRequired,
  titleRequired,
} from '@luma/domain';
import type { AppRepositories, BoardAggregate, ColumnRecord, TaskRecord } from '@luma/domain';
import type { Priority, StatusType, TaskType } from '@luma/contracts';

export type { AppRepositories, BoardAggregate, TaskRecord } from '@luma/domain';

const DEFAULT_COLUMNS: Array<{ statusType: StatusType; name: string }> = [
  { statusType: 'inbox', name: 'Inbox' },
  { statusType: 'ready', name: 'Ready' },
  { statusType: 'in_progress', name: 'In Progress' },
  { statusType: 'blocked', name: 'Blocked' },
  { statusType: 'done', name: 'Done' },
];

export function createBoard(
  repos: AppRepositories,
  input: { title: string; description?: string | null },
  deps: { id: () => string; now: () => number },
): BoardAggregate {
  const title = input.title.trim();
  if (!title) throw titleRequired();
  return repos.withTransaction(() => {
    const now = deps.now();
    const board = repos.boards.create({
      id: deps.id(),
      title,
      description: input.description ?? null,
      now,
    });
    repos.columns.createDefaults(board.id, now);
    return getBoard(repos, board.id);
  });
}

export function createTask(
  repos: AppRepositories,
  input: {
    boardId: string;
    columnId: string;
    title: string;
    description?: string | null;
    priority?: Priority;
    taskType?: TaskType;
  },
  deps: { id: () => string; now: () => number },
): TaskRecord {
  const title = input.title.trim();
  if (!title) throw titleRequired();
  return repos.withTransaction(() => {
    if (!repos.boards.get(input.boardId)) throw new NotFoundError('Board');
    const column = repos.columns.get(input.columnId);
    if (!column) throw new NotFoundError('Column');
    if (column.boardId !== input.boardId) throw columnNotInBoard();
    const columnTasks = repos.tasks
      .listByBoard(input.boardId)
      .filter((task) => task.columnId === input.columnId)
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    const position = positionBetween(columnTasks.at(-1)?.position ?? null, null);
    if (position === null) throw new ValidationError('Unable to allocate task position.');
    return repos.tasks.create({ ...input, title, position, now: deps.now(), id: deps.id() });
  });
}

export function moveTask(
  repos: AppRepositories,
  input: {
    taskId: string;
    targetColumnId: string;
    beforeTaskId?: string | null;
    afterTaskId?: string | null;
    expectedVersion: number;
    confirmWipOverflow?: boolean;
  },
  deps: { now: () => number },
): TaskRecord {
  return repos.withTransaction(() => {
    const task = repos.tasks.get(input.taskId);
    if (!task) throw new NotFoundError('Task');
    if (task.version !== input.expectedVersion) throw staleVersion();

    const targetColumn = repos.columns.get(input.targetColumnId);
    if (!targetColumn) throw new NotFoundError('Column');
    if (targetColumn.boardId !== task.boardId) throw columnNotInBoard();

    const targetTasks = repos.tasks
      .listByBoard(task.boardId)
      .filter((candidate) => candidate.columnId === targetColumn.id && candidate.id !== task.id)
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    const currentWipCount = targetTasks.filter((candidate) => candidate.archivedAt === null).length;
    const increasesWipCount = task.columnId !== targetColumn.id && task.archivedAt === null;
    if (
      requiresWipConfirmation({
        limit: targetColumn.wipLimit,
        currentCount: currentWipCount,
        increasesCount: increasesWipCount,
      }) &&
      !input.confirmWipOverflow
    ) {
      throw wipConfirmationRequired(targetColumn.wipLimit!, currentWipCount);
    }

    const before = input.beforeTaskId
      ? targetTasks.find((candidate) => candidate.id === input.beforeTaskId)
      : undefined;
    const after = input.afterTaskId
      ? targetTasks.find((candidate) => candidate.id === input.afterTaskId)
      : undefined;

    if (input.beforeTaskId && !before) throw new NotFoundError('Neighbor task');
    if (input.afterTaskId && !after) throw new NotFoundError('Neighbor task');
    if (before && after) {
      const beforeIndex = targetTasks.indexOf(before);
      if (targetTasks.indexOf(after) !== beforeIndex + 1) {
        throw new ValidationError('Before and after tasks must be adjacent.');
      }
    }

    const insertionIndex = after
      ? targetTasks.indexOf(after)
      : before
        ? targetTasks.indexOf(before) + 1
        : targetTasks.length;
    const ordered = [...targetTasks];
    ordered.splice(insertionIndex, 0, task);
    const previous = ordered[insertionIndex - 1];
    const next = ordered[insertionIndex + 1];
    const position = positionBetween(previous?.position ?? null, next?.position ?? null);

    if (position !== null) {
      const updated = repos.tasks.updatePosition({
        id: task.id,
        columnId: targetColumn.id,
        position,
        expectedVersion: input.expectedVersion,
        now: deps.now(),
      });
      if (!updated) throw staleVersion();
      return updated;
    }

    const affected = task.columnId === targetColumn.id ? ordered : targetTasks;
    const maximum = Math.max(task.position, ...affected.map((candidate) => candidate.position));
    const temporaryBase = maximum + POSITION_GAP * (affected.length + 2);
    affected.forEach((candidate, index) =>
      repos.tasks.setPosition(candidate.id, temporaryBase + index),
    );

    const finalPositions = rebalance(ordered.length);
    for (const [index, candidate] of ordered.entries()) {
      const finalPosition = finalPositions[index];
      if (finalPosition === undefined)
        throw new ValidationError('Unable to allocate task positions.');
      if (candidate.id !== task.id) repos.tasks.setPosition(candidate.id, finalPosition);
    }
    const movedPosition = finalPositions[insertionIndex];
    if (movedPosition === undefined) throw new ValidationError('Unable to allocate task position.');
    const updated = repos.tasks.updatePosition({
      id: task.id,
      columnId: targetColumn.id,
      position: movedPosition,
      expectedVersion: input.expectedVersion,
      now: deps.now(),
    });
    if (!updated) throw staleVersion();
    return updated;
  });
}

export function updateColumn(
  repos: AppRepositories,
  input: {
    columnId: string;
    name?: string;
    wipLimit?: number | null;
    beforeColumnId?: string | null;
    afterColumnId?: string | null;
  },
  deps: { now: () => number },
): ColumnRecord {
  return repos.withTransaction(() => {
    const column = repos.columns.get(input.columnId);
    if (!column) throw new NotFoundError('Column');

    const name = input.name?.trim();
    if (input.name !== undefined && !name) throw new ValidationError('Column name is required.');
    if (
      input.wipLimit !== undefined &&
      input.wipLimit !== null &&
      (!Number.isInteger(input.wipLimit) || input.wipLimit < 0)
    ) {
      throw new ValidationError('WIP limit must be a non-negative integer or null.');
    }

    const reorderRequested =
      input.beforeColumnId !== undefined || input.afterColumnId !== undefined;
    let position = column.position;
    if (reorderRequested) {
      const siblings = repos.columns
        .listByBoard(column.boardId)
        .filter((candidate) => candidate.id !== column.id)
        .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
      const before = input.beforeColumnId
        ? siblings.find((candidate) => candidate.id === input.beforeColumnId)
        : undefined;
      const after = input.afterColumnId
        ? siblings.find((candidate) => candidate.id === input.afterColumnId)
        : undefined;
      if (input.beforeColumnId && !before) throw new NotFoundError('Neighbor column');
      if (input.afterColumnId && !after) throw new NotFoundError('Neighbor column');
      if (before && after && siblings.indexOf(after) !== siblings.indexOf(before) + 1) {
        throw new ValidationError('Before and after columns must be adjacent.');
      }
      const insertionIndex = after
        ? siblings.indexOf(after)
        : before
          ? siblings.indexOf(before) + 1
          : siblings.length;
      const ordered = [...siblings];
      ordered.splice(insertionIndex, 0, column);
      const temporaryBase =
        Math.max(column.position, ...siblings.map((candidate) => candidate.position)) + 10;
      ordered.forEach((candidate, index) =>
        repos.columns.setPosition(candidate.id, temporaryBase + index),
      );
      ordered.forEach((candidate, index) => {
        if (candidate.id !== column.id) repos.columns.setPosition(candidate.id, index);
      });
      position = insertionIndex;
    }

    const updated = repos.columns.update({
      id: column.id,
      name,
      wipLimit: input.wipLimit,
      position,
      now: deps.now(),
    });
    if (!updated) throw new NotFoundError('Column');
    return updated;
  });
}

export function updateTask(
  repos: AppRepositories,
  input: {
    taskId: string;
    expectedVersion: number;
    title?: string;
    description?: string | null;
    priority?: Priority;
    taskType?: TaskType;
    dueDate?: number | null;
  },
  deps: { now: () => number },
): TaskRecord {
  return repos.withTransaction(() => {
    const task = repos.tasks.get(input.taskId);
    if (!task) throw new NotFoundError('Task');
    if (task.version !== input.expectedVersion) throw staleVersion();
    const title = input.title === undefined ? undefined : input.title.trim();
    if (input.title !== undefined && !title) throw titleRequired();
    if (
      input.dueDate !== undefined &&
      input.dueDate !== null &&
      (!Number.isInteger(input.dueDate) || input.dueDate < 0)
    ) {
      throw new ValidationError('Due date must be a non-negative epoch timestamp or null.');
    }
    const updated = repos.tasks.update({
      ...input,
      id: input.taskId,
      title,
      now: deps.now(),
    });
    if (!updated) throw staleVersion();
    return updated;
  });
}

export function archiveTask(
  repos: AppRepositories,
  input: { taskId: string; expectedVersion: number },
  deps: { now: () => number },
): TaskRecord {
  return repos.withTransaction(() => {
    const task = repos.tasks.get(input.taskId);
    if (!task) throw new NotFoundError('Task');
    if (task.version !== input.expectedVersion) throw staleVersion();
    if (task.archivedAt !== null) throw new ConflictError('Task is already archived.');
    const updated = repos.tasks.update({
      id: task.id,
      expectedVersion: input.expectedVersion,
      archivedAt: deps.now(),
      now: deps.now(),
    });
    if (!updated) throw staleVersion();
    return updated;
  });
}

export function restoreTask(
  repos: AppRepositories,
  input: { taskId: string; expectedVersion: number },
  deps: { now: () => number },
): TaskRecord {
  return repos.withTransaction(() => {
    const task = repos.tasks.get(input.taskId);
    if (!task) throw new NotFoundError('Task');
    if (task.version !== input.expectedVersion) throw staleVersion();
    if (task.archivedAt === null) throw new ConflictError('Task is already active.');
    const occupying = repos.tasks
      .listByBoard(task.boardId)
      .some(
        (candidate) =>
          candidate.id !== task.id &&
          candidate.columnId === task.columnId &&
          candidate.position === task.position,
      );
    const columnTasks = repos.tasks
      .listByBoard(task.boardId)
      .filter((candidate) => candidate.columnId === task.columnId && candidate.id !== task.id)
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    const position = occupying
      ? positionBetween(columnTasks.at(-1)?.position ?? null, null)
      : task.position;
    if (position === null) throw new ValidationError('Unable to allocate a restore position.');
    const updated = repos.tasks.update({
      id: task.id,
      expectedVersion: input.expectedVersion,
      archivedAt: null,
      position,
      now: deps.now(),
    });
    if (!updated) throw staleVersion();
    return updated;
  });
}

export function getBoard(repos: AppRepositories, boardId: string): BoardAggregate {
  const board = repos.boards.get(boardId);
  if (!board) throw new NotFoundError('Board');
  const tasks = repos.tasks.listByBoard(boardId).filter((task) => task.archivedAt === null);
  return {
    ...board,
    columns: repos.columns.listByBoard(boardId).map((column) => ({
      ...column,
      tasks: tasks
        .filter((task) => task.columnId === column.id)
        .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
    })),
  };
}

export { DEFAULT_COLUMNS };
