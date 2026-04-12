'use client';

import { useActionState } from 'react';
import { login } from '@/app/actions/auth';

const inputClass =
  'w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white';

type State = { error: string } | null;

export default function LoginForm() {
  const [state, action, pending] = useActionState<State, FormData>(login, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {state.error}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-orange-500 text-white py-2.5 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
