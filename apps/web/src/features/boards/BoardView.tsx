import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import type { Board, Task, MoveTaskInput } from '../../lib/api';
import { ApiError } from '../../lib/api';
import type { useBoardActions } from '../../lib/queries';
import { ColumnSettings } from '../columns/ColumnSettings';

type Actions = ReturnType<typeof useBoardActions>;
type PendingMove = { taskId: string; title: string; input: MoveTaskInput };

function movementInput(
  board: Board,
  task: Task,
  targetColumnId: string,
  targetIndex: number,
): MoveTaskInput {
  const target = board.columns.find((column) => column.id === targetColumnId);
  const targetTasks = target?.tasks.filter((candidate) => candidate.id !== task.id) ?? [];
  const beforeTask = targetTasks[targetIndex - 1];
  const afterTask = targetTasks[targetIndex];
  return {
    targetColumnId,
    beforeTaskId: beforeTask?.id ?? null,
    afterTaskId: afterTask?.id ?? null,
    expectedVersion: task.version,
  };
}

function dropMovementInput(
  board: Board,
  draggedTask: Task,
  targetColumnId: string,
  targetNeighborTaskId: string | null,
  dropPosition: 'before' | 'after' | 'end' | 'empty',
): MoveTaskInput {
  const targetCol = board.columns.find((c) => c.id === targetColumnId);
  const targetTasks = targetCol?.tasks.filter((t) => t.id !== draggedTask.id) ?? [];

  if (targetTasks.length === 0 || dropPosition === 'empty') {
    return {
      targetColumnId,
      beforeTaskId: null,
      afterTaskId: null,
      expectedVersion: draggedTask.version,
    };
  }

  if (dropPosition === 'end' || !targetNeighborTaskId) {
    const lastTask = targetTasks[targetTasks.length - 1];
    return {
      targetColumnId,
      beforeTaskId: lastTask?.id ?? null,
      afterTaskId: null,
      expectedVersion: draggedTask.version,
    };
  }

  const neighborIndex = targetTasks.findIndex((t) => t.id === targetNeighborTaskId);
  if (neighborIndex === -1) {
    const lastTask = targetTasks[targetTasks.length - 1];
    return {
      targetColumnId,
      beforeTaskId: lastTask?.id ?? null,
      afterTaskId: null,
      expectedVersion: draggedTask.version,
    };
  }

  if (dropPosition === 'before') {
    const beforeTask = targetTasks[neighborIndex - 1];
    const afterTask = targetTasks[neighborIndex];
    return {
      targetColumnId,
      beforeTaskId: beforeTask?.id ?? null,
      afterTaskId: afterTask?.id ?? null,
      expectedVersion: draggedTask.version,
    };
  } else {
    const beforeTask = targetTasks[neighborIndex];
    const afterTask = targetTasks[neighborIndex + 1];
    return {
      targetColumnId,
      beforeTaskId: beforeTask?.id ?? null,
      afterTaskId: afterTask?.id ?? null,
      expectedVersion: draggedTask.version,
    };
  }
}

function TaskCard({
  board,
  columnIndex,
  task,
  taskIndex,
  actions,
  onMoveError,
  cardRef,
  isDragging,
  dropTargetPosition,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  board: Board;
  columnIndex: number;
  task: Task;
  taskIndex: number;
  actions: Actions;
  onMoveError: (error: unknown, input: MoveTaskInput, task: Task) => void;
  cardRef: (element: HTMLElement | null) => void;
  isDragging?: boolean;
  dropTargetPosition?: 'before' | 'after' | null;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  onDragEnd?: (event: DragEvent<HTMLElement>) => void;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
}) {
  const currentColumn = board.columns[columnIndex];
  const move = actions.moveTask;
  if (!currentColumn) return null;
  const activeColumn = currentColumn;

  function moveTo(targetColumnId: string, targetIndex: number) {
    const input = movementInput(board, task, targetColumnId, targetIndex);
    move.mutate(
      { taskId: task.id, input },
      {
        onSuccess: () =>
          requestAnimationFrame(() => document.getElementById(`task-${task.id}`)?.focus()),
        onError: (error) => onMoveError(error, input, task),
      },
    );
  }

  function moveWithinColumn(delta: -1 | 1) {
    const nextIndex = taskIndex + delta;
    if (nextIndex < 0 || nextIndex >= activeColumn.tasks.length) return;
    moveTo(activeColumn.id, nextIndex);
  }

  function moveAcrossColumn(delta: -1 | 1) {
    const targetColumn = board.columns[columnIndex + delta];
    if (!targetColumn) return;
    moveTo(targetColumn.id, targetColumn.tasks.length);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const handlers: Record<string, () => void> = {
      ArrowUp: () => moveWithinColumn(-1),
      ArrowDown: () => moveWithinColumn(1),
      ArrowLeft: () => moveAcrossColumn(-1),
      ArrowRight: () => moveAcrossColumn(1),
    };
    const handler = handlers[event.key];
    if (!handler) return;
    event.preventDefault();
    handler();
  }

  return (
    <article
      id={`task-${task.id}`}
      className={`task-card ${isDragging ? 'is-dragging' : ''} ${dropTargetPosition ? `drop-${dropTargetPosition}` : ''}`}
      key={task.id}
      tabIndex={0}
      ref={cardRef}
      onKeyDown={onKeyDown}
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-label={`${task.title}, ${activeColumn.name}, ${task.priority} priority. Draggable. Use arrow keys to move.`}
    >
      <div className="task-meta">
        <span className={`priority ${task.priority}`}>{task.priority}</span>
        <span className="task-type">{task.taskType.replace('_', ' ')}</span>
      </div>
      <h3>{task.title}</h3>
      <footer>
        <span className="task-check" aria-hidden="true" /> <span>Task</span>
        <details className="card-menu-wrap">
          <summary className="card-menu" aria-label={`Move ${task.title}`}>
            •••
          </summary>
          <div className="move-menu" aria-label={`Move controls for ${task.title}`}>
            <button type="button" onClick={() => moveAcrossColumn(-1)} disabled={columnIndex === 0}>
              Move left
            </button>
            <button
              type="button"
              onClick={() => moveAcrossColumn(1)}
              disabled={columnIndex === board.columns.length - 1}
            >
              Move right
            </button>
            <button type="button" onClick={() => moveWithinColumn(-1)} disabled={taskIndex === 0}>
              Move up
            </button>
            <button
              type="button"
              onClick={() => moveWithinColumn(1)}
              disabled={taskIndex === activeColumn.tasks.length - 1}
            >
              Move down
            </button>
          </div>
        </details>
      </footer>
    </article>
  );
}

export function BoardView({ board, actions }: { board: Board; actions: Actions }) {
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [status, setStatus] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    columnId: string;
    neighborTaskId: string | null;
    position: 'before' | 'after' | 'end' | 'empty';
  } | null>(null);

  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  function handleMoveError(error: unknown, input: MoveTaskInput, task?: Task) {
    if (error instanceof ApiError && error.code === 'WIP_CONFIRMATION_REQUIRED') {
      if (task) {
        setPendingMove({ taskId: task.id, title: task.title, input });
        setStatus('This move needs confirmation because it exceeds the target column WIP limit.');
      }
      return;
    }
    setStatus(error instanceof Error ? error.message : 'The task could not be moved.');
  }

  function confirmMove() {
    if (!pendingMove) return;
    actions.moveTask.mutate(
      { taskId: pendingMove.taskId, input: { ...pendingMove.input, confirmWipOverflow: true } },
      {
        onSuccess: () => {
          setPendingMove(null);
          setStatus('Task moved with WIP overflow confirmed.');
          requestAnimationFrame(() => cardRefs.current[pendingMove.taskId]?.focus());
        },
        onError: (error) => handleMoveError(error, pendingMove.input),
      },
    );
  }

  function handleDragStart(event: DragEvent<HTMLElement>, task: Task) {
    event.dataTransfer.setData('text/plain', task.id);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(task.id);
  }

  function handleDragEnd() {
    setDraggedTaskId(null);
    setDragOverColumnId(null);
    setDropTarget(null);
  }

  function handleCardDragOver(
    event: DragEvent<HTMLElement>,
    targetColumnId: string,
    targetTask: Task,
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setDragOverColumnId(targetColumnId);

    if (draggedTaskId === targetTask.id) {
      setDropTarget(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const isBottomHalf = event.clientY - rect.top > rect.height / 2;
    const position = isBottomHalf ? 'after' : 'before';

    setDropTarget({
      columnId: targetColumnId,
      neighborTaskId: targetTask.id,
      position,
    });
  }

  function handleColumnDragOver(event: DragEvent<HTMLElement>, columnId: string, isEmpty: boolean) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverColumnId(columnId);

    if (isEmpty) {
      setDropTarget({
        columnId,
        neighborTaskId: null,
        position: 'empty',
      });
    } else {
      setDropTarget({
        columnId,
        neighborTaskId: null,
        position: 'end',
      });
    }
  }

  function handleColumnDragLeave(event: DragEvent<HTMLElement>, columnId: string) {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    if (dragOverColumnId === columnId) {
      setDragOverColumnId(null);
      setDropTarget(null);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>, targetColumnId: string) {
    event.preventDefault();
    event.stopPropagation();

    const taskId = event.dataTransfer.getData('text/plain') || draggedTaskId;
    const targetState = dropTarget;

    setDraggedTaskId(null);
    setDragOverColumnId(null);
    setDropTarget(null);

    if (!taskId) return;

    const task = board.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    if (!task) return;

    const neighborId = targetState?.columnId === targetColumnId ? targetState.neighborTaskId : null;
    const pos = targetState?.columnId === targetColumnId ? targetState.position : 'end';

    // If dropped directly onto itself without movement, skip
    if (task.columnId === targetColumnId && neighborId === task.id) return;

    const input = dropMovementInput(board, task, targetColumnId, neighborId, pos);

    actions.moveTask.mutate(
      { taskId: task.id, input },
      {
        onSuccess: () => {
          setStatus(
            `Moved ${task.title} to ${board.columns.find((c) => c.id === targetColumnId)?.name ?? 'column'}.`,
          );
          requestAnimationFrame(() => cardRefs.current[task.id]?.focus());
        },
        onError: (error) => handleMoveError(error, input, task),
      },
    );
  }

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>
      {pendingMove && (
        <div
          className="move-confirmation"
          role="alertdialog"
          aria-labelledby="wip-confirmation-title"
        >
          <strong id="wip-confirmation-title">Move beyond WIP limit?</strong>
          <span>{pendingMove.title} will exceed the target column limit.</span>
          <div>
            <button type="button" onClick={confirmMove} disabled={actions.moveTask.isPending}>
              {actions.moveTask.isPending ? 'Moving…' : 'Confirm move'}
            </button>
            <button type="button" onClick={() => setPendingMove(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <section className="board" aria-label="Kanban board">
        {board.columns.map((column, columnIndex) => {
          const isOverColumn = dragOverColumnId === column.id;
          return (
            <div
              className={`column ${isOverColumn ? 'is-drag-over' : ''}`}
              key={column.id}
              onDragOver={(e) => handleColumnDragOver(e, column.id, column.tasks.length === 0)}
              onDragLeave={(e) => handleColumnDragLeave(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="column-header">
                <div>
                  <span className="column-dot" data-status={column.statusType} aria-hidden="true" />
                  <h2>{column.name}</h2>
                  <span
                    className="count"
                    aria-label={`${column.tasks.length}${column.wipLimit === null ? '' : ` of ${column.wipLimit}`} tasks`}
                  >
                    {column.wipLimit === null
                      ? column.tasks.length
                      : `${column.tasks.length} / ${column.wipLimit}`}
                  </span>
                </div>
                <ColumnSettings column={column} actions={actions} />
              </div>
              <div
                className="task-list"
                onDragOver={(e) => handleColumnDragOver(e, column.id, column.tasks.length === 0)}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {column.tasks.map((task, taskIndex) => {
                  const isDraggingThis = draggedTaskId === task.id;
                  const isTarget =
                    dropTarget?.columnId === column.id && dropTarget?.neighborTaskId === task.id;
                  const targetPos = isTarget ? dropTarget.position : null;

                  return (
                    <TaskCard
                      key={task.id}
                      board={board}
                      columnIndex={columnIndex}
                      task={task}
                      taskIndex={taskIndex}
                      actions={actions}
                      onMoveError={handleMoveError}
                      cardRef={(element) => {
                        cardRefs.current[task.id] = element;
                      }}
                      isDragging={isDraggingThis}
                      dropTargetPosition={
                        targetPos === 'before' || targetPos === 'after' ? targetPos : null
                      }
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleCardDragOver(e, column.id, task)}
                      onDrop={(e) => handleDrop(e, column.id)}
                    />
                  );
                })}
                {column.tasks.length === 0 && (
                  <div
                    className={`empty ${isOverColumn ? 'is-drag-over' : ''}`}
                    onDragOver={(e) => handleColumnDragOver(e, column.id, true)}
                    onDrop={(e) => handleDrop(e, column.id)}
                  >
                    {isOverColumn ? 'Drop task here' : 'No tasks here yet'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
