import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Acceder - jc-recipes' };

export default function LoginPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 animate-scale-in"
        style={{
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-dialog)',
        }}
      >
        <h1 className="font-display text-3xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>
          jc-recipes
        </h1>
        <p
          className="font-label text-xs tracking-widest uppercase mb-8"
          style={{ color: 'var(--text-3)' }}
        >
          Accede a tu colección
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
