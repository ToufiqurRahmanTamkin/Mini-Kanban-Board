'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Alert } from '@/components/ui';
import { getErrorMessage } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await signUp(name, email, password);
      router.replace('/boards');
    } catch (caught) {
      setError(getErrorMessage(caught, 'Could not create your account.'));
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Boards, columns and collaborators in one place."
      footer={
        <>
          Already registered?{' '}
          <Link
            href="/login"
            className="font-medium text-brand-700 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert>{error}</Alert> : null}

        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            className="field"
            autoComplete="name"
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ada Lovelace"
          />
        </div>

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
            placeholder="you@example.com"
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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
          />
          <p className="mt-1 text-xs text-slate-500">
            Minimum 8 characters, including at least one letter and one number.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="field"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={submitting}
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
