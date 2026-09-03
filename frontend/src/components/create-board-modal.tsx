'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/lib/api-client';
import { createBoard } from '@/lib/api';
import type { BoardSummary } from '@/types';
import { Alert, Modal } from './ui';

export function CreateBoardModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (board: BoardSummary) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle('');
    setDescription('');
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const board = await createBoard({
        title: title.trim(),
        description: description.trim() || null,
      });
      onCreated(board);
      reset();
      onClose();
    } catch (caught) {
      setError(getErrorMessage(caught, 'Could not create the board.'));
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Create a board"
      description="You will be its owner and can invite collaborators afterwards."
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert>{error}</Alert> : null}

        <div>
          <label className="label" htmlFor="board-title">
            Title
          </label>
          <input
            id="board-title"
            className="field"
            required
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Product Roadmap"
          />
        </div>

        <div>
          <label className="label" htmlFor="board-description">
            Description <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="board-description"
            className="field min-h-[84px] resize-y"
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this board for?"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || title.trim().length === 0}
          >
            {submitting ? 'Creating…' : 'Create board'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
