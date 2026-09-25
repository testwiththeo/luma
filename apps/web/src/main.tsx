import { StrictMode, useEffect, useState } from 'react';
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

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('luma-theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('luma-theme', theme);
  }, [theme]);

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
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <span className="status-dot" aria-hidden="true" /> <span>Local workspace</span>{' '}
          <button className="avatar" type="button" aria-label="Open profile">
            T
          </button>
        </div>
      </header>
      <main className="content">
        <h1 className="sr-only">{board.title}</h1>
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
