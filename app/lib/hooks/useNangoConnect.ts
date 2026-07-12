import Nango from '@nangohq/frontend';
import { getOrCreateAnonUserId } from '~/lib/anonId';

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
    body: JSON.stringify({ integrationId, endUserId: getOrCreateAnonUserId() }),
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
