import { Nango } from '@nangohq/node';
import { parseCookies } from './cookies';

/**
 * Resolves the Nango secret key the same way other server-only secrets are
 * resolved in this repo (Cloudflare env, then process.env) — see
 * app/routes/api.vercel-user.ts for the established pattern. Deliberately has
 * no VITE_ prefix: it must never reach the client bundle.
 */
function resolveNangoSecretKey(context: any): string | undefined {
  return context?.cloudflare?.env?.NANGO_SECRET_KEY || process.env.NANGO_SECRET_KEY;
}

export function isNangoConfigured(context: any): boolean {
  return Boolean(resolveNangoSecretKey(context));
}

function getNangoClient(context: any): Nango | null {
  const secretKey = resolveNangoSecretKey(context);
  return secretKey ? new Nango({ secretKey }) : null;
}

/**
 * If the browser holds a Nango GitHub connectionId (set after a successful
 * OAuth popup, see useGitHubConnection.ts), fetch a live, auto-refreshed
 * access token from Nango instead of trusting a client-supplied token — the
 * real GitHub token never has to touch the browser. Returns null if Nango
 * isn't configured or the user hasn't connected via OAuth (falls through to
 * the existing cookie/env token chain in that case).
 */
export async function getGitHubTokenFromNango(cookieHeader: string | null, context: any): Promise<string | null> {
  const connectionId = parseCookies(cookieHeader).githubNangoConnectionId;
  const nango = getNangoClient(context);

  if (!connectionId || !nango) {
    return null;
  }

  try {
    const connection = await nango.getConnection('github', connectionId);
    const { credentials } = connection;

    return credentials.type === 'OAUTH2' ? credentials.access_token : null;
  } catch (error) {
    console.error('Failed to fetch GitHub token from Nango:', error);
    return null;
  }
}
