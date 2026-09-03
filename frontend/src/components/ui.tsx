'use client';

import clsx from 'clsx';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { BoardRole } from '@/types';

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  if (!children) return null;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx(
        'rounded-lg border px-3 py-2 text-sm',
        tone === 'error' && 'border-rose-200 bg-rose-50 text-rose-700',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        tone === 'info' && 'border-slate-200 bg-slate-50 text-slate-600',
      )}
    >
      {children}
    </div>
  );
}

const ROLE_STYLES: Record<BoardRole, string> = {
  OWNER: 'bg-brand-100 text-brand-800 border-brand-200',
  EDITOR: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  VIEWER: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function RoleBadge({ role }: { role: BoardRole | null }) {
  if (!role) return null;

  return (
    <span
      className={clsx(
        'rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        ROLE_STYLES[role],
      )}
    >
      {role}
    </span>
  );
}

export function Avatar({
  name,
  title,
  size = 'md',
}: {
  name: string;
  title?: string;
  size?: 'sm' | 'md';
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <span
      title={title ?? name}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-600 font-semibold text-white',
        size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs',
      )}
    >
      {initials || '?'}
    </span>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
      />
      {label}
    </span>
  );
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    dialogRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button',
    )?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lifted"
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      {children}
    </div>
  );
}
