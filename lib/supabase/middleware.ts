import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for a Supabase auth cookie without making any API calls.
  // For protected routes this cookie-presence check is sufficient.
  // For /login we validate the session (see below) to prevent redirect loops
  // caused by stale/invalidated refresh tokens.
  const hasAuthCookie = request.cookies.getAll().some(
    c => c.name.includes('auth-token') && c.value
  );

  // Redirect unauthenticated users to login for protected routes.
  if (!hasAuthCookie && pathname.startsWith('/recipes')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from the login page — but validate the
  // session first. Without this check a stale/invalidated refresh token causes
  // an infinite loop: AppLayout → redirect /login → middleware → redirect
  // /recipes → AppLayout → … because Server Components cannot write cookies
  // (the setAll call that would clear the stale token is silently discarded).
  // Calling getUser() here is the only place in the loop that can both validate
  // the session AND write cookie-deletion headers to the response.
  if (hasAuthCookie && pathname === '/login') {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            // Propagate cookie mutations (including deletions) to the response.
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Valid session: redirect away from login.
      return NextResponse.redirect(new URL('/recipes', request.url));
    }

    // Invalid/expired session: let /login render.
    // supabase.auth.getUser() will have called setAll to delete the stale
    // cookies, so `response` now carries the Set-Cookie deletion headers.
    // The browser will clear the cookies on this response and the loop stops.
    return response;
  }

  return NextResponse.next({ request });
}
