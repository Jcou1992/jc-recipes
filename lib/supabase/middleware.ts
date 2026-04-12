import { type NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for a Supabase auth cookie without making any API calls.
  // Individual pages and server actions perform proper getUser() verification.
  // This avoids rate-limiting under test load and cookie mutation side-effects.
  const hasAuthCookie = request.cookies.getAll().some(
    c => c.name.includes('auth-token') && c.value
  );

  // Redirect authenticated users away from the login page
  if (hasAuthCookie && pathname === '/login') {
    return NextResponse.redirect(new URL('/recipes', request.url));
  }

  // Redirect unauthenticated users to login for protected routes
  if (!hasAuthCookie && pathname.startsWith('/recipes')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next({ request });
}
