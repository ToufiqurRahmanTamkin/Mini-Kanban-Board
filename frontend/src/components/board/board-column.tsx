'use client';

import clsx from 'clsx';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Column, Task } from '@/types';
import { TaskCard } from './task-card';

export function BoardColumn({
  column,
  index,
  canEdit,
  onRename,
  onDelete,
  onCreateTask,
  onEditTask,
  onDeleteTask,
}: {
  column: Column;
  index: number;
  canEdit: boolean;
  onRename: (columnId: string, title: string) => Promise<void>;
  onDelete: (column: Column) => void;
  onCreateTask: (columnId: string, title: string) => Promise<void>;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(column.title);
  const [addingTask, setAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const taskInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraftTitle(column.title);
  }, [column.title]);

  useEffect(() => {
    if (renaming) renameInputRef.current?.select();
  }, [renaming]);

  useEffect(() => {
    if (addingTask) taskInputRef.current?.focus();
  }, [addingTask]);

  async function commitRename() {
    const next = draftTitle.trim();
    setRenaming(false);

    if (!next || next === column.title) {
      setDraftTitle(column.title);
      return;
    }

    await onRename(column.id, next);
  }

  async function submitTask(event: FormEvent) {
    event.preventDefault();

    const title = taskTitle.trim();
    if (!title) return;

    setBusy(true);
    try {
      await onCreateTask(column.id, title);
      setTaskTitle('');
      taskInputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitTask(event);
    }

    if (event.key === 'Escape') {
      setAddingTask(false);
      setTaskTitle('');
    }
  }

  return (
    <Draggable draggableId={column.id} index={index} isDragDisabled={!canEdit}>
      {(provided, snapshot) => (
        <section
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={clsx(
            'flex max-h-full w-72 shrink-0 flex-col rounded-xl bg-slate-200/70',
            snapshot.isDragging && 'shadow-lifted',
          )}
          style={provided.draggableProps.style}
        >
          <header
            {...provided.dragHandleProps}
            className={clsx(
              'flex items-center gap-2 rounded-t-xl px-3 py-2.5',
              canEdit && 'cursor-grab active:cursor-grabbing',
            )}
          >
            {renaming ? (
              <input
                ref={renameInputRef}
                className="field h-8 py-1 text-sm font-semibold"
                value={draftTitle}
                maxLength={80}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={() => void commitRename()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void commitRename();
                  if (event.key === 'Escape') {
                    setDraftTitle(column.title);
                    setRenaming(false);
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-slate-700"
                onClick={() => canEdit && setRenaming(true)}
                title={canEdit ? 'Click to rename' : column.title}
                disabled={!canEdit}
              >
                {column.title}
              </button>
            )}

            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
              {column.tasks.length}
            </span>

            {canEdit && !renaming ? (
              <button
                type="button"
                className="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                onClick={() => onDelete(column)}
                aria-label={`Delete column ${column.title}`}
                title="Delete column"
              >
                ✕
              </button>
            ) : null}
          </header>

          <Droppable
            droppableId={column.id}
            type="TASK"
            isDropDisabled={!canEdit}
          >
            {(dropProvided, dropSnapshot) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className={clsx(
                  'flex-1 space-y-2 overflow-y-auto px-2 pb-2 transition-colors',
                  dropSnapshot.isDraggingOver && 'bg-brand-100/60',
                  column.tasks.length === 0 && 'min-h-[60px]',
                )}
              >
                {column.tasks.map((task, taskIndex) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={taskIndex}
                    canEdit={canEdit}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                  />
                ))}

                {dropProvided.placeholder}

                {column.tasks.length === 0 && !dropSnapshot.isDraggingOver ? (
                  <p className="px-1 py-3 text-center text-xs text-slate-400">
                    No tasks yet
                  </p>
                ) : null}
              </div>
            )}
          </Droppable>

          {canEdit ? (
            <div className="px-2 pb-2">
              {addingTask ? (
                <form onSubmit={submitTask} className="space-y-2">
                  <textarea
                    ref={taskInputRef}
                    className="field min-h-[64px] resize-y text-sm"
                    value={taskTitle}
                    maxLength={200}
                    placeholder="What needs doing?"
                    onChange={(event) => setTaskTitle(event.target.value)}
                    onKeyDown={onComposerKeyDown}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="btn-primary px-3 py-1.5 text-xs"
                      disabled={busy || taskTitle.trim().length === 0}
                    >
                      {busy ? 'Adding…' : 'Add task'}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-3 py-1.5 text-xs"
                      onClick={() => {
                        setAddingTask(false);
                        setTaskTitle('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="w-full rounded-lg px-2 py-2 text-left text-sm text-slate-500 hover:bg-white/70 hover:text-slate-700"
                  onClick={() => setAddingTask(true)}
                >
                  + Add a task
                </button>
              )}
            </div>
          ) : null}
        </section>
      )}
    </Draggable>
  );
}
