import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  let mutableResponse = response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          mutableResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            mutableResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return {
    supabase,
    getResponse() {
      return mutableResponse;
    },
  };
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuthCookie = request.cookies.getAll().some(
    c => c.name.includes('auth-token') && c.value
  );

  const isProtectedPath = pathname.startsWith('/recipes');
  const isLoginPath = pathname === '/login';

  if ((isProtectedPath && hasAuthCookie) || (isLoginPath && hasAuthCookie)) {
    const response = NextResponse.next({ request });
    const { supabase, getResponse } = createMiddlewareClient(request, response);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isProtectedPath && !user) {
      return NextResponse.redirect(new URL('/login', request.url), {
        headers: getResponse().headers,
      });
    }

    if (isLoginPath && user) {
      return NextResponse.redirect(new URL('/recipes', request.url));
    }

    return getResponse();
  }

  if (isProtectedPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next({ request });
}
