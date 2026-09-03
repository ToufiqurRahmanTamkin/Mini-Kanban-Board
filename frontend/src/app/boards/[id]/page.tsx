'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { BoardView } from '@/components/board/board-view';
import { ShareBoardModal } from '@/components/share-board-modal';
import {
  Alert,
  Avatar,
  CenteredMessage,
  RoleBadge,
  Spinner,
} from '@/components/ui';
import { fetchBoard } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-client';
import type { BoardDetail, BoardMember, Column } from '@/types';

export default function BoardPage() {
  const params = useParams<{ id: string }>();
  const boardId = params?.id;

  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!boardId) return;

    try {
      setBoard(await fetchBoard(boardId));
      setLoadError(null);
    } catch (caught) {
      setLoadError(getErrorMessage(caught, 'Could not load this board.'));
    }
  }, [boardId]);

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      setLoading(true);
      await reload();
      if (active) setLoading(false);
    }

    void initialLoad();

    return () => {
      active = false;
    };
  }, [reload]);

  const handleColumnsChange = useCallback((columns: Column[]) => {
    setBoard((current) => (current ? { ...current, columns } : current));
  }, []);

  const handleMembersChanged = useCallback((members: BoardMember[]) => {
    setBoard((current) =>
      current
        ? {
            ...current,
            members,
            _count: { ...current._count, members: members.length },
          }
        : current,
    );
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <CenteredMessage>
          <Spinner label="Loading board…" />
        </CenteredMessage>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-xl px-4 py-16">
          <Alert>
            {loadError ??
              'This board does not exist, or you do not have access to it.'}
          </Alert>
          <div className="mt-4">
            <Link href="/boards" className="btn-secondary">
              Back to boards
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isOwner = board.viewerRole === 'OWNER';
  const canEdit = board.viewerRole === 'OWNER' || board.viewerRole === 'EDITOR';

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader>
        <nav className="flex min-w-0 items-center gap-2 text-sm">
          <Link href="/boards" className="shrink-0 text-slate-500 hover:text-slate-800">
            Boards
          </Link>
          <span className="shrink-0 text-slate-300" aria-hidden>
            /
          </span>
          <span className="truncate font-medium text-slate-900">
            {board.title}
          </span>
          <RoleBadge role={board.viewerRole} />
        </nav>
      </AppHeader>

      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-900">
              {board.title}
            </h1>
            {board.description ? (
              <p className="truncate text-sm text-slate-500">
                {board.description}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {board.members.slice(0, 6).map((member) => (
                <span key={member.id} className="rounded-full ring-2 ring-white">
                  <Avatar
                    name={member.user.name}
                    title={`${member.user.name} — ${member.role}`}
                    size="sm"
                  />
                </span>
              ))}
            </div>

            {isOwner ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShareOpen(true)}
              >
                Share
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {!canEdit ? (
        <div className="px-4 pt-3 sm:px-6">
          <Alert tone="info">
            You have view-only access to this board. Dragging, editing and
            deleting are disabled.
          </Alert>
        </div>
      ) : null}

      {actionError ? (
        <div className="px-4 pt-3 sm:px-6">
          <Alert>{actionError}</Alert>
        </div>
      ) : null}

      <main className="flex-1 overflow-hidden pt-4">
        {board.columns.length === 0 && !canEdit ? (
          <CenteredMessage>
            <p className="text-sm text-slate-500">
              This board has no columns yet.
            </p>
          </CenteredMessage>
        ) : (
          <BoardView
            board={board}
            canEdit={canEdit}
            onColumnsChange={handleColumnsChange}
            onError={setActionError}
            reload={reload}
          />
        )}
      </main>

      <ShareBoardModal
        open={shareOpen}
        board={board}
        onClose={() => setShareOpen(false)}
        onMembersChanged={handleMembersChanged}
      />
    </div>
  );
}
