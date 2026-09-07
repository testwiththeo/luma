import { useRef, useState, type KeyboardEvent } from 'react';
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

function TaskCard({
  board,
  columnIndex,
  task,
  taskIndex,
  actions,
  onMoveError,
  cardRef,
}: {
  board: Board;
  columnIndex: number;
  task: Task;
  taskIndex: number;
  actions: Actions;
  onMoveError: (error: unknown, input: MoveTaskInput, task: Task) => void;
  cardRef: (element: HTMLElement | null) => void;
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
      className="task-card"
      key={task.id}
      tabIndex={0}
      ref={cardRef}
      onKeyDown={onKeyDown}
      aria-label={`${task.title}, ${activeColumn.name}, ${task.priority} priority. Use arrow keys to move.`}
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
        {board.columns.map((column, columnIndex) => (
          <div className="column" key={column.id}>
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
            <div className="task-list">
              {column.tasks.map((task, taskIndex) => (
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
                />
              ))}
              {column.tasks.length === 0 && <div className="empty">No tasks here yet</div>}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
