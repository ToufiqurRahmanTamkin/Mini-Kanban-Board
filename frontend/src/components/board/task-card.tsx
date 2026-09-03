'use client';

import clsx from 'clsx';
import { Draggable } from '@hello-pangea/dnd';
import type { Task } from '@/types';
import { Avatar } from '../ui';

export function TaskCard({
  task,
  index,
  canEdit,
  onEdit,
  onDelete,
}: {
  task: Task;
  index: number;
  canEdit: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!canEdit}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(
            'group rounded-lg border border-slate-200 bg-white p-3 shadow-card transition-shadow',
            canEdit && 'cursor-grab active:cursor-grabbing',
            snapshot.isDragging && 'dragging-card',
          )}
          style={provided.draggableProps.style}
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium leading-snug text-slate-900">
              {task.title}
            </h4>

            {canEdit ? (
              <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => onEdit(task)}
                  aria-label={`Edit ${task.title}`}
                  title="Edit task"
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => onDelete(task)}
                  aria-label={`Delete ${task.title}`}
                  title="Delete task"
                >
                  ✕
                </button>
              </div>
            ) : null}
          </div>

          {task.description ? (
            <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-500">
              {task.description}
            </p>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-2">
            {task.assignee ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <Avatar
                  name={task.assignee.name}
                  title={task.assignee.email}
                  size="sm"
                />
                <span className="truncate text-xs text-slate-600">
                  {task.assignee.name}
                </span>
              </span>
            ) : (
              <span className="text-xs text-slate-400">Unassigned</span>
            )}
          </div>
        </article>
      )}
    </Draggable>
  );
}
