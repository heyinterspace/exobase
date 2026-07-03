import { json } from '@remix-run/cloudflare';
import { resolveLinearToken } from '~/lib/api/nango.server';
import { withSecurity } from '~/lib/security';

async function linearIssueAction({ request, context }: { request: Request; context: any }) {
  try {
    const { title, description, teamId } = (await request.json()) as {
      title: string;
      description?: string;
      teamId: string;
    };

    if (!title || !teamId) {
      return json({ error: 'title and teamId are required' }, { status: 400 });
    }

    const cookieHeader = request.headers.get('Cookie');
    const resolved = await resolveLinearToken(cookieHeader, context);

    if (!resolved) {
      return json({ error: 'Linear token not found' }, { status: 401 });
    }

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: resolved.isOAuth ? `Bearer ${resolved.token}` : resolved.token,
      },
      body: JSON.stringify({
        query: `mutation IssueCreate($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue { id identifier title url }
          }
        }`,
        variables: { input: { title, description, teamId } },
      }),
    });

    if (!response.ok) {
      throw new Error(`Linear API error: ${response.status}`);
    }

    const { data, errors } = (await response.json()) as {
      data?: {
        issueCreate: { success: boolean; issue: { id: string; identifier: string; title: string; url: string } };
      };
      errors?: Array<{ message: string }>;
    };

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    if (!data?.issueCreate.success) {
      throw new Error('Linear reported the issue was not created');
    }

    return json(data.issueCreate.issue);
  } catch (error) {
    console.error('Error creating Linear issue:', error);
    return json(
      {
        error: 'Failed to create Linear issue',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export const action = withSecurity(linearIssueAction, {
  rateLimit: true,
  allowedMethods: ['POST'],
});
