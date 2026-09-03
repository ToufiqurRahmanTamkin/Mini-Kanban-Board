import type { Column, Task } from '@/types';
import { positionForDrop, positionForIndex } from './positions';

export interface TaskMove {
  taskId: string;
  sourceColumnId: string;
  destinationColumnId: string;
  destinationIndex: number;
}

export interface TaskMoveResult {
  columns: Column[];
  task: Task;
  position: number;
}

export function moveTaskLocally(
  columns: Column[],
  move: TaskMove,
): TaskMoveResult | null {
  const sourceColumn = columns.find(
    (column) => column.id === move.sourceColumnId,
  );
  const destinationColumn = columns.find(
    (column) => column.id === move.destinationColumnId,
  );

  if (!sourceColumn || !destinationColumn) return null;

  const task = sourceColumn.tasks.find((item) => item.id === move.taskId);
  if (!task) return null;

  const sourceWithoutTask = sourceColumn.tasks.filter(
    (item) => item.id !== move.taskId,
  );

  const sameColumn = move.sourceColumnId === move.destinationColumnId;
  const destinationTasks = sameColumn
    ? sourceWithoutTask
    : destinationColumn.tasks;

  const position = positionForDrop(destinationTasks, move.destinationIndex);

  const movedTask: Task = {
    ...task,
    columnId: move.destinationColumnId,
    position,
  };

  const nextDestinationTasks = [...destinationTasks];
  nextDestinationTasks.splice(move.destinationIndex, 0, movedTask);

  const nextColumns = columns.map((column) => {
    if (column.id === move.destinationColumnId) {
      return { ...column, tasks: nextDestinationTasks };
    }

    if (column.id === move.sourceColumnId) {
      return { ...column, tasks: sourceWithoutTask };
    }

    return column;
  });

  return { columns: nextColumns, task: movedTask, position };
}

export interface ColumnMoveResult {
  columns: Column[];
  position: number;
}

export function moveColumnLocally(
  columns: Column[],
  columnId: string,
  destinationIndex: number,
): ColumnMoveResult | null {
  const currentIndex = columns.findIndex((column) => column.id === columnId);
  if (currentIndex === -1) return null;

  const without = columns.filter((column) => column.id !== columnId);
  const position = positionForIndex(
    without.map((column) => column.position),
    destinationIndex,
  );

  const moved: Column = { ...columns[currentIndex], position };
  const next = [...without];
  next.splice(destinationIndex, 0, moved);

  return { columns: next, position };
}

export function replaceTask(columns: Column[], task: Task): Column[] {
  return columns.map((column) => {
    if (column.id !== task.columnId) {
      const filtered = column.tasks.filter((item) => item.id !== task.id);
      return filtered.length === column.tasks.length
        ? column
        : { ...column, tasks: filtered };
    }

    const exists = column.tasks.some((item) => item.id === task.id);

    return {
      ...column,
      tasks: exists
        ? column.tasks.map((item) => (item.id === task.id ? task : item))
        : [...column.tasks, task].sort((a, b) => a.position - b.position),
    };
  });
}

export function removeTask(columns: Column[], taskId: string): Column[] {
  return columns.map((column) =>
    column.tasks.some((task) => task.id === taskId)
      ? { ...column, tasks: column.tasks.filter((task) => task.id !== taskId) }
      : column,
  );
}
