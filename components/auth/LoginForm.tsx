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
          className="font-label text-xs tracking-wide px-3 py-2.5 rounded-lg"
          style={{
            background: 'rgba(212,112,63,0.1)',
            border: '1px solid rgba(212,112,63,0.3)',
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
          placeholder="tu@email.com"
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
        className="btn-primary w-full mt-2"
      >
        {pending ? 'Accediendo…' : 'Sign in'}
      </button>
    </form>
  );
}
