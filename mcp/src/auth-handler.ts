import type { AuthRequest } from '@cloudflare/workers-oauth-provider';
import { createClient } from '@supabase/supabase-js';
import type { Env } from './env';
import type { SekaiProps } from './core/props';
import { seal, open } from './crypto';

// Strict CSP for the only HTML this worker serves: no scripts, no framing,
// inline style only, form posts to self.
const SECURITY_HEADERS: Record<string, string> = {
  'content-type': 'text/html; charset=utf-8',
  'content-security-policy':
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
};

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPE[c]);
}

function loginPage(
  encReq: string,
  opts: { clientName?: string; error?: string; email?: string } = {},
): Response {
  const who = opts.clientName
    ? `<strong>${escapeHtml(opts.clientName)}</strong> wants access to your`
    : 'Sign in to';
  const error = opts.error
    ? `<p class="err" role="alert">${escapeHtml(opts.error)}</p>`
    : '';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in — SEKAI</title>
<style>
  body{font-family:system-ui,sans-serif;background:#1a1a1d;color:#EDE8DC;display:flex;
       min-height:100vh;align-items:center;justify-content:center;margin:0}
  .card{width:320px;max-width:90vw;padding:28px;background:#131315;border-radius:14px}
  h1{font-size:18px;font-weight:600;margin:0 0 4px}
  p.sub{color:#A89E92;font-size:13px;margin:0 0 18px}
  label{display:block;font-size:12px;color:#A89E92;margin:12px 0 4px}
  input{width:100%;box-sizing:border-box;padding:10px;border:1px solid #2a2a2e;border-radius:8px;
        background:#1A1A1D;color:#EDE8DC;font-size:14px}
  button{width:100%;margin-top:18px;padding:11px;border:0;border-radius:8px;background:#D4703F;
         color:#1a1a1d;font-weight:600;font-size:14px;cursor:pointer}
  .err{color:#ff9b8a;font-size:13px;margin:10px 0 0}
  .brand{color:#EDD18E;font-family:serif}
</style></head>
<body><form class="card" method="POST" action="/authorize">
  <h1>${who} <span class="brand">SEKAI 世界</span></h1>
  <p class="sub">Connect your recipes to your AI assistant.</p>
  ${error}
  <input type="hidden" name="req" value="${escapeHtml(encReq)}">
  <label for="email">Email</label>
  <input id="email" name="email" type="email" autocomplete="username" required value="${escapeHtml(opts.email ?? '')}">
  <label for="password">Password</label>
  <input id="password" name="password" type="password" autocomplete="current-password" required>
  <button type="submit">Sign in &amp; connect</button>
</form></body></html>`;
  return new Response(html, { headers: SECURITY_HEADERS });
}

function errorPage(message: string, status: number): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>SEKAI</title></head>
<body style="font-family:system-ui;background:#1a1a1d;color:#EDE8DC;padding:40px">
<p>${escapeHtml(message)}</p></body></html>`,
    { status, headers: SECURITY_HEADERS },
  );
}

/**
 * OAuthProvider defaultHandler. Owns the /authorize login UI; the provider itself
 * serves discovery, /token, and dynamic client registration. Authenticates the
 * user against Supabase, then hands the provider the identity + session via `props`.
 */
export const authHandler: ExportedHandler<Env> = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/authorize') return errorPage('Not found.', 404);

    if (request.method === 'GET') {
      const oauthReqInfo = await env.OAUTH_PROVIDER.parseAuthRequest(request);
      if (!oauthReqInfo.clientId) return errorPage('Invalid authorization request.', 400);
      const client = await env.OAUTH_PROVIDER.lookupClient(oauthReqInfo.clientId);
      const encReq = await seal(env.COOKIE_ENCRYPTION_KEY, oauthReqInfo);
      return loginPage(encReq, { clientName: client?.clientName });
    }

    if (request.method === 'POST') {
      const form = await request.formData();
      const encReq = String(form.get('req') ?? '');
      const email = String(form.get('email') ?? '');
      const password = String(form.get('password') ?? '');

      const oauthReqInfo = await open<AuthRequest>(env.COOKIE_ENCRYPTION_KEY, encReq);
      if (!oauthReqInfo) {
        return errorPage('Your sign-in session expired. Start the connection again.', 400);
      }

      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.session || !data.user) {
        // Re-render with the (still-valid) encrypted request; never echo the password.
        return loginPage(encReq, { error: 'Invalid email or password.', email });
      }

      const props: SekaiProps = {
        userId: data.user.id,
        email: data.user.email ?? email,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? 0,
      };

      const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
        request: oauthReqInfo,
        userId: data.user.id,
        metadata: { email: data.user.email },
        scope: oauthReqInfo.scope,
        props,
      });
      return Response.redirect(redirectTo, 302);
    }

    return errorPage('Method not allowed.', 405);
  },
};
