import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Sign in - jc-recipes' };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-stone-800 mb-1">jc-recipes</h1>
        <p className="text-sm text-stone-500 mb-6">Sign in to your recipe collection</p>
        <LoginForm />
      </div>
    </main>
  );
}
