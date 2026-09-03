'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/lib/api-client';
import { updateTask } from '@/lib/api';
import type { BoardMember, Task } from '@/types';
import { Alert, Modal } from '../ui';

export function TaskEditorModal({
  task,
  members,
  onClose,
  onSaved,
}: {
  task: Task | null;
  members: BoardMember[];
  onClose: () => void;
  onSaved: (task: Task) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!task) return;

    setTitle(task.title);
    setDescription(task.description ?? '');
    setAssigneeId(task.assignee?.id ?? '');
    setError(null);
    setSubmitting(false);
  }, [task]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task) return;

    setError(null);
    setSubmitting(true);

    try {
      const saved = await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        assigneeId: assigneeId || null,
      });
      onSaved(saved);
      onClose();
    } catch (caught) {
      setError(getErrorMessage(caught, 'Could not save the task.'));
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={task !== null}
      title="Edit task"
      onClose={() => {
        if (!submitting) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert>{error}</Alert> : null}

        <div>
          <label className="label" htmlFor="task-title">
            Title
          </label>
          <input
            id="task-title"
            className="field"
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="task-description">
            Description <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="task-description"
            className="field min-h-[120px] resize-y"
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="task-assignee">
            Assignee
          </label>
          <select
            id="task-assignee"
            className="field"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.user.id}>
                {member.user.name} ({member.role.toLowerCase()})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Only people with access to this board can be assigned.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || title.trim().length === 0}
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
