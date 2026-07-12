import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { withSecurity } from '~/lib/security';
import { getManagedHostingConfig, normalizeCoolifyUrl } from '~/lib/api/coolify.server';

/**
 * GET: does this deployment have Exobase-managed hosting configured?
 * Only a boolean ever leaves the server — never the instance URL or token.
 */
export async function loader({ context }: LoaderFunctionArgs) {
  return json({ managedHostingAvailable: getManagedHostingConfig(context) !== null });
}

/**
 * Validates a Coolify instance URL + API token pair by listing the token's
 * teams. Proxied through the server purely because self-hosted Coolify
 * instances don't send CORS headers — the token belongs to the user and is
 * never stored here.
 */
async function coolifyUserAction({ request }: ActionFunctionArgs) {
  const { serverUrl, token } = (await request.json().catch(() => ({}))) as {
    serverUrl?: string;
    token?: string;
  };

  if (!serverUrl || !token) {
    return json({ error: 'Instance URL and API token are required' }, { status: 400 });
  }

  let baseUrl: string;

  try {
    baseUrl = normalizeCoolifyUrl(serverUrl);
  } catch {
    return json({ error: 'Enter a valid instance URL, like https://coolify.example.com' }, { status: 400 });
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/teams`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (response.status === 401 || response.status === 403) {
      return json({ error: 'Coolify rejected this API token' }, { status: 401 });
    }

    if (!response.ok) {
      return json({ error: `Coolify responded with ${response.status}` }, { status: 502 });
    }

    const teams = (await response.json()) as Array<{ id: number; name: string }>;

    return json({ teamName: teams[0]?.name ?? 'Default team' });
  } catch {
    return json({ error: 'Could not reach that Coolify instance' }, { status: 502 });
  }
}

export const action = withSecurity(coolifyUserAction, {
  allowedMethods: ['POST'],
});
