'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Alert } from '@/components/ui';
import { getErrorMessage } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = searchParams.get('next') ?? '/boards';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signIn(email, password);
      router.replace(nextPath.startsWith('/') ? nextPath : '/boards');
    } catch (caught) {
      setError(getErrorMessage(caught, 'Could not sign you in.'));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error ? <Alert>{error}</Alert> : null}

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="field"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="alice@example.com"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="field"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
        Demo accounts (after seeding):{' '}
        <span className="font-medium text-slate-700">alice@example.com</span>,{' '}
        <span className="font-medium text-slate-700">bob@example.com</span>,{' '}
        <span className="font-medium text-slate-700">carol@example.com</span> —
        password <span className="font-medium text-slate-700">Password123!</span>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to reach your boards."
      footer={
        <>
          Need an account?{' '}
          <Link
            href="/register"
            className="font-medium text-brand-700 hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
