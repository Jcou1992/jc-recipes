'use client';

import { useActionState } from 'react';
import { login } from '@/app/actions/auth';

type State = { error: string } | null;

export default function LoginForm() {
  const [state, action, pending] = useActionState<State, FormData>(login, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p
          role="alert"
          className="font-label text-xs tracking-wide uppercase px-3 py-2.5 rounded-lg"
          style={{
            background: 'color-mix(in oklch, var(--color-terracotta) 10%, transparent)',
            border: '1px solid color-mix(in oklch, var(--color-terracotta) 30%, transparent)',
            color: 'var(--color-terracotta)',
          }}
        >
          {state.error}
        </p>
      )}

      <div>
        <label
          className="font-label block text-xs tracking-widest uppercase mb-1.5"
          style={{ color: 'var(--text-3)' }}
          htmlFor="email"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@email.com"
          className="input-base"
        />
      </div>

      <div>
        <label
          className="font-label block text-xs tracking-widest uppercase mb-1.5"
          style={{ color: 'var(--text-3)' }}
          htmlFor="password"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="input-base"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="btn-primary w-full mt-2"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
