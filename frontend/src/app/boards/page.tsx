'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { CreateBoardModal } from '@/components/create-board-modal';
import { ShareBoardModal } from '@/components/share-board-modal';
import { Alert, Avatar, CenteredMessage, RoleBadge, Spinner } from '@/components/ui';
import { deleteBoard, fetchBoards } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import type { BoardMember, BoardSummary } from '@/types';

export default function BoardsPage() {
  const { user } = useAuth();

  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [shareBoardId, setShareBoardId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setError(null);

    try {
      setBoards(await fetchBoards());
    } catch (caught) {
      setError(getErrorMessage(caught, 'Could not load your boards.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shareTarget = useMemo(
    () => boards.find((board) => board.id === shareBoardId) ?? null,
    [boards, shareBoardId],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return boards;

    return boards.filter(
      (board) =>
        board.title.toLowerCase().includes(needle) ||
        (board.description ?? '').toLowerCase().includes(needle),
    );
  }, [boards, query]);

  const { owned, shared } = useMemo(
    () => ({
      owned: filtered.filter((board) => board.viewerRole === 'OWNER'),
      shared: filtered.filter((board) => board.viewerRole !== 'OWNER'),
    }),
    [filtered],
  );

  function handleMembersChanged(boardId: string, members: BoardMember[]) {
    setBoards((current) =>
      current.map((board) =>
        board.id === boardId
          ? {
              ...board,
              members,
              _count: { ...board._count, members: members.length },
            }
          : board,
      ),
    );
  }

  async function handleDelete(board: BoardSummary) {
    const confirmed = window.confirm(
      `Delete “${board.title}”? Its columns and tasks are deleted too. This cannot be undone.`,
    );
    if (!confirmed) return;

    const snapshot = boards;
    setBoards((current) => current.filter((item) => item.id !== board.id));

    try {
      await deleteBoard(board.id);
    } catch (caught) {
      setBoards(snapshot);
      setError(getErrorMessage(caught, 'Could not delete that board.'));
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {user ? `Boards for ${user.name.split(' ')[0]}` : 'Your boards'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Boards you own and boards other people have shared with you.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="search"
              className="field w-56"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search boards…"
              aria-label="Search boards"
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => setCreateOpen(true)}
            >
              New board
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6">
            <Alert>{error}</Alert>
          </div>
        ) : null}

        {loading ? (
          <CenteredMessage>
            <Spinner label="Loading boards…" />
          </CenteredMessage>
        ) : boards.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="space-y-10">
            <BoardSection
              heading="Owned by you"
              boards={owned}
              emptyLabel="You do not own any boards yet."
              onShare={setShareBoardId}
              onDelete={handleDelete}
            />
            <BoardSection
              heading="Shared with you"
              boards={shared}
              emptyLabel="No one has shared a board with you yet."
              onShare={setShareBoardId}
              onDelete={handleDelete}
            />
          </div>
        )}
      </main>

      <CreateBoardModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(board) => setBoards((current) => [board, ...current])}
      />

      <ShareBoardModal
        open={shareTarget !== null}
        board={shareTarget}
        onClose={() => setShareBoardId(null)}
        onMembersChanged={(members) => {
          if (shareTarget) handleMembersChanged(shareTarget.id, members);
        }}
      />
    </div>
  );
}

function BoardSection({
  heading,
  boards,
  emptyLabel,
  onShare,
  onDelete,
}: {
  heading: string;
  boards: BoardSummary[];
  emptyLabel: string;
  onShare: (boardId: string) => void;
  onDelete: (board: BoardSummary) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {heading}
        <span className="ml-2 font-normal normal-case text-slate-400">
          {boards.length}
        </span>
      </h2>

      {boards.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {boards.map((board) => (
            <li key={board.id}>
              <BoardCard board={board} onShare={onShare} onDelete={onDelete} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BoardCard({
  board,
  onShare,
  onDelete,
}: {
  board: BoardSummary;
  onShare: (boardId: string) => void;
  onDelete: (board: BoardSummary) => void;
}) {
  const isOwner = board.viewerRole === 'OWNER';

  return (
    <article className="card flex h-full flex-col p-4 transition-shadow hover:shadow-lifted">
      <div className="mb-2 flex items-start justify-between gap-2">
        <Link
          href={`/boards/${board.id}`}
          className="line-clamp-2 font-semibold text-slate-900 hover:text-brand-700"
        >
          {board.title}
        </Link>
        <RoleBadge role={board.viewerRole} />
      </div>

      <p className="mb-4 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
        {board.description ?? 'No description.'}
      </p>

      <div className="mb-4 flex items-center gap-3 text-xs text-slate-500">
        <span>
          {board._count.columns}{' '}
          {board._count.columns === 1 ? 'column' : 'columns'}
        </span>
        <span aria-hidden>•</span>
        <span>
          {board._count.members}{' '}
          {board._count.members === 1 ? 'member' : 'members'}
        </span>
      </div>

      <div className="mb-4 flex -space-x-2">
        {board.members.slice(0, 5).map((member) => (
          <span key={member.id} className="ring-2 ring-white rounded-full">
            <Avatar
              name={member.user.name}
              title={`${member.user.name} — ${member.role}`}
              size="sm"
            />
          </span>
        ))}
        {board.members.length > 5 ? (
          <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 ring-2 ring-white">
            +{board.members.length - 5}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3">
        <Link href={`/boards/${board.id}`} className="btn-secondary flex-1">
          Open
        </Link>

        {isOwner ? (
          <>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => onShare(board.id)}
            >
              Share
            </button>
            <button
              type="button"
              className="btn-ghost text-rose-600 hover:bg-rose-50"
              onClick={() => onDelete(board)}
              aria-label={`Delete ${board.title}`}
            >
              Delete
            </button>
          </>
        ) : (
          <span className="px-2 text-xs text-slate-400">
            Owned by {board.owner.name}
          </span>
        )}
      </div>
    </article>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-xl">
        📋
      </div>
      <h2 className="text-lg font-semibold text-slate-900">No boards yet</h2>
      <p className="max-w-sm text-sm text-slate-500">
        Create your first board to start organising work into columns and tasks.
        You can invite collaborators once it exists.
      </p>
      <button type="button" className="btn-primary mt-2" onClick={onCreate}>
        Create your first board
      </button>
    </div>
  );
}
