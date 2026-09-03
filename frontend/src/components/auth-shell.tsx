import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              K
            </span>
            Mini Kanban
          </Link>
        </div>

        <div className="card p-6">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
      </div>
    </main>
  );
}
