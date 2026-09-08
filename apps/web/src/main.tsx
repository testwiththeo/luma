import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BoardView } from './features/boards/BoardView';
import { TaskCapture } from './features/tasks/TaskCapture';
import { useBoard, useBoardActions } from './lib/queries';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function App() {
  const boardQuery = useBoard();
  const actions = useBoardActions(boardQuery.data);
  const mutationError = [
    actions.createTask.error,
    actions.updateColumn.error,
    actions.updateTask.error,
    actions.archiveTask.error,
    actions.restoreTask.error,
    actions.moveTask.error,
  ].find(Boolean);
  const error = boardQuery.error ?? mutationError;

  if (boardQuery.isPending)
    return (
      <div className="state" role="status">
        Loading your workspace...
      </div>
    );
  if (error && !boardQuery.data)
    return (
      <div className="state error" role="alert">
        {error instanceof Error ? error.message : 'Unable to load board.'}
      </div>
    );
  if (!boardQuery.data) return null;

  const board = boardQuery.data;
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">
          <span className="mark" aria-hidden="true">
            ✦
          </span>{' '}
          luma
        </div>
        <div className="top-actions">
          <span className="status-dot" aria-hidden="true" /> <span>Local workspace</span>{' '}
          <button className="avatar" type="button" aria-label="Open profile">
            T
          </button>
        </div>
      </header>
      <main className="content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">PERSONAL WORKSPACE / TODAY</p>
            <h1>{board.title}</h1>
            <p className="subtitle">{board.description}</p>
          </div>
          <button
            className="primary"
            type="button"
            onClick={() => document.getElementById('new-task')?.focus()}
          >
            + Add task
          </button>
        </div>
        <TaskCapture board={board} actions={actions} />
        {error && (
          <p className="inline-error" role="alert">
            {error instanceof Error ? error.message : 'The last action could not be completed.'}
          </p>
        )}
        <BoardView board={board} actions={actions} />
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
