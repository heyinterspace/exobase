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
 * If the browser holds a Nango connectionId cookie for the given integration
 * (set after a successful OAuth popup — see useNangoConnect.ts), fetch a
 * live, auto-refreshed access token from Nango instead of trusting a
 * client-supplied token — the real provider token never has to touch the
 * browser. Returns null if Nango isn't configured or the user hasn't
 * connected via OAuth (callers fall through to their own cookie/env chain).
 */
export async function getTokenFromNango(
  cookieHeader: string | null,
  context: any,
  integrationId: string,
  connectionIdCookieName: string,
): Promise<string | null> {
  const connectionId = parseCookies(cookieHeader)[connectionIdCookieName];
  const nango = getNangoClient(context);

  if (!connectionId || !nango) {
    return null;
  }

  try {
    const connection = await nango.getConnection(integrationId, connectionId);
    const { credentials } = connection;

    return credentials.type === 'OAUTH2' ? credentials.access_token : null;
  } catch (error) {
    console.error(`Failed to fetch ${integrationId} token from Nango:`, error);
    return null;
  }
}

export function getGitHubTokenFromNango(cookieHeader: string | null, context: any): Promise<string | null> {
  return getTokenFromNango(cookieHeader, context, 'github', 'githubNangoConnectionId');
}

export function getLinearTokenFromNango(cookieHeader: string | null, context: any): Promise<string | null> {
  return getTokenFromNango(cookieHeader, context, 'linear', 'linearNangoConnectionId');
}
