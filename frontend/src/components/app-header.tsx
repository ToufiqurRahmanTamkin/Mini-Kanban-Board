'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Avatar } from './ui';

export function AppHeader({ children }: { children?: ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        <Link
          href="/boards"
          className="flex shrink-0 items-center gap-2 font-semibold text-slate-900"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-xs font-bold text-white">
            K
          </span>
          <span className="hidden sm:inline">Mini Kanban</span>
        </Link>

        <div className="min-w-0 flex-1">{children}</div>

        {user ? (
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar name={user.name} title={user.email} size="sm" />
              <div className="leading-tight">
                <p className="text-sm font-medium text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <button type="button" className="btn-ghost" onClick={signOut}>
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
