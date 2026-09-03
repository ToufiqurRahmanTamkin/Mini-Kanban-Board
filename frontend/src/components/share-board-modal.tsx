'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/lib/api-client';
import { removeMember, shareBoard, updateMemberRole } from '@/lib/api';
import type { BoardMember, BoardSummary, ShareableRole } from '@/types';
import { Alert, Avatar, Modal, RoleBadge } from './ui';

export function ShareBoardModal({
  open,
  board,
  onClose,
  onMembersChanged,
}: {
  open: boolean;
  board: BoardSummary | null;
  onClose: () => void;
  onMembersChanged: (members: BoardMember[]) => void;
}) {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareableRole>('EDITOR');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (open && board) {
      setMembers(board.members);
      setError(null);
      setNotice(null);
      setEmail('');
      setRole('EDITOR');
    }
  }, [open, board]);

  function publish(next: BoardMember[]) {
    setMembers(next);
    onMembersChanged(next);
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!board) return;

    setError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      const member = await shareBoard(board.id, {
        email: email.trim().toLowerCase(),
        role,
      });
      publish([...members, member]);
      setNotice(`${member.user.name} now has ${member.role} access.`);
      setEmail('');
    } catch (caught) {
      setError(getErrorMessage(caught, 'Could not share the board.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(member: BoardMember, next: ShareableRole) {
    if (!board) return;

    setError(null);
    setNotice(null);
    setBusyMemberId(member.id);

    try {
      const updated = await updateMemberRole(board.id, member.id, next);
      publish(members.map((item) => (item.id === updated.id ? updated : item)));
    } catch (caught) {
      setError(getErrorMessage(caught, 'Could not change that role.'));
    } finally {
      setBusyMemberId(null);
    }
  }

  async function handleRemove(member: BoardMember) {
    if (!board) return;

    setError(null);
    setNotice(null);
    setBusyMemberId(member.id);

    try {
      await removeMember(board.id, member.id);
      publish(members.filter((item) => item.id !== member.id));
      setNotice(`${member.user.name} no longer has access.`);
    } catch (caught) {
      setError(getErrorMessage(caught, 'Could not remove that collaborator.'));
    } finally {
      setBusyMemberId(null);
    }
  }

  return (
    <Modal
      open={open}
      title={board ? `Share “${board.title}”` : 'Share board'}
      description="Invite a registered user by email. Editors can change the board; viewers can only read it."
      onClose={onClose}
    >
      <form onSubmit={handleInvite} className="space-y-4" noValidate>
        {error ? <Alert>{error}</Alert> : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label className="label" htmlFor="share-email">
              Email address
            </label>
            <input
              id="share-email"
              type="email"
              className="field"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@example.com"
            />
          </div>

          <div className="sm:w-36">
            <label className="label" htmlFor="share-role">
              Role
            </label>
            <select
              id="share-role"
              className="field"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as ShareableRole)
              }
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={submitting || email.trim().length === 0}
        >
          {submitting ? 'Sharing…' : 'Share board'}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          People with access ({members.length})
        </h3>

        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {members.map((member) => {
            const isOwner = member.role === 'OWNER';
            const busy = busyMemberId === member.id;

            return (
              <li
                key={member.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"
              >
                <Avatar name={member.user.name} title={member.user.email} size="sm" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {member.user.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {member.user.email}
                  </p>
                </div>

                {isOwner ? (
                  <RoleBadge role="OWNER" />
                ) : (
                  <>
                    <select
                      aria-label={`Role for ${member.user.name}`}
                      className="field w-28 py-1 text-xs"
                      value={member.role}
                      disabled={busy}
                      onChange={(event) =>
                        handleRoleChange(
                          member,
                          event.target.value as ShareableRole,
                        )
                      }
                    >
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>

                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                      disabled={busy}
                      onClick={() => handleRemove(member)}
                    >
                      Remove
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
