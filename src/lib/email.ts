import 'server-only';

/**
 * Invite-email transport, isolated here so the provider can be swapped without
 * touching callers (admin actions). Today it uses the Cloudflare Email Sending
 * Workers binding (`env.EMAIL.send`), which needs:
 *   - `send_email` binding in wrangler.jsonc (added)
 *   - the sending domain onboarded: `wrangler email sending enable <domain>`
 *   - env `EMAIL_FROM` (e.g. "SEKAI <welcome@yourdomain.com>" or a bare address)
 *   - env `APP_URL` for the login link
 *
 * BEST-EFFORT: every failure path returns `{ sent: false, reason }` and never
 * throws. The admin action always also returns the temp password to the
 * dashboard, so account creation works even before email is configured.
 *
 * Security: this emails a plaintext temporary password. Acceptable for a small
 * invite-only circle that is told to change it immediately. To harden later,
 * swap the body for a one-time set-password link and stop sending the password.
 */

interface InviteParams {
  to: string;
  tempPassword: string;
  /** Optional override; defaults to `${APP_URL}/login`. */
  loginUrl?: string;
}

export interface SendResult {
  sent: boolean;
  reason?: string;
}

type EmailBinding = {
  send: (msg: {
    to: string;
    from: { email: string; name?: string };
    subject: string;
    html: string;
    text: string;
  }) => Promise<unknown>;
};

// Parse `EMAIL_FROM` which may be "Name <addr@x>" or a bare "addr@x".
function parseFrom(raw: string): { email: string; name?: string } | null {
  const m = raw.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (m) return { name: m[1] || undefined, email: m[2] };
  const bare = raw.trim();
  return bare.includes('@') ? { email: bare } : null;
}

async function getEmailBinding(): Promise<EmailBinding | null> {
  try {
    // Dynamic import keeps this out of the bundle in `next dev` / Jest where
    // the OpenNext Cloudflare context does not exist.
    const mod = await import('@opennextjs/cloudflare');
    const ctx = await mod.getCloudflareContext({ async: true });
    const binding = (ctx?.env as Record<string, unknown> | undefined)?.EMAIL;
    return (binding as EmailBinding) ?? null;
  } catch {
    return null;
  }
}

export async function sendInviteEmail({ to, tempPassword, loginUrl }: InviteParams): Promise<SendResult> {
  const fromRaw = process.env.EMAIL_FROM;
  if (!fromRaw) return { sent: false, reason: 'EMAIL_FROM not configured' };
  const from = parseFrom(fromRaw);
  if (!from) return { sent: false, reason: 'EMAIL_FROM is not a valid address' };

  const appUrl = (process.env.APP_URL ?? '').replace(/\/+$/, '');
  const url = loginUrl ?? (appUrl ? `${appUrl}/login` : '/login');

  const binding = await getEmailBinding();
  if (!binding) return { sent: false, reason: 'EMAIL binding unavailable' };

  const subject = 'Your SEKAI access';
  const text = [
    'You have been given access to SEKAI.',
    '',
    `Sign in: ${url}`,
    `Email: ${to}`,
    `Temporary password: ${tempPassword}`,
    '',
    'Please sign in and change your password in Settings.',
  ].join('\n');

  const html = `
    <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <h1 style="font-size:20px;letter-spacing:0.04em">SEKAI 世界</h1>
      <p>You have been given access to SEKAI.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#666">Sign in</td><td><a href="${url}">${url}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Email</td><td>${to}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Temporary password</td><td><code>${tempPassword}</code></td></tr>
      </table>
      <p style="color:#666;font-size:14px">Please sign in and change your password in Settings.</p>
    </div>`;

  try {
    await binding.send({ to, from, subject, html, text });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : 'send failed' };
  }
}
