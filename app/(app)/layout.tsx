import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/actions/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/recipes" className="text-lg font-bold text-orange-600">jc-recipes</a>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-stone-500 hover:text-stone-700 transition-colors min-h-[44px] px-2"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
