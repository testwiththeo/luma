import { useState, type FormEvent } from 'react';
import type { Board } from '../../lib/api';
import type { useBoardActions } from '../../lib/queries';

type Actions = ReturnType<typeof useBoardActions>;

export function TaskCapture({ board, actions }: { board: Board; actions: Actions }) {
  const [title, setTitle] = useState('');
  const inbox = board.columns.find((column) => column.statusType === 'inbox');
  const mutation = actions.createTask;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!inbox || !title.trim() || mutation.isPending) return;
    mutation.mutate(
      { boardId: board.id, columnId: inbox.id, title },
      { onSuccess: () => setTitle('') },
    );
  }

  return (
    <form className="quick-add" onSubmit={submit} aria-label="Add a task">
      <span className="plus" aria-hidden="true">
        +
      </span>
      <label className="sr-only" htmlFor="new-task">
        New task title
      </label>
      <input
        id="new-task"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Capture a new task..."
        autoComplete="off"
        disabled={mutation.isPending}
      />
      <span className="shortcut" aria-hidden="true">
        Enter ↵
      </span>
      <button className="submit-task" type="submit" disabled={mutation.isPending || !title.trim()}>
        {mutation.isPending ? 'Adding…' : 'Add'}
      </button>
    </form>
  );
}
