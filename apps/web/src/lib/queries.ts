import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  archiveTask,
  createTask,
  getOrCreateBoard,
  moveTask,
  restoreTask,
  updateColumn,
  updateTask,
  type Board,
  type MoveTaskInput,
  type UpdateColumnInput,
} from './api';

export const boardQueryKey = (_boardId?: string) => ['board'] as const;

export function useBoard() {
  return useQuery({
    queryKey: boardQueryKey(),
    queryFn: getOrCreateBoard,
    staleTime: 10_000,
  });
}

export function useBoardActions(board: Board | undefined) {
  const queryClient = useQueryClient();
  const boardId = board?.id;
  const invalidate = () =>
    boardId && queryClient.invalidateQueries({ queryKey: boardQueryKey(boardId) });

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: invalidate,
  });
  const updateColumnMutation = useMutation({
    mutationFn: ({ columnId, input }: { columnId: string; input: UpdateColumnInput }) =>
      updateColumn(columnId, input),
    onSuccess: invalidate,
  });
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: Record<string, unknown> }) =>
      updateTask(taskId, input),
    onSuccess: invalidate,
  });
  const archiveTaskMutation = useMutation({
    mutationFn: ({ taskId, expectedVersion }: { taskId: string; expectedVersion: number }) =>
      archiveTask(taskId, expectedVersion),
    onSuccess: invalidate,
  });
  const restoreTaskMutation = useMutation({
    mutationFn: ({ taskId, expectedVersion }: { taskId: string; expectedVersion: number }) =>
      restoreTask(taskId, expectedVersion),
    onSuccess: invalidate,
  });
  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: MoveTaskInput }) =>
      moveTask(taskId, input),
    onMutate: async ({ taskId, input }) => {
      if (!boardId) return undefined;
      await queryClient.cancelQueries({ queryKey: boardQueryKey(boardId) });
      const key = boardQueryKey(boardId);
      const previous = queryClient.getQueryData<Board>(key);
      if (!previous) return { previous };
      queryClient.setQueryData<Board>(key, (current) => {
        if (!current) return current;
        let moved = current.columns
          .flatMap((column) => column.tasks)
          .find((task) => task.id === taskId);
        if (!moved) return current;
        const columns = current.columns.map((column) => ({
          ...column,
          tasks: column.tasks.filter((task) => task.id !== taskId),
        }));
        const target = columns.find((column) => column.id === input.targetColumnId);
        if (!target) return current;
        moved = {
          ...moved,
          columnId: target.id,
          position: (target.tasks.at(-1)?.position ?? 0) + 1024,
        };
        target.tasks = [...target.tasks, moved];
        return { ...current, columns };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (boardId && context?.previous)
        queryClient.setQueryData(boardQueryKey(boardId), context.previous);
    },
    onSettled: invalidate,
  });

  return {
    createTask: createTaskMutation,
    updateColumn: updateColumnMutation,
    updateTask: updateTaskMutation,
    archiveTask: archiveTaskMutation,
    restoreTask: restoreTaskMutation,
    moveTask: moveTaskMutation,
  };
}

export function invalidateBoard(queryClient: QueryClient, boardId: string) {
  return queryClient.invalidateQueries({ queryKey: boardQueryKey(boardId) });
}
