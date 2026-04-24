import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';
import EmailPreviewBootstrap from '@/components/auth/EmailPreviewBootstrap';
import LoginBackground from '@/components/motion/LoginBackground';

export const metadata: Metadata = { title: 'Log in — SEKAI' };

export default function LoginPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--bg)', perspective: '1200px' }}
    >
      <LoginBackground />
      <div
        className="dialog-panel-sm rounded-2xl p-8 animate-scale-in relative"
        style={{
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-dialog)',
          zIndex: 1,
        }}
      >
        <header className="mb-10">
          <div className="flex items-baseline gap-3">
            <h1
              className="font-label text-5xl font-bold tracking-widest uppercase leading-none"
              style={{ color: 'var(--color-terracotta)' }}
            >
              SEKAI
            </h1>
            <span
              className="font-display text-3xl leading-none"
              style={{ color: 'var(--color-gold)' }}
              aria-hidden="true"
            >
              世界
            </span>
          </div>
          <div
            className="mt-4 mb-3 h-px w-10"
            style={{ background: 'color-mix(in oklch, var(--color-terracotta) 45%, transparent)' }}
            aria-hidden="true"
          />
          <p
            className="font-label text-xs tracking-widest uppercase"
            style={{ color: 'var(--text-3)' }}
          >
            Recipe tool
          </p>
        </header>
        <LoginForm />
        <EmailPreviewBootstrap />
      </div>
    </main>
  );
}
