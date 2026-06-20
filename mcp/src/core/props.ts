/**
 * Identity + Supabase session carried with each OAuth grant. Stored server-side
 * by the OAuth provider (encrypted in KV) and surfaced to the agent as `this.props`.
 * Never returned to the MCP client.
 */
export type SekaiProps = {
  userId: string; // Supabase auth.users.id — equals auth.uid() under RLS
  email: string;
  accessToken: string; // Supabase access JWT (the RLS principal)
  refreshToken: string; // to mint a fresh access token when expired
  expiresAt: number; // epoch seconds; access-token expiry
};
