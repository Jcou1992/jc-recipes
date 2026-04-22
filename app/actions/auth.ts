'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

type AuthState = { error: string } | null;

// Demo user's inbox runs the tour on every sign-in so friends browsing the
// showcase account always get the guided walkthrough. The env var is optional
// — any email matching falls through to the default landing.
const DEMO_EMAIL = process.env.DEMO_USER_EMAIL?.toLowerCase() ?? 'demo@sakai.app';

export async function login(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  const landing = email.trim().toLowerCase() === DEMO_EMAIL ? '/recipes?tour=1' : '/recipes';
  redirect(landing);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
