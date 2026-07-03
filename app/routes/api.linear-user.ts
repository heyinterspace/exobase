import { json } from '@remix-run/cloudflare';
import { resolveLinearToken, type ResolvedLinearToken } from '~/lib/api/nango.server';
import { withSecurity } from '~/lib/security';

async function linearGraphQL(resolved: ResolvedLinearToken, query: string) {
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: resolved.isOAuth ? `Bearer ${resolved.token}` : resolved.token,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.status}`);
  }

  const { data, errors } = (await response.json()) as { data?: any; errors?: Array<{ message: string }> };

  if (errors?.length) {
    throw new Error(errors[0].message);
  }

  return data;
}

async function linearUserLoader({ request, context }: { request: Request; context: any }) {
  try {
    const cookieHeader = request.headers.get('Cookie');
    const resolved = await resolveLinearToken(cookieHeader, context);

    if (!resolved) {
      return json({ error: 'Linear token not found' }, { status: 401 });
    }

    const data = await linearGraphQL(resolved, '{ viewer { id name email avatarUrl } }');

    return json(data.viewer);
  } catch (error) {
    console.error('Error fetching Linear user:', error);
    return json(
      {
        error: 'Failed to fetch Linear user information',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export const loader = withSecurity(linearUserLoader, {
  rateLimit: true,
  allowedMethods: ['GET'],
});

async function linearUserAction({ request, context }: { request: Request; context: any }) {
  try {
    const { action } = (await request.json()) as { action: string };
    const cookieHeader = request.headers.get('Cookie');
    const resolved = await resolveLinearToken(cookieHeader, context);

    if (!resolved) {
      return json({ error: 'Linear token not found' }, { status: 401 });
    }

    if (action === 'get_teams') {
      const data = await linearGraphQL(resolved, '{ teams { nodes { id name key } } }');
      return json({ teams: data.teams.nodes });
    }

    return json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in Linear user action:', error);
    return json(
      {
        error: 'Failed to process Linear request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export const action = withSecurity(linearUserAction, {
  rateLimit: true,
  allowedMethods: ['POST'],
});
