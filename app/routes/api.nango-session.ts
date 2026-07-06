import { json } from '@remix-run/cloudflare';
import { Nango } from '@nangohq/node';
import { withSecurity } from '~/lib/security';

/**
 * Mints a short-lived Nango Connect session token for the frontend's
 * openConnectUI() popup. The Nango secret key never leaves the server —
 * see app/lib/api/nango.server.ts for how the resulting connectionId is
 * later exchanged for a live provider access token.
 */
async function nangoSessionAction({ request, context }: { request: Request; context: any }) {
  try {
    const secretKey = context?.cloudflare?.env?.NANGO_SECRET_KEY || process.env.NANGO_SECRET_KEY;

    if (!secretKey) {
      return json({ error: 'Nango is not configured on this server' }, { status: 501 });
    }

    const { integrationId, endUserId } = (await request.json()) as { integrationId: string; endUserId: string };

    if (!integrationId || !endUserId) {
      return json({ error: 'integrationId and endUserId are required' }, { status: 400 });
    }

    const nango = new Nango({ secretKey });
    const { data } = await nango.createConnectSession({
      allowed_integrations: [integrationId],
      end_user: { id: endUserId },
    });

    return json({ sessionToken: data.token });
  } catch (error) {
    console.error('Failed to create Nango connect session:', error);
    return json(
      {
        error: 'Failed to create Nango connect session',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export const action = withSecurity(nangoSessionAction, {
  rateLimit: true,
  allowedMethods: ['POST'],
});
