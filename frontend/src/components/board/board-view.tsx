'use client';

import {
  DragDropContext,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import * as boardApi from '@/lib/api';
import { getErrorMessage } from '@/lib/api-client';
import {
  moveColumnLocally,
  moveTaskLocally,
  removeTask,
  replaceTask,
} from '@/lib/board-state';
import type { BoardDetail, Column, Task } from '@/types';
import { BoardColumn } from './board-column';
import { TaskEditorModal } from './task-editor-modal';

export function BoardView({
  board,
  canEdit,
  onColumnsChange,
  onError,
  reload,
}: {
  board: BoardDetail;
  canEdit: boolean;
  onColumnsChange: (columns: Column[]) => void;
  onError: (message: string | null) => void;
  reload: () => Promise<void>;
}) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnTitle, setColumnTitle] = useState('');
  const [creatingColumn, setCreatingColumn] = useState(false);

  const columnsRef = useRef(board.columns);
  columnsRef.current = board.columns;

  const applyColumns = useCallback(
    (columns: Column[]) => onColumnsChange(columns),
    [onColumnsChange],
  );

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId, type } = result;

      if (!destination) return;

      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      if (!canEdit) return;

      const snapshot = columnsRef.current;
      onError(null);

      if (type === 'COLUMN') {
        const next = moveColumnLocally(snapshot, draggableId, destination.index);
        if (!next) return;

        applyColumns(next.columns);

        try {
          const response = await boardApi.moveColumn(
            draggableId,
            next.position,
          );

          if (response.rebalanced) await reload();
        } catch (caught) {
          applyColumns(snapshot);
          onError(getErrorMessage(caught, 'Could not move that column.'));
        }

        return;
      }

      const next = moveTaskLocally(snapshot, {
        taskId: draggableId,
        sourceColumnId: source.droppableId,
        destinationColumnId: destination.droppableId,
        destinationIndex: destination.index,
      });

      if (!next) return;

      applyColumns(next.columns);

      try {
        const response = await boardApi.moveTask(draggableId, {
          targetColumnId: destination.droppableId,
          targetPosition: next.position,
        });

        if (response.rebalanced) {
          await reload();
        } else {
          applyColumns(replaceTask(columnsRef.current, response.task));
        }
      } catch (caught) {
        applyColumns(snapshot);
        onError(getErrorMessage(caught, 'Could not move that task.'));
      }
    },
    [applyColumns, canEdit, onError, reload],
  );

  async function handleCreateColumn(event: FormEvent) {
    event.preventDefault();

    const title = columnTitle.trim();
    if (!title) return;

    setCreatingColumn(true);
    onError(null);

    try {
      const created = await boardApi.createColumn(board.id, { title });
      applyColumns([...columnsRef.current, { ...created, tasks: [] }]);
      setColumnTitle('');
      setAddingColumn(false);
    } catch (caught) {
      onError(getErrorMessage(caught, 'Could not create the column.'));
    } finally {
      setCreatingColumn(false);
    }
  }

  const handleRenameColumn = useCallback(
    async (columnId: string, title: string) => {
      const snapshot = columnsRef.current;
      onError(null);

      applyColumns(
        snapshot.map((column) =>
          column.id === columnId ? { ...column, title } : column,
        ),
      );

      try {
        await boardApi.renameColumn(columnId, title);
      } catch (caught) {
        applyColumns(snapshot);
        onError(getErrorMessage(caught, 'Could not rename the column.'));
      }
    },
    [applyColumns, onError],
  );

  const handleDeleteColumn = useCallback(
    async (column: Column) => {
      const confirmed = window.confirm(
        column.tasks.length > 0
          ? `Delete “${column.title}” and its ${column.tasks.length} task(s)?`
          : `Delete “${column.title}”?`,
      );
      if (!confirmed) return;

      const snapshot = columnsRef.current;
      onError(null);
      applyColumns(snapshot.filter((item) => item.id !== column.id));

      try {
        await boardApi.deleteColumn(column.id);
      } catch (caught) {
        applyColumns(snapshot);
        onError(getErrorMessage(caught, 'Could not delete the column.'));
      }
    },
    [applyColumns, onError],
  );

  const handleCreateTask = useCallback(
    async (columnId: string, title: string) => {
      onError(null);

      try {
        const task = await boardApi.createTask(columnId, { title });
        applyColumns(
          columnsRef.current.map((column) =>
            column.id === columnId
              ? { ...column, tasks: [...column.tasks, task] }
              : column,
          ),
        );
      } catch (caught) {
        onError(getErrorMessage(caught, 'Could not add the task.'));
      }
    },
    [applyColumns, onError],
  );

  const handleDeleteTask = useCallback(
    async (task: Task) => {
      const confirmed = window.confirm(`Delete “${task.title}”?`);
      if (!confirmed) return;

      const snapshot = columnsRef.current;
      onError(null);
      applyColumns(removeTask(snapshot, task.id));

      try {
        await boardApi.deleteTask(task.id);
      } catch (caught) {
        applyColumns(snapshot);
        onError(getErrorMessage(caught, 'Could not delete the task.'));
      }
    },
    [applyColumns, onError],
  );

  return (
    <>
      <DragDropContext onDragEnd={(result) => void onDragEnd(result)}>
        <Droppable
          droppableId={`board-${board.id}`}
          direction="horizontal"
          type="COLUMN"
          isDropDisabled={!canEdit}
        >
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex h-full items-start gap-3 overflow-x-auto px-4 pb-6 sm:px-6"
            >
              {board.columns.map((column, index) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  index={index}
                  canEdit={canEdit}
                  onRename={handleRenameColumn}
                  onDelete={handleDeleteColumn}
                  onCreateTask={handleCreateTask}
                  onEditTask={setEditingTask}
                  onDeleteTask={handleDeleteTask}
                />
              ))}

              {provided.placeholder}

              {canEdit ? (
                <div className="w-72 shrink-0">
                  {addingColumn ? (
                    <form
                      onSubmit={handleCreateColumn}
                      className="space-y-2 rounded-xl bg-slate-200/70 p-2"
                    >
                      <input
                        autoFocus
                        className="field text-sm"
                        value={columnTitle}
                        maxLength={80}
                        placeholder="Column name"
                        onChange={(event) => setColumnTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            setAddingColumn(false);
                            setColumnTitle('');
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="btn-primary px-3 py-1.5 text-xs"
                          disabled={
                            creatingColumn || columnTitle.trim().length === 0
                          }
                        >
                          {creatingColumn ? 'Adding…' : 'Add column'}
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-3 py-1.5 text-xs"
                          onClick={() => {
                            setAddingColumn(false);
                            setColumnTitle('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-xl border border-dashed border-slate-300 bg-white/60 px-3 py-3 text-sm font-medium text-slate-500 hover:border-brand-400 hover:text-brand-700"
                      onClick={() => setAddingColumn(true)}
                    >
                      + Add a column
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <TaskEditorModal
        task={editingTask}
        members={board.members}
        onClose={() => setEditingTask(null)}
        onSaved={(task) => applyColumns(replaceTask(columnsRef.current, task))}
      />
    </>
  );
}
