import Cookies from 'js-cookie';
import Nango from '@nangohq/frontend';

/**
 * A stable anonymous id, not a login — only used so Nango can group a
 * browser's connections in its dashboard. Exobase has no server-side user
 * accounts, so there's nothing more meaningful to key it to.
 */
function getOrCreateNangoEndUserId(): string {
  const existing = Cookies.get('exobaseUserId');

  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  Cookies.set('exobaseUserId', id, { expires: 3650 });

  return id;
}

/**
 * Shared "Connect with X" OAuth popup flow via Nango, used by every
 * provider's connect hook (useGitHubConnection, useLinearConnection, ...).
 * Resolves to the opaque Nango connectionId on success — never a real
 * provider token, which stays server-side (see app/lib/api/nango.server.ts).
 */
export async function connectViaNango(integrationId: string): Promise<string> {
  const sessionRes = await fetch('/api/nango-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ integrationId, endUserId: getOrCreateNangoEndUserId() }),
  });

  if (!sessionRes.ok) {
    const name = integrationId.charAt(0).toUpperCase() + integrationId.slice(1);
    throw new Error(`${name} OAuth is not set up on this server yet`);
  }

  const { sessionToken } = (await sessionRes.json()) as { sessionToken: string };

  return new Promise<string>((resolve, reject) => {
    const nango = new Nango();
    const connect = nango.openConnectUI({
      onEvent: (event) => {
        if (event.type === 'connect') {
          resolve(event.payload.connectionId);
        } else if (event.type === 'close') {
          reject(new Error('Connection cancelled'));
        } else if (event.type === 'error') {
          reject(new Error(event.payload.errorMessage));
        }
      },
    });
    connect.setSessionToken(sessionToken);
  });
}
