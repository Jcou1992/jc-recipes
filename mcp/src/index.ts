import OAuthProvider from '@cloudflare/workers-oauth-provider';
import type { Env } from './env';
import { SekaiMcp } from './mcp-agent';
import { authHandler } from './auth-handler';

// The Durable Object class must be exported from the worker entry.
export { SekaiMcp };

// OAuthProvider fronts the MCP server: it serves discovery
// (/.well-known/oauth-authorization-server), dynamic client registration
// (/register), and /token itself; delegates /authorize (login) to authHandler;
// and gates /mcp behind a valid bearer token, injecting the grant's `props`
// into the SekaiMcp agent as `this.props`.
export default new OAuthProvider<Env>({
  apiRoute: '/mcp',
  apiHandler: SekaiMcp.serve('/mcp', { binding: 'MCP_OBJECT' }),
  defaultHandler: authHandler,
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/token',
  clientRegistrationEndpoint: '/register',
  scopesSupported: ['recipes:read', 'recipes:write'],
});
