import { useState, type FormEvent } from 'react';
import type { Column } from '../../lib/api';
import type { useBoardActions } from '../../lib/queries';

type Actions = ReturnType<typeof useBoardActions>;

export function ColumnSettings({ column, actions }: { column: Column; actions: Actions }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(column.name);
  const [wipLimit, setWipLimit] = useState(column.wipLimit === null ? '' : String(column.wipLimit));
  const mutation = actions.updateColumn;

  function toggle() {
    if (!open) {
      setName(column.name);
      setWipLimit(column.wipLimit === null ? '' : String(column.wipLimit));
    }
    setOpen((current) => !current);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || mutation.isPending) return;
    mutation.mutate(
      {
        columnId: column.id,
        input: { name, wipLimit: wipLimit.trim() === '' ? null : Number(wipLimit) },
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Edit ${column.name} settings`}
        aria-expanded={open}
        onClick={toggle}
      >
        •••
      </button>
      {open && (
        <form className="column-settings" onSubmit={submit} aria-label={`${column.name} settings`}>
          <label>
            Column name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} />
          </label>
          <label>
            WIP limit
            <input
              type="number"
              min="0"
              step="1"
              value={wipLimit}
              onChange={(event) => setWipLimit(event.target.value)}
              placeholder="Unlimited"
            />
          </label>
          <button
            className="submit-task"
            type="submit"
            disabled={mutation.isPending || !name.trim()}
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </>
  );
}
